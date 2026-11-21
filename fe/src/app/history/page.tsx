"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { HistoryTable } from "@/components/HistoryTable";
import { ProjectPolygonMapPreview } from "@/components/ProjectPolygonMapPreview";
import { CapexTable } from "@/components/ResultDetails";
import { SiteHeader } from "@/components/SiteHeader";
import { ConfirmDialog } from "@/components/studio/ConfirmDialog";
import { ProposalModal } from "@/components/studio/ProposalModal";
import {
  ApiRequestError,
  api,
  getToken,
  setToken,
  type SimulationDetail,
  type SimulationParameters,
  type SimulationSummary,
} from "@/lib/api";
import { decimal, idr, integer, paybackYearsText } from "@/lib/format";
import { useStoredBiodata } from "@/lib/profile";

type PageMeta = { current_page: number; per_page: number; total: number; last_page: number };

const INPUT_LABELS: Record<string, string> = {
  setback_m: "Setback Tepi",
  gutter_m: "Jalur Talang",
  tilt_deg: "Kemiringan Bidang",
  azimuth_deg: "Azimuth Sinar",
  module_key: "Preset Modul",
  orientation: "Orientasi Modul",
  clearance_m: "Jarak Antar Panel",
  panel_count: "Panel Terpasang",
  inverter_type: "Tipe Inverter",
  monthly_bill_idr: "Tagihan Bulanan",
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
  micro: "Microinverter",
};

function inputValueText(key: string, value: string | number | null): string {
  if (value === null) return "Slot Maksimum";
  if (key === "monthly_bill_idr" && typeof value === "number") return idr.format(value);
  if (key === "orientation") return ORIENTATION_LABELS[String(value)] ?? String(value);
  if (key === "inverter_type") return INVERTER_LABELS[String(value)] ?? String(value);
  if (typeof value === "number") return `${decimal.format(value)}${INPUT_UNITS[key] ?? ""}`;
  return String(value);
}

function messageFor(caught: unknown): string {
  if (caught instanceof ApiRequestError) return caught.message;
  return "Terjadi kesalahan yang tidak terduga.";
}

export default function HistoryPage() {
  const router = useRouter();
  const biodata = useStoredBiodata();

  const [items, setItems] = useState<SimulationSummary[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [detail, setDetail] = useState<SimulationDetail | null>(null);
  const [editingDetailName, setEditingDetailName] = useState(false);
  const [detailNameDraft, setDetailNameDraft] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [proposalOpen, setProposalOpen] = useState(false);
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
        if (cancelled) return;
        setItems(result.data);
        setMeta(result.meta);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
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
    setEditingDetailName(false);
    setProposalOpen(false);
    await run(async () => {
      try {
        setDetail(await api.getSimulation(id));
      } catch (caught) {
        setError(messageFor(caught));
      }
    });
  }

  async function rename(id: number, name: string) {
    const nextAddress = name.trim() === "" ? null : name.trim();
    await run(async () => {
      try {
        const updated = await api.renameSimulation(id, nextAddress);
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, address: updated.address } : item)),
        );
        if (detail?.id === id) {
          setDetail(updated);
        }
        setEditingDetailName(false);
      } catch (caught) {
        setError(messageFor(caught));
      }
    });
  }

  async function confirmRemove() {
    if (pendingDeleteId === null) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);

    await run(async () => {
      try {
        await api.deleteSimulation(id);
        if (detail?.id === id) {
          setDetail(null);
          setProposalOpen(false);
        }
        await load(meta?.current_page ?? 1);
      } catch (caught) {
        setError(messageFor(caught));
      }
    });
  }

  const primaryRoof = detail?.roofs[0] ?? null;

  const proposalParameters = useMemo<SimulationParameters | null>(() => {
    if (detail === null || primaryRoof === null) return null;
    return {
      ...primaryRoof.input,
      inverter_type: detail.input.inverter_type,
      monthly_bill_idr: detail.input.monthly_bill_idr,
      tariff_key: detail.input.tariff_key,
    };
  }, [detail, primaryRoof]);

  const modulePower = useMemo(() => {
    const match = primaryRoof?.input.module_key.match(/(\d{3,4})$/);
    return match ? Number(match[1]) : 550;
  }, [primaryRoof]);

  return (
    <div className="min-h-screen w-full bg-[#EFF1F4] text-slate-800 flex flex-col font-sans antialiased relative overflow-x-clip">
      {/* Ambient Soft Radiant Glow Background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" data-print-hide="true">
        <div
          className="absolute -top-36 left-1/4 w-[620px] h-[620px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(252,211,77,0.26) 0%, rgba(254,240,138,0.12) 42%, transparent 72%)" }}
        />
        <div
          className="absolute top-1/4 -right-24 w-[520px] h-[520px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(125,211,252,0.22) 0%, rgba(207,250,254,0.10) 42%, transparent 72%)" }}
        />
      </div>

      <SiteHeader />

      <main className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              Riwayat Simulasi
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Simulasi tersimpan beserta parameter teknis, estimasi biaya, dan proposal PDF.
            </p>
          </div>

          <Link
            href="/studio"
            className="self-start sm:self-auto px-4 py-2 rounded-full bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 hover:brightness-105 active:scale-95 text-amber-950 font-semibold text-xs flex items-center gap-1.5 transition shadow-[0_6px_18px_rgba(245,158,11,0.20),inset_0_1px_1px_rgba(255,255,255,0.85)] border border-amber-300/80 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-950">add</span>
            <span>Buka Studio</span>
          </Link>
        </header>

        {error !== null && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-rose-50/90 backdrop-blur-md border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2"
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
          onRename={(id, name) => rename(id, name)}
          onDelete={(id) => setPendingDeleteId(id)}
        />

        {meta !== null && meta.last_page > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs rounded-2xl bg-white/78 backdrop-blur-2xl border border-white/85 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <span className="text-slate-500 font-medium font-code-metric tabular-nums">
              Halaman <strong className="text-slate-900">{meta.current_page}</strong> dari{" "}
              <strong className="text-slate-900">{meta.last_page}</strong> · {meta.total} simulasi
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void run(() => load(Math.max(1, meta.current_page - 1)))}
                disabled={busy || meta.current_page <= 1}
                className="px-3.5 py-1.5 rounded-full bg-slate-900/[0.05] hover:bg-slate-900/[0.09] text-xs font-semibold text-slate-700 disabled:opacity-40 transition cursor-pointer"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => void run(() => load(Math.min(meta.last_page, meta.current_page + 1)))}
                disabled={busy || meta.current_page >= meta.last_page}
                className="px-3.5 py-1.5 rounded-full bg-slate-900/[0.05] hover:bg-slate-900/[0.09] text-xs font-semibold text-slate-700 disabled:opacity-40 transition cursor-pointer"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}

        {/* Detail Panel (Apple Glass + Soft Radiant Glow + Flat Hairline Spec Lists) */}
        {detail !== null && (
          <section className="rounded-[28px] bg-white/80 bg-gradient-to-br from-white/92 via-amber-50/20 to-sky-50/20 backdrop-blur-2xl saturate-150 border border-white/85 p-4 sm:p-7 space-y-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)] animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900/[0.06] pb-4">
              <div className="min-w-0">
                {editingDetailName ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void rename(detail.id, detailNameDraft);
                    }}
                    className="flex items-center gap-2 flex-wrap"
                  >
                    <input
                      autoFocus
                      type="text"
                      value={detailNameDraft}
                      maxLength={160}
                      onChange={(e) => setDetailNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setEditingDetailName(false);
                        }
                      }}
                      placeholder="Nama proyek..."
                      className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-300/60 w-full sm:w-auto sm:min-w-[220px]"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-100 border border-amber-200 text-amber-950 text-xs font-semibold cursor-pointer"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingDetailName(false)}
                      className="px-3 py-1.5 rounded-full bg-slate-900/[0.05] text-slate-600 text-xs hover:bg-slate-900/[0.09] cursor-pointer"
                    >
                      Batal
                    </button>
                  </form>
                ) : (
                  <h2 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                    <span className="truncate">{detail.address?.trim() || `Simulasi #${detail.id}`}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setDetailNameDraft(detail.address ?? `Simulasi #${detail.id}`);
                        setEditingDetailName(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900/[0.045] hover:bg-amber-50 text-[11px] font-medium text-slate-600 hover:text-amber-900 transition cursor-pointer"
                      title="Ubah nama proyek"
                    >
                      <span className="material-symbols-outlined text-[13px]">edit</span>
                      <span>Ubah Nama</span>
                    </button>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 text-[10.5px] font-semibold font-code-metric tabular-nums">
                      #{detail.id}
                    </span>
                  </h2>
                )}
                <p className="text-xs text-slate-500 mt-0.5 font-code-metric">
                  Tanggal ISO {detail.created_at.slice(0, 10)} · {integer.format(detail.roofs.length)} bidang atap
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setProposalOpen(true)}
                  className="px-3.5 py-1.5 rounded-full bg-slate-900/[0.05] hover:bg-slate-900/[0.09] text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">description</span>
                  <span>Proposal PDF</span>
                </button>
                <Link
                  href={`/studio?analysis=${detail.id}`}
                  className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 hover:brightness-105 active:scale-95 text-amber-950 font-semibold text-xs flex items-center gap-1.5 transition border border-amber-300/80 shadow-[0_4px_14px_rgba(245,158,11,0.2)]"
                >
                  <span className="material-symbols-outlined text-[16px] text-amber-950">open_in_new</span>
                  <span>Buka di Studio</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="w-8 h-8 rounded-full bg-slate-900/[0.05] hover:bg-slate-900/[0.09] text-slate-500 flex items-center justify-center transition cursor-pointer"
                  aria-label="Tutup rincian"
                  title="Tutup rincian"
                >
                  <span className="material-symbols-outlined text-[17px]">close</span>
                </button>
              </div>
            </div>

            {/* Auto-fitted Satellite Map & All Polygons Preview */}
            <ProjectPolygonMapPreview
              detail={detail}
              fallbackLat={detail.center_point.lat}
              fallbackLng={detail.center_point.lng}
              roofCountLabel={`${detail.result.roof_count} bidang`}
              moduleCount={detail.result.installed}
            />

            {/* Unified 4-KPI Apple Strip */}
            <div className="rounded-2xl overflow-hidden bg-slate-900/[0.035] grid grid-cols-2 sm:grid-cols-4 [&>*:nth-child(n+3)]:border-t [&>*:nth-child(even)]:border-l sm:[&>*:nth-child(n+3)]:border-t-0 sm:[&>*:nth-child(even)]:border-l-0 sm:divide-x divide-slate-900/[0.07] [&>*]:border-slate-900/[0.07]">
              <div className="p-3 sm:p-4">
                <span className="text-[11px] text-slate-500 block">Kapasitas Sistem</span>
                <span className="text-base sm:text-xl font-semibold tracking-tight text-slate-900 font-code-metric tabular-nums mt-0.5 block">
                  {decimal.format(detail.result.capacity_kwp)} kWp
                </span>
              </div>

              <div className="p-3 sm:p-4">
                <span className="text-[11px] text-slate-500 block">Produksi/Tahun</span>
                <span className="text-base sm:text-xl font-semibold tracking-tight text-sky-900 font-code-metric tabular-nums mt-0.5 block">
                  {integer.format(detail.result.annual_production_kwh)} kWh
                </span>
              </div>

              <div className="p-3 sm:p-4">
                <span className="text-[11px] text-slate-500 block">Hemat/Bulan</span>
                <span className="text-base sm:text-xl font-semibold tracking-tight text-emerald-700 font-code-metric tabular-nums mt-0.5 block">
                  {idr.format(detail.result.monthly_saving_idr)}
                </span>
              </div>

              <div className="p-3 sm:p-4">
                <span className="text-[11px] text-slate-500 block">Balik Modal (BEP)</span>
                <span className="text-base sm:text-xl font-semibold tracking-tight text-slate-900 font-code-metric tabular-nums mt-0.5 block">
                  {paybackYearsText(detail.result.payback_years)}
                </span>
              </div>
            </div>

            {/* 3 Grouped Hairline Columns */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Card 1: Masukan */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/[0.03] space-y-2.5">
                <h3 className="text-xs font-semibold text-slate-900">
                  Geometri &amp; Input
                </h3>
                <div className="divide-y divide-slate-900/[0.06] text-xs">
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-500">Bidang Atap</span>
                    <span className="font-semibold text-slate-900 font-code-metric tabular-nums text-right">
                      {integer.format(detail.roofs.length)}
                    </span>
                  </div>
                  {Object.entries(detail.input).map(([key, value]) => (
                    <div key={key} className="py-2 flex items-center justify-between gap-2">
                      <span className="text-slate-500">{INPUT_LABELS[key] ?? key}</span>
                      <span className="font-semibold text-slate-900 font-code-metric tabular-nums text-right">
                        {inputValueText(key, value as string | number | null)}
                      </span>
                    </div>
                  ))}
                  {primaryRoof !== null &&
                    Object.entries(primaryRoof.input).map(([key, value]) => (
                      <div key={key} className="py-2 flex items-center justify-between gap-2">
                        <span className="text-slate-500">{INPUT_LABELS[key] ?? key}</span>
                        <span className="font-semibold text-slate-900 font-code-metric tabular-nums text-right">
                          {inputValueText(key, value as string | number | null)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Card 2: Tata Letak & Hasil */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/[0.03] space-y-2.5">
                <h3 className="text-xs font-semibold text-slate-900">
                  Hasil &amp; Tata Letak
                </h3>
                <div className="divide-y divide-slate-900/[0.06] text-xs">
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-500">Luas Bidang</span>
                    <span className="font-semibold text-slate-900 font-code-metric tabular-nums text-right">
                      {decimal.format(detail.result.total_area_sqm)} m²
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-500">Luas Efektif</span>
                    <span className="font-semibold text-slate-900 font-code-metric tabular-nums text-right">
                      {decimal.format(detail.result.effective_area_sqm)} m²
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-500">Luas Modul</span>
                    <span className="font-semibold text-slate-900 font-code-metric tabular-nums text-right">
                      {decimal.format(detail.result.module_area_sqm)} m²
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-500">Panel Terpasang</span>
                    <span className="font-semibold text-slate-900 font-code-metric tabular-nums text-right">
                      {integer.format(detail.result.installed)} / {integer.format(detail.result.max_slots)} slot
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-500">Hemat Tahunan</span>
                    <span className="font-semibold text-emerald-700 font-code-metric tabular-nums text-right">
                      {idr.format(detail.result.annual_saving_idr)}
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-500">Reduksi CO₂</span>
                    <span className="font-semibold text-slate-900 font-code-metric tabular-nums text-right">
                      {decimal.format(detail.result.co2_reduction_kg_per_year)} kg/thn
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Asumsi & Standar */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/[0.03] space-y-2.5">
                <h3 className="text-xs font-semibold text-slate-900">
                  Asumsi Radiasi &amp; Tarif
                </h3>
                <div className="divide-y divide-slate-900/[0.06] text-xs">
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-500">Iradiasi Harian</span>
                    <span className="font-semibold text-slate-900 font-code-metric tabular-nums text-right">
                      {decimal.format(detail.assumptions.daily_irradiance_kwh_per_sqm)} kWh/m²/hari
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-500">Sumber Data</span>
                    <span className="font-medium text-slate-800 truncate max-w-[155px] text-right">
                      {detail.assumptions.irradiance_source}
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-500">Sudut Datang</span>
                    <span className="font-semibold text-slate-900 font-code-metric tabular-nums text-right">
                      {decimal.format(detail.assumptions.incidence_factor)}
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-500">Performance Ratio</span>
                    <span className="font-semibold text-slate-900 font-code-metric tabular-nums text-right">
                      {decimal.format(detail.assumptions.performance_ratio)}
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-500">Tarif PLN</span>
                    <span className="font-semibold text-slate-900 font-code-metric tabular-nums text-right">
                      {idr.format(detail.assumptions.tariff_idr_per_kwh)}/kWh
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Capex Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/[0.03] space-y-2.5 max-w-xl">
              <h3 className="text-xs font-semibold text-slate-900">
                Rincian Investasi Awal (CAPEX)
              </h3>
              <div className="overflow-x-auto">
                <CapexTable
                  breakdown={detail.assumptions.capex_breakdown}
                  total={detail.result.capex_total_idr}
                />
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="relative z-10 w-full border-t border-white/80 bg-white/70 backdrop-blur-xl py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="SunSight" className="h-4.5 w-auto" />
          </div>
          <p>© {new Date().getFullYear()} SunSight · Simulasi PLTS Atap Kota Bogor</p>
        </div>
      </footer>

      {detail !== null && proposalParameters !== null && (
        <ProposalModal
          open={proposalOpen}
          onClose={() => setProposalOpen(false)}
          result={detail.result}
          assumptions={detail.assumptions}
          parameters={proposalParameters}
          latitude={String(detail.center_point.lat)}
          longitude={String(detail.center_point.lng)}
          biodata={biodata}
          modulePower={modulePower}
          totalFacetsCount={detail.result.roof_count}
          activeFacetName={detail.roofs[0]?.label ?? "Bidang Atap Utama"}
        />
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Hapus simulasi dari riwayat?"
        description={`Simulasi #${pendingDeleteId ?? ""} akan dihapus permanen dan tidak dapat dipulihkan.`}
        confirmLabel="Hapus Simulasi"
        cancelLabel="Batal"
        tone="danger"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => void confirmRemove()}
      />
    </div>
  );
}
