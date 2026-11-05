import {
  MessageFlags,
  PermissionFlagsBits,
  TextInputStyle,
} from 'discord.js';
import { safeModal, safeTextInputRow } from '../../../utils/modalHelper.js';

export default {
  name: 'circleRequest',
  async execute(interaction) {
    if (!interaction.member?.premiumSince && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content:
          '❌ **Fitur Khusus Server Booster**\n' +
          'Untuk membuat Private Circle kamu sendiri, kamu perlu menjadi **Server Booster** terlebih dahulu.\n' +
          'Dukungan boost kamu akan diapresiasi di **#boost-hall**!',
        flags: MessageFlags.Ephemeral,
      });
    }

    const modal = safeModal({
      customId: `circleCreateModal:${interaction.guildId}`,
      title: 'Buat Private Circle Baru',
      rows: [
        safeTextInputRow({
          id: 'circle_name',
          label: 'Nama Circle / Kelompok',
          style: TextInputStyle.Short,
          placeholder: 'Contoh: Circle Alpro A, Tim Capstone',
          min: 2,
          max: 32,
          required: true,
        }),
      ],
    });

    return await interaction.showModal(modal);
  },
};

