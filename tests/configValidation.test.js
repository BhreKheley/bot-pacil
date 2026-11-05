import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  GuildConfigSchema,
  CommandPolicyEntrySchema,
  CommandPoliciesSchema,
  ConfessionConfigSchema,
  CircleConfigSchema,
  WelcomeEmbedOptionsSchema,
  WelcomeConfigSchema,
  LevelingConfigSchema,
  JtcConfigSchema,
  ModerationEscalationSchema,
  ModerationPolicySchema,
  BoosterConfigSchema,
  ApplicationQuestionSchema,
  ApplicationRolesSchema,
  ApplicationSettingsSchema,
  validateGuildConfig,
  validateGuildConfigOrThrow,
  normalizeGuildConfig,
  normalizeWelcomeConfig,
  normalizeLevelingConfig,
  normalizeJtcConfig,
  normalizeModerationPolicy,
  normalizeBoosterConfig,
  normalizeApplicationSettings,
  normalizeConfessionConfig,
  normalizeCircleConfig,
} from '../src/utils/schemas.js';
import { DEFAULT_GUILD_CONFIG } from '../src/utils/constants.js';
import { GUILD_CONFIG_DEFAULTS } from '../src/config/guild/guildConfigDefaults.js';
import { createMockClient } from './mocks/index.js';
import {
  getWelcomeConfig,
  saveWelcomeConfig,
  updateWelcomeConfig,
  getLevelingConfig,
  saveLevelingConfig,
  getJoinToCreateConfig,
  getJtcConfig,
  saveJoinToCreateConfig,
  saveJtcConfig,
  getApplicationSettings,
  saveApplicationSettings,
  getModerationPolicyConfig,
  saveModerationPolicyConfig,
  getBoosterConfigData,
  saveBoosterConfigData,
} from '../src/utils/database.js';

describe('M2 Config Audit & Schema Hardening Test Suite', () => {

  describe('1. Default Guild Configurations & Sub-property Integrity', () => {
    test('DEFAULT_GUILD_CONFIG passes GuildConfigSchema validation', () => {
      const parsed = GuildConfigSchema.safeParse(DEFAULT_GUILD_CONFIG);
      assert.equal(parsed.success, true, `Validation failed: ${JSON.stringify(parsed.error?.issues)}`);
      assert.ok(parsed.data);
    });

    test('GUILD_CONFIG_DEFAULTS passes GuildConfigSchema validation', () => {
      const parsed = GuildConfigSchema.safeParse(GUILD_CONFIG_DEFAULTS);
      assert.equal(parsed.success, true, `Validation failed: ${JSON.stringify(parsed.error?.issues)}`);
      assert.ok(parsed.data);
    });

    test('validateGuildConfig helper returns success for default configs', () => {
      const defaultRes = validateGuildConfig(DEFAULT_GUILD_CONFIG);
      assert.equal(defaultRes.success, true);
      assert.equal(defaultRes.error, null);
      assert.ok(defaultRes.data);

      const guildDefaultsRes = validateGuildConfig(GUILD_CONFIG_DEFAULTS);
      assert.equal(guildDefaultsRes.success, true);
      assert.equal(guildDefaultsRes.error, null);
      assert.ok(guildDefaultsRes.data);
    });

    test('Sub-properties across all features are defined and non-null in defaults', () => {
      const cfg = GUILD_CONFIG_DEFAULTS;

      // Circle
      assert.notEqual(cfg.circle, undefined);
      assert.equal(typeof cfg.circle.enabled, 'boolean');
      assert.equal(typeof cfg.circle.requireApproval, 'boolean');
      assert.equal(Array.isArray(cfg.circle.channels), true);
      assert.equal(typeof cfg.circle.categoryLimit, 'number');
      assert.equal(typeof cfg.circle.roleLimit, 'number');

      // Command Policies
      assert.notEqual(cfg.commandPolicies, undefined);
      assert.equal(typeof cfg.commandPolicies, 'object');

      // Confessions
      assert.notEqual(cfg.confessions, undefined);
      assert.equal(typeof cfg.confessions.enabled, 'boolean');
      assert.equal(typeof cfg.confessions.requireApproval, 'boolean');
      assert.equal(typeof cfg.confessions.cooldownMinutes, 'number');
      assert.equal(typeof cfg.confessions.repliesEnabled, 'boolean');
      assert.equal(typeof cfg.confessions.replyCooldownSeconds, 'number');

      // Welcome
      assert.notEqual(cfg.welcome, undefined);
      assert.equal(typeof cfg.welcome.enabled, 'boolean');
      assert.equal(typeof cfg.welcome.cardStyle, 'string');
      assert.equal(typeof cfg.welcome.dmOnClose, 'boolean');
      assert.equal(Array.isArray(cfg.welcome.roleIds), true);
      assert.notEqual(cfg.welcome.welcomeEmbed, undefined);

      // Leveling
      assert.notEqual(cfg.leveling, undefined);
      assert.equal(typeof cfg.leveling.enabled, 'boolean');
      assert.equal(typeof cfg.leveling.cooldown, 'number');
      assert.equal(typeof cfg.leveling.xpCooldown, 'number');
      assert.equal(Array.isArray(cfg.leveling.noXpChannels), true);
      assert.equal(Array.isArray(cfg.leveling.noXpRoles), true);
      assert.equal(typeof cfg.leveling.rewards, 'object');

      // Join to Create
      assert.notEqual(cfg.jointocreate, undefined);
      assert.equal(typeof cfg.jointocreate.enabled, 'boolean');
      assert.equal(Array.isArray(cfg.jointocreate.creatorChannels), true);
      assert.equal(Array.isArray(cfg.jointocreate.triggerChannels), true);
      assert.equal(typeof cfg.jointocreate.defaultLimit, 'number');
      assert.equal(typeof cfg.jointocreate.defaultBitrate, 'number');

      // Moderation Policy
      assert.notEqual(cfg.moderationPolicy, undefined);
      assert.equal(typeof cfg.moderationPolicy.maxWarnings, 'number');
      assert.equal(typeof cfg.moderationPolicy.autoMuteDuration, 'number');
      assert.notEqual(cfg.moderationPolicy.escalation, undefined);
      assert.equal(typeof cfg.moderationPolicy.escalation.timeoutAt, 'number');

      // Booster
      assert.notEqual(cfg.booster, undefined);
      assert.equal(typeof cfg.booster.enabled, 'boolean');
      assert.equal(typeof cfg.booster.customRoleEnabled, 'boolean');
      assert.equal(Array.isArray(cfg.booster.perks), true);
      assert.equal(typeof cfg.booster.nameMaxLength, 'number');

      // Applications
      assert.notEqual(cfg.applications, undefined);
      assert.equal(typeof cfg.applications.enabled, 'boolean');
      assert.equal(typeof cfg.applications.open, 'boolean');
      assert.equal(Array.isArray(cfg.applications.questions), true);
      assert.equal(Array.isArray(cfg.applications.pingRoles), true);
    });
  });

  describe('2. Partial Configurations & Normalization', () => {
    test('normalizeGuildConfig({}) provides complete defaults without throwing', () => {
      const normalized = normalizeGuildConfig({});
      assert.ok(normalized);
      assert.equal(typeof normalized.logging, 'object');
      assert.equal(normalized.logging.enabled, false);
      assert.deepEqual(normalized.logging.channels, { audit: null, applications: null, reports: null });
    });

    test('normalizeGuildConfig preserves partial user overrides while populating sub-defaults', () => {
      const partial = {
        prefix: '?',
        circle: { requireApproval: true, reviewChannelId: '999888' },
        confessions: { cooldownMinutes: 45 },
        leveling: { cooldown: 120, announceChannel: '555666' },
      };

      const normalized = normalizeGuildConfig(partial, GUILD_CONFIG_DEFAULTS);
      assert.equal(normalized.prefix, '?');
      assert.equal(normalized.circle.requireApproval, true);
      assert.equal(normalized.circle.reviewChannelId, '999888');
      assert.equal(normalized.circle.categoryLimit, 45); // default populated
      assert.equal(normalized.confessions.cooldownMinutes, 45);
      assert.equal(normalized.confessions.repliesEnabled, true); // default populated
      assert.equal(normalized.leveling.cooldown, 120);
      assert.equal(normalized.leveling.announceChannel, '555666');
      assert.equal(normalized.leveling.levelUpChannel, '555666'); // synced
    });

    test('Legacy flat logging fields are migrated into structured logging and stripped', () => {
      const legacy = {
        logChannelId: '111',
        reportChannelId: '222',
        enableLogging: true,
        logIgnore: { users: ['user1'], channels: ['ch1'] },
      };

      const normalized = normalizeGuildConfig(legacy);
      assert.equal(normalized.logging.enabled, true);
      assert.equal(normalized.logging.channels.audit, '111');
      assert.equal(normalized.logging.channels.reports, '222');
      assert.deepEqual(normalized.logging.ignore.users, ['user1']);
      assert.deepEqual(normalized.logging.ignore.channels, ['ch1']);

      // Stripped from top-level
      assert.equal(normalized.logChannelId, undefined);
      assert.equal(normalized.reportChannelId, undefined);
      assert.equal(normalized.enableLogging, undefined);
      assert.equal(normalized.logIgnore, undefined);
    });
  });

  describe('3. Validation Rejection & Safe Error Handling', () => {
    test('validateGuildConfig rejects non-object inputs gracefully', () => {
      assert.equal(validateGuildConfig(null).success, false);
      assert.equal(validateGuildConfig(undefined).success, false);
      assert.equal(validateGuildConfig('some string').success, false);
      assert.equal(validateGuildConfig(12345).success, false);
      assert.equal(validateGuildConfig(true).success, false);
    });

    test('validateGuildConfig rejects invalid types in nested schemas', () => {
      const invalid = {
        welcome: {
          autoRoleDelay: 'not-a-number',
        },
      };
      const result = validateGuildConfig(invalid);
      assert.equal(result.success, false);
      assert.ok(result.error);
    });

    test('validateGuildConfigOrThrow throws on invalid payloads with issues', () => {
      assert.throws(() => {
        validateGuildConfigOrThrow({
          prefix: 12345,
          dmOnClose: 'not-a-boolean',
          disabledCommands: 'not-an-object',
        });
      }, (err) => {
        return err.name === 'PacilBotError' && err.message.includes('Invalid guild configuration');
      });
    });
  });

  describe('4. Individual KV Feature Schemas & Normalizers', () => {
    test('WelcomeConfigSchema & normalizeWelcomeConfig', () => {
      // Empty input falls back cleanly
      const def = normalizeWelcomeConfig();
      assert.equal(def.enabled, false);
      assert.equal(def.cardStyle, 'default');
      assert.equal(def.dmOnClose, true);
      assert.deepEqual(def.roleIds, []);

      // Alias channel -> channelId & message -> welcomeMessage
      const custom = normalizeWelcomeConfig({
        channel: 'ch_123',
        message: 'Welcome {user} to the hub!',
        cardStyle: 'modern',
        dmOnClose: false,
      });
      assert.equal(custom.channelId, 'ch_123');
      assert.equal(custom.welcomeMessage, 'Welcome {user} to the hub!');
      assert.equal(custom.cardStyle, 'modern');
      assert.equal(custom.dmOnClose, false);

      // Corrupted data falls back
      const corrupt = normalizeWelcomeConfig({ autoRoleDelay: 'invalid' });
      assert.equal(corrupt.autoRoleDelay, 0);
    });

    test('LevelingConfigSchema & normalizeLevelingConfig', () => {
      // Defaults
      const def = normalizeLevelingConfig();
      assert.equal(def.enabled, false);
      assert.equal(def.cooldown, 60);
      assert.equal(def.xpCooldown, 60);
      assert.deepEqual(def.noXpChannels, []);
      assert.deepEqual(def.rewards, {});

      // Custom + sync checks
      const custom = normalizeLevelingConfig({
        enabled: true,
        xpRate: 1.5,
        cooldown: 45,
        announceChannel: 'ch_level_up',
        noXpChannels: ['ch_spam'],
        noXpRoles: ['role_muted'],
        rewards: { '5': 'role_level_5' },
      });
      assert.equal(custom.enabled, true);
      assert.equal(custom.xpRate, 1.5);
      assert.equal(custom.cooldown, 45);
      assert.equal(custom.xpCooldown, 45);
      assert.equal(custom.announceChannel, 'ch_level_up');
      assert.equal(custom.levelUpChannel, 'ch_level_up');
      assert.deepEqual(custom.noXpChannels, ['ch_spam']);
      assert.deepEqual(custom.ignoredChannels, ['ch_spam']);
      assert.deepEqual(custom.noXpRoles, ['role_muted']);
      assert.deepEqual(custom.ignoredRoles, ['role_muted']);
      assert.deepEqual(custom.rewards, { '5': 'role_level_5' });
      assert.deepEqual(custom.roleRewards, { '5': 'role_level_5' });

      // Corrupted input
      const corrupt = normalizeLevelingConfig('malformed');
      assert.equal(corrupt.cooldown, 60);
    });

    test('JtcConfigSchema & normalizeJtcConfig', () => {
      const def = normalizeJtcConfig();
      assert.equal(def.enabled, false);
      assert.equal(def.defaultLimit, 0);
      assert.equal(def.defaultBitrate, 64000);
      assert.deepEqual(def.creatorChannels, []);

      // Custom options and synchronization
      const custom = normalizeJtcConfig({
        enabled: true,
        creatorChannels: ['vc_creator_1'],
        defaultLimit: 10,
        defaultBitrate: 96000,
        categoryId: 'cat_voice',
      });
      assert.equal(custom.enabled, true);
      assert.deepEqual(custom.creatorChannels, ['vc_creator_1']);
      assert.deepEqual(custom.triggerChannels, ['vc_creator_1']);
      assert.equal(custom.defaultLimit, 10);
      assert.equal(custom.userLimit, 10);
      assert.equal(custom.defaultBitrate, 96000);
      assert.equal(custom.bitrate, 96000);
      assert.equal(custom.categoryId, 'cat_voice');

      // Clamping limits
      const clamped = normalizeJtcConfig({ defaultLimit: 500, defaultBitrate: 1000000 });
      assert.equal(clamped.defaultLimit, 99);
      assert.equal(clamped.defaultBitrate, 384000);
    });

    test('ConfessionConfigSchema & normalizeConfessionConfig', () => {
      const def = normalizeConfessionConfig();
      assert.equal(def.enabled, false);
      assert.equal(def.requireApproval, true);
      assert.equal(def.cooldownMinutes, 10);
      assert.equal(def.repliesEnabled, true);
      assert.equal(def.replyCooldownSeconds, 30);

      const custom = normalizeConfessionConfig({
        enabled: true,
        channelId: 'ch_confess',
        reviewChannelId: 'ch_review',
        requireApproval: false,
        cooldownMinutes: 5,
        repliesEnabled: false,
      });
      assert.equal(custom.enabled, true);
      assert.equal(custom.channelId, 'ch_confess');
      assert.equal(custom.reviewChannelId, 'ch_review');
      assert.equal(custom.requireApproval, false);
      assert.equal(custom.cooldownMinutes, 5);
      assert.equal(custom.repliesEnabled, false);
    });

    test('CircleConfigSchema & normalizeCircleConfig', () => {
      const def = normalizeCircleConfig();
      assert.equal(def.enabled, true);
      assert.equal(def.requireApproval, false);
      assert.equal(def.reviewChannelId, null);
      assert.equal(def.categoryLimit, 45);
      assert.equal(def.roleLimit, 240);
      assert.deepEqual(def.channels, []);

      const custom = normalizeCircleConfig({
        requireApproval: true,
        reviewChannelId: 'ch_circle_review',
        categoryLimit: 40,
        channels: ['ch_1', 'ch_2'],
      });
      assert.equal(custom.requireApproval, true);
      assert.equal(custom.reviewChannelId, 'ch_circle_review');
      assert.equal(custom.categoryLimit, 40);
      assert.deepEqual(custom.channels, ['ch_1', 'ch_2']);
    });

    test('ModerationPolicySchema & normalizeModerationPolicy', () => {
      const def = normalizeModerationPolicy();
      assert.equal(def.dmOnAction, true);
      assert.equal(def.maxWarnings, 3);
      assert.equal(def.autoMuteDuration, 60);
      assert.equal(def.appealsEnabled, false);
      assert.equal(def.escalation.timeoutAt, 3);
      assert.equal(def.escalation.timeoutMinutes, 60);

      const custom = normalizeModerationPolicy({
        dmOnAction: false,
        maxWarnings: 5,
        autoMuteDuration: 120,
        logChannel: 'ch_mod_logs',
        appealsEnabled: true,
        escalation: { enabled: true, kickAt: 10 },
      });
      assert.equal(custom.dmOnAction, false);
      assert.equal(custom.maxWarnings, 5);
      assert.equal(custom.autoMuteDuration, 120);
      assert.equal(custom.logChannel, 'ch_mod_logs');
      assert.equal(custom.appealsEnabled, true);
      assert.equal(custom.escalation.enabled, true);
      assert.equal(custom.escalation.timeoutAt, 5);
      assert.equal(custom.escalation.timeoutMinutes, 120);
      assert.equal(custom.escalation.kickAt, 10);
    });

    test('BoosterConfigSchema & normalizeBoosterConfig', () => {
      const def = normalizeBoosterConfig();
      assert.equal(def.enabled, true);
      assert.equal(def.customRoleEnabled, true);
      assert.equal(def.autoCleanup, true);
      assert.equal(def.allowGift, true);
      assert.equal(def.allowIcon, true);
      assert.equal(def.nameMaxLength, 30);
      assert.ok(def.perks.includes('custom_role'));

      const custom = normalizeBoosterConfig({
        announceChannel: 'ch_boost_hall',
        thankMessage: 'Hore terima kasih!',
        customRoleEnabled: false,
        nameMaxLength: 20,
      });
      assert.equal(custom.announceChannel, 'ch_boost_hall');
      assert.equal(custom.boostChannelId, 'ch_boost_hall');
      assert.equal(custom.thankMessage, 'Hore terima kasih!');
      assert.equal(custom.customRoleEnabled, false);
      assert.equal(custom.enabled, false);
      assert.equal(custom.nameMaxLength, 20);
    });

    test('ApplicationSettingsSchema & normalizeApplicationSettings', () => {
      const def = normalizeApplicationSettings();
      assert.equal(def.enabled, false);
      assert.equal(def.open, false);
      assert.ok(def.questions.length > 0);
      assert.deepEqual(def.pingRoles, []);

      const custom = normalizeApplicationSettings({
        open: true,
        reviewChannel: 'ch_apps_review',
        questions: ['Why join?', 'Experience?'],
        pingRoles: ['role_hr'],
      });
      assert.equal(custom.open, true);
      assert.equal(custom.enabled, true);
      assert.equal(custom.reviewChannel, 'ch_apps_review');
      assert.equal(custom.applicationChannelId, 'ch_apps_review');
      assert.deepEqual(custom.questions, ['Why join?', 'Experience?']);
      assert.deepEqual(custom.pingRoles, ['role_hr']);
    });
  });

  describe('5. Database Config Helpers & Corruption Resilience', () => {
    test('Welcome config helper survives corrupt database data and missing clients', async () => {
      const client = createMockClient();
      const guildId = 'guild_welcome_corrupt';

      // 1. Missing data returns default
      const initial = await getWelcomeConfig(client, guildId);
      assert.equal(initial.enabled, false);
      assert.equal(initial.cardStyle, 'default');

      // 2. Corrupt string data stored in DB falls back gracefully
      await client.db.set(`guild:${guildId}:welcome`, 'CORRUPTED_STRING_DATA');
      const recovered = await getWelcomeConfig(client, guildId);
      assert.equal(recovered.enabled, false);
      assert.equal(recovered.cardStyle, 'default');

      // 3. Save clean config
      const saveOk = await saveWelcomeConfig(client, guildId, {
        enabled: true,
        channelId: 'ch_welcome',
        welcomeMessage: 'Halo selamat datang!',
      });
      assert.equal(saveOk, true);

      const updated = await getWelcomeConfig(client, guildId);
      assert.equal(updated.enabled, true);
      assert.equal(updated.channelId, 'ch_welcome');
      assert.equal(updated.welcomeMessage, 'Halo selamat datang!');

      // 4. Update helper works safely
      const updated2 = await updateWelcomeConfig(client, guildId, { cardStyle: 'gold' });
      assert.equal(updated2.cardStyle, 'gold');
      assert.equal(updated2.channelId, 'ch_welcome');
    });

    test('Leveling config helper recovers from corrupt data in DB', async () => {
      const client = createMockClient();
      const guildId = 'guild_level_corrupt';

      // Store corrupted non-object payload
      await client.db.set(`guild:${guildId}:leveling:config`, 999999);
      const config = await getLevelingConfig(client, guildId);
      assert.equal(config.enabled, false);
      assert.equal(config.cooldown, 60);

      // Save valid leveling config
      const saved = await saveLevelingConfig(client, guildId, {
        enabled: true,
        cooldown: 30,
        announceChannel: 'ch_lvl',
        rewards: { '10': 'role_10' },
      });
      assert.equal(saved, true);

      const refreshed = await getLevelingConfig(client, guildId);
      assert.equal(refreshed.enabled, true);
      assert.equal(refreshed.cooldown, 30);
      assert.equal(refreshed.announceChannel, 'ch_lvl');
      assert.deepEqual(refreshed.rewards, { '10': 'role_10' });
    });

    test('Join to Create (JTC) config helper and aliases recover from corrupt data', async () => {
      const client = createMockClient();
      const guildId = 'guild_jtc_corrupt';

      // Corrupted data
      await client.db.set(`guild:${guildId}:jointocreate`, { defaultLimit: 'invalid', bitrate: 'bad' });
      const config = await getJoinToCreateConfig(client, guildId);
      assert.equal(config.enabled, false);
      assert.equal(config.defaultLimit, 0);
      assert.equal(config.defaultBitrate, 64000);

      // Verify alias getJtcConfig matches
      const aliasConfig = await getJtcConfig(client, guildId);
      assert.deepEqual(aliasConfig, config);

      // Save via alias
      const saveOk = await saveJtcConfig(client, guildId, {
        enabled: true,
        creatorChannels: ['vc_jtc_1'],
        defaultLimit: 8,
      });
      assert.equal(saveOk, true);

      const verified = await getJoinToCreateConfig(client, guildId);
      assert.equal(verified.enabled, true);
      assert.deepEqual(verified.creatorChannels, ['vc_jtc_1']);
      assert.equal(verified.defaultLimit, 8);
    });

    test('Application settings helper recovers from corrupted data in DB', async () => {
      const client = createMockClient();
      const guildId = 'guild_apps_corrupt';

      await client.db.set(`guild:${guildId}:applications:settings`, 'NOT_AN_OBJECT');
      const settings = await getApplicationSettings(client, guildId);
      assert.equal(settings.enabled, false);
      assert.equal(settings.open, false);
      assert.ok(settings.questions.length > 0);

      const saved = await saveApplicationSettings(client, guildId, {
        open: true,
        reviewChannel: 'ch_review_1',
        pingRoles: ['role_admin'],
      });
      assert.equal(saved, true);

      const reloaded = await getApplicationSettings(client, guildId);
      assert.equal(reloaded.open, true);
      assert.equal(reloaded.enabled, true);
      assert.equal(reloaded.reviewChannel, 'ch_review_1');
      assert.deepEqual(reloaded.pingRoles, ['role_admin']);
    });

    test('Moderation policy and booster config database helpers handle partial data', async () => {
      const client = createMockClient();
      const guildId = 'guild_mod_boost';

      // Moderation
      const modSaved = await saveModerationPolicyConfig(client, guildId, { maxWarnings: 5, appealsEnabled: true });
      assert.equal(modSaved, true);
      const modLoaded = await getModerationPolicyConfig(client, guildId);
      assert.equal(modLoaded.maxWarnings, 5);
      assert.equal(modLoaded.appealsEnabled, true);

      // Booster
      const boostSaved = await saveBoosterConfigData(client, guildId, { announceChannel: 'ch_boost', thankMessage: 'Thanks!' });
      assert.equal(boostSaved, true);
      const boostLoaded = await getBoosterConfigData(client, guildId);
      assert.equal(boostLoaded.announceChannel, 'ch_boost');
      assert.equal(boostLoaded.thankMessage, 'Thanks!');
    });
  });
});
