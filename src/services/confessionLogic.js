// Logika murni untuk balasan menfess (tanpa discord.js / database) agar mudah diuji.

import crypto from 'node:crypto';

export const MAX_REPLY_LENGTH = 1000;
export const ORIGINAL_POSTER_LABEL = 'Pengirim Asli';

export const DEFAULT_REPLY_SETTINGS = Object.freeze({
  repliesEnabled: true,
  replyCooldownSeconds: 30,
});

/** Rapikan isi balasan: trim, batasi baris kosong beruntun, potong ke batas panjang. */
export function normalizeReplyContent(raw) {
  return String(raw ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_REPLY_LENGTH);
}

/** Hash penanda peserta; identitas asli tidak disimpan di tabel label. */
export function participantHash(guildId, confessionId, userId) {
  return crypto
    .createHash('sha256')
    .update(`${guildId}:${confessionId}:${userId}`)
    .digest('hex')
    .slice(0, 16);
}

/**
 * Tentukan label anonim stabil untuk seorang pembalas pada satu menfess.
 * Pengirim asli selalu berlabel khusus; peserta lain diberi nomor urut sesuai kedatangan.
 * @returns {{ label: string, participants: Record<string, number>, isNew: boolean }}
 */
export function resolveReplyLabel(confession, userId) {
  const participants = { ...(confession.participants || {}) };
  if (userId === confession.authorId) {
    return { label: ORIGINAL_POSTER_LABEL, participants, isNew: false };
  }
  const hash = participantHash(confession.guildId, confession.id, userId);
  if (participants[hash]) {
    return { label: `Anonim ${participants[hash]}`, participants, isNew: false };
  }
  const next = Object.values(participants).reduce((max, n) => Math.max(max, n), 0) + 1;
  participants[hash] = next;
  return { label: `Anonim ${next}`, participants, isNew: true };
}

/** Sisa waktu cooldown dalam milidetik (0 jika sudah boleh membalas). */
export function replyCooldownRemainingMs(lastAt, cooldownSeconds, now = Date.now()) {
  const cooldownMs = Math.max(0, Number(cooldownSeconds) || 0) * 1000;
  return Math.max(0, Number(lastAt || 0) + cooldownMs - now);
}

/** Apakah menfess ini boleh dibalas? */
export function canReplyTo(confession, config) {
  if (!config?.enabled) return { ok: false, reason: 'disabled' };
  if (config.repliesEnabled === false) return { ok: false, reason: 'repliesDisabled' };
  if (!confession || confession.status !== 'published') return { ok: false, reason: 'notAvailable' };
  if (!confession.publishedMessageId) return { ok: false, reason: 'notAvailable' };
  return { ok: true };
}

export function shortId(id) {
  return String(id).slice(-6).toUpperCase();
}

/** Batasi cooldown balasan ke rentang aman 0..3600 detik. */
export function clampReplyCooldown(value, fallback = DEFAULT_REPLY_SETTINGS.replyCooldownSeconds) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(3600, Math.max(0, Math.round(n)));
}
