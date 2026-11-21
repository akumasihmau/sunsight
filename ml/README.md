# SunSight ML Pipeline (`ml/`)

Pipeline mandiri dan terotomatisasi untuk membangun model segmentasi atap **YOLO11s-Seg + Regularisasi Poligon Ortogonal** pada citra **Esri World Imagery Kota Bogor** sekaligus menghasilkan metrik evaluasi **Jurnal SINTA 4** dan layanan **FastAPI ONNX CPU-only** yang 100% kompatibel dengan backend Laravel ([MlClient.php](../be/app/Services/Ml/MlClient.php)).

---

## Struktur Folder

- `scripts/01_harvest_esri_bogor.py` — Unduh & *stitch* otomatis 300–400 tile Esri `zoom 19` (`768×768 px`, ~228 m) terstratifikasi di 6 kecamatan Kota Bogor + galeri QC HTML.
- `scripts/02_harvest_hard_negatives.py` — Unduh otomatis 70–100 tile *hard negative* (jalan tol/aspal, kanopi pohon, lapangan, sungai) yang diverifikasi 0 bangunan via Overpass OSM + otomatis membuat `.txt` kosong + galeri QC HTML.
- `scripts/03_prelabel_osm.py` — Membuat draft poligon YOLO-Seg awal dari OpenStreetMap sebagai *prompt* bersih untuk SAM 2.1.
- `notebooks/01_autolabel_sam2_colab.ipynb` — Notebook GPU Colab/Kaggle memakai **SAM 2.1** untuk menempelkan poligon pas ke piksel Esri (nol pergeseran, anti bias warna).
- `scripts/04_split_dataset.py` — Validasi sintaks & *stratified split* (`train 75% / val 15% / test 10%`) + `dataset.yaml`.
- `notebooks/02_train_yolo11s_seg_colab.ipynb` — Notebook GPU Colab/Kaggle untuk melatih **`yolo11s-seg.pt`** (`imgsz=1024/1280`, augmentasi HSV + rotasi nadir 180°, opsi eksperimen CLAHE LAB) dan ekspor ke **ONNX**.
- `scripts/05_evaluate_ablation.py` — Evaluator otomatis **Tabel 1 & Tabel 2 Jurnal SINTA 4** (`raw` vs `douglas_peucker` vs `orthogonal`, IoU, rata-rata vertex, `% Galat Luas m²`, galat jumlah panel/kWp, dan Road/HN FPR).
- `service/` — Layanan **FastAPI ONNX CPU-only** (`GET /health`, `GET /ready`, `POST /api/v1/predict`) + `Dockerfile` (siap AWS EC2 maupun Hugging Face Spaces port `7860`).

---

## Alur Eksekusi Langkah demi Langkah

### 0. Siapkan Virtual Environment Lokal (sekali saja)
```powershell
cd c:\laragon\www\sunsight
uv venv ml\.venv
ml\.venv\Scripts\activate
uv pip install -r ml\requirements-dataset.txt -r ml\requirements-service.txt
```

### 1. Auto-Harvest Tile Esri Kota Bogor (360 tile = 60 per kecamatan)
```powershell
python ml/scripts/01_harvest_esri_bogor.py --target 360
```
Buka `ml/data/raw_esri_bogor/qc_gallery.html` untuk cek sekilas.

### 2. Auto-Harvest *Hard Negative Images* (80 tile bebas bangunan)
```powershell
python ml/scripts/02_harvest_hard_negatives.py --target 80
```
**WAJIB:** Buka `ml/data/hard_negatives/qc_hard_negatives.html` (~1 menit). Jika ada gambar yang masih tampak atap rumah di pinggirnya, hapus pasangan `.jpg` dan `.txt`-nya agar tidak meracuni model.

### 3. Auto Pre-Label OSM → SAM 2.1 Refinement (Colab/Kaggle GPU)
```powershell
python ml/scripts/03_prelabel_osm.py
```
1. Kompres `ml/data/raw_esri_bogor` (folder `images/` dan `labels_osm_draft/`) menjadi `raw_esri_bogor.zip`.
2. Jalankan `ml/notebooks/01_autolabel_sam2_colab.ipynb` di Google Colab GPU T4 gratis.
3. Unduh `labels_sam2_refined.zip` & ekstrak ke `ml/data/raw_esri_bogor/labels_sam2_verified`.
4. *(Rekomendasi tinggi)* Upload ke Roboflow atau X-AnyLabeling untuk QC cepat, terutama **verifikasi 100% manual untuk ~40 tile yang akan jadi Test Set** jurnal.

### 4. Split Terstratifikasi & Training `YOLO11s-Seg` (Colab/Kaggle GPU)
```powershell
python ml/scripts/04_split_dataset.py
```
1. Kompres isi `ml/data/sunsight_yolo11_seg` menjadi `sunsight_yolo11_seg.zip`.
2. Jalankan `ml/notebooks/02_train_yolo11s_seg_colab.ipynb` di Colab/Kaggle GPU.
3. Unduh `best.onnx` lalu simpan ke `ml/service/weights/best.onnx`.

### 5. Generate Tabel Evaluasi Jurnal SINTA 4 Otomatis
```powershell
python ml/scripts/05_evaluate_ablation.py --model ml/service/weights/best.onnx
```
Hasil tabel otomatis muncul di `ml/outputs/ablation_report/ablation_test.md` & `.csv`.

### 6. Jalankan FastAPI ML Service & Sambungkan ke Laravel
```powershell
copy ml\service\.env.example ml\service\.env
uvicorn app.main:app --app-dir ml/service --host 127.0.0.1 --port 7860
```
Lalu di `be/.env`:
```env
ML_SERVICE_URL=http://127.0.0.1:7860
```
Verifikasi kesiapan:
- `GET http://127.0.0.1:7860/health` → `{"status":"ok"}`
- `GET http://127.0.0.1:7860/ready` → `{"status":"ready","model_loaded":true}`
