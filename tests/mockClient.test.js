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

// ============================================================================
// 1. MockDatabase Suite
// ============================================================================
test('MockDatabase: CRUD operations with deep cloning to prevent mutation', async () => {
  const db = new MockDatabase({
    'guild:1:prefix': '!',
    'guild:1:modules': ['music', 'admin'],
  });

  // Read initial data
  const prefix = await db.get('guild:1:prefix');
  assert.equal(prefix, '!');

  const modules = await db.get('guild:1:modules');
  assert.deepEqual(modules, ['music', 'admin']);

  // Verify deep cloning on read (mutating retrieved array should not alter store)
  modules.push('leveling');
  const freshModules = await db.get('guild:1:modules');
  assert.deepEqual(freshModules, ['music', 'admin']);

  // Set new value with mutation check
  const config = { welcome: { enabled: true, channelId: '100' } };
  await db.set('guild:1:config', config);
  config.welcome.enabled = false; // Mutate original

  const storedConfig = await db.get('guild:1:config');
  assert.equal(storedConfig.welcome.enabled, true, 'Stored value must be immune to outside mutation');

  // Exists & has
  assert.equal(await db.has('guild:1:config'), true);
  assert.equal(await db.exists('guild:1:config'), true);
  assert.equal(await db.has('non:existent:key'), false);

  // Default fallback
  const fallback = await db.get('non:existent:key', { fallback: true });
  assert.deepEqual(fallback, { fallback: true });

  // Delete
  const deleted = await db.delete('guild:1:prefix');
  assert.equal(deleted, true);
  assert.equal(await db.get('guild:1:prefix'), null);
});

test('MockDatabase: TTL expiration and list keys with prefix filtering', async () => {
  const db = new MockDatabase();

  await db.set('perm:key:1', 'value1');
  await db.set('perm:key:2', 'value2');
  await db.set('other:key', 'value3');

  // Active TTL
  await db.set('temp:short', 'will_expire', 10);
  assert.equal(await db.get('temp:short'), 'will_expire');
  assert.equal(await db.has('temp:short'), true);

  // Expired TTL simulation (directly adjusting expiration timestamp)
  await db.set('temp:expired', 'expired_value', 1);
  db.expirationTimes.set('temp:expired', Date.now() - 5000);

  // Expired keys should return default and report non-existent
  assert.equal(await db.get('temp:expired'), null);
  assert.equal(await db.has('temp:expired'), false);

  // Prefix listing
  const permKeys = await db.list('perm:');
  assert.deepEqual(permKeys.sort(), ['perm:key:1', 'perm:key:2']);

  const allKeys = await db.list();
  assert.ok(allKeys.includes('perm:key:1'));
  assert.ok(allKeys.includes('other:key'));
  assert.ok(!allKeys.includes('temp:expired'), 'Expired keys must not appear in list()');
});

test('MockDatabase: atomic increment, decrement, and clear status introspection', async () => {
  const db = new MockDatabase();

  // Increment from null/unset starts at 0 + delta
  const count1 = await db.increment('stats:counter');
  assert.equal(count1, 1);

  const count2 = await db.increment('stats:counter', 5);
  assert.equal(count2, 6);

  // Decrement
  const count3 = await db.decrement('stats:counter', 2);
  assert.equal(count3, 4);

  // Introspection & Clear
  assert.equal(db.size, 1);
  const status = db.getStatus();
  assert.equal(status.isAvailable, true);
  assert.equal(status.isDegraded, false);
  assert.equal(status.connectionType, 'mock-memory');
  assert.equal(db.isAvailable(), true);
  assert.equal(db.isDegraded(), false);

  db.clear();
  assert.equal(db.size, 0);
  assert.equal(await db.get('stats:counter'), null);
});

// ============================================================================
// 2. MockDiscordEntities Suite
// ============================================================================
test('MockUser: tag formatting, avatar URLs, direct messages, and activity', async () => {
  // Modern username without discriminator
  const user1 = createMockUser({
    id: 'user-101',
    username: 'mahasiswa_ui',
    discriminator: '0',
    avatar: 'avatar_hash_1',
  });
  assert.equal(user1.tag, 'mahasiswa_ui');
  assert.equal(user1.toString(), '<@user-101>');
  assert.equal(user1.displayAvatarURL(), 'https://cdn.discordapp.com/avatars/user-101/avatar_hash_1.png?size=512');

  // Legacy user with discriminator
  const user2 = new MockUser({
    id: 'user-102',
    username: 'alumni_ui',
    discriminator: '1234',
    avatar: null,
  });
  assert.equal(user2.tag, 'alumni_ui#1234');
  assert.equal(user2.displayAvatarURL(), 'https://cdn.discordapp.com/embed/avatars/0.png');

  // DM send simulation
  const dmMsg = await user1.send({ content: 'Pengumuman Kuliah' });
  assert.equal(dmMsg.content, 'Pengumuman Kuliah');
  assert.equal(dmMsg.author.id, 'user-101');

  // Presence and activity
  user1.setActivity('Visual Studio Code', { type: 0 });
  assert.deepEqual(user1.activity, { name: 'Visual Studio Code', type: 0 });
  user1.setPresence({ status: 'online' });
  assert.equal(user1.presence.status, 'online');
});

test('MockRole: color management, permissions, and string representation', async () => {
  const role = createMockRole({
    id: 'role-admin',
    name: 'Administrator Fasilkom',
    color: 0xf2a900,
    position: 10,
    permissions: ['Administrator'],
  });

  assert.equal(role.hexColor, '#f2a900');
  assert.equal(role.toString(), '<@&role-admin>');
  assert.equal(role.permissions.has('KickMembers'), true, 'Admin permission bypasses all checks');
  assert.equal(role.permissions.missing(['ManageGuild', 'BanMembers']).length, 0);

  // Normal role permissions
  const modRole = new MockRole({
    id: 'role-mod',
    name: 'Moderator',
    color: 0x0d3a73,
    permissions: ['ViewChannel', 'SendMessages', 'ManageMessages'],
  });
  assert.equal(modRole.hexColor, '#0d3a73');
  assert.equal(modRole.permissions.has('ManageMessages'), true);
  assert.equal(modRole.permissions.has('Administrator'), false);
  assert.deepEqual(modRole.permissions.missing(['ManageMessages', 'BanMembers']), ['BanMembers']);

  // Color mutators
  await modRole.setColor('#10b981');
  assert.equal(modRole.hexColor, '#10b981');

  await modRole.setColors({ primary: '#ef4444', secondary: '#f59e0b' });
  assert.equal(modRole.hexColor, '#ef4444');
  assert.equal(modRole.secondaryColor, '#f59e0b');
});

test('MockChannel: text & voice predicates, permissions, send/edit/delete messages', async () => {
  const textChan = createMockChannel({
    id: 'chan-general',
    name: 'akademik-cs',
    type: 0,
  });

  assert.equal(textChan.isTextBased(), true);
  assert.equal(textChan.isSendable(), true);
  assert.equal(textChan.isVoiceBased(), false);
  assert.equal(textChan.toString(), '<#chan-general>');

  // Send message
  const msg = await textChan.send({ content: 'Halo Pacil!' });
  assert.equal(textChan.messages.length, 1);
  assert.equal(msg.content, 'Halo Pacil!');

  // Edit message
  await msg.edit('Halo Pacil Fasilkom UI!');
  assert.equal(msg.content, 'Halo Pacil Fasilkom UI!');

  // Delete message
  await msg.delete();
  assert.equal(textChan.messages.length, 0);

  // Voice channel
  const voiceChan = new MockChannel({
    id: 'chan-voice',
    name: 'Lab 1101',
    type: 2,
    bitrate: 96000,
    userLimit: 10,
  });
  assert.equal(voiceChan.isVoiceBased(), true);
  assert.equal(voiceChan.isTextBased(), false);
  assert.equal(voiceChan.bitrate, 96000);
  assert.equal(voiceChan.userLimit, 10);
});

test('MockGuildMember: role hierarchy, voice controls, and moderation actions', async () => {
  const guild = createMockGuild({ id: 'guild-pacil', name: 'Fasilkom UI' });

  const roleNormal = guild.addMockRole({ id: 'r-normal', name: 'Mahasiswa', position: 1 });
  const roleHigh = guild.addMockRole({ id: 'r-high', name: 'Dosen Pembimbing', position: 5 });

  const member = createMockMember({
    id: 'member-1',
    user: { id: 'member-1', username: 'budi_cs' },
    guild,
    roles: [roleNormal],
  });

  assert.equal(member.roles.has(roleNormal.id), true);
  assert.equal(member.roles.has(roleHigh.id), false);
  assert.equal(member.roles.highest.id, roleNormal.id);

  // Add higher role
  await member.roles.add(roleHigh);
  assert.equal(member.roles.has(roleHigh.id), true);
  assert.equal(member.roles.highest.id, roleHigh.id);

  // Remove role
  await member.roles.remove(roleHigh.id);
  assert.equal(member.roles.has(roleHigh.id), false);
  assert.equal(member.roles.highest.id, roleNormal.id);

  // Voice state simulation
  const vc = guild.addMockChannel({ id: 'vc-1', name: 'Ruang Diskusi', type: 2 });
  await member.voice.setChannel(vc);
  assert.equal(member.voice.channelId, 'vc-1');
  await member.voice.setMute(true);
  assert.equal(member.voice.mute, true);
  await member.voice.disconnect();
  assert.equal(member.voice.channelId, null);

  // Moderation: timeout, kick
  await member.timeout(60000, 'Test timeout');
  assert.ok(member.communicationDisabledUntil instanceof Date);

  guild.addMockMember(member);
  assert.equal(guild.members.cache.has(member.id), true);
  await member.kick('Kicked for test');
  assert.equal(guild.members.cache.has(member.id), false);
});

test('MockGuild: dynamic guild.members.me resolution and resource factory helpers', async () => {
  const client = createMockClient();
  const guild = createMockGuild({ id: 'guild-ui', name: 'Universitas Indonesia', client });

  // Bot member automatically resolved and cached
  const me = guild.members.me;
  assert.ok(me instanceof MockGuildMember);
  assert.equal(me.user.id, client.user.id);
  assert.equal(me.permissions.has('Administrator'), true);

  // Channel creation
  const chan = await guild.channels.create({ name: 'pengumuman-resmi', type: 0 });
  assert.equal(guild.channels.cache.has(chan.id), true);
  assert.equal((await guild.channels.fetch(chan.id)).name, 'pengumuman-resmi');

  // Role creation
  const role = await guild.roles.create({ name: 'Asisten Dosen', color: 0x10b981 });
  assert.equal(guild.roles.cache.has(role.id), true);
  assert.equal((await guild.roles.fetch(role.id)).name, 'Asisten Dosen');
});

// ============================================================================
// 3. MockInteraction Suite
// ============================================================================
test('MockInteraction: chat input options extraction and missing option checks', () => {
  const guild = createMockGuild({ id: 'g-opt' });
  const targetUser = createMockUser({ id: 'u-target', username: 'target_cs' });
  const targetChannel = createMockChannel({ id: 'c-target', name: 'target-channel', guild });
  const targetRole = createMockRole({ id: 'r-target', name: 'TargetRole', guild });

  const interaction = createMockInteraction({
    commandName: 'userinfo',
    subcommand: 'detail',
    options: {
      user: targetUser,
      channel: targetChannel,
      role: targetRole,
      count: 42,
      ratio: 3.14,
      tag: 'verified',
      active: true,
    },
    guild,
  });

  assert.equal(interaction.isChatInputCommand(), true);
  assert.equal(interaction.options.getSubcommand(), 'detail');
  assert.equal(interaction.options.getString('tag'), 'verified');
  assert.equal(interaction.options.getInteger('count'), 42);
  assert.equal(interaction.options.getNumber('ratio'), 3.14);
  assert.equal(interaction.options.getBoolean('active'), true);
  assert.equal(interaction.options.getUser('user').id, 'u-target');
  assert.equal(interaction.options.getChannel('channel').id, 'c-target');
  assert.equal(interaction.options.getRole('role').id, 'r-target');

  // Required options check
  assert.throws(
    () => interaction.options.getString('missing_opt', true),
    /Missing required option "missing_opt"/
  );
});

test('MockInteraction: lifecycle tracking for defer, reply, editReply, followUp, and files', async () => {
  const interaction = createMockInteraction({ commandName: 'help' });

  assert.equal(interaction.deferred, false);
  assert.equal(interaction.replied, false);
  assert.ok(interaction.createdTimestamp > 0);
  assert.ok(interaction.createdAt instanceof Date);

  // Defer reply
  await interaction.deferReply({ ephemeral: true });
  assert.equal(interaction.deferred, true);
  assert.equal(interaction.ephemeral, true);

  // Edit deferred reply with simulated file
  const mockBuffer = Buffer.from('mock-png-bytes');
  await interaction.editReply({
    content: 'Daftar Bantuan Bot Pacil',
    files: [{ name: 'help.png', attachment: mockBuffer }],
  });

  assert.equal(interaction.edits.length, 1);
  assert.equal(interaction.files.length, 1);
  assert.equal(interaction.files[0].name, 'help.png');

  // Follow up
  await interaction.followUp({ content: 'Tautan dokumentasi resmi: https://cs.ui.ac.id' });
  assert.equal(interaction.followUps.length, 1);

  // Fetch reply returns the latest response
  const latestReply = await interaction.fetchReply();
  assert.equal(latestReply.content, 'Daftar Bantuan Bot Pacil');

  // Direct reply with response message mutator test
  const interaction2 = createMockInteraction({ commandName: 'ping' });
  const replyMsg = await interaction2.reply({ content: 'Pong!' });
  assert.equal(interaction2.replied, true);
  assert.equal(interaction2.replies.length, 1);
  assert.equal(replyMsg.content, 'Pong!');

  // Mutator on returned reply object
  await replyMsg.edit({ content: 'Pong! 42ms' });
  assert.equal(interaction2.edits.length, 1);
  assert.equal(interaction2.edits[0].content, 'Pong! 42ms');
});

test('MockInteraction: button, select menu, and modal component interactions', async () => {
  // Button interaction
  const btnInteraction = createMockInteraction({
    type: 'button',
    customId: 'voice:lock:chan123',
  });
  assert.equal(btnInteraction.isButton(), true);
  assert.equal(btnInteraction.isChatInputCommand(), false);
  assert.ok(btnInteraction.message !== null, 'Component interactions should have a message context');

  await btnInteraction.update({ content: 'Channel dikunci!' });
  assert.equal(btnInteraction.replied, true);

  // Select menu interaction
  const selectInteraction = createMockInteraction({
    type: 'select',
    customId: 'help-category-select',
    values: ['Moderation', 'Utility'],
  });
  assert.equal(selectInteraction.isStringSelectMenu(), true);
  assert.deepEqual(selectInteraction.values, ['Moderation', 'Utility']);

  // Modal interaction
  const modalInteraction = createMockInteraction({
    type: 'modal',
    customId: 'confession-modal-submit',
    fields: {
      content: 'Pesan rahasia untuk angkatan 2024',
      recipient: 'All Pacilites',
    },
  });
  assert.equal(modalInteraction.isModalSubmit(), true);
  assert.equal(modalInteraction.fields.getTextInputValue('content'), 'Pesan rahasia untuk angkatan 2024');
  assert.equal(modalInteraction.fields.getTextInputValue('recipient'), 'All Pacilites');
  assert.equal(modalInteraction.fields.getTextInputValue('unknown'), null);
});

// ============================================================================
// 4. MockDiscordClient Suite
// ============================================================================
test('MockDiscordClient: collections, bot user, login, uptime, and caches', async () => {
  const client = createMockClient({
    config: {
      bot: {
        id: 'bot-pacil-prod',
        name: 'Pacil Test Bot',
        token: 'test-token-123',
      },
    },
  });

  // Verify collections
  assert.ok(client.commands instanceof Map);
  assert.ok(client.buttons instanceof Map);
  assert.ok(client.selectMenus instanceof Map);
  assert.ok(client.modals instanceof Map);
  assert.ok(client.events instanceof Map);

  // Bot user & status
  assert.equal(client.user.id, 'bot-pacil-prod');
  assert.equal(client.user.bot, true);
  assert.equal(client.isReady(), true);
  assert.ok(client.uptime >= 0);
  assert.ok(client.readyAt instanceof Date);

  // Login event
  let readyFired = false;
  client.on('ready', (c) => {
    readyFired = true;
    assert.equal(c.user.id, 'bot-pacil-prod');
  });
  const token = await client.login();
  assert.equal(token, 'test-token-123');
  assert.equal(readyFired, true);

  // Cache fetching across guilds
  const defaultChannel = client.channels.cache.first();
  assert.ok(defaultChannel);
  const fetchedChan = await client.channels.fetch(defaultChannel.id);
  assert.equal(fetchedChan.id, defaultChannel.id);

  const fetchedUser = await client.users.fetch(client.user.id);
  assert.equal(fetchedUser.id, client.user.id);

  client.destroy();
});

test('MockDiscordClient: command dispatch with guild config resolution', async () => {
  const client = createMockClient();

  // Set up guild config in client.db
  await client.db.set(`guild:${client.defaultGuild.id}:config`, {
    prefix: '!',
    moderation: { autoKick: true },
  });

  // Register a mock command
  let executedArgs = null;
  client.registerMockCommand({
    name: 'stats',
    category: 'Utility',
    execute: async (interaction, config, c) => {
      executedArgs = { interaction, config, c };
      await interaction.reply({ content: `Prefix: ${config.prefix}` });
      return 'stats-success';
    },
  });

  const interaction = client.createInteraction({ commandName: 'stats' });
  const result = await client.dispatchCommand(interaction);

  assert.equal(result, 'stats-success');
  assert.equal(executedArgs.config.prefix, '!');
  assert.equal(executedArgs.config.moderation.autoKick, true);
  assert.equal(interaction.replies[0].content, 'Prefix: !');

  // Overriding guildConfig explicitly
  const customInteraction = client.createInteraction({ commandName: 'stats' });
  await client.dispatchCommand(customInteraction, { prefix: '?' });
  assert.equal(customInteraction.replies[0].content, 'Prefix: ?');

  // Command not found error
  const unknownInteraction = client.createInteraction({ commandName: 'nonexistent' });
  await assert.rejects(
    () => client.dispatchCommand(unknownInteraction),
    /No command matching \/nonexistent was found/
  );
});

test('MockDiscordClient: component dispatch for buttons, select menus, and modals', async () => {
  const client = createMockClient();

  // 1. Button with colon arguments
  let buttonProcessed = null;
  client.registerMockButton({
    name: 'voice_action',
    execute: async (interaction, c, args) => {
      buttonProcessed = { interaction, args };
      await interaction.reply({ content: `Action: ${args[0]} on target: ${args[1]}` });
    },
  });

  const btnInteraction = client.createInteraction({
    type: 'button',
    customId: 'voice_action:mute:user_99',
  });
  await client.dispatchComponent(btnInteraction);

  assert.deepEqual(buttonProcessed.args, ['mute', 'user_99']);
  assert.equal(btnInteraction.replies[0].content, 'Action: mute on target: user_99');

  // 2. Select Menu
  let selectProcessed = null;
  client.registerMockSelectMenu({
    name: 'help-category-select',
    execute: async (interaction, c) => {
      selectProcessed = interaction.values;
      await interaction.update({ content: `Category: ${interaction.values[0]}` });
    },
  });

  const selectInteraction = client.createInteraction({
    type: 'select',
    customId: 'help-category-select',
    values: ['Music'],
  });
  await client.dispatchComponent(selectInteraction);
  assert.deepEqual(selectProcessed, ['Music']);

  // 3. Modal Submit
  let modalValue = null;
  client.registerMockModal({
    name: 'feedback_form',
    execute: async (interaction, c) => {
      modalValue = interaction.fields.getTextInputValue('comment');
      await interaction.reply({ content: 'Terima kasih atas masukannya!' });
    },
  });

  const modalInteraction = client.createInteraction({
    type: 'modal',
    customId: 'feedback_form',
    fields: { comment: 'Bot Pacil sangat membantu mahasiswa' },
  });
  await client.dispatchComponent(modalInteraction);
  assert.equal(modalValue, 'Bot Pacil sangat membantu mahasiswa');

  // 4. Unknown component error
  const unhandledInteraction = client.createInteraction({
    type: 'button',
    customId: 'unhandled_button',
  });
  await assert.rejects(
    () => client.dispatchComponent(unhandledInteraction),
    /No button handler found for unhandled_button/
  );
});

test('MockDiscordClient: registerMockEvent and event lifecycle', async () => {
  const client = createMockClient();

  let onceCount = 0;
  client.registerMockEvent({
    name: 'guildMemberAdd',
    once: true,
    execute: (member, c) => {
      onceCount++;
    },
  });

  let regularCount = 0;
  client.registerMockEvent({
    name: 'customSignal',
    execute: (payload, c) => {
      regularCount++;
    },
  });

  client.emit('guildMemberAdd', { id: 'm1' });
  client.emit('guildMemberAdd', { id: 'm2' });
  assert.equal(onceCount, 1, 'once: true must only trigger once');

  client.emit('customSignal', { data: 1 });
  client.emit('customSignal', { data: 2 });
  assert.equal(regularCount, 2);
});

test('assertValidPng: validates genuine 8-byte PNG header and enforces byte thresholds', () => {
  // Construct genuine PNG buffer signature: 89 50 4E 47 0D 0A 1A 0A followed by dummy data
  const validPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const validPngBuffer = Buffer.concat([validPngHeader, Buffer.alloc(1024, 0xff)]);

  // Valid PNG assertion passes
  assert.equal(assertValidPng(validPngBuffer, 1000), true);

  // Invalid magic bytes
  const badHeaderBuffer = Buffer.from([0x00, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  assert.throws(() => assertValidPng(badHeaderBuffer, 5), /PNG magic byte 0 must be 0x89/);

  // Undersized buffer
  assert.throws(
    () => assertValidPng(validPngBuffer, 5000),
    /is below minimum threshold/
  );

  // Non-buffer input
  assert.throws(
    () => assertValidPng('not-a-buffer', 10),
    /Output must be a Buffer instance/
  );
});

