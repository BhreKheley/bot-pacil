import { AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import { buildPacilEmbed } from '../ui/pacil.js';
import { renderBoostCard } from '../utils/imageGenerator.js';
import { getGuildConfig, patchGuildConfig } from './config/guildConfig.js';
import { logger } from '../utils/logger.js';

/**
 * Finds the boost hall channel. Checks config first, then finds by name.
 */
export function resolveBoostChannel(guild, boostChannelId) {
  if (boostChannelId) {
    const ch = guild.channels?.cache?.get(boostChannelId);
    if (ch) return ch;
  }
  const channelList = Array.from(guild.channels?.cache?.values?.() || []);
  return channelList.find(
    (c) => c.isTextBased?.() && (c.name.includes('boost-hall') || c.name.includes('boost'))
  ) || null;
}

/**
 * Dispatches a dynamic Boost Hall appreciation card & embed.
 */
export async function postBoostHallAppreciation({ client, guild, member, forceChannelId = null }) {
  try {
    const config = await getGuildConfig(client, guild.id);
    const channelId = forceChannelId || config?.boostChannelId;
    const channel = resolveBoostChannel(guild, channelId);

    if (!channel) {
      logger.info(`Channel boost hall tidak ditemukan di guild ${guild.name} (${guild.id})`);
      return false;
    }

    const me = guild.members.me;
    if (!channel.permissionsFor(me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
      logger.warn(`Izin bot kurang di channel ${channel.name} (${channel.id})`);
      return false;
    }

    const totalBoosts = guild.premiumSubscriptionCount || 1;
    const boostTier = guild.premiumTier || 1;

    const cardBuffer = await renderBoostCard({
      member,
      guild,
      totalBoosts,
      boostTier,
    });

    const file = new AttachmentBuilder(cardBuffer, { name: 'boost-card.png' });

    const embed = buildPacilEmbed({
      title: '💎 PACIL BOOST HALL OF FAME',
      description: `Terima kasih kepada ${member.user.toString()} yang telah memberikan **Server Boost** untuk komunitas **${guild.name}**!\n\n✨ **Hak Istimewa Booster Kamu:**\n• Buat & kelola **Custom Role & Circle Room** sendiri\n• Personalisasi warna, gradient, atau ikon role\n• Role eksklusif Server Booster dengan badge kehormatan\n\n*Kontribusi kamu sangat berarti untuk kemajuan komunitas dan riset mahasiswa Fasilkom UI.*`,
      tone: 'gold',
      image: 'attachment://boost-card.png',
      fields: [
        { name: '🌟 Status Kehormatan', value: 'Server Booster', inline: true },
        { name: '💎 Total Boost Server', value: `${totalBoosts} Boosts`, inline: true },
        { name: '🚀 Server Perk Level', value: `Level ${boostTier}`, inline: true },
      ],
    });

    await channel.send({
      content: `🎉 Terima kasih atas boost-nya ${member.user.toString()}!`,
      embeds: [embed],
      files: [file],
    });

    return true;
  } catch (error) {
    logger.error('Gagal mengirim apresiasi Boost Hall of Fame:', error);
    return false;
  }
}

/**
 * Sets the boost hall channel in guild config.
 */
export async function setBoostChannel(client, guildId, channelId) {
  return patchGuildConfig(client, guildId, { boostChannelId: channelId });
}
