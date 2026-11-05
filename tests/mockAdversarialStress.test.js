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

// ============================================================================
// 1. MockDatabase Stress & Concurrency Suite
// ============================================================================

test('MockDatabase: High-throughput 1000 sequential set/get cycles', async () => {
  const db = new MockDatabase();
  const count = 1000;

  for (let i = 0; i < count; i++) {
    await db.set(`key:${i}`, { id: i, name: `name-${i}`, active: i % 2 === 0 });
  }

  assert.equal(db.size, count);

  for (let i = 0; i < count; i++) {
    const val = await db.get(`key:${i}`);
    assert.ok(val !== null);
    assert.equal(val.id, i);
    assert.equal(val.active, i % 2 === 0);
  }

  const listAll = await db.list('key:');
  assert.equal(listAll.length, count);
});

test('MockDatabase: Concurrent writes across distinct keys via Promise.all', async () => {
  const db = new MockDatabase();
  const concurrency = 200;

  await Promise.all(
    Array.from({ length: concurrency }, async (_, idx) => {
      await db.set(`concurrent:user:${idx}`, { score: idx * 10 });
    })
  );

  assert.equal(db.size, concurrency);

  const results = await Promise.all(
    Array.from({ length: concurrency }, async (_, idx) => {
      return await db.get(`concurrent:user:${idx}`);
    })
  );

  results.forEach((res, idx) => {
    assert.ok(res !== null);
    assert.equal(res.score, idx * 10);
  });
});

test('MockDatabase: Deep clone boundary isolation and complex object preservation', async () => {
  const db = new MockDatabase();

  const complexObject = {
    date: new Date('2026-11-05T12:00:00Z'),
    deep: {
      nested: {
        array: [{ a: 1 }, { b: [2, 3] }],
        reg: /test-pattern/i,
      },
    },
    flags: new Set([1, 2, 3]),
    map: new Map([['k1', 'v1']]),
  };

  await db.set('complex:data', complexObject);

  // Mutate local complexObject
  complexObject.deep.nested.array[0].a = 999;
  complexObject.flags.add(4);

  const retrieved = await db.get('complex:data');
  assert.equal(retrieved.deep.nested.array[0].a, 1, 'In-store object should not be mutated by external reference change');
  assert.ok(retrieved.date instanceof Date);
  assert.equal(retrieved.date.toISOString(), '2026-11-05T12:00:00.000Z');

  // Mutate retrieved object
  retrieved.deep.nested.array[0].a = 777;
  const freshRead = await db.get('complex:data');
  assert.equal(freshRead.deep.nested.array[0].a, 1, 'Mutating retrieved value should not alter underlying store');
});

test('MockDatabase: TTL edge cases — fractional expiration, overwrite, and cleanup', async () => {
  const db = new MockDatabase();

  // Set fractional TTL: 0.05 seconds (50ms)
  await db.set('temp:fast', 'quick_expiry', 0.05);
  assert.equal(await db.get('temp:fast'), 'quick_expiry');
  assert.equal(await db.has('temp:fast'), true);

  // Wait for 70ms to guarantee expiration
  await new Promise((resolve) => setTimeout(resolve, 70));
  assert.equal(await db.get('temp:fast'), null);
  assert.equal(await db.has('temp:fast'), false);

  // Zero and negative TTL should clear expiration
  await db.set('key:zero_ttl', 'persists', 0);
  assert.equal(await db.get('key:zero_ttl'), 'persists');
  assert.ok(!db.expirationTimes.has('key:zero_ttl'));

  await db.set('key:neg_ttl', 'persists', -5);
  assert.equal(await db.get('key:neg_ttl'), 'persists');
  assert.ok(!db.expirationTimes.has('key:neg_ttl'));

  // Overwriting key with new value and no TTL removes former expiration
  await db.set('key:with_ttl', 'has_ttl', 60);
  assert.ok(db.expirationTimes.has('key:with_ttl'));
  await db.set('key:with_ttl', 'now_permanent');
  assert.ok(!db.expirationTimes.has('key:with_ttl'));
  assert.equal(await db.get('key:with_ttl'), 'now_permanent');
});

test('MockDatabase: Increment / decrement on initial null and string values', async () => {
  const db = new MockDatabase();

  // Increment non-existent key
  const val1 = await db.increment('counter:new', 5);
  assert.equal(val1, 5);

  // Decrement
  const val2 = await db.decrement('counter:new', 2);
  assert.equal(val2, 3);

  // Increment with negative number
  const val3 = await db.increment('counter:new', -10);
  assert.equal(val3, -7);

  // Increment when key contains non-number defaults to 0 + amount
  await db.set('counter:corrupted', 'invalid_string');
  const fixed = await db.increment('counter:corrupted', 1);
  assert.equal(fixed, 1);
});

// ============================================================================
// 2. MockDiscordEntities Adversarial Suite
// ============================================================================

test('MockUser: Special characters, discriminator variations, and DM payload options', async () => {
  const u1 = createMockUser({
    id: 'u-special',
    username: '🎉 Mahasiswa UI & Ilmu Komputer 💻',
    discriminator: '0',
    avatar: null,
  });

  assert.equal(u1.tag, '🎉 Mahasiswa UI & Ilmu Komputer 💻');
  assert.equal(u1.displayAvatarURL(), 'https://cdn.discordapp.com/embed/avatars/0.png');
  assert.equal(u1.toString(), '<@u-special>');

  // Legacy user with 4-digit discriminator
  const u2 = createMockUser({
    id: 'u-legacy',
    username: 'csui',
    discriminator: '0042',
    avatar: 'custom_hash',
  });
  assert.equal(u2.tag, 'csui#0042');
  assert.equal(u2.displayAvatarURL({ size: 1024, extension: 'webp' }), 'https://cdn.discordapp.com/avatars/u-legacy/custom_hash.webp?size=1024');

  // Direct Message sends
  const dm1 = await u1.send('String message');
  assert.equal(dm1.content, 'String message');
  assert.equal(dm1.author.id, 'u-special');

  const dm2 = await u1.send({
    content: 'Payload with embeds',
    embeds: [{ title: 'Info Kuliah' }],
    components: [{ type: 1, components: [] }],
    files: [{ name: 'jadwal.png' }],
  });
  assert.equal(dm2.embeds.length, 1);
  assert.equal(dm2.components.length, 1);
  assert.equal(dm2.files.length, 1);
});

test('MockRole: Permission hierarchy, admin bypass, and multi-color updates', async () => {
  const roleEveryone = createMockRole({ id: 'r-0', name: '@everyone', permissions: ['SendMessages'] });
  assert.equal(roleEveryone.permissions.has('SendMessages'), true);
  assert.equal(roleEveryone.permissions.has('Administrator'), false);
  assert.deepEqual(roleEveryone.permissions.missing(['SendMessages', 'KickMembers']), ['KickMembers']);

  // Admin role overrides all permissions
  const roleAdmin = createMockRole({ id: 'r-admin', name: 'Admin', permissions: ['Administrator'] });
  assert.equal(roleAdmin.permissions.has('RandomPermissionNotEvenReal'), true);
  assert.equal(roleAdmin.permissions.missing(['ManageGuild', 'BanMembers']).length, 0);

  // Color parsing
  await roleEveryone.setColor(0x0d3a73);
  assert.equal(roleEveryone.color, 0x0d3a73);
  assert.equal(roleEveryone.hexColor, '#0d3a73');

  await roleEveryone.setColor('#f2a900');
  assert.equal(roleEveryone.color, 0xf2a900);
  assert.equal(roleEveryone.hexColor, '#f2a900');
});

test('MockChannel: Channel type predicates and message edit/delete resilience', async () => {
  const guild = createMockGuild({ id: 'g-1' });

  // Types: 0: Text, 2: Voice, 4: Category, 11: Thread, 13: Stage
  const chanText = createMockChannel({ id: 'c-text', type: 0, guild });
  const chanVoice = createMockChannel({ id: 'c-voice', type: 2, guild });
  const chanCategory = createMockChannel({ id: 'c-cat', type: 4, guild });
  const chanThread = createMockChannel({ id: 'c-thread', type: 11, guild });

  assert.equal(chanText.isTextBased(), true);
  assert.equal(chanText.isSendable(), true);
  assert.equal(chanText.isVoiceBased(), false);
  assert.equal(chanText.isThread(), false);

  assert.equal(chanVoice.isVoiceBased(), true);
  assert.equal(chanVoice.isTextBased(), false);

  assert.equal(chanThread.isThread(), true);
  assert.equal(chanThread.isTextBased(), true);

  // Channel message lifecycles
  const msg1 = await chanText.send('Pesan Pertama');
  const msg2 = await chanText.send({ content: 'Pesan Kedua' });
  assert.equal(chanText.messages.length, 2);

  await msg1.edit({ content: 'Pesan Pertama (Updated)' });
  assert.equal(msg1.content, 'Pesan Pertama (Updated)');

  // Double delete idempotency
  await msg1.delete();
  assert.equal(chanText.messages.length, 1);
  await msg1.delete(); // Second delete should not crash or throw
  assert.equal(chanText.messages.length, 1);
});

test('MockGuildMember: Role highest position calculation and moderation actions', async () => {
  const guild = createMockGuild({ id: 'g-mem' });

  const roleLow = guild.addMockRole({ id: 'r-low', name: 'Role 1', position: 2 });
  const roleMid = guild.addMockRole({ id: 'r-mid', name: 'Role 2', position: 10 });
  const roleTop = guild.addMockRole({ id: 'r-top', name: 'Role 3', position: 50 });

  const member = createMockMember({
    id: 'm-calc',
    guild,
    roles: [roleLow, roleMid],
  });

  assert.equal(member.roles.highest.id, 'r-mid');

  await member.roles.add(roleTop);
  assert.equal(member.roles.highest.id, 'r-top');

  await member.roles.remove(roleTop.id);
  assert.equal(member.roles.highest.id, 'r-mid');

  // Clear roles -> highest should fallback to @everyone (position 0)
  await member.roles.set([]);
  assert.equal(member.roles.highest.name, '@everyone');

  // Moderation: timeout, kick, ban
  guild.addMockMember(member);
  assert.equal(guild.members.cache.has(member.id), true);
  assert.equal(guild.memberCount, 1);

  await member.timeout(10000);
  assert.ok(member.communicationDisabledUntil instanceof Date);

  await member.ban({ reason: 'Spamming' });
  assert.equal(guild.members.cache.has(member.id), false);
  assert.equal(guild.memberCount, 0);
});

test('MockGuild: Dynamic bot member resolution via guild.members.me', async () => {
  const client = createMockClient({
    config: { bot: { id: 'bot-pacil', name: 'PacilBot' } },
  });
  const guild = createMockGuild({ id: 'g-dynamic', client });

  // guild.members.me dynamically resolves client user
  const me = guild.members.me;
  assert.ok(me instanceof MockGuildMember);
  assert.equal(me.user.id, 'bot-pacil');
  assert.equal(me.user.username, 'PacilBot');
  assert.equal(me.permissions.has('Administrator'), true);

  // Subsequent access returns cached bot member
  const me2 = guild.members.me;
  assert.strictEqual(me, me2);

  // Guild without client user returns null
  const detachedGuild = createMockGuild({ id: 'g-detached', client: null });
  assert.equal(detachedGuild.members.me, null);

  // Explicit override of members.me
  const customMe = createMockMember({ id: 'custom-bot', guild: detachedGuild });
  detachedGuild.members.me = customMe;
  assert.strictEqual(detachedGuild.members.me, customMe);
});

// ============================================================================
// 3. MockInteraction Adversarial Suite
// ============================================================================

test('MockInteraction: Comprehensive option type conversions, falsy booleans, and required throws', () => {
  const guild = createMockGuild({ id: 'g-opts' });
  const mockUser = createMockUser({ id: 'u-1', username: 'TestUser' });
  const mockRole = createMockRole({ id: 'r-1', name: 'TestRole', guild });
  const mockChannel = createMockChannel({ id: 'c-1', name: 'test-chan', guild });

  const interaction = createMockInteraction({
    commandName: 'fulloptions',
    options: {
      str: 'halo pacil',
      emptyStr: '',
      intVal: 100,
      floatAsInt: '42.99',
      floatVal: 3.14159,
      boolTrue: true,
      boolFalse: false, // Critical check: false must not be treated as null/missing
      userVal: mockUser,
      roleVal: mockRole,
      chanVal: mockChannel,
      subcommandVal: 'execute',
    },
    subcommand: 'execute',
    guild,
  });

  // String
  assert.equal(interaction.options.getString('str'), 'halo pacil');
  assert.equal(interaction.options.getString('emptyStr'), '');
  assert.equal(interaction.options.getString('nonexistent'), null);

  // Integer
  assert.equal(interaction.options.getInteger('intVal'), 100);
  assert.equal(interaction.options.getInteger('floatAsInt'), 42);
  assert.equal(interaction.options.getInteger('nonexistent'), null);

  // Number
  assert.equal(interaction.options.getNumber('floatVal'), 3.14159);
  assert.equal(interaction.options.getNumber('nonexistent'), null);

  // Boolean (verifying false returns false, not null)
  assert.equal(interaction.options.getBoolean('boolTrue'), true);
  assert.equal(interaction.options.getBoolean('boolFalse'), false);
  assert.equal(interaction.options.getBoolean('nonexistent'), null);

  // Entities
  assert.equal(interaction.options.getUser('userVal').id, 'u-1');
  assert.equal(interaction.options.getRole('roleVal').id, 'r-1');
  assert.equal(interaction.options.getChannel('chanVal').id, 'c-1');

  // Subcommands
  assert.equal(interaction.options.getSubcommand(), 'execute');

  // Required validations throw errors
  assert.throws(
    () => interaction.options.getString('missing_req', true),
    /Missing required option "missing_req"/
  );
  assert.throws(
    () => interaction.options.getInteger('missing_req', true),
    /Missing required option "missing_req"/
  );
  assert.throws(
    () => interaction.options.getBoolean('missing_req', true),
    /Missing required option "missing_req"/
  );

  // Subcommand required
  const noSubInteraction = createMockInteraction({ commandName: 'nosub' });
  assert.throws(
    () => noSubInteraction.options.getSubcommand(true),
    /Missing required subcommand/
  );
});

test('MockInteraction: Compatibility with InteractionHelper.isInteractionValid', () => {
  const validInteraction = createMockInteraction({
    commandName: 'ping',
  });

  // InteractionHelper check: newly created interaction must be valid
  assert.equal(InteractionHelper.isInteractionValid(validInteraction), true);

  // Stale interaction (>15 minutes) must be recognized as invalid
  const staleInteraction = createMockInteraction({
    commandName: 'ping',
    options: {
      createdTimestamp: Date.now() - (20 * 60 * 1000), // 20 minutes ago
    },
  });
  assert.equal(InteractionHelper.isInteractionValid(staleInteraction), false);
});

test('MockInteraction: Full reply lifecycle, file attachments, and chained edit/delete', async () => {
  const interaction = createMockInteraction({ commandName: 'render' });

  assert.equal(interaction.deferred, false);
  assert.equal(interaction.replied, false);

  // Defer
  await interaction.deferReply({ ephemeral: true });
  assert.equal(interaction.deferred, true);
  assert.equal(interaction.ephemeral, true);

  // Reply
  const fileBuffer = Buffer.from('simulated-png-content');
  const replyResult = await interaction.reply({
    content: 'Kartu panduan siap:',
    files: [{ name: 'guide.png', attachment: fileBuffer }],
  });

  assert.equal(interaction.replied, true);
  assert.equal(interaction.replies.length, 1);
  assert.equal(interaction.files.length, 1);
  assert.equal(interaction.files[0].name, 'guide.png');

  // Chained edit on returned reply message object
  await replyResult.edit({ content: 'Kartu panduan diperbarui' });
  assert.equal(interaction.edits.length, 1);
  assert.equal(interaction.edits[0].content, 'Kartu panduan diperbarui');

  // Chained delete on returned reply message object
  await replyResult.delete();
  assert.ok(interaction.calls.some(([method]) => method === 'deleteReply'));
});

// ============================================================================
// 4. MockDiscordClient Adversarial Suite
// ============================================================================

test('MockDiscordClient: Cross-guild cache fallback for channels and users', async () => {
  const client = createMockClient();

  // Guild 1
  const guild1 = client.defaultGuild;
  const chan1 = guild1.addMockChannel({ id: 'c-g1', name: 'chan-1' });

  // Guild 2 (separate guild attached to client)
  const guild2 = createMockGuild({ id: 'g-extra', client });
  client.guilds.cache.set(guild2.id, guild2);

  const chan2 = guild2.addMockChannel({ id: 'c-g2', name: 'chan-2' });
  const user2 = createMockUser({ id: 'u-g2', username: 'MemberG2' });
  guild2.addMockMember({ id: 'u-g2', user: user2 });

  // client.channels.fetch should resolve chan2 across guilds and cache it
  const resolvedChan = await client.channels.fetch('c-g2');
  assert.ok(resolvedChan !== null);
  assert.equal(resolvedChan.name, 'chan-2');
  assert.strictEqual(client.channels.cache.get('c-g2'), chan2);

  // client.users.fetch should resolve user2 across guilds and cache it
  const resolvedUser = await client.users.fetch('u-g2');
  assert.ok(resolvedUser !== null);
  assert.equal(resolvedUser.username, 'MemberG2');
  assert.strictEqual(client.users.cache.get('u-g2'), user2);

  // Non-existent id returns null
  assert.equal(await client.channels.fetch('nonexistent-chan'), null);
  assert.equal(await client.users.fetch('nonexistent-user'), null);
});

test('MockDiscordClient: Command error propagation and component dispatch argument parsing', async () => {
  const client = createMockClient();

  // 1. Command that throws an error should propagate up for error handler
  client.registerMockCommand({
    name: 'failing_cmd',
    execute: async () => {
      throw new Error('Database connection timeout inside command');
    },
  });

  const failInteraction = client.createInteraction({ commandName: 'failing_cmd' });
  await assert.rejects(
    () => client.dispatchCommand(failInteraction),
    /Database connection timeout inside command/
  );

  // 2. Component dispatch with multiple colon arguments
  let receivedArgs = null;
  client.registerMockButton({
    name: 'ticket_action',
    execute: async (interaction, c, args) => {
      receivedArgs = args;
      await interaction.reply({ content: `Args count: ${args.length}` });
    },
  });

  const btnInteraction = client.createInteraction({
    type: 'button',
    customId: 'ticket_action:close:confirmed:reason_spam',
  });

  await client.dispatchComponent(btnInteraction);
  assert.deepEqual(receivedArgs, ['close', 'confirmed', 'reason_spam']);
  assert.equal(btnInteraction.replies[0].content, 'Args count: 3');

  // 3. Dispatching invalid interaction type throws
  const chatInputInteraction = client.createInteraction({ commandName: 'ping' });
  await assert.rejects(
    () => client.dispatchComponent(chatInputInteraction),
    /Interaction is not a button, select menu, or modal submit/
  );
});

test('MockDiscordClient: destroy() cleanly clears collections and caches', () => {
  const client = createMockClient();

  client.registerMockCommand({ name: 'test_cmd', execute: () => {} });
  client.registerMockButton({ customId: 'test_btn', execute: () => {} });
  client.registerMockSelectMenu({ customId: 'test_sel', execute: () => {} });
  client.registerMockModal({ customId: 'test_mod', execute: () => {} });

  assert.equal(client.commands.size, 1);
  assert.equal(client.buttons.size, 1);
  assert.equal(client.selectMenus.size, 1);
  assert.equal(client.modals.size, 1);

  client.destroy();

  assert.equal(client.commands.size, 0);
  assert.equal(client.buttons.size, 0);
  assert.equal(client.selectMenus.size, 0);
  assert.equal(client.modals.size, 0);
  assert.equal(client.guilds.cache.size, 0);
  assert.equal(client.channels.cache.size, 0);
  assert.equal(client.users.cache.size, 0);
});

// ============================================================================
// 5. assertValidPng Boundary & Adversarial Suite
// ============================================================================

test('assertValidPng: Exact 8-byte magic byte signature matching and edge cases', () => {
  const validHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  // Exact 8 bytes passing with minBytes = 8
  const exact8Buffer = Buffer.from(validHeader);
  assert.equal(assertValidPng(exact8Buffer, 8), true);

  // Corrupting each magic byte individually
  for (let byteIndex = 0; byteIndex < 8; byteIndex++) {
    const corrupt = [...validHeader];
    corrupt[byteIndex] = 0x00;
    const corruptBuffer = Buffer.from(corrupt);

    assert.throws(
      () => assertValidPng(corruptBuffer, 8),
      /PNG magic byte/
    );
  }

  // Large valid PNG (50KB)
  const largePng = Buffer.concat([Buffer.from(validHeader), Buffer.alloc(50000, 0xaa)]);
  assert.equal(assertValidPng(largePng, 40000), true);

  // JPEG header rejection: FF D8 FF
  const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  assert.throws(() => assertValidPng(jpegBuffer, 8), /PNG magic byte 0 must be 0x89/);

  // GIF header rejection: GIF89a
  const gifBuffer = Buffer.from('GIF89a');
  assert.throws(() => assertValidPng(gifBuffer, 6), /PNG magic byte 0 must be 0x89/);
});
