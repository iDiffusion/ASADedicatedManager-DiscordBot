const axios = require("axios");

function createClient(machine) {
    return axios.create({
        baseURL: machine.base_url,
        timeout: 15000,
        headers: {
            Authorization: `Bearer ${machine.api_token}`,
            "Content-Type": "application/json",
        }
    });
}

async function getServers(machine) {
    const client = createClient(machine);
    const response = await client.get("/server-status");
    return response.data;
}

async function executeCommand(machine, command, profileName) {
    const client = createClient(machine);
    const response = await client.post(`/${command}`, { profileName });
    return response.data;
}

async function rconCommand(machine, profileName, message) {
    const client = createClient(machine);
    const response = await client.post("/rcon", { profileName, message });
    return response.data;
}

async function getPlayers(machine, profileName) {
    const client = createClient(machine);
    const response = await client.post("/players", { profileName });
    return response.data;
}

async function syncFromApi(guildId) {
    const { Machine, GameServer } = require("./database");
    const machines = await Machine.findAll({ where: { guild_id: guildId } });

    for (const machine of machines) {
        try {
            const apiData = await getServers(machine);
            const profiles = apiData.servers || [];

            const rows = profiles.map(s => ({
                guild_id: guildId,
                machine_id: machine.id,
                profile_name: s.ProfileName,
                display_name: s.ProfileName,
                last_status: s.Status ?? null,
                hidden: true
            }));

            if (rows.length === 0) continue;

            await GameServer.bulkCreate(rows, {
                updateOnDuplicate: ["last_status", "updated_at"]
            });
        } catch (error) {
            console.error(`Failed to sync machine ${machine.name}:`, error.message);
        }
    }
}

module.exports = { getServers, executeCommand, rconCommand, getPlayers, syncFromApi };
