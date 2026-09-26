# ☀️ Sunsight

Sunsight adalah aplikasi WebGIS berbasis Computer Vision untuk menganalisis dan menghitung estimasi efektivitas pemasangan panel surya pada atap bangunan. Aplikasi ini memanfaatkan citra satelit/udara dari OpenStreetMap (OSM) dan mengeksekusi algoritma pemrosesan citra untuk mendeteksi batas atap secara otomatis serta menganalisis area bayangan.

Proyek ini dikembangkan sebagai Tugas Akhir untuk mata kuliah **Pemrosesan Citra dan Visual Komputer Cerdas**.

## 🛠️ Tech Stack
Repositori ini menggunakan arsitektur *monorepo* (Frontend dan Backend terpisah dalam satu repositori) dengan teknologi berikut:
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Backend:** Laravel 12, Python (OpenCV untuk *Computer Vision*)
- **Database:** PostgreSQL dengan ekstensi PostGIS (Data Spasial)
- **Deployment:** VPS

## 📁 Struktur Direktori
- `/fe`: Berisi kode sumber untuk antarmuka pengguna (Frontend).
- `/be`: Berisi REST API, logika *computer vision*, dan manajemen *database* (Backend).
- `commit-convention.md`: Aturan standar penulisan pesan *commit* untuk kolaborasi tim.

## 🚀 Cara Setup Lokal (Development)

### Prasyarat
Pastikan Anda sudah menginstal:
- Node.js (v18+)
- PHP (v8.2+) & Composer
- PostgreSQL & pgAdmin (atau *client* lain)
- Python 3 & OpenCV (untuk integrasi CV ke depannya)

### 1. Setup Frontend
```bash
cd fe
npm install
npm run dev
Frontend akan berjalan di http://localhost:3000.
```

2. Setup Backend & Database
Buat database kosong di PostgreSQL dengan nama sunsight.

PENTING: Aktifkan ekstensi PostGIS di database tersebut dengan mengeksekusi query SQL ini:

```SQL
CREATE EXTENSION IF NOT EXISTS postgis;
```

Konfigurasi Laravel:
```Bash
cd be
composer install
cp .env.example .env
php artisan key:generate
```

Sesuaikan konfigurasi database di file be/.env:
```PHP
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=sunsight
DB_USERNAME=postgres
DB_PASSWORD=password_postgres_anda
```

Jalankan migrasi dan nyalakan server:
```Bash
php artisan migrate
php artisan serve
```

Backend API akan berjalan di http://localhost:8000.

🤝 Alur Kerja & Kontribusi
Branching: Jangan melakukan push langsung ke main. Buat branch fitur baru untuk setiap pengerjaan (contoh: feature/be-setup-database atau feature/fe-dashboard-ui).

Commit: Repositori ini menerapkan standar Conventional Commits. Silakan baca file commit-convention.md sebelum melakukan git commit.

Dikelola oleh Tim Pengembang Sunsight.

Rafid Wahyu Aditya
Habibi Farhan Hamdani
Muhammad Abi Rizky