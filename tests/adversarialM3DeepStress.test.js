import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
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

/**
 * Inspects a PNG buffer to verify exact signature, chunk sequence, IHDR dimensions, depth, and color type.
 */
function inspectPngIhdr(buffer, expectedWidth, expectedHeight) {
  assert.ok(Buffer.isBuffer(buffer), 'Output must be an instance of Buffer');
  assert.ok(buffer.length >= 33, `Buffer length (${buffer.length}) must be at least 33 bytes for PNG header + IHDR`);

  // 1. Exact 8-byte PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const expectedSig = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  for (let i = 0; i < 8; i++) {
    assert.strictEqual(
      buffer[i],
      expectedSig[i],
      `Byte at offset ${i} must be 0x${expectedSig[i].toString(16).toUpperCase()} but got 0x${buffer[i].toString(16).toUpperCase()}`
    );
  }

  // 2. IHDR Chunk Length at offset 8 (uint32BE): must be exactly 13 bytes
  const ihdrLength = buffer.readUInt32BE(8);
  assert.strictEqual(ihdrLength, 13, `IHDR chunk data length must be 13, got ${ihdrLength}`);

  // 3. IHDR Chunk Type at offset 12: ASCII "IHDR"
  const ihdrType = buffer.toString('ascii', 12, 16);
  assert.strictEqual(ihdrType, 'IHDR', `First chunk type must be "IHDR", got "${ihdrType}"`);

  // 4. Width at offset 16 (uint32BE)
  const width = buffer.readUInt32BE(16);
  assert.strictEqual(width, expectedWidth, `IHDR width must be ${expectedWidth}, got ${width}`);

  // 5. Height at offset 20 (uint32BE)
  const height = buffer.readUInt32BE(20);
  assert.strictEqual(height, expectedHeight, `IHDR height must be ${expectedHeight}, got ${height}`);

  // 6. Bit Depth at offset 24 (uint8): standard 8-bit depth
  const bitDepth = buffer.readUInt8(24);
  assert.ok([8, 16].includes(bitDepth), `IHDR bit depth must be 8 or 16, got ${bitDepth}`);

  // 7. Color Type at offset 25 (uint8): 6 (RGBA) or 2 (RGB)
  const colorType = buffer.readUInt8(25);
  assert.ok([2, 6].includes(colorType), `IHDR color type must be 2 (RGB) or 6 (RGBA), got ${colorType}`);

  // 8. Compression method at offset 26: 0 (deflate)
  const compressionMethod = buffer.readUInt8(26);
  assert.strictEqual(compressionMethod, 0, `IHDR compression method must be 0, got ${compressionMethod}`);

  // 9. Filter method at offset 27: 0 (adaptive)
  const filterMethod = buffer.readUInt8(27);
  assert.strictEqual(filterMethod, 0, `IHDR filter method must be 0, got ${filterMethod}`);

  // 10. Interlace method at offset 28: 0 (none) or 1 (Adam7)
  const interlaceMethod = buffer.readUInt8(28);
  assert.ok([0, 1].includes(interlaceMethod), `IHDR interlace method must be 0 or 1, got ${interlaceMethod}`);

  return { length: buffer.length, width, height, bitDepth, colorType };
}

test('Adversarial M3 Suite 1: PNG Buffer Integrity & IHDR Validation Across All 7 Cards', async (t) => {
  const cardSpecs = [
    { name: 'renderWelcomeGuideCard', fn: () => renderWelcomeGuideCard(), width: 800, height: 360 },
    { name: 'renderHelpGuideCard', fn: () => renderHelpGuideCard(), width: 800, height: 320 },
    { name: 'renderRankCard', fn: () => renderRankCard(), width: 800, height: 260 },
    { name: 'renderLevelGuideCard', fn: () => renderLevelGuideCard(), width: 800, height: 300 },
    { name: 'renderConfessionGuideCard', fn: () => renderConfessionGuideCard(), width: 800, height: 320 },
    { name: 'renderRulesGuideCard', fn: () => renderRulesGuideCard(), width: 800, height: 340 },
    { name: 'renderVoiceGuideCard', fn: () => renderVoiceGuideCard(), width: 800, height: 280 },
  ];

  for (const spec of cardSpecs) {
    await t.test(`${spec.name}: signature, IHDR (w=${spec.width}, h=${spec.height}), and size > 30KB`, async () => {
      const buffer = await spec.fn();
      const info = inspectPngIhdr(buffer, spec.width, spec.height);

      assert.ok(
        info.length > 30000,
        `${spec.name} buffer size (${info.length} bytes) must strictly exceed 30,000 bytes`
      );
      assert.strictEqual(info.width, spec.width);
      assert.strictEqual(info.height, spec.height);
      assert.strictEqual(info.bitDepth, 8);
      assert.strictEqual(info.colorType, 6); // RGBA canvas export
    });
  }

  await t.test('Legacy cards renderWelcomeCard and renderBoostCard: signature, IHDR, and size > 30KB', async () => {
    const welcome = await renderWelcomeCard({
      member: { user: { username: 'maba_test' } },
      guild: { name: 'Fasilkom' },
    });
    const welcomeInfo = inspectPngIhdr(welcome, 800, 340);
    assert.ok(welcomeInfo.length > 30000);

    const boost = await renderBoostCard({
      member: { user: { username: 'booster_test' } },
      guild: { name: 'Fasilkom' },
    });
    const boostInfo = inspectPngIhdr(boost, 800, 340);
    assert.ok(boostInfo.length > 30000);
  });
});

test('Adversarial M3 Suite 2: Avatar Offline Fallback Robustness under CDN Failures, Timeouts & Malformed Responses', async (t) => {
  let server;
  let serverPort;

  // Spin up an ephemeral HTTP server to simulate various CDN failure scenarios
  t.before(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/500') {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('CDN Internal Error');
      } else if (req.url === '/404') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Avatar Not Found');
      } else if (req.url === '/html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<!DOCTYPE html><html><body>Error 403 Forbidden Cloudflare CDN</body></html>');
      } else if (req.url === '/corrupt') {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        // Return 64 bytes of corrupt non-PNG garbage
        const garbage = Buffer.from('DEADBEEFCAFEBABEDEADBEEFCAFEBABEDEADBEEFCAFEBABEDEADBEEFCAFEBABE', 'hex');
        res.end(garbage);
      } else if (req.url === '/reset') {
        // Abruptly destroy the TCP connection
        req.socket.destroy();
      } else {
        res.writeHead(400);
        res.end();
      }
    });

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        serverPort = server.address().port;
        server.unref();
        resolve();
      });
    });
  });

  t.after(async () => {
    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
      server.unref();
    }
  });

  await t.test('HTTP 500 CDN error falls back cleanly without crash', async () => {
    const buffer = await renderRankCard({
      member: {
        user: {
          username: 'cdn_500_user',
          displayAvatarURL: () => `http://127.0.0.1:${serverPort}/500`,
        },
      },
      level: 10,
      xp: 400,
      xpNeeded: 1000,
    });
    inspectPngIhdr(buffer, 800, 260);
    assert.ok(buffer.length > 30000);
  });

  await t.test('HTTP 404 CDN error falls back cleanly without crash', async () => {
    const buffer = await renderRankCard({
      member: {
        user: {
          username: 'cdn_404_user',
          displayAvatarURL: () => `http://127.0.0.1:${serverPort}/404`,
        },
      },
    });
    inspectPngIhdr(buffer, 800, 260);
    assert.ok(buffer.length > 30000);
  });

  await t.test('HTTP 200 non-image HTML payload falls back to initials cleanly', async () => {
    const buffer = await renderRankCard({
      member: {
        user: {
          username: 'html_cdn_user',
          displayAvatarURL: () => `http://127.0.0.1:${serverPort}/html`,
        },
      },
    });
    inspectPngIhdr(buffer, 800, 260);
    assert.ok(buffer.length > 30000);
  });

  await t.test('HTTP 200 corrupted image bytes falls back to initials cleanly', async () => {
    const buffer = await renderRankCard({
      member: {
        user: {
          username: 'corrupt_cdn_user',
          displayAvatarURL: () => `http://127.0.0.1:${serverPort}/corrupt`,
        },
      },
    });
    inspectPngIhdr(buffer, 800, 260);
    assert.ok(buffer.length > 30000);
  });

  await t.test('Abrupt TCP socket destroy falls back cleanly without crash', async () => {
    const buffer = await renderRankCard({
      member: {
        user: {
          username: 'reset_user',
          displayAvatarURL: () => `http://127.0.0.1:${serverPort}/reset`,
        },
      },
    });
    inspectPngIhdr(buffer, 800, 260);
    assert.ok(buffer.length > 30000);
  });

  await t.test('Non-HTTP and malformed URLs fall back immediately without throwing', async () => {
    const malformedUrls = [
      'ftp://example.com/avatar.png',
      'file:///etc/passwd',
      'data:image/png;base64,invalid',
      'javascript:void(0)',
      '',
      'not-a-url',
      'http://[::1]:namedport',
    ];

    for (const badUrl of malformedUrls) {
      const buffer = await renderRankCard({
        member: {
          user: {
            username: 'bad_url_user',
            displayAvatarURL: () => badUrl,
          },
        },
      });
      inspectPngIhdr(buffer, 800, 260);
      assert.ok(buffer.length > 30000);
    }
  });

  await t.test('Null, undefined, non-object, and missing member in options gracefully handled', async () => {
    const payloads = [
      undefined,
      {},
      { member: null },
      { member: undefined },
      { member: {} },
      { member: { user: null } },
      { member: { user: undefined } },
      { member: { user: {} } },
      { member: { user: { username: '' } } },
      { member: { user: { username: null } } },
      { member: { user: { username: 12345 } } },
    ];

    for (const payload of payloads) {
      const buffer = await renderRankCard(payload);
      inspectPngIhdr(buffer, 800, 260);
      assert.ok(buffer.length > 30000);
    }
  });

  await t.test('Root null argument behavior: ES6 destructuring throws TypeError', async () => {
    // In JavaScript ES6: ({ member } = {}) throws TypeError when passed null instead of undefined/object
    await assert.rejects(
      async () => await renderRankCard(null),
      { name: 'TypeError' }
    );
  });

  await t.test('drawAvatarFallback handles wide variety of initials and unicode characters', () => {
    const canvas = createCanvas(120, 120);
    const ctx = canvas.getContext('2d');

    const testNames = [
      'akame',
      'budi',
      'Charlie',
      '12345',
      '!@#$%',
      '🌟 Star',
      '山田太郎',
      '   leading spaces',
      '',
      null,
      undefined,
      false,
      true,
      0,
      {},
      [],
    ];

    for (const name of testNames) {
      assert.doesNotThrow(
        () => drawAvatarFallback(ctx, 60, 60, 40, name),
        `drawAvatarFallback should not throw for input: ${String(name)}`
      );
    }
  });
});

test('Adversarial M3 Suite 3: Performance Benchmark & Cache Throughput', async (t) => {
  t.beforeEach(() => {
    clearGuideCardCache();
  });

  await t.test('Uncached render vs cached retrieval latency ratio under consecutive iterations', async () => {
    // 1. Measure uncached render latency
    const tUncached0 = performance.now();
    const uncachedBuffer = await renderHelpGuideCard();
    const tUncached1 = performance.now();
    const uncachedLatencyMs = tUncached1 - tUncached0;

    assert.ok(Buffer.isBuffer(uncachedBuffer));
    assert.ok(uncachedLatencyMs > 0, 'Uncached render must take non-zero time');

    // 2. Warm cache
    const cacheKey = 'benchmark-help-card';
    const firstCached = await getCachedGuideCard(cacheKey, renderHelpGuideCard);
    assert.ok(TEMPLATE_CACHE.has(cacheKey));
    assert.ok(Buffer.isBuffer(firstCached));

    // 3. Measure 50 consecutive cached retrievals
    const iterations = 50;
    const cachedTimings = [];

    // Warm up JIT execution loop first
    for (let w = 0; w < 5; w++) {
      await getCachedGuideCard(cacheKey, renderHelpGuideCard);
    }

    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now();
      const cachedBuffer = await getCachedGuideCard(cacheKey, renderHelpGuideCard);
      const t1 = performance.now();
      cachedTimings.push(t1 - t0);
      assert.strictEqual(cachedBuffer, firstCached, 'Cached buffer must equal the warmed cached buffer reference');
    }

    const avgCachedMs = cachedTimings.reduce((a, b) => a + b, 0) / iterations;
    const minCachedMs = Math.min(...cachedTimings);

    // Assert that average cached retrieval is < 1.0ms (well under the 1.0ms SLA, typically < 0.2ms)
    assert.ok(
      avgCachedMs < 1.0,
      `Average cached retrieval latency (${avgCachedMs.toFixed(4)}ms) must be < 1.0ms`
    );

    // Speedup factor
    const speedup = uncachedLatencyMs / avgCachedMs;
    assert.ok(
      speedup > 2,
      `Cached retrieval should be faster than uncached render (speedup: ${speedup.toFixed(1)}x)`
    );
  });

  await t.test('Concurrent cache access under Promise.all preserves reference identity', async () => {
    const key = 'concurrent-key';
    let renderCount = 0;
    const renderer = async () => {
      renderCount++;
      return renderLevelGuideCard();
    };

    // First call to seed
    const initial = await getCachedGuideCard(key, renderer);
    assert.strictEqual(renderCount, 1);

    // 20 concurrent cached requests
    const promises = Array.from({ length: 20 }, () => getCachedGuideCard(key, renderer));
    const results = await Promise.all(promises);

    // Zero additional renders
    assert.strictEqual(renderCount, 1);
    for (const res of results) {
      assert.strictEqual(res, initial, 'All concurrent calls must receive the identical Buffer reference');
    }
  });

  await t.test('Cache invalidation isolation: clearGuideCardCache key vs all', async () => {
    await getCachedGuideCard('key-a', renderRulesGuideCard);
    await getCachedGuideCard('key-b', renderVoiceGuideCard);
    await getCachedGuideCard('key-c', renderConfessionGuideCard);
    assert.strictEqual(TEMPLATE_CACHE.size, 3);

    clearGuideCardCache('key-b');
    assert.strictEqual(TEMPLATE_CACHE.size, 2);
    assert.strictEqual(TEMPLATE_CACHE.has('key-a'), true);
    assert.strictEqual(TEMPLATE_CACHE.has('key-b'), false);
    assert.strictEqual(TEMPLATE_CACHE.has('key-c'), true);

    clearGuideCardCache();
    assert.strictEqual(TEMPLATE_CACHE.size, 0);
  });
});

test('Adversarial M3 Suite 4: Adversarial Typography, Ellipsis & Boundary Inputs', async (t) => {
  await t.test('renderWelcomeGuideCard with 0, 1, or extreme number of steps', async () => {
    // 0 steps
    const emptySteps = await renderWelcomeGuideCard({ guideSteps: [] });
    inspectPngIhdr(emptySteps, 800, 360);

    // Extreme text lengths in steps
    const extremeSteps = await renderWelcomeGuideCard({
      guildName: 'FASILKOM UI '.repeat(20),
      guideSteps: [
        {
          num: '999',
          title: 'Very Long Step Title Exceeding Normal Canvas Boundary Width Substantially',
          desc: 'This is an exceedingly long description intended to test text wrapping and truncation boundaries in drawWrappedText without overflowing or crashing the Skia renderer.'.repeat(3),
        },
        {
          num: 'XYZ',
          title: 'Special Chars: <script>alert(1)</script> & " \' / \\',
          desc: 'Testing HTML entity injection and quotation marks in canvas text.'.repeat(2),
        },
      ],
    });
    inspectPngIhdr(extremeSteps, 800, 360);
  });

  await t.test('renderVoiceGuideCard with extreme channel names and owner names', async () => {
    const extremeVoice = await renderVoiceGuideCard({
      channelName: 'Super Extremely Long Voice Channel Name That Exceeds Normal Length Bounds By A Lot'.repeat(2),
      ownerName: 'Super Extremely Long Owner Name With Special Unicode: 🚀 🎧 🔥 💻'.repeat(2),
    });
    inspectPngIhdr(extremeVoice, 800, 280);
  });

  await t.test('renderRulesGuideCard with undefined, null, or extreme guildName', async () => {
    const bufNull = await renderRulesGuideCard({ guildName: null });
    inspectPngIhdr(bufNull, 800, 340);

    const bufLong = await renderRulesGuideCard({ guildName: 'Universitas Indonesia Fakultas Ilmu Komputer '.repeat(5) });
    inspectPngIhdr(bufLong, 800, 340);
  });

  await t.test('renderRankCard with extreme XP, level, rank, and division numbers', async () => {
    const extremeRank = await renderRankCard({
      member: {
        user: {
          username: 'extreme_user',
          globalName: 'Extreme User 🚀',
        },
      },
      level: 999999,
      xp: 9999999999,
      xpNeeded: 9999999999,
      totalXp: 99999999999,
      rankPosition: 999999,
    });
    inspectPngIhdr(extremeRank, 800, 260);
  });
});
