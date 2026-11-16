# ML Service — Kontrak dan Operasi

Dokumen ini menjelaskan layanan segmentasi atap **sebagaimana dibangun**: satu berkas bobot
YOLOv8-seg dibungkus FastAPI, dipanggil backend Laravel lewat HTTP. Yang direncanakan tetapi
**belum** ada ditulis terpisah di bagian akhir supaya tidak terbaca sebagai fitur yang tersedia.

Kontrak yang mengikat antara antarmuka dan backend ada di `API CONTRACT.md`; dokumen ini
melengkapinya dari sisi layanan model.

## 1. Prinsip

1. **Input**: berkas citra + ROI opsional, dikirim oleh backend Laravel (bukan oleh peramban).
2. **Output**: poligon dalam **piksel citra yang dikirim**, beserta confidence dan luas piksel.
3. **Layanan model tidak menghitung meter.** Ia tidak tahu skala citra. Luas meter persegi,
   penyederhanaan poligon, dan keputusan mana yang disimpan adalah urusan backend.
4. **Tidak pernah menerima URL citra.** Hanya berkas yang diunggah, supaya layanan ini tidak
   dapat dipakai sebagai perantara SSRF.
5. Satu inferensi berjalan pada satu waktu (CPU-only); permintaan lain menunggu, tidak gagal.

## 2. Endpoint

| Method | Path | Keterangan |
| :---- | :---- | :---- |
| `GET` | `/health` | Proses hidup. `{"status":"ok"}` |
| `GET` | `/ready` | Bobot termuat. `{"status":"ready","model_loaded":true}`, `503` bila belum |
| `POST` | `/api/v1/predict` | Inferensi segmentasi |

Prefiks `/api/v1` berasal dari konfigurasi `API_V1_PREFIX`.

## 3. `POST /api/v1/predict`

`Content-Type: multipart/form-data`.

### Parameter

| Nama | Letak | Tipe | Wajib | Bawaan | Keterangan |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `file` | body (berkas) | JPEG/PNG/WebP | ya | — | Maksimum 10 MB (batas byte) |
| `roi_x1` | query | int ≥ 0 | tidak | `0` | Kiri atas ROI, piksel citra |
| `roi_y1` | query | int ≥ 0 | tidak | `0` | |
| `roi_x2` | query | int | tidak | lebar citra | Kanan bawah ROI |
| `roi_y2` | query | int | tidak | tinggi citra | |
| `min_confidence` | query | float 0..1 | tidak | `0.25` | Deteksi di bawah ambang dibuang |
| `model_version` | query | string | tidak | `"latest"` | Diminta klien; **belum dipakai untuk memilih bobot** — layanan memuat satu berkas |

`roi_*` adalah **query parameter**, bukan bagian dari multipart. Bila seluruh ROI sama dengan
ukuran citra, penyaringan ROI dilewati sama sekali.

### Penyaringan ROI

Deteksi dibuang bila **titik tengah bbox**-nya berada di luar ROI. Aturannya sengaja kasar:
tujuannya menyaring deteksi yang jelas di luar area pilihan, bukan memutuskan kepemilikan
poligon terhadap sebuah bidang. Pencocokan halus dilakukan backend.

### Respons sukses

```json
{
  "success": true,
  "request_id": "req_184856c26e27",
  "data": {
    "image": { "width": 768, "height": 768 },
    "total_detections": 2,
    "detections": [
      {
        "id": "det_a1b2c3d4",
        "class_id": 0,
        "class_name": "roof",
        "confidence": 0.94,
        "bbox": { "x1": 120.5, "y1": 200.2, "x2": 460.1, "y2": 500.2 },
        "polygon": [[120.5, 200.2], [450.3, 210.5], [460.1, 500.2], [130.2, 490.1]],
        "area_px": 15234.5
      }
    ]
  },
  "error": null,
  "meta": {
    "model": "yolov8-seg",
    "model_version": "sha-4f3c2a1",
    "inference_time_ms": 125.4
  }
}
```

- Koordinat selalu dalam piksel **citra penuh yang dikirim**, bukan koordinat ROI atau citra
  internal model. Bila ROI diberikan, offset tidak ditambahkan karena inferensi memang berjalan
  pada citra penuh.
- `area_px` dihitung dengan rumus shoelace di dalam layanan, tetapi **bukan** angka yang dipakai
  produk: backend menghitung ulang luas meter persegi dari poligon yang sudah dirapikan.
- `polygon` boleh memiliki ratusan titik. Backend menyederhanakannya sebelum disimpan.
- `polygon` dapat menyilang dirinya sendiri untuk bentuk mask yang rumit; backend yang
  merapikannya sebelum menyimpan sebagai geometri.

### Respons gagal

| HTTP | Kapan | Bentuk |
| :---- | :---- | :---- |
| `400` | Berkas kosong, format tidak didukung, citra rusak, resolusi > 20 MP, ROI tidak valid (`roi_x1 >= roi_x2` atau `roi_y1 >= roi_y2`) | `{"detail": "..."}` |
| `413` | Berkas melebihi 10 MB | `{"detail": "Image exceeds maximum allowed size"}` |
| `200` dengan `success: false` | Kegagalan tak terduga saat inferensi (mis. bobot hilang) | `{"success": false, "request_id": "...", "error": "Internal inference error"}` |

Perhatikan: kegagalan tak terduga dikembalikan sebagai **HTTP 200 dengan `success: false`**, bukan
`500`. Backend memperlakukan `success: false` sama dengan layanan yang tidak dapat dipercaya dan
membalas `503` ke kliennya.

## 4. Batas dan Konfigurasi

Seluruh nilai punya bawaan di `src/roof_inference/core/config.py` dan dapat ditimpa lewat env.

| Env | Bawaan | Keterangan |
| :---- | :---- | :---- |
| `MODEL_PATH` | `src/roof_inference/weights/best.pt` | Bobot, diunduh saat build |
| `MODEL_DEVICE` | `cpu` | Target inferensi |
| `MODEL_IMAGE_SIZE` | `1280` | Sisi masukan model |
| `MODEL_CONFIDENCE` | `0.25` | Ambang confidence internal |
| `MODEL_VERSION` | `latest` | Versi bobot yang dilaporkan di `meta` |
| `MAX_IMAGE_SIZE` | `10485760` | Batas byte berkas |
| `MAX_IMAGE_PIXELS` | `20000000` | Batas resolusi |
| `MAX_CONCURRENT_INFERENCES` | `1` | Semaphore; permintaan lain menunggu |
| `API_V1_PREFIX` | `/api/v1` | Prefiks router |
| `LOG_LEVEL` | `INFO` | |

`MODEL_VERSION` diisi nilai tag image oleh CI, sehingga setiap hasil deteksi dapat ditelusuri ke
satu rilis bobot tertentu.

### Kenapa 1280, bukan 640

Bobot dilatih pada `imgsz=1024` (lihat `YOLO_Sunsight.ipynb`: `yolov8n-seg`, satu kelas `roof`).
Diukur pada citra ubin satelit zoom 19 di Bogor:

| `MODEL_IMAGE_SIZE` | Deteksi pada tangkapan 768 px |
| :---- | :---- |
| `640` | **0** |
| `1024` | 2 |
| `1280` | 8-13, confidence 0,66-0,79 |

Pada `640` model tidak menemukan satu bidang pun. Karena itu bawaannya `1280`.

### Cakupan tangkapan menentukan hasil, bukan jumlah pikselnya

Cakupan geografis yang sama digambar pada 512, 1024, dan 2048 px menghasilkan jumlah deteksi yang
sama. Yang berpengaruh adalah berapa meter yang masuk ke dalam tangkapan:

| Cakupan | Deteksi | Confidence tertinggi |
| :---- | :---- | :---- |
| 76 m | 1 | 0,29 |
| 104 m | 3 | 0,58 |
| 152 m | 8 | 0,79 |
| 228 m | 9 | 0,77 |
| 304 m | 13 | 0,66 |

Antarmuka karena itu menargetkan cakupan 180-230 m untuk setiap pemindaian.

## 5. Integrasi dengan Laravel

Laravel mengirim berkas yang sama yang ditampilkan antarmuka, tanpa URL perantara:

```php
$response = Http::timeout(config('services.ml.timeout'))
    ->attach('file', $asset->absolutePath(), 'capture.jpg')
    ->post(config('services.ml.url').'/api/v1/predict', [
        'min_confidence' => 0.25,
    ]);
```

- `config('services.ml.timeout')` bawaannya **60 detik**, bukan 15: permintaan pertama setelah
  layanan hidup memerlukan 11-13 detik untuk memanaskan model, dan mesin CPU-only yang lebih
  lambat dapat dua kali lebih lama.
- ROI tidak dikirim karena backend selalu menganalisis seluruh tangkapan.
- Yang dikerjakan backend setelah menerima respons: menyederhanakan poligon (Douglas-Peucker,
  toleransi 0,5 px), merapikan ring yang menyilang dirinya sendiri, menghitung luas meter persegi
  dengan `meters_per_pixel` milik aset, dan mengubah koordinat ke geografis.

## 6. Operasi

- **Image**: dibangun dari `dockerfile` (`python:3.12-slim`). Bobot **tidak** masuk git; diunduh
  saat build dari GitHub Releases (`ARG WEIGHTS_URL`) dan diverifikasi tidak kosong.
- **Kesehatan**: `HEALTHCHECK` menembak `/ready`; `docker-compose.yml` menunggu `start_period`
  90 detik karena pemuatan model memakan waktu.
- **Deploy**: GitHub Actions membangun, mendorong ke ECR, lalu menjalankan `docker compose pull`
  dan `up -d` di EC2 lewat SSM Run Command (tanpa SSH, tanpa kunci statis — OIDC).
- **Torch**: dibatasi ke index `pytorch-cpu`, kalau tidak build menarik paket CUDA multi-gigabyte.

## 7. Yang belum ada

Ditulis di sini supaya tidak dianggap tersedia: `/predict/batch`, `/predict/async`, `/v1/models`,
caching hasil per-hash citra, auto-scaling, dan pemilihan bobot per versi. Layanan saat ini
memuat tepat satu berkas bobot dan melayani permintaan secara sinkron, satu per satu.

## 8. Rencana Upgrade Model, Regularisasi Poligon, & Hosting Gratis

Untuk mengatasi *domain shift* Google Maps → Esri World Imagery (bias atap merah/oranye, salah deteksi jalan raya, dan kontur *blobby*) sekaligus mendukung riset jurnal SINTA 4 tanpa mengubah kontrak `POST /api/v1/predict`:

1. **Dataset & Training (`YOLO11s-Seg` / `YOLO11n-Seg`)**: tambah ±250–300 *tile* Esri Kota Bogor (`zoom 19`, cakupan 150–230 m) dengan material atap heterogen + 15–20% *hard negatives* jalan/kanopi pohon tanpa anotasi, plus augmentasi HSV tinggi (`hsv_h`, `hsv_s`, `hsv_v`) dan rotasi penuh di notebook Kaggle/Colab GPU.
2. **Post-Processing Anti-Blobby di `/api/v1/predict`**: tambahkan pembersihan mask morfologis, penyederhanaan Douglas-Peucker adaptif (`2.0–3.5 px`), *rectangularity / orthogonal edge snapping* (`minAreaRect` bila rectangularity ≥ 0.80), dan filter *aspect ratio* ekstrem untuk membuang kontur jalan.
3. **Serving Ringan (`ONNX` — AWS EC2 atau Alternatif Gratis)**: ekspor bobot ke **ONNX (`onnxruntime` CPU-only)** agar image container ~400–500 MB dan cepat di CPU, lalu jalankan di EC2 yang sudah ada atau alternatif gratis **Hugging Face Spaces (Docker `port 7860`, 2 vCPU, 16 GB RAM)**. Detail handoff lengkap tersedia di [CLAUDE.md](../CLAUDE.md).
