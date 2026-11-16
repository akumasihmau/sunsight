# Context & Panduan Handoff SunSight (Untuk Tim & Claude AI)

Dokumen ini menjadi panduan konteks bersama antara tim Frontend, Backend, dan AI assistant (*Claude Code / Antigravity*) agar pekerjaan lanjutan tetap selaras, tidak merusak fitur yang sudah jadi, dan mengikuti [API CONTRACT.md](./API%20CONTRACT.md) serta [commit-convention.md](./commit-convention.md).

---

## 1. Ringkasan Kondisi Terkini (`main`)

### A. Backend & Database (`be/`)
- **Stack**: Laravel API + PostgreSQL (`127.0.0.1:5433`, db `sunsight`) + Laravel Sanctum + Socialite Google OAuth.
- **Migrasi**: Pastikan seluruh migrasi sampai `2026_11_13_000001_add_onboarding_and_google_to_users` sudah dijalankan (`php artisan migrate`).
- **Tambahan Endpoint & Payload Terbaru**:
  - `GET /api/reverse-geocode?lat=&lng=` (`GeocodeController@reverse`, `NominatimGeocoder::reverse`, `throttle:30,1`, cached di `geocode_cache`).
  - `PATCH /api/analyses/{id}/name` (`SimulationController@rename`) untuk mengganti nama/alamat proyek di riwayat tanpa memicu hitung ulang geometri.
  - `SimulationSummaryResource` sekarang wajib menyertakan `monthly_bill_idr` dan `annual_saving_idr` di daftar `GET /api/analyses` agar Dashboard menampilkan persentase hemat tagihan & metrik finansial secara nyata.

### B. Frontend (`fe/`)
- **Bahasa Desain**: **Apple Human Interface Clarity + Frosted Glass (`backdrop-blur-2xl saturate-150`) + Soft Radiant Glow (`amber`/`yellow`) + Standar ISO/IEC** (dokumen proposal ISO 7200/8601, modul IEC 61215/61724, PUIL 2020).
- **Mode API**: `fe/.env.example` menggunakan `NEXT_PUBLIC_USE_MOCK=false`. Untuk integrasi penuh, `fe/.env.local` harus memakai `NEXT_PUBLIC_USE_MOCK=false` dan `NEXT_PUBLIC_API_URL=http://localhost:8000/api`. *(Mode mock di `fe/src/lib/mock.ts` juga sudah ditingkatkan memakai Nominatim live + katalog jalan lokal untuk fallback).*
- **Perbaikan & Fitur Utama yang Sudah Terpasang**:
  - **Landing Page**: Navbar fixed transparan saat `y = 0` tanpa garis batas hitam saat transisi menjadi pill; Hero sunlit meadow (`SolarMeadowScene`), live street autocomplete (`Hero.tsx`), serta miniatur Studio interaktif (`Geometri | Modul | Finansial`); CTA full-bleed *seamless*.
  - **Dashboard Beranda (`fe/src/app/page.tsx`)**: Pencarian popover mendukung proyek tersimpan **dan** live geocoding nama jalan (`api.geocode` -> langsung membuka `/studio?lat=...&lng=...&name=...`); kalkulasi tagihan, balik modal, dan karbon terhubung ke data proyek nyata; `BogorProjectsMap` menampilkan titik proyek bersih dengan *hover* widget potensi surya + auto-zoom level 18; `MascotDashboardTour` menata posisi Sunny proporsional di header kartu.
  - **Riwayat (`page.tsx` tab Riwayat & `history/page.tsx`)**: Kartu riwayat dilengkapi `ProjectPolygonMapPreview` (rendering satelit Web Mercator + poligon atap yang otomatis *fit bounds*).
  - **Studio CAD (`fe/src/app/studio/page.tsx`)**:
    - `Pen Tool` bergaya garis putus-putus biru ala `Penggaris` tanpa pil gelap pada label sisi dan gap bersih antara angka dengan `m`.
    - `Penggaris` memakai satu pil hasil ringkas di bawah-tengah (`Luas Terukur · Keliling · Jumlah Sisi`), tanpa kartu di tengah poligon atau pil duplikat di dekat simpul, dan simpul tidak bisa digeser.
    - Label panjang sisi poligon jadi ditempatkan di lapisan teratas (`z-30`) dan digeser keluar bidang berdasarkan *outward normal* sehingga tidak tertutup panel surya.
    - Pengguna diperbolehkan menghapus seluruh poligon hingga tersisa `0` bidang (`deleteFacet` & tombol `×` selalu muncul meski hanya 1 bidang).
    - Sinkronisasi `searchParams` & URL `?mode=gps` dikunci dengan `ref` agar hanya berjalan sekali per URL dan tidak menimpa koordinat poligon manual yang digambar pengguna.
  - **Proposal PDF (`ProposalModal.tsx` + `globals.css`)**: Render memakai React Portal ke `#proposal-print-portal` dengan aturan `@media print` agar cetak PDF hanya mencetak dokumen proposal (tidak ikut mencetak Dashboard).

---

## 2. Hal yang HARUS Dilakukan Tim / AI Rekan (Next Steps)

1. **Sinkronisasi Lingkungan Lokal**:
   - Jalankan `git pull origin main`.
   - Di `be/`: jalankan `composer install` (bila perlu) dan `php artisan migrate`, lalu jalankan server `php artisan serve --port=8000`.
   - Di `fe/`: jalankan `npm install` (ada dependensi `leaflet`, `@types/leaflet`, dan `material-symbols`), pastikan `.env.local` berisi `NEXT_PUBLIC_USE_MOCK=false` dan `NEXT_PUBLIC_API_URL=http://localhost:8000/api`.
2. **Hardening Keamanan Auth Backend (Rekomendasi Prioritas)**:
   - Tambahkan *rate limiting* (`throttle:5,1` atau sesuai kebijakan) pada rute publik `POST /login`, `POST /forgot-password`, dan `POST /reset-password` di `be/routes/api.php` untuk mencegah *brute-force*.
   - Tinjau `'expiration'` pada `be/config/sanctum.php` (saat ini `null`) serta pastikan `APP_DEBUG=false` saat rilis produksi.
3. **Verifikasi Backend & ML Service**:
   - Jalankan `php artisan test` di environment yang bisa mengakses PostgreSQL (`127.0.0.1:5433`) untuk memverifikasi seluruh test suite backend.
   - Uji alur end-to-end dengan layanan deteksi AI (`POST /api/roof-detections`) dan Google OAuth callback dengan `USE_MOCK=false`.

---

## 3. Aturan Ketat — JANGAN DIUBAH / JANGAN DIRUSAK

Mohon **tidak menghapus atau mengembalikan perilaku lama** pada bagian-bagian berikut kecuali ada keputusan eksplisit dari tim:

1. **Kontrak Angka Server (`API CONTRACT.md`)**:
   - `/simulate` dan `/analyses` wajib selalu menghitung ulang semua metrik teknis & finansial di server; jangan percaya angka kiriman klien.
   - Pertahankan field `monthly_bill_idr` dan `annual_saving_idr` di `SimulationSummaryResource`, serta endpoint `GET /reverse-geocode` dan `PATCH /analyses/{id}/name`.
2. **Isolasi Cetak Proposal (`fe/src/components/studio/ProposalModal.tsx` & `fe/src/app/globals.css`)**:
   - Jangan ubah mekanisme React Portal (`#proposal-print-portal`) atau hapus aturan `@media print`; perubahan di sini akan memunculkan kembali bug Beranda/Dashboard ikut tercetak.
3. **Kunci Efek URL & GPS di Studio (`fe/src/app/studio/page.tsx`)**:
   - Jangan menambahkan `updateActiveFacet` (atau callback yang bergantung pada `activeFacetId`) ke dependency `useEffect([searchParams])`, dan jangan menghapus penjaga `lastAppliedParamsKeyRef` / `lastAppliedWindowSearchRef`. Jika dilanggar, poligon manual yang digambar setelah pencarian GPS/alamat akan terpental dan menumpuk kembali ke titik tengah GPS.
4. **Hapus Poligon Terakhir & Label Dimensi Studio (`fe/src/app/studio/page.tsx`)**:
   - Jangan batasi `deleteFacet` atau tombol `×` dengan `facets.length > 1`; pengguna harus bisa menghapus poligon tunggal.
   - Pertahankan posisi label panjang sisi poligon di `z-30` (di atas grid modul `z-20`) dengan *outward normal offset* dan spasi `<tspan dx="2.5">` sebelum satuan `m`.
5. **Indikator Skala & Mode Penggaris (`fe/src/lib/roofCapture.ts`, `fe/src/app/studio/page.tsx`)**:
   - Pertahankan ambang `RECOMMENDED_MIN_FOOTPRINT_M = 120` dan `RECOMMENDED_MAX_FOOTPRINT_M = 340` serta label status bahasa Inggris (`Too close` / `Optimal` / `Too far`).
   - Di mode Penggaris, biarkan simpul terkunci (tidak bisa digeser) dan pertahankan satu pil hasil bawah-tengah tanpa kartu tengah atau pil kedua di dekat simpul.
6. **Build Frontend di Windows**:
   - Gunakan `npx next build --webpack` di `fe/` (Turbopack mengalami *panic* PostCSS worker pada environment Windows ini).
7. **Konvensi Commit**:
   - Semua commit wajib mengikuti [commit-convention.md](./commit-convention.md) (`feat(fe): ...`, `feat(be): ...`, `fix(fe): ...`, `docs(root): ...`).

---

## 4. Konteks Upgrade ML Deteksi Atap & Riset SINTA 4 (Untuk Tim ML & AI)

Detail kontrak layanan model tetap mengacu pada [docs/ml-service-design.md](./docs/ml-service-design.md) dan tidak boleh memutus integrasi Laravel ([MlClient.php](./be/app/Services/Ml/MlClient.php) & [RoofDetectionController.php](./be/app/Http/Controllers/RoofDetectionController.php)).

### A. Konteks Penelitian & Aplikasi
- **Lingkup Aplikasi & Paper:** Project-Based Learning *Pemrosesan Citra & Visi Komputer Cerdas* (target artikel **Jurnal SINTA 4**) dengan batasan studi kasus **Kota Bogor** (6 kecamatan: Bogor Tengah, Bogor Timur, Bogor Utara, Bogor Selatan, Bogor Barat, Tanah Sareal) menggunakan peta satelit **Esri World Imagery** (`zoom 19`, cakupan viewport Studio `150–230 m`).
- **Arah Judul Jurnal:** ~12–13 kata menggabungkan `SunSight`, metode/model (`YOLO11-Seg` + `Regularisasi Poligon` / `CLAHE`), dan batasan `Kota Bogor`, contoh:
  `SunSight: Deteksi Atap Citra Satelit Menggunakan YOLO11-Seg dan Regularisasi Poligon di Kota Bogor`

### B. Akar Masalah Model Saat Ini (Harus Diperbaiki)
Bobot lama (`yolov8n-seg` di `YOLO_Sunsight.ipynb`, ±200 foto Google Maps) memiliki 3 bug nyata ketika dijalankan di peta **Esri World Imagery** SunSight:
1. **Color & Domain Bias:** Overfit ke warna genteng tanah liat oranye/merah dari Google Maps; atap spandek biru/hijau, beton gelap, dan asbes abu-abu sering terlewat.
2. **False Positive Jalan Raya:** Jalan aspal/paving kemerahan sering ikut terdeteksi sebagai kelas `roof`.
3. **Poligon Blobby:** Mask segmentasi mentah membentuk kontur organik membulat, sementara backend [RoofDetectionController.php](./be/app/Http/Controllers/RoofDetectionController.php#L38) hanya menyederhanakan `0.5 px` (*Douglas-Peucker*), sehingga poligon tidak berbentuk siku persegi/limas/L-shape yang layak untuk *geometric module packing*.

### C. Spesifikasi Teknis Upgrade ML (Tanpa Mengubah Kontrak Laravel/FE)

#### 1. Kontrak API yang HARUS Dipertahankan
- FastAPI ML Service wajib tetap menyediakan:
  - `GET /health` -> `{"status": "ok"}`
  - `GET /ready` -> `{"status": "ready", "model_loaded": true}` (atau `503` saat loading)
  - `POST /api/v1/predict` (`file` JPEG/PNG/WebP via `multipart/form-data`, `min_confidence` via **query parameter**, header opsional `X-Api-Key`).
- Format output `detections[]` tetap wajib sama: `{id, class_id, class_name, confidence, bbox: {x1,y1,x2,y2}, polygon: [[x,y], ...], area_px}` dalam **piksel citra penuh** yang dikirim Laravel (`MODEL_IMAGE_SIZE=1280`).
- **DILARANG** mengubah logika konversi meter persegi, geo-mapping, maupun kalkulasi energi/finansial ke layanan ML — seluruh angka final tetap dihitung Laravel sesuai [API CONTRACT.md](./API%20CONTRACT.md).

#### 2. Kurasi Dataset & Augmentasi (Roboflow -> Kaggle/Colab GPU)
- Tambah **250–350 tangkapan *tile* langsung dari Esri World Imagery Kota Bogor** (`zoom 19`, cakupan 150–230 m) mewakili seluruh jenis penutup atap (genteng merah/cokelat, genteng beton abu/hitam, spandek biru/hijau/merah, asbes, dak beton).
- **Wajib sertakan 15–20% *Hard Negative Images*:** gambar jalan aspal, paving blok, area parkir, lapangan, sungai, dan kanopi pohon **tanpa anotasi poligon** (label kosong) agar model menekan *false positive* jalan.
- Gunakan pembagian dataset terstratifikasi (`train ~75–80%`, `val ~15%`, `test ~10%`) di Roboflow dan ekspor format segmentasi YOLO.

#### 3. Konfigurasi Training & Eksperimen Benchmark (`YOLO11-Seg`)
- Lanjutkan notebook training di **Kaggle / Google Colab GPU**:
  - Upgrade base model ke **`yolo11s-seg.pt`** (rekomendasi utama untuk akurasi tepi di citra Esri) dan simpan juga hasil **`yolo11n-seg.pt`** serta baseline **`yolov8n-seg.pt`** untuk tabel komparasi jurnal.
  - Parameter training yang direkomendasikan (`ultralytics`):
    - `imgsz=1024` atau `1280` (jangan `640` karena deteksi drop ke 0 pada tangkapan 180–230 m).
    - Augmentasi anti-bias warna & orientasi nadir: `hsv_h=0.04, hsv_s=0.7, hsv_v=0.5, degrees=180.0, flipud=0.5, fliplr=0.5, mosaic=1.0, close_mosaic=15`.
    - Opsional (sangat baik untuk sudut pandang pemrosesan citra di jurnal): uji perbandingan **Raw RGB** vs **CLAHE (luminance normalization di ruang LAB)** saat pra-pemrosesan sebelum inferensi/training.

#### 4. Post-Processing "Anti-Blobby" & Filter Anti-Jalan (Di FastAPI `/api/v1/predict`)
Terapkan langsung di pipeline inferensi FastAPI pada setiap kontur mask sebelum dikonversi ke JSON `detections[]`:
1. **Pembersihan Mask Morfologis:** `cv2.morphologyEx` (`MORPH_CLOSE` lalu `MORPH_OPEN`, kernel `3x3`) untuk menutup lubang kecil & merapikan tepi bergerigi.
2. **Filter Geometri Anti-Jalan & Noise:**
   - Hitung `rect = cv2.minAreaRect(contour)` -> `(w, h)`. Tolak kandidat bila `min(w, h) <= 0`, luas `< 200` piksel², atau *aspect ratio* `max(w, h) / min(w, h) > 4.5` (membuang ruas jalan memanjang).
3. **Regularisasi Poligon (*Blobby -> Architectural*):**
   - Hitung `rectangularity = contour_area / (w * h)`.
   - Jika `rectangularity >= 0.80` (atap pelana/persegi/limas) -> langsung *snap* memakai **`cv2.boxPoints(rect)`** menjadi **4 titik sudut `90°` yang tegas dan rapi**.
   - Jika `0.55 <= rectangularity < 0.80` (atap bentuk L/T/kompleks) -> jalankan `cv2.approxPolyDP(contour, epsilon = 0.015 * perimeter, closed=True)` lalu lanjutkan *orthogonal edge snapping* terhadap sudut orientasi utama (`rect[2]`) sehingga segmen tepi sejajar `0°/90°`.
4. **Sinkronkan Field Output:** Hitung ulang `area_px` (Shoelace) dan `bbox` (`min/max x, y`) dari poligon yang sudah diregularisasi agar konsisten saat diterima Laravel.

#### 5. Data Wajib untuk Evaluasi Jurnal SINTA 4 (Simpan Output CSV/Gambar!)
Pastikan AI/notebook menyimpan hasil kuantitatif berikut untuk Bab 3 artikel jurnal:
- **Tabel 1 (Benchmark Model & Lintas Sumber):** `Precision`, `Recall`, `mAP@50`, `mAP@50-95 (mask)`, *False Positive Rate* pada jalan raya, serta latensi CPU per gambar (`yolov8n-seg` baseline vs `yolo11n-seg` vs `yolo11s-seg`, Raw vs Esri+Augmentasi/CLAHE).
- **Tabel 2 (Uji Ablasi Regularisasi Poligon):** Perbandingan Raw Mask vs *Douglas-Peucker* vs **Regularisasi Ortogonal** pada metric `IoU`, jumlah rata-rata *vertex*, **`% Galat Luas (m²)`** vs *ground truth* ukur manual, dan dampaknya pada **akurasi jumlah panel surya (`N_modul`)**.
- **Tabel 3 (Validasi Sampel Kota Bogor):** Uji pada 6 sampel bangunan lintas kecamatan di Kota Bogor.

#### 6. Ekspor ONNX & Serving FastAPI
- Ekspor bobot terbaik ke **ONNX** (`model.export(format="onnx", imgsz=1280, simplify=True)`) dan jalankan di FastAPI dengan **`onnxruntime` CPU-only** (hindari PyTorch CUDA multi-GB di container produksi).
- Tetap kompatibel untuk deploy ke server AWS EC2 yang sudah ada **atau** alternatif gratis **Hugging Face Spaces (Docker Space, `port 7860`, 2 vCPU, 16 GB RAM)**. Backend Laravel cukup diarahkan lewat env `ML_SERVICE_URL`.
