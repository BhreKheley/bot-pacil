import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { buildPacilEmbed } from '../../ui/pacil.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getModerationCases } from '../../utils/moderation.js';

export default {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Pusat tindakan dan audit ketertiban server (Staff Moderasi)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName('timeout')
        .setDescription('Bungkam sementara member yang melanggar aturan')
        .addUserOption((opt) => opt.setName('user').setDescription('Target member').setRequired(true))
        .addIntegerOption((opt) => opt.setName('duration').setDescription('Durasi bungkam dalam menit (default: 10)').setRequired(false))
        .addStringOption((opt) => opt.setName('reason').setDescription('Alasan tindakan').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('kick')
        .setDescription('Keluarkan member dari server')
        .addUserOption((opt) => opt.setName('user').setDescription('Target member').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Alasan tindakan').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('ban')
        .setDescription('Banned member dari server secara permanen')
        .addUserOption((opt) => opt.setName('user').setDescription('Target member').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Alasan tindakan').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('unban')
        .setDescription('Buka ban member berdasarkan User ID')
        .addStringOption((opt) => opt.setName('userid').setDescription('User ID member').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('purge')
        .setDescription('Hapus sejumlah pesan di channel saat ini (1-100)')
        .addIntegerOption((opt) => opt.setName('count').setDescription('Jumlah pesan').setMinValue(1).setMaxValue(100).setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('cases')
        .setDescription('Lihat riwayat log penindakan moderasi di server')
        .addUserOption((opt) => opt.setName('user').setDescription('Filter berdasarkan target user (opsional)'))
        .addIntegerOption((opt) => opt.setName('limit').setDescription('Jumlah case (default: 5)').setMinValue(1).setMaxValue(20))
    )
    .addSubcommand((sub) =>
      sub
        .setName('lock')
        .setDescription('Kunci atau buka kembali izin kirim pesan channel ini')
        .addBooleanOption((opt) => opt.setName('locked').setDescription('True untuk mengunci, False untuk membuka').setRequired(true))
    ),

  async execute(interaction, config, client) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const botMember = guild.members.me;

    if (sub === 'cases') {
      await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
      const targetUser = interaction.options.getUser('user');
      const limit = interaction.options.getInteger('limit') || 5;

      const cases = await getModerationCases(client, guild.id, {
        userId: targetUser?.id,
        limit,
      });

      if (!cases || cases.length === 0) {
        const emptyEmbed = buildPacilEmbed({
          title: 'Riwayat Moderasi Bersih',
          icon: '🛡️',
          description: targetUser
            ? `Tidak ada catatan pelanggaran untuk ${targetUser.toString()}.`
            : 'Belum ada riwayat kasus moderasi yang tercatat di server ini.',
          tone: 'navy',
        });
        return InteractionHelper.safeEditReply(interaction, { embeds: [emptyEmbed] });
      }

      const caseLines = cases.map((c) => {
        const timeStr = c.created_at ? `<t:${Math.floor(new Date(c.created_at).getTime() / 1000)}:R>` : '';
        return `• **Case #${c.id || c.caseId || '-'}** | **${c.action || c.type || 'Action'}** ke <@${c.userId}>\n  *Alasan:* ${c.reason || 'Tidak ada keterangan'} ${timeStr}`;
      });

      const embed = buildPacilEmbed({
        title: `Riwayat Kasus Moderasi (${cases.length})`,
        icon: '📋',
        description: caseLines.join('\n\n'),
        tone: 'gold',
      });

      return InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }

    if (sub === 'purge') {
      await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
        return InteractionHelper.safeEditReply(interaction, {
          content: '❌ Kamu tidak memiliki izin Manage Messages untuk menghapus pesan.',
        });
      }

      const count = interaction.options.getInteger('count');
      const deleted = await interaction.channel.bulkDelete(count, true).catch((e) => {
        logger.error('Error in bulkDelete:', e);
        return null;
      });

      const deletedCount = deleted?.size || 0;
      const embed = buildPacilEmbed({
        title: 'Pembersihan Pesan Selesai',
        icon: '🧹',
        description: `Berhasil menghapus **${deletedCount}** pesan di channel ${interaction.channel.toString()}.`,
        tone: 'success',
      });

      return InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }

    if (sub === 'lock') {
      await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
        return InteractionHelper.safeEditReply(interaction, {
          content: '❌ Kamu tidak memiliki izin Manage Channels.',
        });
      }

      const locked = interaction.options.getBoolean('locked');
      const everyoneRole = guild.roles.everyone;

      await interaction.channel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: !locked,
      });

      const embed = buildPacilEmbed({
        title: locked ? 'Channel Dikunci' : 'Channel Dibuka Kembali',
        icon: locked ? '🔒' : '🔓',
        description: locked
          ? `Channel ${interaction.channel.toString()} telah dikunci untuk @everyone.`
          : `Channel ${interaction.channel.toString()} telah dibuka kembali. Member dapat mengirim pesan.`,
        tone: locked ? 'warning' : 'success',
      });

      return InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }

    if (sub === 'timeout') {
      await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
      const targetUser = interaction.options.getUser('user');
      const durationMin = interaction.options.getInteger('duration') || 10;
      const reason = interaction.options.getString('reason') || 'Melanggar tata tertib server Fasilkom UI';

      const member = guild.members.cache.get(targetUser.id);
      if (!member) {
        return InteractionHelper.safeEditReply(interaction, { content: '❌ Member tidak ditemukan di server.' });
      }

      if (botMember.roles.highest.position <= member.roles.highest.position) {
        return InteractionHelper.safeEditReply(interaction, { content: '❌ Posisi role bot tidak cukup tinggi untuk menindak member ini.' });
      }

      await member.timeout(durationMin * 60 * 1000, reason);

      const embed = buildPacilEmbed({
        title: 'Member Dibungkam (Timeout)',
        icon: '⏳',
        description: `Member ${member.toString()} telah dibungkam selama **${durationMin} menit**.\n*Alasan:* ${reason}`,
        tone: 'warning',
      });

      return InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }

    if (sub === 'kick') {
      await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'Dikeluarkan oleh moderator';

      const member = guild.members.cache.get(targetUser.id);
      if (!member) {
        return InteractionHelper.safeEditReply(interaction, { content: '❌ Member tidak ditemukan di server.' });
      }

      if (botMember.roles.highest.position <= member.roles.highest.position) {
        return InteractionHelper.safeEditReply(interaction, { content: '❌ Posisi role bot tidak cukup tinggi untuk mengeluarkan member ini.' });
      }

      await member.kick(reason);

      const embed = buildPacilEmbed({
        title: 'Member Dikeluarkan (Kick)',
        icon: '👢',
        description: `Member **${targetUser.tag}** telah dikeluarkan dari server.\n*Alasan:* ${reason}`,
        tone: 'error',
      });

      return InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }

    if (sub === 'ban') {
      await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'Banned oleh moderator';

      const member = guild.members.cache.get(targetUser.id);
      if (member && botMember.roles.highest.position <= member.roles.highest.position) {
        return InteractionHelper.safeEditReply(interaction, { content: '❌ Posisi role bot tidak cukup tinggi untuk membanned member ini.' });
      }

      await guild.members.ban(targetUser.id, { reason });

      const embed = buildPacilEmbed({
        title: 'Member Dibanned (Ban)',
        icon: '🔨',
        description: `Pengguna **${targetUser.tag}** (\`${targetUser.id}\`) telah dibanned dari server.\n*Alasan:* ${reason}`,
        tone: 'error',
      });

      return InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }

    if (sub === 'unban') {
      await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
      const userId = interaction.options.getString('userid');

      try {
        await guild.members.unban(userId, 'Unbanned via /mod unban');
        const embed = buildPacilEmbed({
          title: 'Unban Berhasil',
          icon: '🔓',
          description: `User dengan ID \`${userId}\` telah berhasil dibuka ban-nya.`,
          tone: 'success',
        });
        return InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
      } catch (err) {
        return InteractionHelper.safeEditReply(interaction, { content: `❌ Gagal membuka ban user: ${err.message}` });
      }
    }
  },
};
