import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { renderWelcomeSubPanel } from '../../ui/panels/welcomeSubPanel.js';
import { buildWelcomeEmbed } from '../../services/welcomeService.js';
import { getWelcomeConfig } from '../../utils/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Lihat sambutan selamat datang atau buka konfigurasi Welcome System')
    .setDMPermission(false),
  category: 'Community',

  async execute(interaction, config, client) {
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
      || interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);

    if (isAdmin) {
      const panel = await renderWelcomeSubPanel(client, interaction.guild, { view: 'arrival' });
      return interaction.reply({ ...panel, flags: MessageFlags.Ephemeral });
    }

    const welcomeConfig = await getWelcomeConfig(client, interaction.guildId);
    const embed = buildWelcomeEmbed({
      member: interaction.member,
      config: welcomeConfig,
      inviterId: null,
    });

    return interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  },
};
