// constants.js

export const DEFAULT_GUILD_CONFIG = {
    enabledCommands: {},
    // Izin per command: { 'nama command': { allowedRoles, allowedChannels, cooldownSeconds } }
    commandPolicies: {},
    birthdayChannelId: null,
    premiumRoleId: null,
    modRole: null,
    adminRole: null,
    welcomeChannel: null,
    autoRole: null,
    logging: {
        enabled: false,
        channels: { audit: null, applications: null, reports: null },
        ignore: { users: [], channels: [] },
        enabledEvents: {},
    },
    verification: {
        enabled: false
    },
    // Publicly anonymous; moderators may review before a message is published.
    confessions: {
        enabled: false,
        channelId: null,
        reviewChannelId: null,
        moderatorRoleId: null,
        requireApproval: true,
        cooldownMinutes: 10,
        repliesEnabled: true,
        replyCooldownSeconds: 30,
    },
    // Private Circle configuration
    circle: {
        enabled: true,
        requireApproval: false,
        reviewChannelId: null,
        categoryLimit: 45,
        roleLimit: 240,
        channels: [],
    },
    // Welcome / Arrival / Goodbye system
    welcome: {
        enabled: false,
        channelId: null,
        channel: null,
        welcomeMessage: "",
        message: "",
        welcomeTitle: "",
        welcomeEmbed: {
            title: "🎉 Welcome!",
            description: "Welcome {user} to {server}!",
            color: "#10B981",
            thumbnail: true,
            footer: "Welcome to {server}!"
        },
        welcomePing: false,
        guideChannelId: null,
        welcomeImage: null,
        welcomeThumbnail: null,
        cardStyle: "default",
        dmOnClose: true,
        dmMessage: "",
        goodbyeEnabled: false,
        goodbyeChannelId: null,
        leaveMessage: "",
        goodbyeTitle: "",
        leaveEmbed: {
            title: "👋 Goodbye",
            description: "{user.tag} has left the server.",
            color: "#EF4444",
            thumbnail: true,
            footer: "Goodbye from {server}!"
        },
        goodbyePing: false,
        goodbyeImage: null,
        goodbyeThumbnail: null,
        roleIds: [],
        autoRoleDelay: 0,
        joinLogs: { enabled: false, channelId: null },
        leaveLogs: { enabled: false, channelId: null }
    },
    // Leveling / XP system
    leveling: {
        enabled: false,
        configured: false,
        xpRate: 1.0,
        xpRange: { min: 15, max: 25 },
        cooldown: 60,
        xpCooldown: 60,
        announceChannel: null,
        levelUpChannel: null,
        announceLevelUp: true,
        levelUpMessage: '{user} has leveled up to level {level}!',
        noXpChannels: [],
        ignoredChannels: [],
        noXpRoles: [],
        ignoredRoles: [],
        rewards: {},
        roleRewards: {},
        roles: {},
        milestones: {},
        xpPerMessage: 10,
        xpPerMinute: 60,
        cooldownEnabled: true,
        messageLengthMultiplier: true,
        levelUpMessages: true
    },
    // Join-To-Create (JTC) temporary voice rooms
    jointocreate: {
        enabled: false,
        creatorChannels: [],
        triggerChannels: [],
        categoryId: null,
        channelNameTemplate: "{username}'s Room",
        defaultLimit: 0,
        userLimit: 0,
        defaultBitrate: 64000,
        bitrate: 64000,
        temporaryChannels: {}
    },
    // Moderation escalation policies
    moderationPolicy: {
        dmOnAction: true,
        maxWarnings: 3,
        autoMuteDuration: 60,
        logChannel: null,
        appealsEnabled: false,
        escalation: {
            enabled: false,
            timeoutAt: 3,
            timeoutMinutes: 60,
            kickAt: 0
        }
    },
    // Server booster perks and custom roles
    booster: {
        enabled: true,
        customRoleEnabled: true,
        autoCleanup: true,
        allowGift: true,
        allowIcon: true,
        nameMaxLength: 30,
        announceChannel: null,
        boostChannelId: null,
        thankMessage: 'Terima kasih atas server boost-nya!',
        perks: ['custom_role', 'gradient_color', 'circle_room']
    },
    // Staff / Guild Application system
    applications: {
        enabled: false,
        open: false,
        applicationChannelId: null,
        reviewChannel: null,
        logChannelId: null,
        questions: [
            { question: 'Why do you want to apply?', type: 'paragraph', required: true }
        ],
        roles: {
            admin: null,
            reviewer: null,
            accepted: null,
            denied: null
        },
        pingRoles: [],
        requiredRoles: [],
        deniedRoles: [],
        minAccountAge: 0,
        maxApplications: 1,
        cooldown: 7,
        allowMultipleApplications: false,
        requireVerification: false,
        customWelcomeMessage: "",
        pendingApplicationRetentionDays: 30,
        reviewedApplicationRetentionDays: 14
    }
};

export const INTERACTION_TIMEOUTS = {
    EXPIRE: 15 * 60 * 1000,  
    DEFER_TIMEOUT: 3000,      
    REPLY_TIMEOUT: 3000       
};

export const STORAGE_LIMITS = {
    MAX_EMBED_TITLE: 256,
    MAX_EMBED_DESCRIPTION: 4096,
    MAX_EMBED_FIELDS: 25,
    MAX_EMBED_FIELD_NAME: 256,
    MAX_EMBED_FIELD_VALUE: 1024,
    MAX_BUTTON_LABEL: 80,
    MAX_BUTTON_CUSTOM_ID: 100,
    MAX_SELECT_PLACEHOLDER: 150,
    MAX_USER_INPUT: 2000,
    MAX_CUSTOM_ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
    MAX_BUTTONS_PER_ROW: 5
};

export const DEFAULTS = {
    EMPTY_ARRAY: [],
    EMPTY_OBJECT: {},
    EMPTY_STRING: '',
    ZERO: 0,
    FALSE: false,
    NULL: null
};

export const ERROR_DEFAULTS = {
    INVALID_INPUT: 'Invalid input provided',
    DATABASE_ERROR: 'Database operation failed',
    NOT_FOUND: 'Not found',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
    INVALID_FORMAT: 'Invalid format'
};

export const TIME = {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000
};

export default {
    DEFAULT_GUILD_CONFIG,
    INTERACTION_TIMEOUTS,
    STORAGE_LIMITS,
    DEFAULTS,
    ERROR_DEFAULTS,
    TIME
};
