import {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { buildPacilEmbed, PACIL_COLORS } from '../ui/pacil.js';
import { logger } from '../utils/logger.js';

export const circleKey = (guildId, circleId) => `guild:${guildId}:circles:${circleId}`;
export const userCircleKey = (guildId, userId) => `guild:${guildId}:user_circles:${userId}`;
export const guildCirclesListKey = (guildId) => `guild:${guildId}:circles_list`;

/**
 * Mengambil data circle berdasarkan role ID / circle ID
 */
export async function getCircle(client, guildId, circleId) {
  return await client.db.get(circleKey(guildId, circleId), null);
}

/**
 * Mengambil circle yang dimiliki atau di-manage oleh user
 */
export async function getUserCircle(client, guildId, userId) {
  const circleId = await client.db.get(userCircleKey(guildId, userId), null);
  if (!circleId) return null;
  return await getCircle(client, guildId, circleId);
}

/**
 * Validasi apakah server masih aman membuat role dan kategori baru (anti-bloat)
 */
export function checkServerLimits(guild) {
  const channels = guild?.channels?.cache ? Array.from(guild.channels.cache.values()) : [];
  const categoriesCount = channels.filter(
    (c) => c.type === ChannelType.GuildCategory
  ).length;
  if (categoriesCount >= 45) {
    return {
      ok: false,
      reason: 'Server telah mendekati batas maksimal kategori Discord (maks 50 kategori). Harap hubungi admin.',
    };
  }

  const rolesCount = guild?.roles?.cache?.size ?? 0;
  if (rolesCount >= 240) {
    return {
      ok: false,
      reason: 'Server telah mendekati batas maksimal role Discord (maks 250 roles). Harap hubungi admin.',
    };
  }

  return { ok: true };
}

async function buildCircle(client, guild, member, rawCircleName, created) {
  const circleName = String(rawCircleName || '').trim().replace(/[\n\r]/g, '');
  if (!circleName || circleName.length < 2 || circleName.length > 32) {
    throw new Error('Nama circle harus antara 2 hingga 32 karakter.');
  }

  // Cek apakah user sudah memiliki circle aktif
  const existingCircle = await getUserCircle(client, guild.id, member.id);
  if (existingCircle) {
    throw new Error('Kamu sudah memiliki Private Circle aktif. Hapus circle lama terlebih dahulu jika ingin membuat yang baru.');
  }

  // Cek limit kapasitas Discord di server
  const limitCheck = checkServerLimits(guild);
  if (!limitCheck.ok) {
    throw new Error(limitCheck.reason);
  }

  logger.info(`Membuat Private Circle baru: "${circleName}" oleh ${member.user.tag} (${member.id})`);

  // 1. Buat Role Circle Khusus
  const role = await guild.roles.create({
    name: `Circle: ${circleName}`,
    color: PACIL_COLORS.gold,
    reason: `Private Circle created by ${member.user.tag}`,
  });

  created.push(role);
  // Berikan role ke pembuat
  await member.roles.add(role);

  // 2. Buat Private Category
  const category = await guild.channels.create({
    name: `🔒 ${circleName}`,
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: role.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AddReactions,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.Stream,
          PermissionFlagsBits.UseVAD,
        ],
      },
      {
        id: guild.members.me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ManageRoles,
        ],
      },
    ],
    reason: `Private Category for Circle ${circleName}`,
  });
  created.push(category);

  // 3. Buat Text Channel
  const cleanSlug = circleName
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'room';

  const textChannel = await guild.channels.create({
    name: `💬-${cleanSlug}`,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `Ruang privat Circle: ${circleName} • Owner: <@${member.id}>`,
    reason: `Circle text channel for ${circleName}`,
  });
  created.push(textChannel);

  // 4. Buat Voice Channel
  const voiceChannel = await guild.channels.create({
    name: `🔊-${circleName.slice(0, 28)}`,
    type: ChannelType.GuildVoice,
    parent: category.id,
    reason: `Circle voice channel for ${circleName}`,
  });
  created.push(voiceChannel);

  // 5. Sambut di Text Channel
  const welcomeEmbed = buildPacilEmbed({
    title: `👥 Selamat Datang di Circle "${circleName}"!`,
    description: `Kategori dan channel ini **hanya dapat dilihat** oleh anggota dengan role <@&${role.id}>.\n\nSelamat berdiskusi, nugas bareng, atau nongkrong santai bersama circle kamu di Fasilkom UI!`,
    tone: 'gold',
    fields: [
      { name: '👑 Pembuat Circle', value: `<@${member.id}>`, inline: true },
      { name: '🎭 Role Circle', value: `<@&${role.id}>`, inline: true },
      { name: '💡 Cara Ajak Teman', value: 'Gunakan command `/circle add @user` atau tombol di bawah untuk menambahkan teman.', inline: false },
      { name: '⚙️ Manajemen', value: '• `/circle add @user` — Tambah anggota\n• `/circle remove @user` — Keluarkan anggota\n• `/circle leave` — Keluar dari circle\n• `/circle delete` — Hapus circle', inline: false },
    ],
    footer: 'Pacil Baik • Private Circle System',
  });

  await textChannel.send({ embeds: [welcomeEmbed] });

  // 6. Simpan Metadata ke Database
  const circleData = {
    id: role.id,
    name: circleName,
    ownerId: member.id,
    roleId: role.id,
    categoryId: category.id,
    textChannelId: textChannel.id,
    voiceChannelId: voiceChannel.id,
    members: [member.id],
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
  };

  await client.db.set(circleKey(guild.id, role.id), circleData);
  await client.db.set(userCircleKey(guild.id, member.id), role.id);

  const circlesList = (await client.db.get(guildCirclesListKey(guild.id), [])) || [];
  circlesList.push(role.id);
  await client.db.set(guildCirclesListKey(guild.id), circlesList);

  return {
    circle: circleData,
    role,
    category,
    textChannel,
    voiceChannel,
  };
}

/**
 * Menambahkan anggota ke dalam Circle
 */
export async function addMemberToCircle(client, guild, circleData, targetMember) {
  if (circleData.members.includes(targetMember.id)) {
    throw new Error(`${targetMember.user.tag} sudah menjadi anggota circle ini.`);
  }

  const role = guild.roles.cache.get(circleData.roleId)
    || (await guild.roles.fetch(circleData.roleId).catch(() => null));

  if (!role) {
    throw new Error('Role circle tidak ditemukan di server.');
  }

  await targetMember.roles.add(role);
  circleData.members.push(targetMember.id);
  circleData.lastActivityAt = Date.now();

  await client.db.set(circleKey(guild.id, circleData.id), circleData);
  return role;
}

/**
 * Menghapus/mengeluarkan anggota dari Circle
 */
export async function removeMemberFromCircle(client, guild, circleData, targetMember) {
  if (!circleData.members.includes(targetMember.id)) {
    throw new Error(`${targetMember.user.tag} bukan anggota circle ini.`);
  }

  if (targetMember.id === circleData.ownerId) {
    throw new Error('Owner tidak bisa dikeluarkan dari circle sendiri. Gunakan `/circle delete` jika ingin membubarkan.');
  }

  const role = guild.roles.cache.get(circleData.roleId)
    || (await guild.roles.fetch(circleData.roleId).catch(() => null));

  if (role) {
    await targetMember.roles.remove(role).catch(() => {});
  }

  circleData.members = circleData.members.filter((id) => id !== targetMember.id);
  circleData.lastActivityAt = Date.now();

  await client.db.set(circleKey(guild.id, circleData.id), circleData);
  return role;
}

/**
 * Membubarkan dan menghapus Private Circle
 */
export async function deleteCircle(client, guild, circleData, reason = 'Circle dibubarkan oleh owner') {
  logger.info(`Menghapus circle "${circleData.name}" (${circleData.id}) di guild ${guild.id}`);

  // Hapus channel text & voice
  if (circleData.textChannelId) {
    const textCh = guild.channels.cache.get(circleData.textChannelId)
      || (await guild.channels.fetch(circleData.textChannelId).catch(() => null));
    if (textCh) await textCh.delete(reason).catch(() => {});
  }

  if (circleData.voiceChannelId) {
    const voiceCh = guild.channels.cache.get(circleData.voiceChannelId)
      || (await guild.channels.fetch(circleData.voiceChannelId).catch(() => null));
    if (voiceCh) await voiceCh.delete(reason).catch(() => {});
  }

  // Hapus kategori
  if (circleData.categoryId) {
    const cat = guild.channels.cache.get(circleData.categoryId)
      || (await guild.channels.fetch(circleData.categoryId).catch(() => null));
    if (cat) await cat.delete(reason).catch(() => {});
  }

  // Hapus role
  if (circleData.roleId) {
    const role = guild.roles.cache.get(circleData.roleId)
      || (await guild.roles.fetch(circleData.roleId).catch(() => null));
    if (role) await role.delete(reason).catch(() => {});
  }

  // Bersihkan DB
  await client.db.delete(circleKey(guild.id, circleData.id));
  await client.db.delete(userCircleKey(guild.id, circleData.ownerId));

  const circlesList = (await client.db.get(guildCirclesListKey(guild.id), [])) || [];
  const updatedList = circlesList.filter((id) => id !== circleData.id);
  await client.db.set(guildCirclesListKey(guild.id), updatedList);

  return true;
}

/** Membuat Private Circle; bila gagal di tengah jalan, semua resource yang sudah dibuat dibatalkan (rollback). */
export async function createPrivateCircle(client, guild, member, rawCircleName) {
  const created = [];
  try {
    return await buildCircle(client, guild, member, rawCircleName, created);
  } catch (error) {
    for (const res of created.reverse()) await res.delete('Rollback: pembuatan circle gagal').catch(() => {});
    throw error;
  }
}

export const circleRequestKey = (guildId, reqId) => `guild:${guildId}:circle_requests:${reqId}`;

export function getCircleConfig(guildConfig) {
  const c = guildConfig?.circle ?? {};
  return { requireApproval: c.requireApproval === true, reviewChannelId: c.reviewChannelId ?? null };
}
