// Logika Welcome/Goodbye: satu tempat untuk membangun kartu sambutan, dipakai event member DAN panel /pacilsetup (preview).
// Sumber data tunggal: getWelcomeConfig/saveWelcomeConfig (utils/database.js).

import { buildPacilEmbed } from '../ui/pacil.js';
import { formatWelcomeMessage } from '../utils/welcome.js';

export const WELCOME_DEFAULT_MESSAGE =
  'Halo {user}, selamat datang di **{server}**, rumah digital mahasiswa Fakultas Ilmu Komputer Universitas Indonesia!';
export const GOODBYE_DEFAULT_MESSAGE = '**{user.username}** telah meninggalkan **{server}**. Sampai jumpa!';
export const WELCOME_DEFAULT_TITLE = 'Selamat Datang, {user.username}!';
export const GOODBYE_DEFAULT_TITLE = 'Sampai Jumpa';
export const MAX_AUTOROLES = 5;
export const MAX_AUTOROLE_DELAY_SECONDS = 3600;

/** Teks tampilan untuk template (token dikenali: {user} {user.username} {user.tag} {server} {memberCount}). */
export const TEMPLATE_TOKENS = '{user} {user.username} {user.tag} {server} {memberCount}';

const avatar = (user) => user.displayAvatarURL({ extension: 'png', size: 512 });

export function buildWelcomeEmbed({ member, config, inviterId = null, guideChannelId = config?.guideChannelId ?? null }) {
  const { user, guild } = member;
  const data = { user, guild, member };
  const fields = [
    { name: '📍 Member Ke-', value: `#${guild.memberCount}`, inline: true },
    { name: '🔗 Diundang oleh', value: inviterId ? `<@${inviterId}>` : 'Tidak terdeteksi (link langsung)', inline: true },
  ];
  if (guideChannelId) {
    fields.push({ name: '📚 Langkah Pertama', value: `Baca panduan di <#${guideChannelId}> lalu ambil peran angkatanmu.`, inline: false });
  }
  return buildPacilEmbed({
    title: formatWelcomeMessage(config.welcomeTitle || WELCOME_DEFAULT_TITLE, data),
    description: formatWelcomeMessage(config.welcomeMessage || WELCOME_DEFAULT_MESSAGE, data),
    tone: 'gold',
    thumbnail: avatar(user),
    image: config.welcomeImage || config.welcomeEmbed?.image?.url || undefined,
    fields,
  });
}

export function buildGoodbyeEmbed({ member, config }) {
  const { user, guild } = member;
  const data = { user, guild, member };
  return buildPacilEmbed({
    title: formatWelcomeMessage(config.goodbyeTitle || GOODBYE_DEFAULT_TITLE, data),
    description: formatWelcomeMessage(config.leaveMessage || GOODBYE_DEFAULT_MESSAGE, data),
    tone: 'navy',
    thumbnail: avatar(user),
    fields: [{ name: '👥 Jumlah Member', value: String(guild.memberCount), inline: true }],
  });
}

/** Ringkasan konfigurasi untuk panel: tiap pengaturan tampil dengan status teks (bukan hanya warna). */
export function summarizeWelcome(config) {
  const on = (v) => (v ? '✅ Aktif' : '⛔ Nonaktif');
  const ch = (id) => (id ? `<#${id}>` : '⚠️ Belum diatur');
  return {
    arrival: [
      { name: 'Status', value: on(config.enabled), inline: true },
      { name: 'Channel Sambutan', value: ch(config.channelId), inline: true },
      { name: 'Channel Panduan', value: config.guideChannelId ? `<#${config.guideChannelId}>` : '— (tidak ditampilkan)', inline: true },
      { name: 'Mention Member', value: config.welcomePing ? '✅ Ya' : '⛔ Tidak', inline: true },
      { name: 'Gambar Banner', value: config.welcomeImage ? '✅ Terpasang' : '— Tidak ada', inline: true },
      {
        name: 'Auto-Role',
        value: config.roleIds?.length
          ? `${config.roleIds.map((r) => `<@&${r}>`).join(' ')}${config.autoRoleDelay ? ` (tunda ${config.autoRoleDelay} dtk)` : ''}`
          : '— Tidak ada',
        inline: false,
      },
    ],
    goodbye: [
      { name: 'Status', value: on(config.goodbyeEnabled), inline: true },
      { name: 'Channel Perpisahan', value: ch(config.goodbyeChannelId), inline: true },
      { name: 'Mention Member', value: config.goodbyePing ? '✅ Ya' : '⛔ Tidak', inline: true },
    ],
  };
}

/** Tanda yang menghalangi sambutan berjalan (untuk ditampilkan sebagai peringatan di panel). */
export function welcomeProblems(guild, config, kind = 'arrival') {
  const id = kind === 'arrival' ? config.channelId : config.goodbyeChannelId;
  const enabled = kind === 'arrival' ? config.enabled : config.goodbyeEnabled;
  if (!enabled) return [];
  if (!id) return ['Channel tujuan belum dipilih.'];
  const channel = guild.channels?.cache?.get(id);
  if (!channel) return ['Channel tujuan sudah terhapus; pilih ulang.'];
  const perms = guild.members?.me ? channel.permissionsFor(guild.members.me) : null;
  if (perms && !perms.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) return ['Bot tidak punya izin Lihat/Kirim Pesan/Sematkan Tautan di channel tujuan.'];
  return [];
}
