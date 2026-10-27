import { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getGuildConfig } from '../../../services/config/guildConfig.js';
import { confessionCooldownKey, confessionKey, getConfessionConfig, newConfessionId, publicConfessionEmbed, reviewConfessionEmbed } from '../../../services/confessionService.js';
import { t } from '../../../utils/i18n.js';

const MAX_CONTENT = 1800;

export default {
  name: 'confession_modal',
  async execute(interaction, client, [expectedGuildId]) {
    if (!interaction.guildId || interaction.guildId !== expectedGuildId) return;
    const config = getConfessionConfig(await getGuildConfig(client, interaction.guildId));
    if (!config.enabled || !config.channelId) {
      return interaction.reply({ content: t(interaction, config.enabled ? 'missingChannel' : 'disabled'), flags: MessageFlags.Ephemeral });
    }
    const content = interaction.fields.getTextInputValue('content')?.trim();
    if (!content) return interaction.reply({ content: t(interaction, 'invalidContent'), flags: MessageFlags.Ephemeral });
    const cooldownKey = confessionCooldownKey(interaction.guildId, interaction.user.id);
    const lastSentAt = await client.db.get(cooldownKey, 0);
    const cooldownMs = Math.max(0, Number(config.cooldownMinutes) || 0) * 60_000;
    const remaining = Number(lastSentAt) + cooldownMs - Date.now();
    if (remaining > 0) {
      return interaction.reply({ content: t(interaction, 'tooFast', { minutes: Math.ceil(remaining / 60_000) }), flags: MessageFlags.Ephemeral });
    }
    const destination = await interaction.guild.channels.fetch(config.requireApproval ? config.reviewChannelId : config.channelId).catch(() => null);
    if (!destination?.isTextBased()) {
      return interaction.reply({ content: t(interaction, config.requireApproval ? 'missingReview' : 'missingChannel'), flags: MessageFlags.Ephemeral });
    }
    const confession = { id: newConfessionId(), guildId: interaction.guildId, authorId: interaction.user.id, content: content.slice(0, MAX_CONTENT), status: config.requireApproval ? 'pending' : 'published', createdAt: Date.now() };
    await client.db.set(confessionKey(interaction.guildId, confession.id), confession);
    await client.db.set(cooldownKey, Date.now());
    if (config.requireApproval) {
      await destination.send({
        embeds: [reviewConfessionEmbed(confession, interaction)],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`confessApprove:${confession.id}`).setLabel(t(interaction, 'approve')).setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`confessReject:${confession.id}`).setLabel(t(interaction, 'reject')).setStyle(ButtonStyle.Danger),
        )], allowedMentions: { parse: [] },
      });
    } else {
      await destination.send({ embeds: [publicConfessionEmbed(confession, interaction)], allowedMentions: { parse: [] } });
    }
    return interaction.reply({ content: `${t(interaction, 'submitted')} — ${t(interaction, config.requireApproval ? 'submittedReview' : 'submittedPublished')}`, flags: MessageFlags.Ephemeral });
  },
};
