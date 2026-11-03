import { MessageFlags } from 'discord.js';
import { authorizeRoomAction, describeDiscordError, refreshPanel } from '../../../services/voiceRoomService.js';
import { sanitizeRoomName } from '../../../services/voiceRoomLogic.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'voiceControlRename',
  async execute(interaction, client, [channelId]) {
    const ctx = await authorizeRoomAction(interaction, client, channelId);
    if (!ctx) return;
    const name = sanitizeRoomName(interaction.fields.getTextInputValue('value'));
    if (!name) return interaction.reply({ content: 'Nama ruang tidak boleh kosong.', flags: MessageFlags.Ephemeral });
    // Ganti nama kena rate limit Discord (2x per 10 menit): defer dulu agar tidak kedaluwarsa.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await ctx.channel.setName(name, `Voice room: nama diubah oleh ${interaction.user.id}`);
    } catch (error) {
      logger.warn(`Rename voice ${channelId} gagal: ${error.message}`);
      return interaction.editReply({ content: describeDiscordError(error) });
    }
    await refreshPanel(client, ctx.channel);
    return interaction.editReply({ content: `✏️ Nama ruang diubah menjadi **${name}**.` });
  },
};
