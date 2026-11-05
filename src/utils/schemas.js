// schemas.js

import { z } from 'zod';
import { createError, ErrorTypes } from './errorHandler.js';

export const LogIgnoreSchema = z
  .object({
    users: z.array(z.string()).default([]),
    channels: z.array(z.string()).default([])
  })
  .default({ users: [], channels: [] });

export const LoggingChannelsSchema = z
  .object({
    audit: z.string().nullable().optional(),
    applications: z.string().nullable().optional(),
    reports: z.string().nullable().optional(),
  })
  .default({ audit: null, applications: null, reports: null });

export const LoggingConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    channels: LoggingChannelsSchema.optional(),
    ignore: LogIgnoreSchema.optional(),
    enabledEvents: z.record(z.boolean()).default({}),
    // legacy flat fields — accepted on parse, stripped on normalize
    channelId: z.string().nullable().optional(),
  })
  .default({ enabled: false, enabledEvents: {} });

const TicketLoggingSchema = z
  .object({
    lifecycleChannelId: z.string().nullable().optional(),
    transcriptChannelId: z.string().nullable().optional()
  })
  .optional();

const AutoVerifyConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    criteria: z.enum(['account_age', 'server_size', 'none']).default('none'),
    accountAgeDays: z.number().int().min(1).max(365).nullable().optional(),
    roleId: z.string().nullable().optional()
  })
  .optional();

const VerificationConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    channelId: z.string().nullable().optional(),
    messageId: z.string().nullable().optional(),
    roleId: z.string().optional(),
    message: z.string().optional(),
    buttonText: z.string().default('Verify'),
    autoVerify: AutoVerifyConfigSchema
  })
  .optional();

// 1. Command Policies Schemas
export const CommandPolicyEntrySchema = z
  .object({
    allowedRoles: z.array(z.string()).default([]),
    allowedChannels: z.array(z.string()).default([]),
    cooldownSeconds: z.number().int().min(0).max(86400).default(0),
  })
  .default({ allowedRoles: [], allowedChannels: [], cooldownSeconds: 0 });

export const CommandPoliciesSchema = z.record(z.string(), CommandPolicyEntrySchema).default({});

// 2. Confession Config Schema
export const ConfessionConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    channelId: z.string().nullable().optional().default(null),
    reviewChannelId: z.string().nullable().optional().default(null),
    moderatorRoleId: z.string().nullable().optional().default(null),
    requireApproval: z.boolean().default(true),
    cooldownMinutes: z.number().int().min(0).max(1440).default(10),
    repliesEnabled: z.boolean().default(true),
    replyCooldownSeconds: z.number().int().min(0).max(3600).default(30),
  })
  .default({
    enabled: false,
    channelId: null,
    reviewChannelId: null,
    moderatorRoleId: null,
    requireApproval: true,
    cooldownMinutes: 10,
    repliesEnabled: true,
    replyCooldownSeconds: 30,
  });

// 3. Circle Config Schema
export const CircleConfigSchema = z
  .object({
    enabled: z.boolean().default(true),
    requireApproval: z.boolean().default(false),
    reviewChannelId: z.string().nullable().optional().default(null),
    categoryLimit: z.number().int().min(1).max(50).default(45),
    roleLimit: z.number().int().min(1).max(250).default(240),
    channels: z.array(z.string()).default([]),
  })
  .default({
    enabled: true,
    requireApproval: false,
    reviewChannelId: null,
    categoryLimit: 45,
    roleLimit: 240,
    channels: [],
  });

// 4. Welcome Config Schema
export const WelcomeEmbedOptionsSchema = z
  .object({
    title: z.string().optional().default("🎉 Welcome!"),
    description: z.string().optional().default("Welcome {user} to {server}!"),
    color: z.union([z.string(), z.number()]).optional().default("#10B981"),
    thumbnail: z.union([z.boolean(), z.string()]).optional().default(true),
    footer: z.string().optional().default("Welcome to {server}!"),
    image: z.any().optional(),
  })
  .passthrough()
  .default({
    title: "🎉 Welcome!",
    description: "Welcome {user} to {server}!",
    color: "#10B981",
    thumbnail: true,
    footer: "Welcome to {server}!"
  });

export const WelcomeConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    channelId: z.string().nullable().optional().default(null),
    channel: z.string().nullable().optional(),
    welcomeMessage: z.string().default(""),
    message: z.string().optional(),
    welcomeTitle: z.string().default(""),
    welcomeEmbed: WelcomeEmbedOptionsSchema.optional(),
    welcomePing: z.boolean().default(false),
    guideChannelId: z.string().nullable().optional().default(null),
    welcomeImage: z.string().nullable().optional().default(null),
    welcomeThumbnail: z.string().nullable().optional().default(null),
    cardStyle: z.string().default("default"),
    dmOnClose: z.boolean().default(true),
    dmMessage: z.string().default(""),
    goodbyeEnabled: z.boolean().default(false),
    goodbyeChannelId: z.string().nullable().optional().default(null),
    leaveMessage: z.string().default(""),
    goodbyeTitle: z.string().default(""),
    leaveEmbed: WelcomeEmbedOptionsSchema.optional(),
    goodbyePing: z.boolean().default(false),
    goodbyeImage: z.string().nullable().optional().default(null),
    goodbyeThumbnail: z.string().nullable().optional().default(null),
    roleIds: z.array(z.string()).default([]),
    autoRoleDelay: z.number().int().min(0).max(3600).default(0),
    joinLogs: z
      .object({
        enabled: z.boolean().default(false),
        channelId: z.string().nullable().optional().default(null)
      })
      .default({ enabled: false, channelId: null }),
    leaveLogs: z
      .object({
        enabled: z.boolean().default(false),
        channelId: z.string().nullable().optional().default(null)
      })
      .default({ enabled: false, channelId: null })
  })
  .passthrough()
  .default({
    enabled: false,
    channelId: null,
    welcomeMessage: "",
    welcomeTitle: "",
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
    goodbyePing: false,
    goodbyeImage: null,
    goodbyeThumbnail: null,
    roleIds: [],
    autoRoleDelay: 0,
    joinLogs: { enabled: false, channelId: null },
    leaveLogs: { enabled: false, channelId: null }
  });

// 5. Leveling Config Schema
export const LevelingConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    configured: z.boolean().default(false),
    xpRate: z.union([z.number(), z.object({ min: z.number(), max: z.number() })]).default(1.0),
    xpRange: z
      .object({
        min: z.number().int().min(1).default(15),
        max: z.number().int().min(1).default(25),
      })
      .default({ min: 15, max: 25 }),
    cooldown: z.number().int().min(0).max(3600).default(60),
    xpCooldown: z.number().int().min(0).max(3600).default(60),
    announceChannel: z.string().nullable().optional().default(null),
    levelUpChannel: z.string().nullable().optional().default(null),
    announceLevelUp: z.boolean().default(true),
    levelUpMessage: z.string().default('{user} has leveled up to level {level}!'),
    noXpChannels: z.array(z.string()).default([]),
    ignoredChannels: z.array(z.string()).default([]),
    noXpRoles: z.array(z.string()).default([]),
    ignoredRoles: z.array(z.string()).default([]),
    rewards: z.record(z.string(), z.string()).default({}),
    roleRewards: z.record(z.string(), z.string()).default({}),
    roles: z.record(z.string(), z.string()).default({}),
    milestones: z.record(z.string(), z.any()).default({}),
    xpPerMessage: z.union([z.number(), z.object({ min: z.number(), max: z.number() })]).optional().default(10),
    xpPerMinute: z.number().default(60),
    cooldownEnabled: z.boolean().default(true),
    messageLengthMultiplier: z.boolean().default(true),
    levelUpMessages: z.boolean().default(true),
  })
  .passthrough()
  .default({
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
    levelUpMessages: true,
  });

// 6. Join To Create (JTC) Config Schema
export const JtcConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    creatorChannels: z.array(z.string()).default([]),
    triggerChannels: z.array(z.string()).default([]),
    categoryId: z.string().nullable().optional().default(null),
    channelNameTemplate: z.string().default("{username}'s Room"),
    defaultLimit: z.number().int().min(0).max(99).default(0),
    userLimit: z.number().int().min(0).max(99).default(0),
    defaultBitrate: z.number().int().min(8000).max(384000).default(64000),
    bitrate: z.number().int().min(8000).max(384000).default(64000),
    temporaryChannels: z.record(z.string(), z.any()).default({}),
  })
  .passthrough()
  .default({
    enabled: false,
    creatorChannels: [],
    triggerChannels: [],
    categoryId: null,
    channelNameTemplate: "{username}'s Room",
    defaultLimit: 0,
    userLimit: 0,
    defaultBitrate: 64000,
    bitrate: 64000,
    temporaryChannels: {},
  });

// 7. Moderation Policy Schema
export const ModerationEscalationSchema = z
  .object({
    enabled: z.boolean().default(false),
    timeoutAt: z.number().int().min(0).max(20).default(3),
    timeoutMinutes: z.number().int().min(1).max(40320).default(60),
    kickAt: z.number().int().min(0).max(20).default(0),
  })
  .default({
    enabled: false,
    timeoutAt: 3,
    timeoutMinutes: 60,
    kickAt: 0,
  });

export const ModerationPolicySchema = z
  .object({
    dmOnAction: z.boolean().default(true),
    maxWarnings: z.number().int().min(1).max(20).default(3),
    autoMuteDuration: z.number().int().min(1).max(40320).default(60),
    logChannel: z.string().nullable().optional().default(null),
    appealsEnabled: z.boolean().default(false),
    escalation: ModerationEscalationSchema.optional().default({
      enabled: false,
      timeoutAt: 3,
      timeoutMinutes: 60,
      kickAt: 0,
    }),
  })
  .passthrough()
  .default({
    dmOnAction: true,
    maxWarnings: 3,
    autoMuteDuration: 60,
    logChannel: null,
    appealsEnabled: false,
    escalation: {
      enabled: false,
      timeoutAt: 3,
      timeoutMinutes: 60,
      kickAt: 0,
    },
  });

// 8. Booster Config Schema
export const BoosterConfigSchema = z
  .object({
    enabled: z.boolean().default(true),
    customRoleEnabled: z.boolean().default(true),
    autoCleanup: z.boolean().default(true),
    allowGift: z.boolean().default(true),
    allowIcon: z.boolean().default(true),
    nameMaxLength: z.number().int().min(2).max(32).default(30),
    announceChannel: z.string().nullable().optional().default(null),
    boostChannelId: z.string().nullable().optional().default(null),
    thankMessage: z.string().default('Terima kasih atas server boost-nya!'),
    perks: z.array(z.string()).default(['custom_role', 'gradient_color', 'circle_room']),
  })
  .passthrough()
  .default({
    enabled: true,
    customRoleEnabled: true,
    autoCleanup: true,
    allowGift: true,
    allowIcon: true,
    nameMaxLength: 30,
    announceChannel: null,
    boostChannelId: null,
    thankMessage: 'Terima kasih atas server boost-nya!',
    perks: ['custom_role', 'gradient_color', 'circle_room'],
  });

// 9. Application Settings Schema
export const ApplicationQuestionSchema = z.union([
  z.string(),
  z
    .object({
      id: z.string().optional(),
      question: z.string(),
      type: z.string().optional().default('text'),
      required: z.boolean().optional().default(true),
    })
    .passthrough(),
]);

export const ApplicationRolesSchema = z
  .object({
    admin: z.string().nullable().optional().default(null),
    reviewer: z.string().nullable().optional().default(null),
    accepted: z.string().nullable().optional().default(null),
    denied: z.string().nullable().optional().default(null),
  })
  .default({
    admin: null,
    reviewer: null,
    accepted: null,
    denied: null,
  });

export const ApplicationSettingsSchema = z
  .object({
    enabled: z.boolean().default(false),
    open: z.boolean().default(false),
    applicationChannelId: z.string().nullable().optional().default(null),
    reviewChannel: z.string().nullable().optional().default(null),
    logChannelId: z.string().nullable().optional().default(null),
    questions: z.array(ApplicationQuestionSchema).default([
      { question: 'Why do you want to apply?', type: 'paragraph', required: true }
    ]),
    roles: ApplicationRolesSchema.optional().default({
      admin: null,
      reviewer: null,
      accepted: null,
      denied: null,
    }),
    pingRoles: z.array(z.string()).default([]),
    requiredRoles: z.array(z.string()).default([]),
    deniedRoles: z.array(z.string()).default([]),
    minAccountAge: z.number().int().min(0).default(0),
    maxApplications: z.number().int().min(1).default(1),
    cooldown: z.number().int().min(0).default(7),
    allowMultipleApplications: z.boolean().default(false),
    requireVerification: z.boolean().default(false),
    customWelcomeMessage: z.string().default(''),
    pendingApplicationRetentionDays: z.number().int().min(1).max(3650).default(30),
    reviewedApplicationRetentionDays: z.number().int().min(1).max(3650).default(14),
  })
  .passthrough()
  .default({
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
      denied: null,
    },
    pingRoles: [],
    requiredRoles: [],
    deniedRoles: [],
    minAccountAge: 0,
    maxApplications: 1,
    cooldown: 7,
    allowMultipleApplications: false,
    requireVerification: false,
    customWelcomeMessage: '',
    pendingApplicationRetentionDays: 30,
    reviewedApplicationRetentionDays: 14,
  });

// Complete Unified GuildConfigSchema
export const GuildConfigSchema = z
  .object({
    prefix: z.string().optional(),
    modRole: z.string().nullable().optional(),
    adminRole: z.string().nullable().optional(),
    logChannelId: z.string().nullable().optional(),
    welcomeChannel: z.string().nullable().optional(),
    welcomeMessage: z.string().optional(),
    autoRole: z.string().nullable().optional(),
    dmOnClose: z.boolean().optional(),
    reportChannelId: z.string().nullable().optional(),
    birthdayChannelId: z.string().nullable().optional(),
    premiumRoleId: z.string().nullable().optional(),
    logIgnore: LogIgnoreSchema.optional(),
    disabledCommands: z.record(z.boolean()).optional(),
    disabledCategories: z.record(z.boolean()).optional(),
    enabledCommands: z.record(z.boolean()).optional(),
    commandPolicies: CommandPoliciesSchema.optional(),
    confessions: ConfessionConfigSchema.optional(),
    circle: CircleConfigSchema.optional(),
    welcome: WelcomeConfigSchema.optional(),
    leveling: LevelingConfigSchema.optional(),
    jointocreate: JtcConfigSchema.optional(),
    moderationPolicy: ModerationPolicySchema.optional(),
    booster: BoosterConfigSchema.optional(),
    applications: ApplicationSettingsSchema.optional(),
    logging: LoggingConfigSchema.optional(),
    ticketLogging: TicketLoggingSchema.optional(),
    enableLogging: z.boolean().optional(),
    verification: VerificationConfigSchema,
  })
  .passthrough();

const DEFAULT_LOGGING = {
  enabled: false,
  channels: { audit: null, applications: null, reports: null },
  ignore: { users: [], channels: [] },
  enabledEvents: {},
};

function migrateLoggingConfig(raw = {}, legacy = {}) {
  const base = typeof raw === 'object' && raw !== null ? raw : {};
  const {
    logChannelId,
    reportChannelId,
    enableLogging,
    logIgnore,
  } = legacy;

  const auditChannel =
    base.channels?.audit ??
    base.channelId ??
    logChannelId ??
    null;

  const applicationsChannel = base.channels?.applications ?? null;

  const reportsChannel =
    base.channels?.reports ??
    reportChannelId ??
    null;

  const ignore = {
    users: base.ignore?.users ?? logIgnore?.users ?? [],
    channels: base.ignore?.channels ?? logIgnore?.channels ?? [],
  };

  let enabled = base.enabled ?? false;
  if (enableLogging === false) {
    enabled = false;
  } else if (auditChannel && base.enabled === undefined && enableLogging !== false) {
    enabled = base.enabled ?? Boolean(enableLogging);
  }

  const { channelId: _legacyChannelId, ignore: _ignore, channels: _channels, ...rest } = base;

  return {
    ...DEFAULT_LOGGING,
    ...rest,
    enabled,
    channels: {
      audit: auditChannel,
      applications: applicationsChannel,
      reports: reportsChannel,
    },
    ignore,
    enabledEvents: base.enabledEvents ?? {},
  };
}

export function stripLegacyLoggingFields(config) {
  if (!config || typeof config !== 'object') {
    return config;
  }

  const {
    logChannelId: _logChannelId,
    enableLogging: _enableLogging,
    reportChannelId: _reportChannelId,
    logIgnore: _logIgnore,
    ...rest
  } = config;

  if (rest.logging && typeof rest.logging === 'object') {
    const { channelId: _channelId, ...loggingRest } = rest.logging;
    rest.logging = loggingRest;
  }

  return rest;
}

// Feature Normalizers

export function normalizeConfessionConfig(raw = {}, defaults = {}) {
  const base = typeof raw === 'object' && raw !== null ? raw : {};
  const merged = { ...defaults, ...base };
  const parsed = ConfessionConfigSchema.safeParse(merged);
  return parsed.success ? parsed.data : ConfessionConfigSchema.parse({});
}

export function normalizeCircleConfig(raw = {}, defaults = {}) {
  const base = typeof raw === 'object' && raw !== null ? raw : {};
  const merged = { ...defaults, ...base };
  const parsed = CircleConfigSchema.safeParse(merged);
  return parsed.success ? parsed.data : CircleConfigSchema.parse({});
}

export function normalizeWelcomeConfig(raw = {}, defaults = {}) {
  const base = typeof raw === 'object' && raw !== null ? raw : {};
  const merged = { ...defaults, ...base };

  if (merged.channel !== undefined && merged.channelId === undefined) {
    merged.channelId = merged.channel;
  }
  if (merged.message !== undefined && merged.welcomeMessage === undefined) {
    merged.welcomeMessage = merged.message;
  }
  if (!Array.isArray(merged.roleIds)) {
    merged.roleIds = [];
  }

  const parsed = WelcomeConfigSchema.safeParse(merged);
  return parsed.success ? parsed.data : WelcomeConfigSchema.parse({});
}

export function normalizeLevelingConfig(raw = {}, defaults = {}) {
  const base = typeof raw === 'object' && raw !== null ? raw : {};
  const merged = { ...defaults, ...base };

  const cooldownVal = merged.cooldown ?? merged.xpCooldown ?? 60;
  merged.cooldown = typeof cooldownVal === 'number' && Number.isFinite(cooldownVal) ? cooldownVal : 60;
  merged.xpCooldown = merged.cooldown;

  const ch = merged.announceChannel ?? merged.levelUpChannel ?? null;
  merged.announceChannel = ch;
  merged.levelUpChannel = ch;

  const noCh = Array.isArray(merged.noXpChannels) && merged.noXpChannels.length > 0
    ? merged.noXpChannels
    : (Array.isArray(merged.ignoredChannels) ? merged.ignoredChannels : []);
  merged.noXpChannels = noCh;
  merged.ignoredChannels = noCh;

  const noRo = Array.isArray(merged.noXpRoles) && merged.noXpRoles.length > 0
    ? merged.noXpRoles
    : (Array.isArray(merged.ignoredRoles) ? merged.ignoredRoles : []);
  merged.noXpRoles = noRo;
  merged.ignoredRoles = noRo;

  const rwd = (typeof merged.rewards === 'object' && merged.rewards !== null && Object.keys(merged.rewards).length > 0)
    ? merged.rewards
    : ((typeof merged.roleRewards === 'object' && merged.roleRewards !== null && Object.keys(merged.roleRewards).length > 0)
      ? merged.roleRewards
      : ((typeof merged.roles === 'object' && merged.roles !== null) ? merged.roles : {}));
  merged.rewards = rwd;
  merged.roleRewards = rwd;
  merged.roles = rwd;

  const parsed = LevelingConfigSchema.safeParse(merged);
  return parsed.success ? parsed.data : LevelingConfigSchema.parse({});
}

export function normalizeJtcConfig(raw = {}, defaults = {}) {
  const base = typeof raw === 'object' && raw !== null ? raw : {};
  const merged = { ...defaults, ...base };

  const creators = Array.isArray(merged.creatorChannels) && merged.creatorChannels.length > 0
    ? merged.creatorChannels
    : (Array.isArray(merged.triggerChannels) ? merged.triggerChannels : []);
  merged.creatorChannels = creators;
  merged.triggerChannels = creators;

  const limit = merged.defaultLimit ?? merged.userLimit ?? 0;
  merged.defaultLimit = typeof limit === 'number' && Number.isFinite(limit) ? Math.min(Math.max(limit, 0), 99) : 0;
  merged.userLimit = merged.defaultLimit;

  const br = merged.defaultBitrate ?? merged.bitrate ?? 64000;
  merged.defaultBitrate = typeof br === 'number' && Number.isFinite(br) ? Math.min(Math.max(br, 8000), 384000) : 64000;
  merged.bitrate = merged.defaultBitrate;

  const parsed = JtcConfigSchema.safeParse(merged);
  return parsed.success ? parsed.data : JtcConfigSchema.parse({});
}

export function normalizeModerationPolicy(raw = {}, defaults = {}) {
  const base = typeof raw === 'object' && raw !== null ? raw : {};
  const merged = { ...defaults, ...base };

  const esc = typeof merged.escalation === 'object' && merged.escalation !== null ? merged.escalation : {};
  const timeoutAt = merged.maxWarnings ?? esc.timeoutAt ?? 3;
  const timeoutMins = merged.autoMuteDuration ?? esc.timeoutMinutes ?? 60;

  merged.maxWarnings = typeof timeoutAt === 'number' && Number.isFinite(timeoutAt) ? Math.min(Math.max(timeoutAt, 1), 20) : 3;
  merged.autoMuteDuration = typeof timeoutMins === 'number' && Number.isFinite(timeoutMins) ? Math.min(Math.max(timeoutMins, 1), 40320) : 60;

  merged.escalation = {
    enabled: Boolean(esc.enabled),
    timeoutAt: merged.maxWarnings,
    timeoutMinutes: merged.autoMuteDuration,
    kickAt: typeof esc.kickAt === 'number' && Number.isFinite(esc.kickAt) ? Math.min(Math.max(esc.kickAt, 0), 20) : 0,
  };

  const parsed = ModerationPolicySchema.safeParse(merged);
  return parsed.success ? parsed.data : ModerationPolicySchema.parse({});
}

export function normalizeBoosterConfig(raw = {}, defaults = {}) {
  const base = typeof raw === 'object' && raw !== null ? raw : {};
  const merged = { ...defaults, ...base };

  if (base.customRoleEnabled !== undefined) {
    merged.customRoleEnabled = Boolean(base.customRoleEnabled);
    merged.enabled = Boolean(base.customRoleEnabled);
  } else if (base.enabled !== undefined) {
    merged.enabled = Boolean(base.enabled);
    merged.customRoleEnabled = Boolean(base.enabled);
  } else {
    const isEn = Boolean(merged.customRoleEnabled ?? merged.enabled ?? true);
    merged.customRoleEnabled = isEn;
    merged.enabled = isEn;
  }

  if (base.announceChannel !== undefined) {
    merged.announceChannel = base.announceChannel;
    merged.boostChannelId = base.announceChannel;
  } else if (base.boostChannelId !== undefined) {
    merged.boostChannelId = base.boostChannelId;
    merged.announceChannel = base.boostChannelId;
  } else {
    const channel = merged.announceChannel ?? merged.boostChannelId ?? null;
    merged.announceChannel = channel;
    merged.boostChannelId = channel;
  }

  if (!Array.isArray(merged.perks)) {
    merged.perks = ['custom_role', 'gradient_color', 'circle_room'];
  }

  const parsed = BoosterConfigSchema.safeParse(merged);
  return parsed.success ? parsed.data : BoosterConfigSchema.parse({});
}

export function normalizeApplicationSettings(raw = {}, defaults = {}) {
  const base = typeof raw === 'object' && raw !== null ? raw : {};
  const merged = { ...defaults, ...base };

  if (base.open !== undefined) {
    merged.open = Boolean(base.open);
    merged.enabled = Boolean(base.open);
  } else if (base.enabled !== undefined) {
    merged.enabled = Boolean(base.enabled);
    merged.open = Boolean(base.enabled);
  } else {
    const isOpen = Boolean(merged.open ?? merged.enabled ?? false);
    merged.open = isOpen;
    merged.enabled = isOpen;
  }

  if (base.reviewChannel !== undefined) {
    merged.reviewChannel = base.reviewChannel;
    merged.applicationChannelId = base.reviewChannel;
  } else if (base.applicationChannelId !== undefined) {
    merged.applicationChannelId = base.applicationChannelId;
    merged.reviewChannel = base.applicationChannelId;
  } else {
    const ch = merged.reviewChannel ?? merged.applicationChannelId ?? null;
    merged.reviewChannel = ch;
    merged.applicationChannelId = ch;
  }

  if (!Array.isArray(merged.pingRoles)) {
    merged.pingRoles = [];
  }
  if (!Array.isArray(merged.questions) || merged.questions.length === 0) {
    merged.questions = [{ question: 'Why do you want to apply?', type: 'paragraph', required: true }];
  }

  const parsed = ApplicationSettingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : ApplicationSettingsSchema.parse({});
}

export function normalizeGuildConfig(raw, defaults = {}) {
  const base = typeof raw === 'object' && raw !== null ? raw : {};
  const merged = { ...defaults, ...base };

  merged.logging = migrateLoggingConfig(merged.logging, {
    logChannelId: merged.logChannelId,
    reportChannelId: merged.reportChannelId,
    enableLogging: merged.enableLogging,
    logIgnore: merged.logIgnore,
  });

  if (merged.confessions !== undefined) {
    merged.confessions = normalizeConfessionConfig(merged.confessions, defaults.confessions);
  }
  if (merged.circle !== undefined) {
    merged.circle = normalizeCircleConfig(merged.circle, defaults.circle);
  }
  if (merged.welcome !== undefined) {
    merged.welcome = normalizeWelcomeConfig(merged.welcome, defaults.welcome);
  }
  if (merged.leveling !== undefined) {
    merged.leveling = normalizeLevelingConfig(merged.leveling, defaults.leveling);
  }
  if (merged.jointocreate !== undefined) {
    merged.jointocreate = normalizeJtcConfig(merged.jointocreate, defaults.jointocreate);
  }
  if (merged.moderationPolicy !== undefined) {
    merged.moderationPolicy = normalizeModerationPolicy(merged.moderationPolicy, defaults.moderationPolicy);
  }
  if (merged.booster !== undefined) {
    merged.booster = normalizeBoosterConfig(merged.booster, defaults.booster);
  }
  if (merged.applications !== undefined) {
    merged.applications = normalizeApplicationSettings(merged.applications, defaults.applications);
  }

  const parsed = GuildConfigSchema.safeParse(merged);
  const normalized = parsed.success ? parsed.data : { ...defaults, ...merged };

  normalized.logging = migrateLoggingConfig(normalized.logging, {
    logChannelId: normalized.logChannelId,
    reportChannelId: normalized.reportChannelId,
    enableLogging: normalized.enableLogging,
    logIgnore: normalized.logIgnore,
  });

  return stripLegacyLoggingFields(normalized);
}

export function validateGuildConfig(data) {
  if (data === null || data === undefined || typeof data !== 'object') {
    return {
      success: false,
      data: null,
      error: new Error('Guild configuration must be an object'),
    };
  }
  const parsed = GuildConfigSchema.safeParse(data);
  if (parsed.success) {
    return {
      success: true,
      data: parsed.data,
      error: null,
    };
  }
  return {
    success: false,
    data: null,
    error: parsed.error,
  };
}

export function validateGuildConfigOrThrow(rawConfig, context = {}) {
  const normalized = normalizeGuildConfig(rawConfig);
  const parsed = GuildConfigSchema.safeParse(normalized);

  if (parsed.success) {
    return stripLegacyLoggingFields({
      ...normalized,
      logging: migrateLoggingConfig(normalized.logging, {}),
    });
  }

  throw createError(
    'Invalid guild configuration payload',
    ErrorTypes.VALIDATION,
    'Configuration payload is invalid. Please review provided values and try again.',
    {
      ...context,
      errorCode: 'VALIDATION_FAILED',
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }))
    }
  );
}
