# Desain: /pacilsetup, Circle, dan Confession terstruktur

Tanggal: 2026-11-03 · Cabang: `pacil-overhaul`

## Tujuan
Bot khusus server "Pacil Baik" (Fasilkom UI) mendapat tiga hal: (1) satu pintu konfigurasi bernama `/pacilsetup`, (2) sistem Circle untuk kelompok tugas/tongkrongan, (3) confession berformat Dari / Untuk / Pesan. Sukses berarti: pengurus mengatur semuanya dari satu dashboard, mahasiswa bisa membuat dan mengelola Circle tanpa command baru, dan confession tetap anonim bagi publik tetapi dapat ditelusuri pengurus.

## Keputusan yang sudah disepakati
- `/config` diganti nama menjadi `/pacilsetup` (hanya nama command; hub yang ada dipertahankan).
- Circle = **role + kategori privat + text channel + voice channel**, permintaan **disetujui pengurus**.
- Kolom "Dari" = **teks bebas** dengan penyaringan.
- Bot sudah di batas 100 slash command global: **tidak boleh menambah command baru**. Semua interaksi Circle lewat tombol, modal, dan menu.

## 1. Dashboard `/pacilsetup`
- Ganti nama di `src/commands/Core/config.js` (nama berkas boleh tetap). Perbarui: `prefixRestrictions.js`, `PROTECTED_COMMANDS` (tetap sertakan `configwizard`), teks di `configHub.js`, `help.js`, README, `docs/`.
- Tambah dua view ke `configHub`: **Circle** (aktif/nonaktif, channel permintaan, channel review, kategori induk opsional, batas, masa berlaku, tombol "Kirim panel Circle") dan **Confession format** (opsi tombol dukungan).
- Handler tetap tipis (`pacilcfg`), logika di `configHubService`.

## 2. Confession terstruktur
- Modal tiga kolom: **Dari** (opsional, maks 40 karakter), **Untuk** (opsional, maks 60), **Pesan** (wajib, panjang). Kosong berarti "Anonim" / "Semua".
- Embed dirakit lewat `pacilPanel`. Alur persetujuan, cooldown, log pengirim (`/confession lookup`), dan Balas anonim yang sudah ada **tidak berubah**.
- Penyaringan "Dari"/"Untuk" (fungsi murni di `confessionLogic.js`): hapus mention (`<@…>`, `@everyone`, `@here`), tautan dan undangan, dan karakter kontrol. "Dari" ditolak bila sama persis (tanpa memperhatikan huruf besar/kecil dan spasi) dengan nama tampilan/username anggota server si pengirim atau anggota lain yang dikenali bot di cache; yang ditolak diminta mengganti, bukan dikirim diam-diam. Catatan: ini mengurangi, bukan menghilangkan, peniruan; pengurus tetap bisa menelusuri pengirim.
- Opsional, **default mati**: tombol "Peluk 🤗" dan "Semangat 💪" di bawah confession; menghitung dukungan secara anonim, satu klik per orang per tombol.

## 3. Circle
**Alur.** Panel di channel permintaan memiliki tombol "Minta Circle" → modal (Nama Circle, Tujuan singkat) → permintaan masuk ke channel review dengan tombol Setujui / Tolak (hanya Manage Server/Admin atau role moderator) → saat disetujui bot membuat: role bernama Circle, kategori privat (`@everyone` ditolak lihat; role Circle dan bot diizinkan), 1 text channel, 1 voice channel, memberi role ke pembuat, dan mencatat pembuat sebagai pemilik. Pembuat diberi tahu lewat DM/ephemeral; bila DM tertutup, lewat mention di channel review.

**Panel pemilik** di text channel Circle (tombol/menu, tanpa command): Tambah anggota (user select), Keluarkan (user select), Ganti nama, Pindahkan pemilik, Perpanjang, Bubarkan (dengan konfirmasi).

**Batas.**
- Maks Circle aktif per server (default 40, hard cap 45 agar di bawah 50 kategori) dan maks 1 Circle sebagai pemilik per orang (default, dapat diatur 1–3).
- Cooldown permintaan per orang; satu permintaan menunggu per orang.
- Nama: 3–32 karakter, tanpa mention/tautan, unik (tanpa memperhatikan huruf besar/kecil) di antara Circle aktif.
- Semua panggilan pembuatan/penghapusan melewati antrean serial per server agar aman dari rate limit.

**Masa berlaku.** Default 30 hari. Pada hari ke-25 bot mengirim pengingat dengan tombol Perpanjang (menambah 30 hari, batas sama berlaku). Tanpa perpanjangan, Circle **diarsipkan**: izin lihat dicabut dan channel dikunci, status `archived`; setelah masa tenggang 7 hari, role/kategori/channel dihapus. Pemilik atau pengurus bisa memulihkan selama masa tenggang. Pemeriksaan berkala memakai timer pada proses bot (interval 1 jam) dan juga dijalankan sekali saat bot mulai.

**Penyimpanan.** Data Circle disimpan di **guild config** (`circles`: peta id → {ownerId, name, roleId, categoryId, textId, voiceId, status, expiresAt, createdAt}) dengan mutex `guildcfg:${guildId}`, mengikuti pola fitur sebelumnya. **Tidak ada tabel atau versi skema baru**, sehingga tidak berisiko pada data produksi. Jumlah entri dibatasi oleh batas Circle; entri `deleted` dibersihkan.

**Kegagalan.**
- Izin bot kurang atau role bot tidak di atas role Circle: dicek di dashboard dan sebelum setuju; permintaan tidak diproses dan pesan menjelaskan izin yang kurang.
- Gagal di tengah pembuatan: bot menghapus resource yang sudah terbuat (rollback), menandai permintaan gagal, dan memberi tahu pengurus.
- Resource dihapus manual oleh pengurus: pemeriksaan berkala mendeteksi dan menandai Circle sebagai `deleted`.
- Pemilik keluar server: pemilik dialihkan ke anggota lain bila ada, selain itu Circle diarsipkan.

## Struktur kode
- `src/services/circleLogic.js`: murni (validasi nama, batas, kedaluwarsa, transisi status, penyaringan nama); `tests/circleLogic.test.js`.
- `src/services/circleService.js`: operasi Discord + penyimpanan (ajukan, setujui/tolak, tambah/keluarkan, ganti nama, pindah pemilik, perpanjang, arsip, pulihkan, hapus), antrean serial per server.
- `src/services/circleMaintenanceService.js`: pemeriksaan berkala (pengingat, arsip, hapus).
- `src/ui/circleViews.js`: panel permintaan, kartu review, panel pemilik.
- `src/interactions/{buttons,selectMenus,modals}/circle/`: handler tipis dengan `customId` bentuk `circle:aksi:arg`.
- Perluasan `configHub.js`/`configHubService.js` untuk view Circle dan Confession.

## Pengujian
- Tes unit logika murni (`npm test`), termasuk batas, kedaluwarsa, penyaringan nama, dan penyaringan "Dari".
- Tes alur dengan harness tiruan (seperti hub dan JTC): permintaan→setuju→buat, rollback saat gagal, arsip→pulihkan→hapus.
- Smoke import semua modul; hitung command tetap 100.
- Tidak bisa diuji ke Discord sungguhan dari sini; uji akhir dilakukan pengguna di server uji.

## Di luar cakupan
Circle Wrapped, pengingat deadline SIAK NG, thread privat sebagai mode alternatif.
