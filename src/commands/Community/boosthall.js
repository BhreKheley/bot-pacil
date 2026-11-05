import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { buildPacilEmbed } from '../../ui/pacil.js';
import { postBoostHallAppreciation, resolveBoostChannel } from '../../services/boostHallService.js';
import { getGuildConfig } from '../../services/config/guildConfig.js';

export default {
  data: new SlashCommandBuilder()
    .setName('boosthall')
    .setDescription('Sistem apresiasi Boost Hall of Fame Pacil Fasilkom UI')
    .addSubcommand((sub) =>
      sub
        .setName('view')
        .setDescription('Lihat status server boost dan daftar para booster kehormatan')
    )
    .addSubcommand((sub) =>
      sub
        .setName('test')
        .setDescription('(Admin) Uji kirim kartu apresiasi Boost Hall of Fame')
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === 'view') {
      await interaction.deferReply();
      const boosters = guild.members.cache.filter((m) => Boolean(m.premiumSince));
      const totalBoosts = guild.premiumSubscriptionCount || 0;
      const boostTier = guild.premiumTier || 0;

      const boosterList = boosters.size > 0
        ? boosters.map((m) => `• ${m.user.toString()} (sejak <t:${Math.floor(m.premiumSinceTimestamp / 1000)}:R>)`).slice(0, 20).join('\n')
        : '*Belum ada server booster saat ini.*';

      const embed = buildPacilEmbed({
        title: '💎 PACIL BOOST HALL OF FAME',
        description: `Berikut adalah ringkasan dukungan Server Boost untuk **${guild.name}**.\n\n${boosterList}`,
        tone: 'gold',
        fields: [
          { name: '🚀 Level Boost', value: `Level ${boostTier}`, inline: true },
          { name: '💎 Total Boosts', value: `${totalBoosts} Boosts`, inline: true },
          { name: '👥 Jumlah Booster', value: `${boosters.size} Member`, inline: true },
        ],
      });

      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'test') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
          content: '❌ Perintah ini khusus untuk Administrator.',
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const config = await getGuildConfig(client, guild.id);
      const targetChannel = resolveBoostChannel(guild, config?.boostChannelId) || interaction.channel;

      const ok = await postBoostHallAppreciation({
        client,
        guild,
        member: interaction.member,
        forceChannelId: targetChannel.id,
      });

      if (ok) {
        return interaction.editReply({
          content: `✅ Kartu apresiasi Boost Hall berhasil dikirim ke ${targetChannel.toString()}!`,
        });
      } else {
        return interaction.editReply({
          content: '⚠️ Gagal mengirim kartu apresiasi. Pastikan bot memiliki izin kirim pesan dan embed di channel tersebut.',
        });
      }
    }
  },
};
