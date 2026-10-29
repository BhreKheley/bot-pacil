import {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags,
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
} from 'discord.js';
import { countStickies, getSticky, listStickies, removeSticky } from '../../services/stickyService.js';
import { STICKY_LIMITS } from '../../services/stickyLogic.js';
import { pacilNotice, pacilPanel } from '../../ui/pacil.js';
import { t } from '../../utils/i18n.js';

const TEXT_CHANNELS = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

const channelOption = (opt) => opt
  .setName('channel')
  .setDescription('Target channel')
  .setDescriptionLocalizations({ id: 'Channel tujuan' })
  .addChannelTypes(...TEXT_CHANNELS)
  .setRequired(true);

export default {
  data: new SlashCommandBuilder()
    .setName('sticky')
    .setDescription('Keep a message pinned at the bottom of a channel')
    .setDescriptionLocalizations({ id: 'Sematkan pesan di bagian bawah channel' })
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(sub => sub.setName('set').setDescription('Create or edit a sticky message').setDescriptionLocalizations({ id: 'Buat atau ubah pesan sticky' }).addChannelOption(channelOption))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove a sticky message').setDescriptionLocalizations({ id: 'Hapus pesan sticky' }).addChannelOption(channelOption))
    .addSubcommand(sub => sub.setName('list').setDescription('List sticky messages').setDescriptionLocalizations({ id: 'Lihat daftar sticky' })),
  category: 'Community',

  async execute(interaction, _config, client) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: t(interaction, 'stickyNoPermission'), flags: MessageFlags.Ephemeral });
    }
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (subcommand === 'list') {
      const stickies = await listStickies(client, guildId);
      const embed = pacilPanel({
        title: t(interaction, 'stickyListTitle'),
        icon: '📌',
        description: stickies.length
          ? stickies.map((s) => `<#${s.channelId}> • **${s.title || '—'}** • <t:${Math.floor(s.updatedAt / 1000)}:R>`).join('\n')
          : t(interaction, 'stickyEmpty'),
      });
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    const channel = interaction.options.getChannel('channel');
    if (!TEXT_CHANNELS.includes(channel.type)) {
      return interaction.reply({ content: t(interaction, 'stickyBadChannel'), flags: MessageFlags.Ephemeral });
    }
    const existing = await getSticky(client, guildId, channel.id);

    if (subcommand === 'remove') {
      if (!existing) return interaction.reply({ content: t(interaction, 'stickyNotFound'), flags: MessageFlags.Ephemeral });
      const fullChannel = await interaction.guild.channels.fetch(channel.id).catch(() => null);
      await removeSticky(client, guildId, channel.id, fullChannel);
      return interaction.reply({
        embeds: [pacilNotice({ tone: 'success', title: t(interaction, 'stickyModalTitle'), body: t(interaction, 'stickyRemoved', { channel: `<#${channel.id}>` }) })],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!existing && (await countStickies(client, guildId)) >= STICKY_LIMITS.maxPerGuild) {
      return interaction.reply({ content: t(interaction, 'stickyLimit', { max: STICKY_LIMITS.maxPerGuild }), flags: MessageFlags.Ephemeral });
    }

    const input = (id, label, style, required, value, max) => {
      const field = new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setRequired(required).setMaxLength(max);
      if (value) field.setValue(String(value).slice(0, max));
      return new ActionRowBuilder().addComponents(field);
    };
    const modal = new ModalBuilder()
      .setCustomId(`stickyModal:${channel.id}`)
      .setTitle(t(interaction, 'stickyModalTitle'))
      .addComponents(
        input('title', t(interaction, 'stickyTitleLabel'), TextInputStyle.Short, false, existing?.title, 256),
        input('content', t(interaction, 'stickyContentLabel'), TextInputStyle.Paragraph, true, existing?.content, 4000),
        input('color', t(interaction, 'stickyColorLabel'), TextInputStyle.Short, false, existing?.color, 7),
      );
    return interaction.showModal(modal);
  },
};
