import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPolicyPatch, clearPolicy, cooldownExpiry, cooldownRemainingMs, evaluateAccess, findPolicy,
  formatCooldown, isPolicyEmpty, normalizePolicy, parseCooldownInput, policyKeyCandidates,
} from '../src/services/commandPolicyLogic.js';

test('normalizePolicy membersihkan duplikat, batas, dan cooldown', () => {
  const p = normalizePolicy({ allowedRoles: ['1', '1', 2, ''], allowedChannels: null, cooldownSeconds: -5 });
  assert.deepEqual(p, { allowedRoles: ['1', '2'], allowedChannels: [], cooldownSeconds: 0 });
  assert.equal(normalizePolicy({ cooldownSeconds: 999999 }).cooldownSeconds, 86400);
  assert.equal(normalizePolicy({ allowedRoles: Array.from({ length: 30 }, (_, i) => String(i)) }).allowedRoles.length, 10);
  assert.equal(normalizePolicy(undefined).cooldownSeconds, 0);
});

test('policyKeyCandidates dan findPolicy memilih yang paling spesifik', () => {
  assert.deepEqual(policyKeyCandidates('Confession  Send'), ['confession send', 'confession']);
  const policies = { confession: { allowedRoles: ['a'] }, 'confession send': { allowedRoles: ['b'] } };
  assert.equal(findPolicy(policies, 'confession send').key, 'confession send');
  assert.equal(findPolicy(policies, 'confession lookup').key, 'confession');
  assert.equal(findPolicy(policies, 'ping'), null);
  assert.equal(findPolicy({ ping: {} }, 'ping'), null);
  assert.equal(findPolicy(null, 'ping'), null);
});

test('evaluateAccess: role, channel, kategori, thread, dan bypass pengurus', () => {
  const policy = { allowedRoles: ['r1'], allowedChannels: ['c1'] };
  assert.equal(evaluateAccess(policy, { roleIds: ['r1'], channelId: 'c1' }).ok, true);
  assert.deepEqual(evaluateAccess(policy, { roleIds: ['r1'], channelId: 'c2' }), { ok: false, reason: 'channel' });
  assert.deepEqual(evaluateAccess(policy, { roleIds: ['r2'], channelId: 'c1' }), { ok: false, reason: 'role' });
  assert.equal(evaluateAccess(policy, { roleIds: ['r1'], channelId: 't9', parentId: 'c1' }).ok, true);
  assert.equal(evaluateAccess(policy, { roleIds: ['r1'], channelId: 'x', categoryId: 'c1' }).ok, true);
  assert.equal(evaluateAccess(policy, { roleIds: [], channelId: 'zzz', isManager: true }).ok, true);
  assert.equal(evaluateAccess({ allowedRoles: [], allowedChannels: [] }, { roleIds: [], channelId: 'a' }).ok, true);
  assert.equal(evaluateAccess(null, { channelId: 'a' }).ok, true);
  // roleIds boleh berupa iterable (mis. Collection keys)
  assert.equal(evaluateAccess({ allowedRoles: ['r1'] }, { roleIds: new Set(['r1']), channelId: 'a' }).ok, true);
});

test('cooldown helper', () => {
  assert.equal(cooldownRemainingMs(0, 1000), 0);
  assert.equal(cooldownRemainingMs(5000, 1000), 4000);
  assert.equal(cooldownRemainingMs(900, 1000), 0);
  assert.equal(cooldownExpiry(0, 1000), 0);
  assert.equal(cooldownExpiry(3, 1000), 4000);
});

test('applyPolicyPatch tidak memutasi dan menghapus kebijakan kosong', () => {
  const base = { ping: { allowedRoles: ['a'], allowedChannels: [], cooldownSeconds: 0 } };
  const frozen = JSON.stringify(base);
  const next = applyPolicyPatch(base, 'Ping', { cooldownSeconds: 30 });
  assert.equal(JSON.stringify(base), frozen);
  assert.equal(next.ping.cooldownSeconds, 30);
  const emptied = applyPolicyPatch(next, 'ping', { allowedRoles: [], cooldownSeconds: 0 });
  assert.equal('ping' in emptied, false);
  assert.equal(isPolicyEmpty(emptied.ping), true);
  assert.deepEqual(clearPolicy(next, 'PING'), {});
});

test('parseCooldownInput dan formatCooldown', () => {
  assert.equal(parseCooldownInput('90'), 90);
  assert.equal(parseCooldownInput('1m30s'), 90);
  assert.equal(parseCooldownInput('2h'), 7200);
  assert.equal(parseCooldownInput('0'), 0);
  assert.equal(parseCooldownInput(''), null);
  assert.equal(parseCooldownInput('abc'), null);
  assert.equal(parseCooldownInput('25h'), null);
  assert.equal(formatCooldown(0), 'Tanpa jeda khusus');
  assert.equal(formatCooldown(3690), '1 jam 1 menit 30 detik');
});
