# ☀️ Sunsight

Sunsight adalah aplikasi WebGIS berbasis Computer Vision untuk menganalisis dan menghitung estimasi efektivitas pemasangan panel surya pada atap bangunan. Aplikasi ini memanfaatkan citra satelit/udara, mendeteksi batas atap secara otomatis, menganalisis area bayangan, lalu menghitung estimasi energi harian berdasarkan iradiasi lokasi.

Proyek ini dikembangkan sebagai Tugas Akhir untuk mata kuliah **Pemrosesan Citra dan Visual Komputer Cerdas**.

## 🛠️ Tech Stack

Repositori ini memakai arsitektur *monorepo* (Frontend dan Backend dalam satu repositori):

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4
- **Backend:** Laravel 13, PHP 8.3, Laravel Sanctum
- **Computer Vision:** Python 3.12 + OpenCV, dipanggil dari PHP sebagai proses terpisah
- **Database:** PostgreSQL 16 dengan ekstensi PostGIS (data spasial)
- **Deployment:** VPS

## 📁 Struktur Direktori

- `/fe` — antarmuka pengguna (Next.js).
- `/be` — REST API, logika computer vision, dan database (Laravel).
- `/be/scripts/cv` — skrip Python untuk pemrosesan citra.
- `/docs/plans` — plan implementasi.
- `API CONTRACT.md` — **sumber kebenaran** bentuk request/response API. Baca ini sebelum menyentuh kode FE atau BE.
- `commit-convention.md` — aturan penulisan pesan commit.

## 🚀 Setup Lokal

### Prasyarat

- Node.js 25 (versi dipatok di `.nvmrc`, jalankan `nvm use`)
- PHP 8.3+ dengan ekstensi `pdo_pgsql`, `pgsql`, dan `gd`
- Composer 2
- PostgreSQL 16 + PostGIS 3
- Python 3.12

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

Basis data test terpisah karena `phpunit.xml` diarahkan ke `sunsight_test`. Ini bukan pilihan gaya: assertion
`ST_IsValid` dan `ST_Area` tidak dapat dijalankan di SQLite.

### 2. Backend

```bash
cd be
composer install
cp .env.example .env
php artisan key:generate
php artisan storage:link   # membuat public/storage, wajib agar image_url dapat dimuat browser
php artisan migrate
```

`.env.example` sudah menunjuk PostgreSQL, jadi tidak ada yang perlu diubah untuk setup standar.

Environment Python untuk computer vision:

```bash
cd be
python3 -m venv .venv
.venv/bin/pip install -r scripts/cv/requirements.txt
.venv/bin/python -c "import cv2; print(cv2.__version__)"
```

Backend berjalan di http://localhost:8000.

### 3. Frontend

```bash
cd fe
nvm use
npm install
npm run dev
```

Frontend berjalan di http://localhost:3000.

## ✅ Verifikasi

```bash
cd be && php artisan test              # memakai sunsight_test
cd be && ./vendor/bin/pint --test      # gaya kode PHP
cd fe && npx tsc --noEmit              # pemeriksaan tipe
cd fe && npm run lint
cd fe && npm run build
```

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
