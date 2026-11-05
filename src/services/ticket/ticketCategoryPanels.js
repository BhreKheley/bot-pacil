import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { buildPacilEmbed } from '../../ui/pacil.js';

export const TICKET_CATEGORIES = {
  bantuan: {
    key: 'bantuan',
    name: 'Bantuan',
    channelPrefix: 'help',
    title: 'PACIL SUPPORT — BANTUAN',
    description:
      'Butuh bantuan?\n\n' +
      'Gunakan ticket ini untuk mendapatkan bantuan dari Staff Fasilkom UI.\n\n' +
      '**Contoh:**\n' +
      '• Pertanyaan tentang server & perkuliahan\n' +
      '• Bantuan menggunakan fitur bot & server\n' +
      '• Technical Issue\n' +
      '• Request bantuan lainnya\n\n' +
      'Klik tombol di bawah untuk membuat ticket.\n' +
      '*Pacil Help-desk*',
    buttonLabel: 'Buat Ticket Bantuan',
    buttonEmoji: '💬',
    buttonStyle: ButtonStyle.Primary,
    tone: 'navy',
  },
  report: {
    key: 'report',
    name: 'Report',
    channelPrefix: 'report',
    title: 'PACIL SUPPORT — REPORT',
    description:
      'Ingin melaporkan sesuatu?\n\n' +
      'Gunakan ticket ini untuk melaporkan masalah yang terjadi di server.\n\n' +
      '**Contoh:**\n' +
      '• Report Member\n' +
      '• Report Spam / Scam\n' +
      '• Report pelanggaran server\n' +
      '• Appeal Punishment\n' +
      '• Request Unmute / Unban\n\n' +
      'Mohon sertakan bukti dan informasi yang jelas jika tersedia.\n\n' +
      'Klik tombol di bawah untuk membuat ticket.\n' +
      '*Pacil Help-desk*',
    buttonLabel: 'Buat Ticket Report',
    buttonEmoji: '🚨',
    buttonStyle: ButtonStyle.Danger,
    tone: 'danger',
  },
  suggestion: {
    key: 'suggestion',
    name: 'Suggestion',
    channelPrefix: 'saran',
    title: 'PACIL SUPPORT — SUGGESTION',
    description:
      'Punya ide untuk Pacil Server?\n\n' +
      'Gunakan ticket ini untuk memberikan saran atau masukan mengenai server.\n\n' +
      '**Contoh:**\n' +
      '• Suggestion fitur\n' +
      '• Suggestion channel\n' +
      '• Suggestion event\n' +
      '• Suggestion sistem server\n' +
      '• Ide pengembangan komunitas\n\n' +
      'Jelaskan ide kamu dengan detail agar lebih mudah dipertimbangkan.\n\n' +
      'Klik tombol di bawah untuk membuat ticket.\n' +
      '*Pacil Help-desk*',
    buttonLabel: 'Buat Ticket Suggestion',
    buttonEmoji: '💡',
    buttonStyle: ButtonStyle.Primary,
    tone: 'gold',
  },
};

/**
 * Builds the per-category ticket panel matching Screenshots 3, 4, 5.
 */
export function buildCategoryTicketPanel(categoryKey) {
  const cat = TICKET_CATEGORIES[categoryKey] || TICKET_CATEGORIES.bantuan;

  const embed = buildPacilEmbed({
    title: cat.title,
    description: cat.description,
    tone: cat.tone,
  });

  const button = new ButtonBuilder()
    .setCustomId(`ticket_create_cat:${cat.key}`)
    .setLabel(cat.buttonLabel)
    .setStyle(cat.buttonStyle)
    .setEmoji(cat.buttonEmoji);

  const row = new ActionRowBuilder().addComponents(button);

  return { embeds: [embed], components: [row] };
}
