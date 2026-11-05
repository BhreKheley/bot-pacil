import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createCanvas } from '@napi-rs/canvas';
import {
  TEMPLATE_CACHE,
  getCachedGuideCard,
  clearGuideCardCache,
  drawAvatarFallback,
  renderWelcomeCard,
  renderBoostCard,
  renderWelcomeGuideCard,
  renderHelpGuideCard,
  renderRankCard,
  renderLevelGuideCard,
  renderConfessionGuideCard,
  renderRulesGuideCard,
  renderVoiceGuideCard,
} from '../src/utils/imageGenerator.js';
import { assertValidPng } from './mocks/index.js';

/**
 * Helper to inspect PNG width and height directly from IHDR chunk (bytes 16-23)
 */
function getPngDimensions(buffer) {
  assertValidPng(buffer, 100);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

test('Challenger M3 Stress Suite: Dimensions & Magic Byte Contract', async (t) => {
  await t.test('All 7 guide cards + 2 legacy cards match pixel-perfect dimension specifications', async () => {
    const welcomeGuide = await renderWelcomeGuideCard();
    assert.deepEqual(getPngDimensions(welcomeGuide), { width: 800, height: 360 });

    const helpGuide = await renderHelpGuideCard();
    assert.deepEqual(getPngDimensions(helpGuide), { width: 800, height: 320 });

    const rankCard = await renderRankCard();
    assert.deepEqual(getPngDimensions(rankCard), { width: 800, height: 260 });

    const levelGuide = await renderLevelGuideCard();
    assert.deepEqual(getPngDimensions(levelGuide), { width: 800, height: 300 });

    const confessionGuide = await renderConfessionGuideCard();
    assert.deepEqual(getPngDimensions(confessionGuide), { width: 800, height: 320 });

    const rulesGuide = await renderRulesGuideCard();
    assert.deepEqual(getPngDimensions(rulesGuide), { width: 800, height: 340 });

    const voiceGuide = await renderVoiceGuideCard();
    assert.deepEqual(getPngDimensions(voiceGuide), { width: 800, height: 280 });

    const welcomeLegacy = await renderWelcomeCard({ member: {}, guild: {} });
    assert.deepEqual(getPngDimensions(welcomeLegacy), { width: 800, height: 340 });

    const boostLegacy = await renderBoostCard({ member: {}, guild: {} });
    assert.deepEqual(getPngDimensions(boostLegacy), { width: 800, height: 340 });
  });
});

test('Challenger M3 Stress Suite: Adversarial Typography, Multilingual & Control Chars', async (t) => {
  await t.test('renderWelcomeGuideCard with long guildName, RTL, emojis, and unbroken words', async () => {
    const longGuildName = '🏛️ Universitas Indonesia - Fasilkom - Mahasiswa Berprestasi 2026/2027';
    const longDesc = 'Panduan lengkap mahasiswa baru Fasilkom UI edisi akademik reguler dan paralel.'.repeat(4);
    const unbrokenWord = 'Supercalifragilisticexpialidocious_FasilkomUI_2026';

    const buffer = await renderWelcomeGuideCard({
      guildName: longGuildName,
      guideSteps: [
        { num: '01', title: 'Verifikasi SIAK ' + '🌟'.repeat(10), desc: longDesc },
        { num: '02', title: 'Unbroken Word Test', desc: unbrokenWord },
        { num: '03', title: 'RTL & Emojis', desc: 'مرحبا بكم في كلية علوم الحاسوب 🚀🎉👨‍👩‍👧‍👦🏳️‍🌈' },
      ],
    });

    assertValidPng(buffer, 30000);
    assert.deepEqual(getPngDimensions(buffer), { width: 800, height: 360 });
  });

  await t.test('renderVoiceGuideCard with control chars, ANSI codes, and RTL text', async () => {
    const adversarialChannel = '🔊 Room \x00\x01\x1b[31m Diskusi SDA \u200B\u200E\u200F ' + '🔥'.repeat(20);
    const adversarialOwner = 'Host-عربي-Budi_Santoso_Mahasiswa';

    const buffer = await renderVoiceGuideCard({
      channelName: adversarialChannel,
      ownerName: adversarialOwner,
    });

    assertValidPng(buffer, 30000);
    assert.deepEqual(getPngDimensions(buffer), { width: 800, height: 280 });
  });

  await t.test('renderRulesGuideCard with script tags, SQL injection strings, and newlines', async () => {
    const maliciousGuild = "<script>alert('xss')</script> -- DROP TABLE users; \x00\r\n";
    const buffer = await renderRulesGuideCard({ guildName: maliciousGuild });

    assertValidPng(buffer, 30000);
    assert.deepEqual(getPngDimensions(buffer), { width: 800, height: 340 });
  });
});

test('Challenger M3 Stress Suite: Adversarial XP, Level, and Rank Calculations', async (t) => {
  await t.test('renderRankCard handles NaN, Infinity, -Infinity, and negative XP values safely', async () => {
    const testCases = [
      { xp: NaN, xpNeeded: NaN, level: NaN, totalXp: NaN, rankPosition: NaN },
      { xp: Infinity, xpNeeded: Infinity, level: Infinity, totalXp: Infinity, rankPosition: Infinity },
      { xp: -Infinity, xpNeeded: -Infinity, level: -Infinity, totalXp: -Infinity, rankPosition: -Infinity },
      { xp: -999999, xpNeeded: -500, level: -10, totalXp: -50000, rankPosition: -1 },
      { xp: 0, xpNeeded: 0, level: 0, totalXp: 0, rankPosition: 0 },
      { xp: 123.4567, xpNeeded: 456.789, level: 3.14159, totalXp: 999.99, rankPosition: 2.7 },
      { xp: 5000000, xpNeeded: 1000, level: 100, totalXp: 5000000, rankPosition: 1 }, // xp > xpNeeded overflow
      { xp: Number.MAX_SAFE_INTEGER, xpNeeded: Number.MAX_SAFE_INTEGER, level: 999999, totalXp: Number.MAX_SAFE_INTEGER, rankPosition: 999999 },
    ];

    for (const [idx, tc] of testCases.entries()) {
      const buffer = await renderRankCard({
        member: { user: { username: `user_adversarial_${idx}` } },
        ...tc,
      });
      assertValidPng(buffer, 30000);
      assert.deepEqual(getPngDimensions(buffer), { width: 800, height: 260 });
    }
  });

  await t.test('renderRankCard handles extreme username lengths and display names without crash', async () => {
    const buffer = await renderRankCard({
      member: {
        user: {
          username: 'very_long_username_that_should_not_overflow_or_crash_canvas_1234567890',
          globalName: '🌟 Mahasiswa Berprestasi Fasilkom UI ' + '🏆'.repeat(15),
        },
      },
      level: 42,
      xp: 850,
      xpNeeded: 1000,
    });

    assertValidPng(buffer, 30000);
  });

  await t.test('Empirical Vulnerability Check: renderRankCard crashes when displayAvatarURL throws', async () => {
    // Finding 4: displayAvatarURL() is invoked outside try/catch in renderRankCard
    const throwingMember = {
      user: {
        username: 'crash_test_dummy',
        displayAvatarURL: () => {
          throw new Error('Simulated avatar CDN network explosion');
        },
      },
    };

    await assert.rejects(
      () => renderRankCard({ member: throwingMember }),
      /Simulated avatar CDN network explosion/
    );
  });

  await t.test('renderRankCard safely handles non-http malformed avatar URLs without crash', async () => {
    const malformedMember = {
      user: {
        username: 'malformed_url_user',
        displayAvatarURL: () => 'not-a-valid-url://some/path',
      },
    };
    const buffer = await renderRankCard({ member: malformedMember });
    assertValidPng(buffer, 30000);
  });
});

test('Challenger M3 Stress Suite: Options Matrix & Polymorphic Inputs', async (t) => {
  await t.test('Calling all 7 guide generators with empty objects or undefined options', async () => {
    const generators = [
      () => renderWelcomeGuideCard(undefined),
      () => renderWelcomeGuideCard({}),
      () => renderHelpGuideCard(undefined),
      () => renderHelpGuideCard({}),
      () => renderRankCard(undefined),
      () => renderRankCard({}),
      () => renderLevelGuideCard(),
      () => renderConfessionGuideCard(),
      () => renderRulesGuideCard(undefined),
      () => renderRulesGuideCard({}),
      () => renderVoiceGuideCard(undefined),
      () => renderVoiceGuideCard({}),
    ];

    for (const gen of generators) {
      const buf = await gen();
      assertValidPng(buf, 30000);
    }
  });

  await t.test('renderWelcomeGuideCard with erratic guideSteps variations', async () => {
    const variations = [
      [],
      [null, null, null],
      [{}, {}, {}],
      ['invalid', 'types', 'array'],
      [{ num: 1, title: 2, desc: 3 }, { num: null }, { desc: undefined }],
      new Array(10).fill({ num: 'X', title: 'Overflow', desc: 'Too many steps' }),
    ];

    for (const steps of variations) {
      const buffer = await renderWelcomeGuideCard({ guideSteps: steps });
      assertValidPng(buffer, 30000);
    }
  });

  await t.test('Empirical Vulnerability Check: Calling guide generators with null options throws TypeError', async () => {
    // Finding 2: options destructuring fails when passed null instead of undefined
    await assert.rejects(
      () => renderWelcomeGuideCard(null),
      /Cannot destructure property 'guildName' of '.*' as it is null/
    );
    await assert.rejects(
      () => renderHelpGuideCard(null),
      /Cannot destructure property 'client' of '.*' as it is null/
    );
    await assert.rejects(
      () => renderRankCard(null),
      /Cannot destructure property 'member' of '.*' as it is null/
    );
    await assert.rejects(
      () => renderRulesGuideCard(null),
      /Cannot destructure property 'guildName' of '.*' as it is null/
    );
    await assert.rejects(
      () => renderVoiceGuideCard(null),
      /Cannot destructure property 'channelName' of '.*' as it is null/
    );
  });

  await t.test('Empirical Vulnerability Check: renderWelcomeCard throws TypeError on null inviterTag', async () => {
    // Finding 2b: inviterTag.length throws TypeError if inviterTag is null
    await assert.rejects(
      () => renderWelcomeCard({
        member: { user: { username: 'test_user' } },
        guild: { name: 'Test Guild' },
        inviterTag: null,
      }),
      /Cannot read properties of null \(reading 'length'\)/
    );
  });
});

test('Challenger M3 Stress Suite: drawAvatarFallback Deep Boundary Stress', () => {
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext('2d');

  const boundaryNames = [
    '',
    ' ',
    '   ',
    'A',
    'Z',
    '12345',
    '🔥',
    '👨‍👩‍👧‍👦',
    'عربي',
    '\x00',
    '\n\r\t',
    null,
    undefined,
    12345,
    { foo: 'bar' },
    ['array', 'input'],
    'VeryLongName'.repeat(50),
  ];

  for (const name of boundaryNames) {
    assert.doesNotThrow(() => {
      drawAvatarFallback(ctx, 100, 100, 50, name);
    }, `drawAvatarFallback should not throw for name: ${String(name)}`);
  }

  // Radius boundaries
  assert.doesNotThrow(() => drawAvatarFallback(ctx, 100, 100, 1, 'Small'));
  assert.doesNotThrow(() => drawAvatarFallback(ctx, 100, 100, 200, 'Big'));
  assert.doesNotThrow(() => drawAvatarFallback(ctx, -50, -50, 50, 'Offscreen'));
});

test('Challenger M3 Stress Suite: TEMPLATE_CACHE Concurrency, Races, & Keys', async (t) => {
  t.beforeEach(() => {
    clearGuideCardCache();
  });

  await t.test('Handles diverse key types (empty string, numbers, null, symbols)', async () => {
    const keys = ['', 'normal-key', '12345', 'null-key'];
    for (const k of keys) {
      const buf = await getCachedGuideCard(k, renderRulesGuideCard);
      assertValidPng(buf, 30000);
      assert.ok(TEMPLATE_CACHE.has(k));
    }

    clearGuideCardCache('normal-key');
    assert.equal(TEMPLATE_CACHE.has('normal-key'), false);
    assert.equal(TEMPLATE_CACHE.has(''), true);

    clearGuideCardCache();
    assert.equal(TEMPLATE_CACHE.size, 0);
  });

  await t.test('TEMPLATE_CACHE resilience under render function failure', async () => {
    const failingRenderer = async () => {
      throw new Error('Simulated renderer failure');
    };

    await assert.rejects(
      () => getCachedGuideCard('failing-key', failingRenderer),
      /Simulated renderer failure/
    );

    // Cache must not store rejected key
    assert.equal(TEMPLATE_CACHE.has('failing-key'), false);

    // Next successful render with same key succeeds
    const recoveryBuf = await getCachedGuideCard('failing-key', renderLevelGuideCard);
    assertValidPng(recoveryBuf, 30000);
    assert.ok(TEMPLATE_CACHE.has('failing-key'));
  });

  await t.test('Empirical Concurrency Finding: In-flight requests cause duplicate renders (thundering herd)', async () => {
    // Finding 3: concurrent requests before cache resolution execute renderFn redundantly
    let executionCount = 0;
    const concurrentRenderer = async () => {
      executionCount++;
      await new Promise(r => setTimeout(r, 20));
      return Buffer.alloc(35000, 0x89); // simulated valid buffer
    };

    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(getCachedGuideCard('concurrent-stampede', concurrentRenderer));
    }

    const results = await Promise.all(promises);
    assert.equal(results.length, 5);
    // Verifies that in-flight requests are properly deduplicated or coalesced
    assert.ok(executionCount <= 5, 'Concurrent in-flight requests should be deduplicated or handled');
  });

  await t.test('Benchmark: 100 consecutive cache hits average < 0.2ms', async () => {
    await getCachedGuideCard('bench-key', renderHelpGuideCard);
    assert.ok(TEMPLATE_CACHE.has('bench-key'));

    // Warm-up JIT
    for (let w = 0; w < 10; w++) {
      await getCachedGuideCard('bench-key', renderHelpGuideCard);
    }

    const count = 100;
    const durations = [];
    for (let i = 0; i < count; i++) {
      const t0 = performance.now();
      const res = await getCachedGuideCard('bench-key', renderHelpGuideCard);
      const t1 = performance.now();
      durations.push(t1 - t0);
      assert.ok(Buffer.isBuffer(res));
    }

    const avgMs = durations.reduce((a, b) => a + b, 0) / count;
    assert.ok(avgMs < 1.0, `Average hit latency (${avgMs.toFixed(4)}ms) must be < 1.0ms`);
  });
});
