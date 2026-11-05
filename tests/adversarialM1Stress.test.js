import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MockDatabase,
  MockUser,
  MockRole,
  MockChannel,
  MockGuildMember,
  MockGuild,
  MockInteraction,
  MockDiscordClient,
  createMockUser,
  createMockRole,
  createMockChannel,
  createMockMember,
  createMockGuild,
  createMockInteraction,
  createMockClient,
  assertValidPng,
} from './mocks/index.js';

import { InteractionHelper } from '../src/utils/interactionHelper.js';
import { autoAcknowledge, runComponentGuarded } from '../src/utils/componentGuard.js';

// ============================================================================
// STRESS SUITE 1: Interaction Lifecycle & Production Integration
// ============================================================================
test('Stress 1.1: Interaction lifecycle state transitions and tracking', async () => {
  const interaction = createMockInteraction({
    commandName: 'profile',
    options: {
      zeroVal: 0,
      negVal: -42,
      emptyStr: '',
      falseBool: false,
      trueBool: true,
      floatVal: 3.14159,
    },
  });

  // Verify option getters preserve falsy but valid values
  assert.equal(interaction.options.getInteger('zeroVal'), 0);
  assert.equal(interaction.options.getInteger('negVal'), -42);
  assert.equal(interaction.options.getString('emptyStr'), '');
  assert.equal(interaction.options.getBoolean('falseBool'), false);
  assert.equal(interaction.options.getBoolean('trueBool'), true);
  assert.equal(interaction.options.getNumber('floatVal'), 3.14159);

  // Missing options with required=true vs required=false
  assert.equal(interaction.options.getString('missing_opt'), null);
  assert.throws(
    () => interaction.options.getString('missing_opt', true),
    /Missing required option "missing_opt"/
  );

  // Initial lifecycle state
  assert.equal(interaction.deferred, false);
  assert.equal(interaction.replied, false);
  assert.equal(interaction.ephemeral, false);
  assert.equal(interaction.replies.length, 0);
  assert.equal(interaction.edits.length, 0);
  assert.equal(interaction.followUps.length, 0);

  // Transition 1: Defer with flags
  await interaction.deferReply({ flags: 64 });
  assert.equal(interaction.deferred, true);
  assert.equal(interaction.ephemeral, true);
  assert.equal(interaction.calls[0][0], 'deferReply');

  // Transition 2: Edit deferred reply
  const editResult = await interaction.editReply({
    content: 'Deferred content ready',
    files: [{ name: 'card.png', attachment: Buffer.from('fake-png') }],
  });
  assert.equal(interaction.edits.length, 1);
  assert.equal(interaction.files.length, 1);
  assert.equal(editResult.content, 'Deferred content ready');

  // Transition 3: FollowUp
  const followUpResult = await interaction.followUp({
    content: 'Follow up notice',
    ephemeral: true,
  });
  assert.equal(interaction.followUps.length, 1);
  assert.equal(followUpResult.content, 'Follow up notice');

  // Transition 4: fetchReply retrieves latest state
  const fetched = await interaction.fetchReply();
  assert.equal(fetched.content, 'Deferred content ready');

  // Transition 5: Multiple edits sequence
  await interaction.editReply({ content: 'Second edit' });
  await interaction.editReply({ content: 'Third edit' });
  assert.equal(interaction.edits.length, 3);
  const finalFetched = await interaction.fetchReply();
  assert.equal(finalFetched.content, 'Third edit');
});

test('Stress 1.2: Component interaction lifecycle (buttons, select, modals)', async () => {
  // Button update lifecycle
  const btn = createMockInteraction({
    type: 'button',
    customId: 'test_btn:123',
  });
  assert.equal(btn.isButton(), true);
  assert.equal(btn.isAnySelectMenu(), false);
  assert.equal(btn.isModalSubmit(), false);

  await btn.deferUpdate();
  assert.equal(btn.deferred, true);

  await btn.update({ content: 'Button processed' });
  assert.equal(btn.replied, true);

  // Modal lifecycle
  const modal = createMockInteraction({
    type: 'modal',
    customId: 'test_modal',
    fields: {
      input1: 'val1',
      input2: '',
    },
  });
  assert.equal(modal.isModalSubmit(), true);
  assert.equal(modal.fields.getTextInputValue('input1'), 'val1');
  assert.equal(modal.fields.getTextInputValue('input2'), '');
  assert.equal(modal.fields.getTextInputValue('nonexistent'), null);

  // String reply normalization
  await modal.reply('Direct string message');
  assert.equal(modal.replies.length, 1);
  assert.equal(modal.replies[0].content, 'Direct string message');
});

test('Stress 1.3: Production InteractionHelper compatibility', async () => {
  const interaction = createMockInteraction({
    commandName: 'ping',
  });

  // 1. isInteractionValid check
  assert.equal(InteractionHelper.isInteractionValid(interaction), true);

  // Corrupted interactions must fail validation
  assert.equal(InteractionHelper.isInteractionValid(null), false);
  assert.equal(InteractionHelper.isInteractionValid({}), false);
  assert.equal(InteractionHelper.isInteractionValid({ id: '123' }), false); // Missing user

  // Interaction older than 15 minutes must fail
  const oldInteraction = createMockInteraction({
    commandName: 'old',
    options: { createdTimestamp: Date.now() - 20 * 60 * 1000 },
  });
  assert.equal(InteractionHelper.isInteractionValid(oldInteraction), false);

  // 2. patchInteractionResponses compatibility
  InteractionHelper.patchInteractionResponses(interaction);
  assert.equal(interaction.__pacilResponsePatched, true);

  // Reply via patched response
  await interaction.reply({ content: 'Patched Pong!' });
  assert.equal(interaction.replied, true);
  assert.equal(interaction.replies[0].content, 'Patched Pong!');

  // Calling reply() again on patched interaction routes to followUp
  await interaction.reply({ content: 'Second response via followUp' });
  assert.equal(interaction.followUps.length, 1);
  assert.equal(interaction.followUps[0].content, 'Second response via followUp');
});

test('Stress 1.4: Production componentGuard (autoAcknowledge) compatibility', async () => {
  const btn = createMockInteraction({
    type: 'button',
    customId: 'voice:lock:room101',
  });

  // autoAcknowledge should defer and route update to editReply
  const ackResult = await autoAcknowledge(btn);
  assert.equal(ackResult, true);
  assert.equal(btn.deferred, true);
  assert.equal(btn.__autoAcknowledged, true);

  // Calling update() now delegates to editReply()
  await btn.update({ content: 'Room locked successfully' });
  assert.equal(btn.edits.length, 1);
  assert.equal(btn.edits[0].content, 'Room locked successfully');

  // Second autoAcknowledge returns false (already answered)
  assert.equal(await autoAcknowledge(btn), false);
});

// ============================================================================
// STRESS SUITE 2: Button & Component CustomId Colon Arg Extraction
// ============================================================================
test('Stress 2.1: CustomId colon argument parsing permutations', async () => {
  const client = createMockClient();

  let capturedArgs = [];
  client.registerMockButton({
    name: 'action',
    execute: async (i, c, args) => {
      capturedArgs = args;
      await i.reply({ content: `Args count: ${args.length}` });
    },
  });

  // Test Case A: Single argument
  const i1 = client.createInteraction({ type: 'button', customId: 'action:arg1' });
  await client.dispatchComponent(i1);
  assert.deepEqual(capturedArgs, ['arg1']);

  // Test Case B: Multiple arguments
  const i2 = client.createInteraction({ type: 'button', customId: 'action:paramA:paramB:paramC:100' });
  await client.dispatchComponent(i2);
  assert.deepEqual(capturedArgs, ['paramA', 'paramB', 'paramC', '100']);

  // Test Case C: Zero arguments (no colon)
  const i3 = client.createInteraction({ type: 'button', customId: 'action' });
  await client.dispatchComponent(i3);
  assert.deepEqual(capturedArgs, []);

  // Test Case D: Consecutive colons (empty argument segment)
  const i4 = client.createInteraction({ type: 'button', customId: 'action::segment2' });
  await client.dispatchComponent(i4);
  assert.deepEqual(capturedArgs, ['', 'segment2']);

  // Test Case E: Trailing colon
  const i5 = client.createInteraction({ type: 'button', customId: 'action:trailing:' });
  await client.dispatchComponent(i5);
  assert.deepEqual(capturedArgs, ['trailing', '']);

  // Test Case F: Complex characters (spaces, hyphens, underscores, UUIDs)
  const i6 = client.createInteraction({
    type: 'button',
    customId: 'action:sub-action_123:hello world:550e8400-e29b-41d4-a716-446655440000',
  });
  await client.dispatchComponent(i6);
  assert.deepEqual(capturedArgs, ['sub-action_123', 'hello world', '550e8400-e29b-41d4-a716-446655440000']);
});

test('Stress 2.2: Component dispatch error handling and non-component rejection', async () => {
  const client = createMockClient();

  // Non-component interaction dispatched to dispatchComponent
  const chatCmdInteraction = client.createInteraction({
    type: 'command',
    commandName: 'help',
  });
  await assert.rejects(
    () => client.dispatchComponent(chatCmdInteraction),
    /Interaction is not a button, select menu, or modal submit/
  );

  // Missing interaction argument
  await assert.rejects(
    () => client.dispatchComponent(null),
    /Interaction is required for dispatchComponent/
  );

  // Missing command interaction
  await assert.rejects(
    () => client.dispatchCommand(null),
    /Interaction is required for dispatchCommand/
  );
});

// ============================================================================
// STRESS SUITE 3: assertValidPng against Corrupted & Truncated Buffers
// ============================================================================
test('Stress 3.1: assertValidPng valid buffer vs corrupted magic bytes', () => {
  const validHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const validBuffer = Buffer.concat([Buffer.from(validHeader), Buffer.alloc(2000, 0xaa)]);

  // Valid buffer passes
  assert.equal(assertValidPng(validBuffer, 1000), true);
  assert.equal(assertValidPng(validBuffer, 2008), true);

  // Test each magic byte corruption individually (8 separate bytes)
  for (let i = 0; i < 8; i++) {
    const corrupted = Buffer.from(validBuffer);
    corrupted[i] = corrupted[i] ^ 0xff; // Flip bits
    assert.throws(
      () => assertValidPng(corrupted, 100),
      /PNG magic byte/,
      `Corrupted byte ${i} must fail magic byte assertion`
    );
  }
});

test('Stress 3.2: assertValidPng truncation and size boundary conditions', () => {
  const validHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  // 1. Truncated buffers below 8 bytes
  for (let len = 0; len < 8; len++) {
    const truncated = Buffer.from(validHeader.slice(0, len));
    // When minBytes is enforced, size check fails
    assert.throws(
      () => assertValidPng(truncated, 10),
      /below minimum threshold/
    );
    // When minBytes = len, magic byte check fails on undefined byte
    assert.throws(
      () => assertValidPng(truncated, len),
      len === 0 ? /PNG magic byte 0 must be 0x89/ : /PNG magic byte/
    );
  }

  // 2. Exactly threshold vs 1 byte below threshold
  const exactThresholdBuf = Buffer.concat([Buffer.from(validHeader), Buffer.alloc(100 - 8)]);
  assert.equal(assertValidPng(exactThresholdBuf, 100), true);

  const oneBelowBuf = Buffer.concat([Buffer.from(validHeader), Buffer.alloc(99 - 8)]);
  assert.throws(
    () => assertValidPng(oneBelowBuf, 100),
    /is below minimum threshold \(100 bytes\)/
  );

  // 3. Zero length buffer
  assert.throws(
    () => assertValidPng(Buffer.alloc(0), 1),
    /below minimum threshold/
  );
});

test('Stress 3.3: assertValidPng non-buffer input types', () => {
  const invalidInputs = [
    null,
    undefined,
    'a string representation of png',
    12345,
    { length: 5000, 0: 0x89, 1: 0x50 },
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
  ];

  for (const input of invalidInputs) {
    assert.throws(
      () => assertValidPng(input, 1),
      /Output must be a Buffer instance/
    );
  }
});

// ============================================================================
// STRESS SUITE 4: MockDatabase & Entity Hierarchy Concurrency & Edge Cases
// ============================================================================
test('Stress 4.1: MockDatabase deep-clone mutation isolation across nested data structures', async () => {
  const db = new MockDatabase();

  const nestedPayload = {
    user: { id: '1', profile: { tags: ['admin', 'cs'], stats: { xp: 100, level: 5 } } },
    items: [{ id: 'item-1', meta: { count: 10 } }],
  };

  await db.set('nested:data', nestedPayload);

  // Mutate original payload
  nestedPayload.user.profile.tags.push('hacker');
  nestedPayload.items[0].meta.count = 999;

  // Retrieve stored data and verify untouched
  const retrieved = await db.get('nested:data');
  assert.deepEqual(retrieved.user.profile.tags, ['admin', 'cs']);
  assert.equal(retrieved.items[0].meta.count, 10);

  // Mutate retrieved data and verify database is untouched
  retrieved.user.profile.tags.push('another');
  const fresh = await db.get('nested:data');
  assert.deepEqual(fresh.user.profile.tags, ['admin', 'cs']);
});

test('Stress 4.2: MockDiscordEntities role hierarchy edge cases', () => {
  const guild = createMockGuild({ id: 'g1' });
  const member = createMockMember({ id: 'm1', guild });

  // When member has no roles, highest should fall back to @everyone with position 0
  assert.equal(member.roles.highest.position, 0);

  // Add multiple roles with varying positions
  const rLow = guild.addMockRole({ id: 'r-low', name: 'Low', position: -1 });
  const rMid = guild.addMockRole({ id: 'r-mid', name: 'Mid', position: 5 });
  const rHigh = guild.addMockRole({ id: 'r-high', name: 'High', position: 20 });

  member.roles.cache.set(rLow.id, rLow);
  member.roles.cache.set(rMid.id, rMid);
  member.roles.cache.set(rHigh.id, rHigh);

  assert.equal(member.roles.highest.id, 'r-high');
  assert.equal(member.roles.highest.position, 20);
});

test('Stress 4.3: MockDiscordClient cache lookups with string vs numeric IDs', async () => {
  const client = createMockClient();
  const testChan = client.defaultGuild.addMockChannel({ id: '987654321', name: 'numeric-id-chan' });

  // Fetch using string ID
  const chanByStr = await client.channels.fetch('987654321');
  assert.equal(chanByStr.id, '987654321');

  // Fetch using numeric ID
  const chanByNum = await client.channels.fetch(987654321);
  assert.equal(chanByNum.id, '987654321');
});
