import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPONENT_TIMEOUT_MESSAGE, autoAcknowledge, runComponentGuarded,
} from '../src/utils/componentGuard.js';

function fakeInteraction(over = {}) {
  const calls = [];
  const i = {
    customId: 'setup:menu', guildId: 'G', user: { id: 'U' }, deferred: false, replied: false, calls,
    isModalSubmit: () => false, isFromMessage: () => true,
    deferUpdate: async () => { calls.push('deferUpdate'); i.deferred = true; },
    deferReply: async () => { calls.push('deferReply'); i.deferred = true; },
    editReply: async (p) => { calls.push(['editReply', p]); },
    followUp: async (p) => { calls.push(['followUp', p]); },
    reply: async (p) => { calls.push(['reply', p]); i.replied = true; },
    update: async (p) => { calls.push(['update', p]); i.replied = true; },
    ...over,
  };
  return i;
}

test('autoAcknowledge men-defer sekali dan mengalihkan update ke editReply', async () => {
  const i = fakeInteraction();
  assert.equal(await autoAcknowledge(i), true);
  await i.update({ content: 'x' });
  assert.deepEqual(i.calls, ['deferUpdate', ['editReply', { content: 'x' }]]);
  assert.equal(await autoAcknowledge(i), false);
});

test('autoAcknowledge memakai deferReply untuk modal yang tidak berasal dari pesan', async () => {
  const i = fakeInteraction({ isModalSubmit: () => true, isFromMessage: () => false });
  await autoAcknowledge(i);
  assert.equal(i.calls[0], 'deferReply');
});

test('autoAcknowledge tidak melempar error bila defer gagal', async () => {
  const i = fakeInteraction({ deferUpdate: async () => { throw new Error('Unknown interaction'); } });
  assert.equal(await autoAcknowledge(i), false);
});

test('handler cepat tidak memicu ACK otomatis', async () => {
  const i = fakeInteraction();
  const result = await runComponentGuarded(i, async () => { await i.update({ content: 'cepat' }); }, { ackAfterMs: 30, timeoutMs: 200 });
  assert.equal(result, 'done');
  await new Promise((r) => setTimeout(r, 60));
  assert.deepEqual(i.calls, [['update', { content: 'cepat' }]]);
});

test('handler lambat di-ACK otomatis dan update-nya tetap sampai', async () => {
  const i = fakeInteraction();
  await runComponentGuarded(i, async () => {
    await new Promise((r) => setTimeout(r, 60));
    await i.update({ content: 'lambat' });
  }, { ackAfterMs: 20, timeoutMs: 500 });
  assert.deepEqual(i.calls, ['deferUpdate', ['editReply', { content: 'lambat' }]]);
});

test('handler menggantung: pengguna diberi tahu, tidak ada error tak tertangani', async () => {
  const i = fakeInteraction();
  const result = await runComponentGuarded(i, () => new Promise(() => {}), { ackAfterMs: 10, timeoutMs: 50 });
  assert.equal(result, 'timeout');
  const last = i.calls.at(-1);
  assert.equal(last[0], 'followUp');
  assert.equal(last[1].content, COMPONENT_TIMEOUT_MESSAGE);
});

test('error dari handler dilempar ulang untuk ditangani handleInteractionError', async () => {
  const i = fakeInteraction();
  await assert.rejects(runComponentGuarded(i, async () => { throw new Error('boom'); }, { ackAfterMs: 50, timeoutMs: 100 }), /boom/);
});
