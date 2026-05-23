// import environmental variables
require('dotenv').config();

// Require the necessary discord.js classes
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

// Create a new client instance
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

// Create a collection of commands
client.commands = new Collection();

const commandPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandPath, file);
    const command = require(filePath);

    // Sanity Check
    if (!('data' in command)) {
        console.log(`[WARNING] The command at ${filePath} is missing the required "data" property.`);
        continue;
    }

    if (!('execute' in command)) {
        console.log(`[WARNING] The command at ${filePath} is missing the required "execute" property.`);
        continue;
    }

    if (!('enabled' in command)) {
        console.log(`[WARNING] The command at ${filePath} is missing the required "enabled" property.`);
        continue;
    }

    if (command.enabled != true) {
        console.log(`[WARNING] The command at ${filePath} is disabled and will be skipped.`);
        continue;
    }

    // Set a new item in the Collection with the key as the command name and the value as the exported module
    client.commands.set(command.data.name, command);
}

// Create event handler
const eventPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventPath, file);
    const event = require(filePath);

    // Set a new event listener
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Log in to Discord with your client's token
client.login(process.env.TOKEN);
