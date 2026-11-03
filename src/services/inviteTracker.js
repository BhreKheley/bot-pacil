// Pelacak undangan: simpan snapshot penggunaan invite per guild, bandingkan saat member masuk.
const cache = new Map(); // guildId -> Map(code -> { uses, inviterId })

async function snapshot(guild) {
  const invites = await guild.invites.fetch().catch(() => null);
  if (!invites) return null;
  const map = new Map();
  for (const inv of invites.values()) map.set(inv.code, { uses: inv.uses ?? 0, inviterId: inv.inviter?.id ?? null });
  cache.set(guild.id, map);
  return map;
}

export async function primeInviteCache(client) {
  await Promise.all([...client.guilds.cache.values()].map((g) => snapshot(g)));
}
export const primeGuildInvites = snapshot;

export function trackInviteChange(guildId, invite, remove = false) {
  const map = cache.get(guildId) ?? new Map();
  if (remove) map.delete(invite.code);
  else map.set(invite.code, { uses: invite.uses ?? 0, inviterId: invite.inviter?.id ?? null });
  cache.set(guildId, map);
}

/** Kembalikan ID pengundang (atau null jika tak terdeteksi / vanity / izin kurang). */
export async function resolveInviter(guild) {
  const before = cache.get(guild.id);
  const after = await snapshot(guild);
  if (!before || !after) return null;
  for (const [code, cur] of after) {
    if (cur.uses > (before.get(code)?.uses ?? 0)) return cur.inviterId;
  }
  return null;
}
