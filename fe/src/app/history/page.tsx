"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { CapexTable } from "@/components/ResultDetails";
import { HistoryTable } from "@/components/HistoryTable";
import {
  ApiRequestError,
  api,
  getToken,
  setToken,
  type SimulationDetail,
  type SimulationSummary,
} from "@/lib/api";
import { decimal, idr, integer, paybackYearsText } from "@/lib/format";

type PageMeta = { current_page: number; per_page: number; total: number; last_page: number };

/** Label Indonesia untuk masukan yang tersimpan, urut sesuai alur pengisian. */
const INPUT_LABELS: Record<string, string> = {
  roof_width_m: "Lebar atap",
  roof_length_m: "Panjang atap",
  rotation_deg: "Putaran persegi",
  setback_m: "Setback tepi",
  gutter_m: "Jalur talang",
  tilt_deg: "Kemiringan bidang",
  azimuth_deg: "Azimuth",
  module_key: "Preset modul",
  orientation: "Orientasi modul",
  clearance_m: "Jarak antar panel",
  panel_count: "Jumlah panel",
  inverter_type: "Tipe inverter",
  monthly_bill_idr: "Tagihan listrik bulanan",
  tariff_key: "Golongan tarif",
};

/** Satuan tampilan untuk masukan yang tersimpan. */
const INPUT_UNITS: Record<string, string> = {
  roof_width_m: " m",
  roof_length_m: " m",
  rotation_deg: "°",
  setback_m: " m",
  gutter_m: " m",
  tilt_deg: "°",
  azimuth_deg: "°",
  clearance_m: " m",
};

const ORIENTATION_LABELS: Record<string, string> = {
  portrait: "Potret",
  landscape: "Lanskap",
};

const INVERTER_LABELS: Record<string, string> = {
  string: "String",
  micro: "Micro",
};

/** Nilai satu masukan tersimpan sebagai teks yang bisa dibaca. */
function inputValueText(key: string, value: string | number): string {
  if (key === "monthly_bill_idr" && typeof value === "number") {
    return idr.format(value);
  }

  if (key === "orientation") {
    return ORIENTATION_LABELS[String(value)] ?? String(value);
  }

  if (key === "inverter_type") {
    return INVERTER_LABELS[String(value)] ?? String(value);
  }

  if (typeof value === "number") {
    return `${decimal.format(value)}${INPUT_UNITS[key] ?? ""}`;
  }

  return String(value);
}

/** Pesan yang ditampilkan untuk sebuah kegagalan permintaan. */
function messageFor(caught: unknown): string {
  if (caught instanceof ApiRequestError) {
    return caught.message;
  }

  return "Terjadi kesalahan yang tidak terduga.";
}

export default function HistoryPage() {
  const router = useRouter();

  const [items, setItems] = useState<SimulationSummary[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [detail, setDetail] = useState<SimulationDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Memuat satu halaman daftar riwayat.
   *
   * Sengaja tidak menyetel status apa pun sebelum permintaan dikirim, supaya
   * pemanggilan dari dalam effect tidak memicu render berantai.
   */
  const load = useCallback(
    async (page: number) => {
      try {
        const result = await api.listSimulations(page);
        setItems(result.data);
        setMeta(result.meta);
        setError(null);
      } catch (caught) {
        if (caught instanceof ApiRequestError && caught.status === 401) {
          setToken(null);
          router.replace("/login");
          return;
        }

        setError(messageFor(caught));
      }
    },
    [router],
  );

  useEffect(() => {
    if (getToken() === null) {
      router.replace("/login");
      return;
    }

    // Pemuatan awal memakai rantai promise, bukan pemanggilan fungsi yang menyetel
    // status, supaya tidak ada render berantai saat mount. Penanda `cancelled`
    // mencegah hasil yang datang terlambat menimpa keadaan setelah unmount.
    let cancelled = false;

    api
      .listSimulations(1)
      .then((result) => {
        if (cancelled) {
          return;
        }

        setItems(result.data);
        setMeta(result.meta);
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

  /** Membungkus aksi yang dipicu pengguna dengan indikator sibuk. */
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);

    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  async function openDetail(id: number) {
    await run(async () => {
      try {
        setDetail(await api.getSimulation(id));
      } catch (caught) {
        setError(messageFor(caught));
      }
    });
  }

  async function remove(id: number) {
    if (!window.confirm(`Hapus simulasi #${id}?`)) {
      return;
    }

    await run(async () => {
      try {
        await api.deleteSimulation(id);

        if (detail?.id === id) {
          setDetail(null);
        }

        // Dimuat ulang dari server supaya tampilan tidak menyimpang dari data.
        await load(meta?.current_page ?? 1);
      } catch (caught) {
        setError(messageFor(caught));
      }
    });
  }

  return (
    <>
      <header className="page-intro">
        <p className="eyebrow">Riwayat</p>
        <h1>Simulasi yang tersimpan</h1>
        <p>
          Setiap baris adalah hasil yang dihitung ulang server saat disimpan, lengkap dengan masukan
          dan asumsi yang dipakai pada perhitungan itu.
        </p>
      </header>

      {error !== null && (
        <p role="alert" className="notice-box notice-box--danger break-words">
          {error}
        </p>
      )}

      <HistoryTable
        items={items}
        activeId={detail?.id ?? null}
        busy={busy}
        onOpen={(id) => void openDetail(id)}
        onDelete={(id) => void remove(id)}
      />

      {meta !== null && meta.last_page > 1 && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => void run(() => load(Math.max(1, meta.current_page - 1)))}
            disabled={busy || meta.current_page <= 1}
            className="secondary-button button--sm"
          >
            Sebelumnya
          </button>
          <span className="text-ink-secondary">
            Halaman {meta.current_page} dari {meta.last_page} · {meta.total} simulasi
          </span>
          <button
            type="button"
            onClick={() => void run(() => load(Math.min(meta.last_page, meta.current_page + 1)))}
            disabled={busy || meta.current_page >= meta.last_page}
            className="secondary-button button--sm"
          >
            Berikutnya
          </button>
        </div>
      )}

      {detail !== null && (
        <section className="grid gap-4">
          <div className="section-heading">
            <h2>Detail simulasi #{detail.id}</h2>
            <p>Masukan, hasil, dan asumsi yang tersimpan pada baris ini.</p>
          </div>

          <div className="stat-grid">
            <article className="stat">
              <p className="stat__label">Kapasitas</p>
              <p className="stat__value">{decimal.format(detail.result.capacity_kwp)} kWp</p>
            </article>
            <article className="stat">
              <p className="stat__label">Produksi tahunan</p>
              <p className="stat__value">
                {integer.format(detail.result.annual_production_kwh)} kWh
              </p>
            </article>
            <article className="stat">
              <p className="stat__label">Hemat bulanan</p>
              <p className="stat__value">{idr.format(detail.result.monthly_saving_idr)}</p>
            </article>
            <article className="stat">
              <p className="stat__label">Payback</p>
              <p
                className={
                  detail.result.payback_years === null
                    ? "stat__value stat__value--empty"
                    : "stat__value"
                }
              >
                {paybackYearsText(detail.result.payback_years)}
              </p>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="card">
              <h3 className="card__title">
                Masukan yang tersimpan
              </h3>
              <table className="data-table data-table--compact">
                <tbody>
                  {Object.entries(detail.input).map(([key, value]) => (
                    <tr key={key}>
                      <td>
                        {INPUT_LABELS[key] ?? key}
                      </td>
                      <td>
                        {inputValueText(key, value as string | number)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="card">
              <h3 className="card__title">
                Hasil dan tata letak
              </h3>
              <table className="data-table data-table--compact">
                <tbody>
                  <tr>
                    <td>Luas bidang</td>
                    <td>
                      {decimal.format(detail.result.total_area_sqm)} m²
                    </td>
                  </tr>
                  <tr>
                    <td>Luas efektif</td>
                    <td>
                      {decimal.format(detail.result.effective_area_sqm)} m²
                    </td>
                  </tr>
                  <tr>
                    <td>Kisi</td>
                    <td>
                      {integer.format(detail.result.rows)} × {integer.format(detail.result.columns)}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      Modul terpasang
                    </td>
                    <td>
                      {integer.format(detail.result.installed)} dari{" "}
                      {integer.format(detail.result.max_slots)} slot
                    </td>
                  </tr>
                  <tr>
                    <td>Hemat tahunan</td>
                    <td>
                      {idr.format(detail.result.annual_saving_idr)}
                    </td>
                  </tr>
                  <tr>
                    <td>Reduksi CO₂</td>
                    <td>
                      {decimal.format(detail.result.co2_reduction_kg_per_year)} kg/tahun ·{" "}
                      {integer.format(detail.result.trees_equivalent)} pohon
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="card">
              <h3 className="card__title">
                Asumsi yang tersimpan
              </h3>
              <table className="data-table data-table--compact">
                <tbody>
                  <tr>
                    <td>Iradiasi harian</td>
                    <td>
                      {decimal.format(detail.assumptions.daily_irradiance_kwh_per_sqm)} kWh/m²/hari
                    </td>
                  </tr>
                  <tr>
                    <td>Sumber iradiasi</td>
                    <td>
                      {detail.assumptions.irradiance_source} · {detail.assumptions.irradiance_period}
                    </td>
                  </tr>
                  <tr>
                    <td>Faktor datang</td>
                    <td>
                      {decimal.format(detail.assumptions.incidence_factor)}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      Performance ratio
                    </td>
                    <td>
                      {decimal.format(detail.assumptions.performance_ratio)}
                    </td>
                  </tr>
                  <tr>
                    <td>Golongan tarif</td>
                    <td>
                      {detail.assumptions.tariff_label} ·{" "}
                      {idr.format(detail.assumptions.tariff_idr_per_kwh)}/kWh
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>

          <section className="card lg:max-w-md">
            <h3 className="card__title">Rincian CAPEX yang tersimpan</h3>
            <CapexTable
              breakdown={detail.assumptions.capex_breakdown}
              total={detail.result.capex_total_idr}
            />
          </section>
        </section>
      )}
    </>
  );
}
