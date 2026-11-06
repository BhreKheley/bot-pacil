import { AttachmentBuilder } from 'discord.js';
import { getGuildConfig, patchGuildConfig } from './config/guildConfig.js';
import { renderTicketSubPanel } from '../ui/panels/ticketSubPanel.js';
import { buildCategoryTicketPanel } from './ticket/ticketCategoryPanels.js';
import { renderTicketGuideCard } from '../utils/imageGenerator.js';
import { logger } from '../utils/logger.js';

let selectedDeployChannel = null;

export async function handleTicketConfigAction(interaction, client) {
  const customId = interaction.customId;
  const guild = interaction.guild;
  const guildConfig = await getGuildConfig(client, guild.id);

  // 1. Staff Role Select
  if (customId === 'setup:ticket:staff_role') {
    const roleId = interaction.values?.[0] || null;
    await patchGuildConfig(client, guild.id, { ticketStaffRoleId: roleId });
    const panel = await renderTicketSubPanel(client, guild, {
      notice: roleId ? `✅ Role staff tiket diatur ke <@&${roleId}>.` : 'ℹ️ Role staff tiket dikosongkan.',
    });
    return interaction.update(panel);
  }

  // 2. Target Channel Select
  if (customId === 'setup:ticket:target_channel') {
    selectedDeployChannel = interaction.values?.[0] || null;
    const panel = await renderTicketSubPanel(client, guild, {
      notice: selectedDeployChannel
        ? `🎯 Channel target dipilih: <#${selectedDeployChannel}>. Klik tombol kategori di bawah untuk memasang.`
        : 'ℹ️ Pilihan channel target dibatalkan.',
    });
    return interaction.update(panel);
  }

  // 3. Toggle DM on Close
  if (customId === 'setup:ticket:toggle_dm') {
    const next = !(guildConfig.ticketDmOnClose ?? true);
    await patchGuildConfig(client, guild.id, { ticketDmOnClose: next });
    const panel = await renderTicketSubPanel(client, guild, {
      notice: next ? '🔔 Notifikasi DM saat tiket ditutup diaktifkan.' : '🔕 Notifikasi DM saat tiket ditutup dinonaktifkan.',
    });
    return interaction.update(panel);
  }

  // 4. Deploy Category Panels (bantuan, report, suggestion)
  if (customId.startsWith('setup:ticket:deploy:')) {
    const category = customId.split(':')[3];
    const targetChannelId = selectedDeployChannel || interaction.channelId;
    const channel = guild.channels.cache.get(targetChannelId);

    if (!channel) {
      const panel = await renderTicketSubPanel(client, guild, {
        notice: '❌ Channel tujuan tidak ditemukan.',
      });
      return interaction.update(panel);
    }

    try {
      const panelPayload = buildCategoryTicketPanel(category);
      const cardBuffer = await renderTicketGuideCard({ category, guildName: guild.name });
      const file = new AttachmentBuilder(cardBuffer, { name: `ticket-${category}-guide.png` });

      if (panelPayload.embeds && panelPayload.embeds[0]) {
        panelPayload.embeds[0].setImage(`attachment://ticket-${category}-guide.png`);
      }

      await channel.send({
        ...panelPayload,
        files: [file],
      });

      const panel = await renderTicketSubPanel(client, guild, {
        notice: `🚀 Panel Tiket **${category.toUpperCase()}** berhasil dipasang di ${channel.toString()}!`,
      });
      return interaction.update(panel);
    } catch (err) {
      logger.error(`Error deploying ticket panel (${category}):`, err);
      const panel = await renderTicketSubPanel(client, guild, {
        notice: `❌ Gagal memasang panel tiket: ${err.message}`,
      });
      return interaction.update(panel);
    }
  }
}
