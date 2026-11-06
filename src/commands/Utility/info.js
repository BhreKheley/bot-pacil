import { SlashCommandBuilder } from 'discord.js';
import { buildPacilEmbed } from '../../ui/pacil.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Informasi pengguna, server, dan avatar komunitas Pacil')
    .addSubcommand((sub) =>
      sub
        .setName('user')
        .setDescription('Lihat profil detail member server')
        .addUserOption((opt) =>
          opt.setName('target').setDescription('Member yang ingin dilihat (default: dirimu)')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('server')
        .setDescription('Lihat statistik dan informasi server Fasilkom UI')
    )
    .addSubcommand((sub) =>
      sub
        .setName('avatar')
        .setDescription('Tampilkan foto profil (avatar) pengguna dengan resolusi tinggi')
        .addUserOption((opt) =>
          opt.setName('target').setDescription('Pengguna yang ingin dilihat avatar-nya')
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await InteractionHelper.safeDefer(interaction);

    if (sub === 'avatar') {
      const user = interaction.options.getUser('target') || interaction.user;
      const avatarUrl = user.displayAvatarURL({ size: 2048, dynamic: true });

      const embed = buildPacilEmbed({
        title: `Avatar • ${user.username}`,
        description: `[Unduh Foto Profil Resolusi Tinggi](${avatarUrl})`,
        tone: 'gold',
        image: avatarUrl,
      });

      return InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }

    if (sub === 'user') {
      const user = interaction.options.getUser('target') || interaction.user;
      const member = interaction.guild.members.cache.get(user.id);

      const createdTs = Math.floor(user.createdAt.getTime() / 1000);
      const joinedTs = member?.joinedAt ? Math.floor(member.joinedAt.getTime() / 1000) : null;

      const rolesList = member && member.roles.cache.size > 1
        ? member.roles.cache
            .filter((r) => r.id !== interaction.guild.id)
            .map((r) => r.toString())
            .slice(0, 8)
            .join(' ')
        : '*Tidak ada role khusus*';

      const embed = buildPacilEmbed({
        title: `Profil Member • ${user.username}`,
        icon: '👤',
        tone: 'navy',
        thumbnail: user.displayAvatarURL({ size: 256 }),
        fields: [
          { name: 'User ID', value: `\`${user.id}\``, inline: true },
          { name: 'Tipe Akun', value: user.bot ? '🤖 Bot' : '👨‍🎓 Mahasiswa', inline: true },
          { name: 'Role Tertinggi', value: member?.roles?.highest?.name || '-', inline: true },
          { name: 'Daftar Discord', value: `<t:${createdTs}:D> (<t:${createdTs}:R>)`, inline: true },
          { name: 'Bergabung di Server', value: joinedTs ? `<t:${joinedTs}:D> (<t:${joinedTs}:R>)` : '-', inline: true },
          { name: 'Role yang Dimiliki', value: rolesList, inline: false },
        ],
      });

      return InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }

    if (sub === 'server') {
      const guild = interaction.guild;
      const createdTs = Math.floor(guild.createdAt.getTime() / 1000);

      const embed = buildPacilEmbed({
        title: `Informasi Server • ${guild.name}`,
        icon: '🏛️',
        tone: 'gold',
        thumbnail: guild.iconURL({ size: 256 }) || undefined,
        fields: [
          { name: 'Server ID', value: `\`${guild.id}\``, inline: true },
          { name: 'Owner Server', value: `<@${guild.ownerId}>`, inline: true },
          { name: 'Total Warga', value: `**${guild.memberCount}** Mahasiswa`, inline: true },
          { name: 'Level Boost', value: `Tier ${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} boosts)`, inline: true },
          { name: 'Total Channel', value: `${guild.channels.cache.size} Channels`, inline: true },
          { name: 'Total Role', value: `${guild.roles.cache.size} Roles`, inline: true },
          { name: 'Tanggal Dibuat', value: `<t:${createdTs}:F>`, inline: false },
        ],
      });

      return InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }
  },
};
