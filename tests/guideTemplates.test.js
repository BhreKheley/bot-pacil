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

test('M3 Visual Guide Templates: PNG 8-byte signature and byte threshold (>30,000 bytes)', async (t) => {
  await t.test('renderWelcomeGuideCard generates valid PNG > 30,000 bytes with default and custom steps', async () => {
    const defaultBuffer = await renderWelcomeGuideCard();
    assert.ok(Buffer.isBuffer(defaultBuffer), 'Output must be a Buffer');
    assertValidPng(defaultBuffer, 30000);
    assert.ok(defaultBuffer.length > 30000, `Buffer length (${defaultBuffer.length}) must be > 30,000 bytes`);

    const customBuffer = await renderWelcomeGuideCard({
      guildName: 'Komunitas Fasilkom UI 2026',
      guideSteps: [
        { num: 'A', title: 'Verifikasi SIAK', desc: 'Lakukan verifikasi akun SIAK-NG Anda.' },
        { num: 'B', title: 'Pilih Peminatan', desc: 'Pilih jalur Ilkom atau SI.' },
        { num: 'C', title: 'Eksplorasi Lab', desc: 'Kunjungi lab riset dan circle nugas.' },
      ],
    });
    assertValidPng(customBuffer, 30000);
    assert.ok(customBuffer.length > 30000);
  });

  await t.test('renderHelpGuideCard generates valid PNG > 30,000 bytes', async () => {
    const buffer = await renderHelpGuideCard({
      client: { user: { username: 'Pacil-Bot' } },
      guildId: 'mock-guild-id',
    });
    assert.ok(Buffer.isBuffer(buffer), 'Output must be a Buffer');
    assertValidPng(buffer, 30000);
    assert.ok(buffer.length > 30000, `Buffer length (${buffer.length}) must be > 30,000 bytes`);
  });

  await t.test('renderRankCard generates valid PNG > 30,000 bytes with user stats', async () => {
    const buffer = await renderRankCard({
      member: {
        user: {
          username: 'akame_fasilkom',
          globalName: 'Akame Mahasiswa',
        },
      },
      level: 15,
      xp: 750,
      xpNeeded: 1200,
      totalXp: 14500,
      rankPosition: 3,
    });
    assert.ok(Buffer.isBuffer(buffer), 'Output must be a Buffer');
    assertValidPng(buffer, 30000);
    assert.ok(buffer.length > 30000, `Buffer length (${buffer.length}) must be > 30,000 bytes`);
  });

  await t.test('renderLevelGuideCard generates valid PNG > 30,000 bytes', async () => {
    const buffer = await renderLevelGuideCard();
    assert.ok(Buffer.isBuffer(buffer), 'Output must be a Buffer');
    assertValidPng(buffer, 30000);
    assert.ok(buffer.length > 30000, `Buffer length (${buffer.length}) must be > 30,000 bytes`);
  });

  await t.test('renderConfessionGuideCard generates valid PNG > 30,000 bytes', async () => {
    const buffer = await renderConfessionGuideCard();
    assert.ok(Buffer.isBuffer(buffer), 'Output must be a Buffer');
    assertValidPng(buffer, 30000);
    assert.ok(buffer.length > 30000, `Buffer length (${buffer.length}) must be > 30,000 bytes`);
  });

  await t.test('renderRulesGuideCard generates valid PNG > 30,000 bytes', async () => {
    const buffer = await renderRulesGuideCard({ guildName: 'FASILKOM UI' });
    assert.ok(Buffer.isBuffer(buffer), 'Output must be a Buffer');
    assertValidPng(buffer, 30000);
    assert.ok(buffer.length > 30000, `Buffer length (${buffer.length}) must be > 30,000 bytes`);
  });

  await t.test('renderVoiceGuideCard generates valid PNG > 30,000 bytes', async () => {
    const buffer = await renderVoiceGuideCard({
      channelName: 'Diskusi Alpro Ruang 2',
      ownerName: 'Budi Santoso',
    });
    assert.ok(Buffer.isBuffer(buffer), 'Output must be a Buffer');
    assertValidPng(buffer, 30000);
    assert.ok(buffer.length > 30000, `Buffer length (${buffer.length}) must be > 30,000 bytes`);
  });

  await t.test('Preserves existing renderWelcomeCard and renderBoostCard', async () => {
    const welcome = await renderWelcomeCard({
      member: { user: { username: 'newbie' } },
      guild: { name: 'Fasilkom UI' },
      inviterTag: 'Akame#0001',
      memberCount: 300,
    });
    assertValidPng(welcome, 30000);

    const boost = await renderBoostCard({
      member: { user: { username: 'booster_hero' } },
      guild: { name: 'Fasilkom UI' },
      totalBoosts: 8,
      boostTier: 2,
    });
    assertValidPng(boost, 30000);
  });
});

test('M3 Visual Guide Cache: In-memory TEMPLATE_CACHE and performance (< 1ms)', async (t) => {
  t.beforeEach(() => {
    clearGuideCardCache();
  });

  await t.test('getCachedGuideCard computes on miss and caches result', async () => {
    let callCount = 0;
    const testRenderer = async () => {
      callCount++;
      return renderLevelGuideCard();
    };

    const firstResult = await getCachedGuideCard('level-guide-test', testRenderer);
    assert.equal(callCount, 1, 'Renderer should be called on cache miss');
    assertValidPng(firstResult, 30000);
    assert.ok(TEMPLATE_CACHE.has('level-guide-test'), 'Key should exist in TEMPLATE_CACHE');

    const secondResult = await getCachedGuideCard('level-guide-test', testRenderer);
    assert.equal(callCount, 1, 'Renderer should NOT be called on cache hit');
    assert.equal(firstResult, secondResult, 'Cache should return identical Buffer reference');
  });

  await t.test('getCachedGuideCard cache hit executes in under 1ms (< 1ms)', async () => {
    // Warm up the cache
    await getCachedGuideCard('perf-key-help', renderHelpGuideCard);
    assert.ok(TEMPLATE_CACHE.has('perf-key-help'));

    // Benchmark cache hit latency over 10 iterations
    const iterations = 10;
    const timings = [];
    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now();
      const cached = await getCachedGuideCard('perf-key-help', renderHelpGuideCard);
      const t1 = performance.now();
      const elapsedMs = t1 - t0;
      timings.push(elapsedMs);
      assert.ok(Buffer.isBuffer(cached));
    }

    const avgElapsed = timings.reduce((a, b) => a + b, 0) / iterations;
    const maxElapsed = Math.max(...timings);

    assert.ok(
      avgElapsed < 1.0,
      `Average cache hit time (${avgElapsed.toFixed(4)}ms) must be < 1.0ms`
    );
    assert.ok(
      maxElapsed < 10.0,
      `Max cache hit time (${maxElapsed.toFixed(4)}ms) must be < 10.0ms`
    );
  });

  await t.test('clearGuideCardCache invalidates specific key or entire cache', async () => {
    await getCachedGuideCard('key-1', renderConfessionGuideCard);
    await getCachedGuideCard('key-2', renderRulesGuideCard);
    assert.equal(TEMPLATE_CACHE.size, 2);

    // Invalidate specific key
    clearGuideCardCache('key-1');
    assert.equal(TEMPLATE_CACHE.has('key-1'), false);
    assert.equal(TEMPLATE_CACHE.has('key-2'), true);
    assert.equal(TEMPLATE_CACHE.size, 1);

    // Invalidate all
    clearGuideCardCache();
    assert.equal(TEMPLATE_CACHE.size, 0);
  });
});

test('M3 Resilient Offline Avatar Fallback & Adversarial Handling', async (t) => {
  await t.test('renderRankCard renders cleanly when member is null or undefined', async () => {
    const buffer = await renderRankCard({
      member: null,
      level: 1,
      xp: 0,
      xpNeeded: 500,
    });
    assertValidPng(buffer, 30000);
  });

  await t.test('renderRankCard renders cleanly when member has no avatar URL or empty object', async () => {
    const buffer = await renderRankCard({
      member: {
        user: { username: 'no_avatar_user' },
      },
      level: 7,
      xp: 300,
      xpNeeded: 800,
    });
    assertValidPng(buffer, 30000);
  });

  await t.test('renderRankCard recovers gracefully when avatar URL fails to fetch', async () => {
    const buffer = await renderRankCard({
      member: {
        user: {
          username: 'offline_user',
          displayAvatarURL: () => 'http://127.0.0.1:59999/unreachable_avatar.png',
        },
      },
      level: 4,
      xp: 150,
      xpNeeded: 600,
    });
    assertValidPng(buffer, 30000);
  });

  await t.test('drawAvatarFallback executes without error across various inputs', () => {
    const canvas = createCanvas(120, 120);
    const ctx = canvas.getContext('2d');

    // Standard name
    assert.doesNotThrow(() => {
      drawAvatarFallback(ctx, 60, 60, 40, 'Budi');
    });

    // Empty string
    assert.doesNotThrow(() => {
      drawAvatarFallback(ctx, 60, 60, 40, '');
    });

    // Null and undefined
    assert.doesNotThrow(() => {
      drawAvatarFallback(ctx, 60, 60, 40, null);
    });
    assert.doesNotThrow(() => {
      drawAvatarFallback(ctx, 60, 60, 40, undefined);
    });
  });

  await t.test('renderRankCard handles adversarial XP and level boundary values', async () => {
    // 0 XP and 0 totalXp
    const zeroXpBuf = await renderRankCard({
      member: { user: { username: 'zeroxp' } },
      level: 0,
      xp: 0,
      xpNeeded: 1000,
      totalXp: 0,
      rankPosition: 999,
    });
    assertValidPng(zeroXpBuf, 30000);

    // Negative XP clamped
    const negXpBuf = await renderRankCard({
      member: { user: { username: 'negxp' } },
      level: -5,
      xp: -100,
      xpNeeded: 0,
      totalXp: -500,
      rankPosition: 0,
    });
    assertValidPng(negXpBuf, 30000);

    // Extreme high values
    const highXpBuf = await renderRankCard({
      member: { user: { username: 'highxp', globalName: 'Very Long Display Name Exceeding Normal Length Bounds' } },
      level: 999,
      xp: 5000000,
      xpNeeded: 5000000,
      totalXp: 999999999,
      rankPosition: 1,
    });
    assertValidPng(highXpBuf, 30000);
  });

  await t.test('Card generators execute safely with no arguments or empty options', async () => {
    assertValidPng(await renderWelcomeGuideCard(), 30000);
    assertValidPng(await renderHelpGuideCard(), 30000);
    assertValidPng(await renderRankCard(), 30000);
    assertValidPng(await renderLevelGuideCard(), 30000);
    assertValidPng(await renderConfessionGuideCard(), 30000);
    assertValidPng(await renderRulesGuideCard(), 30000);
    assertValidPng(await renderVoiceGuideCard(), 30000);
  });
});

