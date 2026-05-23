const { Collection, Events } = require('discord.js');
const { connectDatabase, Machine, GameServer, GuildRole } = require('../database');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${ client.user.tag}.`);

        await connectDatabase();

        // create global cache
        client.asmaData = new Object();

        // initialize as empty arrays to prevent errors while fetching
        client.asmaData.machines = [];
        client.asmaData.servers = [];
        client.asmaData.roles = [];

        // pull data to be cached from database
        client.asmaData.machines = await Machine.findAll();
        client.asmaData.servers = await GameServer.findAll();
        client.asmaData.roles = await GuildRole.findAll();

    }
};
