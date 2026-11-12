/**
 * Tangkapan peta untuk deteksi bidang atap.
 *
 * Server tidak menyimpan berkas citra, hanya georeferensi (`bbox`, `width`,
 * `height`, `zoom`), jadi tangkapan harus dibuat di peramban dari ubin yang
 * sudah tampil di peta. Hanya ubin satelit yang digambar ke kanvas kosong,
 * sehingga label jalan, batas administratif, atribusi, poligon CAD, dan seluruh
 * elemen antarmuka tidak pernah ikut ke dalam berkas.
 *
 * Ubin harus dimuat dengan `crossOrigin: true` (lihat `L.tileLayer` di Studio).
 * Tanpa itu kanvas menjadi *tainted* dan ekspor JPEG gagal; Esri World Imagery
 * mengirim `Access-Control-Allow-Origin: *` sehingga ekspor aman selama opsi
 * tersebut dipasang.
 *
 * Dua hal yang membuat hasil model bisa diandalkan:
 *
 * - **Cakupan geografis** 180–230 m adalah rentang terbaik; di bawah ~100 m
 *   model hampir tidak menemukan apa pun dan di atas ~300 m confidence turun.
 *   Cakupan diukur dari jarak nyata di layar, bukan dari tingkat zoom, supaya
 *   benar di lintang, DPR, dan ukuran jendela mana pun.
 * - **Ubin asli.** Ubin z20/z21 Esri di wilayah Indonesia kosong (abu-abu tanpa
 *   data), jadi zoom tidak pernah dinaikkan melewati zoom ubin native tempat
 *   layer satelit Studio dipasang (`maxNativeZoom: 19`).
 *
 * Skala kanvas sendiri tidak berpengaruh pada hasil model, jadi persegi
 * tangkapan digambar 1:1 pada 512–768 piksel CSS tanpa resize sebelum unggah.
 */

import type { BoundingBox } from "./api";

/** Tangkapan yang siap dikirim ke `POST /roof-detections`. */
export type CapturedMap = {
  blob: Blob;
  width: number;
  height: number;
  /** Urutan selalu `[minLng, minLat, maxLng, maxLat]`. */
  bbox: BoundingBox;
  /** Zoom yang benar-benar dipakai saat menggambar. */
  zoom: number;
};

export type CaptureMapOptions = {
  /** Layer ubin satelit yang digambar; layer label dan batas tidak ikut. */
  layer: unknown;
  quality?: number;
  /** Batas tunggu peta berhenti bergerak dan ubin selesai dimuat, milidetik. */
  timeoutMs?: number;
};

/** Pesan yang bisa langsung ditampilkan ke pengguna saat tangkapan gagal. */
export const CAPTURE_CORS_ERROR =
  "Ubin citra satelit tidak dapat dibaca peramban (CORS). Muat ulang halaman, pastikan koneksi stabil, lalu pindai ulang.";
export const CAPTURE_NOT_READY_ERROR =
  "Peta belum siap. Tunggu peta selesai dimuat, lalu pindai ulang.";
export const CAPTURE_EMPTY_ERROR =
  "Tidak ada ubin satelit yang tampil di area ini. Geser peta ke atas atap, lalu pindai ulang.";
export const CAPTURE_TOO_SMALL_ERROR =
  "Area peta terlalu kecil untuk dipindai. Perbesar jendela peramban, lalu pindai ulang.";

/**
 * Bagian dari API Leaflet yang dipakai modul ini. Leaflet dimuat dari CDN
 * (`window.L`) sehingga tipenya tidak tersedia sebagai paket npm.
 */
type TileEntry = { el?: Element | null };
type TileLayerLike = { _tiles?: Record<string, TileEntry> };
type LatLngLike = { lat: number; lng: number };
type BoundsLike = {
  getWest(): number;
  getSouth(): number;
  getEast(): number;
  getNorth(): number;
};
type MapLike = {
  getContainer(): HTMLElement;
  getSize(): { x: number; y: number };
  getBounds(): BoundsLike;
  getZoom(): number;
  getCenter(): LatLngLike;
  setView(center: LatLngLike, zoom: number, options?: { animate?: boolean }): unknown;
  containerPointToLatLng(point: { x: number; y: number }): LatLngLike;
  distance(from: LatLngLike, to: LatLngLike): number;
  _animatingZoom?: boolean;
  _panAnim?: { _inProgress?: boolean };
};

/** Persegi tangkapan, dalam piksel CSS. */
const MIN_CAPTURE_SIDE_PX = 512;
const MAX_CAPTURE_SIDE_PX = 768;

/** Cakupan terbaik menurut pengukuran model, dalam meter. */
const MIN_FOOTPRINT_M = 180;
const MAX_FOOTPRINT_M = 230;
const TARGET_FOOTPRINT_M = 200;

/** Zoom terendah yang masih masuk akal untuk deteksi atap perumahan. */
const MIN_CAPTURE_ZOOM = 15;

/** Zoom tertinggi yang ubinnya masih punya detail asli. */
const MAX_CAPTURE_ZOOM = 19;

/** Panjang garis ukur untuk menaksir skala layar, dalam piksel. */
const SCALE_PROBE_PX = 100;

const DEFAULT_QUALITY = 0.82;
const DEFAULT_TIMEOUT_MS = 15_000;
const SETTLE_POLL_MS = 120;

/** Batas dimensi berkas menurut kontrak (`width`/`height` 64 s.d. 4096). */
const MIN_IMAGE_SIDE_PX = 64;

const JPEG_MIME = "image/jpeg";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Ubin milik satu layer saja; ubin layer label tidak pernah ikut terambil. */
function tileImages(layer: TileLayerLike): HTMLImageElement[] {
  const tiles = layer._tiles ?? {};

  return Object.values(tiles)
    .map((tile) => tile?.el)
    .filter((element): element is HTMLImageElement => element instanceof HTMLImageElement);
}

/**
 * Ubin dianggap siap bila gambarnya selesai dimuat dan animasi pudar Leaflet
 * sudah selesai; ubin yang masih pudar akan menghasilkan gambar separuh tembus.
 */
function isTileReady(image: HTMLImageElement): boolean {
  if (!image.complete) {
    return false;
  }

  const opacity = Number(window.getComputedStyle(image).opacity);

  return Number.isNaN(opacity) || opacity >= 0.99;
}

/**
 * Menunggu hingga peta berhenti bergerak pada zoom tangkapan dan seluruh ubin
 * yang tampil selesai dimuat. Ini setara dengan menunggu peristiwa
 * `tileload`/`idle` Leaflet, tetapi tetap bekerja ketika semua ubin datang dari
 * cache dan tidak ada peristiwa yang dipancarkan.
 */
async function waitForReadyTiles(
  map: MapLike,
  layer: TileLayerLike,
  captureZoom: number,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let previousKey = "";

  while (Date.now() < deadline) {
    await delay(SETTLE_POLL_MS);

    const images = tileImages(layer);
    const bounds = map.getBounds();
    const animating = Boolean(map._animatingZoom) || Boolean(map._panAnim?._inProgress);
    const pending = images.some((image) => !isTileReady(image));
    const key = [
      map.getZoom(),
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
      images.length,
    ].join(",");

    if (
      !animating &&
      !pending &&
      images.length > 0 &&
      map.getZoom() === captureZoom &&
      key === previousKey
    ) {
      return;
    }

    previousKey = key;
  }
}

/**
 * Menggambar ubin pada posisi layout aslinya, relatif terhadap sudut kiri-atas
 * persegi tangkapan. Posisi diambil dari `getBoundingClientRect` supaya
 * penskalaan akibat `maxNativeZoom` dan sisa transformasi Leaflet ikut
 * terhitung tanpa menghitung ulang transformasi internal peta.
 */
function drawTiles(
  context: CanvasRenderingContext2D,
  map: MapLike,
  layer: TileLayerLike,
  offsetX: number,
  offsetY: number,
): number {
  const container = map.getContainer();
  const containerRect = container.getBoundingClientRect();
  const originX = containerRect.left + container.clientLeft;
  const originY = containerRect.top + container.clientTop;

  let drawn = 0;

  for (const image of tileImages(layer)) {
    if (!image.complete || image.naturalWidth === 0) {
      continue;
    }

    const rect = image.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      continue;
    }

    context.drawImage(
      image,
      rect.left - originX - offsetX,
      rect.top - originY - offsetY,
      rect.width,
      rect.height,
    );

    drawn += 1;
  }

  return drawn;
}

/**
 * Skala nyata layar dalam meter per piksel CSS, diukur dari jarak dua titik
 * kontainer. Cara ini tetap benar untuk lintang mana pun dan tidak terpengaruh
 * DPR maupun tingkat zoom yang sedang dipakai.
 */
function measureMetersPerPixel(map: MapLike, size: { x: number; y: number }): number {
  const from = { x: size.x / 2, y: size.y / 2 };
  const to = { x: size.x / 2 + SCALE_PROBE_PX, y: size.y / 2 };
  const meters = map.distance(
    map.containerPointToLatLng(from),
    map.containerPointToLatLng(to),
  );

  return meters / SCALE_PROBE_PX;
}

/** JPEG kualitas menengah; PNG akan membengkakkan payload beberapa kali. */
function toJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob === null) {
            reject(new Error(CAPTURE_CORS_ERROR));
            return;
          }

          resolve(blob);
        },
        JPEG_MIME,
        quality,
      );
    } catch {
      // Kanvas yang tercemar ubin lintas-origin melempar SecurityError di sini.
      reject(new Error(CAPTURE_CORS_ERROR));
    }
  });
}

/**
 * Menunggu animasi peta (`flyTo`, zoom beranimasi) selesai sebelum skala diukur,
 * supaya cakupan yang dihitung bukan cakupan di tengah animasi.
 */
async function waitForSettledView(map: MapLike, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let previousKey = "";

  while (Date.now() < deadline) {
    await delay(SETTLE_POLL_MS);

    const center = map.getCenter();
    const animating = Boolean(map._animatingZoom) || Boolean(map._panAnim?._inProgress);
    const key = `${map.getZoom()}|${center.lat}|${center.lng}`;

    if (!animating && key === previousKey) {
      return;
    }

    previousKey = key;
  }
}

/**
 * Zoom tangkapan yang membuat persegi selebar `side` menutupi 180–230 m.
 *
 * Zoom saat ini dipertahankan bila cakupannya sudah masuk rentang; kalau tidak,
 * dipilih zoom terdekat dalam `[MIN_CAPTURE_ZOOM, MAX_CAPTURE_ZOOM]`. Batas atas
 * diperlukan karena ubin di atas zoom native tidak menambah detail.
 */
function chooseCaptureZoom(
  currentZoom: number,
  side: number,
  metersPerPixel: number,
): number {
  const footprintAt = (zoom: number) =>
    side * metersPerPixel * 2 ** (currentZoom - zoom);

  const currentFootprint = footprintAt(currentZoom);

  if (currentFootprint >= MIN_FOOTPRINT_M && currentFootprint <= MAX_FOOTPRINT_M) {
    return Math.round(currentZoom);
  }

  let bestZoom = clamp(Math.round(currentZoom), MIN_CAPTURE_ZOOM, MAX_CAPTURE_ZOOM);
  let bestDistance = Math.abs(Math.log(footprintAt(bestZoom) / TARGET_FOOTPRINT_M));

  for (let zoom = MIN_CAPTURE_ZOOM; zoom <= MAX_CAPTURE_ZOOM; zoom += 1) {
    const distance = Math.abs(Math.log(footprintAt(zoom) / TARGET_FOOTPRINT_M));

    if (distance < bestDistance) {
      bestDistance = distance;
      bestZoom = zoom;
    }
  }

  return bestZoom;
}

/**
 * Menangkap persegi di tengah peta sebagai JPEG yang siap dikirim ke model.
 *
 * View pengguna dipulihkan sebelum fungsi ini selesai, termasuk saat tangkapan
 * gagal, sehingga peta tetap bisa dipakai. Yang dikembalikan adalah berkas
 * beserta `bbox` persegi tangkapan; pratinjau hasilnya ditampilkan pemanggil
 * sebagai `L.imageOverlay` memakai `bbox` yang sama, jadi area yang dilihat
 * pengguna selalu sama dengan area yang dikirim ke model meskipun zoom sempat
 * disesuaikan.
 */
export async function captureMapForDetection(
  map: MapLike,
  options: CaptureMapOptions,
): Promise<CapturedMap> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error(CAPTURE_NOT_READY_ERROR);
  }

  const layer = options.layer as TileLayerLike | null | undefined;

  if (layer === null || layer === undefined || typeof map?.getContainer !== "function") {
    throw new Error(CAPTURE_NOT_READY_ERROR);
  }

  const quality = options.quality ?? DEFAULT_QUALITY;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const size = map.getSize();
  const available = Math.min(Math.round(size.x), Math.round(size.y));
  const side = Math.min(
    clamp(available, MIN_CAPTURE_SIDE_PX, MAX_CAPTURE_SIDE_PX),
    available,
  );

  if (side < MIN_IMAGE_SIDE_PX) {
    throw new Error(CAPTURE_TOO_SMALL_ERROR);
  }

  const savedCenter = map.getCenter();
  const savedZoom = map.getZoom();

  // Animasi peta (mis. `flyTo` dari alur GPS) harus selesai sebelum skala diukur.
  await waitForSettledView(map, Math.min(timeoutMs, 5_000));

  const captureZoom = chooseCaptureZoom(savedZoom, side, measureMetersPerPixel(map, size));
  let effectiveZoom = captureZoom;

  try {
    if (captureZoom !== savedZoom) {
      map.setView(savedCenter, captureZoom, { animate: false });
      // Leaflet menjepit zoom ke `minZoom`/`maxZoom` peta, jadi nilai efektifnya
      // dibaca ulang agar penungguan ubin memakai target yang benar.
      effectiveZoom = Math.round(map.getZoom());
    }

    await waitForReadyTiles(map, layer, effectiveZoom, timeoutMs);

    const images = tileImages(layer);

    if (images.length === 0) {
      throw new Error(CAPTURE_EMPTY_ERROR);
    }

    // Ubin yang gagal dimuat tetap `complete` tetapi tanpa piksel; itu tanda CORS
    // atau jaringan bermasalah, dan mengekspornya akan menghasilkan gambar kosong.
    if (images.some((image) => !image.complete || image.naturalWidth === 0)) {
      throw new Error(CAPTURE_CORS_ERROR);
    }

    const offsetX = Math.round((size.x - side) / 2);
    const offsetY = Math.round((size.y - side) / 2);

    const canvas = document.createElement("canvas");
    // DPR sengaja dipaksa 1 supaya ukuran berkas sama dengan satuan piksel yang
    // dikirim ke server dan tidak ada resize tambahan sebelum unggah.
    canvas.width = side;
    canvas.height = side;

    const context = canvas.getContext("2d");

    if (context === null) {
      throw new Error(CAPTURE_NOT_READY_ERROR);
    }

    // Latar gelap senada satelit supaya celah antar ubin tidak memutih.
    context.fillStyle = "#0f172a";
    context.fillRect(0, 0, side, side);

    if (drawTiles(context, map, layer, offsetX, offsetY) === 0) {
      throw new Error(CAPTURE_EMPTY_ERROR);
    }

    const topLeft = map.containerPointToLatLng({ x: offsetX, y: offsetY });
    const bottomRight = map.containerPointToLatLng({ x: offsetX + side, y: offsetY + side });
    const bbox: BoundingBox = [topLeft.lng, bottomRight.lat, bottomRight.lng, topLeft.lat];

    const blob = await toJpegBlob(canvas, quality);

    return { blob, width: side, height: side, bbox, zoom: effectiveZoom };
  } finally {
    if (effectiveZoom !== savedZoom) {
      map.setView(savedCenter, savedZoom, { animate: false });
    }
  }
}
