import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { buildPacilEmbed } from '../../ui/pacil.js';

/**
 * Builds the Staff List embed from current guild members.
 */
export async function buildStaffListEmbed(guild) {
  // Fetch members to ensure cache is populated
  await guild.members.fetch().catch(() => {});

  const members = guild.members.cache;

  // 1. Administrators / Pembina
  const admins = members.filter(
    (m) => !m.user.bot && (m.id === guild.ownerId || m.permissions.has(PermissionFlagsBits.Administrator))
  );

  // 2. Moderators
  const mods = members.filter(
    (m) =>
      !m.user.bot &&
      !admins.has(m.id) &&
      (m.permissions.has(PermissionFlagsBits.ModerateMembers) ||
        m.permissions.has(PermissionFlagsBits.ManageGuild) ||
        m.permissions.has(PermissionFlagsBits.ManageMessages) ||
        m.roles.cache.some((r) => /mod|moderator|ketertiban/i.test(r.name)))
  );

  // 3. Support / Academic Mentors
  const supports = members.filter(
    (m) =>
      !m.user.bot &&
      !admins.has(m.id) &&
      !mods.has(m.id) &&
      m.roles.cache.some((r) => /support|helper|asdos|mentor|akademik|asisten/i.test(r.name))
  );

  const formatList = (col) => {
    if (col.size === 0) return '*Belum ada anggota yang terdaftar.*';
    return col
      .map((m) => {
        const statusEmoji = {
          online: '🟢',
          idle: '🟡',
          dnd: '🔴',
          offline: '⚪',
        }[m.presence?.status || 'offline'];
        return `${statusEmoji} ${m.user.toString()} \`@${m.user.username}\``;
      })
      .slice(0, 15)
      .join('\n');
  };

  return buildPacilEmbed({
    title: '🏛️ STRUKTUR STAFF FASILKOM UI',
    description:
      'Berikut adalah daftar tim pengurus, moderator, dan mentor akademik yang siap membantumu di server Pacil.\n\n' +
      'Silakan hubungi staff jika menemukan kendala atau butuh bantuan.',
    tone: 'gold',
    fields: [
      {
        name: '👑 Server Administrators / BPH',
        value: formatList(admins),
        inline: false,
      },
      {
        name: '🛡️ Moderator Tim Ketertiban',
        value: formatList(mods),
        inline: false,
      },
      {
        name: '🎓 Academic Mentors & Support Desk',
        value: formatList(supports),
        inline: false,
      },
    ],
  });
}

export default {
  data: new SlashCommandBuilder()
    .setName('staff')
    .setDescription('Tampilkan daftar pengurus dan staff komunitas Fasilkom UI')
    .addSubcommand((sub) =>
      sub
        .setName('view')
        .setDescription('Lihat daftar staff yang aktif di server saat ini')
    )
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('(Admin) Pasang panel daftar staff di channel tertentu')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel tujuan untuk memasang panel staff')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === 'view') {
      await interaction.deferReply();
      const embed = await buildStaffListEmbed(guild);
      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'panel') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
          content: '❌ Perintah memasang panel khusus untuk Administrator.',
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
      const embed = await buildStaffListEmbed(guild);

      await targetChannel.send({ embeds: [embed] });
      return interaction.editReply({
        content: `✅ Panel daftar staff berhasil dipasang di ${targetChannel.toString()}!`,
      });
    }
  },
};
