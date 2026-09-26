# Panduan Commit Sunsight

Repositori ini mengikuti spesifikasi [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/#summary).

## Struktur Pesan Commit
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]

## Tipe Commit (Type)
- **feat**: Fitur baru untuk aplikasi.
- **fix**: Perbaikan *bug* atau *error*.
- **docs**: Perubahan hanya pada dokumentasi (misal: README).
- **style**: Perubahan yang tidak memengaruhi arti kode (spasi, format, titik koma hilang, dll).
- **refactor**: Perubahan kode yang tidak memperbaiki *bug* atau menambah fitur (misal: restrukturisasi fungsi).
- **perf**: Perubahan kode yang meningkatkan performa atau kecepatan eksekusi.
- **test**: Penambahan pengujian atau perbaikan pengujian yang sudah ada.
- **chore**: Perubahan pada proses *build* atau alat bantu (*tools*), seperti pembaruan *dependency*.

## Cakupan (Scope)
Karena repositori ini memisahkan frontend dan backend, gunakan *scope* berikut untuk memperjelas konteks perubahan:
- `(fe)`: Modifikasi pada direktori `/fe` (Next.js, antarmuka pengguna, pemanggilan API).
- `(be)`: Modifikasi pada direktori `/be` (Laravel, rute, *controller*, logika *computer vision*).
- `(db)`: Modifikasi terkait PostgreSQL, PostGIS, atau migrasi *database*.
- `(root)`: Konfigurasi di *root folder* (misal: panduan ini, `.gitignore` global).

## Contoh Penggunaan
- `feat(be): buat algoritma ekstraksi atap dari citra OSM`
- `feat(fe): tambahkan kalkulator estimasi daya solar panel`
- `fix(db): perbaiki query PostGIS untuk pemetaan koordinat`
- `chore(root): inisialisasi struktur monorepo be dan fe`