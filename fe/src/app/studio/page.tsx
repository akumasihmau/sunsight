"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MetricStrip } from "@/components/MetricStrip";
import { ParameterPanel } from "@/components/ParameterPanel";
import { ResultDetails } from "@/components/ResultDetails";
import { RoofRectEditor, centeredRect } from "@/components/RoofRectEditor";
import {
  ApiRequestError,
  api,
  getToken,
  setToken,
  type Imagery,
  type RoofRect,
  type SimulationInput,
  type SimulationOptions,
  type SimulationParameters,
  type SimulationResult,
} from "@/lib/api";

/** Jeda sesudah perubahan terakhir sebelum simulasi dikirim, supaya seretan tidak membanjiri server. */
const SIMULATE_DEBOUNCE_MS = 350;

const EMPTY_RECT: RoofRect = { x: 0, y: 0, width: 0, height: 0, rotation_deg: 0 };

const INITIAL_PARAMETERS: SimulationParameters = {
  setback_m: 0.5,
  gutter_m: 0.5,
  tilt_deg: 20,
  azimuth_deg: 180,
  module_key: "",
  orientation: "portrait",
  clearance_m: 0.03,
  panel_count: null,
  inverter_type: "string",
  monthly_bill_idr: 1_500_000,
  tariff_key: "",
};

/** Pesan yang ditampilkan untuk sebuah kegagalan permintaan. */
function messageFor(caught: unknown): string {
  if (caught instanceof ApiRequestError) {
    return caught.message;
  }

  return "Terjadi kesalahan yang tidak terduga.";
}

export default function StudioPage() {
  const router = useRouter();

  const [latitude, setLatitude] = useState("-6.5955");
  const [longitude, setLongitude] = useState("106.7995");
  const [zoom, setZoom] = useState("19");

  const [imagery, setImagery] = useState<Imagery | null>(null);
  const [rect, setRect] = useState<RoofRect>(EMPTY_RECT);
  const [options, setOptions] = useState<SimulationOptions | null>(null);
  const [parameters, setParameters] = useState<SimulationParameters>(INITIAL_PARAMETERS);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);

  const [loadingLocation, setLoadingLocation] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Nomor urut permintaan simulasi.
   *
   * Jawaban yang datang setelah permintaan yang lebih baru diabaikan, supaya
   * hasil usang tidak pernah menimpa hasil terakhir.
   */
  const requestTicket = useRef(0);

  useEffect(() => {
    if (getToken() === null) {
      router.replace("/login");
      return;
    }

    // Katalog dimuat lewat rantai promise, bukan lewat fungsi yang menyetel status,
    // supaya mount tidak memicu render berantai.
    let cancelled = false;

    api
      .fetchOptions()
      .then((catalog) => {
        if (cancelled) {
          return;
        }

        setOptions(catalog);
        setParameters((current) => {
          if (current.module_key !== "" && current.tariff_key !== "") {
            return current;
          }

          return {
            ...current,
            module_key: catalog.defaults.module_key,
            tariff_key: catalog.defaults.tariff_key,
            orientation: catalog.defaults.orientation,
            inverter_type: catalog.defaults.inverter_type,
          };
        });
      })
      .catch((caught: unknown) => {
        if (cancelled) {
          return;
        }

        if (caught instanceof ApiRequestError && caught.status === 401) {
          setToken(null);
          router.replace("/login");
          return;
        }

        setError(messageFor(caught));
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  /**
   * Payload simulasi; `null` selama belum ada citra atau katalog.
   *
   * Disusun field per field supaya hanya masukan yang terkirim — tidak pernah
   * ada kunci hasil, sesuai aturan yang mengikat pada kontrak.
   */
  const payload = useMemo<SimulationInput | null>(() => {
    if (imagery === null || parameters.module_key === "" || parameters.tariff_key === "") {
      return null;
    }

    return {
      image_id: imagery.image_id,
      roof_rect: rect,
      setback_m: parameters.setback_m,
      gutter_m: parameters.gutter_m,
      tilt_deg: parameters.tilt_deg,
      azimuth_deg: parameters.azimuth_deg,
      module_key: parameters.module_key,
      orientation: parameters.orientation,
      clearance_m: parameters.clearance_m,
      panel_count: parameters.panel_count,
      inverter_type: parameters.inverter_type,
      monthly_bill_idr: parameters.monthly_bill_idr,
      tariff_key: parameters.tariff_key,
    };
  }, [imagery, parameters, rect]);

  const runSimulation = useCallback(
    async (body: SimulationInput) => {
      const ticket = requestTicket.current + 1;
      requestTicket.current = ticket;
      setSimulating(true);

      try {
        const next = await api.simulate(body);

        if (ticket !== requestTicket.current) {
          return;
        }

        setResult(next);
        setError(null);
      } catch (caught) {
        if (ticket !== requestTicket.current) {
          return;
        }

        if (caught instanceof ApiRequestError && caught.status === 401) {
          setToken(null);
          router.replace("/login");
          return;
        }

        setError(messageFor(caught));
      } finally {
        if (ticket === requestTicket.current) {
          setSimulating(false);
        }
      }
    },
    [router],
  );

  useEffect(() => {
    if (payload === null) {
      return;
    }

    let cancelled = false;

    const timer = setTimeout(() => {
      if (cancelled) {
        return;
      }

      void runSimulation(payload);
    }, SIMULATE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [payload, runSimulation]);

  /** Menggabungkan perubahan satu field dari panel parameter. */
  function applyPatch(patch: Partial<SimulationParameters>): void {
    setParameters((current) => ({ ...current, ...patch }));
  }

  async function loadLocation() {
    setLoadingLocation(true);
    setError(null);

    try {
      const image = await api.fetchLocation({
        lat: Number(latitude),
        lng: Number(longitude),
        zoom: Number(zoom),
      });

      setImagery(image);
      setRect(centeredRect(image.width, image.height, image.meters_per_pixel));
      setResult(null);
      setSavedId(null);
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.status === 401) {
        setToken(null);
        router.replace("/login");
        return;
      }

      setError(messageFor(caught));
    } finally {
      setLoadingLocation(false);
    }
  }

  async function saveSimulation() {
    if (payload === null) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await api.saveSimulation(payload);
      setSavedId(response.id);
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.status === 401) {
        setToken(null);
        router.replace("/login");
        return;
      }

      setError(messageFor(caught));
    } finally {
      setSaving(false);
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

  // Permintaan yang sedang berjalan menutup kontrol pengiriman supaya tidak ada
  // pengiriman ganda; panel parameter tetap hidup agar penyetelan beruntun tidak terkunci.
  const busy = loadingLocation || saving;
  const blocked = busy || simulating;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold">Studio simulasi PLTS atap</h1>
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
            disabled={busy}
            onChange={(event) => setLatitude(event.target.value)}
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium">Bujur</span>
          <input
            value={longitude}
            disabled={busy}
            onChange={(event) => setLongitude(event.target.value)}
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium">Zoom (15–20)</span>
          <input
            value={zoom}
            disabled={busy}
            onChange={(event) => setZoom(event.target.value)}
            className="w-20 rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button
          type="button"
          onClick={loadLocation}
          disabled={blocked}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loadingLocation ? "Mengunduh citra…" : "Ambil citra"}
        </button>
      </div>

      {error !== null && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm break-words text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {imagery === null && (
        <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Masukkan koordinat lalu tekan &ldquo;Ambil citra&rdquo;. Setelah citra muncul, atur persegi
          bidang atap dan parameter di sebelah kanan; hasil simulasi dihitung ulang setiap ada
          perubahan.
        </p>
      )}

      {imagery !== null && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <RoofRectEditor
              imageUrl={imagery.image_url}
              imageWidth={imagery.width}
              imageHeight={imagery.height}
              metersPerPixel={imagery.meters_per_pixel}
              attribution={imagery.attribution}
              rect={rect}
              disabled={busy}
              onChange={setRect}
            />

            {result === null ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {simulating ? "Menghitung simulasi…" : "Menunggu hasil simulasi pertama."}
              </p>
            ) : (
              <>
                {simulating && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Menghitung ulang…</p>
                )}
                <MetricStrip result={result} />
                <ResultDetails result={result} />
              </>
            )}
          </div>

          <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <ParameterPanel
              options={options}
              value={parameters}
              maxSlots={result?.layout.max_slots ?? null}
              disabled={busy}
              onChange={applyPatch}
            />

            <button
              type="button"
              onClick={saveSimulation}
              disabled={payload === null || blocked}
              className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Menyimpan…" : "Simpan simulasi"}
            </button>

            {savedId !== null && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Tersimpan sebagai simulasi #{savedId}. Buka{" "}
                <Link href="/history" className="text-sky-600 underline dark:text-sky-400">
                  Riwayat
                </Link>{" "}
                untuk melihatnya.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
