"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ImageIcon } from "@/components/icons";
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
    <>
      <header className="flex flex-wrap items-center gap-3">
        <div className="page-intro">
          <p className="eyebrow">Studio</p>
          <h1>Simulasi PLTS atap</h1>
        </div>
        <button type="button" onClick={signOut} className="secondary-button button--sm ml-auto">
          Keluar
        </button>
      </header>

      <section className="card">
        <div className="flex flex-wrap items-end gap-3">
          <label className="field">
            <span className="field__label">Lintang</span>
            <input
              value={latitude}
              disabled={busy}
              onChange={(event) => setLatitude(event.target.value)}
              className="input input--numeric w-32"
            />
          </label>
          <label className="field">
            <span className="field__label">Bujur</span>
            <input
              value={longitude}
              disabled={busy}
              onChange={(event) => setLongitude(event.target.value)}
              className="input input--numeric w-32"
            />
          </label>
          <label className="field">
            <span className="field__label">Zoom (15–20)</span>
            <input
              value={zoom}
              disabled={busy}
              onChange={(event) => setZoom(event.target.value)}
              className="input input--numeric w-24"
            />
          </label>
          <button type="button" onClick={loadLocation} disabled={blocked} className="primary-button">
            {loadingLocation ? "Mengunduh citra…" : "Ambil citra"}
          </button>
        </div>
        <p className="card__hint">
          Citra satelit diunduh sesuai koordinat dan zoom di atas; tanda kepemilikan penyedianya ikut
          ditampilkan di kanvas dan tidak boleh dihapus.
        </p>
      </section>

      {error !== null && (
        <p role="alert" className="notice-box notice-box--danger break-words">
          {error}
        </p>
      )}

      {imagery === null && (
        <div className="empty-state">
          <span className="empty-state__mark">
            <ImageIcon className="icon" />
          </span>
          <p className="empty-state__title">Belum ada citra satelit</p>
          <p className="empty-state__body">
            Masukkan koordinat lalu tekan &ldquo;Ambil citra&rdquo;. Setelah citra muncul, geser dan
            ubah ukuran persegi bidang atap; hasil simulasinya dihitung ulang setiap ada perubahan.
          </p>
        </div>
      )}

      {imagery !== null && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid gap-6">
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
              <p className="m-0 text-sm text-ink-secondary">
                {simulating ? "Menghitung simulasi…" : "Menunggu hasil simulasi pertama."}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="m-0">Hasil simulasi</h2>
                  {simulating && (
                    <span className="state-badge state-badge--accent">Menghitung ulang…</span>
                  )}
                </div>
                <MetricStrip result={result} />
                <ResultDetails result={result} />
              </>
            )}
          </div>

          {/* Kolom kanan melekat di bawah kepala halaman supaya parameter tetap
              terjangkau saat rincian hasil digulir. */}
          <div className="grid gap-4 lg:sticky lg:top-20 lg:self-start">
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
              className="primary-button button--lg button--block"
            >
              {saving ? "Menyimpan…" : "Simpan simulasi"}
            </button>

            {savedId !== null && (
              <p className="notice-box m-0">
                Tersimpan sebagai simulasi #{savedId}. Buka{" "}
                <Link href="/history" className="link">
                  Riwayat
                </Link>{" "}
                untuk melihatnya.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
