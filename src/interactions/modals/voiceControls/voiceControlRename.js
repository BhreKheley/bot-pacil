import { PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getTemporaryChannelInfo } from '../../../utils/database.js';
import { sanitizeInput } from '../../../utils/validation.js';

export default {
  name: 'voiceControlRename',
  async execute(interaction, client, [channelId]) {
    const record = await getTemporaryChannelInfo(client, interaction.guildId, channelId);
    const allowed = record && (record.ownerId === interaction.user.id || interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels));
    const channel = await interaction.guild?.channels.fetch(channelId).catch(() => null);
    if (!allowed || !channel) return interaction.reply({ content: 'Ruang ini sudah tidak tersedia atau kamu tidak memiliki izin.', flags: MessageFlags.Ephemeral });
    const name = sanitizeInput(interaction.fields.getTextInputValue('name'), 100).replace(/[\r\n]/g, ' ').trim();
    if (!name) return interaction.reply({ content: 'Nama ruang tidak boleh kosong.', flags: MessageFlags.Ephemeral });
    await channel.setName(name, `Temporary voice room renamed by ${interaction.user.id}`);
    return interaction.reply({ content: `✏️ Nama ruang diubah menjadi **${name}**.`, flags: MessageFlags.Ephemeral });
  },
};
