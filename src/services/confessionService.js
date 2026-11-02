import crypto from 'node:crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { pacilPanel, buildPacilEmbed } from '../ui/pacil.js';
import { t } from '../utils/i18n.js';
import { DEFAULT_REPLY_SETTINGS, shortId } from './confessionLogic.js';

const DEFAULT_CONFESSION_CONFIG = Object.freeze({
  enabled: false, channelId: null, reviewChannelId: null, moderatorRoleId: null,
  requireApproval: true, cooldownMinutes: 10,
  ...DEFAULT_REPLY_SETTINGS,
});

export function getConfessionConfig(guildConfig = {}) {
  return { ...DEFAULT_CONFESSION_CONFIG, ...(guildConfig.confessions || {}) };
}

export const confessionKey = (guildId, id) => `guild:${guildId}:confessions:${id}`;
export const confessionReplyKey = (guildId, id) => `guild:${guildId}:confessions:reply:${id}`;
export const confessionCooldownKey = (guildId, userId) => `guild:${guildId}:confessions:cooldown:${userId}`;
export const confessionReplyCooldownKey = (guildId, userId) => `guild:${guildId}:confessions:replycooldown:${userId}`;

export function newConfessionId() {
  return `${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`;
}

export function publicConfessionEmbed(confession, locale) {
  const fromText = confession.from?.trim() || 'Anonim';
  const toText = confession.to?.trim() || 'Warga Fasilkom UI';

  return buildPacilEmbed({
    title: '💌 Pacil Menfess',
    tone: 'gold',
    fields: [
      { name: '👤 Dari (From)', value: fromText, inline: true },
      { name: '🎯 Untuk (To)', value: toText, inline: true },
      { name: '💬 Pesan (Message)', value: confession.content, inline: false },
    ],
    footer: `Pacil Baik • #${shortId(confession.id)}`,
  });
}

export function reviewConfessionEmbed(confession, locale) {
  const fromText = confession.from?.trim() || 'Anonim';
  const toText = confession.to?.trim() || 'Warga Fasilkom UI';

  return buildPacilEmbed({
    title: '💌 Antrean Review Menfess',
    tone: 'warning',
    fields: [
      { name: '👤 Dari (Input Pengirim)', value: fromText, inline: true },
      { name: '🎯 Untuk (Target)', value: toText, inline: true },
      { name: '💬 Pesan', value: confession.content, inline: false },
      { name: '🔒 Pengirim Asli (Rahasia Moderator)', value: `<@${confession.authorId}> (\`${confession.authorId}\`)`, inline: false },
      { name: 'ID', value: `\`${confession.id}\``, inline: true },
    ],
    footer: 'Hanya moderator yang dapat melihat identitas asli pengirim.',
  });
}

/** Embed satu balasan di thread menfess. */
export function replyEmbed(reply, locale) {
  return pacilPanel({
    title: reply.label,
    description: reply.content,
    tone: 'accent',
    footer: `${t(locale, 'replyFooter')} • #${shortId(reply.id)}`,
  });
}

/** Tombol Balas yang menempel pada menfess terbit. */
export function replyButtonRow(confession, config, locale) {
  if (config.repliesEnabled === false) return [];
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`confessReply:${confession.id}`)
      .setLabel(t(locale, 'reply'))
      .setEmoji('💬')
      .setStyle(ButtonStyle.Secondary),
  )];
}

/**
 * Terbitkan menfess ke channel publik (dipakai alur langsung dan alur persetujuan).
 * Mengisi publishedMessageId / publishedChannelId pada objek menfess.
 */
export async function publishConfession(channel, confession, config, locale) {
  const published = await channel.send({
    embeds: [publicConfessionEmbed(confession, locale)],
    components: replyButtonRow(confession, config, locale),
    allowedMentions: { parse: [] },
  });
  confession.publishedMessageId = published.id;
  confession.publishedChannelId = channel.id;
  return published;
}

export const confessionShortKey = (guildId, short) => `guild:${guildId}:confessions:short:${short}`;

/** Catat ID pendek (yang tampil di footer) agar moderator bisa menelusuri tanpa ID lengkap. */
export async function registerShortId(client, guildId, kind, id) {
  const key = confessionShortKey(guildId, shortId(id));
  const list = (await client.db.get(key, [])) || [];
  if (!list.some((entry) => entry.id === id)) {
    list.push({ kind, id });
    await client.db.set(key, list.slice(-5));
  }
}

/** Cari menfess/balasan dari ID pendek (6 huruf) atau ID lengkap. Mengembalikan paling banyak 3 hasil. */
export async function findConfessionRecords(client, guildId, raw) {
  const text = String(raw ?? '').trim().replace(/^#/, '');
  if (!text) return [];
  const entries = [];
  if (text.length <= 8) {
    entries.push(...((await client.db.get(confessionShortKey(guildId, text.toUpperCase()), [])) || []));
  } else {
    for (const id of new Set([text, text.toLowerCase()])) {
      const confession = await client.db.get(confessionKey(guildId, id), null);
      if (confession) { entries.push({ kind: 'confession', id }); break; }
      const reply = await client.db.get(confessionReplyKey(guildId, id), null);
      if (reply) { entries.push({ kind: 'reply', id }); break; }
    }
  }
  const results = [];
  for (const { kind, id } of entries.slice(0, 3)) {
    const record = await client.db.get(kind === 'reply' ? confessionReplyKey(guildId, id) : confessionKey(guildId, id), null);
    if (record) results.push({ kind, record });
  }
  return results;
}
