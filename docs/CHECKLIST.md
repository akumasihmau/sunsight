# Checklist Status Fitur — Sunsight

Status per 27 September 2026. Branch `feature/mvp-vertical-slice`, HEAD `1e6642a`.
Tanda centang berarti **sudah dijalankan dan diamati**, bukan sekadar sudah ditulis.

Cara cepat menjalankan dan menguji ulang seluruh gerbang ada di `README.md`.

---

## 1. Infrastruktur dan lingkungan

- [x] PostgreSQL 16 aktif dengan ekstensi **PostGIS 3.4** pada basis data aplikasi (`sunsight`)
- [x] Basis data test terpisah (`sunsight_test`) juga ber-PostGIS — assertion `ST_IsValid` dan `ST_Area` tidak dapat dijalankan di SQLite
- [x] `be/phpunit.xml` diarahkan ke basis data test ber-PostGIS, plus testsuite `Cv` yang terdaftar
- [x] `php artisan storage:link` aktif; `be/public/storage` ada sehingga `image_url` dapat dimuat browser
- [x] Virtual environment Python `be/.venv` dengan **OpenCV 5.0.0**, NumPy 2.5.3, Pillow 12.3.0
- [x] Dependensi PHP terpasang (Composer, Pint, PHPUnit 12.5.36)
- [x] Dependensi Node terpasang (368 paket)
- [x] `.nvmrc` mematok versi Node; `composer.json` mematok PHP `^8.3`
- [x] Fixture citra disimpan di jalur yang dilacak git (`be/tests/fixtures/imagery/`), bukan di `storage/app` yang diabaikan git
- [x] CORS untuk `api/*` bekerja bawaan Laravel (preflight `204`, `Access-Control-Allow-Origin: *`)

## 2. Autentikasi dan pengguna — 10 test, 33 assertion

- [x] `POST /api/register` — 201, membuat user, mengembalikan token Sanctum
- [x] `POST /api/login` — 200, mengembalikan token dan profil
- [x] `POST /api/logout` — 200, **mencabut token**; token yang sama setelahnya ditolak `401` (diverifikasi lewat HTTP nyata, bukan hanya test)
- [x] `GET /api/user` — profil tanpa `password` dan `remember_token`
- [x] Token bertahan setelah browser ditutup dan dibuka kembali
- [x] Permintaan tanpa token pada seluruh endpoint terproteksi → `401`
- [x] Login gagal → `401` dengan **pesan identik** untuk email tidak terdaftar dan password salah
- [x] Validasi `422` dengan pesan per-field (`errors.email`, `errors.password`)
- [x] Token disimpan sebagai hash, bukan teks biasa: plaintext 48 karakter dikirim ke klien, sedangkan kolom basis datanya berisi 64 karakter heksadesimal dan tidak memuat plaintext tersebut
- [x] Route `forgot-password` dan `reset-password` **dihapus**, bukan dibiarkan sebagai stub

## 3. Akuisisi citra — 9 test, 40 assertion

- [x] `POST /api/cv/fetch-osm` — mengunduh/membaca citra untuk `lat`, `lng`, `zoom`
- [x] Validasi rentang koordinat dan batas zoom (`15`–`20`, bawaan `19`) → `422`
- [x] Respons memuat `image_id` berupa **UUID**, `image_url` absolut, `bbox` berurutan `[minLng, minLat, maxLng, maxLat]`, ukuran `512×512`, dan `meters_per_pixel`
- [x] `meters_per_pixel` = `0.2966` pada zoom 19 di lintang Jakarta, sesuai rumus Web Mercator
- [x] `image_url` dapat dimuat tanpa header tambahan (`200`, `image/png`, berkas 555 KB, PNG 512×512 asli)
- [x] Aset disimpan di bawah direktori pemiliknya, dan dicatat di tabel `imagery_assets`
- [x] Memakai `image_id` milik user lain → `404` yang **tidak dapat dibedakan** dari UUID yang tidak pernah ada
- [x] Skala (`meters_per_pixel`) berasal dari metadata server, **bukan dari klien**
- [x] Dua permintaan berturut-turut menghasilkan `image_id` berbeda
- [x] Fixture tidak ikut tertulis ke direktori aset

## 4. Pipeline computer vision — 13 test, 77 assertion

- [x] `POST /api/cv/refine-polygon` — mengembalikan `refined_polygon` koordinat piksel dan `mask_image_url`
- [x] `POST /api/cv/detect-shadow` — mengembalikan `usable_area_sqm`, `shadow_area_sqm`, `total_area_sqm`, `shadow_mask_url`
- [x] Selalu berlaku `usable + shadow = total` (diverifikasi: 3172.61 + 1905.11 = 5077.72 m²)
- [x] Luas tidak pernah negatif dan `usable` tidak pernah melebihi total
- [x] Luas dihitung memakai skala aset: 100×100 piksel ≈ 880 m², 300×300 piksel ≈ 7918 m²
- [x] Poligon dengan kurang dari tiga titik unik ditolak `422`
- [x] Poligon hasil selalu berada di dalam batas citra
- [x] Mask tersimpan sebagai aset turunan dan URL-nya dapat dimuat
- [x] Kepemilikan aset divalidasi di **kedua** endpoint pemrosesan
- [x] Interpreter Python yang hilang → `500` dengan pesan konfigurasi (`exit 127` dikenali dari kode keluar, bukan dari exception)
- [x] Skrip yang keluar dengan kode gagal → `500` beserta pesan stderr-nya
- [x] Skrip yang melewati batas waktu → dihentikan dan dilaporkan sebagai kegagalan batas waktu
- [x] Batas antara PHP dan Python berada di antarmuka `CvClient`; mengganti implementasinya tidak menyentuh controller
- [x] Matematika ubin Web Mercator diuji terpisah (5 test, 102 assertion): indeks Jakarta zoom 19 = `(417682, 271762)`, dan indeks selalu dalam batas termasuk di dekat kutub

## 5. Kalkulasi energi surya — 13 test, 27 assertion

- [x] `POST /api/solar/calculate` — mengembalikan energi harian, iradiasi, orientasi atap, azimut rekomendasi, dan blok asumsi
- [x] Mengikuti rumus kontrak: `luas × efisiensi × iradiasi × performance ratio × faktor kemiringan`
- [x] Energi sebanding dengan luas area terpakai (4× luas → 4× energi)
- [x] Efisiensi nol → energi nol
- [x] Iradiasi diambil dari **NASA POWER asli** dan disimpan di cache; nilainya nyata, bukan mock (4.832 kWh/m²/hari untuk Jakarta)
- [x] Bila sumber iradiasi tidak dapat dihubungi → nilai cadangan dari konfigurasi dipakai dan **ditandai** `(cadangan)`, permintaan tidak digagalkan
- [x] Lintang selatan → azimut rekomendasi `0°` (utara); lintang utara → `180°`
- [x] Orientasi atap mengikuti sumbu utama poligon (memanjang timur-barat ≈ 90°, utara-selatan ≈ 0°)
- [x] Poligon merosot (kurang dari 2 titik) tidak menggagalkan kalkulasi
- [x] Kalkulasi bersifat murni: dapat diuji tanpa basis data dan tanpa jaringan
- [x] Kalkulasi **tidak** menulis baris apa pun ke basis data
- [x] Blok asumsi memuat tujuh kunci wajib dan nilainya berasal dari `config/solar.php`, sehingga dapat dikutip di laporan

## 6. Riwayat analisis — 16 test, 84 assertion

- [x] `POST /api/analyses` — 201, menyimpan luas, poligon geometri, dan seluruh asumsi
- [x] `GET /api/analyses` — berhalaman, bentuk `{data, meta, links}` sesuai kontrak
- [x] Daftar hanya memuat riwayat milik pemanggil (diverifikasi dengan dua user berisi data masing-masing)
- [x] `per_page` dihormati; `limit` diterima sebagai alias; ukuran di atas 100 dipangkas
- [x] `GET /api/analyses/{id}` — objek datar, poligon sebagai GeoJSON, asumsi ikut kembali
- [x] `DELETE /api/analyses/{id}` — baris benar-benar hilang
- [x] Riwayat milik user lain → `404` yang identik dengan riwayat tidak ada, untuk detail maupun hapus
- [x] `id` non-numerik → `404`, **bukan** `500` beserta stack trace
- [x] Menghapus user menghapus seluruh riwayatnya (kunci asing `cascadeOnDelete`)
- [x] Baris tanpa kolom asumsi ditolak oleh basis data
- [x] Geometri tersimpan valid menurut PostGIS (`ST_IsValid`), SRID 4326, bertipe `POLYGON`

## 7. Antarmuka pengguna

- [x] `/` — halaman depan dengan penjelasan alur empat tahap
- [x] `/register` dan `/login` — kesalahan validasi tampil **di bawah field yang bersangkutan**, bukan alert generik
- [x] `/analysis` — bentuk lengkap: ambil citra, klik untuk menggambar poligon, rapikan, analisis bayangan, hitung energi, simpan
- [x] Kanvas memberi umpan balik visual: citra, garis poligon, dan penanda tiap titik
- [x] Panel hasil menampilkan luas terpakai/berbayang/total, energi harian, iradiasi, orientasi, azimut, dan **tabel asumsi yang dipakai**
- [x] Tombol dinonaktifkan selama permintaan berjalan sehingga tidak ada pengiriman ganda; antarmuka juga menampilkan teks status untuk tiap tahap
- [x] Kegagalan satu tahap menampilkan pesan dan tidak mengunci antarmuka
- [x] `/history` — daftar, paginasi, detail berisi asumsi tersimpan, dan hapus dengan konfirmasi
- [x] Mengubah poligon membatalkan hasil tahap lanjutan, sehingga tidak ada hasil basi
- [x] Tanpa token, halaman terproteksi mengalihkan ke `/login`; respons `401` juga memicu pengalihan
- [x] Navigasi antar halaman memakai App Router; seluruh enam route ter-generate saat build

**Alur penuh di browser nyata sudah ditempuh:** daftar → ambil citra → gambar 4 titik → rapikan → bayangan → hitung → simpan → riwayat → detail.

## 8. Gerbang mutu

- [x] `cd be && php artisan migrate:fresh --seed` — 6 migrasi bersih
- [x] `cd be && php artisan test` — **75 test, 381 assertion, semuanya lulus** (73 test milik proyek ini, ditambah 2 test bawaan Laravel)
- [x] `cd be && ./vendor/bin/pint --test` — 0 temuan
- [x] `cd be && php artisan route:list --path=api` — 12 route, cocok persis dengan kontrak
- [x] `cd fe && npm run build` — kompilasi sukses, TypeScript lulus
- [x] `cd fe && npx tsc --noEmit` — bersih
- [x] `cd fe && npm run lint` — bersih
- [x] `API CONTRACT.md` cocok dengan perilaku nyata; contoh energinya sudah diperbaiki agar sesuai rumusnya sendiri

## 9. Berjalan, tetapi masih baseline

Bagian ini **wajib masuk bagian batasan laporan**. Semuanya berfungsi, tetapi belum sekuat yang namanya tersirat.

- [ ] **Perapian poligon belum memakai algoritma CV.** Tahap ini baru menormalkan poligon masukan (membuang titik kembar, memotong ke batas citra). Ambang adaptif, morfologi, dan GrabCut baru direncanakan pada U12.
- [ ] **Deteksi bayangan masih ambang kecerahan.** Nilai acuan berasal dari kecerahan rata-rata di dalam poligon, sehingga atap gelap, kolam, dan vegetasi masih dapat keliru dianggap bayangan. Pembobotan saturasi direncanakan pada U13.
- [ ] **Orientasi atap adalah orientasi sumbu poligon, bukan arah kemiringan.** Dari citra nadir, arah kemiringan memang tidak dapat ditentukan; ini keterbatasan metode, bukan bug, dan dilaporkan sebagai sumbu 0–180°.
- [ ] **Sumber citra masih fixture sintetis lokal.** Belum ada citra satelit nyata; pertanyaan lisensi dan resolusi sumber citra belum diputuskan (OQ1). Seluruh alur tetap dapat dijalankan tanpa jaringan karena hal ini.
- [ ] **Belum ada angka akurasi CV.** Tanpa dataset acuan, belum ada nilai IoU maupun akurasi klasifikasi piksel yang bisa dikutip. Harness-nya direncanakan pada U14.
- [ ] **Frontend belum punya runner test.** Verifikasi FE bersandar pada build, pemeriksaan tipe, lint, dan penelusuran di browser.
- [ ] **Kemiringan panel diasumsikan seragam** (10°, faktor kemiringan 1.05) dan tidak berasal dari pengukuran.

## 10. Belum dikerjakan

- [ ] **U12** — perapian poligon nyata dengan OpenCV
- [ ] **U13** — deteksi bayangan nyata dengan pengurangan salah klasifikasi
- [ ] **U14** — harness evaluasi CV dan dataset acuan (nilai IoU, akurasi)
- [ ] **U15** — batas laju percobaan login dan perintah pembersihan aset yatim
- [ ] Ekspor PDF riwayat analisis (ditunda)
- [ ] Lupa sandi dan reset sandi (sengaja dihapus dari kode dan kontrak)
- [ ] Peta interaktif penuh; slice ini memakai citra statis satu bidikan
- [ ] Dockerisasi (diputuskan ditunda setelah menimbang plafon RAM Docker Desktop di mesin pengembangan)
- [ ] Deployment ke VPS untuk pratinjau
- [ ] Rate limit, monitoring, dan paginasi lanjutan
- [ ] Bereskan sisa scaffolding: `tests/Feature/ExampleTest.php` dan `tests/Unit/ExampleTest.php` bawaan Laravel, serta aset `fe/public/*.svg` bawaan `create-next-app` yang tidak lagi dipakai

## 11. Catatan pengungkapan

- **Data demo sudah terhapus.** Gerbang terakhir menjalankan `migrate:fresh --seed`, sehingga `roof_analyses` dan `imagery_assets` kembali kosong dan hanya menyisakan user hasil seeder. Tampilan riwayat akan kosong sampai ada analisis baru yang dibuat. Untuk mengisinya, jalankan backend dan frontend lalu tempuh alur di `/analysis` sekali.
- **Tangkapan layar bukti** tersimpan di `../bukti/01-workspace-analisis.png` dan `../bukti/02-riwayat-dan-detail.png` (di luar repositori agar tidak membengkakkan git).
- **Verifikasi tampilan dilakukan lewat DOM**, bukan dengan melihat gambar: isi yang dilaporkan diambil dari elemen yang benar-benar dirender (atribut `src` citra, `viewBox` dan `points` SVG, serta teks halaman), karena model vision tidak tersedia di sesi ini.
- **Tool browser bawaan gagal start** (`omp.browser.headless` keluar dengan `exit=143`). Penelusuran berhasil dilakukan dengan menjalankan Chrome sendiri melalui `--remote-debugging-port` lalu menempel lewat CDP.
