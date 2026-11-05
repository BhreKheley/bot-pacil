/**
 * MockInteraction - Full-fidelity Discord.js Interaction mock for Pacil-Bot offline test suite.
 * Supports ChatInputCommand, Button, SelectMenu, and ModalSubmit interactions.
 */

import { Collection } from 'discord.js';
import {
  MockUser,
  MockGuildMember,
  MockRole,
  MockChannel,
  MockGuild,
} from './mockDiscordEntities.js';

export class MockInteraction {
  constructor({
    id = null,
    commandName = 'help',
    subcommand = null,
    subcommandGroup = null,
    options = {},
    customId = null,
    values = [],
    fields = {},
    user = null,
    member = null,
    guild = null,
    channel = null,
    client = null,
    type = 'command', // 'command' | 'button' | 'select' | 'modal' | 'autocomplete'
  } = {}) {
    this.id = id || `mock-interaction-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.applicationId = client?.user?.id || 'mock-app-id';
    this.commandName = commandName;
    this.customId = customId;
    this.values = Array.isArray(values) ? [...values] : [];
    this._type = type;

    this._options = typeof options === 'object' && options !== null ? { ...options } : {};
    this._subcommand = subcommand;
    this._subcommandGroup = subcommandGroup;
    this._fields = typeof fields === 'object' && fields !== null ? { ...fields } : {};

    // Client reference
    this.client = client;

    // Entities initialization
    this.guild = guild instanceof MockGuild ? guild : new MockGuild(guild || { id: 'mock-guild-1', name: 'Pacil Fasilkom UI' });
    this.guildId = this.guild.id;

    if (user instanceof MockUser) {
      this.user = user;
    } else if (typeof user === 'object' && user !== null) {
      this.user = new MockUser(user);
    } else {
      this.user = new MockUser({ id: 'mock-user-1', username: 'PacilUser' });
    }

    if (member instanceof MockGuildMember) {
      this.member = member;
    } else if (typeof member === 'object' && member !== null) {
      this.member = new MockGuildMember({ guild: this.guild, user: this.user, ...member });
    } else {
      this.member = new MockGuildMember({ guild: this.guild, user: this.user });
    }

    // Ensure member exists in guild.members.cache
    if (this.guild?.members?.cache && !this.guild.members.cache.has(this.member.id)) {
      this.guild.members.cache.set(this.member.id, this.member);
    }

    if (channel instanceof MockChannel) {
      this.channel = channel;
    } else if (typeof channel === 'object' && channel !== null) {
      this.channel = new MockChannel({ guild: this.guild, ...channel });
    } else {
      this.channel = new MockChannel({ id: 'mock-channel-1', name: 'general', guild: this.guild });
    }
    this.channelId = this.channel.id;

    if (this.guild?.channels?.cache && !this.guild.channels.cache.has(this.channel.id)) {
      this.guild.channels.cache.set(this.channel.id, this.channel);
    }

    this.createdTimestamp = options.createdTimestamp || Date.now();
    this.createdAt = new Date(this.createdTimestamp);

    // Message context for component interactions
    this.message = options.message || (this.isButton() || this.isStringSelectMenu() ? {
      id: `msg-${Date.now()}`,
      channelId: this.channelId,
      guildId: this.guildId,
      content: '',
      embeds: [],
      components: [],
    } : null);

    // Lifecycle state & assertion trackers
    this.deferred = false;
    this.replied = false;
    this.ephemeral = false;

    this.replies = [];
    this.edits = [];
    this.followUps = [];
    this.modals = [];
    this.files = [];
    this.calls = [];
  }

  // Type identification predicates
  isChatInputCommand() {
    return this._type === 'command';
  }

  isCommand() {
    return this._type === 'command';
  }

  isButton() {
    return this._type === 'button';
  }

  isStringSelectMenu() {
    return this._type === 'select' || this._type === 'string_select';
  }

  isUserSelectMenu() {
    return this._type === 'user_select';
  }

  isRoleSelectMenu() {
    return this._type === 'role_select';
  }

  isChannelSelectMenu() {
    return this._type === 'channel_select';
  }

  isMentionableSelectMenu() {
    return this._type === 'mentionable_select';
  }

  isAnySelectMenu() {
    return this._type === 'select' || this._type.includes('select');
  }

  isModalSubmit() {
    return this._type === 'modal';
  }

  isAutocomplete() {
    return this._type === 'autocomplete';
  }

  isFromMessage() {
    return true;
  }

  isRepliable() {
    return true;
  }

  inGuild() {
    return Boolean(this.guildId);
  }

  // Options getters
  get options() {
    const getRaw = (name, required = false) => {
      const val = this._options[name];
      if ((val === undefined || val === null) && required) {
        throw new Error(`Missing required option "${name}"`);
      }
      return val ?? null;
    };

    return {
      getString: (name, required = false) => {
        const val = getRaw(name, required);
        return val !== null ? String(val) : null;
      },
      getInteger: (name, required = false) => {
        const val = getRaw(name, required);
        return val !== null ? parseInt(val, 10) : null;
      },
      getNumber: (name, required = false) => {
        const val = getRaw(name, required);
        return val !== null ? Number(val) : null;
      },
      getBoolean: (name, required = false) => {
        const val = getRaw(name, required);
        return val !== null ? Boolean(val) : null;
      },
      getUser: (name, required = false) => {
        const val = getRaw(name, required);
        if (!val) return null;
        if (val instanceof MockUser) return val;
        return new MockUser(typeof val === 'object' ? val : { id: String(val) });
      },
      getMember: (name, required = false) => {
        const val = getRaw(name, required);
        if (!val) return null;
        if (val instanceof MockGuildMember) return val;
        const u = val instanceof MockUser ? val : new MockUser(typeof val === 'object' ? val : { id: String(val) });
        return new MockGuildMember({ user: u, guild: this.guild });
      },
      getRole: (name, required = false) => {
        const val = getRaw(name, required);
        if (!val) return null;
        if (val instanceof MockRole) return val;
        return new MockRole(typeof val === 'object' ? { guild: this.guild, ...val } : { id: String(val), name: String(val), guild: this.guild });
      },
      getChannel: (name, required = false) => {
        const val = getRaw(name, required);
        if (!val) return null;
        if (val instanceof MockChannel) return val;
        return new MockChannel(typeof val === 'object' ? { guild: this.guild, ...val } : { id: String(val), name: String(val), guild: this.guild });
      },
      getMentionable: (name, required = false) => getRaw(name, required),
      getAttachment: (name, required = false) => getRaw(name, required),
      getSubcommand: (required = false) => {
        if (!this._subcommand && required) {
          throw new Error('Missing required subcommand');
        }
        return this._subcommand ?? null;
      },
      getSubcommandGroup: () => this._subcommandGroup ?? null,
      getFocused: (full = false) => {
        const focused = this._options.focused ?? '';
        return full ? { name: this._options.focusedName || 'focused', value: focused } : focused;
      },
      data: Object.entries(this._options).map(([name, value]) => ({ name, value })),
    };
  }

  // Modal fields accessor
  get fields() {
    return {
      getTextInputValue: (fieldCustomId) => this._fields[fieldCustomId] ?? null,
      fields: new Collection(
        Object.entries(this._fields).map(([k, v]) => [k, { customId: k, value: v }])
      ),
    };
  }

  _recordFiles(payload) {
    if (payload && Array.isArray(payload.files)) {
      for (const f of payload.files) {
        this.files.push(f);
      }
    }
  }

  _normalizePayload(payload) {
    if (typeof payload === 'string') {
      return { content: payload };
    }
    return { ...(payload || {}) };
  }

  // Interaction response actions
  async deferReply(opts = {}) {
    this.deferred = true;
    if (opts.ephemeral || opts.flags) {
      this.ephemeral = true;
    }
    this.calls.push(['deferReply', opts]);
    return { deferred: true };
  }

  async reply(payload) {
    this.replied = true;
    const normalized = this._normalizePayload(payload);
    if (normalized.ephemeral || normalized.flags) {
      this.ephemeral = true;
    }
    this._recordFiles(normalized);
    this.replies.push(normalized);
    this.calls.push(['reply', normalized]);
    return {
      id: `mock-reply-${this.replies.length}`,
      ...normalized,
      edit: async (opts) => this.editReply(opts),
      delete: async () => this.deleteReply(),
    };
  }

  async editReply(payload) {
    const normalized = this._normalizePayload(payload);
    this._recordFiles(normalized);
    this.edits.push(normalized);
    this.calls.push(['editReply', normalized]);
    return { id: `mock-edit-${this.edits.length}`, ...normalized };
  }

  async followUp(payload) {
    const normalized = this._normalizePayload(payload);
    this._recordFiles(normalized);
    this.followUps.push(normalized);
    this.calls.push(['followUp', normalized]);
    return { id: `mock-followup-${this.followUps.length}`, ...normalized };
  }

  async showModal(modal) {
    this.modals.push(modal);
    this.calls.push(['showModal', modal]);
    return true;
  }

  async update(payload) {
    this.replied = true;
    const normalized = this._normalizePayload(payload);
    this._recordFiles(normalized);
    this.calls.push(['update', normalized]);
    return normalized;
  }

  async deferUpdate() {
    this.deferred = true;
    this.calls.push(['deferUpdate']);
    return { deferred: true };
  }

  async deleteReply() {
    this.calls.push(['deleteReply']);
    return true;
  }

  async fetchReply() {
    const last = this.edits[this.edits.length - 1]
      || this.replies[this.replies.length - 1]
      || { id: 'mock-reply-msg', content: '' };
    return { id: 'mock-reply-msg', ...last };
  }
}

export function createMockInteraction(options = {}) {
  return new MockInteraction(options);
}

export default MockInteraction;
