// Daftar bot musik yang dipantau Music Status (dipilih admin di /pacilsetup → Music Bot Status).
export const MAX_TRACKED_BOTS = 10;
const key = (guildId) => `guild:${guildId}:music_tracker_bots`;

export async function getTrackedBotIds(client, guildId) {
  const ids = await client.db.get(key(guildId), []);
  return Array.isArray(ids) ? ids : [];
}

export async function setTrackedBotIds(client, guildId, ids) {
  const clean = [...new Set(ids.map(String))].slice(0, MAX_TRACKED_BOTS);
  await client.db.set(key(guildId), clean);
  return clean;
}
