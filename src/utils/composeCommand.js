import { SlashCommandBuilder } from 'discord.js';

// Tipe opsi Discord -> metode builder resmi.
const ADD_OPTION = {
  3: 'addStringOption', 4: 'addIntegerOption', 5: 'addBooleanOption', 6: 'addUserOption',
  7: 'addChannelOption', 8: 'addRoleOption', 9: 'addMentionableOption', 10: 'addNumberOption', 11: 'addAttachmentOption',
};

function applyOption(sub, opt) {
  const method = ADD_OPTION[opt.type];
  if (!method) throw new Error(`Tipe opsi ${opt.type} (${opt.name}) tidak didukung composeCommand`);
  sub[method]((o) => {
    o.setName(opt.name).setDescription(opt.description).setRequired(Boolean(opt.required));
    if (opt.choices?.length) o.addChoices(...opt.choices.map(({ name, value }) => ({ name, value })));
    if (opt.channel_types?.length) o.addChannelTypes(...opt.channel_types);
    if (opt.min_value !== undefined) o.setMinValue(opt.min_value);
    if (opt.max_value !== undefined) o.setMaxValue(opt.max_value);
    if (opt.min_length !== undefined) o.setMinLength(opt.min_length);
    if (opt.max_length !== undefined) o.setMaxLength(opt.max_length);
    if (opt.autocomplete) o.setAutocomplete(true);
    return o;
  });
}

/** Tambahkan modul command lama sebagai satu subcommand pada builder induk. */
export function addModuleSubcommand(data, subName, mod) {
  const json = mod.data.toJSON();
  if (json.options?.some((o) => o.type <= 2)) throw new Error(`Modul "${subName}" sudah punya subcommand; tidak bisa dibungkus`);
  data.addSubcommand((sub) => {
    sub.setName(subName).setDescription(json.description);
    for (const opt of json.options ?? []) applyOption(sub, opt);
    return sub;
  });
  return data;
}

/**
 * Menyusun satu command induk dari beberapa modul command (tiap modul menjadi subcommand).
 * Modul aslinya tidak diubah: opsi top-level miliknya menjadi opsi subcommand.
 * Catatan: opsi wajib harus lebih dulu dari opsi opsional (aturan Discord) — sudah dijaga modul asal.
 */
export function composeCommand({ name, description, category, permissions = null, subs }) {
  const data = new SlashCommandBuilder().setName(name).setDescription(description);
  if (permissions !== null) data.setDefaultMemberPermissions(permissions);
  for (const [subName, mod] of Object.entries(subs)) addModuleSubcommand(data, subName, mod);
  return {
    data,
    category,
    async execute(interaction, ...rest) {
      return subs[interaction.options.getSubcommand()].execute(interaction, ...rest);
    },
  };
}
