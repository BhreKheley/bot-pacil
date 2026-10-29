// Logika murni untuk sticky message (tanpa discord.js / database) agar mudah diuji.

export const STICKY_LIMITS = Object.freeze({
  title: 256,
  content: 3500,
  maxPerGuild: 25,
});

export const DEFAULT_STICKY_DELAY_MS = 5000;

const HEX_COLOR = /^#?([0-9a-fA-F]{6})$/;

/** Normalisasi warna ke "#RRGGBB"; kosong berarti memakai warna bawaan Pacil. */
export function parseStickyColor(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return { ok: true, value: null };
  const match = HEX_COLOR.exec(text);
  if (!match) return { ok: false, error: 'invalidColor' };
  return { ok: true, value: `#${match[1].toUpperCase()}` };
}

/**
 * Validasi input sticky dari modal.
 * @returns {{ ok: true, value: {title:string, content:string, color:string|null} } | { ok: false, error: string }}
 */
export function validateSticky({ title, content, color } = {}) {
  const cleanContent = String(content ?? '').replace(/\r\n/g, '\n').trim();
  if (!cleanContent) return { ok: false, error: 'emptyContent' };
  if (cleanContent.length > STICKY_LIMITS.content) return { ok: false, error: 'contentTooLong' };

  const cleanTitle = String(title ?? '').trim();
  if (cleanTitle.length > STICKY_LIMITS.title) return { ok: false, error: 'titleTooLong' };

  const parsedColor = parseStickyColor(color);
  if (!parsedColor.ok) return parsedColor;

  return { ok: true, value: { title: cleanTitle, content: cleanContent, color: parsedColor.value } };
}

/**
 * Penjadwal "satu kali per jendela": pesan pertama dalam satu rentang menjadwalkan
 * repost; pesan berikutnya di rentang yang sama tidak menjadwal ulang. Hasilnya,
 * channel ramai pun hanya memicu satu repost per `delayMs`.
 */
export function createStickyScheduler({
  delayMs = DEFAULT_STICKY_DELAY_MS,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
} = {}) {
  const pending = new Map();

  return {
    /** @returns {boolean} true jika jadwal baru dibuat. */
    schedule(key, task) {
      if (pending.has(key)) return false;
      const handle = setTimer(async () => {
        pending.delete(key);
        try {
          await task();
        } catch {
          // Error ditangani oleh pemanggil (task sendiri); jadwal tetap bersih.
        }
      }, delayMs);
      if (typeof handle?.unref === 'function') handle.unref();
      pending.set(key, handle);
      return true;
    },
    cancel(key) {
      const handle = pending.get(key);
      if (handle === undefined) return false;
      clearTimer(handle);
      pending.delete(key);
      return true;
    },
    has: (key) => pending.has(key),
    get size() {
      return pending.size;
    },
  };
}

/** Kunci cache/jadwal per channel. */
export const stickyCacheKey = (guildId, channelId) => `${guildId}:${channelId}`;
