// Aksi pada ruang voice sementara (Join to Create) oleh pemilik/pengurus.
// Rekaman ruang disimpan di dokumen JTC per server: temporaryChannels[channelId].

import { MessageFlags, PermissionFlagsBits, VideoQualityMode } from 'discord.js';
import {
  getJoinToCreateConfig, getTemporaryChannelInfo, saveJoinToCreateConfig,
} from '../utils/database.js';
import { Mutex } from '../utils/mutex.js';
import { logger } from '../utils/logger.js';
import { buildVoicePanel } from './voiceControlPanelService.js';
import { addToList, normalizeRoomRecord, removeFromList } from './voiceRoomLogic.js';

export const jtcDocLockKey = (guildId) => `jtc-doc:${guildId}`;

export async function getRoom(client, guildId, channelId) {
  const record = await getTemporaryChannelInfo(client, guildId, channelId);
  return record ? normalizeRoomRecord(record) : null;
}

/** Ubah rekaman ruang secara atomik. `mutate(room)` mengembalikan rekaman baru. */
export async function updateRoom(client, guildId, channelId, mutate) {
  return Mutex.runExclusive(jtcDocLockKey(guildId), async () => {
    const config = await getJoinToCreateConfig(client, guildId);
    const current = config.temporaryChannels?.[channelId];
    if (!current) return null;
    const next = normalizeRoomRecord(mutate(normalizeRoomRecord(current)) ?? current);
    config.temporaryChannels[channelId] = next;
    await saveJoinToCreateConfig(client, guildId, config);
    return next;
  });
}

/** Terjemahkan error Discord ke pesan yang bisa ditindaklanjuti pengguna. */
export function describeDiscordError(error) {
  const code = error?.code ?? error?.rawError?.code;
  if (code === 50013 || code === 50001) return 'Bot belum punya izin yang dibutuhkan untuk aksi ini. Minta pengurus server mengecek izin bot (Manage Channels, Move Members, dan Set Voice Channel Status untuk status ruang).';
  if (code === 10003 || code === 10008) return 'Ruang voice ini sudah tidak ada.';
  if (code === 30034 || error?.status === 429) return 'Discord membatasi perubahan ini untuk sementara (misalnya ganti nama maksimal 2 kali per 10 menit). Coba lagi sebentar lagi.';
  return 'Aksi gagal dijalankan. Coba lagi, atau hubungi pengurus server.';
}

const reason = (actorId, what) => `Voice room: ${what} oleh ${actorId}`;

export async function setLocked(client, channel, locked, actorId) {
  await channel.permissionOverwrites.edit(channel.guild.id, { Connect: locked ? false : null }, { reason: reason(actorId, locked ? 'dikunci' : 'dibuka') });
  return updateRoom(client, channel.guild.id, channel.id, (room) => ({ ...room, locked }));
}

export async function setHidden(client, channel, hidden, actorId) {
  const guildId = channel.guild.id;
  const why = { reason: reason(actorId, hidden ? 'disembunyikan' : 'ditampilkan') };
  const room = await getRoom(client, guildId, channel.id);
  if (!room) return null;

  if (hidden) {
    await channel.permissionOverwrites.edit(guildId, { ViewChannel: false }, why);
    await channel.permissionOverwrites.edit(room.ownerId, { ViewChannel: true }, why).catch(() => {});
    for (const id of room.allowed) await channel.permissionOverwrites.edit(id, { ViewChannel: true, Connect: true }, why).catch(() => {});
    // Anggota yang sudah di ruang tetap harus bisa melihatnya.
    const grants = new Set(room.viewGrants);
    for (const member of channel.members.values()) {
      if (member.user.bot || member.id === room.ownerId || room.blocked.includes(member.id)) continue;
      await channel.permissionOverwrites.edit(member.id, { ViewChannel: true }, why).catch(() => {});
      grants.add(member.id);
    }
    return updateRoom(client, guildId, channel.id, (r) => ({ ...r, hidden: true, viewGrants: [...grants].slice(0, 99) }));
  }

  await channel.permissionOverwrites.edit(guildId, { ViewChannel: null }, why);
  for (const id of room.viewGrants) {
    if (room.allowed.includes(id) || id === room.ownerId) continue;
    await channel.permissionOverwrites.delete(id, why.reason).catch(() => {});
  }
  return updateRoom(client, guildId, channel.id, (r) => ({ ...r, hidden: false, viewGrants: [] }));
}

export async function allowUser(client, channel, userId, actorId) {
  const room = await getRoom(client, channel.guild.id, channel.id);
  const added = addToList(removeFromList(room?.allowed ?? [], userId), userId);
  if (!added.ok) return { error: added.error };
  await channel.permissionOverwrites.edit(userId, { ViewChannel: true, Connect: true, Speak: true }, { reason: reason(actorId, `izin untuk ${userId}`) });
  await updateRoom(client, channel.guild.id, channel.id, (r) => ({
    ...r, allowed: addToList(r.allowed, userId).list, blocked: removeFromList(r.blocked, userId),
  }));
  return { ok: true };
}

export async function blockUser(client, channel, userId, actorId) {
  const room = await getRoom(client, channel.guild.id, channel.id);
  const added = addToList(room?.blocked ?? [], userId);
  if (!added.ok) return { error: added.error };
  await channel.permissionOverwrites.edit(userId, { ViewChannel: false, Connect: false }, { reason: reason(actorId, `blokir ${userId}`) });
  await channel.members.get(userId)?.voice.disconnect(reason(actorId, `blokir ${userId}`)).catch(() => {});
  await updateRoom(client, channel.guild.id, channel.id, (r) => ({
    ...r,
    blocked: addToList(r.blocked, userId).list,
    allowed: removeFromList(r.allowed, userId),
    viewGrants: removeFromList(r.viewGrants, userId),
  }));
  return { ok: true };
}

export async function resetUser(client, channel, userId, actorId) {
  const room = await getRoom(client, channel.guild.id, channel.id);
  const why = reason(actorId, `reset ${userId}`);
  if (room?.hidden && channel.members.has(userId)) {
    // Ruang tersembunyi: orang yang sedang di dalam tetap perlu bisa melihatnya.
    await channel.permissionOverwrites.edit(userId, { ViewChannel: true, Connect: null, Speak: null }, { reason: why });
    await updateRoom(client, channel.guild.id, channel.id, (r) => ({
      ...r, allowed: removeFromList(r.allowed, userId), blocked: removeFromList(r.blocked, userId),
      viewGrants: addToList(r.viewGrants, userId, 99).list,
    }));
  } else {
    await channel.permissionOverwrites.delete(userId, why).catch(() => {});
    await updateRoom(client, channel.guild.id, channel.id, (r) => ({
      ...r, allowed: removeFromList(r.allowed, userId), blocked: removeFromList(r.blocked, userId),
      viewGrants: removeFromList(r.viewGrants, userId),
    }));
  }
  return { ok: true };
}

export async function kickUser(channel, userId, actorId) {
  const member = channel.members.get(userId);
  if (!member) return { error: 'targetNotInRoom' };
  await member.voice.disconnect(reason(actorId, `keluarkan ${userId}`));
  return { ok: true };
}

/** Serahkan (atau klaim) kepemilikan ruang ke `newOwnerId`. */
export async function transferOwner(client, channel, newOwnerId, actorId) {
  const guildId = channel.guild.id;
  const room = await getRoom(client, guildId, channel.id);
  if (!room) return { error: 'noRoom' };
  const why = { reason: reason(actorId, `kepemilikan ke ${newOwnerId}`) };
  await channel.permissionOverwrites.edit(newOwnerId, {
    ViewChannel: true, Connect: true, Speak: true, PrioritySpeaker: true, MoveMembers: true,
  }, why);
  if (room.ownerId !== newOwnerId) {
    await channel.permissionOverwrites.edit(room.ownerId, { PrioritySpeaker: null, MoveMembers: null }, why).catch(() => {});
  }
  await updateRoom(client, guildId, channel.id, (r) => ({
    ...r, ownerId: newOwnerId, allowed: removeFromList(r.allowed, newOwnerId), blocked: removeFromList(r.blocked, newOwnerId),
  }));
  return { ok: true };
}

export async function setVideoMode(client, channel, full, actorId) {
  await channel.setVideoQualityMode(full ? VideoQualityMode.Full : VideoQualityMode.Auto, reason(actorId, 'mode video'));
}

export async function setStatus(client, channel, text, actorId) {
  // Endpoint resmi status voice channel; butuh izin "Set Voice Channel Status" bagi bot.
  await client.rest.put(`/channels/${channel.id}/voice-status`, {
    body: { status: text || null },
    reason: reason(actorId, 'status ruang'),
  });
  return updateRoom(client, channel.guild.id, channel.id, (r) => ({ ...r, status: text || null }));
}

/** Pastikan bot memegang izin minimum di ruang (dipakai sebelum aksi izin/kick). */
export function botCanManage(channel) {
  const me = channel.guild.members.me;
  return Boolean(me && channel.permissionsFor(me)?.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers]));
}

/** Segarkan panel (edit pesan yang ada, atau posting baru bila pesan lama hilang). */
export async function refreshPanel(client, channel) {
  try {
    const room = await getRoom(client, channel.guild.id, channel.id);
    if (!room) return null;
    const payload = buildVoicePanel(channel, room, { ownerPresent: channel.members.has(room.ownerId) });
    const existing = room.panelMessageId ? await channel.messages.fetch(room.panelMessageId).catch(() => null) : null;
    if (existing) return await existing.edit(payload);
    const posted = await channel.send({ ...payload, allowedMentions: { parse: [] } });
    await updateRoom(client, channel.guild.id, channel.id, (r) => ({ ...r, panelMessageId: posted.id }));
    return posted;
  } catch (error) {
    logger.warn(`Gagal menyegarkan panel voice ${channel.id}: ${error.message}`);
    return null;
  }
}

/** Pemilik keluar tetapi masih ada orang: tampilkan tombol Klaim dan beri tahu. */
export async function notifyOwnerAbsent(client, channel) {
  await refreshPanel(client, channel);
  await channel.send({
    content: '-# 👑 Pemilik ruang keluar. Siapa pun yang masih di sini bisa menekan **Klaim** di panel untuk jadi pemilik baru.',
    allowedMentions: { parse: [] },
  }).catch(() => {});
}

/**
 * Cek izin sebelum menjalankan aksi panel.
 * Membalas pengguna (ephemeral) bila tidak berhak, lalu mengembalikan null.
 * @param {{claim?: boolean}} options `claim` melonggarkan syarat: cukup berada di ruang.
 */
export async function authorizeRoomAction(interaction, client, channelId, { claim = false } = {}) {
  const channel = await interaction.guild?.channels.fetch(channelId).catch(() => null);
  const room = channel ? await getRoom(client, interaction.guildId, channelId) : null;
  if (!channel || !room) {
    await interaction.reply({ content: 'Ruang ini sudah tidak tersedia.', flags: MessageFlags.Ephemeral }).catch(() => {});
    return null;
  }
  const isStaff = interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels);
  if (!claim && room.ownerId !== interaction.user.id && !isStaff) {
    await interaction.reply({ content: 'Hanya pemilik ruang atau pengurus server yang dapat memakai kontrol ini.', flags: MessageFlags.Ephemeral }).catch(() => {});
    return null;
  }
  return { channel, room, isStaff: Boolean(isStaff) };
}
