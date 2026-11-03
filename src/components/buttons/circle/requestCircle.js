import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';

export default {
  name: 'circleRequest',
  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId(`circleCreateModal:${interaction.guildId}`)
      .setTitle('Buat Private Circle Baru');

    const nameInput = new TextInputBuilder()
      .setCustomId('circle_name')
      .setLabel('Nama Circle / Kelompok')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: Circle Alpro A, Geng Kancil, Tim Capstone')
      .setMinLength(2)
      .setMaxLength(32)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(nameInput));

    return await interaction.showModal(modal);
  },
};

