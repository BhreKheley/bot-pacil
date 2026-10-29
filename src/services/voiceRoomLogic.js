// Logika murni untuk panel ruang voice sementara (tanpa discord.js / database).

export const ROOM_LIMITS = Object.freeze({
  maxUserLimit: 99,
  minBitrateKbps: 8,
  maxBitrateKbps: 384,
  nameLength: 100,
  statusLength: 500,
  listCap: 20,
});

/** Region RTC yang ditawarkan (null = otomatis). */
export const RTC_REGIONS = Object.freeze([
  { value: 'auto', label: 'Otomatis', rtc: null },
  { value: 'singapore', label: 'Singapura', rtc: 'singapore' },
  { value: 'hongkong', label: 'Hong Kong', rtc: 'hongkong' },
  { value: 'japan', label: 'Jepang', rtc: 'japan' },
  { value: 'india', label: 'India', rtc: 'india' },
  { value: 'sydney', label: 'Sydney', rtc: 'sydney' },
  { value: 'rotterdam', label: 'Rotterdam', rtc: 'rotterdam' },
  { value: 'southafrica', label: 'Afrika Selatan', rtc: 'southafrica' },
  { value: 'brazil', label: 'Brasil', rtc: 'brazil' },
  { value: 'us-east', label: 'AS Timur', rtc: 'us-east' },
  { value: 'us-west', label: 'AS Barat', rtc: 'us-west' },
]);

export function regionLabel(rtc) {
  return RTC_REGIONS.find((r) => r.rtc === (rtc ?? null))?.label ?? String(rtc);
}

/** Lengkapi rekaman ruang dengan nilai bawaan (rekaman lama hanya punya ownerId/triggerChannelId). */
export function normalizeRoomRecord(record = {}) {
  return {
    allowed: [],
    blocked: [],
    viewGrants: [],
    locked: false,
    hidden: false,
    panelMessageId: null,
    ...record,
    allowed: Array.isArray(record.allowed) ? record.allowed : [],
    blocked: Array.isArray(record.blocked) ? record.blocked : [],
    viewGrants: Array.isArray(record.viewGrants) ? record.viewGrants : [],
  };
}

export function parseUserLimit(raw) {
  const text = String(raw ?? '').trim();
  if (!/^\d{1,2}$/.test(text)) return { ok: false, error: 'limitInvalid' };
  const value = Number(text);
  if (value > ROOM_LIMITS.maxUserLimit) return { ok: false, error: 'limitInvalid' };
  return { ok: true, value };
}

/**
 * Parse bitrate (kbps) dari input pengguna. `guildMaxBps` = batas server (tergantung level boost).
 * @returns {{ok:true,value:number,kbps:number}|{ok:false,error:string,maxKbps?:number}}
 */
export function parseBitrateKbps(raw, guildMaxBps = ROOM_LIMITS.maxBitrateKbps * 1000) {
  const text = String(raw ?? '').trim();
  if (!/^\d{1,3}$/.test(text)) return { ok: false, error: 'bitrateInvalid' };
  const kbps = Number(text);
  const maxKbps = Math.max(ROOM_LIMITS.minBitrateKbps, Math.min(ROOM_LIMITS.maxBitrateKbps, Math.floor(guildMaxBps / 1000)));
  if (kbps < ROOM_LIMITS.minBitrateKbps) return { ok: false, error: 'bitrateInvalid', maxKbps };
  if (kbps > maxKbps) return { ok: false, error: 'bitrateTooHigh', maxKbps };
  return { ok: true, value: kbps * 1000, kbps };
}

/** Bersihkan nama ruang; kosong setelah dibersihkan = tidak valid. */
export function sanitizeRoomName(raw) {
  const name = String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, ROOM_LIMITS.nameLength);
  return name || null;
}

/** Teks status ruang (boleh kosong = hapus status). */
export function sanitizeRoomStatus(raw) {
  return String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, ROOM_LIMITS.statusLength);
}

export function isRoomManager(record, userId, isStaff = false) {
  return Boolean(record && (isStaff || record.ownerId === userId));
}

export function addToList(list, id, cap = ROOM_LIMITS.listCap) {
  if (list.includes(id)) return { ok: true, list: [...list] };
  if (list.length >= cap) return { ok: false, error: 'listFull', list: [...list] };
  return { ok: true, list: [...list, id] };
}

export function removeFromList(list, id) {
  return list.filter((entry) => entry !== id);
}

/**
 * Aksi pada pengguna lain: 'allow' | 'block' | 'reset' | 'kick' | 'transfer'.
 * @returns {{ok:true}|{ok:false,reason:string}}
 */
export function userActionDecision(action, { record, actorId, target, targetInRoom = false }) {
  if (!target?.id) return { ok: false, reason: 'noTarget' };
  if (target.bot) return { ok: false, reason: 'targetIsBot' };
  if (target.id === actorId && action !== 'reset') return { ok: false, reason: 'targetIsSelf' };
  const targetIsOwner = target.id === record.ownerId;
  if (targetIsOwner && ['block', 'kick', 'transfer'].includes(action)) return { ok: false, reason: 'targetIsOwner' };
  if (action === 'transfer' && !targetInRoom) return { ok: false, reason: 'targetNotInRoom' };
  if (action === 'kick' && !targetInRoom) return { ok: false, reason: 'targetNotInRoom' };
  return { ok: true };
}

/** Klaim hanya bila pemilik tidak ada di ruang dan pengklaim ada di ruang. */
export function claimDecision({ record, claimerId, claimerInRoom, ownerInRoom }) {
  if (!claimerInRoom) return { ok: false, reason: 'claimerNotInRoom' };
  if (claimerId === record.ownerId) return { ok: false, reason: 'alreadyOwner' };
  if (ownerInRoom) return { ok: false, reason: 'ownerPresent' };
  return { ok: true };
}

export function formatLimit(limit) {
  return !limit ? 'Tanpa batas' : `${limit} orang`;
}
