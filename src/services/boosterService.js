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
