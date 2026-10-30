import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { renderConfigView } from '../../services/configHubService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Open the Pacil Bot settings hub')
    .setDescriptionLocalizations({ id: 'Buka pusat pengaturan Pacil Bot' })
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  category: 'Core',

  async execute(interaction, _guildConfig, client) {
    const view = await renderConfigView(client, interaction.guild, 'home');
    return interaction.reply({ ...view, flags: MessageFlags.Ephemeral });
  },
};
