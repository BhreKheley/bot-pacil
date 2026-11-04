import { createRequire } from 'module';
import { GatewayDispatchEvents } from 'discord.js';
import { logger } from '../../utils/logger.js';
import lavalinkConfig from '../../config/music/lavalink.js';
import { setupPlayerHandler } from './playerHandler.js';

const require = createRequire(import.meta.url);
const { Riffy } = require('riffy');

export function initializeMusic(client) {
    if (!lavalinkConfig.nodes?.length) {
        logger.error('No Lavalink nodes configured. Add lavalink/nodes.json, set LAVALINK_NODES, or set LAVALINK_HOST in your environment.');
        return;
    }

    client.riffy = new Riffy(client, lavalinkConfig.nodes, {
        send: (payload) => {
            const guildId = payload.d?.guild_id;
            if (!guildId) {
                return;
            }

            try {
                const guild = client.guilds.cache.get(guildId);
                if (guild?.shard) {
                    guild.shard.send(payload);
                    return;
                }

                const shardCount = client.ws?.shards?.size || 1;
                const shardId = Number((BigInt(guildId) >> 22n) % BigInt(shardCount));
                client.ws?.shards?.get(shardId)?.send(payload);
            } catch (err) {
                logger.error('Failed to send voice payload to gateway:', err);
            }
        },
        defaultSearchPlatform: lavalinkConfig.defaultSearchPlatform,
        restVersion: lavalinkConfig.restVersion,
        migrateOnDisconnect: true,
        bypassChecks: {
            nodeFetchInfo: true,
        },
    });

    setupPlayerHandler(client);

    client.on('raw', (packet) => {
        if (
            ![
                GatewayDispatchEvents.VoiceStateUpdate,
                GatewayDispatchEvents.VoiceServerUpdate,
            ].includes(packet.t)
        ) {
            return;
        }

        if (client.riffy) {
            if (!client.riffy.clientId && client.user?.id) {
                client.riffy.init(client.user.id);
            }
            client.riffy.updateVoiceState(packet);
        }
    });

    client.riffy.on('playerError', (player, error) => {
        logger.error(`Music player error in guild ${player.guildId}:`, error);
    });

    logger.info(`Music initialized with ${lavalinkConfig.nodes.length} Lavalink node(s).`);
}

export function initRiffyAfterReady(client) {
    if (client.riffy && client.user?.id) {
        client.riffy.init(client.user.id);
        logger.info('Riffy voice connection manager initialized.');
    }
}
