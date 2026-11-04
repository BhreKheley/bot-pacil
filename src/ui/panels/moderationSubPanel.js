import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { buildPacilEmbed } from '../pacil.js';
import { getModerationPolicy } from '../../services/moderation/moderationPolicy.js';

export async function renderModerationSubPanel(client, guild, { notice = null } = {}) {
  const policy = await getModerationPolicy(client, guild.id);
  const esc = policy.escalation;
  const on = (v) => (v ? '✅ Aktif' : '⛔ Nonaktif');

  const embed = buildPacilEmbed({
    title: '🛡️ Moderasi',
    description: [
      notice,
      'Kebijakan otomatis untuk `/warn`, `/timeout`, `/kick`, dan `/ban`. Channel log moderasi diatur di modul **Fitur Lainnya → Logging**.',
    ].filter(Boolean).join('\n\n'),
    tone: 'navy',
    fields: [
      { name: 'DM ke Member', value: `${on(policy.dmOnAction)}\nMember diberi tahu alasan saat dikenai tindakan.`, inline: false },
      {
        name: 'Eskalasi Peringatan',
        value: [
          on(esc.enabled),
          esc.timeoutAt > 0 ? `• Timeout **${esc.timeoutMinutes} menit** pada peringatan ke-**${esc.timeoutAt}**` : '• Timeout otomatis: nonaktif',
          esc.kickAt > 0 ? `• Kick pada peringatan ke-**${esc.kickAt}**` : '• Kick otomatis: nonaktif',
        ].join('\n'),
        inline: false,
      },
    ],
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('setup:moderation:dm').setLabel(policy.dmOnAction ? 'DM: Aktif' : 'DM: Nonaktif').setEmoji('📨')
      .setStyle(policy.dmOnAction ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('setup:moderation:esc').setLabel(esc.enabled ? 'Eskalasi: Aktif' : 'Eskalasi: Nonaktif').setEmoji('📈')
      .setStyle(esc.enabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('setup:moderation:thresholds').setLabel('Atur Batas').setEmoji('✏️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('setup:back').setLabel('Menu Utama').setEmoji('🔙').setStyle(ButtonStyle.Primary),
  );
  return { embeds: [embed], components: [row] };
}
