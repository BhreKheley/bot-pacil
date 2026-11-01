// Logika murni autoplay: memilih lagu rekomendasi dari kandidat hasil pencarian.

export const AUTOPLAY_HISTORY_LIMIT = 30;
const MAX_DURATION_MS = 10 * 60 * 1000;
const MIN_DURATION_MS = 30 * 1000;

const NOISE_PATTERN = /\b(live|cover|remix|reaction|karaoke|instrumental|slowed|reverb|sped up|nightcore|8d)\b/i;

export const trackKey = (track) => track?.info?.uri || track?.info?.identifier || null;

const normalizeTitle = (title) => String(title || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Tambah ke riwayat (tanpa duplikat), dibatasi AUTOPLAY_HISTORY_LIMIT. Mengembalikan array baru. */
export function pushHistory(history, track, limit = AUTOPLAY_HISTORY_LIMIT) {
  const key = trackKey(track);
  const title = normalizeTitle(track?.info?.title);
  const next = [...(history ?? [])].filter((e) => e.key !== key);
  if (key || title) next.push({ key, title });
  return next.slice(-limit);
}

/** Apakah kandidat layak dipakai sebagai rekomendasi untuk `seed`. */
export function isEligible(candidate, seed, history = [], queued = []) {
  const info = candidate?.info;
  if (!info || info.isStream) return false;
  const key = trackKey(candidate);
  const title = normalizeTitle(info.title);
  if (!title) return false;
  if (info.length && (info.length > MAX_DURATION_MS || info.length < MIN_DURATION_MS)) return false;
  if (history.some((e) => (key && e.key === key) || e.title === title)) return false;
  if (queued.some((q) => trackKey(q) === key)) return false;
  // Hindari versi "live/cover/remix" kecuali lagu asalnya memang begitu.
  if (NOISE_PATTERN.test(info.title) && !NOISE_PATTERN.test(seed?.info?.title || '')) return false;
  return true;
}

/**
 * Pilih satu rekomendasi. Kandidat dari artis yang sama ditaruh sedikit lebih
 * belakang supaya variatif, lalu diambil acak dari 5 teratas.
 */
export function pickRecommendation(candidates, seed, history = [], queued = [], random = Math.random) {
  const pool = (candidates ?? []).filter((c) => isEligible(c, seed, history, queued));
  if (pool.length === 0) return null;
  const seedAuthor = String(seed?.info?.author || '').toLowerCase();
  const different = pool.filter((c) => String(c.info.author || '').toLowerCase() !== seedAuthor);
  const same = pool.filter((c) => String(c.info.author || '').toLowerCase() === seedAuthor);
  const ordered = [...different, ...same].slice(0, 5);
  return ordered[Math.floor(random() * ordered.length)] ?? null;
}

/** Kueri pencarian cadangan dari lagu asal. */
export function buildSearchQueries(seed) {
  const author = String(seed?.info?.author || '').replace(/ - Topic$/i, '').trim();
  const title = String(seed?.info?.title || '').trim();
  const queries = [];
  if (author) queries.push(`${author} songs`);
  if (title && author) queries.push(`songs like ${title} ${author}`);
  else if (title) queries.push(`songs like ${title}`);
  return queries;
}

export function isYoutubeSource(track) {
  return /youtube/i.test(track?.info?.sourceName || '') && Boolean(track?.info?.identifier);
}

export const youtubeMixUrl = (identifier) =>
  `https://www.youtube.com/watch?v=${identifier}&list=RD${identifier}`;
