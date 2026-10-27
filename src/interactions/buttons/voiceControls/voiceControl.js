import { PermissionFlagsBits, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { getTemporaryChannelInfo } from '../../../utils/database.js';

async function canManage(interaction, client, channelId) {
  const record = await getTemporaryChannelInfo(client, interaction.guildId, channelId);
  return Boolean(record && (record.ownerId === interaction.user.id || interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)));
}

export default {
  name: 'voiceControl',
  async execute(interaction, client, [action, channelId]) {
    const channel = await interaction.guild?.channels.fetch(channelId).catch(() => null);
    if (!channel || !await canManage(interaction, client, channelId)) {
      return interaction.reply({ content: 'Hanya pemilik ruang atau pengurus server yang dapat memakai kontrol ini.', flags: MessageFlags.Ephemeral });
    }
    if (action === 'rename') {
      const modal = new ModalBuilder().setCustomId(`voiceControlRename:${channelId}`).setTitle('Ganti Nama Ruang Voice');
      const input = new TextInputBuilder().setCustomId('name').setLabel('Nama baru (maks. 100 karakter)').setStyle(TextInputStyle.Short).setValue(channel.name).setMinLength(1).setMaxLength(100).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }
    const locked = action === 'lock';
    await channel.permissionOverwrites.edit(interaction.guildId, { Connect: locked ? false : null });
    return interaction.reply({ content: locked ? '🔒 Ruang voice dikunci. Member baru tidak dapat masuk.' : '🔓 Ruang voice dibuka kembali.', flags: MessageFlags.Ephemeral });
  },
};
