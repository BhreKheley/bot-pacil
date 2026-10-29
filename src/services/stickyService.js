// Sticky message: pesan embed Pacil yang selalu dipost ulang di bagian bawah channel.

import { pacilPanel } from '../ui/pacil.js';
import { Mutex } from '../utils/mutex.js';
import { logger } from '../utils/logger.js';
import { createStickyScheduler, stickyCacheKey } from './stickyLogic.js';

export const stickyKey = (guildId, channelId) => `guild:${guildId}:sticky:${channelId}`;
export const stickyIndexKey = (guildId) => `guild:${guildId}:sticky:index`;

// null = sudah dicek dan tidak ada sticky; undefined = belum dicek.
const cache = new Map();
const scheduler = createStickyScheduler();

export async function getSticky(client, guildId, channelId) {
  const cacheKey = stickyCacheKey(guildId, channelId);
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const sticky = (await client.db.get(stickyKey(guildId, channelId), null)) || null;
  cache.set(cacheKey, sticky);
  return sticky;
}

async function readIndex(client, guildId) {
  const index = await client.db.get(stickyIndexKey(guildId), []);
  return Array.isArray(index) ? index : [];
}

export async function listStickies(client, guildId) {
  const ids = await readIndex(client, guildId);
  const stickies = [];
  for (const channelId of ids) {
    const sticky = await getSticky(client, guildId, channelId);
    if (sticky) stickies.push(sticky);
  }
  return stickies;
}

export async function countStickies(client, guildId) {
  return (await readIndex(client, guildId)).length;
}

/** Simpan (atau perbarui) sticky satu channel. `data` = { title, content, color }. */
export async function saveSticky(client, guildId, channelId, data, userId) {
  const existing = await getSticky(client, guildId, channelId);
  const sticky = {
    guildId,
    channelId,
    title: data.title,
    content: data.content,
    color: data.color,
    messageId: existing?.messageId ?? null,
    createdBy: existing?.createdBy ?? userId,
    updatedBy: userId,
    updatedAt: Date.now(),
  };
  await client.db.set(stickyKey(guildId, channelId), sticky);
  const index = await readIndex(client, guildId);
  if (!index.includes(channelId)) await client.db.set(stickyIndexKey(guildId), [...index, channelId]);
  cache.set(stickyCacheKey(guildId, channelId), sticky);
  return sticky;
}

/** Hapus sticky dari penyimpanan. Pesan terakhir di channel dihapus bila channel diberikan. */
export async function removeSticky(client, guildId, channelId, channel = null) {
  const existing = await getSticky(client, guildId, channelId);
  if (!existing) return false;
  scheduler.cancel(stickyCacheKey(guildId, channelId));
  if (channel?.messages && existing.messageId) {
    await channel.messages.delete(existing.messageId).catch(() => {});
  }
  await client.db.delete(stickyKey(guildId, channelId));
  const index = await readIndex(client, guildId);
  await client.db.set(stickyIndexKey(guildId), index.filter((id) => id !== channelId));
  cache.set(stickyCacheKey(guildId, channelId), null);
  return true;
}

export function buildStickyEmbed(sticky) {
  return pacilPanel({
    title: sticky.title || 'Pesan Tersemat',
    icon: '📌',
    description: sticky.content,
    color: sticky.color || undefined,
    tone: 'accent',
    footer: 'Sticky • Pacil Baik',
  });
}

/** Hapus sticky lama lalu post yang baru di bawah channel. Aman dipanggil bersamaan. */
export async function repostSticky(client, channel) {
  if (!channel?.guild) return null;
  const guildId = channel.guild.id;
  return Mutex.runExclusive(`sticky:${guildId}:${channel.id}`, async () => {
    const sticky = await getSticky(client, guildId, channel.id);
    if (!sticky) return null;
    if (sticky.messageId) await channel.messages.delete(sticky.messageId).catch(() => {});
    try {
      const posted = await channel.send({ embeds: [buildStickyEmbed(sticky)], allowedMentions: { parse: [] } });
      const updated = { ...sticky, messageId: posted.id };
      await client.db.set(stickyKey(guildId, channel.id), updated);
      cache.set(stickyCacheKey(guildId, channel.id), updated);
      return posted;
    } catch (error) {
      logger.warn(`Sticky gagal diposting di channel ${channel.id} (guild ${guildId}): ${error.message}`);
      return null;
    }
  });
}

/** Dipanggil dari messageCreate: jadwalkan repost jika channel punya sticky. */
export async function handleStickyMessage(message, client) {
  if (!message.guild || !message.channel) return;
  const sticky = await getSticky(client, message.guild.id, message.channel.id);
  if (!sticky) return;
  scheduler.schedule(stickyCacheKey(message.guild.id, message.channel.id), () => repostSticky(client, message.channel));
}
