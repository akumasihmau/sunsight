"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ImageryCanvas } from "@/components/ImageryCanvas";
import { ResultPanel } from "@/components/ResultPanel";
import {
  ApiRequestError,
  api,
  getToken,
  setToken,
  type Calculation,
  type Imagery,
  type Pixel,
  type ShadowAnalysis,
} from "@/lib/api";
import { centroidLngLat, toGeoJsonRing } from "@/lib/geo";

export default function AnalysisPage() {
  const router = useRouter();

  const [latitude, setLatitude] = useState("-6.59");
  const [longitude, setLongitude] = useState("106.80");
  const [zoom, setZoom] = useState("19");

  const [imagery, setImagery] = useState<Imagery | null>(null);
  const [polygon, setPolygon] = useState<Pixel[]>([]);
  const [shadow, setShadow] = useState<ShadowAnalysis | null>(null);
  const [calculation, setCalculation] = useState<Calculation | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);

  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getToken() === null) {
      router.replace("/login");
    }
  }, [router]);

  /** Menjalankan satu permintaan sambil mengurus status berjalan dan kesalahannya. */
  async function run<T>(label: string, action: () => Promise<T>): Promise<T | null> {
    setBusy(true);
    setError(null);
    setStep(label);

    try {
      return await action();
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.status === 401) {
        setToken(null);
        router.replace("/login");
        return null;
      }

      setError(
        caught instanceof ApiRequestError ? caught.message : "Terjadi kesalahan yang tidak terduga.",
      );
      return null;
    } finally {
      setBusy(false);
      setStep(null);
    }
  }

  function invalidateFromShadow() {
    setShadow(null);
    setCalculation(null);
    setSavedId(null);
  }

  async function loadImagery() {
    const result = await run("Mengunduh citra…", () =>
      api.fetchImagery({
        lat: Number(latitude),
        lng: Number(longitude),
        zoom: Number(zoom),
      }),
    );

    if (result !== null) {
      setImagery(result);
      setPolygon([]);
      invalidateFromShadow();
    }
  }

  async function refine() {
    if (imagery === null) {
      return;
    }

    const result = await run("Merapikan poligon…", () =>
      api.refinePolygon({ image_id: imagery.image_id, rough_polygon: polygon }),
    );

    if (result !== null) {
      setPolygon(result.refined_polygon);
      invalidateFromShadow();
    }
  }

  async function analyseShadow() {
    if (imagery === null) {
      return;
    }

    const result = await run("Menganalisis bayangan…", () =>
      api.detectShadow({ image_id: imagery.image_id, refined_polygon: polygon }),
    );

    if (result !== null) {
      setShadow(result);
      setCalculation(null);
      setSavedId(null);
    }
  }

  async function calculateEnergy() {
    if (imagery === null || shadow === null) {
      return;
    }

    const size = { width: imagery.width, height: imagery.height };

    const result = await run("Menghitung energi…", () =>
      api.calculate({
        usable_area_sqm: shadow.usable_area_sqm,
        center_point: centroidLngLat(polygon, imagery.bbox, size),
        polygon: toGeoJsonRing(polygon, imagery.bbox, size),
      }),
    );

    if (result !== null) {
      setCalculation(result);
      setSavedId(null);
    }
  }

  async function saveAnalysis() {
    if (imagery === null || shadow === null || calculation === null) {
      return;
    }

    const size = { width: imagery.width, height: imagery.height };

    const result = await run("Menyimpan analisis…", () =>
      api.saveAnalysis({
        usable_area_sqm: shadow.usable_area_sqm,
        shadow_area_sqm: shadow.shadow_area_sqm,
        center_point: centroidLngLat(polygon, imagery.bbox, size),
        polygon: toGeoJsonRing(polygon, imagery.bbox, size),
        estimated_energy_kwh_per_day: calculation.estimated_energy_kwh_per_day,
        roof_orientation_deg: calculation.roof_orientation_deg,
        recommended_azimuth_deg: calculation.recommended_azimuth_deg,
        assumptions: calculation.assumptions,
      }),
    );

    if (result !== null) {
      setSavedId(result.id);
    }
  }

  async function signOut() {
    try {
      await api.logout();
    } catch {
      // Token mungkin sudah tidak berlaku; keluar tetap dilanjutkan.
    }

    setToken(null);
    router.replace("/login");
  }

  function addPoint(point: Pixel) {
    setPolygon((current) => [...current, point]);
    invalidateFromShadow();
  }

  const hasRoughPolygon = polygon.length >= 3;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold">Analisis atap</h1>
        <button
          type="button"
          onClick={signOut}
          className="ml-auto text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          Keluar
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <label className="space-y-1">
          <span className="block text-xs font-medium">Lintang</span>
          <input
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium">Bujur</span>
          <input
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium">Zoom</span>
          <input
            value={zoom}
            onChange={(event) => setZoom(event.target.value)}
            className="w-20 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button
          type="button"
          onClick={loadImagery}
          disabled={busy}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Ambil citra
        </button>
      </div>

      {error !== null && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {step !== null && <p className="text-sm text-zinc-500 dark:text-zinc-400">{step}</p>}

      {imagery !== null && (
        <>
          <ImageryCanvas
            imageUrl={imagery.image_url}
            bbox={imagery.bbox}
            width={imagery.width}
            height={imagery.height}
            polygon={polygon}
            metersPerPixel={imagery.meters_per_pixel}
            disabled={busy}
            onAddPoint={addPoint}
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refine}
              disabled={busy || !hasRoughPolygon}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
            >
              Rapikan poligon
            </button>
            <button
              type="button"
              onClick={analyseShadow}
              disabled={busy || !hasRoughPolygon}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
            >
              Analisis bayangan
            </button>
            <button
              type="button"
              onClick={calculateEnergy}
              disabled={busy || shadow === null}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Hitung energi
            </button>
            <button
              type="button"
              onClick={() => {
                setPolygon((current) => current.slice(0, -1));
                invalidateFromShadow();
              }}
              disabled={busy || polygon.length === 0}
              className="ml-auto rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
            >
              Hapus titik terakhir
            </button>
            <button
              type="button"
              onClick={() => {
                setPolygon([]);
                invalidateFromShadow();
              }}
              disabled={busy || polygon.length === 0}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
            >
              Ulangi poligon
            </button>
          </div>
        </>
      )}

      {imagery !== null && polygon.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Klik pada citra untuk menandai sudut atap. Minimal tiga titik.
        </p>
      )}

      <ResultPanel
        shadow={shadow}
        calculation={calculation}
        savedId={savedId}
        busy={busy}
        onSave={saveAnalysis}
      />
    </div>
  );
}
