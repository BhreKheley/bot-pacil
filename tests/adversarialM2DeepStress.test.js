import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  GuildConfigSchema,
  ConfessionConfigSchema,
  CircleConfigSchema,
  WelcomeConfigSchema,
  LevelingConfigSchema,
  JtcConfigSchema,
  ModerationPolicySchema,
  BoosterConfigSchema,
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
} from '../src/utils/schemas.js';
import { DEFAULT_GUILD_CONFIG } from '../src/utils/constants.js';
import { GUILD_CONFIG_DEFAULTS } from '../src/config/guild/guildConfigDefaults.js';
import { createMockClient } from './mocks/index.js';
import {
  getGuildConfig,
  setGuildConfig,
  updateGuildConfig,
  patchGuildConfig,
} from '../src/services/config/guildConfig.js';
import {
  getWelcomeConfig,
  saveWelcomeConfig,
  getLevelingConfig,
  saveLevelingConfig,
  getJoinToCreateConfig,
  saveJoinToCreateConfig,
  getModerationPolicyConfig,
  saveModerationPolicyConfig,
  getBoosterConfigData,
  saveBoosterConfigData,
  getApplicationSettings,
  saveApplicationSettings,
} from '../src/utils/database.js';

describe('Adversarial M2 Deep Stress Tests: Challenger 2', () => {

  describe('1. Adversarial Nested Property Access on Default Configs', () => {
    const testConfigs = [
      { name: 'DEFAULT_GUILD_CONFIG', config: DEFAULT_GUILD_CONFIG },
      { name: 'GUILD_CONFIG_DEFAULTS', config: GUILD_CONFIG_DEFAULTS },
      { name: 'normalizeGuildConfig({}, GUILD_CONFIG_DEFAULTS)', config: normalizeGuildConfig({}, GUILD_CONFIG_DEFAULTS) },
    ];

    for (const { name, config } of testConfigs) {
      test(`${name}: accessing nested circle properties never throws TypeError`, () => {
        assert.doesNotThrow(() => {
          const _a = config.circle.enabled;
          const _b = config.circle.requireApproval;
          const _c = config.circle.reviewChannelId;
          const _d = config.circle.categoryLimit;
          const _e = config.circle.roleLimit;
          const _f = config.circle.channels.length;
          const _g = config.circle.channels.map(x => x);
          assert.equal(typeof _a, 'boolean');
          assert.equal(typeof _b, 'boolean');
          assert.equal(typeof _d, 'number');
          assert.equal(typeof _e, 'number');
          assert.equal(Array.isArray(config.circle.channels), true);
        });
      });

      test(`${name}: accessing nested confession properties never throws TypeError`, () => {
        assert.doesNotThrow(() => {
          const _a = config.confessions.enabled;
          const _b = config.confessions.channelId;
          const _c = config.confessions.reviewChannelId;
          const _d = config.confessions.moderatorRoleId;
          const _e = config.confessions.requireApproval;
          const _f = config.confessions.cooldownMinutes;
          const _g = config.confessions.repliesEnabled;
          const _h = config.confessions.replyCooldownSeconds;
          assert.equal(typeof _a, 'boolean');
          assert.equal(typeof _e, 'boolean');
          assert.equal(typeof _f, 'number');
          assert.equal(typeof _g, 'boolean');
          assert.equal(typeof _h, 'number');
        });
      });

      test(`${name}: accessing nested welcome & embed properties never throws TypeError`, () => {
        assert.doesNotThrow(() => {
          const _a = config.welcome.enabled;
          const _b = config.welcome.channelId;
          const _c = config.welcome.welcomeMessage;
          const _d = config.welcome.welcomeEmbed.title;
          const _e = config.welcome.welcomeEmbed.description;
          const _f = config.welcome.welcomeEmbed.color;
          const _g = config.welcome.welcomeEmbed.thumbnail;
          const _h = config.welcome.welcomeEmbed.footer;
          const _i = config.welcome.leaveEmbed.title;
          const _j = config.welcome.leaveEmbed.description;
          const _k = config.welcome.leaveEmbed.footer;
          const _l = config.welcome.cardStyle;
          const _m = config.welcome.dmOnClose;
          const _n = config.welcome.roleIds.length;
          const _o = config.welcome.roleIds.filter(Boolean);
          const _p = config.welcome.autoRoleDelay;
          const _q = config.welcome.joinLogs.enabled;
          const _r = config.welcome.joinLogs.channelId;
          const _s = config.welcome.leaveLogs.enabled;
          const _t = config.welcome.leaveLogs.channelId;
          assert.equal(typeof _a, 'boolean');
          assert.equal(typeof _c, 'string');
          assert.equal(typeof _d, 'string');
          assert.equal(typeof _i, 'string');
          assert.equal(typeof _l, 'string');
          assert.equal(typeof _m, 'boolean');
          assert.equal(typeof _p, 'number');
          assert.equal(typeof _q, 'boolean');
          assert.equal(typeof _s, 'boolean');
        });
      });

      test(`${name}: accessing nested leveling properties never throws TypeError`, () => {
        assert.doesNotThrow(() => {
          const _a = config.leveling.enabled;
          const _b = config.leveling.configured;
          const _c = config.leveling.xpRate;
          const _d = config.leveling.xpRange.min;
          const _e = config.leveling.xpRange.max;
          const _f = config.leveling.cooldown;
          const _g = config.leveling.xpCooldown;
          const _h = config.leveling.announceChannel;
          const _i = config.leveling.levelUpChannel;
          const _j = config.leveling.announceLevelUp;
          const _k = config.leveling.levelUpMessage;
          const _l = config.leveling.noXpChannels.length;
          const _m = config.leveling.ignoredChannels.length;
          const _n = config.leveling.noXpRoles.length;
          const _o = config.leveling.ignoredRoles.length;
          const _p = Object.keys(config.leveling.rewards);
          const _q = Object.keys(config.leveling.roleRewards);
          const _r = Object.keys(config.leveling.roles);
          const _s = Object.keys(config.leveling.milestones);
          const _t = config.leveling.cooldownEnabled;
          const _u = config.leveling.messageLengthMultiplier;
          const _v = config.leveling.levelUpMessages;
          assert.equal(typeof _a, 'boolean');
          assert.equal(typeof _d, 'number');
          assert.equal(typeof _e, 'number');
          assert.equal(typeof _f, 'number');
          assert.equal(typeof _g, 'number');
          assert.equal(typeof _t, 'boolean');
        });
      });

      test(`${name}: accessing nested jointocreate properties never throws TypeError`, () => {
        assert.doesNotThrow(() => {
          const _a = config.jointocreate.enabled;
          const _b = config.jointocreate.creatorChannels.length;
          const _c = config.jointocreate.triggerChannels.length;
          const _d = config.jointocreate.categoryId;
          const _e = config.jointocreate.channelNameTemplate;
          const _f = config.jointocreate.defaultLimit;
          const _g = config.jointocreate.userLimit;
          const _h = config.jointocreate.defaultBitrate;
          const _i = config.jointocreate.bitrate;
          const _j = Object.keys(config.jointocreate.temporaryChannels);
          assert.equal(typeof _a, 'boolean');
          assert.equal(typeof _e, 'string');
          assert.equal(typeof _f, 'number');
          assert.equal(typeof _g, 'number');
          assert.equal(typeof _h, 'number');
          assert.equal(typeof _i, 'number');
        });
      });

      test(`${name}: accessing nested moderationPolicy properties never throws TypeError`, () => {
        assert.doesNotThrow(() => {
          const _a = config.moderationPolicy.dmOnAction;
          const _b = config.moderationPolicy.maxWarnings;
          const _c = config.moderationPolicy.autoMuteDuration;
          const _d = config.moderationPolicy.logChannel;
          const _e = config.moderationPolicy.appealsEnabled;
          const _f = config.moderationPolicy.escalation.enabled;
          const _g = config.moderationPolicy.escalation.timeoutAt;
          const _h = config.moderationPolicy.escalation.timeoutMinutes;
          const _i = config.moderationPolicy.escalation.kickAt;
          assert.equal(typeof _a, 'boolean');
          assert.equal(typeof _b, 'number');
          assert.equal(typeof _c, 'number');
          assert.equal(typeof _e, 'boolean');
          assert.equal(typeof _f, 'boolean');
          assert.equal(typeof _g, 'number');
          assert.equal(typeof _h, 'number');
          assert.equal(typeof _i, 'number');
        });
      });

      test(`${name}: accessing nested booster properties never throws TypeError`, () => {
        assert.doesNotThrow(() => {
          const _a = config.booster.enabled;
          const _b = config.booster.customRoleEnabled;
          const _c = config.booster.autoCleanup;
          const _d = config.booster.allowGift;
          const _e = config.booster.allowIcon;
          const _f = config.booster.nameMaxLength;
          const _g = config.booster.announceChannel;
          const _h = config.booster.boostChannelId;
          const _i = config.booster.thankMessage;
          const _j = config.booster.perks.includes('custom_role');
          assert.equal(typeof _a, 'boolean');
          assert.equal(typeof _b, 'boolean');
          assert.equal(typeof _f, 'number');
          assert.equal(typeof _i, 'string');
          assert.equal(typeof _j, 'boolean');
        });
      });

      test(`${name}: accessing nested application properties never throws TypeError`, () => {
        assert.doesNotThrow(() => {
          const _a = config.applications.enabled;
          const _b = config.applications.open;
          const _c = config.applications.applicationChannelId;
          const _d = config.applications.reviewChannel;
          const _e = config.applications.logChannelId;
          const _f = config.applications.questions.length;
          const _g = config.applications.questions[0];
          const _h = config.applications.roles.admin;
          const _i = config.applications.roles.reviewer;
          const _j = config.applications.roles.accepted;
          const _k = config.applications.roles.denied;
          const _l = config.applications.pingRoles.length;
          const _m = config.applications.pendingApplicationRetentionDays;
          const _n = config.applications.reviewedApplicationRetentionDays;
          assert.equal(typeof _a, 'boolean');
          assert.equal(typeof _b, 'boolean');
          assert.equal(_f >= 1, true);
          assert.equal(typeof _m, 'number');
          assert.equal(typeof _n, 'number');
        });
      });

      test(`${name}: accessing nested logging properties never throws TypeError`, () => {
        assert.doesNotThrow(() => {
          const _a = config.logging.enabled;
          const _b = config.logging.channels.audit;
          const _c = config.logging.channels.applications;
          const _d = config.logging.channels.reports;
          const _e = config.logging.ignore.users.length;
          const _f = config.logging.ignore.channels.length;
          const _g = Object.keys(config.logging.enabledEvents);
          assert.equal(typeof _a, 'boolean');
          assert.equal(Array.isArray(config.logging.ignore.users), true);
          assert.equal(Array.isArray(config.logging.ignore.channels), true);
        });
      });
    }
  });

  describe('2. Deep Mutation Isolation on Default Objects', () => {
    test('Mutating a cloned or normalized config instance does not affect DEFAULT_GUILD_CONFIG', () => {
      const normalized = normalizeGuildConfig({}, GUILD_CONFIG_DEFAULTS);
      normalized.welcome.roleIds.push('injected_role_123');
      normalized.leveling.xpRange.min = 9999;
      normalized.circle.channels.push('injected_channel');
      normalized.moderationPolicy.escalation.timeoutAt = 999;
      normalized.booster.perks.push('super_hacker_perk');

      // Assert DEFAULT_GUILD_CONFIG is untainted
      assert.equal(DEFAULT_GUILD_CONFIG.welcome.roleIds.length, 0);
      assert.equal(DEFAULT_GUILD_CONFIG.leveling.xpRange.min, 15);
      assert.equal(DEFAULT_GUILD_CONFIG.circle.channels.length, 0);
      assert.equal(DEFAULT_GUILD_CONFIG.moderationPolicy.escalation.timeoutAt, 3);
      assert.equal(DEFAULT_GUILD_CONFIG.booster.perks.includes('super_hacker_perk'), false);

      // Assert GUILD_CONFIG_DEFAULTS is untainted
      assert.equal(GUILD_CONFIG_DEFAULTS.welcome.roleIds.length, 0);
      assert.equal(GUILD_CONFIG_DEFAULTS.leveling.xpRange.min, 15);
      assert.equal(GUILD_CONFIG_DEFAULTS.circle.channels.length, 0);
      assert.equal(GUILD_CONFIG_DEFAULTS.moderationPolicy.escalation.timeoutAt, 3);
      assert.equal(GUILD_CONFIG_DEFAULTS.booster.perks.includes('super_hacker_perk'), false);
    });
  });

  describe('3. Database Fallback Resilience with Corrupted & Malformed Records', () => {
    const corruptPayloads = [
      { desc: 'null payload', value: null },
      { desc: 'undefined payload', value: undefined },
      { desc: 'empty string', value: '' },
      { desc: 'garbled string', value: 'NOT_VALID_JSON_{{{' },
      { desc: 'raw number', value: -42 },
      { desc: 'raw boolean', value: true },
      { desc: 'raw array of primitives', value: ['bad', 123, null] },
      { desc: 'null nested sub-objects', value: {
          welcome: null,
          leveling: null,
          circle: null,
          confessions: null,
          jointocreate: null,
          moderationPolicy: null,
          booster: null,
          applications: null,
          logging: null,
        }
      },
      { desc: 'corrupted inner types in sub-objects', value: {
          welcome: { roleIds: 'not-an-array', welcomeEmbed: 'not-an-object', joinLogs: 123 },
          leveling: { xpRange: 'invalid', cooldown: -99, rewards: 'not-an-object' },
          circle: { channels: 555, categoryLimit: -10 },
          confessions: { cooldownMinutes: 'infinity' },
          jointocreate: { creatorChannels: false, defaultLimit: 5000 },
          moderationPolicy: { escalation: 'broken', maxWarnings: -5 },
          booster: { perks: null, nameMaxLength: 999 },
          applications: { roles: 'admin_only', questions: [] },
          logging: { channels: 'channel_id_string', ignore: null },
        }
      },
    ];

    for (const { desc, value } of corruptPayloads) {
      test(`getGuildConfig survives database returning ${desc}`, async () => {
        const client = createMockClient();
        const guildId = `guild_corrupt_${Math.random().toString(36).slice(2, 8)}`;
        await client.db.set(`guild:${guildId}:config`, value);

        const config = await getGuildConfig(client, guildId);
        assert.ok(config);

        // Verify deep property access on the returned config never throws TypeError
        assert.equal(typeof config.circle.enabled, 'boolean');
        assert.equal(Array.isArray(config.circle.channels), true);
        assert.equal(typeof config.confessions.enabled, 'boolean');
        assert.equal(typeof config.welcome.enabled, 'boolean');
        assert.equal(Array.isArray(config.welcome.roleIds), true);
        assert.equal(typeof config.welcome.welcomeEmbed.title, 'string');
        assert.equal(typeof config.leveling.enabled, 'boolean');
        assert.equal(typeof config.leveling.xpRange.min, 'number');
        assert.equal(typeof config.jointocreate.enabled, 'boolean');
        assert.equal(Array.isArray(config.jointocreate.creatorChannels), true);
        assert.equal(typeof config.moderationPolicy.maxWarnings, 'number');
        assert.equal(typeof config.moderationPolicy.escalation.timeoutAt, 'number');
        assert.equal(typeof config.booster.enabled, 'boolean');
        assert.equal(Array.isArray(config.booster.perks), true);
        assert.equal(typeof config.applications.enabled, 'boolean');
        assert.equal(Array.isArray(config.applications.questions), true);
        assert.equal(typeof config.logging.enabled, 'boolean');
      });
    }

    test('Individual feature KV getters recover from corrupted DB values', async () => {
      const client = createMockClient();
      const g = 'guild_kv_corrupt';

      // Corrupt each feature key
      await client.db.set(`guild:${g}:welcome`, 'corrupt_welcome');
      await client.db.set(`guild:${g}:leveling:config`, -1);
      await client.db.set(`guild:${g}:jointocreate`, ['corrupt_jtc']);
      await client.db.set(`guild:${g}:moderation_policy`, { escalation: 'invalid' });
      await client.db.set(`guild:${g}:booster_config`, 'broken_booster');
      await client.db.set(`guild:${g}:applications:settings`, null);

      const welcome = await getWelcomeConfig(client, g);
      assert.equal(welcome.enabled, false);
      assert.equal(typeof welcome.cardStyle, 'string');
      assert.equal(Array.isArray(welcome.roleIds), true);

      const leveling = await getLevelingConfig(client, g);
      assert.equal(leveling.enabled, false);
      assert.equal(typeof leveling.cooldown, 'number');
      assert.equal(Array.isArray(leveling.noXpChannels), true);

      const jtc = await getJoinToCreateConfig(client, g);
      assert.equal(jtc.enabled, false);
      assert.equal(typeof jtc.defaultLimit, 'number');
      assert.equal(Array.isArray(jtc.creatorChannels), true);

      const mod = await getModerationPolicyConfig(client, g);
      assert.equal(typeof mod.maxWarnings, 'number');
      assert.equal(typeof mod.escalation.timeoutAt, 'number');

      const booster = await getBoosterConfigData(client, g);
      assert.equal(typeof booster.enabled, 'boolean');
      assert.equal(Array.isArray(booster.perks), true);

      const apps = await getApplicationSettings(client, g);
      assert.equal(typeof apps.enabled, 'boolean');
      assert.equal(Array.isArray(apps.questions), true);
    });
  });

  describe('4. Patch & Partial Update Resilience', () => {
    test('patchGuildConfig preserves unpatched sibling properties', async () => {
      const client = createMockClient();
      const guildId = 'guild_patch_test';

      // 1. Initial read should be defaults
      const initial = await getGuildConfig(client, guildId);
      assert.equal(initial.welcome.enabled, false);
      assert.equal(initial.welcome.welcomeEmbed.title, '🎉 Welcome!');

      // 2. Patch only welcome.enabled
      await patchGuildConfig(client, guildId, {
        welcome: { enabled: true }
      });

      const updated = await getGuildConfig(client, guildId);
      assert.equal(updated.welcome.enabled, true);
      // Sibling property welcomeEmbed.title must NOT be wiped
      assert.equal(updated.welcome.welcomeEmbed.title, '🎉 Welcome!');
      // Leveling sub-object must remain intact
      assert.equal(updated.leveling.xpRange.min, 15);
      // Booster perks must remain intact
      assert.equal(updated.booster.perks.includes('custom_role'), true);
    });

    test('updateGuildConfig with top-level override retains defaulted sub-objects', async () => {
      const client = createMockClient();
      const guildId = 'guild_update_test';

      await updateGuildConfig(client, guildId, {
        prefix: '??',
        modRole: 'role_moderator_999'
      });

      const config = await getGuildConfig(client, guildId);
      assert.equal(config.prefix, '??');
      assert.equal(config.modRole, 'role_moderator_999');
      assert.equal(config.circle.enabled, true);
      assert.equal(config.confessions.cooldownMinutes, 10);
      assert.equal(config.applications.open, false);
    });
  });

});
