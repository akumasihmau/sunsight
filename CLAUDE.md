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

Detail kontrak layanan model tetap mengacu pada [docs/ml-service-design.md](./docs/ml-service-design.md) dan tidak boleh memutus integrasi Laravel ([MlClient.php](./be/app/Services/Ml/MlClient.php)).

### A. Akar Masalah Model Saat Ini
Bobot lama (`yolov8n-seg` pada `YOLO_Sunsight.ipynb`, ±200 foto Google Maps) mengalami 3 kendala saat dipakai langsung di peta **Esri World Imagery** SunSight:
1. **Color & Domain Bias:** Lebih sensitif genteng oranye/merah; atap spandek/beton/asbes abu-abu sering terlewat.
2. **False Positive Jalan Raya:** Jalan aspal/paving kemerahan kadang ikut terdeteksi sebagai `roof`.
3. **Poligon Blobby:** Mask segmentasi mentah membentuk lekukan organik dan `RoofDetectionController` hanya menyederhanakan `0.5 px`, sehingga bentuk atap tidak tegas kotak/limas/L-shape.

### B. Rencana Perbaikan Tanpa Mengubah Pipeline & Kontrak API
1. **Kontrak API Tetap Sama (Wajib):**
   - Pertahankan endpoint `GET /health`, `GET /ready`, dan `POST /api/v1/predict` (`file` multipart + query `min_confidence`), `MODEL_IMAGE_SIZE=1280`, serta format respons JSON (`detections[].{id, class_id, class_name, confidence, bbox, polygon, area_px}`).
2. **Kurasi Dataset Esri Kota Bogor + *Hard Negatives*:**
   - Tambah ±250–300 tangkapan *tile* **Esri World Imagery wilayah Kota Bogor** (`zoom 19`, cakupan 150–230 m) mencakup semua warna/material atap (genteng tanah liat, beton gelap, spandek biru/hijau/merah, asbes, dak beton).
   - Wajib tambahkan **15–20% *Hard Negative Images*** (jalan aspal, paving blok, lapangan parkir, kanopi pohon tanpa label `roof`).
3. **Training & Benchmark untuk Artikel SINTA 4 (Kaggle / Colab GPU):**
   - Lanjutkan notebook training di **Kaggle / Google Colab GPU** dengan dataset Roboflow yang diperbarui.
   - Upgrade base model ke **`yolo11s-seg`** (atau `yolo11n-seg`) dengan `imgsz=1024/1280` dan augmentasi warna-invarian agresif (`hsv_h=0.04, hsv_s=0.7, hsv_v=0.5`, rotasi penuh `degrees=180`, `flipud=0.5`, `fliplr=0.5`, plus uji *CLAHE* / normalisasi pencahayaan).
   - Catat metrik evaluasi (`Precision`, `Recall`, `mAP@50`, `mAP@50-95`, `IoU`, waktu inferensi CPU) dibanding *baseline* `yolov8n-seg` untuk Bab 3 artikel SINTA 4.
4. **Post-Processing "Anti-Blobby" di `/api/v1/predict`:**
   - Sebelum mengembalikan `polygon`, terapkan pembersihan morfologis (`open/close`), penyederhanaan Douglas-Peucker adaptif (`~2.0–3.5 px`), dan **Regularisasi Poligon Ortogonal** (`cv2.minAreaRect` bila *rectangularity* ≥ 0.80, atau *orthogonal edge snapping* untuk atap L/kompleks), serta filter *aspect ratio* ekstrem (`> 4.5`) untuk menyaring *false positive* jalan raya.
5. **Ekspor ONNX & Serving FastAPI:**
   - Ekspor model terbaik ke **ONNX** (`onnxruntime` CPU-only) agar ringan tanpa `torch` multi-GB — bisa tetap dideploy di server AWS/EC2 yang sudah ada (`docs/ml-service-design.md`) **atau** alternatif gratis di **Hugging Face Spaces (Docker, port 7860, 2 vCPU, 16 GB RAM)**. Backend Laravel tinggal diarahkan lewat `ML_SERVICE_URL`.
