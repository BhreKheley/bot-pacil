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

describe('Adversarial M2 Stress Tests: Config Audit & Schema Hardening', () => {

  describe('Suite 1: Schema Boundary Values & Strict Constraint Enforcement', () => {
    test('CommandPolicyEntrySchema strictly enforces cooldownSeconds bounds and integer type', () => {
      // Lower bound
      assert.equal(CommandPolicyEntrySchema.safeParse({ cooldownSeconds: 0 }).success, true);
      assert.equal(CommandPolicyEntrySchema.safeParse({ cooldownSeconds: -1 }).success, false);

      // Upper bound (86400)
      assert.equal(CommandPolicyEntrySchema.safeParse({ cooldownSeconds: 86400 }).success, true);
      assert.equal(CommandPolicyEntrySchema.safeParse({ cooldownSeconds: 86401 }).success, false);

      // Float rejection
      assert.equal(CommandPolicyEntrySchema.safeParse({ cooldownSeconds: 12.5 }).success, false);
      assert.equal(CommandPolicyEntrySchema.safeParse({ cooldownSeconds: NaN }).success, false);
      assert.equal(CommandPolicyEntrySchema.safeParse({ cooldownSeconds: Infinity }).success, false);
    });

    test('ConfessionConfigSchema strictly enforces cooldownMinutes & replyCooldown bounds', () => {
      // Cooldown minutes (0 to 1440)
      assert.equal(ConfessionConfigSchema.safeParse({ cooldownMinutes: 0 }).success, true);
      assert.equal(ConfessionConfigSchema.safeParse({ cooldownMinutes: 1440 }).success, true);
      assert.equal(ConfessionConfigSchema.safeParse({ cooldownMinutes: 1441 }).success, false);
      assert.equal(ConfessionConfigSchema.safeParse({ cooldownMinutes: -1 }).success, false);
      assert.equal(ConfessionConfigSchema.safeParse({ cooldownMinutes: 5.5 }).success, false);

      // Reply cooldown seconds (0 to 3600)
      assert.equal(ConfessionConfigSchema.safeParse({ replyCooldownSeconds: 0 }).success, true);
      assert.equal(ConfessionConfigSchema.safeParse({ replyCooldownSeconds: 3600 }).success, true);
      assert.equal(ConfessionConfigSchema.safeParse({ replyCooldownSeconds: 3601 }).success, false);
      assert.equal(ConfessionConfigSchema.safeParse({ replyCooldownSeconds: -1 }).success, false);
    });

    test('CircleConfigSchema strictly validates categoryLimit (1-50) and roleLimit (1-250)', () => {
      assert.equal(CircleConfigSchema.safeParse({ categoryLimit: 1, roleLimit: 1 }).success, true);
      assert.equal(CircleConfigSchema.safeParse({ categoryLimit: 50, roleLimit: 250 }).success, true);

      // Boundary violations
      assert.equal(CircleConfigSchema.safeParse({ categoryLimit: 0 }).success, false);
      assert.equal(CircleConfigSchema.safeParse({ categoryLimit: 51 }).success, false);
      assert.equal(CircleConfigSchema.safeParse({ roleLimit: 0 }).success, false);
      assert.equal(CircleConfigSchema.safeParse({ roleLimit: 251 }).success, false);
      assert.equal(CircleConfigSchema.safeParse({ categoryLimit: 25.5 }).success, false);
    });

    test('WelcomeConfigSchema strictly validates autoRoleDelay bounds (0-3600)', () => {
      assert.equal(WelcomeConfigSchema.safeParse({ autoRoleDelay: 0 }).success, true);
      assert.equal(WelcomeConfigSchema.safeParse({ autoRoleDelay: 3600 }).success, true);
      assert.equal(WelcomeConfigSchema.safeParse({ autoRoleDelay: 3601 }).success, false);
      assert.equal(WelcomeConfigSchema.safeParse({ autoRoleDelay: -1 }).success, false);
      assert.equal(WelcomeConfigSchema.safeParse({ autoRoleDelay: 10.5 }).success, false);
    });

    test('JtcConfigSchema strictly validates defaultLimit (0-99) and bitrate (8000-384000)', () => {
      assert.equal(JtcConfigSchema.safeParse({ defaultLimit: 0, bitrate: 8000 }).success, true);
      assert.equal(JtcConfigSchema.safeParse({ defaultLimit: 99, bitrate: 384000 }).success, true);

      // Violations
      assert.equal(JtcConfigSchema.safeParse({ defaultLimit: -1 }).success, false);
      assert.equal(JtcConfigSchema.safeParse({ defaultLimit: 100 }).success, false);
      assert.equal(JtcConfigSchema.safeParse({ defaultBitrate: 7999 }).success, false);
      assert.equal(JtcConfigSchema.safeParse({ defaultBitrate: 384001 }).success, false);
      assert.equal(JtcConfigSchema.safeParse({ defaultBitrate: 64000.5 }).success, false);
    });

    test('ModerationPolicySchema strictly validates maxWarnings (1-20) and autoMuteDuration (1-40320)', () => {
      assert.equal(ModerationPolicySchema.safeParse({ maxWarnings: 1, autoMuteDuration: 1 }).success, true);
      assert.equal(ModerationPolicySchema.safeParse({ maxWarnings: 20, autoMuteDuration: 40320 }).success, true);

      // Violations
      assert.equal(ModerationPolicySchema.safeParse({ maxWarnings: 0 }).success, false);
      assert.equal(ModerationPolicySchema.safeParse({ maxWarnings: 21 }).success, false);
      assert.equal(ModerationPolicySchema.safeParse({ autoMuteDuration: 0 }).success, false);
      assert.equal(ModerationPolicySchema.safeParse({ autoMuteDuration: 40321 }).success, false);
      assert.equal(ModerationPolicySchema.safeParse({ maxWarnings: 3.5 }).success, false);
    });

    test('BoosterConfigSchema strictly validates nameMaxLength (2-32)', () => {
      assert.equal(BoosterConfigSchema.safeParse({ nameMaxLength: 2 }).success, true);
      assert.equal(BoosterConfigSchema.safeParse({ nameMaxLength: 32 }).success, true);
      assert.equal(BoosterConfigSchema.safeParse({ nameMaxLength: 1 }).success, false);
      assert.equal(BoosterConfigSchema.safeParse({ nameMaxLength: 33 }).success, false);
      assert.equal(BoosterConfigSchema.safeParse({ nameMaxLength: 20.5 }).success, false);
    });

    test('ApplicationSettingsSchema strictly validates retention days (1-3650)', () => {
      assert.equal(ApplicationSettingsSchema.safeParse({ pendingApplicationRetentionDays: 1 }).success, true);
      assert.equal(ApplicationSettingsSchema.safeParse({ pendingApplicationRetentionDays: 3650 }).success, true);
      assert.equal(ApplicationSettingsSchema.safeParse({ pendingApplicationRetentionDays: 0 }).success, false);
      assert.equal(ApplicationSettingsSchema.safeParse({ pendingApplicationRetentionDays: 3651 }).success, false);
    });
  });

  describe('Suite 2: Malicious Payloads, Prototype Pollution & Injection Resilience', () => {
    test('normalizeGuildConfig does not pollute Object prototype via __proto__ or constructor', () => {
      const maliciousPayload = JSON.parse(
        '{"__proto__": {"polluted": true}, "constructor": {"prototype": {"isAdmin": true}}}'
      );

      const normalized = normalizeGuildConfig(maliciousPayload);
      assert.equal(({}).polluted, undefined, 'Object.prototype must not be polluted with "polluted"');
      assert.equal(({}).isAdmin, undefined, 'Object.prototype must not be polluted with "isAdmin"');
      assert.ok(normalized);
    });

    test('validateGuildConfig rejects or neutralizes object prototype manipulation in commandPolicies', () => {
      const payload = {
        commandPolicies: {
          '__proto__': { allowedRoles: ['admin'], cooldownSeconds: 10 },
          'constructor': { allowedRoles: ['mod'], cooldownSeconds: 5 },
          'toString': { allowedRoles: [], cooldownSeconds: 0 },
        }
      };

      const result = validateGuildConfig(payload);
      // Object prototype is never polluted
      assert.equal(({}).allowedRoles, undefined);
      // Zod schema catches the prototype pollution keys and safely rejects or validates
      assert.equal(typeof result, 'object');
      assert.equal(typeof result.success, 'boolean');
    });

    test('validateGuildConfigOrThrow rejects invalid values inside malicious structures with clean issues', () => {
      const badPayload = {
        prefix: 12345, // invalid type
        welcome: { autoRoleDelay: -500 }, // out of bounds
        jointocreate: { defaultBitrate: 9999999 }, // out of bounds
      };

      assert.throws(() => {
        validateGuildConfigOrThrow(badPayload);
      }, (err) => {
        assert.equal(err.name, 'PacilBotError');
        assert.ok(err.context?.issues?.length >= 1);
        return true;
      });
    });

    test('SQL injection and XSS strings in configuration text fields are preserved safely without execution', () => {
      const sqlInjection = "'; DROP TABLE guild_configs; --";
      const xssString = "<script>alert('pwned')</script>";

      const config = normalizeWelcomeConfig({
        welcomeMessage: sqlInjection,
        welcomeTitle: xssString,
      });

      assert.equal(config.welcomeMessage, sqlInjection);
      assert.equal(config.welcomeTitle, xssString);
      assert.equal(typeof config.welcomeMessage, 'string');
    });
  });

  describe('Suite 3: Corrupt Data Types, Nulls, Undefineds, and Primitives to Normalizers', () => {
    test('All normalizers survive raw primitive inputs without throwing', () => {
      const primitives = [null, undefined, 42, 'string', true, Symbol('test'), () => {}];

      for (const prim of primitives) {
        assert.doesNotThrow(() => normalizeWelcomeConfig(prim), `normalizeWelcomeConfig failed on ${String(prim)}`);
        assert.doesNotThrow(() => normalizeLevelingConfig(prim), `normalizeLevelingConfig failed on ${String(prim)}`);
        assert.doesNotThrow(() => normalizeJtcConfig(prim), `normalizeJtcConfig failed on ${String(prim)}`);
        assert.doesNotThrow(() => normalizeModerationPolicy(prim), `normalizeModerationPolicy failed on ${String(prim)}`);
        assert.doesNotThrow(() => normalizeBoosterConfig(prim), `normalizeBoosterConfig failed on ${String(prim)}`);
        assert.doesNotThrow(() => normalizeApplicationSettings(prim), `normalizeApplicationSettings failed on ${String(prim)}`);
        assert.doesNotThrow(() => normalizeConfessionConfig(prim), `normalizeConfessionConfig failed on ${String(prim)}`);
        assert.doesNotThrow(() => normalizeCircleConfig(prim), `normalizeCircleConfig failed on ${String(prim)}`);
        assert.doesNotThrow(() => normalizeGuildConfig(prim), `normalizeGuildConfig failed on ${String(prim)}`);
      }
    });

    test('Normalizers survive array inputs without corruption', () => {
      const arrayInput = ['malicious', 123, null];

      const welcome = normalizeWelcomeConfig(arrayInput);
      assert.equal(welcome.enabled, false);
      assert.equal(Array.isArray(welcome.roleIds), true);

      const leveling = normalizeLevelingConfig(arrayInput);
      assert.equal(leveling.enabled, false);
      assert.equal(typeof leveling.rewards, 'object');

      const jtc = normalizeJtcConfig(arrayInput);
      assert.equal(jtc.enabled, false);
      assert.equal(jtc.defaultLimit, 0);

      const mod = normalizeModerationPolicy(arrayInput);
      assert.equal(mod.maxWarnings, 3);
      assert.equal(mod.autoMuteDuration, 60);

      const booster = normalizeBoosterConfig(arrayInput);
      assert.equal(booster.nameMaxLength, 30);
      assert.equal(Array.isArray(booster.perks), true);

      const apps = normalizeApplicationSettings(arrayInput);
      assert.equal(apps.open, false);
      assert.ok(apps.questions.length > 0);
    });

    test('Corrupted field types within objects fall back to safe defaults or valid clamps', () => {
      // Welcome with bad types
      const badWelcome = normalizeWelcomeConfig({
        enabled: 'not-a-bool',
        roleIds: 'not-an-array',
        autoRoleDelay: -99,
        joinLogs: 'not-an-object',
      });
      assert.equal(badWelcome.enabled, false);
      assert.deepEqual(badWelcome.roleIds, []);
      assert.equal(badWelcome.autoRoleDelay, 0);
      assert.deepEqual(badWelcome.joinLogs, { enabled: false, channelId: null });

      // Leveling with bad types
      const badLeveling = normalizeLevelingConfig({
        cooldown: -50,
        xpRange: 'invalid',
        rewards: 'not-an-object',
        noXpChannels: 'invalid',
      });
      assert.equal(badLeveling.cooldown, 60);
      assert.deepEqual(badLeveling.rewards, {});
      assert.deepEqual(badLeveling.noXpChannels, []);

      // JTC with bad types (clamped to valid bounds)
      const badJtc = normalizeJtcConfig({
        creatorChannels: 'not-an-array',
        defaultLimit: -5,
        defaultBitrate: 100, // clamped to min allowable bitrate 8000
      });
      assert.deepEqual(badJtc.creatorChannels, []);
      assert.equal(badJtc.defaultLimit, 0);
      assert.equal(badJtc.defaultBitrate, 8000);
    });
  });

  describe('Suite 4: Dual-Property Synchronization & Conflict Resolution', () => {
    test('Welcome: channel vs channelId synchronization', () => {
      // Only channel provided -> populates channelId
      const r1 = normalizeWelcomeConfig({ channel: 'ch_abc' });
      assert.equal(r1.channelId, 'ch_abc');

      // Both provided -> channelId takes precedence if explicit
      const r2 = normalizeWelcomeConfig({ channel: 'ch_old', channelId: 'ch_new' });
      assert.equal(r2.channelId, 'ch_new');

      // message vs welcomeMessage
      const r3 = normalizeWelcomeConfig({ message: 'Welcome here!' });
      assert.equal(r3.welcomeMessage, 'Welcome here!');
    });

    test('Leveling: cooldown vs xpCooldown, announceChannel vs levelUpChannel, ignored vs noXp', () => {
      // Cooldown sync
      const r1 = normalizeLevelingConfig({ xpCooldown: 45 });
      assert.equal(r1.cooldown, 45);
      assert.equal(r1.xpCooldown, 45);

      // Channel sync
      const r2 = normalizeLevelingConfig({ levelUpChannel: 'ch_lvl_up' });
      assert.equal(r2.announceChannel, 'ch_lvl_up');
      assert.equal(r2.levelUpChannel, 'ch_lvl_up');

      // Array sync
      const r3 = normalizeLevelingConfig({ ignoredChannels: ['ch_1'], ignoredRoles: ['ro_1'] });
      assert.deepEqual(r3.noXpChannels, ['ch_1']);
      assert.deepEqual(r3.ignoredChannels, ['ch_1']);
      assert.deepEqual(r3.noXpRoles, ['ro_1']);
      assert.deepEqual(r3.ignoredRoles, ['ro_1']);

      // Rewards sync (roleRewards -> rewards -> roles)
      const r4 = normalizeLevelingConfig({ roleRewards: { '5': 'role_5' } });
      assert.deepEqual(r4.rewards, { '5': 'role_5' });
      assert.deepEqual(r4.roleRewards, { '5': 'role_5' });
      assert.deepEqual(r4.roles, { '5': 'role_5' });
    });

    test('JTC: creatorChannels vs triggerChannels, defaultLimit vs userLimit, defaultBitrate vs bitrate', () => {
      const r1 = normalizeJtcConfig({
        triggerChannels: ['ch_trig_1'],
        userLimit: 15,
        bitrate: 128000,
      });
      assert.deepEqual(r1.creatorChannels, ['ch_trig_1']);
      assert.deepEqual(r1.triggerChannels, ['ch_trig_1']);
      assert.equal(r1.defaultLimit, 15);
      assert.equal(r1.userLimit, 15);
      assert.equal(r1.defaultBitrate, 128000);
      assert.equal(r1.bitrate, 128000);
    });

    test('Booster: customRoleEnabled vs enabled, announceChannel vs boostChannelId', () => {
      const r1 = normalizeBoosterConfig({ customRoleEnabled: false });
      assert.equal(r1.customRoleEnabled, false);
      assert.equal(r1.enabled, false);

      const r2 = normalizeBoosterConfig({ boostChannelId: 'ch_boost_hall' });
      assert.equal(r2.announceChannel, 'ch_boost_hall');
      assert.equal(r2.boostChannelId, 'ch_boost_hall');
    });

    test('Applications: open vs enabled, reviewChannel vs applicationChannelId', () => {
      const r1 = normalizeApplicationSettings({ open: true });
      assert.equal(r1.open, true);
      assert.equal(r1.enabled, true);

      const r2 = normalizeApplicationSettings({ reviewChannel: 'ch_review_hub' });
      assert.equal(r2.reviewChannel, 'ch_review_hub');
      assert.equal(r2.applicationChannelId, 'ch_review_hub');
    });
  });

  describe('Suite 5: Database Layer Fault-Tolerance & Resilience', () => {
    test('Database read helpers gracefully survive missing client.db or empty client', async () => {
      const noDbClient = {}; // Missing db property

      // Welcome
      const w1 = await getWelcomeConfig(noDbClient, 'g1');
      assert.equal(w1.enabled, false);

      // Leveling
      const l1 = await getLevelingConfig(noDbClient, 'g1');
      assert.equal(l1.enabled, false);

      // JTC
      const j1 = await getJoinToCreateConfig(noDbClient, 'g1');
      assert.equal(j1.enabled, false);

      // Moderation
      const m1 = await getModerationPolicyConfig(noDbClient, 'g1');
      assert.equal(m1.maxWarnings, 3);

      // Booster
      const b1 = await getBoosterConfigData(noDbClient, 'g1');
      assert.equal(b1.nameMaxLength, 30);
    });

    test('Database save helpers gracefully return false on missing client.db or throwing client.db.set', async () => {
      const noDbClient = {};
      assert.equal(await saveWelcomeConfig(noDbClient, 'g1', {}), false);
      assert.equal(await saveModerationPolicyConfig(noDbClient, 'g1', {}), false);
      assert.equal(await saveBoosterConfigData(noDbClient, 'g1', {}), false);

      // Throwing DB client
      const throwingClient = {
        db: {
          get: async () => { throw new Error('DB Connection Lost'); },
          set: async () => { throw new Error('DB Disk Full'); },
        }
      };

      assert.equal(await saveWelcomeConfig(throwingClient, 'g1', { enabled: true }), false);
      assert.equal(await saveModerationPolicyConfig(throwingClient, 'g1', { maxWarnings: 5 }), false);
      assert.equal(await saveBoosterConfigData(throwingClient, 'g1', {}), false);
      
      // Getters return normalized defaults on DB throw
      const recoveredWelcome = await getWelcomeConfig(throwingClient, 'g1');
      assert.equal(recoveredWelcome.enabled, false);
      const recoveredMod = await getModerationPolicyConfig(throwingClient, 'g1');
      assert.equal(recoveredMod.maxWarnings, 3);
    });

    test('Nested mutations in DB do not leak across guilds in MockDatabase', async () => {
      const client = createMockClient();
      const g1 = 'guild_iso_1';
      const g2 = 'guild_iso_2';

      await saveWelcomeConfig(client, g1, { enabled: true, welcomeMessage: 'Welcome to Guild 1' });
      await saveWelcomeConfig(client, g2, { enabled: false, welcomeMessage: 'Welcome to Guild 2' });

      const cfg1 = await getWelcomeConfig(client, g1);
      const cfg2 = await getWelcomeConfig(client, g2);

      assert.equal(cfg1.enabled, true);
      assert.equal(cfg1.welcomeMessage, 'Welcome to Guild 1');
      assert.equal(cfg2.enabled, false);
      assert.equal(cfg2.welcomeMessage, 'Welcome to Guild 2');

      // Mutating in-memory returned object should not mutate DB record
      cfg1.welcomeMessage = 'Hacked';
      const cfg1Refreshed = await getWelcomeConfig(client, g1);
      assert.equal(cfg1Refreshed.welcomeMessage, 'Welcome to Guild 1');
    });
  });

  describe('Suite 6: Extreme Payloads & Non-Standard Payloads', () => {
    test('Large arrays and long strings in configuration payloads are handled cleanly', () => {
      const hugeArray = Array.from({ length: 500 }, (_, i) => `role_${i}`);
      const hugeString = 'A'.repeat(5000);

      const welcome = normalizeWelcomeConfig({
        roleIds: hugeArray,
        welcomeMessage: hugeString,
      });

      assert.equal(welcome.roleIds.length, 500);
      assert.equal(welcome.welcomeMessage.length, 5000);
      assert.equal(welcome.welcomeMessage, hugeString);
    });

    test('Unicode characters, emoji, and zero-width spaces are preserved in text fields', () => {
      const textWithSpecialChars = 'Halo Pacil-Bot! 🎉 \u200B\u200C\u200D 🚀 日本語 testing';

      const config = normalizeWelcomeConfig({
        welcomeMessage: textWithSpecialChars,
        welcomeTitle: textWithSpecialChars,
      });

      assert.equal(config.welcomeMessage, textWithSpecialChars);
      assert.equal(config.welcomeTitle, textWithSpecialChars);
    });
  });

  describe('Suite 7: Circular Reference & Object Tampering Resilience', () => {
    test('validateGuildConfig handles objects with circular references without crashing', () => {
      const circular = { prefix: '!' };
      circular.self = circular;

      // Should safely parse or fail without maximum call stack error
      assert.doesNotThrow(() => {
        const result = validateGuildConfig(circular);
        assert.ok(result);
      });
    });

    test('normalizeGuildConfig handles circular references without infinite looping', () => {
      const circular = { prefix: '?' };
      circular.loop = circular;

      assert.doesNotThrow(() => {
        const normalized = normalizeGuildConfig(circular);
        assert.equal(normalized.prefix, '?');
      });
    });
  });

});
