// Konfigurasi Interactive Guide: admin dapat mengganti judul/isi tiap halaman panduan; kosongkan untuk kembali ke bawaan.
export const GUIDE_TITLE_MAX = 100;
export const GUIDE_BODY_MAX = 3500;

const key = (guildId) => `guild:${guildId}:guide_pages`;

export async function getGuideOverrides(client, guildId) {
  const saved = await client.db.get(key(guildId), {});
  return saved && typeof saved === 'object' ? saved : {};
}

/** title/description kosong => hapus override halaman tersebut (kembali ke bawaan). */
export async function setGuidePage(client, guildId, page, { title = '', description = '' }) {
  const all = await getGuideOverrides(client, guildId);
  const t = String(title).trim().slice(0, GUIDE_TITLE_MAX);
  const d = String(description).trim().slice(0, GUIDE_BODY_MAX);
  if (!t && !d) delete all[page];
  else all[page] = { ...(t && { title: t }), ...(d && { description: d }) };
  await client.db.set(key(guildId), all);
  return all[page] ?? null;
}

export const applyGuideOverride = (base, override) => ({ ...base, ...(override ?? {}) });
