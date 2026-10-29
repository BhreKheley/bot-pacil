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
    reply: 'Balas', replyTitle: 'Balas Menfess', replyLabel: 'Isi balasan kamu', replyPlaceholder: 'Tulis balasan anonim di sini…',
    replyFooter: 'Balasan anonim', replyDisabled: 'Balasan untuk menfess sedang dinonaktifkan.',
    replyNotAvailable: 'Menfess ini sudah tidak bisa dibalas.', replyTooFast: 'Tunggu {seconds} detik sebelum membalas lagi.',
    replySent: 'Balasanmu terkirim secara anonim ke thread menfess.', replyThreadFailed: 'Bot belum bisa membuat atau mengirim ke thread. Minta pengurus mengecek izin bot (Create Public Threads dan Send Messages in Threads).',
    replies: 'Balasan', repliesOn: 'Aktif', repliesOff: 'Nonaktif', replyCooldown: 'Jeda balas', seconds: '{count} detik',
    lookupNotFound: 'Tidak ada menfess atau balasan dengan ID itu.', lookupTitle: 'Penelusuran Menfess',
    stickyModalTitle: 'Pesan Sticky', stickyTitleLabel: 'Judul (opsional)', stickyContentLabel: 'Isi pesan', stickyColorLabel: 'Warna hex (opsional, contoh #FFD700)',
    stickySaved: 'Sticky di {channel} sudah disimpan dan diposting.', stickyRemoved: 'Sticky di {channel} dihapus.', stickyNotFound: 'Channel itu belum punya sticky.',
    stickyLimit: 'Server ini sudah mencapai batas {max} sticky. Hapus salah satu dulu.', stickyListTitle: 'Daftar Sticky', stickyEmpty: 'Belum ada sticky. Buat dengan `/sticky set`.',
    stickyBadChannel: 'Pilih channel teks atau pengumuman.', stickyNoPermission: 'Kamu perlu izin **Kelola Pesan** untuk mengatur sticky.',
    stickyErr_emptyContent: 'Isi sticky tidak boleh kosong.', stickyErr_contentTooLong: 'Isi sticky terlalu panjang (maksimal 3500 karakter).',
    stickyErr_titleTooLong: 'Judul terlalu panjang (maksimal 256 karakter).', stickyErr_invalidColor: 'Warna harus berformat hex 6 digit, misalnya #FFD700.',
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
    reply: 'Reply', replyTitle: 'Reply to Confession', replyLabel: 'Your reply', replyPlaceholder: 'Write your anonymous reply here…',
    replyFooter: 'Anonymous reply', replyDisabled: 'Replies to confessions are currently disabled.',
    replyNotAvailable: 'This confession can no longer be replied to.', replyTooFast: 'Please wait {seconds} seconds before replying again.',
    replySent: 'Your reply was sent anonymously to the confession thread.', replyThreadFailed: 'The bot could not create or post in the thread. Ask staff to check its permissions (Create Public Threads and Send Messages in Threads).',
    replies: 'Replies', repliesOn: 'Enabled', repliesOff: 'Disabled', replyCooldown: 'Reply cooldown', seconds: '{count} seconds',
    lookupNotFound: 'No confession or reply was found with that ID.', lookupTitle: 'Confession lookup',
    stickyModalTitle: 'Sticky message', stickyTitleLabel: 'Title (optional)', stickyContentLabel: 'Message', stickyColorLabel: 'Hex color (optional, e.g. #FFD700)',
    stickySaved: 'The sticky in {channel} was saved and posted.', stickyRemoved: 'The sticky in {channel} was removed.', stickyNotFound: 'That channel has no sticky.',
    stickyLimit: 'This server reached the limit of {max} stickies. Remove one first.', stickyListTitle: 'Sticky messages', stickyEmpty: 'No stickies yet. Create one with `/sticky set`.',
    stickyBadChannel: 'Choose a text or announcement channel.', stickyNoPermission: 'You need the **Manage Messages** permission to manage stickies.',
    stickyErr_emptyContent: 'The sticky message cannot be empty.', stickyErr_contentTooLong: 'The sticky message is too long (max 3500 characters).',
    stickyErr_titleTooLong: 'The title is too long (max 256 characters).', stickyErr_invalidColor: 'Color must be a 6-digit hex value, for example #FFD700.',
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
