// Editor halaman Interactive Guide dari panel /pacilsetup: select setup:guide:edit -> modal setup:guide:<halaman>.
import { MessageFlags, TextInputStyle } from 'discord.js';
import { GUIDE_BODY_MAX, GUIDE_TITLE_MAX, applyGuideOverride, getGuideOverrides, setGuidePage } from './guideService.js';
import { GUIDE_PAGES, renderRulesGuideSubPanel } from '../ui/panels/rulesGuideSubPanel.js';
import { safeModal, safeTextInputRow } from '../utils/modalHelper.js';

export async function handleGuideSelect(interaction, client) {
  const page = interaction.values[0];
  if (!GUIDE_PAGES[page]) return;
  const current = applyGuideOverride(GUIDE_PAGES[page], (await getGuideOverrides(client, interaction.guildId))[page]);

  const modal = safeModal({
    customId: `setup:guide:${page}`,
    title: 'Edit Halaman Panduan',
    rows: [
      safeTextInputRow({
        id: 'title',
        label: 'Judul (kosong = bawaan)',
        style: TextInputStyle.Short,
        value: current.title || '',
        max: GUIDE_TITLE_MAX,
        placeholder: 'Judul halaman panduan...',
      }),
      safeTextInputRow({
        id: 'description',
        label: 'Isi halaman panduan',
        style: TextInputStyle.Paragraph,
        value: current.description || '',
        max: GUIDE_BODY_MAX,
        placeholder: 'Isi penjelasan panduan...',
      }),
    ],
  });
  return interaction.showModal(modal);
}

export async function handleGuideModal(interaction, client, [page]) {
  if (!GUIDE_PAGES[page]) return;
  const title = interaction.fields.getTextInputValue('title');
  const description = interaction.fields.getTextInputValue('description');
  // Isi sama persis dengan bawaan = bukan penyesuaian.
  const same = (a, b) => String(a).trim() === String(b).trim();
  await setGuidePage(client, interaction.guildId, page, {
    title: same(title, GUIDE_PAGES[page].title) ? '' : title,
    description: same(description, GUIDE_PAGES[page].description) ? '' : description,
  });
  const payload = await renderRulesGuideSubPanel(client, interaction.guild, { notice: '✅ Halaman panduan tersimpan. Panel panduan yang sudah terpasang ikut berubah saat topiknya dibuka.' });
  return interaction.isFromMessage?.() ? interaction.update(payload) : interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
}
