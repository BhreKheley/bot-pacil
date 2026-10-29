import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROOM_LIMITS, RTC_REGIONS, regionLabel, normalizeRoomRecord, parseUserLimit, parseBitrateKbps,
  sanitizeRoomName, sanitizeRoomStatus, isRoomManager, addToList, removeFromList,
  userActionDecision, claimDecision, formatLimit,
} from '../src/services/voiceRoomLogic.js';

const rec = { ownerId: 'owner', triggerChannelId: 't' };

test('normalizeRoomRecord melengkapi rekaman lama tanpa menimpa nilai', () => {
  const n = normalizeRoomRecord(rec);
  assert.deepEqual([n.allowed, n.blocked, n.viewGrants, n.locked, n.hidden, n.panelMessageId], [[], [], [], false, false, null]);
  assert.equal(n.ownerId, 'owner');
  const m = normalizeRoomRecord({ ...rec, locked: true, allowed: ['a'], blocked: 'bukan-array' });
  assert.equal(m.locked, true);
  assert.deepEqual(m.allowed, ['a']);
  assert.deepEqual(m.blocked, []);
});

test('parseUserLimit', () => {
  assert.deepEqual(parseUserLimit('0'), { ok: true, value: 0 });
  assert.deepEqual(parseUserLimit(' 25 '), { ok: true, value: 25 });
  for (const bad of ['', 'abc', '-1', '100', '1.5', '999']) assert.equal(parseUserLimit(bad).ok, false, bad);
});

test('parseBitrateKbps menghormati batas server', () => {
  assert.deepEqual(parseBitrateKbps('64'), { ok: true, value: 64000, kbps: 64 });
  assert.equal(parseBitrateKbps('7').ok, false);
  assert.equal(parseBitrateKbps('abc').error, 'bitrateInvalid');
  const tooHigh = parseBitrateKbps('128', 96000);
  assert.equal(tooHigh.ok, false);
  assert.equal(tooHigh.error, 'bitrateTooHigh');
  assert.equal(tooHigh.maxKbps, 96);
  assert.equal(parseBitrateKbps('384', 384000).ok, true);
  assert.equal(parseBitrateKbps('385', 999999999).error, 'bitrateTooHigh');
});

test('sanitizeRoomName / sanitizeRoomStatus', () => {
  assert.equal(sanitizeRoomName('  Ruang\n\tBelajar   PBP  '), 'Ruang Belajar PBP');
  assert.equal(sanitizeRoomName('   \n '), null);
  assert.equal(sanitizeRoomName('x'.repeat(300)).length, ROOM_LIMITS.nameLength);
  assert.equal(sanitizeRoomStatus('  Belajar\nDDP  '), 'Belajar DDP');
  assert.equal(sanitizeRoomStatus(''), '');
  assert.equal(sanitizeRoomStatus('y'.repeat(900)).length, ROOM_LIMITS.statusLength);
});

test('isRoomManager', () => {
  assert.equal(isRoomManager(rec, 'owner'), true);
  assert.equal(isRoomManager(rec, 'lain'), false);
  assert.equal(isRoomManager(rec, 'lain', true), true);
  assert.equal(isRoomManager(null, 'owner', true), false);
});

test('daftar izin/blokir: tambah, batas, hapus, tanpa mutasi', () => {
  const base = ['a'];
  assert.deepEqual(addToList(base, 'b'), { ok: true, list: ['a', 'b'] });
  assert.deepEqual(addToList(base, 'a'), { ok: true, list: ['a'] });
  assert.deepEqual(base, ['a']);
  const full = Array.from({ length: ROOM_LIMITS.listCap }, (_, i) => `u${i}`);
  assert.equal(addToList(full, 'baru').error, 'listFull');
  assert.deepEqual(removeFromList(['a', 'b'], 'a'), ['b']);
});

test('userActionDecision', () => {
  const t = { id: 'u1', bot: false };
  assert.deepEqual(userActionDecision('allow', { record: rec, actorId: 'owner', target: t }), { ok: true });
  assert.equal(userActionDecision('allow', { record: rec, actorId: 'owner', target: { id: 'b', bot: true } }).reason, 'targetIsBot');
  assert.equal(userActionDecision('block', { record: rec, actorId: 'owner', target: { id: 'owner', bot: false } }).reason, 'targetIsSelf');
  assert.equal(userActionDecision('kick', { record: rec, actorId: 'staff', target: { id: 'owner', bot: false }, targetInRoom: true }).reason, 'targetIsOwner');
  assert.equal(userActionDecision('kick', { record: rec, actorId: 'owner', target: t, targetInRoom: false }).reason, 'targetNotInRoom');
  assert.equal(userActionDecision('transfer', { record: rec, actorId: 'owner', target: t, targetInRoom: false }).reason, 'targetNotInRoom');
  assert.equal(userActionDecision('transfer', { record: rec, actorId: 'owner', target: t, targetInRoom: true }).ok, true);
  assert.equal(userActionDecision('reset', { record: rec, actorId: 'owner', target: { id: 'owner', bot: false } }).ok, true);
  assert.equal(userActionDecision('allow', { record: rec, actorId: 'owner', target: null }).reason, 'noTarget');
});

test('claimDecision', () => {
  assert.equal(claimDecision({ record: rec, claimerId: 'x', claimerInRoom: false, ownerInRoom: false }).reason, 'claimerNotInRoom');
  assert.equal(claimDecision({ record: rec, claimerId: 'owner', claimerInRoom: true, ownerInRoom: true }).reason, 'alreadyOwner');
  assert.equal(claimDecision({ record: rec, claimerId: 'x', claimerInRoom: true, ownerInRoom: true }).reason, 'ownerPresent');
  assert.deepEqual(claimDecision({ record: rec, claimerId: 'x', claimerInRoom: true, ownerInRoom: false }), { ok: true });
});

test('region dan formatLimit', () => {
  assert.equal(regionLabel(null), 'Otomatis');
  assert.equal(regionLabel('singapore'), 'Singapura');
  assert.ok(RTC_REGIONS.length <= 25);
  assert.equal(formatLimit(0), 'Tanpa batas');
  assert.equal(formatLimit(5), '5 orang');
});
