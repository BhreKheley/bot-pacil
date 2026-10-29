import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeReplyContent, participantHash, resolveReplyLabel, replyCooldownRemainingMs,
  canReplyTo, shortId, clampReplyCooldown, MAX_REPLY_LENGTH, ORIGINAL_POSTER_LABEL,
} from '../src/services/confessionLogic.js';

const base = { id: 'abc123def456', guildId: 'g1', authorId: 'author', status: 'published', publishedMessageId: 'm1' };

test('normalizeReplyContent merapikan dan memotong', () => {
  assert.equal(normalizeReplyContent('  halo\r\n\r\n\r\n\r\ndunia  '), 'halo\n\ndunia');
  assert.equal(normalizeReplyContent(null), '');
  assert.equal(normalizeReplyContent('x'.repeat(MAX_REPLY_LENGTH + 50)).length, MAX_REPLY_LENGTH);
});

test('label anonim stabil per pengguna dan berurutan', () => {
  let c = { ...base };
  const a1 = resolveReplyLabel(c, 'u1');
  assert.equal(a1.label, 'Anonim 1');
  c = { ...c, participants: a1.participants };
  const b = resolveReplyLabel(c, 'u2');
  assert.equal(b.label, 'Anonim 2');
  c = { ...c, participants: b.participants };
  const a2 = resolveReplyLabel(c, 'u1');
  assert.equal(a2.label, 'Anonim 1');
  assert.equal(a2.isNew, false);
});

test('pengirim asli berlabel khusus dan tidak menambah peserta', () => {
  const r = resolveReplyLabel(base, 'author');
  assert.equal(r.label, ORIGINAL_POSTER_LABEL);
  assert.deepEqual(r.participants, {});
});

test('participants tidak menyimpan user id mentah', () => {
  const r = resolveReplyLabel(base, 'user-rahasia-123');
  assert.ok(!JSON.stringify(r.participants).includes('user-rahasia-123'));
  assert.equal(Object.keys(r.participants)[0], participantHash('g1', base.id, 'user-rahasia-123'));
});

test('hash berbeda antar menfess untuk pengguna yang sama', () => {
  assert.notEqual(participantHash('g1', 'a', 'u'), participantHash('g1', 'b', 'u'));
});

test('resolveReplyLabel tidak memutasi input', () => {
  const c = { ...base, participants: { x: 1 } };
  resolveReplyLabel(c, 'u9');
  assert.deepEqual(c.participants, { x: 1 });
});

test('cooldown balasan', () => {
  assert.equal(replyCooldownRemainingMs(1000, 30, 1000 + 10_000), 20_000);
  assert.equal(replyCooldownRemainingMs(1000, 30, 1000 + 31_000), 0);
  assert.equal(replyCooldownRemainingMs(0, 0, 5), 0);
  assert.equal(replyCooldownRemainingMs(undefined, 'abc', 5), 0);
});

test('canReplyTo menolak kondisi tidak valid', () => {
  const cfg = { enabled: true, repliesEnabled: true };
  assert.deepEqual(canReplyTo(base, cfg), { ok: true });
  assert.equal(canReplyTo(base, { ...cfg, enabled: false }).reason, 'disabled');
  assert.equal(canReplyTo(base, { ...cfg, repliesEnabled: false }).reason, 'repliesDisabled');
  assert.equal(canReplyTo({ ...base, status: 'pending' }, cfg).reason, 'notAvailable');
  assert.equal(canReplyTo({ ...base, publishedMessageId: undefined }, cfg).reason, 'notAvailable');
  assert.equal(canReplyTo(null, cfg).reason, 'notAvailable');
});

test('shortId dan clampReplyCooldown', () => {
  assert.equal(shortId('abcdef123456'), '123456');
  assert.equal(clampReplyCooldown(-5), 0);
  assert.equal(clampReplyCooldown(99999), 3600);
  assert.equal(clampReplyCooldown('x', 30), 30);
  assert.equal(clampReplyCooldown(12.6), 13);
});
