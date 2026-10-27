/** Small, dependency-free locale helper for user-facing interactions. */
const messages = {
  id: {
    confessionTitle: 'Kirim Menfess', confessionLabel: 'Isi menfess kamu', confessionPlaceholder: 'Tulis pesanmu di sini…',
    notConfigured: 'Fitur menfess belum diatur oleh pengurus server.', disabled: 'Fitur menfess sedang dinonaktifkan.',
    tooFast: 'Tunggu {minutes} menit sebelum mengirim menfess lagi.', submitted: 'Menfess terkirim',
    submittedReview: 'Pesanmu sudah masuk antrean moderator. Identitasmu tidak akan tampil di channel publik.',
    submittedPublished: 'Pesanmu telah diposting secara anonim.', invalidContent: 'Isi menfess tidak boleh kosong.',
    reviewTitle: 'Menfess baru • perlu ditinjau', anonymous: 'Anonim', approve: 'Terbitkan', reject: 'Tolak',
    approved: 'Menfess diterbitkan', rejected: 'Menfess ditolak', alreadyHandled: 'Menfess ini sudah ditangani.',
    noPermission: 'Kamu tidak memiliki izin untuk meninjau menfess.', publicTitle: '💌 Menfess Pacil Baik',
    publicFooter: 'Pacil Baik • dikirim secara anonim', configTitle: 'Konfigurasi Menfess',
    configured: 'Konfigurasi menfess diperbarui.', statusEnabled: 'Aktif', statusDisabled: 'Nonaktif',
    destination: 'Channel publik', review: 'Channel review', approval: 'Perlu persetujuan', cooldown: 'Jeda kirim',
    reset: 'Konfigurasi menfess telah direset.', missingReview: 'Pilih channel review jika persetujuan moderator diaktifkan.',
    missingChannel: 'Pilih channel publik tujuan menfess.', yes: 'Ya', no: 'Tidak', minutes: '{count} menit',
  },
  en: {
    confessionTitle: 'Send a Confession', confessionLabel: 'Your confession', confessionPlaceholder: 'Write your message here…',
    notConfigured: 'The confession feature has not been configured by this server’s staff.', disabled: 'The confession feature is currently disabled.',
    tooFast: 'Please wait {minutes} minutes before sending another confession.', submitted: 'Confession sent',
    submittedReview: 'Your message is now in the moderator queue. Your identity will not appear in the public channel.',
    submittedPublished: 'Your message has been posted anonymously.', invalidContent: 'Your confession cannot be empty.',
    reviewTitle: 'New confession • review required', anonymous: 'Anonymous', approve: 'Publish', reject: 'Reject',
    approved: 'Confession published', rejected: 'Confession rejected', alreadyHandled: 'This confession has already been handled.',
    noPermission: 'You do not have permission to review confessions.', publicTitle: '💌 Pacil Baik Confession',
    publicFooter: 'Pacil Baik • sent anonymously', configTitle: 'Confession configuration',
    configured: 'Confession configuration updated.', statusEnabled: 'Enabled', statusDisabled: 'Disabled',
    destination: 'Public channel', review: 'Review channel', approval: 'Approval required', cooldown: 'Send cooldown',
    reset: 'Confession configuration reset.', missingReview: 'Choose a review channel when moderator approval is enabled.',
    missingChannel: 'Choose the public channel where confessions will be posted.', yes: 'Yes', no: 'No', minutes: '{count} minutes',
  },
};

export function localeOf(interactionOrLocale) {
  const locale = typeof interactionOrLocale === 'string' ? interactionOrLocale : interactionOrLocale?.locale;
  return String(locale || '').toLowerCase().startsWith('id') ? 'id' : 'en';
}

export function t(interactionOrLocale, key, variables = {}) {
  const locale = localeOf(interactionOrLocale);
  const template = messages[locale][key] ?? messages.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(variables[name] ?? `{${name}}`));
}
