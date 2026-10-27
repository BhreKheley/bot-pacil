import crypto from 'node:crypto';
import { createEmbed } from '../utils/embeds.js';
import { t } from '../utils/i18n.js';

const DEFAULT_CONFESSION_CONFIG = Object.freeze({
  enabled: false, channelId: null, reviewChannelId: null, moderatorRoleId: null,
  requireApproval: true, cooldownMinutes: 10,
});

export function getConfessionConfig(guildConfig = {}) {
  return { ...DEFAULT_CONFESSION_CONFIG, ...(guildConfig.confessions || {}) };
}

export const confessionKey = (guildId, id) => `guild:${guildId}:confessions:${id}`;
export const confessionCooldownKey = (guildId, userId) => `guild:${guildId}:confessions:cooldown:${userId}`;

export function newConfessionId() {
  return `${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`;
}

export function publicConfessionEmbed(confession, locale) {
  return createEmbed({
    title: t(locale, 'publicTitle'),
    description: confession.content,
    color: 'secondary',
    footer: { text: `${t(locale, 'publicFooter')} • #${confession.id.slice(-6).toUpperCase()}` },
  });
}

export function reviewConfessionEmbed(confession, locale) {
  return createEmbed({
    title: t(locale, 'reviewTitle'),
    description: confession.content,
    color: 'warning',
    fields: [
      { name: 'Pengirim / Sender', value: `<@${confession.authorId}>\n\`${confession.authorId}\``, inline: true },
      { name: 'ID', value: `\`${confession.id}\``, inline: true },
    ],
    footer: { text: 'Hanya moderator yang dapat melihat identitas pengirim.' },
  });
}
