// joinToCreateService.js

import {
    getJoinToCreateConfig,
    saveJoinToCreateConfig,
    updateJoinToCreateConfig,
    getTemporaryChannelInfo,
    formatChannelName as formatChannelNameUtil
} from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { Mutex } from '../utils/mutex.js';
import { RTC_REGIONS, sanitizeRoomStatus } from './voiceRoomLogic.js';
import { PacilBotError, ErrorTypes } from '../utils/errorHandler.js';
import { logEvent, EVENT_TYPES } from './loggingService.js';
import { formatLogLine } from '../utils/logging/logEmbeds.js';
import { ChannelType, PermissionFlagsBits } from 'discord.js';

const CHANNEL_NAME_MAX_LENGTH = 100;
const CHANNEL_VARIABLE_MAX_LENGTH = 32;
const CONTROL_AND_INVISIBLE_CHARS_REGEX = /[\x00-\x1F\x7F\u200B-\u200D\uFEFF]/g;
const ALLOWED_TEMPLATE_PLACEHOLDERS = new Set([
    '{username}',
    '{user_tag}',
    '{displayName}',
    '{display_name}',
    '{guildName}',
    '{guild_name}',
    '{channelName}',
    '{channel_name}'
]);

export function validateChannelNameTemplate(template) {
    if (!template || typeof template !== 'string') {
        throw new PacilBotError(
            'Invalid channel template: must be a non-empty string',
            ErrorTypes.VALIDATION,
            'Channel name template must be valid text.'
        );
    }

    const normalizedTemplate = template.normalize('NFKC').replace(CONTROL_AND_INVISIBLE_CHARS_REGEX, '').trim();

    if (normalizedTemplate.length > CHANNEL_NAME_MAX_LENGTH) {
        throw new PacilBotError(
            'Channel template exceeds maximum length',
            ErrorTypes.VALIDATION,
            `Channel name template cannot exceed ${CHANNEL_NAME_MAX_LENGTH} characters.`
        );
    }

    if (/[@#:`]/.test(normalizedTemplate)) {
        throw new PacilBotError(
            'Channel template contains forbidden characters',
            ErrorTypes.VALIDATION,
            'Channel template cannot contain @, #, :, or backtick characters.'
        );
    }

    const placeholders = normalizedTemplate.match(/\{[^}]+\}/g) || [];
    for (const placeholder of placeholders) {
        if (!ALLOWED_TEMPLATE_PLACEHOLDERS.has(placeholder)) {
            throw new PacilBotError(
                'Channel template contains unknown placeholders',
                ErrorTypes.VALIDATION,
                `Unknown placeholder: ${placeholder}. Allowed placeholders are ${Array.from(ALLOWED_TEMPLATE_PLACEHOLDERS).join(', ')}`
            );
        }
    }

    return true;
}

export function validateBitrate(bitrate) {
    const bitrateNum = parseInt(bitrate);

    if (isNaN(bitrateNum)) {
        throw new PacilBotError(
            'Bitrate must be a valid number',
            ErrorTypes.VALIDATION,
            'Please enter a valid number for bitrate.'
        );
    }

    if (bitrateNum < 8 || bitrateNum > 384) {
        throw new PacilBotError(
            'Bitrate out of valid range',
            ErrorTypes.VALIDATION,
            'Bitrate must be between 8 and 384 kbps.'
        );
    }

    return true;
}

export function validateUserLimit(limit) {
    const limitNum = parseInt(limit);

    if (isNaN(limitNum)) {
        throw new PacilBotError(
            'User limit must be a valid number',
            ErrorTypes.VALIDATION,
            'Please enter a valid number for user limit.'
        );
    }

    if (limitNum < 0 || limitNum > 99) {
        throw new PacilBotError(
            'User limit out of valid range',
            ErrorTypes.VALIDATION,
            'User limit must be between 0 (no limit) and 99.'
        );
    }

    return true;
}

export function formatChannelName(template, variables) {
    try {
        const safeTemplate = template.normalize('NFKC').replace(CONTROL_AND_INVISIBLE_CHARS_REGEX, '').trim();
        validateChannelNameTemplate(safeTemplate);

        if (!variables || typeof variables !== 'object') {
            throw new PacilBotError(
                'Invalid variables object for channel formatting',
                ErrorTypes.VALIDATION
            );
        }

        const sanitized = {};
        for (const [key, value] of Object.entries(variables)) {
            if (value === null || value === undefined) {
                sanitized[key] = 'Unknown';
            } else {
                
                sanitized[key] = String(value)
                    .normalize('NFKC')
                    .replace(CONTROL_AND_INVISIBLE_CHARS_REGEX, '')
                    .replace(/[@#:`\n\r\t]/g, '') 
                    .trim()
                    .substring(0, CHANNEL_VARIABLE_MAX_LENGTH);
            }
        }

        const replacements = {
            '{username}': sanitized.username || 'User',
            '{user_tag}': sanitized.userTag || 'User#0000',
            '{displayName}': sanitized.displayName || 'User',
            '{display_name}': sanitized.displayName || 'User',
            '{guildName}': sanitized.guildName || 'Server',
            '{guild_name}': sanitized.guildName || 'Server',
            '{channelName}': sanitized.channelName || 'Voice Channel',
            '{channel_name}': sanitized.channelName || 'Voice Channel',
        };

        let formatted = safeTemplate;
        for (const [placeholder, value] of Object.entries(replacements)) {
            formatted = formatted.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
        }

        formatted = formatted
            .normalize('NFKC')
            .replace(CONTROL_AND_INVISIBLE_CHARS_REGEX, '')
            .replace(/[@#:`\n\r\t]/g, '') 
            .replace(/\s+/g, ' ')
            .trim();

        if (formatted.length === 0) {
            formatted = 'Voice Channel';
        } else if (formatted.length > CHANNEL_NAME_MAX_LENGTH) {
            formatted = formatted.substring(0, CHANNEL_NAME_MAX_LENGTH);
        }

        logger.debug(`Formatted channel name: "${formatted}" from template "${template}"`);
        return formatted;

    } catch (error) {
        logger.error('Error formatting channel name:', error);
        throw error;
    }
}

export async function initializeJoinToCreate(client, guildId, channelId, options = {}) {
    try {
        if (!client || !client.db) {
            throw new PacilBotError(
                'Database service not available',
                ErrorTypes.DATABASE,
                'System error occurred. Please try again.'
            );
        }

        if (!guildId || !channelId) {
            throw new PacilBotError(
                'Missing required guild or channel ID',
                ErrorTypes.VALIDATION,
                'Invalid guild or channel information provided.'
            );
        }

        if (options.nameTemplate) {
            validateChannelNameTemplate(options.nameTemplate);
        }
        if (options.bitrate) {
            validateBitrate(options.bitrate / 1000); 
        }
        if (options.userLimit !== undefined) {
            validateUserLimit(options.userLimit);
        }

        const config = await getJoinToCreateConfig(client, guildId);

        if (config.triggerChannels.includes(channelId)) {
            throw new PacilBotError(
                'Channel already configured as Join to Create trigger',
                ErrorTypes.VALIDATION,
                'This channel is already set up as a Join to Create trigger.'
            );
        }

        if (Array.isArray(config.triggerChannels) && config.triggerChannels.length > 0) {
            throw new PacilBotError(
                'Guild already has a Join to Create trigger configured',
                ErrorTypes.VALIDATION,
                'This server already has a Join to Create channel configured. Use `/jointocreate dashboard` to modify it, or remove it before creating a new one.',
                {
                    guildId,
                    existingTriggerChannelId: config.triggerChannels[0],
                    expected: true,
                    suppressErrorLog: true
                }
            );
        }

        config.triggerChannels.push(channelId);
        config.enabled = true;

        if (Object.keys(options).length > 0) {
            if (!config.channelOptions) {
                config.channelOptions = {};
            }
            config.channelOptions[channelId] = {
                nameTemplate: options.nameTemplate || config.channelNameTemplate,
                userLimit: options.userLimit !== undefined ? options.userLimit : config.userLimit,
                bitrate: options.bitrate || config.bitrate,
                categoryId: options.categoryId || null,
                createdAt: Date.now()
            };
        }

        const saveResult = await saveJoinToCreateConfig(client, guildId, config);
        if (!saveResult) {
            throw new PacilBotError(
                'Failed to save Join to Create configuration',
                ErrorTypes.DATABASE,
                'Failed to set up Join to Create system. Please try again.'
            );
        }

        logger.info(`Initialized Join to Create for guild ${guildId} with trigger channel ${channelId}`);

        return config;

    } catch (error) {
        if (error instanceof PacilBotError) {
            throw error;
        }
        throw new PacilBotError(
            `Failed to initialize Join to Create: ${error.message}`,
            ErrorTypes.DATABASE,
            'Failed to set up Join to Create system.'
        );
    }
}

// Dokumen JTC ditulis utuh, jadi semua perubahan memakai kunci yang sama dengan voiceRoomService.updateRoom.
const jtcDocLock = (guildId) => `jtc-doc:${guildId}`;

export const updateChannelConfig = (client, guildId, channelId, updates) =>
    Mutex.runExclusive(jtcDocLock(guildId), () => updateChannelConfigUnlocked(client, guildId, channelId, updates));

export const removeTriggerChannel = (client, guildId, channelId) =>
    Mutex.runExclusive(jtcDocLock(guildId), () => removeTriggerChannelUnlocked(client, guildId, channelId));

async function updateChannelConfigUnlocked(client, guildId, channelId, updates) {
    try {
        if (!client || !client.db) {
            throw new PacilBotError(
                'Database service not available',
                ErrorTypes.DATABASE,
                'Database service is currently unavailable. Please try again later.'
            );
        }

        const config = await getJoinToCreateConfig(client, guildId);

        if (!config.triggerChannels.includes(channelId)) {
            throw new PacilBotError(
                'Channel is not configured as a Join to Create trigger',
                ErrorTypes.VALIDATION,
                'This channel is not set up as a Join to Create trigger.'
            );
        }

        if (updates.nameTemplate) {
            validateChannelNameTemplate(updates.nameTemplate);
        }
        if (updates.bitrate !== undefined) {
            validateBitrate(updates.bitrate / 1000);
        }
        if (updates.userLimit !== undefined) {
            validateUserLimit(updates.userLimit);
        }
        if (updates.rtcRegion !== undefined && updates.rtcRegion !== null
            && !RTC_REGIONS.some((region) => region.rtc === updates.rtcRegion)) {
            throw new PacilBotError('Unknown RTC region', ErrorTypes.VALIDATION, 'Region suara tidak dikenal.');
        }
        if (updates.videoQuality !== undefined && !['auto', 'full'].includes(updates.videoQuality)) {
            throw new PacilBotError('Invalid video quality', ErrorTypes.VALIDATION, 'Mode video harus auto atau full.');
        }
        if (updates.defaultStatus !== undefined) {
            updates = { ...updates, defaultStatus: sanitizeRoomStatus(updates.defaultStatus) };
        }

        if (!config.channelOptions) {
            config.channelOptions = {};
        }

        config.channelOptions[channelId] = {
            ...config.channelOptions[channelId],
            ...updates,
            updatedAt: Date.now()
        };

        await saveJoinToCreateConfig(client, guildId, config);

        logger.info(`Updated Join to Create config for channel ${channelId} in guild ${guildId}`, {
            updates: Object.keys(updates)
        });

        return config.channelOptions[channelId];

    } catch (error) {
        if (error instanceof PacilBotError) {
            throw error;
        }
        throw new PacilBotError(
            `Failed to update channel config: ${error.message}`,
            ErrorTypes.DATABASE,
            'Failed to update configuration.'
        );
    }
}

async function removeTriggerChannelUnlocked(client, guildId, channelId) {
    try {
        if (!client || !client.db) {
            throw new PacilBotError(
                'Database service not available',
                ErrorTypes.DATABASE,
                'Database service is currently unavailable. Please try again later.'
            );
        }

        const config = await getJoinToCreateConfig(client, guildId);

        const index = config.triggerChannels.indexOf(channelId);
        if (index === -1) {
            throw new PacilBotError(
                'Channel not found in Join to Create triggers',
                ErrorTypes.VALIDATION,
                'This channel is not configured as a Join to Create trigger.'
            );
        }

        config.triggerChannels.splice(index, 1);
        config.enabled = config.triggerChannels.length > 0;

        if (config.channelOptions && config.channelOptions[channelId]) {
            delete config.channelOptions[channelId];
        }

        if (config.temporaryChannels) {
            for (const [tempChannelId, tempInfo] of Object.entries(config.temporaryChannels)) {
                if (tempInfo.triggerChannelId === channelId) {
                    delete config.temporaryChannels[tempChannelId];
                }
            }
        }

        await saveJoinToCreateConfig(client, guildId, config);

        logger.info(`Removed Join to Create trigger channel ${channelId} from guild ${guildId}`);

        return true;

    } catch (error) {
        if (error instanceof PacilBotError) {
            throw error;
        }
        throw new PacilBotError(
            `Failed to remove trigger channel: ${error.message}`,
            ErrorTypes.DATABASE,
            'Failed to remove trigger channel.'
        );
    }
}

export async function getConfiguration(client, guildId) {
    try {
        if (!client || !client.db) {
            throw new PacilBotError(
                'Database service not available',
                ErrorTypes.DATABASE,
                'Database service is currently unavailable. Please try again later.'
            );
        }

        return await getJoinToCreateConfig(client, guildId);

    } catch (error) {
        if (error instanceof PacilBotError) {
            throw error;
        }
        throw new PacilBotError(
            `Failed to retrieve configuration: ${error.message}`,
            ErrorTypes.DATABASE,
            'Failed to retrieve settings.'
        );
    }
}

export async function isTriggerChannel(client, guildId, channelId) {
    try {
        const config = await getConfiguration(client, guildId);
        return config.triggerChannels.includes(channelId);
    } catch (error) {
        logger.error(`Error checking if channel is trigger: ${error.message}`);
        return false;
    }
}

export async function getChannelConfiguration(client, guildId, channelId) {
    try {
        const config = await getConfiguration(client, guildId);

        if (!config.triggerChannels || !Array.isArray(config.triggerChannels) || !config.triggerChannels.includes(channelId)) {
            throw new PacilBotError(
                'Channel is not a valid Join to Create trigger',
                ErrorTypes.VALIDATION,
                'This channel is not set up as a Join to Create trigger.'
            );
        }

        return {
            ...config,
            channelConfig: config.channelOptions?.[channelId] || {}
        };

    } catch (error) {
        if (error instanceof PacilBotError) {
            throw error;
        }
        throw new PacilBotError(
            `Failed to get channel configuration: ${error.message}`,
            ErrorTypes.DATABASE,
            'Failed to retrieve channel configuration. Please try again.'
        );
    }
}

export function hasManageGuildPermission(member) {
    try {
        if (!member || !member.permissions) {
            return false;
        }
        return member.permissions.has(PermissionFlagsBits.ManageGuild);
    } catch (error) {
        logger.error('Error checking ManageGuild permission:', error);
        return false;
    }
}

export async function logConfigurationChange(client, guildId, userId, action, details) {
    try {
        await logEvent({
            client,
            guildId,
            eventType: EVENT_TYPES.COUNTER_CONFIG,
            data: {
                title: 'Join to Create Updated',
                lines: [
                    formatLogLine('Action', action),
                    formatLogLine('Details', typeof details === 'string' ? details : JSON.stringify(details)),
                ],
                userId,
            },
        });
    } catch (error) {
        logger.warn(`Failed to log Join to Create configuration change: ${error.message}`);
    }
}

export async function createTemporaryChannel(guild, member, options = {}) {
    try {
        if (!guild || !member) {
            throw new PacilBotError(
                'Invalid guild or member',
                ErrorTypes.VALIDATION
            );
        }

        const {
            nameTemplate,
            userLimit,
            bitrate,
            parentId
        } = options;

        if (nameTemplate) {
            validateChannelNameTemplate(nameTemplate);
        }
        if (userLimit !== undefined) {
            validateUserLimit(userLimit);
        }
        if (bitrate !== undefined) {
            validateBitrate(bitrate / 1000);
        }

        const channelName = formatChannelName(nameTemplate || '{username}\'s Room', {
            username: member.user.username,
            displayName: member.displayName,
            userTag: member.user.tag,
            guildName: guild.name
        });

        const tempChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            parent: parentId,
            userLimit: userLimit === 0 ? undefined : userLimit,
            bitrate: bitrate || 64000,
            permissionOverwrites: [
                {
                    id: member.id,
                    allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.PrioritySpeaker, PermissionFlagsBits.MoveMembers]
                },
                {
                    id: guild.id,
                    allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
                }
            ]
        });

        logger.info(`Created temporary voice channel ${tempChannel.name} (${tempChannel.id}) for user ${member.user.tag}`);

        return {
            id: tempChannel.id,
            name: tempChannel.name,
            ownerId: member.id
        };

    } catch (error) {
        if (error instanceof PacilBotError) {
            throw error;
        }
        throw new PacilBotError(
            `Failed to create temporary channel: ${error.message}`,
            ErrorTypes.DISCORD_API,
            'Failed to create your temporary voice channel. Please contact an administrator.'
        );
    }
}

export default {
    validateChannelNameTemplate,
    validateBitrate,
    validateUserLimit,
    formatChannelName,
    initializeJoinToCreate,
    updateChannelConfig,
    removeTriggerChannel,
    getConfiguration,
    isTriggerChannel,
    getChannelConfiguration,
    hasManageGuildPermission,
    logConfigurationChange,
    createTemporaryChannel
};