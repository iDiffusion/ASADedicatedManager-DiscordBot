# ASA Dedicated Manager Bot

A Discord bot for managing ARK Survival Ascended dedicated servers through the ASA Dedicated Manager (ASMA) API. Server admins configure which Discord roles can run which commands, and players interact with their servers directly from Discord.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v16.9 or higher
- A MySQL (or MariaDB) database
- One or more machines running the ASMA API with an API token
- A Discord application and bot token ([Discord Developer Portal](https://discord.com/developers/applications))

---

## Installation

**1. Clone the repository**
```bash
git clone https://github.com/iDiffusion/ASADedicatedManager-DiscordBot.git
cd ASADedicatedManager-DiscordBot
```

**2. Install dependencies**
```bash
npm install
```

**3. Create your `.env` file**

```bash
cp .env.example .env
```

Then open `.env` and fill in your values.

**4. Create the database**

The bot uses Sequelize with `sync({ alter: true })`, so it will create and update tables automatically on startup. You only need to create the database itself:

```sql
CREATE DATABASE asadm_bot;
```

**5. Deploy slash commands**
```bash
node deploy-commands.js
```

> Commands are registered globally. Discord can take up to an hour to propagate them, but they usually appear within a few minutes.

**6. Start the bot**
```bash
node bot.js
```

Or with PM2 (recommended for production):
```bash
npm install -g pm2
pm2 start pm2.json
```

> The PM2 config names the process `WardenBot` by default. Change the `name` field in `pm2.json` if you prefer something else.

---

## First-Time Setup in Discord

Once the bot is online, a server administrator runs these commands to configure it:

**1. Add a machine**
```
/asma machines add name:MyServer url:http://192.168.1.100:5000 api_token:your_token
```
The bot will automatically sync the server profiles from that machine.

**2. Make servers visible**

Synced servers start hidden. Use `/asma servers list` to see what was found, then show the ones you want players to see:
```
/asma servers show profile_name:TheIsland
```

**3. Assign roles**

The quickest way is the preset system:
```
/asma quicksetup role:@Admins preset:ADMIN
/asma quicksetup role:@Mods preset:OPERATOR
/asma quicksetup role:@Players preset:PLAYER
/asma quicksetup role:@Everyone preset:VIEWER
```

For fine-grained control, use manual role management:
```
/asma roles add role:@Players command:start server:TheIsland cooldown:3600
/asma roles remove role:@Players command:start
```

---

## Permission Presets

| Preset | Commands | Cooldown |
|--------|----------|----------|
| **VIEWER** | status | none |
| **PLAYER** | status, start | 1hr on start |
| **OPERATOR** | status, start, stop, update, destroy, saveworld, players | none |
| **ADMIN** | all commands | none |

Cooldowns are per-user, per-server, per-command. If a user has multiple roles, the most permissive grant (lowest cooldown) wins.

Manual grants use `null` as a wildcard (applies to all servers). A specific server grant takes precedence for that server only.

---

## Commands

### `/server` — Player-facing server controls

| Subcommand | Description | Who can use |
|------------|-------------|-------------|
| `status` | View live status of all visible servers | Any role with `status` grant |
| `start` | Start a server | Any role with `start` grant |
| `stop` | Stop a server | Any role with `stop` grant |
| `update` | Stop, update, and restart a server | Any role with `update` grant |
| `destroy` | Destroy all wild dinos | Any role with `destroy` grant |
| `saveworld` | Save the world | Any role with `saveworld` grant |
| `players` | List connected players | Any role with `players` grant |
| `backup` | Run a full backup | Any role with `backup` grant |
| `kill` | Force kill the server (risk of data loss) | Any role with `kill` grant |
| `rcon` | Send an RCON command | Any role with `rcon` grant |

### `/asma` — Admin configuration (requires Discord Administrator)

| Subcommand | Description |
|------------|-------------|
| `quicksetup <role> <preset>` | Apply a permission preset to a role |
| `machines add` | Add a machine running ASMA |
| `machines remove` | Remove a machine |
| `machines list` | List configured machines |
| `servers show` | Make a server visible to players |
| `servers hide` | Hide a server from players |
| `servers rename` | Set a display name for a server |
| `servers list` | List all servers (hidden and visible) |
| `servers sync` | Re-sync server list from all machines |
| `roles add` | Manually grant a role access to a command |
| `roles remove` | Revoke a role's command access |
| `roles list` | List all role grants |

---

## Development

**Hot-reload a command without restarting the bot:**
```
/reload command:server
```

**Remove all deployed slash commands:**
```bash
node delete-commands.js
```

---

## License

See [LICENSE](LICENSE).
