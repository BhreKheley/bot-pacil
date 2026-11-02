import { EmbedBuilder } from 'discord.js';
import { getColor } from '../config/bot.js';

export const PACIL_COLORS = Object.freeze({
  navy: 0x0D3A73,
  gold: 0xF2A900,
  success: 0x10B981,
  error: 0xEF4444,
  warning: 0xF59E0B,
  info: 0x0284C7,
});

export const PACIL_FOOTER = 'Makara Fasilkom UI • Pacil Bot';
export const PACIL_AVATAR_FALLBACK = 'https://raw.githubusercontent.com/BhreKheley/bot-pacil/main/assets/makara-ui.png';

/**
 * Utilitas terpusat untuk membangun Embed dengan standar UI/UX kebanggaan Makara Fasilkom UI.
 * Memastikan base color (#0d3a73 / #f2a900), footer teks ("Makara Fasilkom UI • Pacil Bot"),
 * dan layout visual selalu konsisten di seluruh fitur bot.
 * 
 * @param {{
 *   title: string,
 *   description?: string,
 *   tone?: 'navy' | 'gold' | 'success' | 'warning' | 'error' | 'info',
 *   color?: string | number,
 *   fields?: { name: string, value: string, inline?: boolean }[],
 *   footer?: string,
 *   thumbnail?: string,
 *   image?: string,
 *   author?: { name: string, iconURL?: string }
 * }} opts
 */
export function buildPacilEmbed({
  title,
  description,
  tone = 'navy',
  color,
  fields = [],
  footer,
  thumbnail,
  image,
  author,
} = {}) {
  const chosenColor = color
    ? (typeof color === 'string' ? getColor(color) : color)
    : (PACIL_COLORS[tone] ?? PACIL_COLORS.navy);

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(chosenColor)
    .setFooter({ text: footer ?? PACIL_FOOTER })
    .setTimestamp();

  if (description) embed.setDescription(description.slice(0, 4000));
  if (fields.length) {
    embed.addFields(
      fields
        .filter((f) => f?.name && f?.value)
        .slice(0, 25)
        .map((f) => ({
          name: f.name.slice(0, 256),
          value: String(f.value).slice(0, 1024),
          inline: Boolean(f.inline),
        }))
    );
  }
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (author) embed.setAuthor(author);

  return embed;
}

