import { MessageFlags } from 'discord.js';
import { createPrivateCircle } from '../../../services/circleService.js';
import { buildPacilEmbed } from '../../../ui/pacil.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'circleCreateModal',
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const circleName = interaction.fields.getTextInputValue('circle_name')?.trim();

    try {
      const result = await createPrivateCircle(
        client,
        interaction.guild,
        interaction.member,
        circleName
      );

      const successEmbed = buildPacilEmbed({
        title: '🎉 Private Circle Berhasil Dibuat!',
        description: `Circle **"${result.circle.name}"** telah siap digunakan bersama teman-temanmu!`,
        tone: 'success',
        fields: [
          { name: '💬 Text Channel', value: `<#${result.textChannel.id}>`, inline: true },
          { name: '🔊 Voice Channel', value: `<#${result.voiceChannel.id}>`, inline: true },
          { name: '🎭 Role Circle', value: `<@&${result.role.id}>`, inline: true },
          { name: '💡 Langkah Selanjutnya', value: `Masuk ke channel <#${result.textChannel.id}> dan ajak temanmu dengan command \`/circle add @user\`.`, inline: false },
        ],
        footer: 'Pacil Baik • Fasilkom UI Circle System',
      });

      return await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      logger.error('Error saat membuat Private Circle:', error);
      const errorEmbed = buildPacilEmbed({
        title: '❌ Gagal Membuat Circle',
        description: error.message || 'Terjadi kesalahan sistem saat membuat room circle.',
        tone: 'error',
      });
      return await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
