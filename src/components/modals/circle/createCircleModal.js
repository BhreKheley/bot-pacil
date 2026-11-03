import { MessageFlags } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import crypto from 'node:crypto';
import { getGuildConfig } from '../../../services/config/guildConfig.js';
import { createPrivateCircle, getCircleConfig, circleRequestKey, getUserCircle } from '../../../services/circleService.js';
import { buildPacilEmbed } from '../../../ui/pacil.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'circleCreateModal',
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const circleName = interaction.fields.getTextInputValue('circle_name')?.trim();

    try {
      const cfg = getCircleConfig(await getGuildConfig(client, interaction.guildId));
      if (cfg.requireApproval) {
        const review = cfg.reviewChannelId ? await interaction.guild.channels.fetch(cfg.reviewChannelId).catch(() => null) : null;
        if (!review?.isTextBased()) throw new Error('Channel review Circle belum diatur. Hubungi pengurus.');
        if (await getUserCircle(client, interaction.guildId, interaction.user.id)) throw new Error('Kamu sudah memiliki Private Circle aktif.');
        const reqId = crypto.randomBytes(5).toString('hex');
        await client.db.set(circleRequestKey(interaction.guildId, reqId), { userId: interaction.user.id, name: circleName, createdAt: Date.now() });
        await review.send({
          embeds: [buildPacilEmbed({ title: '👥 Permintaan Circle Baru', tone: 'gold', fields: [
            { name: 'Nama', value: circleName, inline: true },
            { name: 'Pemohon', value: `<@${interaction.user.id}> (\`${interaction.user.id}\`)`, inline: true },
          ] })],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`circleReview:approve:${reqId}`).setLabel('Setujui').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`circleReview:reject:${reqId}`).setLabel('Tolak').setStyle(ButtonStyle.Danger),
          )],
          allowedMentions: { parse: [] },
        });
        return await interaction.editReply({ embeds: [buildPacilEmbed({ title: '⏳ Menunggu Persetujuan', description: 'Permintaan circle-mu sudah dikirim ke pengurus. Kamu akan dikabari lewat DM setelah diproses.', tone: 'info' })] });
      }
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

