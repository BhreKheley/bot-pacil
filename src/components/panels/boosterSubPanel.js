import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { buildPacilEmbed } from '../../ui/pacil.js';

export async function renderBoosterSubPanel(client, guild) {
  const boostCount = guild.premiumSubscriptionCount || 0;
  const boostTier = guild.premiumTier || 0;

  const embed = buildPacilEmbed({
    title: '🎭 Sub-Panel: Booster Roles',
    description:
      'Apresiasi khusus bagi para mahasiswa dan anggota yang memberikan Server Boost untuk server Pacil Baik.',
    tone: 'gold',
    fields: [
      {
        name: '🚀 Status Boost Server',
        value: `• Level Server: **Tier ${boostTier}**\n• Jumlah Boosts: **${boostCount} Boost**`,
        inline: true,
      },
      {
        name: '🎨 Kustomisasi Role Booster',
        value: 'Mahasiswa booster dapat memiliki role khusus dengan warna dan ikon kustom.',
        inline: true,
      },
    ],
    footer: 'Pacil Baik • Server Booster System',
  });

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('setupBackMain')
      .setLabel('🔙 Back to Main Menu')
      .setStyle(ButtonStyle.Primary)
  );

  return {
    embeds: [embed],
    components: [buttonRow],
  };
}

