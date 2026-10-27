import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed } from '../utils/embeds.js';

/** Posts a compact owner-only control panel in the temporary voice channel chat. */
export async function postVoiceControlPanel(voiceChannel, owner, triggerChannel) {
  if (!voiceChannel || typeof voiceChannel.send !== 'function') return null;

  const embed = createEmbed({
    title: '🎛️ Kontrol Ruang Voice',
    description: [
      `Selamat datang, ${owner}. Kamu adalah pemilik sementara ruang **${voiceChannel.name}**.`,
      '',
      'Gunakan tombol di bawah untuk mengunci ruang, membukanya lagi, atau mengganti nama. Saat ruang kosong, channel ini akan dihapus otomatis.',
      `-# Dibuat dari ${triggerChannel}. Hanya pemilik ruang atau pengurus server yang dapat mengubahnya.`,
    ].join('\n'),
    color: 'secondary',
    footer: { text: 'Pacil Baik • temporary voice controls' },
  });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`voiceControl:lock:${voiceChannel.id}`).setLabel('Kunci').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`voiceControl:unlock:${voiceChannel.id}`).setLabel('Buka').setEmoji('🔓').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`voiceControl:rename:${voiceChannel.id}`).setLabel('Ganti Nama').setEmoji('✏️').setStyle(ButtonStyle.Primary),
  );
  return voiceChannel.send({ embeds: [embed], components: [row], allowedMentions: { users: [owner.id] } });
}
