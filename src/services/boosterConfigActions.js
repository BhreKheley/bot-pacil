// Aksi konfigurasi Booster dari panel /pacilsetup: setup:booster:<aksi> (tombol) dan modal setup:booster:namelen.
import { MessageFlags, TextInputStyle } from 'discord.js';
import { BOOSTER_NAME_LIMITS, getBoosterConfig, saveBoosterConfig } from './boosterService.js';
import { renderBoosterSubPanel } from '../ui/panels/boosterSubPanel.js';
import { safeModal, safeTextInputRow } from '../utils/modalHelper.js';

const TOGGLES = new Set(['enabled', 'autoCleanup', 'allowGift', 'allowIcon']);

export async function handleBoosterButton(interaction, client, [action]) {
  const config = await getBoosterConfig(client, interaction.guildId);
  if (TOGGLES.has(action)) {
    await saveBoosterConfig(client, interaction.guildId, { [action]: !config[action] });
    return interaction.update(await renderBoosterSubPanel(client, interaction.guild));
  }
  if (action === 'namelen') {
    const modal = safeModal({
      customId: 'setup:booster:namelen',
      title: 'Batas Nama Role',
      rows: [
        safeTextInputRow({
          id: 'len',
          label: `Panjang nama maks (${BOOSTER_NAME_LIMITS.min}-${BOOSTER_NAME_LIMITS.max})`,
          style: TextInputStyle.Short,
          required: true,
          max: 2,
          value: config.nameMaxLength,
          placeholder: '50',
        }),
      ],
    });
    return interaction.showModal(modal);
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
