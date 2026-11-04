// Editor halaman Interactive Guide dari panel /pacilsetup: select setup:guide:edit -> modal setup:guide:<halaman>.
import { ActionRowBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { GUIDE_BODY_MAX, GUIDE_TITLE_MAX, applyGuideOverride, getGuideOverrides, setGuidePage } from './guideService.js';
import { GUIDE_PAGES, renderRulesGuideSubPanel } from '../ui/panels/rulesGuideSubPanel.js';

export async function handleGuideSelect(interaction, client) {
  const page = interaction.values[0];
  if (!GUIDE_PAGES[page]) return;
  const current = applyGuideOverride(GUIDE_PAGES[page], (await getGuideOverrides(client, interaction.guildId))[page]);
  const field = (id, label, style, value, max) => new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setRequired(false).setMaxLength(max).setValue(String(value).slice(0, max)));
  return interaction.showModal(new ModalBuilder().setCustomId(`setup:guide:${page}`).setTitle('Edit Halaman Panduan').addComponents(
    field('title', 'Judul (kosongkan semua = kembali ke bawaan)', TextInputStyle.Short, current.title, GUIDE_TITLE_MAX),
    field('description', 'Isi halaman', TextInputStyle.Paragraph, current.description, GUIDE_BODY_MAX),
  ));
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
