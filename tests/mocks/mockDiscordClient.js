/**
 * MockDiscordClient - In-memory Discord Client simulator extending EventEmitter.
 * Replicates Discord.js Client collections, interaction dispatchers, and database connections.
 */

import { EventEmitter } from 'node:events';
import assert from 'node:assert/strict';
import { Collection } from 'discord.js';
import { MockDatabase } from './mockDatabase.js';
import {
  MockUser,
  MockGuild,
  MockChannel,
  MockRole,
  MockGuildMember,
} from './mockDiscordEntities.js';
import { MockInteraction } from './mockInteraction.js';

export class MockDiscordClient extends EventEmitter {
  constructor({
    config = {},
    db = null,
    botUser = null,
    defaultGuild = null,
  } = {}) {
    super();

    this.config = {
      bot: {
        id: 'mock-bot-id',
        token: 'mock-bot-token',
        name: 'Pacil Baik Bot',
      },
      ...config,
    };

    // Discord.js Collections
    this.commands = new Collection();
    this.events = new Collection();
    this.buttons = new Collection();
    this.selectMenus = new Collection();
    this.modals = new Collection();
    this.cooldowns = new Collection();

    // Database
    this.db = db || new MockDatabase();

    // Current Client User (Bot)
    this.user = botUser instanceof MockUser
      ? botUser
      : new MockUser({
        id: this.config.bot.id || 'mock-bot-id',
        username: this.config.bot.name || 'PacilBaikBot',
        bot: true,
        avatar: 'mock_bot_avatar',
      });

    this._readyTimestamp = Date.now();

    // Caches
    const guildsCache = new Collection();
    const channelsCache = new Collection();
    const usersCache = new Collection();

    this.guilds = {
      cache: guildsCache,
      fetch: async (id) => guildsCache.get(String(id)) || null,
    };

    this.channels = {
      cache: channelsCache,
      fetch: async (id) => {
        const key = String(id);
        const cached = channelsCache.get(key);
        if (cached) return cached;
        for (const guild of guildsCache.values()) {
          const gChan = guild.channels?.cache?.get(key);
          if (gChan) {
            channelsCache.set(key, gChan);
            return gChan;
          }
        }
        return null;
      },
    };

    this.users = {
      cache: usersCache,
      fetch: async (id) => {
        const key = String(id);
        const cached = usersCache.get(key);
        if (cached) return cached;
        for (const guild of guildsCache.values()) {
          const gMember = guild.members?.cache?.get(key);
          if (gMember?.user) {
            usersCache.set(key, gMember.user);
            return gMember.user;
          }
        }
        return null;
      },
    };

    // Register bot user in user cache
    usersCache.set(this.user.id, this.user);

    // Default Guild
    this.defaultGuild = defaultGuild instanceof MockGuild
      ? defaultGuild
      : new MockGuild({
        id: 'mock-guild-1',
        name: 'Pacil Fasilkom UI',
        client: this,
      });

    this.defaultGuild.client = this;
    guildsCache.set(this.defaultGuild.id, this.defaultGuild);

    // Populate channelsCache from defaultGuild channels, or create default text channel
    if (this.defaultGuild.channels.cache.size === 0) {
      const defaultChannel = this.defaultGuild.addMockChannel({
        id: 'mock-channel-1',
        name: 'general',
        type: 0,
      });
      channelsCache.set(defaultChannel.id, defaultChannel);
    } else {
      for (const [cId, chan] of this.defaultGuild.channels.cache.entries()) {
        channelsCache.set(cId, chan);
      }
    }

    // Mock Websocket & REST
    this.ws = { ping: 42, status: 0 };
    this.rest = {
      put: async () => [],
      get: async () => ({}),
      post: async () => ({}),
      delete: async () => ({}),
    };
  }

  isReady() {
    return true;
  }

  get uptime() {
    return Date.now() - this._readyTimestamp;
  }

  get readyAt() {
    return new Date(this._readyTimestamp);
  }

  /**
   * Simulates client login, sets token, and emits ready event.
   */
  async login(token) {
    this.token = token || this.config.bot?.token || 'mock-bot-token';
    this.emit('ready', this);
    return this.token;
  }

  /**
   * Helper to quickly create a mock interaction attached to this client.
   */
  createInteraction(options = {}) {
    const guild = options.guild || this.defaultGuild;
    const channel = options.channel || this.channels.cache.first() || (guild?.channels?.cache ? guild.channels.cache.first() : null);
    return new MockInteraction({
      client: this,
      guild,
      channel,
      ...options,
    });
  }

  /**
   * Register a mock slash command.
   */
  registerMockCommand({ name, execute, data = null, category = 'Core' }) {
    const cmd = {
      data: data || {
        name,
        description: `Mock command ${name}`,
        toJSON: () => ({ name, description: `Mock command ${name}` }),
      },
      category,
      execute,
    };
    this.commands.set(name, cmd);
    return cmd;
  }

  /**
   * Register a mock button component handler.
   */
  registerMockButton({ customId, name = null, execute }) {
    const key = name || (customId.includes(':') ? customId.split(':')[0] : customId);
    const handler = { name: key, customId, execute };
    this.buttons.set(key, handler);
    return handler;
  }

  /**
   * Register a mock select menu component handler.
   */
  registerMockSelectMenu({ customId, name = null, execute }) {
    const key = name || (customId.includes(':') ? customId.split(':')[0] : customId);
    const handler = { name: key, customId, execute };
    this.selectMenus.set(key, handler);
    return handler;
  }

  /**
   * Register a mock modal submit handler.
   */
  registerMockModal({ customId, name = null, execute }) {
    const key = name || (customId.includes(':') ? customId.split(':')[0] : customId);
    const handler = { name: key, customId, execute };
    this.modals.set(key, handler);
    return handler;
  }

  /**
   * Register a mock event handler.
   */
  registerMockEvent({ name, once = false, execute }) {
    const handler = { name, once, execute };
    this.events.set(name, handler);
    if (once) {
      this.once(name, (...args) => execute(...args, this));
    } else {
      this.on(name, (...args) => execute(...args, this));
    }
    return handler;
  }

  /**
   * Dispatches a ChatInputCommand interaction through the registered command pipeline.
   */
  async dispatchCommand(interaction, guildConfig = null) {
    if (!interaction) {
      throw new Error('Interaction is required for dispatchCommand');
    }

    const command = this.commands.get(interaction.commandName);
    if (!command) {
      throw new Error(`No command matching /${interaction.commandName} was found.`);
    }

    let config = guildConfig;
    if (!config && interaction.guildId) {
      config = await this.db.get(`guild:${interaction.guildId}:config`, {});
    }

    return await command.execute(interaction, config || {}, this);
  }

  /**
   * Dispatches a component interaction (button, select menu, modal) to its registered handler.
   */
  async dispatchComponent(interaction) {
    if (!interaction) {
      throw new Error('Interaction is required for dispatchComponent');
    }

    let registry = null;
    let kind = null;

    if (interaction.isButton()) {
      registry = 'buttons';
      kind = 'button';
    } else if (interaction.isAnySelectMenu()) {
      registry = 'selectMenus';
      kind = 'select menu';
    } else if (interaction.isModalSubmit()) {
      registry = 'modals';
      kind = 'modal';
    } else {
      throw new Error('Interaction is not a button, select menu, or modal submit');
    }

    const customId = interaction.customId || '';
    const [name, ...args] = customId.split(':');

    // Check direct customId match, then prefix name match
    const handler = this[registry].get(customId) || this[registry].get(name);
    if (!handler) {
      throw new Error(`No ${kind} handler found for ${customId || name}`);
    }

    return await handler.execute(interaction, this, args);
  }

  destroy() {
    this.removeAllListeners();
    this.commands.clear();
    this.buttons.clear();
    this.selectMenus.clear();
    this.modals.clear();
    this.events.clear();
    this.cooldowns.clear();
    this.guilds.cache.clear();
    this.channels.cache.clear();
    this.users.cache.clear();
  }
}

/**
 * Validates that a buffer contains a genuine PNG image.
 * Verifies 8-byte PNG signature: 89 50 4E 47 0D 0A 1A 0A
 */
export function assertValidPng(buffer, minBytes = 1000) {
  assert.ok(Buffer.isBuffer(buffer), 'Output must be a Buffer instance');
  assert.ok(
    buffer.length >= minBytes,
    `PNG buffer size (${buffer.length} bytes) is below minimum threshold (${minBytes} bytes)`
  );
  assert.equal(buffer[0], 0x89, 'PNG magic byte 0 must be 0x89');
  assert.equal(buffer[1], 0x50, 'PNG magic byte 1 must be 0x50 (P)');
  assert.equal(buffer[2], 0x4E, 'PNG magic byte 2 must be 0x4E (N)');
  assert.equal(buffer[3], 0x47, 'PNG magic byte 3 must be 0x47 (G)');
  assert.equal(buffer[4], 0x0D, 'PNG magic byte 4 must be 0x0D (\\r)');
  assert.equal(buffer[5], 0x0A, 'PNG magic byte 5 must be 0x0A (\\n)');
  assert.equal(buffer[6], 0x1A, 'PNG magic byte 6 must be 0x1A');
  assert.equal(buffer[7], 0x0A, 'PNG magic byte 7 must be 0x0A (\\n)');
  return true;
}

/**
 * Factory helper for MockDiscordClient
 */
export function createMockClient(options = {}) {
  return new MockDiscordClient(options);
}

export default MockDiscordClient;
