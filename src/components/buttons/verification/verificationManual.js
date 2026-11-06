import { verifyUser } from '../../../services/verificationService.js';
import { buildPacilEmbed } from '../../../ui/pacil.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { MessageFlags } from 'discord.js';

export default {
  name: 'verify_user_manual',
  async execute(interaction, client) {
    await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
    const result = await verifyUser(client, interaction.guildId, interaction.user.id, {
      source: 'button_click_manual',
      moderatorId: null,
    });

    if (result.status === 'already_verified') {
      const info = buildPacilEmbed({
        title: 'Sudah Terverifikasi',
        icon: 'ℹ️',
        description: 'Kamu sudah terverifikasi sebelumnya.',
        tone: 'info',
      });
      return await InteractionHelper.safeEditReply(interaction, { embeds: [info] });
    }

    const success = buildPacilEmbed({
      title: 'Verifikasi Berhasil',
      icon: '✅',
      description: `Selamat datang! Kamu telah mendapatkan role **${result.roleName}** dan dapat mengakses seluruh channel server.`,
      tone: 'success',
    });

    return await InteractionHelper.safeEditReply(interaction, { embeds: [success] });
  },
};
