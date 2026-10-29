# Pacil Bot 💻

Bot Discord resmi komunitas **Pacil Baik**, server mahasiswa Fasilkom UI. Dibangun dengan discord.js v14 dan PostgreSQL.

## Fitur

- **Menfess (confession)** anonim dengan antrean moderator, tombol **Balas**, dan balasan anonim di thread.
- **Sticky message**: pesan embed yang selalu muncul di bagian bawah channel pilihanmu.
- **Join to Create**: ruang voice sementara dengan panel kontrol lengkap untuk pemiliknya.
- **Hub `/config`**: satu pintu untuk mengatur semua fitur, plus izin per command (role, channel, cooldown).
- Moderasi, tiket, verifikasi, welcome, leveling, ekonomi, giveaway, ulang tahun, reaction role, musik, dan alat bantu lainnya.

### Menfess

Identitas pengirim tidak pernah tampil di channel publik. Identitas hanya terlihat di antrean review moderator yang privat.

1. Pengurus menjalankan `/confession configure` (channel publik, channel review, role moderator, jeda kirim).
2. Anggota memakai `/confession send` dan mengisi formulir.
3. Moderator menerbitkan atau menolak lewat tombol di antrean.
4. Setelah terbit, anggota lain bisa menekan **Balas**. Balasan masuk ke thread di bawah menfess dengan label anonim (Anonim 1, Anonim 2, dst.).

Atur balasan lewat `/confession configure` (opsi `replies` dan `reply_cooldown`). Bot perlu izin *Create Public Threads* dan *Send Messages in Threads*. Balasan memakai label stabil per orang di tiap menfess (Anonim 1, Anonim 2, ...), sedangkan pengirim asli berlabel *Pengirim Asli*.

Agar tidak disalahgunakan, pengurus bisa menelusuri pengirim lewat `/confession lookup id:<ID di footer>` (hanya terlihat oleh pengurus, balasan dan menfess sama-sama tercatat).

Jaga agar channel review tetap privat dan hanya bisa diakses moderator tepercaya.

### Sticky message

`/sticky set` membuka formulir (judul, isi, warna opsional) untuk channel yang dipilih. Bot memposting ulang sticky di bawah setelah ada chat baru, dengan jeda supaya tidak spam. Menjalankan `/sticky set` lagi pada channel yang sama berarti mengubah sticky-nya (formulir terisi otomatis). Hapus dengan `/sticky remove`, lihat semuanya dengan `/sticky list`. Maksimal 25 sticky per server.

### Join to Create

Jalankan `/jointocreate setup`. Setiap ruang voice sementara mendapat panel kontrol di chat voice-nya. Pemilik ruang (atau pengurus server) bisa mengubah nama, batas user, bitrate, kunci/buka, sembunyikan/tampilkan, izinkan atau tolak user, kick, transfer pemilik, klaim ruang saat pemilik keluar, region, mode video, dan status ruang. Ruang kosong dihapus otomatis.

### Panduan admin

- **Panduan permanen:** `/configwizard guide_channel:#panduan-bot` memposting direktori bantuan interaktif.
- **Pengumuman berdesain:** `/say message:<isi> title:<judul> color:<warna> channel:<tujuan>`.
- **Atur semuanya:** `/config`.

## Deploy dengan Docker

1. Clone repo:
   ```bash
   git clone https://github.com/BhreKheley/bot-pacil.git
   cd bot-pacil
   ```

2. Siapkan environment:
   ```bash
   cp .env.example .env
   ```
   Isi minimal `DISCORD_TOKEN`, `CLIENT_ID`, dan `GUILD_ID`. Docker Compose juga membaca `POSTGRES_USER`, `POSTGRES_PASSWORD`, dan `POSTGRES_DB` dari `.env`.

   > **Catatan data lama:** nilai bawaan `POSTGRES_USER` dan `POSTGRES_DB` sengaja tetap `titanbot` supaya deploy yang sudah berjalan tidak kehilangan database. Untuk instalasi baru kamu bebas memakai `pacilbot` di `.env`.

3. Jalankan:
   ```bash
   docker compose up -d --build
   ```

4. Cek status:
   ```bash
   docker compose ps
   curl http://localhost:3000/health
   ```

Compose menjalankan bot dan PostgreSQL dengan `POSTGRES_SSL=false` dan `AUTO_MIGRATE=true`.

### Image GitHub Container Registry

Image dipublikasikan otomatis setiap push ke `main`:

```bash
docker pull ghcr.io/bhrekheley/bot-pacil:main
```

### Musik

Musik memakai [Lavalink v4](https://github.com/lavalink-devs/Lavalink) lewat [Riffy](https://github.com/riffy-rb/riffy).

1. Secara bawaan bot memuat node publik dari [`lavalink/nodes.json`](lavalink/nodes.json). Edit berkas itu untuk menambah atau menghapus node.
2. Untuk Lavalink sendiri: `docker compose --profile local-lavalink up -d`, lalu isi di `.env`:
   ```env
   LAVALINK_HOST=lavalink
   LAVALINK_PORT=2333
   LAVALINK_PASSWORD=youshallnotpass
   LAVALINK_SECURE=false
   ```
   Hapus atau ganti nama `lavalink/nodes.json` agar bot memakai variabel tersebut.
3. Override node lewat `LAVALINK_NODES` (array JSON) atau `LAVALINK_NODES_FILE`.
4. Pakai `/play <lagu>` dari voice channel, atau `/join` untuk masuk tanpa memutar.

## Instalasi manual

Prasyarat: Node.js 20.10+, PostgreSQL (disarankan, ada fallback memori untuk pengembangan), dan aplikasi bot Discord.

```bash
git clone https://github.com/BhreKheley/bot-pacil.git
cd bot-pacil
npm install
cp .env.example .env
npm run migrate:check
npm start
```

Variabel minimal di `.env`:

```env
DISCORD_TOKEN=token_bot_kamu
CLIENT_ID=client_id_kamu
GUILD_ID=id_server_kamu

POSTGRES_URL=postgresql://postgres:passwordmu@localhost:5432/pacilbot
```

Catatan produksi:
- `NODE_ENV=production` dan `LOG_LEVEL=warn` untuk konsol yang bersih.
- Jika `PORT` terpakai, bot mencoba port berikutnya (sampai `PORT_RETRY_ATTEMPTS`).
- Migrasi skema berjalan otomatis saat start. Matikan dengan `AUTO_MIGRATE=false`.

### Server lain

Slash command didaftarkan **global** lewat `CLIENT_ID`, jadi bot berfungsi di semua server yang mengundangnya. Data tiap server terisolasi (kunci `guild:{guildId}:...`). Command global bisa butuh hingga sekitar satu jam untuk muncul pada deploy pertama.

## Intent dan izin bot

Intent: Guilds, Guild Messages, Message Content, Guild Members, Guild Message Reactions, Guild Voice States, Direct Messages.

Izin: View Channels, Send Messages, Send Messages in Threads, Create Public Threads, Embed Links, Attach Files, Read Message History, Manage Messages, Manage Channels, Manage Roles, Kick Members, Ban Members, Moderate Members, Connect, Move Members.

## Lisensi

Dirilis dengan Lisensi MIT. Lihat [LICENSE](LICENSE). Proyek ini berawal dari fork TitanBot dan sudah disesuaikan sepenuhnya untuk komunitas Pacil Baik.
