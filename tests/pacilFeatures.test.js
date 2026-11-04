import test from 'node:test';
import assert from 'node:assert/strict';
import { getMusicBotsStatus } from '../src/ui/panels/musicSubPanel.js';
import { createPrivateCircle } from '../src/services/circleService.js';

const bot = (id, username, vc) => ({ id, user: { bot: true, username }, voice: { channel: vc ?? null } });

test('music status: ID eksplisit menang atas tebakan nama; in_use bila di voice', () => {
  const members = new Map([['1', bot('1', 'Jockie Music', { name: 'VC 1' })], ['2', bot('2', 'RandomBot')], ['3', bot('3', 'Lofi')]]);
  const guild = { client: { user: { id: '99' } }, members: { cache: Object.assign(members, { filter(fn) { return new Map([...members].filter(([, v]) => fn(v))); } }) } };
  const byName = getMusicBotsStatus(guild);
  assert.deepEqual(byName.map((b) => b.id).sort(), ['1', '3']);
  assert.equal(byName.find((b) => b.id === '1').status, 'in_use');
  assert.equal(byName.find((b) => b.id === '3').status, 'available');
  assert.deepEqual(getMusicBotsStatus(guild, ['2']).map((b) => b.id), ['2']);
});

test('createPrivateCircle rollback: resource dihapus bila gagal di tengah', async () => {
  const deleted = [];
  const mk = (n) => ({ id: n, delete: async () => { deleted.push(n); } });
  let channelCalls = 0;
  const guild = {
    id: 'g', channels: { cache: new Map(), create: async () => { if (++channelCalls === 2) throw new Error('boom'); return mk('cat'); } },
    roles: { cache: new Map(), everyone: { id: 'e' }, create: async () => mk('role') }, members: { me: { id: 'me' } },
  };
  const member = { id: 'u', user: { tag: 'u#1' }, roles: { add: async () => {} } };
  const client = { db: { get: async (k, d) => d, set: async () => {}, delete: async () => {} } };
  await assert.rejects(() => createPrivateCircle(client, guild, member, 'Alpro'), /boom/);
  assert.deepEqual(deleted, ['cat', 'role']);
});

import { parseRoleColors, applyRoleColors } from '../src/services/boosterService.js';

test('parseRoleColors: solid, gradien, dan input tidak valid', () => {
  assert.deepEqual(parseRoleColors('#F2A900'), { ok: true, primary: 0xf2a900, secondary: null });
  assert.deepEqual(parseRoleColors('#0d3a73, #f2a900'), { ok: true, primary: 0x0d3a73, secondary: 0xf2a900 });
  assert.equal(parseRoleColors('GOLD').ok, false);
  assert.equal(parseRoleColors('#111111 #222222 #333333').ok, false);
});

test('applyRoleColors: gradien ditolak Discord -> jatuh ke solid', async () => {
  const calls = [];
  const role = { setColors: async (c) => { calls.push(c); if (c.secondaryColor) throw new Error('no'); } };
  const r = await applyRoleColors(role, { primary: 1, secondary: 2 });
  assert.deepEqual(r, { gradient: false, fallback: true });
  assert.equal(calls.length, 2);
});
