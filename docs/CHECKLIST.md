# Checklist Status Fitur — Sunsight

Status per 27 September 2026. Branch `feature/mvp-vertical-slice`.
Tanda centang berarti **sudah dijalankan dan diamati**, bukan sekadar sudah ditulis.

Produk saat ini adalah **studio simulasi PLTS atap**: koordinat → citra satelit nadir → persegi bidang
atap ditempatkan pengguna → modul ditata otomatis → kapasitas, produksi, penghematan bulanan, payback.

Cara menjalankan dan menguji ulang seluruh gerbang ada di `README.md`.

---

## 1. Infrastruktur

- [x] PostgreSQL 16 + **PostGIS 3.4** pada basis data aplikasi dan basis data test
- [x] `be/phpunit.xml` diarahkan ke basis data test ber-PostGIS, dan dipatok ke penyedia citra `sample` supaya test tidak bergantung jaringan maupun kredensial
- [x] `php artisan storage:link` aktif; `image_url` dapat dimuat browser
- [x] Dependensi PHP dan Node terpasang; `.nvmrc` mematok versi Node
- [x] CORS `api/*` bekerja bawaan Laravel
- [x] Environment Python disiapkan untuk tahap usulan otomatis batas atap (OpenCV), belum dipakai produk

## 2. Lokasi dan citra — 9 test / 38 assertion

- [x] `POST /location` mengembalikan citra untuk satu koordinat, beserta bbox, ukuran, skala, dan atribusi
- [x] `bbox` selalu berurutan `[minLng, minLat, maxLng, maxLat]`
- [x] `meters_per_pixel` = 0,2966 pada zoom 19 di lintang Jakarta, sesuai rumus Web Mercator
- [x] Validasi rentang koordinat dan batas zoom 15–20 menghasilkan `422` per-field
- [x] Citra disajikan lewat URL yang dapat dimuat browser tanpa header tambahan
- [x] Aset hanya dapat diproses pemiliknya; aset milik user lain tidak dapat dibedakan dari yang tidak ada
- [x] **Ekstensi berkas ditentukan dari tipe MIME sebenarnya**, bukan dipaksa `.png`. Gaya raster penyedia citra mengembalikan JPEG, dan sebelum perbaikan ini berkasnya akan bernama `.png` padahal isinya JPEG
- [x] Tanpa token penyedia citra, endpoint gagal dengan pesan yang menyebut `MAPBOX_ACCESS_TOKEN`, bukan citra kosong
- [x] Atribusi ikut dikembalikan dan wajib ditampilkan; ToS penyedia melarang penghapusan tanda kepemilikan
- [x] Penyedia `sample` tersedia sebagai jalur luring, dan atribusinya menyatakan bahwa citranya **bukan** citra satelit

## 3. Geometri bidang atap — 9 test / 69 assertion

- [x] Persegi dapat digeser, diubah ukurannya, dan diputar di atas citra
- [x] Dimensi dinyatakan dalam meter, dihitung dari skala milik server
- [x] Setback keliling dan jalur talang mengurangi luas efektif
- [x] Setback yang melebihi separuh sisi menghasilkan luas efektif nol, bukan negatif
- [x] Rotasi tidak mengubah luas dan tidak menukar sisi
- [x] Persegi diperiksa berada di dalam citra **termasuk keempat sudutnya saat diputar**; keluar batas menghasilkan `422`
- [x] Poligon bidang atap tersimpan sebagai geometri PostGIS yang valid

## 4. Tata letak modul — 8 test / 17 assertion

- [x] Preset modul membawa daya puncak, dimensi, dan harga
- [x] Efisiensi modul **dihitung** dari daya dibagi luas, bukan diketik terpisah, sehingga tidak mungkin menyimpang dari dimensinya
- [x] Kisi baris × kolom dihitung dari pertidaksamaan sebenarnya, bukan pembagian sederhana
- [x] Orientasi potret dan lanskap menukar sisi modul
- [x] Area yang lebih kecil dari satu modul menghasilkan nol slot, bukan satu
- [x] Jumlah panel yang diminta dipotong ke jumlah slot maksimum
- [x] `panel_count: null` mengisi seluruh slot yang muat, dan maksud itu tetap terbaca saat riwayat dibuka kembali
- [x] Jumlah ekstrem seperti `10000` ditolak `422`, bukan diterima diam-diam

## 5. Energi — 12 test / 24 assertion

- [x] Iradiasi harian dari **NASA POWER asli**, dengan penyimpanan sementara; nilai 4,8324 kWh/m²/hari untuk Jakarta terverifikasi lewat permintaan sungguhan
- [x] Bila sumber tidak dapat dihubungi, nilai cadangan dipakai dan **ditandai** `(cadangan)`
- [x] **Performance ratio diterapkan**, sehingga rugi suhu, kabel, inverter, dan kotoran ikut terhitung
- [x] Faktor sudut datang **dinormalisasi terhadap bidang horizontal**: bidang datar bernilai tepat 1,0. Tanpa normalisasi ini produksi terhitung sekitar seperempat terlalu rendah
- [x] Faktor diintegrasikan per jam untuk dua belas bulan, karena rata-rata tengah hari saja **tidak dapat membedakan azimuth**
- [x] Di lintang selatan modul menghadap utara lebih baik; di lintang utara sebaliknya
- [x] Kemiringan yang terlalu curam menurunkan faktor; selisih azimuth kecil hampir tidak berpengaruh
- [x] Produksi sebanding dengan kapasitas; performance ratio nol menghasilkan nol
- [x] Angka hasil dapat diverifikasi ulang dari responsnya sendiri

## 6. Finansial — 10 test / 23 assertion

- [x] CAPEX dirinci menjadi modul, inverter, racking, dan instalasi, dan rinciannya menjumlah tepat ke totalnya
- [x] Inverter string dihitung per kWp, mikroinverter per modul
- [x] Tarif PLN per golongan beserta tahun berlakunya
- [x] **Penghematan bulanan tidak pernah melebihi tagihan listrik bulanan**, dan kelebihan produksi tidak diklaim sebagai penghematan
- [x] Payback = CAPEX dibagi penghematan tahunan; tanpa modul terpasang payback bernilai kosong, bukan nol
- [x] Reduksi CO₂ dihitung dari energi yang benar-benar menggantikan listrik, bukan seluruh produksi
- [x] Seluruh konstanta berada di `config/plts.php` beserta catatan dasarnya

## 7. Hasil, riwayat, dan integritas — 26 test / 167 assertion

- [x] `GET /options` menyediakan katalog modul, tarif, nilai bawaan, dan batas masukan, sehingga klien tidak menyalin konstanta
- [x] `POST /simulate` mengembalikan geometri, tata letak, energi, dan finansial, dan **tidak menyimpan apa pun**
- [x] **Angka hasil kiriman klien diabaikan.** Diverifikasi dua kali: lewat test dan lewat permintaan nyata dengan `capacity_kwp: 9999` — hasilnya tetap 13,2 kWp
- [x] `POST /analyses` menghitung ulang di server sebelum menyimpan, sehingga baris tersimpan tidak dapat dipalsukan
- [x] Daftar hanya memuat simulasi milik pemanggil; `per_page` dihormati dan `limit` diterima sebagai alias
- [x] Detail berbentuk objek datar dan memuat masukan, hasil, serta asumsi yang dipakai
- [x] Simulasi milik user lain menghasilkan `404` yang identik dengan simulasi yang tidak ada
- [x] `id` non-numerik menghasilkan `404`, bukan `500` beserta stack trace
- [x] Menghapus user menghapus simulasinya; geometri tersimpan valid menurut PostGIS

## 8. Antarmuka

- [x] `/` halaman depan, `/register` dan `/login` dengan kesalahan per-field
- [x] `/studio` — koordinat, tombol ambil citra, kanvas dengan persegi yang dapat digeser/ubah ukuran/diputar
- [x] Persegi bawaan seukuran bidang atap rumah (12 × 8 m), dihitung dari **skala citra** bukan dari sebagian ukuran citra
- [x] Panel parameter: kemiringan, azimuth, setback, talang, preset modul, orientasi, jarak antar panel, jumlah panel, tagihan, golongan tarif
- [x] Azimuth dan kemiringan dinyatakan di antarmuka sebagai **masukan pengguna, bukan hasil deteksi**
- [x] Panel hasil: empat metrik utama, rincian CAPEX, tabel asumsi, dan reduksi CO₂
- [x] Perubahan parameter memicu hitung ulang setelah jeda singkat, dan respons yang basi dibuang
- [x] Tombol dinonaktifkan selama permintaan berjalan sehingga tidak ada pengiriman ganda
- [x] Kegagalan penyedia citra ditampilkan apa adanya dan tidak mengunci antarmuka
- [x] `/history` — kolom kapasitas, produksi, hemat bulanan, payback; payback kosong ditampilkan sebagai `—`; detail memuat asumsi dan rincian CAPEX yang tersimpan
- [x] Atribusi penyedia citra tampil di antarmuka

**Alur penuh di browser nyata sudah ditempuh:** isi koordinat → ambil citra → atur persegi → hasil muncul, dan angkanya berubah saat parameter diubah.

## 9. Gerbang mutu

- [x] `cd be && php artisan migrate:fresh --seed` — 10 migrasi berjalan bersih
- [x] `cd be && php artisan test` — **91 test, 475 assertion, semuanya lulus**
- [x] `cd be && ./vendor/bin/pint --test` — 0 temuan
- [x] `cd be && php artisan route:list --path=api` — 11 route, cocok persis dengan kontrak
- [x] `cd fe && npm run build` — 6 route ter-generate, tanpa `/analysis`
- [x] `cd fe && npx tsc --noEmit` — bersih
- [x] `cd fe && npm run lint` — bersih
- [x] `API CONTRACT.md` cocok dengan perilaku nyata; contoh pada kontrak berasal dari satu permintaan sungguhan dan dapat diverifikasi ulang dari aritmetikanya

## 10. ⚠️ Belum terverifikasi

- [ ] **Panggilan Mapbox sungguhan belum pernah dijalankan.** Penyedianya ada dan teruji dengan `Http::fake` (penyusunan URL, penyimpanan JPEG, pesan saat token kosong), tetapi belum pernah menyentuh layanan Mapbox yang sesungguhnya karena token belum diisi. Ini hal pertama yang harus dicoba.
- [ ] **Ketajaman citra satelit pada zoom kerja belum dinilai.** Persegi ditempatkan pengguna, jadi alur tidak bergantung pada ketajaman tepi, tetapi untuk mengusulkan batas atap otomatis nanti ini perlu diukur pada citra sungguhan.

## 11. Berjalan, tetapi masih baseline

Bagian ini **wajib masuk batasan laporan**.

- [ ] **Belum ada pemrosesan citra sama sekali.** Persegi bidang atap ditempatkan pengguna secara manual; batas atap belum diusulkan otomatis. Ini kontribusi yang direncanakan untuk tahap berikutnya, dan justru bagian yang paling relevan dengan mata kuliah Pemrosesan Citra dan Visual Komputer Cerdas.
- [ ] **Satu bidang atap per simulasi.** Bentuk limasan, L, dan atap jamak belum ada.
- [ ] **Kemiringan dan azimuth adalah masukan pengguna.** Bukan keterbatasan implementasi: dari satu citra nadir, arah kemiringan memang tidak dapat ditentukan. Ini harus dinyatakan di laporan, bukan disembunyikan.
- [ ] **Rintangan di atas atap belum terdeteksi** (HVAC, skylight, tandon); pengguna belum punya cara mengecualikannya selain mengurangi jumlah panel.
- [ ] **Model energi menyederhanakan radiasi.** Hanya komponen langsung dengan bobot kosinus zenith; difusi langit, awan, dan efek spektral tidak dimodelkan.
- [ ] **Angka biaya dan tarif masih asumsi** yang diwarisi dari prototipe pembanding, belum dicocokkan dengan penawaran pemasang maupun keputusan tarif PLN terbaru. Catatan dasarnya ada di `config/plts.php`.
- [ ] **Frontend belum punya runner test**; verifikasi bersandar pada build, pemeriksaan tipe, lint, dan penelusuran di browser.

## 12. Belum dikerjakan

- [ ] Usulan otomatis batas atap dari citra (OpenCV), masuk sebagai batas `CvClient`
- [ ] Deteksi rintangan di atas atap untuk mengecualikan slot
- [ ] Bidang atap jamak dan bentuk limasan serta L
- [ ] Peta panas iradiasi per piksel
- [ ] Pencarian berdasarkan alamat (geocoding) dan peta interaktif yang dapat digeser
- [ ] Ekspor proposal PDF, kurva arus kas 25 tahun, dan IRR
- [ ] Batas laju percobaan login dan pembersihan aset yatim
- [ ] Dockerisasi dan deployment VPS
- [ ] Bereskan sisa scaffolding: dua `ExampleTest` bawaan Laravel dan aset `fe/public/*.svg` bawaan `create-next-app`

## 13. Catatan pengungkapan

- **Perbandingan dengan prototipe teman.** Tiga rumusnya dikoreksi: iradiasinya konstanta `4.5` tanpa sumber (diganti NASA POWER), estimasi produksinya tidak menerapkan faktor rugi sistem (kini memakai performance ratio), dan faktor sudut datangnya memakai `cos(kemiringan)` sehingga mengabaikan posisi matahari (kini diintegrasikan per jam). Prototipe itu juga **tidak memiliki pemrosesan citra sama sekali**, dan klaim "deteksi azimuth & kemiringan otomatis" pada halaman depannya tidak didukung implementasinya dan tidak mungkin dari citra nadir.
- **Lisensi citra.** ToS Mapbox mengizinkan penggunaan non-produksi (pengembangan, evaluasi, pengujian, dan demonstrasi) dengan atribusi tetap tampil, dan mensyaratkan lisensi komersial untuk penggunaan produksi pada aplikasi yang berkaitan dengan real estate atau analytics. Penyimpanan citra dalam jangka panjang juga wilayah abu-abu. Untuk tugas akhir, ketentuannya terpenuhi selama atribusi tidak dihapus.
- **Tangkapan layar bukti** ada di `../bukti/` (di luar repositori agar tidak membengkakkan git). `03-studio-simulasi-plts.png` adalah produk saat ini; dua berkas berawalan `lama-` adalah produk poligon sebelumnya, disimpan sebagai jejak perubahan arah.
- **Verifikasi tampilan dilakukan lewat DOM**, bukan dengan melihat gambar: isi yang dilaporkan diambil dari elemen yang benar-benar dirender (atribut `src` citra, `viewBox` dan bentuk SVG, serta teks halaman), karena model vision tidak tersedia di sesi ini.
- **Tool browser bawaan gagal start**; penelusuran dilakukan dengan menjalankan Chrome sendiri melalui `--remote-debugging-port` lalu menempel lewat CDP.
