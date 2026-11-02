import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import { renderMainDashboard } from '../../components/panels/mainDashboard.js';
import { getGuildConfig } from '../../services/config/guildConfig.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pacilsetup')
    .setDescription('Panel konfigurasi tersentralisasi Pacil Bot (Khusus Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),
  category: 'Admin',

  async execute(interaction, _config, client) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '❌ Command ini hanya dapat diakses oleh Administrator server.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const guildConfig = await getGuildConfig(client, interaction.guildId);
    const panel = renderMainDashboard(guildConfig, interaction.guild);

    return await interaction.reply({
      ...panel,
      flags: MessageFlags.Ephemeral,
    });
  },
};
