// import environmental variables
require('dotenv').config();

// Require the necessary discord.js classes
const { Sequelize, DataTypes } = require('sequelize');

//Connect to mysql database
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    logging: process.env.DB_LOGGING == 'true' ? console.log : false,
    define: {
        "freezeTableName": process.env.DB_FREEZE_TABLE_NAME == 'true',
        "timestamps": false,
        "createdAt": process.env.DB_CREATED_AT == 'true',
        "updatedAt": process.env.DB_UPDATED_AT == 'true',
    },
});

const GuildRole = sequelize.define("asmaGuildRoles", {
    id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    guild_id: {
        type: DataTypes.BIGINT(18),
        allowNull: false
    },
    role_id: {
        type: DataTypes.BIGINT(18),
        allowNull: false
    },
    command: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    profile_name: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: null
    },
    cooldown: {
        type: DataTypes.INTEGER(11),
        allowNull: true
    }
}, {
    timestamps: false,
    indexes: [
        { unique: true, fields: ['guild_id', 'role_id', 'command', 'profile_name'] }
    ]
});

const Machine = sequelize.define('asmaMachines', {
    id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    guild_id: {
        type: DataTypes.BIGINT(18),
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    base_url: {
        type: DataTypes.STRING(200),
        allowNull: false
    }, 
    api_token: {
        type: DataTypes.STRING(50),
        allowNull: false
    }
}, {
    timestamps: false
});

const GameServer = sequelize.define('asmaGameServers', {
    id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    guild_id: {
        type: DataTypes.BIGINT(18),
        allowNull: false
    },
    machine_id: {
        type: DataTypes.INTEGER(11),
        allowNull: false
    },
    profile_name: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    display_name: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    last_status: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: null
    },
    hidden: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { unique: true, fields: ['guild_id', 'profile_name'] }
    ]
});

const CommandLog = sequelize.define('asmaCommandLog', {
    id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    }, 
    guild_id: {
        type: DataTypes.BIGINT(18),
        allowNull: false
    },
    user_id: {
        type: DataTypes.BIGINT(18),
        allowNull: false
    },
    machine_id: {
        type: DataTypes.INTEGER(11),
        allowNull: false
    },
    profile_name: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    command: {
        type: DataTypes.STRING(20),
        allowNull: false
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

async function connectDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');
        await sequelize.sync({ alter: true });
        console.log('Database synchronized.');
    } catch (error) {
        console.log('Databases connection error: ', error );
    }
}

module.exports = { sequelize, connectDatabase, GuildRole, Machine, GameServer, CommandLog };
