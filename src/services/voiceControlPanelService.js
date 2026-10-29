import { ActionRowBuilder, StringSelectMenuBuilder, VideoQualityMode } from 'discord.js';
import { pacilButtons, pacilId, pacilPanel } from '../ui/pacil.js';
import { formatLimit, normalizeRoomRecord, regionLabel } from './voiceRoomLogic.js';

const MAX_MENTIONS = 10;

function mentionList(ids) {
  if (!ids.length) return '—';
  const shown = ids.slice(0, MAX_MENTIONS).map((id) => `<@${id}>`).join(' ');
  return ids.length > MAX_MENTIONS ? `${shown} +${ids.length - MAX_MENTIONS}` : shown;
}

/**
 * Bangun embed + komponen panel kontrol ruang voice.
 * Murni terhadap `channel` (hanya membaca properti) dan `record`.
 */
export function buildVoicePanel(channel, rawRecord, { ownerPresent = true } = {}) {
  const room = normalizeRoomRecord(rawRecord);
  const fullVideo = channel.videoQualityMode === VideoQualityMode.Full;

  const embed = pacilPanel({
    title: 'Kontrol Ruang Voice',
    icon: '🎛️',
    tone: 'panel',
    description: ownerPresent
      ? `Ruang ini dikelola <@${room.ownerId}>. Pakai tombol di bawah untuk mengatur ruang.`
      : 'Pemilik sedang tidak ada di ruang. Siapa pun yang ada di sini bisa menekan **Klaim** untuk jadi pemilik baru.',
    fields: [
      { name: 'Akses', value: `${room.locked ? '🔒 Terkunci' : '🔓 Terbuka'}\n${room.hidden ? '🙈 Tersembunyi' : '👁️ Terlihat'}`, inline: true },
      { name: 'Kapasitas', value: formatLimit(channel.userLimit), inline: true },
      { name: 'Kualitas', value: `${Math.round((channel.bitrate || 0) / 1000)} kbps\nVideo ${fullVideo ? '720p' : 'otomatis'}`, inline: true },
      { name: 'Region', value: regionLabel(channel.rtcRegion), inline: true },
      { name: 'Status ruang', value: room.status || '—', inline: true },
      { name: 'Diizinkan', value: mentionList(room.allowed), inline: false },
      { name: 'Diblokir', value: mentionList(room.blocked), inline: false },
    ],
    footer: 'Pacil Baik • Hanya pemilik atau pengurus yang bisa mengubah',
  });

  const id = (action) => pacilId('voiceControl', action, channel.id);
  const rows = pacilButtons([
    { id: id('lock'), label: room.locked ? 'Buka' : 'Kunci', emoji: room.locked ? '🔓' : '🔒', style: room.locked ? 'success' : 'secondary' },
    { id: id('hide'), label: room.hidden ? 'Tampilkan' : 'Sembunyikan', emoji: room.hidden ? '👁️' : '🙈', style: 'secondary' },
    { id: id('rename'), label: 'Nama', emoji: '✏️', style: 'primary' },
    { id: id('limit'), label: 'Batas', emoji: '👥', style: 'primary' },
    { id: id('bitrate'), label: 'Bitrate', emoji: '🎚️', style: 'primary' },
    { id: id('video'), label: fullVideo ? 'Video 720p' : 'Video Auto', emoji: '🎥', style: 'secondary' },
    { id: id('region'), label: 'Region', emoji: '🌐', style: 'secondary' },
    { id: id('status'), label: 'Status', emoji: '📝', style: 'secondary' },
    { id: id('claim'), label: 'Klaim', emoji: '👑', style: ownerPresent ? 'secondary' : 'success', disabled: ownerPresent },
  ]);

  const userMenu = new StringSelectMenuBuilder()
    .setCustomId(pacilId('voiceMenu', 'user', channel.id))
    .setPlaceholder('Kelola pengguna…')
    .addOptions(
      { label: 'Izinkan pengguna', value: 'allow', emoji: '✅', description: 'Boleh masuk walau ruang terkunci atau tersembunyi' },
      { label: 'Blokir pengguna', value: 'block', emoji: '⛔', description: 'Tidak bisa melihat atau masuk ke ruang' },
      { label: 'Cabut izin atau blokir', value: 'reset', emoji: '♻️', description: 'Kembalikan ke aturan umum ruang' },
      { label: 'Keluarkan dari ruang', value: 'kick', emoji: '🚪', description: 'Putuskan koneksi suaranya sekarang' },
      { label: 'Serahkan kepemilikan', value: 'transfer', emoji: '👑', description: 'Jadikan orang lain pemilik ruang' },
    );

  return { embeds: [embed], components: [...rows, new ActionRowBuilder().addComponents(userMenu)] };
}

/** Posting panel awal di chat ruang voice. Mengembalikan pesan agar ID-nya bisa disimpan. */
export async function postVoiceControlPanel(voiceChannel, owner, triggerChannel, record = { ownerId: owner.id }) {
  if (!voiceChannel || typeof voiceChannel.send !== 'function') return null;
  const payload = buildVoicePanel(voiceChannel, { ...record, ownerId: owner.id }, { ownerPresent: true });
  return voiceChannel.send({ ...payload, allowedMentions: { parse: [] } });
}
