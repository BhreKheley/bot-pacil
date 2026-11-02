import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { buildPacilEmbed } from '../../ui/pacil.js';
import { getGuildConfig } from '../../services/config/guildConfig.js';
import { getConfessionConfig } from '../../services/confessionService.js';

export async function renderConfessionSubPanel(client, guild) {
  const guildConfig = await getGuildConfig(client, guild.id);
  const config = getConfessionConfig(guildConfig);

  const embed = buildPacilEmbed({
    title: '💌 Sub-Panel: Confession Setup',
    description:
      'Sistem pesan menfess anonim terstruktur untuk mahasiswa Fasilkom UI.\n' +
      'Input wajib mencakup: **From** (nama samaran/anonim), **To** (target penerima), dan **Message** (pesan curhatan).',
    tone: 'gold',
    fields: [
      {
        name: '⚙️ Status Fitur',
        value: config.enabled ? '🟢 **Aktif (Enabled)**' : '🔴 **Nonaktif (Disabled)**',
        inline: true,
      },
      {
        name: '🛡️ Moderasi & Review',
        value: config.requireApproval ? '🟡 **Perlu Persetujuan Moderator**' : '🟢 **Langsung Terbit (Direct)**',
        inline: true,
      },
      {
        name: '💬 Balasan Anonim (Thread)',
        value: config.repliesEnabled !== false ? '🟢 **Aktif**' : '🔴 **Nonaktif**',
        inline: true,
      },
      {
        name: '📢 Channel Publik',
        value: config.channelId ? `<#${config.channelId}>` : '*Belum diatur*',
        inline: true,
      },
      {
        name: '📋 Antrean Review',
        value: config.reviewChannelId ? `<#${config.reviewChannelId}>` : '*Tidak ada*',
        inline: true,
      },
      {
        name: '⏱️ Cooldown Kirim',
        value: `${config.cooldownMinutes || 10} menit`,
        inline: true,
      },
    ],
    footer: 'Pacil Baik • Structured Confession System',
  });

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('setupAction:deploy_confess_panel')
      .setLabel('Pasang Panel Publik')
      .setEmoji('📌')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('setupAction:toggle_confess_approval')
      .setLabel(config.requireApproval ? 'Matikan Review' : 'Aktifkan Review')
      .setEmoji('🛡️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('setupAction:toggle_confess_replies')
      .setLabel(config.repliesEnabled !== false ? 'Matikan Balasan' : 'Aktifkan Balasan')
      .setEmoji('💬')
      .setStyle(ButtonStyle.Secondary),
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
