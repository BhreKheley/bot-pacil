// Logika murni izin per command (tanpa discord.js / database).
// Kebijakan disimpan di guildConfig.commandPolicies[<kunci command>]:
//   { allowedRoles: [roleId], allowedChannels: [channelId], cooldownSeconds: number }
// Kunci command mengikuti resolveSlashAccessKey: "confession" atau "confession send".

export const POLICY_LIMITS = Object.freeze({
  maxRoles: 10,
  maxChannels: 10,
  maxCooldownSeconds: 86_400,
});

const EMPTY_POLICY = Object.freeze({ allowedRoles: [], allowedChannels: [], cooldownSeconds: 0 });

const uniqueIds = (list, cap) => [...new Set((Array.isArray(list) ? list : []).map(String).filter(Boolean))].slice(0, cap);

export function normalizePolicy(raw) {
  const cooldown = Math.floor(Number(raw?.cooldownSeconds));
  return {
    allowedRoles: uniqueIds(raw?.allowedRoles, POLICY_LIMITS.maxRoles),
    allowedChannels: uniqueIds(raw?.allowedChannels, POLICY_LIMITS.maxChannels),
    cooldownSeconds: Number.isFinite(cooldown) ? Math.min(Math.max(cooldown, 0), POLICY_LIMITS.maxCooldownSeconds) : 0,
  };
}

export const isPolicyEmpty = (policy) => {
  const p = normalizePolicy(policy);
  return !p.allowedRoles.length && !p.allowedChannels.length && p.cooldownSeconds === 0;
};

export const normalizeCommandKey = (key) => String(key ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/** "a b c" -> ["a b c", "a b", "a"]: kebijakan yang paling spesifik menang. */
export function policyKeyCandidates(accessKey) {
  const parts = normalizeCommandKey(accessKey).split(' ').filter(Boolean);
  const keys = [];
  for (let n = parts.length; n >= 1; n -= 1) keys.push(parts.slice(0, n).join(' '));
  return keys;
}

/** Cari kebijakan yang berlaku untuk sebuah command; null bila tidak ada. */
export function findPolicy(policies, accessKey) {
  if (!policies || typeof policies !== 'object') return null;
  for (const key of policyKeyCandidates(accessKey)) {
    if (policies[key] && !isPolicyEmpty(policies[key])) return { key, policy: normalizePolicy(policies[key]) };
  }
  return null;
}

/**
 * Cek role dan channel. Pengurus (ManageGuild/Admin) selalu lolos agar tidak terkunci.
 * Channel dianggap cocok bila channel itu sendiri, induk thread, atau kategorinya terdaftar.
 * @returns {{ok:true}|{ok:false,reason:'role'|'channel'}}
 */
export function evaluateAccess(policy, { roleIds = [], channelId, parentId = null, categoryId = null, isManager = false } = {}) {
  if (isManager || !policy) return { ok: true };
  const p = normalizePolicy(policy);
  if (p.allowedChannels.length) {
    const where = [channelId, parentId, categoryId].filter(Boolean).map(String);
    if (!where.some((id) => p.allowedChannels.includes(id))) return { ok: false, reason: 'channel' };
  }
  if (p.allowedRoles.length) {
    const roles = new Set(Array.from(roleIds, String));
    if (!p.allowedRoles.some((id) => roles.has(id))) return { ok: false, reason: 'role' };
  }
  return { ok: true };
}

/** Sisa cooldown dalam ms (0 bila sudah boleh). */
export function cooldownRemainingMs(expiresAt, now = Date.now()) {
  return expiresAt && expiresAt > now ? expiresAt - now : 0;
}

export function cooldownExpiry(seconds, now = Date.now()) {
  return seconds > 0 ? now + seconds * 1000 : 0;
}

/** Terapkan perubahan ke peta kebijakan tanpa memutasi aslinya; kebijakan kosong dihapus. */
export function applyPolicyPatch(policies, commandKey, patch) {
  const key = normalizeCommandKey(commandKey);
  const next = { ...(policies || {}) };
  const merged = normalizePolicy({ ...(next[key] ?? EMPTY_POLICY), ...patch });
  if (isPolicyEmpty(merged)) delete next[key];
  else next[key] = merged;
  return next;
}

export function clearPolicy(policies, commandKey) {
  const next = { ...(policies || {}) };
  delete next[normalizeCommandKey(commandKey)];
  return next;
}

/** "90" -> 90, "1m30s"/"2m"/"1h" -> detik; null bila tidak valid. */
export function parseCooldownInput(raw) {
  const text = String(raw ?? '').trim().toLowerCase();
  if (text === '') return null;
  if (/^\d+$/.test(text)) return clampCooldown(Number(text));
  const match = text.match(/^(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?$/);
  if (!match || (!match[1] && !match[2] && !match[3])) return null;
  return clampCooldown(Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0));
}

const clampCooldown = (n) => (n > POLICY_LIMITS.maxCooldownSeconds ? null : n);

export function formatCooldown(seconds) {
  if (!seconds) return 'Tanpa jeda khusus';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h && `${h} jam`, m && `${m} menit`, s && `${s} detik`].filter(Boolean).join(' ');
}
