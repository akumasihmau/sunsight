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
  /** Cakupan geografis sisi terpanjang berkas, dalam meter. */
  footprintM: number;
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
export const CAPTURE_TILES_TIMEOUT_ERROR =
  "Ubin citra satelit belum selesai dimuat. Tunggu koneksi stabil, lalu pindai ulang.";
export const captureTooWideError = (footprintM: number): string =>
  `Cakupan peta ${footprintM} m terlalu luas untuk deteksi atap. Perbesar peta sampai sekitar 200 m, lalu pindai ulang.`;
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

/** Sisi terpanjang berkas tangkapan, dalam piksel. Di atas ini tidak menambah detail. */
const MAX_CAPTURE_SIDE_PX = 1280;

/** Sisi terpendek yang masih layak dikirim. */
const MIN_CAPTURE_SIDE_PX = 320;

/**
 * Rentang cakupan yang paling baik menurut pengukuran model, dalam meter.
 * Diperiksa dan dilaporkan, bukan dipaksakan: yang tampil di layar tetap yang dikirim.
 */
export const RECOMMENDED_MIN_FOOTPRINT_M = 150;
export const RECOMMENDED_MAX_FOOTPRINT_M = 260;

/** Di atas ini pemindaian hampir pasti tidak menghasilkan apa pun, jadi ditolak. */
export const MAX_FOOTPRINT_M = 800;

/** Panjang garis ukur untuk menaksir skala layar, dalam piksel. */
const SCALE_PROBE_PX = 100;

const DEFAULT_QUALITY = 0.82;
const DEFAULT_TIMEOUT_MS = 20_000;
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
): Promise<boolean> {
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
      return true;
    }

    previousKey = key;
  }

  // Waktu habis. Pemanggil memutuskan apakah tangkapan masih layak dipakai; yang
  // penting kegagalan ini tidak lagi diam-diam.
  return false;
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
  scale = 1,
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

    // `scale` < 1 hanya dipakai bila viewport lebih besar dari batas berkas:
    // gambar diperkecil, bukan dipotong, supaya area yang dikirim tetap seluas
    // yang terlihat.
    context.drawImage(
      image,
      (rect.left - originX - offsetX) * scale,
      (rect.top - originY - offsetY) * scale,
      rect.width * scale,
      rect.height * scale,
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
async function waitForSettledView(map: MapLike, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  let previousKey = "";

  while (Date.now() < deadline) {
    await delay(SETTLE_POLL_MS);

    const center = map.getCenter();
    const animating = Boolean(map._animatingZoom) || Boolean(map._panAnim?._inProgress);
    const key = `${map.getZoom()}|${center.lat}|${center.lng}`;

    if (!animating && key === previousKey) {
      return true;
    }

    previousKey = key;
  }

  // Waktu habis. Pemanggil memutuskan apakah tangkapan masih layak dipakai; yang
  // penting kegagalan ini tidak lagi diam-diam.
  return false;
}

/**
 * Menangkap seluruh area peta yang sedang tampil sebagai JPEG untuk model.
 *
 * Zoom tidak diubah dan area tidak dipotong: yang terlihat pengguna persis yang
 * dikirim, dan `bbox` hasilnya dipakai pemanggil untuk menggambar ulang tangkapan
 * sebagai `L.imageOverlay`. Cakupan geografisnya ikut dikembalikan supaya pemanggil
 * dapat memperingatkan ketika terlalu luas atau terlalu sempit, bukan memaksakan
 * zoom sendiri.
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
  const availW = Math.round(size.x);
  const availH = Math.round(size.y);

  if (Math.min(availW, availH) < MIN_CAPTURE_SIDE_PX) {
    throw new Error(CAPTURE_TOO_SMALL_ERROR);
  }

  // Seluruh viewport ditangkap, jadi tidak ada zoom yang dipaksakan: yang tampil
  // di layar persis yang dikirim ke model.
  const scale = Math.min(1, MAX_CAPTURE_SIDE_PX / Math.max(availW, availH));
  const width = Math.max(1, Math.round(availW * scale));
  const height = Math.max(1, Math.round(availH * scale));

  // Animasi peta (mis. `flyTo` dari alur GPS) harus selesai sebelum ubin digambar.
  await waitForSettledView(map, Math.min(timeoutMs, 5_000));

  // Zoom tidak diubah sama sekali.
  //
  // Penyesuaian zoom di titik ini terbukti gagal dengan cara yang tidak terlihat:
  // setelah `setView`, Leaflet mempertahankan ubin lama, penungguan ubin baru
  // habis waktunya, dan tidak ada satu pun permintaan terkirim. Karena itu yang
  // dikirim adalah persis yang tampil di layar, dan cakupannya dilaporkan ke
  // pemanggil supaya pengguna yang memutuskan.
  const zoom = Math.round(map.getZoom());

  const tilesReady = await waitForReadyTiles(map, layer, zoom, timeoutMs);

  const images = tileImages(layer);

  if (images.length === 0) {
    throw new Error(CAPTURE_EMPTY_ERROR);
  }

  // Ubin yang belum selesai dimuat menghasilkan potret separuh: lebih baik ditolak
  // dengan pesan yang jelas daripada mengirim citra cacat ke model.
  if (!tilesReady) {
    throw new Error(CAPTURE_TILES_TIMEOUT_ERROR);
  }

  // Ubin yang gagal dimuat tetap `complete` tetapi tanpa piksel; itu tanda CORS
  // atau jaringan bermasalah, dan mengekspornya akan menghasilkan gambar kosong.
  if (images.some((image) => !image.complete || image.naturalWidth === 0)) {
    throw new Error(CAPTURE_CORS_ERROR);
  }

  const canvas = document.createElement("canvas");
  // DPR sengaja dipaksa 1 supaya ukuran berkas memakai satuan piksel yang dikirim
  // ke server, tanpa resize tersembunyi.
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error(CAPTURE_NOT_READY_ERROR);
  }

  // Latar gelap senada satelit supaya celah antar ubin tidak memutih.
  context.fillStyle = "#0f172a";
  context.fillRect(0, 0, width, height);

  const drawn = drawTiles(context, map, layer, 0, 0, scale);

  if (drawn === 0) {
    throw new Error(CAPTURE_EMPTY_ERROR);
  }

  const topLeft = map.containerPointToLatLng({ x: 0, y: 0 });
  const bottomRight = map.containerPointToLatLng({ x: availW, y: availH });
  const bbox: BoundingBox = [topLeft.lng, bottomRight.lat, bottomRight.lng, topLeft.lat];

  // Cakupan diukur dari jarak nyata di bumi, bukan dari selisih derajat, supaya
  // angkanya tetap benar pada lintang mana pun.
  const metersPerPixelAtScale = Math.max(
    0.01,
    map.distance(topLeft, map.containerPointToLatLng({ x: SCALE_PROBE_PX, y: 0 })) / SCALE_PROBE_PX,
  );
  const footprintM = Math.round(Math.max(availW, availH) * metersPerPixelAtScale);

  if (footprintM > MAX_FOOTPRINT_M) {
    throw new Error(captureTooWideError(footprintM));
  }

  const blob = await toJpegBlob(canvas, quality);

  return { blob, width, height, bbox, zoom, footprintM };
}
