import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { renderMainDashboard } from '../../ui/panels/mainDashboard.js';
import { denyIfNoSetupAccess } from '../../utils/setupGuard.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pacilsetup')
    .setDescription('Buka pusat pengaturan Pacil Bot (khusus Administrator)')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  category: 'Admin',

  async execute(interaction) {
    if (await denyIfNoSetupAccess(interaction)) return;
    return interaction.reply({ ...renderMainDashboard(interaction.guild), flags: MessageFlags.Ephemeral });
  },
};
