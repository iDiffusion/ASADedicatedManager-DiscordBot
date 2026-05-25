require('dotenv').config();

const { SlashCommandBuilder, EmbedBuilder, MessageFlags, InteractionContextType } = require('discord.js');
const { CommandLog, GameServer } = require('../database');
const { getServers, executeCommand, rconCommand, getPlayers } = require('../asadmApi');

// Commands that get written to CommandLog (excludes read-only)
const LOGGED_COMMANDS = new Set(['start', 'stop', 'update', 'destroywilddinos', 'saveworld', 'backup', 'kill', 'serverchat']);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Manage ARK Survival Ascended servers')
        .addSubcommand(sub => sub
            .setName('status')
            .setDescription('View status of all servers')
        )
        .addSubcommand(sub => sub
            .setName('start')
            .setDescription('Start a server')
            .addStringOption(opt => opt
                .setName('server')
                .setDescription('Server to start')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('stop')
            .setDescription('Stop a server')
            .addStringOption(opt => opt
                .setName('server')
                .setDescription('Server to stop')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('update')
            .setDescription('Stop, update, and restart a server')
            .addStringOption(opt => opt
                .setName('server')
                .setDescription('Server to update')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('destroywilddinos')
            .setDescription('Destroy all wild dinos on a server')
            .addStringOption(opt => opt
                .setName('server')
                .setDescription('Server')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('saveworld')
            .setDescription('Save the world on a server')
            .addStringOption(opt => opt
                .setName('server')
                .setDescription('Server')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('listplayers')
            .setDescription('List players currently on a server')
            .addStringOption(opt => opt
                .setName('server')
                .setDescription('Server')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('backup')
            .setDescription('Run a full backup of a server')
            .addStringOption(opt => opt
                .setName('server')
                .setDescription('Server to back up')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('kill')
            .setDescription('Force kill a server immediately (may cause data loss)')
            .addStringOption(opt => opt
                .setName('server')
                .setDescription('Server to kill')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('serverchat')
            .setDescription('Send a message to the server chat')
            .addStringOption(opt => opt
                .setName('server')
                .setDescription('Server')
                .setRequired(true)
                .setAutocomplete(true)
            )
            .addStringOption(opt => opt
                .setName('message')
                .setDescription('Message to send in server chat')
                .setRequired(true)
            )
        )
        .setContexts(InteractionContextType.Guild),

    enabled: true,

    async autocomplete(interaction) {
        const guildId = interaction.guild.id;
        const focusedOption = interaction.options.getFocused(true);

        if (focusedOption.name === 'server') {
            const visible = interaction.client.asmaData.servers
                .filter(s => String(s.guild_id) === guildId && !s.hidden)
                .sort((a, b) => a.display_name.localeCompare(b.display_name));
            let filtered = visible
                .map(s => ({ name: s.display_name, value: s.profile_name }))
                .filter(s => s.name.toLowerCase().startsWith(focusedOption.value.toLowerCase()));
            if (filtered.length > 25) filtered.length = 25;
            await interaction.respond(filtered);
        }
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        if (subcommand === 'status') {
            const memberRoleIds = interaction.member.roles.cache.map(r => String(r.id));
            const hasPermission = interaction.client.asmaData.roles.some(r =>
                String(r.guild_id) === guildId &&
                memberRoleIds.includes(String(r.role_id)) &&
                r.command === 'status'
            );
            if (!hasPermission) {
                return interaction.reply({ content: 'You do not have permission to view server status.', flags: MessageFlags.Ephemeral });
            }
            await interaction.deferReply();
            return handleStatus(interaction, guildId);
        }

        const profileName = interaction.options.getString('server');
        await interaction.deferReply({ ephemeral: true });

        // Permission check — match on command + specific server OR wildcard (null)
        const memberRoleIds = interaction.member.roles.cache.map(r => String(r.id));
        const grants = interaction.client.asmaData.roles.filter(r =>
            String(r.guild_id) === guildId &&
            memberRoleIds.includes(String(r.role_id)) &&
            r.command === subcommand &&
            (r.profile_name === null || r.profile_name === profileName)
        );

        if (grants.length === 0) {
            return interaction.editReply('You do not have permission to use this command.');
        }

        // Use the most permissive grant (lowest cooldown)
        const grant = grants.reduce((best, r) => (r.cooldown < best.cooldown ? r : best));

        // Cooldown check
        if (grant.cooldown > 0) {
            const lastLog = await CommandLog.findOne({
                where: { guild_id: guildId, user_id: userId, profile_name: profileName, command: subcommand },
                order: [['created_at', 'DESC']]
            });
            if (lastLog) {
                const elapsed = (Date.now() - new Date(lastLog.created_at).getTime()) / 1000;
                if (elapsed < grant.cooldown) {
                    const retryAt = Math.floor((new Date(lastLog.created_at).getTime() + grant.cooldown * 1000) / 1000);
                    return interaction.editReply(`This command is on cooldown. Try again <t:${retryAt}:R>.`);
                }
            }
        }

        // Resolve server record and machine
        const serverRecord = interaction.client.asmaData.servers.find(s =>
            String(s.guild_id) === guildId && s.profile_name === profileName && !s.hidden
        );
        if (!serverRecord) {
            return interaction.editReply('Server not found or is not currently available.');
        }

        const machine = interaction.client.asmaData.machines.find(m => m.id === serverRecord.machine_id);
        if (!machine) {
            return interaction.editReply('Could not find the machine for this server. Contact an admin.');
        }

        // Execute API call
        try {
            let result;

            if (subcommand === 'serverchat') {
                const message = interaction.options.getString('message');
                result = await rconCommand(machine, profileName, message);
            } else if (subcommand === 'listplayers') {
                result = await getPlayers(machine, profileName);
                const players = result.players || [];
                if (players.length === 0) {
                    return interaction.editReply(`No players are currently on **${serverRecord.display_name}**.`);
                }
                const list = players.map(p => `- ${p.Name}`).join('\n');
                return interaction.editReply(`__**Players on ${serverRecord.display_name}:**__\n${list}`);
            } else {
                result = await executeCommand(machine, subcommand, profileName);
            }

            if (LOGGED_COMMANDS.has(subcommand)) {
                await CommandLog.create({
                    guild_id: guildId,
                    user_id: userId,
                    machine_id: machine.id,
                    profile_name: profileName,
                    command: subcommand
                });
            }

            return interaction.editReply(result.message || `**${subcommand}** executed on **${serverRecord.display_name}**.`);

        } catch (error) {
            console.error(`Error executing ${subcommand} on ${profileName}:`, error);
            const msg = error.response?.data?.message || error.response?.data || error.message;
            return interaction.editReply(`Failed to execute **${subcommand}** on **${serverRecord.display_name}**: ${msg}`);
        }
    }
};

async function handleStatus(interaction, guildId) {
    const machines = interaction.client.asmaData.machines.filter(m => String(m.guild_id) === guildId);
    const visibleServers = interaction.client.asmaData.servers
        .filter(s => String(s.guild_id) === guildId && !s.hidden)
        .sort((a, b) => a.display_name.localeCompare(b.display_name));

    if (machines.length === 0 || visibleServers.length === 0) {
        return interaction.editReply('No servers are currently configured.');
    }

    // Fetch live data from all machines into a map keyed by profile_name
    const apiData = {};
    for (const machine of machines) {
        try {
            const data = await getServers(machine);
            for (const s of (data.servers || [])) {
                apiData[s.ProfileName] = s;
            }
        } catch {
            // machine unreachable — servers from this machine will fall back to last_status
        }
    }

    // Build fields in sorted order, falling back to last_status if API didn't return data
    const fields = [];
    const statuses = [];

    for (const record of visibleServers) {
        const s = apiData[record.profile_name];
        if (s) {
            statuses.push(s.Status);
            fields.push({
                name: record.display_name,
                value: `${s.StatusEmoji || ''} ${s.Status}`.trim(),
                inline: true
            });
            GameServer.update({ last_status: s.Status }, { where: { guild_id: guildId, profile_name: record.profile_name } }).catch(() => {});
            record.last_status = s.Status;
        } else {
            const fallback = record.last_status || 'Unknown';
            statuses.push(fallback);
            fields.push({ name: record.display_name, value: `*(unreachable — last: ${fallback})*`, inline: true });
        }
    }

    if (fields.length === 0) {
        return interaction.editReply('No servers available to display.');
    }

    const embed = new EmbedBuilder()
        .setTitle('Server Status')
        .setColor(statusColor(statuses))
        .addFields(fields)
        .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
}

function statusColor(statuses) {
    if (statuses.length === 0) return 0x6B7280;
    const running = statuses.filter(s => s.toLowerCase().includes('running')).length;
    if (running === statuses.length) return 0x059669; // all green
    if (running === 0) return 0xDC2626;               // all red
    return 0xD97706;                                   // mixed yellow
}
