require('dotenv').config();

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags, InteractionContextType } = require('discord.js');
const { Machine, GuildRole, GameServer } = require('../database');
const { syncFromApi } = require('../asadmApi');

const PRESETS = {
    VIEWER: [
        { command: 'status', cooldown: 300 }
    ],
    PLAYER: [
        { command: 'status', cooldown: 60 },
        { command: 'start', cooldown: 3600 }
    ],
    OPERATOR: [
        { command: 'status', cooldown: 0 },
        { command: 'start', cooldown: 0 },
        { command: 'stop', cooldown: 0 },
        { command: 'update', cooldown: 0 },
        { command: 'destroywilddinos', cooldown: 0 },
        { command: 'saveworld', cooldown: 0 },
        { command: 'players', cooldown: 0 },
        { command: 'serverchat', cooldown: 0 }
    ],
    ADMIN: [
        { command: 'status', cooldown: 0 },
        { command: 'start', cooldown: 0 },
        { command: 'stop', cooldown: 0 },
        { command: 'update', cooldown: 0 },
        { command: 'destroywilddinos', cooldown: 0 },
        { command: 'saveworld', cooldown: 0 },
        { command: 'players', cooldown: 0 },
        { command: 'backup', cooldown: 0 },
        { command: 'kill', cooldown: 0 },
        { command: 'serverchat', cooldown: 0 }
    ]
};

const COMMAND_CHOICES = [
    { name: 'status', value: 'status' },
    { name: 'start', value: 'start' },
    { name: 'stop', value: 'stop' },
    { name: 'update (stop + update + restart)', value: 'update' },
    { name: 'destroy wild dinos', value: 'destroywilddinos' },
    { name: 'save world', value: 'saveworld' },
    { name: 'players', value: 'players' },
    { name: 'backup', value: 'backup' },
    { name: 'kill (force kill)', value: 'kill' },
    { name: 'server chat', value: 'serverchat' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('asma')
        .setDescription('Manage ASMA configurations and roles')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        // Quick Setup
        .addSubcommand(subcommand =>
            subcommand.setName('quicksetup')
                .setDescription('Grant a role a permission preset (wipes existing grants for that role)')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to configure')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('preset')
                        .setDescription('Permission preset to apply')
                        .setRequired(true)
                        .addChoices(
                            { name: 'VIEWER — status (5min cooldown) only', value: 'VIEWER' },
                            { name: 'PLAYER — status (1min cooldown), start (1hr cooldown)', value: 'PLAYER' },
                            { name: 'OPERATOR — status, start, stop, update, destroywildinos, saveworld, players, serverchat', value: 'OPERATOR' },
                            { name: 'ADMIN — all commands, no cooldown', value: 'ADMIN' }
                        )
                )
        )

        // Machine Subcommands
        .addSubcommandGroup(group =>
            group.setName('machines')
                .setDescription('Manage machines running ASMA')
                .addSubcommand(subcommand =>
                    subcommand.setName('add')
                        .setDescription('Add a machine running ASMA')
                        .addStringOption(option =>
                            option.setName('name')
                                .setDescription('Machine nickname')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option.setName('url')
                                .setDescription('Machine base URL (e.g. http://192.168.1.1:5000)')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option.setName('api_token')
                                .setDescription('Machine API token')
                                .setRequired(false)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand.setName('remove')
                        .setDescription('Remove a machine running ASMA')
                        .addStringOption(option =>
                            option.setName('machine')
                                .setDescription('Machine name to remove')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand.setName('list')
                        .setDescription('List all machines running ASMA')
                )
        )

        // GameServer Subcommands
        .addSubcommandGroup(group =>
            group.setName('servers')
                .setDescription('Manage which game servers are listed')
                .addSubcommand(subcommand =>
                    subcommand.setName('show')
                        .setDescription('Show a hidden game server')
                        .addStringOption(option =>
                            option.setName('profile_name')
                                .setDescription('Server profile name to show')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand.setName('hide')
                        .setDescription('Hide a visible game server')
                        .addStringOption(option =>
                            option.setName('profile_name')
                                .setDescription('Server profile name to hide')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand.setName('list')
                        .setDescription('List all game servers')
                )
                .addSubcommand(subcommand =>
                    subcommand.setName('showall')
                        .setDescription('Make all servers visible to players at once')
                )
                .addSubcommand(subcommand =>
                    subcommand.setName('sync')
                        .setDescription('Re-sync servers from all machines')
                )
                .addSubcommand(subcommand =>
                    subcommand.setName('rename')
                        .setDescription('Set the display name for a game server')
                        .addStringOption(option =>
                            option.setName('profile_name')
                                .setDescription('Server profile to rename')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption(option =>
                            option.setName('display_name')
                                .setDescription('New display name')
                                .setRequired(true)
                        )
                )
        )

        // Role Subcommands
        .addSubcommandGroup(group =>
            group.setName('roles')
                .setDescription('Manage roles that can use server commands')
                .addSubcommand(subcommand =>
                    subcommand.setName('add')
                        .setDescription('Manually grant a role access to a command')
                        .addRoleOption(option =>
                            option.setName('role')
                                .setDescription('Role to grant')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option.setName('command')
                                .setDescription('Command to grant')
                                .setRequired(true)
                                .addChoices(...COMMAND_CHOICES)
                        )
                        .addStringOption(option =>
                            option.setName('server')
                                .setDescription('Specific server (leave empty to apply to all servers)')
                                .setRequired(false)
                                .setAutocomplete(true)
                        )
                        .addIntegerOption(option =>
                            option.setName('cooldown')
                                .setDescription('Cooldown in seconds (default: 0)')
                                .setRequired(false)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand.setName('remove')
                        .setDescription('Revoke a role\'s command access')
                        .addRoleOption(option =>
                            option.setName('role')
                                .setDescription('Role to revoke')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option.setName('command')
                                .setDescription('Command to revoke (leave empty to remove all grants for this role)')
                                .setRequired(false)
                                .addChoices(...COMMAND_CHOICES)
                        )
                        .addStringOption(option =>
                            option.setName('server')
                                .setDescription('Specific server to revoke (leave empty to match all)')
                                .setRequired(false)
                                .setAutocomplete(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand.setName('list')
                        .setDescription('List all role grants')
                )
        )
        .setContexts(InteractionContextType.Guild),

    enabled: true,

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const guildId = interaction.guild.id;

        if (focusedOption.name === 'profile_name') {
            const servers = interaction.client.asmaData.servers.filter(s => String(s.guild_id) === guildId);
            let filtered = servers
                .map(s => s.profile_name)
                .filter(name => name.toLowerCase().startsWith(focusedOption.value.toLowerCase()));
            if (filtered.length > 25) filtered.length = 25;
            await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));

        } else if (focusedOption.name === 'server') {
            const servers = interaction.client.asmaData.servers.filter(s => String(s.guild_id) === guildId).sort((a, b) => a.display_name.localeCompare(b.display_name));
            let filtered = servers
                .map(s => ({ name: s.display_name, value: s.profile_name }))
                .filter(s => s.name.toLowerCase().startsWith(focusedOption.value.toLowerCase()));
            if (filtered.length > 25) filtered.length = 25;
            await interaction.respond(filtered);
        }
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const subcommandGroup = interaction.options.getSubcommandGroup();
        const guildId = interaction.guild.id;

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'You must be an admin to use this command.', flags: MessageFlags.Ephemeral });
        }

        /** QUICK SETUP **/
        if (subcommand === 'quicksetup') {
            const role = interaction.options.getRole('role');
            const presetName = interaction.options.getString('preset');
            const preset = PRESETS[presetName];

            await GuildRole.destroy({ where: { guild_id: guildId, role_id: role.id } });

            const rows = preset.map(p => ({
                guild_id: guildId,
                role_id: role.id,
                command: p.command,
                profile_name: null,
                cooldown: p.cooldown
            }));

            await GuildRole.bulkCreate(rows);
            interaction.client.asmaData.roles = await GuildRole.findAll();

            const commandList = preset.map(p => {
                const cd = p.cooldown > 0 ? ` (${formatDuration(p.cooldown)} cooldown)` : '';
                return `**${p.command}**${cd}`;
            }).join(', ');

            return interaction.reply(`Role <@&${role.id}> configured as **${presetName}**: ${commandList}`);
        }

        /** ROLE MANAGEMENT **/
        if (subcommandGroup === 'roles') {
            if (subcommand === 'list') {
                const roles = interaction.client.asmaData.roles.filter(r => String(r.guild_id) === guildId);

                if (roles.length === 0) {
                    return interaction.reply({ content: 'No role grants have been configured.', flags: MessageFlags.Ephemeral });
                }

                // Group by role_id
                const grouped = {};
                for (const r of roles) {
                    const key = String(r.role_id);
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(r);
                }

                const embed = new EmbedBuilder()
                    .setTitle('Role Grants')
                    .setColor(0x5865F2);

                let description = '';
                for (const [roleId, grants] of Object.entries(grouped)) {
                    const grantList = grants.map(g => {
                        const serverText = g.profile_name ? ` \`[${g.profile_name}]\`` : '';
                        const cooldownText = g.cooldown > 0 ? ` *(${formatDuration(g.cooldown)} cd)*` : '';
                        return `${g.command}${serverText}${cooldownText}`;
                    }).join(', ');
                    description += `<@&${roleId}>\n${grantList}\n\n`;
                }

                embed.setDescription(description.trim());
                return interaction.reply({ embeds: [embed] });
            }

            const role = interaction.options.getRole('role');

            if (subcommand === 'add') {
                const command = interaction.options.getString('command');
                const profileName = interaction.options.getString('server') || null;
                const cooldown = interaction.options.getInteger('cooldown') || 0;

                try {
                    await GuildRole.create({ guild_id: guildId, role_id: role.id, command, profile_name: profileName, cooldown });
                    interaction.client.asmaData.roles = await GuildRole.findAll();
                    const serverText = profileName ? ` on **${profileName}**` : ' on **all servers**';
                    const cooldownText = cooldown > 0 ? ` (cooldown: ${formatDuration(cooldown)})` : '';
                    return interaction.reply(`<@&${role.id}> can now use **${command}**${serverText}${cooldownText}.`);
                } catch (error) {
                    console.error('Error adding role grant:', error);
                    return interaction.reply({ content: 'Failed to add grant. This may be a duplicate entry.', flags: MessageFlags.Ephemeral });
                }
            }

            if (subcommand === 'remove') {
                const command = interaction.options.getString('command') || null;
                const profileName = interaction.options.getString('server') || null;

                const where = { guild_id: guildId, role_id: role.id };
                if (command) where.command = command;
                if (profileName) where.profile_name = profileName;

                const deleted = await GuildRole.destroy({ where });
                interaction.client.asmaData.roles = await GuildRole.findAll();

                if (deleted === 0) {
                    return interaction.reply({ content: 'No matching grants found to remove.', flags: MessageFlags.Ephemeral });
                }

                return interaction.reply(`Removed **${deleted}** grant(s) from <@&${role.id}>.`);
            }
        }

        /** MACHINE MANAGEMENT **/
        if (subcommandGroup === 'machines') {
            if (subcommand === 'list') {
                const machines = interaction.client.asmaData.machines.filter(m => String(m.guild_id) === guildId);

                if (machines.length === 0) {
                    return interaction.reply({ content: 'No machines have been configured.', flags: MessageFlags.Ephemeral });
                }

                const machineList = machines.map(m => `- **${m.name}** — ${m.base_url}`).join('\n');
                return interaction.reply(`__**ASMA Machines:**__\n${machineList}`);
            }

            if (subcommand === 'add') {
                const name = interaction.options.getString('name');
                const baseUrl = interaction.options.getString('url');
                const apiToken = interaction.options.getString('api_token') || '';

                try {
                    await interaction.deferReply();
                    await Machine.create({ guild_id: guildId, name, base_url: baseUrl, api_token: apiToken });
                    interaction.client.asmaData.machines = await Machine.findAll();
                    await syncFromApi(guildId);
                    interaction.client.asmaData.servers = await GameServer.findAll();
                    return interaction.editReply(`Machine **${name}** added at \`${baseUrl}\`. Servers synced — use \`/asma servers showall\` to make them visible.`);
                } catch (error) {
                    console.error('Error adding machine:', error);
                    return interaction.editReply('Failed to add machine.');
                }
            }

            if (subcommand === 'remove') {
                const name = interaction.options.getString('machine');

                try {
                    const deleted = await Machine.destroy({ where: { guild_id: guildId, name } });
                    if (deleted) {
                        interaction.client.asmaData.machines = await Machine.findAll();
                        return interaction.reply(`Machine **${name}** removed.`);
                    } else {
                        return interaction.reply({ content: `No machine named **${name}** found.`, flags: MessageFlags.Ephemeral });
                    }
                } catch (error) {
                    console.error('Error removing machine:', error);
                    return interaction.reply({ content: 'Failed to remove machine.', flags: MessageFlags.Ephemeral });
                }
            }
        }

        /** SERVER MANAGEMENT **/
        if (subcommandGroup === 'servers') {
            if (subcommand === 'list') {
                const servers = interaction.client.asmaData.servers.filter(s => String(s.guild_id) === guildId).sort((a, b) => a.display_name.localeCompare(b.display_name));

                if (servers.length === 0) {
                    return interaction.reply({ content: 'No game servers have been found. Add a machine first.', flags: MessageFlags.Ephemeral });
                }

                const serverList = servers.map(s => {
                    const visibility = s.hidden ? '*(hidden)*' : '*(visible)*';
                    return `- **${s.display_name}** \`${s.profile_name}\` ${visibility}`;
                }).join('\n');
                return interaction.reply(`__**Game Servers:**__\n${serverList}`);
            }

            if (subcommand === 'showall') {
                await GameServer.update({ hidden: false }, { where: { guild_id: guildId } });
                interaction.client.asmaData.servers = await GameServer.findAll();
                const count = interaction.client.asmaData.servers.filter(s => String(s.guild_id) === guildId && !s.hidden).length;
                return interaction.reply(`**${count}** server(s) are now visible to players.`);
            }

            if (subcommand === 'sync') {
                await interaction.deferReply({ ephemeral: true });
                await syncFromApi(guildId);
                interaction.client.asmaData.servers = await GameServer.findAll();
                const count = interaction.client.asmaData.servers.filter(s => String(s.guild_id) === guildId).length;
                return interaction.editReply(`Sync complete. **${count}** server(s) on record for this guild.`);
            }

            const profileName = interaction.options.getString('profile_name');

            if (subcommand === 'show') {
                try {
                    await GameServer.update({ hidden: false }, { where: { guild_id: guildId, profile_name: profileName } });
                    interaction.client.asmaData.servers = await GameServer.findAll();
                    return interaction.reply(`**${profileName}** is now visible.`);
                } catch (error) {
                    console.error('Error showing server:', error);
                    return interaction.reply({ content: 'Failed to show server.', flags: MessageFlags.Ephemeral });
                }
            }

            if (subcommand === 'hide') {
                try {
                    await GameServer.update({ hidden: true }, { where: { guild_id: guildId, profile_name: profileName } });
                    interaction.client.asmaData.servers = await GameServer.findAll();
                    return interaction.reply(`**${profileName}** is now hidden.`);
                } catch (error) {
                    console.error('Error hiding server:', error);
                    return interaction.reply({ content: 'Failed to hide server.', flags: MessageFlags.Ephemeral });
                }
            }

            if (subcommand === 'rename') {
                const displayName = interaction.options.getString('display_name');
                try {
                    await GameServer.update({ display_name: displayName }, { where: { guild_id: guildId, profile_name: profileName } });
                    interaction.client.asmaData.servers = await GameServer.findAll();
                    return interaction.reply(`**${profileName}** renamed to **${displayName}**.`);
                } catch (error) {
                    console.error('Error renaming server:', error);
                    return interaction.reply({ content: 'Failed to rename server.', flags: MessageFlags.Ephemeral });
                }
            }
        }
    }
};

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    return parts.join(' ');
}
