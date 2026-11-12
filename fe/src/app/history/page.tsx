"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { HistoryTable } from "@/components/HistoryTable";
import { CapexTable } from "@/components/ResultDetails";
import { SiteHeader } from "@/components/SiteHeader";
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

const INPUT_LABELS: Record<string, string> = {
  setback_m: "Setback Tepi",
  gutter_m: "Jalur Talang",
  tilt_deg: "Kemiringan Bidang",
  azimuth_deg: "Azimuth Sinar",
  module_key: "Preset Modul",
  orientation: "Orientasi Modul",
  clearance_m: "Jarak Antar Panel",
  panel_count: "Jumlah Panel Terpasang",
  inverter_type: "Tipe Inverter",
  monthly_bill_idr: "Tagihan Listrik Bulanan",
  tariff_key: "Golongan Tarif PLN",
};

const INPUT_UNITS: Record<string, string> = {
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
  string: "String Inverter",
  micro: "Micro Inverter",
};

function inputValueText(key: string, value: string | number | null): string {
  if (value === null) {
    return "Slot Maksimum";
  }

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

        await load(meta?.current_page ?? 1);
      } catch (caught) {
        setError(messageFor(caught));
      }
    });
  }

  // Bidang pertama dipakai sebagai contoh masukan geometri pada panel detail.
  const primaryRoof = detail?.roofs[0] ?? null;

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-800 flex flex-col font-sans antialiased selection:bg-sky-100 selection:text-sky-900">
      <SiteHeader />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Riwayat Simulasi
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Daftar kalkulasi PLTS atap yang tersimpan beserta rincian biaya dan produksinya.
            </p>
          </div>

          <Link
            href="/studio"
            className="self-start sm:self-auto px-4 py-2 rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 hover:brightness-105 active:scale-95 text-amber-950 font-bold text-xs flex items-center gap-1.5 transition shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-amber-300/80 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-950">add</span>
            <span>Buka Studio</span>
          </Link>
        </header>

        {error !== null && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        <HistoryTable
          items={items}
          activeId={detail?.id ?? null}
          busy={busy}
          onOpen={(id) => void openDetail(id)}
          onDelete={(id) => void remove(id)}
        />

        {meta !== null && meta.last_page > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-slate-500 font-medium">
              Halaman <strong className="text-slate-900">{meta.current_page}</strong> dari{" "}
              <strong className="text-slate-900">{meta.last_page}</strong> · Total {meta.total} simulasi
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void run(() => load(Math.max(1, meta.current_page - 1)))}
                disabled={busy || meta.current_page <= 1}
                className="px-3 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => void run(() => load(Math.min(meta.last_page, meta.current_page + 1)))}
                disabled={busy || meta.current_page >= meta.last_page}
                className="px-3 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}

        {/* Detail Panel */}
        {detail !== null && (
          <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 space-y-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Detail Simulasi #{detail.id}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-900 border border-sky-200 text-[10px] font-bold">
                    Tersimpan
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rincian masukan geometri, hasil kalkulasi teknis, dan proyeksi finansial
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {/* Membuka simulasi di studio dengan bidang dan parameter yang sama. */}
                <Link
                  href={`/studio?analysis=${detail.id}`}
                  className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 hover:brightness-105 active:scale-95 text-amber-950 font-bold text-xs flex items-center gap-1.5 transition border border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.18)]"
                >
                  <span className="material-symbols-outlined text-[16px] text-amber-950">open_in_new</span>
                  <span>Buka di Studio</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-xs text-slate-600 transition"
                >
                  Tutup Rincian
                </button>
              </div>
            </div>

            {/* 4 Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Kapasitas Sistem
                </span>
                <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 mt-1 block">
                  {decimal.format(detail.result.capacity_kwp)} kWp
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-100">
                <span className="text-[10px] font-bold text-sky-900 uppercase tracking-wider block">
                  Produksi Tahunan
                </span>
                <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 mt-1 block">
                  {integer.format(detail.result.annual_production_kwh)} kWh
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                  Hemat Bulanan
                </span>
                <span className="text-lg sm:text-xl font-bold tracking-tight text-emerald-700 mt-1 block">
                  {idr.format(detail.result.monthly_saving_idr)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Titik Impas (BEP)
                </span>
                <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 mt-1 block">
                  {paybackYearsText(detail.result.payback_years)}
                </span>
              </div>
            </div>

            {/* 3 Detail Columns */}
            <div className="grid gap-5 lg:grid-cols-3">
              {/* Card 1: Masukan */}
              <div className="p-5 rounded-2xl bg-slate-50/60 border border-slate-100 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Masukan Geometri
                </h3>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500">Jumlah Bidang Atap</span>
                    <span className="font-semibold text-slate-800 tracking-tight">
                      {integer.format(detail.roofs.length)}
                    </span>
                  </div>
                  {Object.entries(detail.input).map(([key, value]) => (
                    <div key={key} className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">{INPUT_LABELS[key] ?? key}</span>
                      <span className="font-semibold text-slate-800 tracking-tight">
                        {inputValueText(key, value as string | number | null)}
                      </span>
                    </div>
                  ))}
                  {primaryRoof !== null &&
                    Object.entries(primaryRoof.input).map(([key, value]) => (
                      <div key={key} className="py-2 flex items-center justify-between">
                        <span className="text-slate-500">{INPUT_LABELS[key] ?? key}</span>
                        <span className="font-semibold text-slate-800 tracking-tight">
                          {inputValueText(key, value as string | number | null)}
                        </span>
                      </div>
                    ))}
                </div>
                {primaryRoof !== null && (
                  <p className="text-[10.5px] text-slate-400 leading-relaxed">
                    Nilai geometri di atas milik bidang pertama
                    {detail.roofs.length > 1
                      ? `; ${detail.roofs.length - 1} bidang lain memakai masukan masing-masing.`
                      : "."}
                  </p>
                )}
              </div>

              {/* Card 2: Tata Letak & Hasil */}
              <div className="p-5 rounded-2xl bg-slate-50/60 border border-slate-100 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Hasil &amp; Tata Letak
                </h3>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500">Luas Bidang Atap</span>
                    <span className="font-semibold text-slate-800 tracking-tight">{decimal.format(detail.result.total_area_sqm)} m²</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500">Luas Efektif Panel</span>
                    <span className="font-semibold text-slate-800 tracking-tight">{decimal.format(detail.result.effective_area_sqm)} m²</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500">Luas Modul</span>
                    <span className="font-semibold text-slate-800 tracking-tight">{decimal.format(detail.result.module_area_sqm)} m²</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500">Modul Terpasang</span>
                    <span className="font-semibold text-slate-800 tracking-tight">{integer.format(detail.result.installed)} / {integer.format(detail.result.max_slots)} slot</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500">Hemat Tahunan</span>
                    <span className="font-bold text-emerald-700 tracking-tight">{idr.format(detail.result.annual_saving_idr)}</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500">Reduksi Karbon</span>
                    <span className="font-semibold text-slate-800 tracking-tight">{decimal.format(detail.result.co2_reduction_kg_per_year)} kg/thn</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Asumsi & Lingkungan */}
              <div className="p-5 rounded-2xl bg-slate-50/60 border border-slate-100 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Asumsi Radiasi &amp; Tarif
                </h3>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500">Iradiasi Harian</span>
                    <span className="font-semibold text-slate-800 tracking-tight">{decimal.format(detail.assumptions.daily_irradiance_kwh_per_sqm)} kWh/m²/hari</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500">Sumber Data</span>
                    <span className="font-medium text-slate-700 truncate max-w-[150px]">{detail.assumptions.irradiance_source}</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500">Faktor Sudut Datang</span>
                    <span className="font-semibold text-slate-800 tracking-tight">{decimal.format(detail.assumptions.incidence_factor)}</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500">Performance Ratio</span>
                    <span className="font-semibold text-slate-800 tracking-tight">{decimal.format(detail.assumptions.performance_ratio)}</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500">Tarif Listrik</span>
                    <span className="font-semibold text-slate-800 tracking-tight">{idr.format(detail.assumptions.tariff_idr_per_kwh)}/kWh</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Capex Card */}
            <div className="p-5 rounded-2xl bg-slate-50/60 border border-slate-100 space-y-3 max-w-xl">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Rincian Biaya Investasi Awal (CAPEX)
              </h3>
              <CapexTable
                breakdown={detail.assumptions.capex_breakdown}
                total={detail.result.capex_total_idr}
              />
            </div>
          </section>
        )}
      </main>

      <footer className="w-full bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-600 font-semibold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="SunSight" className="h-4.5 w-auto" />
          </div>
          <p>© 2026 SunSight. Fokus Regional: Kota Bogor, Jawa Barat.</p>
        </div>
      </footer>
    </div>
  );
}
