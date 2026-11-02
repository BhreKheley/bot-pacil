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
