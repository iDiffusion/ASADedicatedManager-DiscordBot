require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];

// Grab all the command files from the commands directory
const commandPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith('.js'));

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
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

    // Grab command data
    commands.push(command.data.toJSON());
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.TOKEN);

// and deploy your commands!
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);
        // The put method is used to fully refresh all commands globally with the current set
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
})();
