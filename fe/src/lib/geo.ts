import type { BoundingBox, Pixel } from "@/lib/api";

/**
 * Konversi antara koordinat piksel citra dan koordinat geografis.
 *
 * Citra memakai proyeksi Web Mercator sehingga pemetaan linier lewat bbox hanya
 * sahih untuk rentang satu bidikan. Rumusnya harus sama dengan yang dipakai
 * backend; lihat API CONTRACT.md bagian ruang koordinat.
 */
export function pixelToLngLat(
  [x, y]: Pixel,
  bbox: BoundingBox,
  size: { width: number; height: number },
): Pixel {
  const [minLng, minLat, maxLng, maxLat] = bbox;

  return [
    minLng + (x / size.width) * (maxLng - minLng),
    // Sumbu y citra tumbuh ke bawah, sedangkan lintang mengecil ke bawah.
    maxLat - (y / size.height) * (maxLat - minLat),
  ];
}

/** Menutup ring sesuai GeoJSON: titik terakhir sama dengan titik pertama. */
export function toGeoJsonRing(
  pixels: Pixel[],
  bbox: BoundingBox,
  size: { width: number; height: number },
): Pixel[] {
  if (pixels.length < 3) {
    return [];
  }

  const ring = pixels.map((pixel) => pixelToLngLat(pixel, bbox, size));

  ring.push([...ring[0]] as Pixel);

  return ring;
}

/**
 * Titik tengah poligon dalam koordinat geografis.
 *
 * Dipakai sebagai center_point pada kalkulasi, yang hanya membutuhkan satu titik
 * perkiraan lokasi atap.
 */
export function centroidLngLat(
  pixels: Pixel[],
  bbox: BoundingBox,
  size: { width: number; height: number },
): { lat: number; lng: number } {
  const unique = dedupe(pixels);

  if (unique.length === 0) {
    return { lat: 0, lng: 0 };
  }

  const total = unique
    .map((pixel) => pixelToLngLat(pixel, bbox, size))
    .reduce<[number, number]>((accumulator, [lng, lat]) => [accumulator[0] + lng, accumulator[1] + lat], [0, 0]);

  return {
    lng: total[0] / unique.length,
    lat: total[1] / unique.length,
  };
}

function dedupe(pixels: Pixel[]): Pixel[] {
  const seen = new Set<string>();
  const result: Pixel[] = [];

  for (const pixel of pixels) {
    const key = `${pixel[0].toFixed(6)},${pixel[1].toFixed(6)}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(pixel);
  }

  return result;
}
