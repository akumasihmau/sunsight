# ☀️ Sunsight

Sunsight adalah studio simulasi potensi PLTS atap. Pengguna memasukkan koordinat, sistem menampilkan
citra satelit nadir lokasi itu, pengguna menempatkan dan mengubah persegi bidang atap, sistem menata
modul surya di dalamnya, lalu menampilkan empat angka utama: **kapasitas terpasang, produksi tahunan,
penghematan listrik bulanan, dan payback**.

Proyek ini dikembangkan sebagai Tugas Akhir untuk mata kuliah **Pemrosesan Citra dan Visual Komputer
Cerdas**.

## 🛠️ Tech Stack

Repositori ini memakai arsitektur *monorepo*:

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4
- **Backend:** Laravel 13, PHP 8.3, Laravel Sanctum
- **Database:** PostgreSQL 16 dengan ekstensi PostGIS (menyimpan poligon bidang atap sebagai geometri)
- **Citra satelit:** Mapbox Static Images (`satellite-v9`)
- **Iradiasi:** NASA POWER (klimatologi tahunan), dengan nilai cadangan bila sumber tidak dapat dihubungi
- **Deployment:** VPS

## 📁 Struktur Direktori

- `/fe` — antarmuka pengguna (Next.js). Halaman studio ada di `fe/src/app/studio`.
- `/be` — REST API dan seluruh perhitungan (Laravel).
- `/be/scripts/cv` — disiapkan untuk tahap usulan otomatis batas atap (lihat *Rencana Lanjutan*).
- `/docs/plans` — plan implementasi.
- `/docs/CHECKLIST.md` — status fitur beserta cara pembuktiannya.
- `API CONTRACT.md` — **sumber kebenaran** bentuk request/response. Baca ini sebelum menyentuh kode FE atau BE.
- `commit-convention.md` — aturan penulisan pesan commit.

## ⚠️ Satu Aturan yang Tidak Boleh Dilanggar

**Seluruh angka hasil dihitung di server.** Klien hanya mengirim masukan: persegi bidang atap, parameter
teknis, tarif, dan tagihan. Kapasitas, produksi, penghematan, dan payback tidak pernah diterima dari
klien. Bila klien mengirim kunci hasil sekaligus, kunci itu diabaikan. Ini yang menjaga angka di layar
sama dengan angka yang tersimpan, dan menjaga hasil tidak dapat dikarang.

## 🚀 Setup Lokal

### Prasyarat

- Node.js 25 (versi dipatok di `.nvmrc`, jalankan `nvm use`)
- PHP 8.3+ dengan ekstensi `pdo_pgsql`, `pgsql`, dan `gd`
- Composer 2
- PostgreSQL 16 + PostGIS 3
- Akun Mapbox beserta access token

### 1. Database (PostgreSQL + PostGIS)

**Ekstensi PostGIS wajib.** Tanpa itu migrasi dan test akan gagal.

```bash
sudo apt install postgresql-16-postgis-3
sudo systemctl start postgresql
```

Buat role dan dua basis data — satu untuk aplikasi, satu untuk test:

```bash
sudo -u postgres psql -c "CREATE ROLE sunsight LOGIN PASSWORD 'sunsight' CREATEDB;"
sudo -u postgres createdb -O sunsight sunsight
sudo -u postgres createdb -O sunsight sunsight_test
sudo -u postgres psql -d sunsight      -c "CREATE EXTENSION IF NOT EXISTS postgis;"
sudo -u postgres psql -d sunsight_test -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

Verifikasi:

```bash
PGPASSWORD=sunsight psql -h 127.0.0.1 -U sunsight -d sunsight      -tAc "SELECT PostGIS_Version()"
PGPASSWORD=sunsight psql -h 127.0.0.1 -U sunsight -d sunsight_test -tAc "SELECT PostGIS_Version()"
```

Basis data test terpisah karena `phpunit.xml` diarahkan ke `sunsight_test`. Ini bukan pilihan gaya:
assertion `ST_IsValid` dan `ST_Area` tidak dapat dijalankan di SQLite.

### 2. Backend

```bash
cd be
composer install
cp .env.example .env
php artisan key:generate
php artisan storage:link   # membuat public/storage, wajib agar image_url dapat dimuat browser
php artisan migrate
```

### 3. Token citra satelit

Isi `MAPBOX_ACCESS_TOKEN` di `be/.env` dengan token dari akun Mapbox. Tanpa token, endpoint lokasi
mengembalikan pesan yang menyebut variabel itu — bukan citra kosong.

Bila ingin menjalankan alur tanpa jaringan atau tanpa token, set `IMAGERY_PROVIDER=sample` agar citra
diambil dari fixture lokal. Fixture itu citra sintetis, **bukan citra satelit**, dan atribusinya
menyatakan hal itu.

**Catatan lisensi.** ToS Mapbox mengizinkan penggunaan non-produksi (pengembangan, evaluasi, pengujian,
dan demonstrasi) dengan atribusi tetap tampil, dan mensyaratkan lisensi komersial untuk penggunaan
produksi pada aplikasi yang berkaitan dengan real estate atau analytics. Untuk tugas akhir dan demo,
ketentuannya terpenuhi selama atribusi tidak dihapus.

### 4. Frontend

```bash
cd fe
nvm use
npm install
npm run dev
```

Frontend berjalan di http://localhost:3000. Ia memanggil API di `http://localhost:8000/api` secara bawaan;
untuk mengubahnya, salin `fe/.env.example` menjadi `fe/.env.local`.

Backend dan frontend harus berjalan bersamaan. CORS untuk `api/*` sudah ditangani bawaan Laravel.

## ✅ Verifikasi

```bash
cd be && php artisan test              # memakai sunsight_test, tidak menyentuh jaringan
cd be && ./vendor/bin/pint --test      # gaya kode PHP
cd fe && npm run build                 # sekaligus menghasilkan tipe global Next
cd fe && npx tsc --noEmit              # pemeriksaan tipe, jalankan setelah build
cd fe && npm run lint
```

Pemeriksaan tipe di frontend harus dijalankan setelah `npm run build`, karena tipe global Next
(`LayoutProps` dan sejenisnya) baru dihasilkan oleh build ke `fe/next-env.d.ts` dan `fe/.next/types`.
Pada klon bersih, `npx tsc --noEmit` gagal sebelum build pertama.

## 🔜 Rencana Lanjutan

Deteksi batas atap secara otomatis dari citra: usulan persegi bidang atap dan pengecualian rintangan
(HVAC, skylight, tandon) dengan OpenCV. Environment Python sudah disiapkan untuk itu:

```bash
cd be
python3 -m venv .venv
.venv/bin/pip install -r scripts/cv/requirements.txt
```

Selama tahap itu belum dikerjakan, persegi bidang atap ditempatkan pengguna.

## ⚠️ Masalah Lokal yang Diketahui

**Peringatan `pdo_pgsql` / `pdo_mysql` saat PHP start.** Di mesin ini `/etc/php/8.3/cli/php.ini` memuat
`extension=pdo_pgsql` di level atas, sementara `conf.d/20-pdo_pgsql.ini` memuat ekstensi yang sama —
jadi PHP mencoba memuatnya dua kali dan memunculkan peringatan `undefined symbol: pdo_parse_params`.
Ini **tidak berbahaya**: ekstensinya tetap termuat dan koneksi PostgreSQL bekerja. Untuk menghilangkannya,
hapus dua baris `extension=pdo_mysql` dan `extension=pdo_pgsql` dari `/etc/php/8.3/cli/php.ini`.

## 🤝 Alur Kerja & Kontribusi

- **Branching:** jangan push langsung ke `main`. Buat branch fitur, contoh `feature/be-setup-database`.
- **Commit:** repositori ini mengikuti [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#summary).
  Baca `commit-convention.md` sebelum commit. Scope yang dipakai: `(fe)`, `(be)`, `(db)`, `(root)`.
- **Kontrak API:** setiap perubahan bentuk payload, satuan, atau kode status harus memperbarui
  `API CONTRACT.md` pada commit yang sama.

Dikelola oleh Tim Pengembang Sunsight:

Rafid Wahyu Aditya · Habibi Farhan Hamdani · Muhammad Abi Rizky
