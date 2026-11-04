import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWelcomeEmbed, buildGoodbyeEmbed, summarizeWelcome, welcomeProblems } from '../src/services/welcomeService.js';

const member = {
  user: { id: '7', username: 'budi', tag: 'budi#0', toString: () => '<@7>', displayAvatarURL: () => 'https://cdn/a.png' },
  guild: { id: 'g', name: 'Pacil Baik', memberCount: 321 },
};
const json = (e) => e.toJSON();
const fieldMap = (e) => Object.fromEntries((json(e).fields ?? json(e).Fields ?? []).map((f) => [f.name, f.value]));

test('sambutan memakai template tersimpan, nomor member, pengundang, dan channel panduan', () => {
  const e = buildWelcomeEmbed({ member, inviterId: '99', config: { welcomeMessage: 'Hai {user} di {server}', guideChannelId: '555' } });
  const j = json(e);
  assert.equal(j.description ?? j.Description, 'Hai <@7> di Pacil Baik');
  const f = fieldMap(e);
  assert.equal(f['📍 Member Ke-'], '#321');
  assert.equal(f['🔗 Diundang oleh'], '<@99>');
  assert.match(f['📚 Langkah Pertama'], /<#555>/);
});

test('sambutan tanpa pengaturan: default Indonesia, tanpa langkah pertama', () => {
  const e = buildWelcomeEmbed({ member, config: {} });
  assert.match(json(e).description ?? json(e).Description, /selamat datang di \*\*Pacil Baik\*\*/);
  assert.equal(fieldMap(e)['📚 Langkah Pertama'], undefined);
  assert.match(fieldMap(e)['🔗 Diundang oleh'], /Tidak terdeteksi/);
});

test('perpisahan memakai leaveMessage; ringkasan & masalah konfigurasi', () => {
  const g = buildGoodbyeEmbed({ member, config: { leaveMessage: 'Dadah {user.username}' } });
  assert.equal(json(g).description ?? json(g).Description, 'Dadah budi');
  const s = summarizeWelcome({ enabled: true, channelId: '1', roleIds: ['5'], autoRoleDelay: 30 });
  assert.match(s.arrival.find((x) => x.name === 'Auto-Role').value, /<@&5>.*30/);
  assert.deepEqual(welcomeProblems({ channels: { cache: new Map() } }, { enabled: false }), []);
  assert.match(welcomeProblems({ channels: { cache: new Map() } }, { enabled: true })[0], /belum dipilih/);
  assert.match(welcomeProblems({ channels: { cache: new Map() } }, { enabled: true, channelId: '1' })[0], /terhapus/);
});
