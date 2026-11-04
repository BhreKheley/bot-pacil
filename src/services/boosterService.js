export const boosterRoleKey = (guildId, userId) => `guild:${guildId}:booster_roles:${userId}`;

/**
 * Mendapatkan data custom role booster yang dimiliki user
 */
export async function getUserBoosterRole(client, guildId, userId) {
  return await client.db.get(boosterRoleKey(guildId, userId), null);
}

/**
 * Menyimpan data custom role booster
 */
export async function saveUserBoosterRole(client, guildId, userId, data) {
  return await client.db.set(boosterRoleKey(guildId, userId), data);
}

/**
 * Menghapus data custom role booster
 */
export async function deleteUserBoosterRole(client, guildId, userId) {
  return await client.db.delete(boosterRoleKey(guildId, userId));
}


/**
 * Parse warna role booster: "#RRGGBB" (solid) atau "#RRGGBB, #RRGGBB" (gradien).
 * @returns {{ ok: true, primary: number, secondary: number|null } | { ok: false, error: string }}
 */
export function parseRoleColors(input = '') {
  const parts = String(input).split(/[\s,;]+/).map((p) => p.trim().replace(/^#/, '')).filter(Boolean);
  if (parts.length < 1 || parts.length > 2 || !parts.every((p) => /^[0-9a-f]{6}$/i.test(p))) {
    return { ok: false, error: 'Format warna tidak valid. Gunakan hex 6 digit, mis. `#F2A900`, atau dua hex untuk gradien: `#0d3a73, #f2a900`.' };
  }
  const [primary, secondary] = parts.map((p) => parseInt(p, 16));
  return { ok: true, primary, secondary: secondary ?? null };
}

/** Terapkan warna ke role; gradien butuh fitur boost tertentu, jika ditolak jatuh ke warna solid. */
export async function applyRoleColors(role, { primary, secondary }) {
  if (secondary === null) {
    await role.setColors({ primaryColor: primary });
    return { gradient: false };
  }
  try {
    await role.setColors({ primaryColor: primary, secondaryColor: secondary });
    return { gradient: true };
  } catch {
    await role.setColors({ primaryColor: primary });
    return { gradient: false, fallback: true };
  }
}

export const BOOSTER_DEFAULTS = Object.freeze({
  enabled: true,        // fitur custom role aktif
  autoCleanup: true,    // hapus role otomatis saat member berhenti boost
  allowGift: true,
  allowIcon: true,
  nameMaxLength: 30,    // 2–32
});
export const BOOSTER_NAME_LIMITS = Object.freeze({ min: 2, max: 32 });

const configKey = (guildId) => `guild:${guildId}:booster_config`;

export async function getBoosterConfig(client, guildId) {
  const saved = await client.db.get(configKey(guildId), {});
  return { ...BOOSTER_DEFAULTS, ...(saved && typeof saved === 'object' ? saved : {}) };
}

export async function saveBoosterConfig(client, guildId, changes) {
  const next = { ...(await getBoosterConfig(client, guildId)), ...changes };
  await client.db.set(configKey(guildId), next);
  return next;
}

/** Hapus role custom milik user (Discord + data). Dipakai saat berhenti boost. */
export async function cleanupBoosterRole(client, guild, userId) {
  const data = await getUserBoosterRole(client, guild.id, userId);
  if (!data) return false;
  const role = guild.roles.cache.get(data.roleId) || (await guild.roles.fetch(data.roleId).catch(() => null));
  if (role) await role.delete('Member berhenti boost: custom role dibersihkan').catch(() => {});
  await deleteUserBoosterRole(client, guild.id, userId);
  return true;
}
