// import environmental variables
require('dotenv').config();

// Require the necessary discord.js classes
const { SlashCommandBuilder, MessageFlags, InteractionContextType } = require('discord.js');
const { Machine, GameServer, GuildRole } = require('../database');

// Export the command data and functions
module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reload bot features')
        .addSubcommandGroup(group =>
            group.setName('asma')
                .setDescription('Reload ASMA caches')
                .addSubcommand(subcommand =>
                    subcommand.setName('machines')
                        .setDescription('Reload ASMA Machines')
                )
                .addSubcommand(subcommand =>
                    subcommand.setName('roles')
                        .setDescription('Reload ASMA Guild Roles')
                )
                .addSubcommand(subcommand =>
                    subcommand.setName('servers')
                        .setDescription('Reload ASMA Game Servers')
                )
        )
        .setContexts(InteractionContextType.BotDM),

    enabled: true,

    async execute(interaction) {
        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        const isAdmin = interaction.user.id == process.env.ADMIN_ID;
        if (!isAdmin) {
            return interaction.reply({ content: 'You do not have permission to run this command. Please contact an admin if you are having difficulties.', flags: MessageFlags.Ephemeral });
        }

        /** RELOAD ASMA CACHES **/
        if (subcommandGroup == 'asma') {
            if (subcommand == 'machines') {
                interaction.client.asmaData.machines = await Machine.findAll();
                return interaction.reply({ content: `ASMA Machines have been reloaded.`, flags: MessageFlags.Ephemeral });
            }
            if (subcommand == 'roles') {
                interaction.client.asmaData.roles = await GuildRole.findAll();
                return interaction.reply({ content: `ASMA GuildRoles have been reloaded.`, flags: MessageFlags.Ephemeral });
            }
            if (subcommand == 'servers') {
                interaction.client.asmaData.servers = await GameServer.findAll();
                return interaction.reply({ content: `ASMA GameServers have been reloaded.`, flags: MessageFlags.Ephemeral });
            }
        }
    }
};
