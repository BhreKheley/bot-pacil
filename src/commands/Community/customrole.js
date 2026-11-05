import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { buildCustomRolePanel } from '../../services/customRoleService.js';
import { getUserBoosterRole } from '../../services/boosterService.js';
import { buildPacilEmbed } from '../../ui/pacil.js';

export default {
  data: new SlashCommandBuilder()
    .setName('customrole')
    .setDescription('Kelola Custom & Circle Role untuk Server Booster')
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('(Admin) Pasang panel interaktif Custom Role di channel ini atau channel tujuan')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel tujuan untuk memasang panel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('info')
        .setDescription('Lihat status custom role booster milikmu')
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === 'panel') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
          content: '❌ Perintah memasang panel hanya dapat dijalankan oleh Administrator.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
      const panel = buildCustomRolePanel();

      await targetChannel.send(panel);
      return interaction.reply({
        content: `✅ Panel Custom Role berhasil dipasang di ${targetChannel.toString()}!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === 'info') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const userRoleData = await getUserBoosterRole(client, guild.id, interaction.user.id);

      if (!userRoleData?.roleId) {
        return interaction.editReply({
          content: 'ℹ️ Kamu belum memiliki custom role. Jika kamu adalah Server Booster, gunakan tombol **Create Role** di channel `#custom-role`.',
        });
      }

      const role = guild.roles.cache.get(userRoleData.roleId) || (await guild.roles.fetch(userRoleData.roleId).catch(() => null));
      if (!role) {
        return interaction.editReply({
          content: '⚠️ Data role kamu ditemukan, namun role tersebut sudah tidak ada di server.',
        });
      }

      const recipients = Array.isArray(userRoleData.giftedTo) ? userRoleData.giftedTo : [];
      const giftedList = recipients.length > 0
        ? recipients.map((id) => `<@${id}>`).join(', ')
        : '*Belum diberikan ke member lain*';

      const embed = buildPacilEmbed({
        title: '🎨 INFORMASI CUSTOM ROLE',
        description: `Informasi detail mengenai custom role booster milik ${interaction.user.toString()}:`,
        tone: 'gold',
        fields: [
          { name: 'Nama Role', value: role.toString(), inline: true },
          { name: 'Warna Hex', value: `\`${role.hexColor}\``, inline: true },
          { name: 'Posisi Role', value: `#${role.position}`, inline: true },
          { name: 'Diberikan Kepada', value: giftedList, inline: false },
        ],
      });

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
