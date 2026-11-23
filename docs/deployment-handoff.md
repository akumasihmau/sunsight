# Panduan Deployment & Ringkasan Update — SunSight

Panduan singkat ini disiapkan untuk tim/rekan yang menangani deployment **SunSight** (Frontend Next.js + Backend Laravel + ML Service FastAPI ONNX) ke server produksi.

---

## 1. Perbandingan ML Versi Sebelumnya (Teman) vs ML Versi Baru (v3 Pro)

> **Inti penting untuk tim deploy:** Seluruh layanan ML versi baru sudah menyatu di folder `ml/service/` pada repo utama (`main`) dan bersifat **100% *drop-in replacement*** terhadap layanan ML lama. Tidak perlu menggabungkan kode ML lama dengan yang baru, dan tidak ada perubahan kode integrasi di Laravel (`MlClient.php`).

| Aspek | ML Versi Sebelumnya (`yolov8-seg` / Baseline) | ML Versi Baru (`ml/service/` — **v3 Pro**) |
| :--- | :--- | :--- |
| **Kontrak API HTTP** | `GET /health`, `GET /ready`, `POST /api/v1/predict` (`multipart/form-data`, header `X-Api-Key`) | **100% identik** — endpoint, payload, dan format JSON respons sama persis |
| **Model & Runtime** | `YOLOv8n-seg` (`src/roof_inference/weights/best.pt`, butuh PyTorch + Ultralytics) | **`YOLO11m-Seg v3 Pro`** (`ml/service/weights/best_v3.onnx`, 86 MB, **ONNX Runtime CPU-only** — tanpa PyTorch/GPU, image Docker jauh lebih ringan) |
| **Dataset & Akurasi Domain** | Dataset baseline awal (lebih rentan *false positive* jalan/parkiran dan bias warna genteng) | Dilatih ulang pada citra **Esri World Imagery Kota Bogor** (6 kecamatan) + *hard negatives* (jalan aspal, pohon, lapangan, sungai) + atap beton/gedung kompleks |
| **Preprocessing Citra** | Citra RGB langsung (tanpa CLAHE) | **Wajib `USE_CLAHE_LAB=true`** (normalisasi kontras LAB sesuai saat training; jika `false`, akurasi turun drastis) |
| **Post-Processing Poligon** | Kontur mentah dari mask (puluhan–ratusan titik *blobby*, bisa menyilang sendiri) | **Regularisasi Poligon Ortogonal (Area-Preserving)**: reduksi vertex **-92,2%** (`68,75 → 5,36` titik), galat luas turun (`25,77% → 25,50%`), *Road/Hard-Negative FPR* `14,29%` |
| **Ambang & Rasio Aspek** | `MODEL_CONFIDENCE=0.25`, `MODEL_DEVICE=cpu`; di BE `ML_MAX_ASPECT_RATIO=5.0` | `MODEL_CONFIDENCE=0.18`, `MODEL_IOU_THRESHOLD=0.40`, `MAX_ASPECT_RATIO=7.5`; di BE **`ML_MAX_ASPECT_RATIO=8.0`** agar atap gedung memanjang (ruko/kampus) tidak terpotong |
| **Performa CPU** | ~3–8 detik/gambar (cold start ~11–13 detik), konsumsi RAM PyTorch lebih tinggi | **~2,65 detik/gambar** di CPU (`MAX_CONCURRENT_INFERENCES=1`), image berbasis `python:3.12-slim` + `onnxruntime` |
| **Lokasi Kode & Keamanan** | Repo/service terpisah (`src/roof_inference/...`) | Menyatu di `ml/service/` (`Dockerfile` port `7860`), verifikasi `X-Api-Key` tahan *timing attack* (`hmac.compare_digest`), proteksi `MAX_IMAGE_PIXELS=20000000` |

**Langkah migrasi dari ML lama ke ML baru:**
1. Matikan/gantikan container ML lama (`yolov8-seg` / `.pt`) dengan container baru yang di-build dari `ml/service/Dockerfile`.
2. Pasang file bobot **`best_v3.onnx`** dari folder Google Drive ini ke `/app/weights/best_v3.onnx`.
3. Pastikan env ML memakai nilai v3 Pro (terutama `USE_CLAHE_LAB=true`) dan di Backend Laravel ubah `ML_MAX_ASPECT_RATIO=8.0` serta `ML_SERVICE_URL` + `ML_SERVICE_KEY` mengarah ke container ML baru.

---

## 2. Ringkasan Perubahan Terbaru Lainnya (Sudah di Branch `main`)

### A. ML Service (`ml/service/`)
- Upgrade penuh ke **YOLO11m-Seg v3 Pro** (`best_v3.onnx`, ONNX CPU) dengan preprocessing CLAHE LAB, regularisasi poligon ortogonal, `hmac.compare_digest` untuk `X-Api-Key`, dan batas piksel `MAX_IMAGE_PIXELS=20000000`.

### B. Backend (`be/`) — Kalibrasi Fisika Surya Bogor & Security Hardening
- **Kalibrasi klimatologi Kota Bogor** (NASA POWER & Global Solar Atlas 2001–2024): GHI `4,42 kWh/m²/hari` (pagi berawan `3,82`, sore `3,95`), orientasi optimal belahan bumi selatan **`0° Utara` dengan kemiringan `10°`**, perhitungan azimuth melingkar 360° sejati (`355° === 5°`).
- **Parameter opsional baru `shading_loss_pct`** (`0` / `10` / `20%`) di `POST /api/analyses` (backwards-compatible, **tidak butuh migrasi tabel baru**).
- **Security hardening**:
  - `be/config/cors.php` kini memakai allowlist ketat dari `CORS_ALLOWED_ORIGINS` / `FRONTEND_URL` (bukan wildcard `*`).
  - Masa berlaku token Sanctum default 7 hari (`10080` menit) + auto-revoke token lama saat reset/ganti password.
  - Rate limit (`throttle:5,1` untuk `/change-password`, `throttle:30,1` untuk `/roof-detections`, `/location`, `/captures`, `/simulate`).
  - Respons `POST /api/forgot-password` dibuat generik (anti email enumeration).

### C. Frontend (`fe/`) — Refactor Studio, Finansial & Metodologi
- **Paritas 1:1 fisika surya FE ↔ BE** diekstrak ke `fe/src/lib/studioPhysics.ts` dengan 7 unit test otomatis (`npm test`).
- **Studio UX**: kuas rintangan manual (`Kuas AC`, `Kuas Kaca`, `Kosongkan`), tombol **Cari Rekomendasi Optimal** (non-destruktif), grafik BEP dinamis (tanpa penurunan palsu tahun ke-12, skala X otomatis memanjang bila `BEP > 25` tahun), dan perbaikan urutan klik poligon deteksi kecil.
- **Halaman `/methodology`** diselaraskan dengan standar ISO/IEC & angka kode aktual.
- **Security headers** ditambahkan di `fe/next.config.ts` (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) + proteksi open redirect di `/login`.
- **Kualitas kode**: ESLint **0 errors**, `tsc --noEmit` **0 errors**, dan `next build --webpack` lulus 17/17 halaman.

---

## 3. File Bobot ML (Tidak Ada di GitHub)

File bobot **`best_v3.onnx` (~86 MB)** sengaja tidak dimasukkan ke repository Git. Unduh dari folder Google Drive yang dibagikan lalu letakkan di:
- **Deploy native / VM**: `ml/service/weights/best_v3.onnx`
- **Deploy Docker**: mount ke `/app/weights/best_v3.onnx` atau pass `--build-arg WEIGHTS_URL=<direct-download-url>` saat `docker build`.

---

## 4. Langkah Deploy & Environment Variables

### A. ML Service (`ml/service/` — FastAPI + ONNX CPU)
- **Spesifikasi minimum**: CPU-only, RAM **1,5–2 GB** (`MAX_CONCURRENT_INFERENCES=1`).
- **Build Docker** (perhatikan build context adalah folder `ml/`, bukan `ml/service/`):
  ```bash
  docker build -f ml/service/Dockerfile -t sunsight-ml ml/
  docker run -d --name sunsight-ml -p 7860:7860 \
    -v /path/ke/weights:/app/weights \
    --env-file ml/service/.env \
    sunsight-ml
  ```
- **Env wajib** (acuannya `ml/service/.env.example`, sudah disinkronkan ke v3 Pro):
  ```env
  MODEL_PATH=/app/weights/best_v3.onnx
  MODEL_NAME=yolo11m-seg-clahe
  MODEL_VERSION=v3-esri-bogor-pro
  MODEL_IMAGE_SIZE=1280
  MODEL_CONFIDENCE=0.18
  MODEL_IOU_THRESHOLD=0.40
  USE_CLAHE_LAB=true
  MIN_CONTOUR_AREA_PX=140.0
  MAX_ASPECT_RATIO=7.5
  RECTANGULARITY_SNAP_THRESHOLD=0.84
  ORTHOGONAL_MIN_RECTANGULARITY=0.58
  APPROX_EPSILON_RATIO=0.015
  API_V1_PREFIX=/api/v1
  API_KEY=<secret-panjang-sama-dengan-ML_SERVICE_KEY-di-BE>
  MAX_IMAGE_SIZE=10485760
  MAX_IMAGE_PIXELS=20000000
  MAX_CONCURRENT_INFERENCES=1
  LOG_LEVEL=INFO
  ```

### B. Backend (`be/` — Laravel 12 + PHP 8.2+)
- **Database wajib PostgreSQL 16 + PostGIS**:
  ```sql
  CREATE EXTENSION IF NOT EXISTS postgis;
  ```
- **Instalasi & migrasi**:
  ```bash
  cd be
  composer install --no-dev --optimize-autoloader
  php artisan key:generate
  php artisan migrate --force
  php artisan config:cache && php artisan route:cache
  ```
- **Env produksi penting** (acuannya `be/.env.example`):
  ```env
  APP_ENV=production
  APP_DEBUG=false
  APP_URL=https://<domain-backend>
  FRONTEND_URL=https://<domain-frontend>
  CORS_ALLOWED_ORIGINS=https://<domain-frontend>

  DB_CONNECTION=pgsql
  DB_HOST=<host-postgres>
  DB_PORT=5432
  DB_DATABASE=<nama-db>
  DB_USERNAME=<user-db>
  DB_PASSWORD=<password-db>

  ML_SERVICE_URL=https://<domain-ml-atau-internal-url>
  ML_SERVICE_KEY=<sama-persis-dengan-API_KEY-di-ML>
  ML_SERVICE_TIMEOUT=60
  ML_SIMPLIFY_TOLERANCE_PX=1.8
  ML_RECTANGULARITY_THRESHOLD=0.80
  ML_MAX_ASPECT_RATIO=8.0
  ML_MIN_AREA_SQM=6.0

  # Opsional — aktifkan jika login Google & reset password email dipakai:
  GOOGLE_CLIENT_ID=<client-id>
  GOOGLE_CLIENT_SECRET=<client-secret>
  GOOGLE_REDIRECT_URI=https://<domain-backend>/api/auth/google-callback
  MAIL_MAILER=smtp
  ```
- **Catatan Reverse Proxy (Nginx / Cloudflare / Caddy)**:
  - Set `proxy_read_timeout` ≥ **60s** untuk `/api/roof-detections` (cold start inferensi CPU pertama ~10–15 detik).
  - Set `client_max_body_size` ≥ **10M** (serta PHP `upload_max_filesize=12M`, `post_max_size=12M`) untuk unggah citra tangkapan peta.
  - Jika memakai Google OAuth, daftarkan `https://<domain-backend>/api/auth/google-callback` pada **Authorized redirect URIs** di Google Cloud Console.

### C. Frontend (`fe/` — Next.js 16 + Node 20/22+)
- **Env wajib**:
  ```env
  NEXT_PUBLIC_API_URL=https://<domain-backend>/api
  NEXT_PUBLIC_USE_MOCK=false
  ```
- **Build & jalankan**:
  ```bash
  cd fe
  npm ci
  npm run build
  npm run start
  ```
  *(Catatan: tidak ada secret yang perlu disimpan di Frontend; jika build di server Windows, gunakan `npx next build --webpack`.)*

---

## 5. Checklist Verifikasi Cepat Setelah Deploy

1. **ML Ready**: `curl https://<domain-ml>/ready` → HTTP `200`, pastikan `"model": "yolo11m-seg-clahe"` dan `"ready": true`.
2. **Backend & CORS**: `curl "https://<domain-backend>/api/geocode?q=Bogor"` → HTTP `200` mengembalikan daftar koordinat Kota Bogor.
3. **End-to-End Studio**:
   - Buka `https://<domain-frontend>/studio`, login, lalu klik **Pindai Atap AI**.
   - Pastikan `POST /api/roof-detections` mengembalikan HTTP `200` dengan poligon atap rapi (tanpa error CORS/504).
   - Klik **Terapkan** → pastikan panel surya & angka finansial muncul lalu coba **Simpan Simulasi** ke PostgreSQL.
