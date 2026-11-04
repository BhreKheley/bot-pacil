// Aksi konfigurasi Booster dari panel /pacilsetup: setup:booster:<aksi> (tombol) dan modal setup:booster:namelen.
import { ActionRowBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { BOOSTER_NAME_LIMITS, getBoosterConfig, saveBoosterConfig } from './boosterService.js';
import { renderBoosterSubPanel } from '../ui/panels/boosterSubPanel.js';

const TOGGLES = new Set(['enabled', 'autoCleanup', 'allowGift', 'allowIcon']);

export async function handleBoosterButton(interaction, client, [action]) {
  const config = await getBoosterConfig(client, interaction.guildId);
  if (TOGGLES.has(action)) {
    await saveBoosterConfig(client, interaction.guildId, { [action]: !config[action] });
    return interaction.update(await renderBoosterSubPanel(client, interaction.guild));
  }
  if (action === 'namelen') {
    const input = new TextInputBuilder().setCustomId('len').setLabel(`Panjang nama maks. (${BOOSTER_NAME_LIMITS.min}–${BOOSTER_NAME_LIMITS.max})`)
      .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(2).setValue(String(config.nameMaxLength));
    return interaction.showModal(new ModalBuilder().setCustomId('setup:booster:namelen').setTitle('Batas Nama Role').addComponents(new ActionRowBuilder().addComponents(input)));
  }
}

export async function handleBoosterModal(interaction, client, [action]) {
  if (action !== 'namelen') return;
  const n = Number(interaction.fields.getTextInputValue('len'));
  if (!Number.isInteger(n) || n < BOOSTER_NAME_LIMITS.min || n > BOOSTER_NAME_LIMITS.max) {
    return interaction.reply({ content: `❌ Isi bilangan bulat ${BOOSTER_NAME_LIMITS.min}–${BOOSTER_NAME_LIMITS.max}.`, flags: MessageFlags.Ephemeral });
  }
  await saveBoosterConfig(client, interaction.guildId, { nameMaxLength: n });
  const payload = await renderBoosterSubPanel(client, interaction.guild, { notice: '✅ Batas nama tersimpan.' });
  return interaction.isFromMessage?.() ? interaction.update(payload) : interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
}
