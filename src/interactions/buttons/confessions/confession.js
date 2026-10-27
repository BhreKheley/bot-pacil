import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { getGuildConfig } from '../../../services/config/guildConfig.js';
import { confessionKey, getConfessionConfig, publicConfessionEmbed } from '../../../services/confessionService.js';
import { t } from '../../../utils/i18n.js';

async function review(interaction, client, [id], action) {
  const config = getConfessionConfig(await getGuildConfig(client, interaction.guildId));
  const hasRole = config.moderatorRoleId && interaction.member?.roles?.cache?.has(config.moderatorRoleId);
  if (!hasRole && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    return interaction.reply({ content: t(interaction, 'noPermission'), flags: MessageFlags.Ephemeral });
  }
  const key = confessionKey(interaction.guildId, id);
  const confession = await client.db.get(key, null);
  if (!confession || confession.status !== 'pending') {
    return interaction.reply({ content: t(interaction, 'alreadyHandled'), flags: MessageFlags.Ephemeral });
  }
  if (action === 'approve') {
    const channel = await interaction.guild.channels.fetch(config.channelId).catch(() => null);
    if (!channel?.isTextBased()) return interaction.reply({ content: t(interaction, 'missingChannel'), flags: MessageFlags.Ephemeral });
    const published = await channel.send({ embeds: [publicConfessionEmbed(confession, interaction)], allowedMentions: { parse: [] } });
    confession.status = 'published'; confession.publishedMessageId = published.id;
  } else confession.status = 'rejected';
  confession.reviewedBy = interaction.user.id; confession.reviewedAt = Date.now();
  await client.db.set(key, confession);
  await interaction.update({ components: [], embeds: interaction.message.embeds });
  return interaction.followUp({ content: t(interaction, action === 'approve' ? 'approved' : 'rejected'), flags: MessageFlags.Ephemeral });
}

export default [
  { name: 'confessApprove', execute: (interaction, client, args) => review(interaction, client, args, 'approve') },
  { name: 'confessReject', execute: (interaction, client, args) => review(interaction, client, args, 'reject') },
];
