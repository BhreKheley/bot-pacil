import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import {
  getUserCircle,
  getCircle,
  addMemberToCircle,
  removeMemberFromCircle,
  deleteCircle,
} from '../../services/circleService.js';
import { buildPacilEmbed } from '../../ui/pacil.js';

export default {
  data: new SlashCommandBuilder()
    .setName('circle')
    .setDescription('Kelola Private Circle (kelompok belajar / ruang tongkrongan mahasiswa)')
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub
        .setName('request')
        .setDescription('Buka formulir pembuatan Private Circle baru')
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Tambahkan teman ke circle kamu')
        .addUserOption((opt) =>
          opt
            .setName('user')
            .setDescription('Member yang ingin ditambahkan')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Keluarkan member dari circle kamu')
        .addUserOption((opt) =>
          opt
            .setName('user')
            .setDescription('Member yang ingin dikeluarkan')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('leave')
        .setDescription('Keluar dari circle yang sedang kamu ikuti')
    )
    .addSubcommand((sub) =>
      sub
        .setName('delete')
        .setDescription('Bubarkan dan hapus circle milikmu')
    )
    .addSubcommand((sub) =>
      sub
        .setName('info')
        .setDescription('Lihat informasi circle milikmu atau yang kamu ikuti')
    )
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Pasang panel publik "Request Circle Room" di channel ini (Admin)')
    ),
  category: 'Community',

  async execute(interaction, _config, client) {
    const subcommand = interaction.options.getSubcommand();

    // 1. Panel Publik "Request Circle Room"
    if (subcommand === 'panel') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: '❌ Hanya admin/manager server yang dapat memasang panel ini.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const panelEmbed = buildPacilEmbed({
        title: '👥 Pacil Baik Circle Hub',
        description:
          'Butuh ruang privat buat nugas kelompok, belajar bareng ujian, atau sekadar tongkrongan circle kamu?\n\n' +
          'Tekan tombol di bawah untuk meminta pembuatan **Private Circle** otomatis! Kamu akan mendapatkan Role khusus, Kategori privat, Text Channel, dan Voice Channel yang hanya bisa diakses oleh kelompokmu.',
        tone: 'gold',
        fields: [
          {
            name: '✨ Fitur Circle',
            value:
              '• Kategori & Channel 100% Privat\n• Text & Voice Channel eksklusif\n• Bebas undang teman pakai `/circle add @user`',
            inline: false,
          },
          {
            name: '📌 Catatan',
            value: 'Setiap mahasiswa hanya dapat memiliki 1 Circle aktif sebagai owner.',
            inline: false,
          },
        ],
        footer: 'Pacil Baik • Fasilkom UI Circle Automation',
      });

      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('circleRequest')
          .setLabel('Request Circle Room')
          .setEmoji('👥')
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.channel.send({
        embeds: [panelEmbed],
        components: [buttonRow],
      });

      return interaction.reply({
        content: '✅ Panel Circle Hub berhasil dipasang di channel ini!',
        flags: MessageFlags.Ephemeral,
      });
    }

    // 2. Request Circle via modal
    if (subcommand === 'request') {
      const modal = new ModalBuilder()
        .setCustomId(`circleCreateModal:${interaction.guildId}`)
        .setTitle('Buat Private Circle Baru');

      const nameInput = new TextInputBuilder()
        .setCustomId('circle_name')
        .setLabel('Nama Circle / Kelompok')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: Circle Alpro A, Geng Kancil, Tim Capstone')
        .setMinLength(2)
        .setMaxLength(32)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
      return await interaction.showModal(modal);
    }

    // 3. Info Circle
    if (subcommand === 'info') {
      const circle = await getUserCircle(client, interaction.guildId, interaction.user.id);
      if (!circle) {
        return interaction.reply({
          content: 'Kamu belum memiliki atau bergabung di Private Circle mana pun. Buat sekarang dengan `/circle request`!',
          flags: MessageFlags.Ephemeral,
        });
      }

      const isOwner = circle.ownerId === interaction.user.id;
      const infoEmbed = buildPacilEmbed({
        title: `👥 Informasi Circle: ${circle.name}`,
        tone: 'navy',
        fields: [
          { name: '👑 Owner', value: `<@${circle.ownerId}>`, inline: true },
          { name: '🎭 Role', value: `<@&${circle.roleId}>`, inline: true },
          { name: '👥 Jumlah Anggota', value: `${circle.members?.length || 1} orang`, inline: true },
          { name: '💬 Text Channel', value: `<#${circle.textChannelId}>`, inline: true },
          { name: '🔊 Voice Channel', value: `<#${circle.voiceChannelId}>`, inline: true },
          { name: 'Status Kamu', value: isOwner ? '👑 Pemilik Circle' : 'Anggota', inline: true },
        ],
        footer: 'Pacil Baik • Private Circle System',
      });

      return interaction.reply({ embeds: [infoEmbed], flags: MessageFlags.Ephemeral });
    }

    // 4. Add Member
    if (subcommand === 'add') {
      const circle = await getUserCircle(client, interaction.guildId, interaction.user.id);
      if (!circle) {
        return interaction.reply({
          content: '❌ Kamu belum memiliki Private Circle. Buat terlebih dahulu via `/circle request`.',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (circle.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: '❌ Hanya pemilik circle yang dapat menambahkan anggota baru.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const targetUser = interaction.options.getUser('user', true);
      if (targetUser.bot) {
        return interaction.reply({
          content: '❌ Tidak dapat menambahkan bot ke dalam circle.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) {
        return interaction.reply({
          content: '❌ Member tidak ditemukan di server ini.',
          flags: MessageFlags.Ephemeral,
        });
      }

      try {
        await addMemberToCircle(client, interaction.guild, circle, targetMember);
        return interaction.reply({
          content: `✅ Berhasil menambahkan <@${targetMember.id}> ke circle **"${circle.name}"**! Mereka sekarang dapat melihat channel circle.`,
          flags: MessageFlags.Ephemeral,
        });
      } catch (err) {
        return interaction.reply({
          content: `❌ Gagal menambahkan: ${err.message}`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // 5. Remove Member
    if (subcommand === 'remove') {
      const circle = await getUserCircle(client, interaction.guildId, interaction.user.id);
      if (!circle) {
        return interaction.reply({
          content: '❌ Kamu belum memiliki Private Circle.',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (circle.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: '❌ Hanya pemilik circle yang dapat mengeluarkan anggota.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const targetUser = interaction.options.getUser('user', true);
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        return interaction.reply({
          content: '❌ Member tidak ditemukan di server ini.',
          flags: MessageFlags.Ephemeral,
        });
      }

      try {
        await removeMemberFromCircle(client, interaction.guild, circle, targetMember);
        return interaction.reply({
          content: `✅ Berhasil mengeluarkan <@${targetMember.id}> dari circle **"${circle.name}"**.`,
          flags: MessageFlags.Ephemeral,
        });
      } catch (err) {
        return interaction.reply({
          content: `❌ Gagal mengeluarkan: ${err.message}`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // 6. Leave Circle
    if (subcommand === 'leave') {
      const circle = await getUserCircle(client, interaction.guildId, interaction.user.id);
      if (!circle) {
        return interaction.reply({
          content: '❌ Kamu tidak sedang berada di circle mana pun.',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (circle.ownerId === interaction.user.id) {
        return interaction.reply({
          content: '❌ Kamu adalah pemilik circle ini. Jika ingin membubarkan, gunakan `/circle delete`.',
          flags: MessageFlags.Ephemeral,
        });
      }

      try {
        await removeMemberFromCircle(client, interaction.guild, circle, interaction.member);
        return interaction.reply({
          content: `✅ Kamu telah keluar dari circle **"${circle.name}"**.`,
          flags: MessageFlags.Ephemeral,
        });
      } catch (err) {
        return interaction.reply({
          content: `❌ Gagal keluar: ${err.message}`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // 7. Delete Circle
    if (subcommand === 'delete') {
      const circle = await getUserCircle(client, interaction.guildId, interaction.user.id);
      if (!circle) {
        return interaction.reply({
          content: '❌ Kamu tidak memiliki circle aktif untuk dihapus.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const isOwner = circle.ownerId === interaction.user.id;
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);

      if (!isOwner && !isAdmin) {
        return interaction.reply({
          content: '❌ Hanya pemilik circle atau administrator yang dapat membubarkan circle ini.',
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        await deleteCircle(client, interaction.guild, circle, `Dibubarkan oleh ${interaction.user.tag}`);
        return interaction.editReply({
          content: `✅ Circle **"${circle.name}"** beserta seluruh role, channel, dan kategorinya telah berhasil dihapus.`,
        });
      } catch (err) {
        return interaction.editReply({
          content: `❌ Gagal menghapus circle: ${err.message}`,
        });
      }
    }
  },
};

