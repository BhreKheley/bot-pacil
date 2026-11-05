/**
 * MockDiscordEntities - Comprehensive mock implementations of Discord.js entities
 * for Pacil-Bot offline test suites.
 */

import { Collection } from 'discord.js';

export { Collection };

/**
 * Mock Discord User
 */
export class MockUser {
  constructor({
    id = 'mock-user-1',
    username = 'PacilUser',
    discriminator = '0',
    tag = null,
    bot = false,
    avatar = 'mock_avatar_hash',
    createdTimestamp = Date.now() - 10_000_000,
  } = {}) {
    this.id = String(id);
    this.username = username;
    this.discriminator = String(discriminator);
    this.bot = Boolean(bot);
    this.avatar = avatar;
    this.createdTimestamp = createdTimestamp;
    this.createdAt = new Date(createdTimestamp);
    this._explicitTag = tag;
  }

  get tag() {
    if (this._explicitTag) return this._explicitTag;
    return this.discriminator === '0' || !this.discriminator
      ? this.username
      : `${this.username}#${this.discriminator}`;
  }

  displayAvatarURL({ extension = 'png', size = 512, forceStatic = false } = {}) {
    if (!this.avatar) {
      return this.defaultAvatarURL;
    }
    return `https://cdn.discordapp.com/avatars/${this.id}/${this.avatar}.${extension}?size=${size}`;
  }

  avatarURL(options) {
    return this.displayAvatarURL(options);
  }

  get defaultAvatarURL() {
    return 'https://cdn.discordapp.com/embed/avatars/0.png';
  }

  setPresence(presence) {
    this.presence = presence;
    return presence;
  }

  setActivity(name, options = {}) {
    this.activity = { name, ...options };
    return this.activity;
  }

  toString() {
    return `<@${this.id}>`;
  }

  async send(payload) {
    const message = {
      id: `dm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      channelId: `dm-channel-${this.id}`,
      author: this,
      content: typeof payload === 'string' ? payload : (payload?.content ?? ''),
      embeds: payload?.embeds ?? [],
      components: payload?.components ?? [],
      files: payload?.files ?? [],
      createdTimestamp: Date.now(),
    };
    return message;
  }
}

/**
 * Mock Discord Role
 */
export class MockRole {
  constructor({
    id = 'mock-role-1',
    name = '@everyone',
    color = 0,
    hexColor = null,
    position = 0,
    permissions = ['SendMessages', 'ViewChannel'],
    guild = null,
  } = {}) {
    this.id = String(id);
    this.name = name;
    this.color = Number(color) || 0;
    this._hexColor = hexColor;
    this.position = Number(position) || 0;
    this.guild = guild;
    this._permissionsArray = Array.isArray(permissions) ? [...permissions] : ['SendMessages', 'ViewChannel'];

    this.permissions = {
      has: (perm) => {
        if (this._permissionsArray.includes('Administrator')) return true;
        return this._permissionsArray.includes(perm);
      },
      missing: (perms) => {
        const check = Array.isArray(perms) ? perms : [perms];
        return check.filter((p) => !this.permissions.has(p));
      },
      toArray: () => [...this._permissionsArray],
    };
  }

  get hexColor() {
    if (this._hexColor) return this._hexColor;
    return `#${this.color.toString(16).padStart(6, '0')}`;
  }

  async setColor(color) {
    this.color = typeof color === 'string' ? parseInt(color.replace('#', ''), 16) : Number(color);
    this._hexColor = null;
    return this;
  }

  async setColors({ primary, secondary = null } = {}) {
    if (primary !== undefined) {
      this.color = typeof primary === 'string' ? parseInt(primary.replace('#', ''), 16) : Number(primary);
    }
    this.secondaryColor = secondary;
    return this;
  }

  async setName(name) {
    this.name = String(name);
    return this;
  }

  async delete() {
    if (this.guild?.roles?.cache) {
      this.guild.roles.cache.delete(this.id);
    }
    return this;
  }

  toString() {
    return `<@&${this.id}>`;
  }
}

/**
 * Mock Discord Channel (Text, Voice, Threads, Categories)
 */
export class MockChannel {
  constructor({
    id = 'mock-channel-1',
    name = 'general',
    type = 0, // 0: GuildText, 2: GuildVoice, 4: GuildCategory, 11/12: Threads
    guild = null,
    parentId = null,
    topic = null,
    bitrate = 64000,
    userLimit = 0,
  } = {}) {
    this.id = String(id);
    this.name = name;
    this.type = Number(type);
    this.guild = guild;
    this.guildId = guild?.id ?? null;
    this.parentId = parentId;
    this.topic = topic;
    this.bitrate = Number(bitrate);
    this.userLimit = Number(userLimit);
    this.messages = [];
  }

  isTextBased() {
    return this.type !== 2 && this.type !== 13;
  }

  isSendable() {
    return this.isTextBased();
  }

  isVoiceBased() {
    return this.type === 2 || this.type === 13;
  }

  isThread() {
    return this.type === 11 || this.type === 12;
  }

  permissionsFor(memberOrRole) {
    return {
      has: (perm) => true,
      missing: () => [],
      toArray: () => ['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles'],
    };
  }

  async send(payload) {
    const normalized = typeof payload === 'string' ? { content: payload } : { ...payload };
    const message = {
      id: `msg-${Date.now()}-${this.messages.length + 1}`,
      channelId: this.id,
      guildId: this.guildId,
      content: normalized.content ?? '',
      embeds: normalized.embeds ?? [],
      components: normalized.components ?? [],
      files: normalized.files ?? [],
      createdTimestamp: Date.now(),
      delete: async () => {
        const idx = this.messages.indexOf(message);
        if (idx !== -1) this.messages.splice(idx, 1);
        return message;
      },
      edit: async (newPayload) => {
        const update = typeof newPayload === 'string' ? { content: newPayload } : newPayload;
        Object.assign(message, update);
        return message;
      },
    };

    this.messages.push(message);
    return message;
  }

  async setName(name) {
    this.name = String(name);
    return this;
  }

  async setUserLimit(limit) {
    this.userLimit = Number(limit);
    return this;
  }

  async setBitrate(bitrate) {
    this.bitrate = Number(bitrate);
    return this;
  }

  async delete() {
    if (this.guild?.channels?.cache) {
      this.guild.channels.cache.delete(this.id);
    }
    return this;
  }

  toString() {
    return `<#${this.id}>`;
  }
}

/**
 * Mock Discord Guild Member
 */
export class MockGuildMember {
  constructor({
    id = null,
    user = null,
    guild = null,
    displayName = null,
    nickname = null,
    joinedTimestamp = Date.now(),
    roles = [],
    voice = null,
    permissions = null,
  } = {}) {
    if (user instanceof MockUser) {
      this.user = user;
    } else if (typeof user === 'object' && user !== null) {
      this.user = new MockUser(user);
    } else {
      this.user = new MockUser({ id: id || 'mock-member-user-1' });
    }

    this.id = String(id || this.user.id);
    this.guild = guild;
    this.nickname = nickname;
    this.displayName = displayName || nickname || this.user.username;
    this.joinedTimestamp = joinedTimestamp;
    this.joinedAt = new Date(joinedTimestamp);

    // Roles collection & mutators
    const roleCollection = new Collection();
    if (Array.isArray(roles)) {
      for (const r of roles) {
        if (r instanceof MockRole) {
          roleCollection.set(r.id, r);
        } else if (typeof r === 'object' && r !== null) {
          const role = new MockRole(r);
          roleCollection.set(role.id, role);
        } else if (typeof r === 'string') {
          const role = new MockRole({ id: r, name: r, guild });
          roleCollection.set(role.id, role);
        }
      }
    }

    this.roles = {
      cache: roleCollection,
      add: async (roleOrId) => {
        const r = roleOrId instanceof MockRole
          ? roleOrId
          : (guild?.roles?.cache?.get(String(roleOrId)) || new MockRole({ id: String(roleOrId), guild }));
        roleCollection.set(r.id, r);
        return this;
      },
      remove: async (roleOrId) => {
        const idToRemove = typeof roleOrId === 'string' ? roleOrId : roleOrId?.id;
        roleCollection.delete(String(idToRemove));
        return this;
      },
      has: (roleOrId) => {
        const idToCheck = typeof roleOrId === 'string' ? roleOrId : roleOrId?.id;
        return roleCollection.has(String(idToCheck));
      },
      set: async (newRoles) => {
        roleCollection.clear();
        for (const r of newRoles) {
          const role = r instanceof MockRole ? r : new MockRole({ id: String(r), guild });
          roleCollection.set(role.id, role);
        }
        return this;
      },
      get highest() {
        let highest = null;
        for (const role of roleCollection.values()) {
          if (!highest || (role.position || 0) > (highest.position || 0)) {
            highest = role;
          }
        }
        return highest || new MockRole({ name: '@everyone', position: 0, guild });
      },
    };

    // Voice State
    this.voice = {
      channel: voice?.channel || null,
      channelId: voice?.channel?.id || voice?.channelId || null,
      mute: Boolean(voice?.mute),
      deaf: Boolean(voice?.deaf),
      setChannel: async (targetChannel) => {
        this.voice.channel = targetChannel;
        this.voice.channelId = targetChannel?.id ?? null;
        return this;
      },
      disconnect: async () => {
        this.voice.channel = null;
        this.voice.channelId = null;
        return this;
      },
      setMute: async (muted) => {
        this.voice.mute = Boolean(muted);
        return this;
      },
      setDeaf: async (deaf) => {
        this.voice.deaf = Boolean(deaf);
        return this;
      },
    };

    // Permissions
    this.permissions = permissions || {
      has: (perm) => true,
      missing: () => [],
      toArray: () => ['Administrator', 'ManageGuild', 'ViewChannel', 'SendMessages'],
    };
  }

  displayAvatarURL(options) {
    return this.user.displayAvatarURL(options);
  }

  async send(payload) {
    return this.user.send(payload);
  }

  async timeout(ms, reason) {
    this.communicationDisabledUntil = ms ? new Date(Date.now() + ms) : null;
    return this;
  }

  async kick(reason) {
    if (this.guild?.members?.cache) {
      this.guild.members.cache.delete(this.id);
      this.guild.memberCount = Math.max(0, this.guild.memberCount - 1);
    }
    return this;
  }

  async ban(options) {
    return this.kick(options?.reason);
  }

  async setNickname(nick) {
    this.nickname = nick;
    this.displayName = nick || this.user.username;
    return this;
  }

  toString() {
    return `<@${this.id}>`;
  }
}

/**
 * Mock Discord Guild
 */
export class MockGuild {
  constructor({
    id = 'mock-guild-1',
    name = 'Pacil Fasilkom UI',
    icon = 'mock_guild_icon',
    memberCount = 100,
    client = null,
  } = {}) {
    this.id = String(id);
    this.name = name;
    this.icon = icon;
    this.memberCount = Number(memberCount);
    this.client = client;

    // Sub-collections
    const membersCache = new Collection();
    const channelsCache = new Collection();
    const rolesCache = new Collection();

    const everyoneRole = new MockRole({ id: this.id, name: '@everyone', guild: this });
    rolesCache.set(everyoneRole.id, everyoneRole);

    const guildSelf = this;
    let explicitMe = null;
    this.members = {
      cache: membersCache,
      fetch: async (memberId) => membersCache.get(String(memberId)) || null,
      get me() {
        if (explicitMe) return explicitMe;
        if (guildSelf.client?.user) {
          const existing = membersCache.get(guildSelf.client.user.id);
          if (existing) return existing;
          const botMember = new MockGuildMember({
            user: guildSelf.client.user,
            guild: guildSelf,
            permissions: {
              has: () => true,
              missing: () => [],
              toArray: () => ['Administrator', 'ManageGuild', 'ViewChannel', 'SendMessages'],
            },
          });
          membersCache.set(botMember.id, botMember);
          return botMember;
        }
        return null;
      },
      set me(val) {
        explicitMe = val;
      },
    };

    this.channels = {
      cache: channelsCache,
      fetch: async (channelId) => channelsCache.get(String(channelId)) || null,
      create: async (data) => {
        const chan = new MockChannel({
          id: `channel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          guild: this,
          ...data,
        });
        channelsCache.set(chan.id, chan);
        return chan;
      },
    };

    this.roles = {
      cache: rolesCache,
      everyone: everyoneRole,
      fetch: async (roleId) => rolesCache.get(String(roleId)) || null,
      create: async (data) => {
        const role = new MockRole({
          id: `role-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          guild: this,
          ...data,
        });
        rolesCache.set(role.id, role);
        return role;
      },
    };

    this.commands = {
      cache: new Collection(),
      fetch: async () => this.commands.cache,
    };
  }

  iconURL({ extension = 'png', size = 512 } = {}) {
    if (!this.icon) return null;
    return `https://cdn.discordapp.com/icons/${this.id}/${this.icon}.${extension}?size=${size}`;
  }

  addMockMember(memberData = {}) {
    const member = memberData instanceof MockGuildMember
      ? memberData
      : new MockGuildMember({ guild: this, ...memberData });
    member.guild = this;
    this.members.cache.set(member.id, member);
    this.memberCount = this.members.cache.size;
    return member;
  }

  addMockChannel(channelData = {}) {
    const channel = channelData instanceof MockChannel
      ? channelData
      : new MockChannel({ guild: this, ...channelData });
    channel.guild = this;
    channel.guildId = this.id;
    this.channels.cache.set(channel.id, channel);
    return channel;
  }

  addMockRole(roleData = {}) {
    const role = roleData instanceof MockRole
      ? roleData
      : new MockRole({ guild: this, ...roleData });
    role.guild = this;
    this.roles.cache.set(role.id, role);
    return role;
  }
}

// Factory helper functions
export function createMockUser(data) {
  return new MockUser(data);
}

export function createMockRole(data) {
  return new MockRole(data);
}

export function createMockChannel(data) {
  return new MockChannel(data);
}

export function createMockMember(data) {
  return new MockGuildMember(data);
}

export function createMockGuild(data) {
  return new MockGuild(data);
}
