import { ChannelType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { repostSticky, saveSticky } from '../../../services/stickyService.js';
import { validateSticky } from '../../../services/stickyLogic.js';
import { pacilNotice } from '../../../ui/pacil.js';
import { t } from '../../../utils/i18n.js';

export default {
  name: 'stickyModal',
  async execute(interaction, client, [channelId]) {
    if (!interaction.guildId) return;
    const ephemeral = { flags: MessageFlags.Ephemeral };
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: t(interaction, 'stickyNoPermission'), ...ephemeral });
    }

    const checked = validateSticky({
      title: interaction.fields.getTextInputValue('title'),
      content: interaction.fields.getTextInputValue('content'),
      color: interaction.fields.getTextInputValue('color'),
    });
    if (!checked.ok) return interaction.reply({ content: t(interaction, `stickyErr_${checked.error}`), ...ephemeral });

    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) {
      return interaction.reply({ content: t(interaction, 'stickyBadChannel'), ...ephemeral });
    }

    await interaction.deferReply(ephemeral);
    await saveSticky(client, interaction.guildId, channel.id, checked.value, interaction.user.id);
    await repostSticky(client, channel);
    return interaction.editReply({
      embeds: [pacilNotice({ tone: 'success', title: t(interaction, 'stickyModalTitle'), body: t(interaction, 'stickySaved', { channel: `<#${channel.id}>` }) })],
    });
  },
};
