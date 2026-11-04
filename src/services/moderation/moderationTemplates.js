// Template alasan standar untuk tindakan moderasi di lingkungan kampus Fasilkom UI.
// Digunakan pada /warn, /timeout, /kick, /ban, dan panel /pacilsetup -> Moderasi.

export const DEFAULT_MODERATION_TEMPLATES = Object.freeze([
  {
    name: 'Spam / Chat Flood (Pesan Berulang)',
    value: 'Spam / Chat Flood: Mengirim pesan berulang, mention massal, atau membanjiri channel chat.',
  },
  {
    name: 'Perilaku Tidak Sopan / Harassment',
    value: 'Perilaku Tidak Sopan: Ujaran kebencian, perundungan, atau provokasi tidak etis terhadap sesama mahasiswa.',
  },
  {
    name: 'Konten Tidak Pantas / NSFW',
    value: 'Konten Tidak Pantas: Menyebarkan materi pornografi, kekerasan eksplisit, atau konten tidak senonoh.',
  },
  {
    name: 'Pelanggaran Etika Akademik / Joki Tugas',
    value: 'Pelanggaran Akademik: Joki tugas, plagiarisme kode tugas kuliah, atau kebocoran soal ujian/kuis.',
  },
  {
    name: 'Iklan Liar / Promosi Tanpa Izin',
    value: 'Iklan Tanpa Izin: Membagikan promosi server lain, bisnis komersial, atau link referral tanpa izin pengurus.',
  },
  {
    name: 'Meniru Identitas Civitas / Impersonation',
    value: 'Impersonation: Meniru identitas dosen, asisten dosen, staf kampus, atau mahasiswa lain.',
  },
  {
    name: 'Gangguan Voice Channel / Soundboard Spam',
    value: 'Gangguan Voice: Mengganggu ketertiban voice channel dengan suara memekakkan telinga atau soundboard spam.',
  },
]);

export function getTemplateChoices() {
  return DEFAULT_MODERATION_TEMPLATES.map((t) => ({
    name: t.name.slice(0, 100),
    value: t.value.slice(0, 100),
  }));
}

export async function handleModerationReasonAutocomplete(interaction) {
  const focused = interaction.options.getFocused(true);
  if (focused.name === 'reason') {
    const query = (focused.value || '').toLowerCase();
    const filtered = DEFAULT_MODERATION_TEMPLATES.filter(
      (t) => t.name.toLowerCase().includes(query) || t.value.toLowerCase().includes(query)
    );
    await interaction.respond(
      filtered.slice(0, 25).map((t) => ({
        name: t.name.slice(0, 100),
        value: t.value.slice(0, 100),
      }))
    ).catch(() => {});
  }
}
