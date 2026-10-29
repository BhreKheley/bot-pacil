# Pacil Bot Overhaul — Design

Date: 2026-10-29
Scope: bot khusus server Discord "Pacil Baik" (mahasiswa Fasilkom UI).

## Tujuan

Mengubah fork TitanBot menjadi bot Pacil Baik: bersih dari branding Titan, tampilan
konsisten khas Pacil (tidak berlebihan), plus fitur baru: balasan confession,
sticky message, hub `/config`, dan panel pemilik voice JTC yang kaya.

## Keputusan (dari user)

- Data produksi sudah ada: nama DB, user Postgres, dan volume **tidak** diganti paksa.
- Tampilan: **builder bersama + embed** (bukan Components V2).
- Confession reply: **thread** di bawah confession, balasan anonim berlabel (Anonim #1, #2, ...).
- Sticky message: **embed Pacil, banyak channel**, diatur admin lewat modal.
- Konfigurasi: **hub `/config` per fitur + izin per command** (role, channel, cooldown).
- Panel JTC: semua opsi — nama/limit/bitrate, kunci/sembunyi/izin user/kick,
  transfer/klaim pemilik, region/mode video/status ruang.

## Asumsi

- Bahasa UI default Indonesia santai-sopan; Inggris lewat `i18n`.
- Repo tanpa folder tes; verifikasi: `node --check`, smoke import semua modul,
  dan tes logika murni dengan `node:test` untuk bagian yang bisa diuji tanpa Discord.

## Sub-proyek

### 1. Rebrand + fondasi tema
- `TitanBotError` → `PacilBotError`; `__titanResponsePatched` → `__pacilResponsePatched`.
- README, SECURITY, CONTRIBUTING, roadmap, workflow CI, `.env.example` ditulis ulang untuk Pacil.
- `docker-compose.yml`: container/network jadi `pacilbot-*`; default `POSTGRES_DB/USER`
  tetap `titanbot` (dengan komentar) agar deploy lama tidak putus.
- Modul `src/ui/pacil.js`: token visual (Makara Gold aksen, Navy panel), footer seragam,
  `pacilPanel`, `pacilNotice`, `pacilConfirm`, `pacilButtons`. Aturan: 1 emoji per judul,
  label tombol tanpa emoji di teks (emoji lewat `setEmoji`).

### 2. Confession reply + sticky
- Confession terbit membawa tombol **Balas** (`confession:reply:<id>`). Klik membuka modal;
  balasan diposting bot ke thread confession (dibuat saat balasan pertama), diberi label
  anonim stabil per pengirim per confession (hash `guildId+confessionId+userId`, tanpa
  menyimpan identitas ke thread). Pengirim asli tercatat untuk moderasi seperti confession.
  Opsi config: `repliesEnabled`, `replyCooldownSeconds`. (Persetujuan moderator untuk balasan
  tidak diimplementasikan: YAGNI; gantinya `/confession lookup` untuk menelusuri pengirim
  menfess/balasan lewat ID footer.)
- Sticky: perintah `/sticky set|remove|list` (`set` pada channel yang sudah punya sticky = edit); data per channel
  (`judul`, `isi`, `warna`); listener `messageCreate` memposting ulang sticky di bawah dengan
  debounce (default 5 detik) dan menghapus pesan sticky lama. Bot tidak memicu dirinya sendiri.

### 3. Panel pemilik voice (JTC)
- Panel di chat voice temporer: nama, limit, bitrate, kunci/buka, sembunyi/tampilkan,
  izinkan/tolak user, kick, transfer pemilik, klaim (jika pemilik keluar), region RTC,
  mode kualitas video, status ruang. Hanya pemilik atau pengurus yang boleh mengubah.
- Admin `/jointocreate dashboard` memakai builder baru; tambah default region/video/status.

### 4. Hub `/config` + izin per command
- `/config` menampilkan menu fitur (menfess, sticky, JTC, welcome, logging, tiket, dll.)
  yang membuka panel fitur masing-masing, dan tab **Izin Command**: per command atur
  role yang boleh, channel yang diizinkan, cooldown, aktif/nonaktif.
- Penegakan izin di `commandPipeline`/`commandAccessService` (modul yang sudah ada diperluas,
  disimpan di guild config, kompatibel dengan `disabledCommands/disabledCategories`).

### 5. Rombak tampilan + verifikasi
- Panel fitur lain dimigrasi ke `src/ui/pacil.js`; bahasa Indonesia konsisten.
- Verifikasi: cek sintaks, smoke import, tes logika murni.

## Risiko

- Tidak bisa menjalankan bot ke Discord sungguhan di sini; perilaku antarmuka perlu dicoba
  user di server uji. Perubahan dipecah per commit supaya mudah di-revert.
