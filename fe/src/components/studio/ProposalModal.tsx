"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { SimulationAssumptions, SimulationParameters, SimulationResult } from "@/lib/api";
import { decimal, idr, integer, paybackYearsText } from "@/lib/format";
import type { UserBiodata } from "@/lib/profile";

type Props = {
  open: boolean;
  onClose: () => void;
  result: SimulationResult;
  assumptions: SimulationAssumptions;
  parameters: SimulationParameters;
  latitude: string;
  longitude: string;
  biodata: UserBiodata | null;
  cumulative25?: number;
  irr?: number;
  newMonthlyBill?: number;
  coveragePct?: number;
  totalFacetsCount?: number;
  modulePower?: number;
  activeFacetName?: string;
  monthlyGenKwh?: number;
};

const PROPERTY_LABELS: Record<string, string> = {
  residential: "Residensial · Rumah Tinggal",
  commercial: "Komersial · Usaha",
  industrial: "Industri · Fasilitas Produksi",
};

export function ProposalModal({
  open,
  onClose,
  result,
  assumptions,
  parameters,
  latitude,
  longitude,
  biodata,
  cumulative25,
  irr = 18.5,
  newMonthlyBill,
  coveragePct,
  totalFacetsCount = 1,
  modulePower = 550,
  activeFacetName = "Bidang Atap Utama",
  monthlyGenKwh,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const cleanupPrintClass = () => {
      document.body.classList.remove("printing-proposal");
    };
    window.addEventListener("afterprint", cleanupPrintClass);
    return () => {
      window.removeEventListener("afterprint", cleanupPrintClass);
      cleanupPrintClass();
    };
  }, []);

  if (!open) return null;

  const effectiveCumulative25 = cumulative25 ?? result.annual_saving_idr * 25;
  const effectiveNewBill =
    newMonthlyBill ?? Math.max(0, parameters.monthly_bill_idr - result.monthly_saving_idr);
  const effectiveCoveragePct =
    coveragePct ??
    Math.min(
      100,
      Math.round((result.monthly_saving_idr / Math.max(1, parameters.monthly_bill_idr)) * 100)
    );
  const effectiveMonthlyKwh = monthlyGenKwh ?? Math.round(result.annual_production_kwh / 12);

  const now = new Date();
  const isoDate = now.toISOString().slice(0, 10);
  const documentNo = `SS-PROP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${Math.abs(
    Math.round(Number(latitude) * 100) + Math.round(Number(longitude) * 100)
  )
    .toString()
    .padStart(4, "0")
    .slice(-4)}`;

  const printProposal = () => {
    document.body.classList.add("printing-proposal");
    window.print();
  };

  const modalNode = (
    <div
      id="proposal-print-portal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/45 backdrop-blur-md print:static print:block print:w-full print:h-auto print:overflow-visible print:bg-white print:p-0 print:m-0"
    >
      <div className="relative w-full max-w-3xl bg-white/86 bg-gradient-to-br from-white/95 via-amber-50/30 to-sky-50/25 backdrop-blur-2xl saturate-150 rounded-3xl shadow-[0_24px_70px_rgba(245,158,11,0.18),0_8px_28px_rgba(15,23,42,0.10),inset_0_1px_1px_rgba(255,255,255,0.92)] border border-white/90 overflow-hidden flex flex-col max-h-[92vh] print:static print:block print:w-full print:max-w-none print:h-auto print:max-h-none print:overflow-visible print:shadow-none print:border-0 print:rounded-none print:bg-white print:p-0 print:m-0">
        {/* Modal Top Bar (Apple Frosted Glass - Hidden on print) */}
        <div className="px-6 py-4 border-b border-slate-900/[0.06] flex items-center justify-between bg-white/75 backdrop-blur-xl print:hidden">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100 text-amber-800 flex items-center justify-center border border-amber-200/70 shadow-[inset_0_1px_1px_rgba(255,255,255,0.85)]">
              <span className="material-symbols-outlined text-[18px]">description</span>
            </span>
            <div>
              <h3 className="font-title font-semibold text-slate-900 text-sm tracking-tight leading-tight m-0">
                Proposal Kelayakan PLTS Atap
              </h3>
              <p className="text-[11px] text-slate-500 m-0">
                Ringkasan teknis, finansial &amp; standar kepatuhan instalasi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-900/[0.05] active:scale-95 transition cursor-pointer"
            title="Tutup Pratinjau"
            aria-label="Tutup Pratinjau"
          >
            <span className="material-symbols-outlined text-[19px]">close</span>
          </button>
        </div>

        {/* Printable Document Sheet */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-900/[0.02] flex justify-center items-start print:static print:block print:w-full print:h-auto print:overflow-visible print:bg-white print:p-0 print:m-0">
          <article className="w-full max-w-2xl bg-white shadow-[0_10px_32px_rgba(15,23,42,0.06)] border border-slate-900/[0.06] p-6 sm:p-8 rounded-2xl text-slate-900 text-xs space-y-6 print:max-w-none print:w-full print:border-0 print:shadow-none print:p-0 print:rounded-none print:space-y-5">
            {/* 1. Document Header (ISO 7200 Controlled Metadata) */}
            <header className="proposal-section-block break-inside-avoid print:break-inside-avoid flex flex-col sm:flex-row print:flex-row items-start sm:items-center print:items-center justify-between border-b border-slate-200/80 pb-4 gap-3">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="SunSight Logo" className="h-7 w-auto" />
                <div>
                  <span className="font-title font-semibold text-slate-950 text-[15px] tracking-tight block">
                    SunSight Solar Engine
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Studi Kelayakan Teknis &amp; Finansial PLTS Atap
                  </span>
                </div>
              </div>

              <div className="sm:text-right print:text-right space-y-0.5 text-[11px] text-slate-500 font-code-metric tabular-nums">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Terverifikasi · SNI / IEC
                </span>
                <p className="m-0 pt-0.5 text-slate-700 font-medium">No. {documentNo}</p>
                <p className="m-0 text-[10.5px] text-slate-400">Tanggal (ISO 8601): {isoDate}</p>
              </div>
            </header>

            {/* 2. Applicant & Existing Utility Strip (Single Clean Grouped Card) */}
            <section className="proposal-section-block break-inside-avoid print:break-inside-avoid rounded-2xl bg-slate-900/[0.03] px-4 py-3.5 grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4 sm:divide-x print:divide-x divide-slate-900/[0.08]">
              <div className="space-y-0.5">
                <span className="text-[10.5px] font-medium text-slate-400 block">Pemohon &amp; Properti</span>
                <p className="font-title font-semibold text-slate-950 text-[13.5px] m-0">
                  {biodata?.name || "Pemohon Studi Kelayakan"}
                </p>
                <p className="text-[11px] text-slate-600 m-0">
                  {PROPERTY_LABELS[biodata?.propertyType ?? "residential"] ?? "Residensial · Rumah Tinggal"}
                </p>
                <p className="text-[11px] text-slate-500 m-0 font-code-metric">
                  {biodata?.location || `Koordinat ${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`}
                </p>
              </div>

              <div className="sm:pl-4 print:pl-4 space-y-0.5">
                <span className="text-[10.5px] font-medium text-slate-400 block">Kelistrikan PLN Eksisting</span>
                <p className="m-0 font-semibold text-slate-900 text-[13px]">
                  {assumptions.tariff_label}
                </p>
                <p className="m-0 text-[11px] text-slate-600 font-code-metric tabular-nums">
                  Tarif Rp {assumptions.tariff_idr_per_kwh.toLocaleString("id-ID")}/kWh
                </p>
                <p className="m-0 text-[11px] text-slate-600 font-code-metric tabular-nums">
                  Tagihan {idr.format(parameters.monthly_bill_idr)}/bulan
                </p>
              </div>
            </section>

            {/* 3. Executive KPI Strip (4 Clean Metrics, Zero Nested Boxes) */}
            <section className="proposal-section-block break-inside-avoid print:break-inside-avoid grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-2xl bg-amber-50/75 border border-amber-200/50 space-y-1">
                <span className="text-[10.5px] font-medium text-amber-800 block">Kapasitas</span>
                <span className="font-title text-[17px] leading-tight font-semibold text-amber-950 block font-code-metric tabular-nums">
                  {decimal.format(result.capacity_kwp)} kWp
                </span>
                <span className="text-[10px] text-amber-900/70 block">
                  {integer.format(result.installed)} panel · {modulePower} Wp
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-sky-50/75 border border-sky-200/50 space-y-1">
                <span className="text-[10.5px] font-medium text-sky-800 block">Produksi/Tahun</span>
                <span className="font-title text-[17px] leading-tight font-semibold text-sky-950 block font-code-metric tabular-nums">
                  {(result.annual_production_kwh / 1000).toFixed(1)} MWh
                </span>
                <span className="text-[10px] text-sky-900/70 block font-code-metric tabular-nums">
                  ~{effectiveMonthlyKwh.toLocaleString("id-ID")} kWh/bln
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/75 border border-emerald-200/50 space-y-1">
                <span className="text-[10.5px] font-medium text-emerald-800 block">Hemat Tagihan</span>
                <span className="font-title text-[17px] leading-tight font-semibold text-emerald-950 block font-code-metric tabular-nums">
                  -{effectiveCoveragePct}%
                </span>
                <span className="text-[10px] text-emerald-800 block font-code-metric tabular-nums">
                  {idr.format(result.monthly_saving_idr)}/bln
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/[0.035] border border-slate-200/60 space-y-1">
                <span className="text-[10.5px] font-medium text-slate-500 block">Balik Modal</span>
                <span className="font-title text-[17px] leading-tight font-semibold text-slate-900 block font-code-metric tabular-nums">
                  {paybackYearsText(result.payback_years)}
                </span>
                <span className="text-[10px] text-slate-500 block font-code-metric tabular-nums">
                  IRR ~{irr}%/tahun
                </span>
              </div>
            </section>

            {/* 4. Section 1: Spesifikasi Teknis (Unified 2-Col Apple Spec Sheet) */}
            <section className="proposal-section-block break-inside-avoid print:break-inside-avoid space-y-2.5">
              <div className="flex items-baseline justify-between border-b border-slate-200/70 pb-1.5">
                <h4 className="font-title font-semibold text-slate-900 text-[12.5px] m-0">
                  1. Spesifikasi Teknis Bidang Atap
                </h4>
                <span className="text-[10.5px] text-slate-500">
                  {activeFacetName} · {totalFacetsCount} bidang
                </span>
              </div>

              <div className="rounded-2xl bg-slate-900/[0.025] border border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 sm:divide-x print:divide-x divide-slate-200/70 text-[11px]">
                <div className="divide-y divide-slate-200/70 px-4">
                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <span className="text-slate-500">Luas Bidang Atap</span>
                    <span className="font-semibold text-slate-900 font-code-metric tabular-nums">
                      {decimal.format(result.total_area_sqm)} m²
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <span className="text-slate-500">Modul Fotovoltaik</span>
                    <span className="font-semibold text-slate-900 text-right">
                      Mono PERC {modulePower} Wp (IEC 61215)
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <span className="text-slate-500">Inverter Grid-Tied</span>
                    <span className="font-semibold text-slate-900 text-right">
                      {parameters.inverter_type === "micro" ? "Microinverter" : "String Inverter"} (IEEE 1547)
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-200/70 px-4 border-t sm:border-t-0 print:border-t-0 border-slate-200/70">
                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <span className="text-slate-500">Luas Efektif Panel</span>
                    <span className="font-semibold text-emerald-700 font-code-metric tabular-nums">
                      {decimal.format(result.effective_area_sqm)} m²
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <span className="text-slate-500">Kemiringan &amp; Azimuth</span>
                    <span className="font-semibold text-slate-900 font-code-metric tabular-nums">
                      {parameters.tilt_deg}° / {parameters.azimuth_deg}°
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <span className="text-slate-500">Performance Ratio (IEC 61724)</span>
                    <span className="font-semibold text-emerald-700 font-code-metric tabular-nums">
                      {(assumptions.performance_ratio * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* 5. Section 2: Analisis Tagihan & Arus Kas */}
            <section className="proposal-section-block break-inside-avoid print:break-inside-avoid space-y-2.5">
              <div className="flex items-baseline justify-between border-b border-slate-200/70 pb-1.5">
                <h4 className="font-title font-semibold text-slate-900 text-[12.5px] m-0">
                  2. Analisis Tagihan &amp; Proyeksi Penghematan
                </h4>
                <span className="text-[10.5px] font-medium text-emerald-700 font-code-metric">
                  Efisiensi -{effectiveCoveragePct}%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-slate-900/[0.03] border border-slate-200/70 space-y-1">
                  <span className="text-[10.5px] text-slate-500 block">Tagihan Sebelum PLTS</span>
                  <div className="font-title text-[16px] font-semibold text-slate-900 font-code-metric tabular-nums">
                    {idr.format(parameters.monthly_bill_idr)}
                    <span className="text-[11px] font-normal text-slate-400"> /bln</span>
                  </div>
                  <span className="text-[10.5px] text-slate-500 block font-code-metric">
                    Konsumsi ~{Math.round(parameters.monthly_bill_idr / assumptions.tariff_idr_per_kwh).toLocaleString("id-ID")} kWh/bln
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 space-y-1">
                  <span className="text-[10.5px] text-emerald-800 block">Estimasi Pasca PLTS</span>
                  <div className="font-title text-[16px] font-semibold text-emerald-800 font-code-metric tabular-nums">
                    {idr.format(effectiveNewBill)}
                    <span className="text-[11px] font-normal text-emerald-700"> /bln</span>
                  </div>
                  <span className="text-[10.5px] text-emerald-800 font-medium block font-code-metric">
                    Turun {idr.format(result.monthly_saving_idr)}/bln
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-900/[0.03] grid grid-cols-3 print:grid-cols-3 divide-x divide-slate-900/[0.08] py-2.5 text-center">
                <div className="px-2">
                  <span className="text-[10px] text-slate-500 block">Hemat Tahun 1</span>
                  <span className="text-[12.5px] font-semibold text-slate-900 font-code-metric tabular-nums block mt-0.5">
                    {idr.format(result.annual_saving_idr)}
                  </span>
                </div>
                <div className="px-2">
                  <span className="text-[10px] text-slate-500 block">Akumulasi 25 Tahun</span>
                  <span className="text-[12.5px] font-semibold text-emerald-700 font-code-metric tabular-nums block mt-0.5">
                    {idr.format(effectiveCumulative25)}
                  </span>
                </div>
                <div className="px-2">
                  <span className="text-[10px] text-slate-500 block">Balik Modal &amp; IRR</span>
                  <span className="text-[12.5px] font-semibold text-slate-900 font-code-metric tabular-nums block mt-0.5">
                    {paybackYearsText(result.payback_years)} ({irr}%)
                  </span>
                </div>
              </div>
            </section>

            {/* 6. Section 3: Estimasi Investasi (CAPEX) */}
            <section className="proposal-section-block break-inside-avoid print:break-inside-avoid space-y-2">
              <div className="flex items-baseline justify-between border-b border-slate-200/70 pb-1.5">
                <h4 className="font-title font-semibold text-slate-900 text-[12.5px] m-0">
                  3. Estimasi Investasi Turnkey (CAPEX)
                </h4>
                <span className="text-[11px] font-semibold text-slate-800 font-code-metric tabular-nums">
                  {idr.format(result.capex_total_idr)}
                </span>
              </div>

              <table className="w-full text-[11px] text-left border border-slate-200/80 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="py-2 px-3 font-semibold">Komponen</th>
                    <th className="py-2 px-3 font-semibold">Spesifikasi</th>
                    <th className="py-2 px-3 text-right font-semibold">Estimasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-900">Modul Surya</td>
                    <td className="py-2 px-3 text-slate-500">
                      {integer.format(result.installed)} × Tier-1 Mono {modulePower} Wp
                    </td>
                    <td className="py-2 px-3 text-right font-code-metric tabular-nums font-medium text-slate-800">
                      {idr.format(assumptions.capex_breakdown.modules_idr)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-900">Inverter &amp; Proteksi</td>
                    <td className="py-2 px-3 text-slate-500">
                      {parameters.inverter_type === "micro" ? "Microinverter IP67" : "String Inverter On-Grid"} + SPD AC/DC
                    </td>
                    <td className="py-2 px-3 text-right font-code-metric tabular-nums font-medium text-slate-800">
                      {idr.format(assumptions.capex_breakdown.inverter_idr)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-900">Racking Aluminium</td>
                    <td className="py-2 px-3 text-slate-500">AL6005-T5 Anodized tahan korosi</td>
                    <td className="py-2 px-3 text-right font-code-metric tabular-nums font-medium text-slate-800">
                      {idr.format(assumptions.capex_breakdown.racking_idr)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-900">Instalasi &amp; SLO</td>
                    <td className="py-2 px-3 text-slate-500">Pemasangan, uji kelayakan PUIL 2020 &amp; perizinan</td>
                    <td className="py-2 px-3 text-right font-code-metric tabular-nums font-medium text-slate-800">
                      {idr.format(assumptions.capex_breakdown.installation_idr)}
                    </td>
                  </tr>
                  <tr className="bg-amber-50/75 font-semibold border-t border-amber-200/80">
                    <td className="py-2.5 px-3 text-slate-950" colSpan={2}>
                      Total Estimasi Investasi
                    </td>
                    <td className="py-2.5 px-3 text-right font-code-metric tabular-nums text-amber-950">
                      {idr.format(result.capex_total_idr)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* 7. Section 4: Dampak Lingkungan & Standar Kepatuhan */}
            <section className="proposal-section-block break-inside-avoid print:break-inside-avoid space-y-3">
              <div className="flex items-baseline justify-between border-b border-slate-200/70 pb-1.5">
                <h4 className="font-title font-semibold text-slate-900 text-[12.5px] m-0">
                  4. Dampak Lingkungan (ISO 14064) &amp; Standar Mutu
                </h4>
                <span className="text-[10px] text-slate-400">Faktor emisi Grid Jamali 0,80 kg CO₂/kWh</span>
              </div>

              <div className="rounded-2xl bg-emerald-50/60 border border-emerald-200/70 grid grid-cols-2 print:grid-cols-2 divide-x divide-emerald-200/60 p-3">
                <div className="pr-3">
                  <span className="text-[10.5px] text-emerald-800 block">Reduksi Emisi CO₂</span>
                  <span className="font-title text-sm font-semibold text-emerald-950 font-code-metric tabular-nums">
                    {decimal.format(result.co2_reduction_kg_per_year / 1000)} ton / tahun
                  </span>
                  <span className="text-[10px] text-slate-500 block font-code-metric">
                    25 thn: ~{decimal.format((result.co2_reduction_kg_per_year * 25) / 1000)} ton CO₂
                  </span>
                </div>
                <div className="pl-3">
                  <span className="text-[10.5px] text-emerald-800 block">Setara Serapan Pohon</span>
                  <span className="font-title text-sm font-semibold text-emerald-950 font-code-metric tabular-nums">
                    {integer.format(result.trees_equivalent)} pohon / tahun
                  </span>
                  <span className="text-[10px] text-slate-500 block font-code-metric">
                    25 thn: ~{integer.format(result.trees_equivalent * 25)} pohon
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-900/[0.025] px-4 py-3 text-[10.5px] text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800">Rujukan Standar &amp; Garansi Sistem</div>
                <p className="m-0">
                  • <strong>Modul Surya (IEC 61215 / 61730):</strong> Garansi daya linier 25 tahun (≥ 84,8% di tahun ke-25).
                </p>
                <p className="m-0">
                  • <strong>Inverter &amp; Interkoneksi (IEEE 1547):</strong> Garansi resmi 10 tahun &amp; pemutusan otomatis saat padam.
                </p>
                <p className="m-0">
                  • <strong>Keselamatan &amp; Regulasi:</strong> Mengacu PUIL 2020 (SNI 0225:2020) dan Permen ESDM No. 2/2024.
                </p>
              </div>
            </section>

            {/* 8. Sign-off */}
            <footer className="proposal-section-block break-inside-avoid print:break-inside-avoid pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row print:flex-row justify-between items-start sm:items-center print:items-center gap-2 text-[10px] text-slate-400">
              <span>Disiapkan otomatis oleh SunSight Studio · Data klimatologi Bogor &amp; NASA POWER</span>
              <span className="font-medium text-slate-500">SunSight · Solusi PLTS Atap Indonesia</span>
            </footer>
          </article>
        </div>

        {/* Modal Bottom Action Bar (Frosted Glass + Soft Radiant Glow CTA - Hidden on print) */}
        <div className="px-6 py-3.5 border-t border-slate-900/[0.06] bg-white/80 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-2 print:hidden">
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-amber-600">info</span>
            <span>Pilih <em>“Save as PDF”</em> pada dialog cetak peramban untuk menyimpan berkas.</span>
          </span>
          <button
            type="button"
            onClick={printProposal}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 hover:brightness-105 active:scale-[0.98] text-amber-950 font-title text-xs font-semibold shadow-[0_6px_18px_rgba(245,158,11,0.22),inset_0_1px_1px_rgba(255,255,255,0.88)] border border-amber-300/80 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px] text-amber-950">print</span>
            <span>Cetak / Unduh PDF</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modalNode, document.body);
}
