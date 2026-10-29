import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStickyColor, validateSticky, createStickyScheduler, stickyCacheKey, STICKY_LIMITS } from '../src/services/stickyLogic.js';

test('parseStickyColor', () => {
  assert.deepEqual(parseStickyColor(''), { ok: true, value: null });
  assert.deepEqual(parseStickyColor('#ffd700'), { ok: true, value: '#FFD700' });
  assert.deepEqual(parseStickyColor('003b73'), { ok: true, value: '#003B73' });
  assert.equal(parseStickyColor('merah').ok, false);
  assert.equal(parseStickyColor('#12345').ok, false);
});

test('validateSticky', () => {
  assert.equal(validateSticky({ content: '   ' }).error, 'emptyContent');
  assert.equal(validateSticky({ content: 'x'.repeat(STICKY_LIMITS.content + 1) }).error, 'contentTooLong');
  assert.equal(validateSticky({ title: 't'.repeat(STICKY_LIMITS.title + 1), content: 'ok' }).error, 'titleTooLong');
  assert.equal(validateSticky({ content: 'ok', color: 'zzz' }).error, 'invalidColor');
  const ok = validateSticky({ title: ' Aturan ', content: ' Jaga sopan ', color: '#fff000' });
  assert.deepEqual(ok, { ok: true, value: { title: 'Aturan', content: 'Jaga sopan', color: '#FFF000' } });
});

test('scheduler: satu repost per jendela, tidak menjadwal ulang', async () => {
  const timers = [];
  const s = createStickyScheduler({
    delayMs: 100,
    setTimer: (fn, ms) => { const t = { fn, ms }; timers.push(t); return t; },
    clearTimer: (t) => { t.cleared = true; },
  });
  let runs = 0;
  assert.equal(s.schedule('k', () => { runs++; }), true);
  assert.equal(s.schedule('k', () => { runs++; }), false);
  assert.equal(s.schedule('k', () => { runs++; }), false);
  assert.equal(timers.length, 1);
  assert.equal(timers[0].ms, 100);
  assert.equal(s.size, 1);
  await timers[0].fn();
  assert.equal(runs, 1);
  assert.equal(s.size, 0);
  assert.equal(s.schedule('k', () => { runs++; }), true);
});

test('scheduler: kunci berbeda independen, cancel bekerja, error tidak bocor', async () => {
  const timers = [];
  const s = createStickyScheduler({ setTimer: (fn) => { const t = { fn }; timers.push(t); return t; }, clearTimer: (t) => { t.cleared = true; } });
  assert.equal(s.schedule('a', () => {}), true);
  assert.equal(s.schedule('b', () => {}), true);
  assert.equal(s.cancel('a'), true);
  assert.equal(timers[0].cleared, true);
  assert.equal(s.cancel('a'), false);
  s.schedule('c', () => { throw new Error('boom'); });
  await assert.doesNotReject(() => timers[2].fn());
  assert.equal(s.has('c'), false);
});

test('stickyCacheKey', () => assert.equal(stickyCacheKey('g', 'c'), 'g:c'));
