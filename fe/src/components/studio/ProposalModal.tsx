"use client";

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
  residential: "Residensial (Rumah Tinggal)",
  commercial: "Komersial (Ruko / Gedung Usaha)",
  industrial: "Industri (Gudang / Fasilitas Pabrik)",
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

  const documentNo = `SS-PROP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.abs(
    Math.round(Number(latitude) * 100) + Math.round(Number(longitude) * 100)
  ).toString().slice(-4)}`;

  const printProposal = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/45 backdrop-blur-md print:static print:block print:w-full print:h-auto print:overflow-visible print:bg-transparent print:p-0 print:m-0">
      <div className="relative w-full max-w-3xl bg-[#FAF9F5]/95 backdrop-blur-2xl rounded-3xl shadow-[0_24px_70px_rgba(245,158,11,0.16),0_4px_24px_rgba(0,0,0,0.06)] border border-amber-200/80 overflow-hidden flex flex-col max-h-[92vh] print:static print:block print:w-full print:max-w-none print:h-auto print:max-h-none print:overflow-visible print:shadow-none print:border-0 print:rounded-none print:bg-transparent print:p-0 print:m-0">
        {/* Modal Top Bar (Frosted Glass - Hidden on print) */}
        <div className="p-3.5 px-6 border-b border-amber-200/60 flex items-center justify-between bg-white/80 backdrop-blur-xl print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-amber-100/90 text-amber-800 flex items-center justify-center shadow-2xs border border-amber-200/70">
              <span className="material-symbols-outlined text-[19px]">description</span>
            </span>
            <div>
              <h3 className="font-title font-extrabold text-slate-900 text-sm leading-tight m-0">
                Proposal &amp; Studi Kelayakan Teknis PLTS Atap
              </h3>
              <p className="text-[10.5px] text-slate-500 m-0">
                Pratinjau Dokumen Analisis Desain &amp; Investasi Finansial
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-amber-50 active:scale-95 transition cursor-pointer border border-transparent hover:border-amber-200/60"
            title="Tutup Pratinjau"
            aria-label="Tutup Pratinjau"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Printable Document Sheet */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-amber-50/25 flex justify-center items-start print:static print:block print:w-full print:h-auto print:overflow-visible print:bg-transparent print:p-0 print:m-0">
          <div className="w-full max-w-2xl bg-white/95 backdrop-blur-md shadow-xl border border-amber-200/80 p-6 sm:p-8 rounded-2xl text-slate-900 text-xs space-y-5 print:max-w-none print:w-full print:border print:border-amber-200/70 print:shadow-none print:p-6 print:rounded-2xl print:bg-white print:space-y-4 print:text-slate-900">
            {/* 1. Header & Letterhead Resmi SunSight */}
            <div className="proposal-section-block break-inside-avoid print:break-inside-avoid flex flex-col sm:flex-row print:flex-row items-start sm:items-center print:items-center justify-between border-b pb-4 border-amber-200/60 gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.svg" alt="SunSight Logo" className="h-7 w-auto" />
                  <div>
                    <span className="font-title font-extrabold text-slate-950 text-base tracking-tight block">
                      SunSight Solar Engine
                    </span>
                    <span className="text-[9.5px] text-amber-800 font-bold tracking-wider uppercase block">
                      Kajian Kelayakan Teknis &amp; Finansial PLTS Atap
                    </span>
                  </div>
                </div>
              </div>
              <div className="sm:text-right print:text-right space-y-0.5">
                <span className="inline-block text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold font-code-metric">
                  ANALISIS TERVERIFIKASI
                </span>
                <p className="text-[10px] font-mono text-slate-500 m-0 pt-0.5">
                  No. Dokumen: <strong>{documentNo}</strong>
                </p>
                <p className="text-[9.5px] text-slate-400 m-0">
                  Tanggal Cetak: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>

            {/* 2. Profil Pemohon & Lokasi Properti */}
            <div className="proposal-section-block break-inside-avoid print:break-inside-avoid rounded-2xl bg-[#FAF9F5]/90 backdrop-blur-md p-4 border border-amber-200/60 flex flex-col sm:flex-row print:flex-row sm:justify-between print:justify-between gap-3 shadow-2xs">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider block">
                  Identitas Pemohon &amp; Karakteristik Properti
                </span>
                <p className="font-title font-extrabold text-slate-950 text-sm m-0">
                  {biodata?.name || "Pemohon Studi Kelayakan"}
                </p>
                <p className="text-[11px] font-medium text-slate-600 m-0 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-amber-600">apartment</span>
                  <span>{PROPERTY_LABELS[biodata?.propertyType ?? "residential"] ?? "Rumah Tinggal (Residensial)"}</span>
                </p>
                <p className="text-[10.5px] text-slate-500 m-0 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-slate-400">location_on</span>
                  <span>{biodata?.location || `Titik Koordinat: ${latitude}, ${longitude}`}</span>
                </p>
              </div>
              <div className="sm:text-right print:text-right space-y-1 sm:border-l print:border-l sm:border-amber-200/50 print:border-amber-200/50 sm:pl-4 print:pl-4 text-[11px] text-slate-700">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Data Kelistrikan PLN Eksisting
                </span>
                <p className="m-0 font-bold text-slate-900">
                  Golongan: <span className="text-amber-800">{assumptions.tariff_label}</span>
                </p>
                <p className="m-0 text-slate-600 font-code-metric">
                  Tarif Listrik: <strong>Rp {assumptions.tariff_idr_per_kwh.toLocaleString("id-ID")}/kWh</strong>
                </p>
                <p className="m-0 text-slate-600 font-code-metric">
                  Tagihan Rekening: <strong>{idr.format(parameters.monthly_bill_idr)}/bln</strong>
                </p>
              </div>
            </div>

            {/* 3. Executive KPI Strip (4 Kolom Terukur Presisi) */}
            <div className="proposal-section-block break-inside-avoid print:break-inside-avoid grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 shadow-2xs flex flex-col justify-between h-20">
                <span className="text-[8.5px] font-bold text-amber-800 uppercase tracking-wider block">
                  Kapasitas Terpasang
                </span>
                <span className="font-title text-base font-extrabold text-amber-950 block font-code-metric">
                  {decimal.format(result.capacity_kwp)} kWp
                </span>
                <span className="text-[9px] text-slate-500 font-medium">
                  {integer.format(result.installed)} Modul ({modulePower}W)
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200/80 shadow-2xs flex flex-col justify-between h-20">
                <span className="text-[8.5px] font-bold text-sky-800 uppercase tracking-wider block">
                  Produksi Tahunan
                </span>
                <span className="font-title text-base font-extrabold text-sky-950 block font-code-metric">
                  ~{(result.annual_production_kwh / 1000).toFixed(1)} MWh
                </span>
                <span className="text-[9px] text-slate-500 font-medium font-code-metric">
                  ~{effectiveMonthlyKwh.toLocaleString("id-ID")} kWh / bln
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-2xs flex flex-col justify-between h-20">
                <span className="text-[8.5px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Porsi Hemat Tagihan
                </span>
                <span className="font-title text-base font-extrabold text-emerald-950 block font-code-metric">
                  -{effectiveCoveragePct}%
                </span>
                <span className="text-[9px] text-emerald-800 font-medium font-code-metric">
                  {idr.format(result.monthly_saving_idr)} / bln
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200/80 shadow-2xs flex flex-col justify-between h-20">
                <span className="text-[8.5px] font-bold text-teal-800 uppercase tracking-wider block">
                  Periode Balik Modal
                </span>
                <span className="font-title text-base font-extrabold text-teal-950 block font-code-metric">
                  {paybackYearsText(result.payback_years)}
                </span>
                <span className="text-[9px] text-teal-800 font-medium font-code-metric">
                  IRR: {irr}% / tahun
                </span>
              </div>
            </div>

            {/* 4. Bagian 1: Spesifikasi Konfigurasi & Desain Bidang Atap */}
            <div className="proposal-section-block break-inside-avoid print:break-inside-avoid space-y-2 pt-1">
              <div className="flex items-center justify-between border-b border-amber-200/50 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-[11px]">
                    1
                  </span>
                  <h4 className="font-title font-bold text-slate-900 text-xs m-0">
                    Spesifikasi Teknis &amp; Konfigurasi Bidang Atap
                  </h4>
                </div>
                <span className="text-[9.5px] text-slate-500 font-medium">
                  {activeFacetName} ({totalFacetsCount} Bidang Proyek)
                </span>
              </div>

              <div className="grid grid-cols-2 print:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex justify-between items-center">
                  <span className="text-slate-500">Total Luas Bidang Atap</span>
                  <span className="font-bold text-slate-900 font-code-metric">
                    {decimal.format(result.total_area_sqm)} m²
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex justify-between items-center">
                  <span className="text-slate-500">Luas Efektif Terpasang</span>
                  <span className="font-bold text-emerald-800 font-code-metric">
                    {decimal.format(result.effective_area_sqm)} m²
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex justify-between items-center">
                  <span className="text-slate-500">Tipe Modul Fotovoltaik</span>
                  <span className="font-bold text-slate-900">
                    Tier-1 Mono PERC Bifacial {modulePower}W
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex justify-between items-center">
                  <span className="text-slate-500">Orientasi &amp; Kemiringan</span>
                  <span className="font-bold text-slate-900 font-code-metric">
                    Kemiringan {parameters.tilt_deg}° • Azimuth {parameters.azimuth_deg}°
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex justify-between items-center">
                  <span className="text-slate-500">Sistem Inverter</span>
                  <span className="font-bold text-slate-900">
                    {parameters.inverter_type === "micro"
                      ? "Microinverter Terdistribusi"
                      : "Central String Inverter On-Grid"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex justify-between items-center">
                  <span className="text-slate-500">Performance Ratio (PR)</span>
                  <span className="font-bold text-emerald-700 font-code-metric">
                    {(assumptions.performance_ratio * 100).toFixed(0)}% (Efisiensi Sistem)
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Bagian 2: Analisis Rekening & Penghematan Finansial (Grid Rapi Sejajar Rata) */}
            <div className="proposal-section-block break-inside-avoid print:break-inside-avoid space-y-2.5 pt-1">
              <div className="flex items-center justify-between border-b border-amber-200/50 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-[11px]">
                    2
                  </span>
                  <h4 className="font-title font-bold text-slate-900 text-xs m-0">
                    Analisis Tagihan Listrik &amp; Proyeksi Penghematan
                  </h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-code-metric">
                  Efisiensi: -{effectiveCoveragePct}%
                </span>
              </div>

              {/* Komparasi 2 Kolom Berimbang Presisi */}
              <div className="grid grid-cols-2 print:grid-cols-2 gap-3 text-xs">
                {/* Sebelum PLTS */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between h-24">
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                      Beban Listrik Eksisting (Sebelum PLTS)
                    </span>
                    <div className="font-title text-base font-extrabold text-slate-900 font-code-metric mt-1">
                      {idr.format(parameters.monthly_bill_idr)}
                      <span className="text-[10px] font-normal text-slate-500 ml-1">/ bulan</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 font-code-metric pt-1 border-t border-slate-200/60">
                    Konsumsi Energi: ~{Math.round(parameters.monthly_bill_idr / assumptions.tariff_idr_per_kwh).toLocaleString("id-ID")} kWh / bln
                  </div>
                </div>

                {/* Sesudah PLTS */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between h-24">
                  <div>
                    <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider block">
                      Estimasi Tagihan Baru (Pasca PLTS)
                    </span>
                    <div className="font-title text-base font-extrabold text-emerald-700 font-code-metric mt-1">
                      {idr.format(effectiveNewBill)}
                      <span className="text-[10px] font-normal text-emerald-800 ml-1">/ bulan</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-800 font-bold font-code-metric pt-1 border-t border-emerald-200/60">
                    Turun {idr.format(result.monthly_saving_idr)} / bulan (-{effectiveCoveragePct}%)
                  </div>
                </div>
              </div>

              {/* 3 Metrik Finansial Sejajar Rata (Equal Height 3-Columns) */}
              <div className="grid grid-cols-3 print:grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-[#FAF9F5] border border-amber-200/60 flex flex-col justify-between h-20 text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Penghematan 1 Tahun
                  </span>
                  <span className="font-title text-sm font-extrabold text-slate-900 font-code-metric">
                    {idr.format(result.annual_saving_idr)}
                  </span>
                  <span className="text-[8.5px] text-slate-400">Tahun pertama operasi</span>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 flex flex-col justify-between h-20 text-center">
                  <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider">
                    Akumulasi 25 Tahun
                  </span>
                  <span className="font-title text-sm font-extrabold text-emerald-800 font-code-metric">
                    {idr.format(effectiveCumulative25)}
                  </span>
                  <span className="text-[8.5px] text-emerald-700">Masa produktif panel</span>
                </div>

                <div className="p-3 rounded-2xl bg-teal-50/60 border border-teal-200/70 flex flex-col justify-between h-20 text-center">
                  <span className="text-[9px] font-bold text-teal-800 uppercase tracking-wider">
                    Periode Balik Modal (BEP)
                  </span>
                  <span className="font-title text-sm font-extrabold text-teal-800 font-code-metric">
                    {paybackYearsText(result.payback_years)}
                  </span>
                  <span className="text-[8.5px] text-teal-700">Estimasi IRR {irr}%</span>
                </div>
              </div>
            </div>

            {/* 6. Bagian 3: Rincian Anggaran Investasi Awal (Turnkey CAPEX) */}
            <div className="proposal-section-block break-inside-avoid print:break-inside-avoid space-y-2 pt-1">
              <div className="flex items-center justify-between border-b border-amber-200/50 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-[11px]">
                    3
                  </span>
                  <h4 className="font-title font-bold text-slate-900 text-xs m-0">
                    Rincian Anggaran Investasi Turnkey (CAPEX)
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-slate-700 font-code-metric">
                  Total: {idr.format(result.capex_total_idr)}
                </span>
              </div>

              <table className="w-full text-[11px] text-left border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-2.5 font-bold">Komponen Sistem PLTS</th>
                    <th className="p-2.5 font-bold">Deskripsi Pekerjaan &amp; Material</th>
                    <th className="p-2.5 text-right font-bold">Nilai Estimasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2.5 font-semibold text-slate-900">Modul Surya Fotovoltaik</td>
                    <td className="p-2.5 text-slate-500">
                      {integer.format(result.installed)} Unit Modul Surya Tier-1 {modulePower}W Monokristalin Bifacial
                    </td>
                    <td className="p-2.5 text-right font-code-metric font-semibold text-slate-800">
                      {idr.format(assumptions.capex_breakdown.modules_idr)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-slate-900">Inverter &amp; Proteksi AC/DC</td>
                    <td className="p-2.5 text-slate-500">
                      {parameters.inverter_type === "micro" ? "Microinverter Enphase IP67" : "Central String Inverter On-Grid"} + Panel SPD &amp; MCB
                    </td>
                    <td className="p-2.5 text-right font-code-metric font-semibold text-slate-800">
                      {idr.format(assumptions.capex_breakdown.inverter_idr)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-slate-900">Racking &amp; Bracket Aluminium</td>
                    <td className="p-2.5 text-slate-500">
                      Struktur Penopang Aluminium Anodized AL6005-T5 Tahan Cuaca Tropis
                    </td>
                    <td className="p-2.5 text-right font-code-metric font-semibold text-slate-800">
                      {idr.format(assumptions.capex_breakdown.racking_idr)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-slate-900">Rekayasa, Instalasi &amp; SLO</td>
                    <td className="p-2.5 text-slate-500">
                      Jasa Instalasi Kelistrikan, Pengujian, Sertifikasi Laik Operasi &amp; Net-Metering
                    </td>
                    <td className="p-2.5 text-right font-code-metric font-semibold text-slate-800">
                      {idr.format(assumptions.capex_breakdown.installation_idr)}
                    </td>
                  </tr>
                  <tr className="bg-amber-50/70 font-bold border-t-2 border-amber-300">
                    <td className="p-2.5 text-slate-950 font-title text-xs" colSpan={2}>
                      Total Estimasi Investasi Turnkey
                    </td>
                    <td className="p-2.5 text-right font-code-metric text-amber-950 text-xs">
                      {idr.format(result.capex_total_idr)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 7. Bagian 4: Dampak Dekarbonisasi & Nilai Keberlanjutan (ESG) */}
            <div className="proposal-section-block break-inside-avoid print:break-inside-avoid space-y-2 pt-1">
              <div className="flex items-center gap-1.5 border-b border-amber-200/50 pb-1.5">
                <span className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-[11px]">
                  4
                </span>
                <h4 className="font-title font-bold text-slate-900 text-xs m-0">
                  Dampak Dekarbonisasi &amp; Keberlanjutan Lingkungan (ESG)
                </h4>
              </div>

              <div className="grid grid-cols-2 print:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">co2</span>
                  </span>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                      Reduksi Emisi Karbon CO₂
                    </span>
                    <span className="font-title text-sm font-extrabold text-emerald-800 font-code-metric">
                      {decimal.format(result.co2_reduction_kg_per_year / 1000)} Ton / tahun
                    </span>
                    <span className="text-[9px] text-slate-400 block font-code-metric">
                      Kumulatif 25 Thn: ~{decimal.format((result.co2_reduction_kg_per_year * 25) / 1000)} Ton CO₂
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">forest</span>
                  </span>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                      Serapan Karbon Ekuivalen Pohon
                    </span>
                    <span className="font-title text-sm font-extrabold text-teal-800 font-code-metric">
                      {integer.format(result.trees_equivalent)} Pohon / tahun
                    </span>
                    <span className="text-[9px] text-slate-400 block font-code-metric">
                      Kumulatif 25 Thn: ~{integer.format(result.trees_equivalent * 25)} Pohon
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 8. Jaminan Mutu & Standar Kualitas */}
            <div className="proposal-section-block break-inside-avoid print:break-inside-avoid rounded-2xl bg-[#FAF9F5] p-3.5 border border-amber-200/60 text-[10.5px] space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px]">
                <span className="material-symbols-outlined text-amber-600 text-[16px]">verified</span>
                <span>Standar Mutu &amp; Ketentuan Garansi Sistem:</span>
              </div>
              <ul className="list-disc pl-4 text-slate-600 space-y-0.5 leading-relaxed text-[10px]">
                <li>
                  <strong>Garansi Kinerja Modul Surya:</strong> 25 Tahun jaminan penurunan degradasi linier pabrikan (daya keluaran tetap ≥ 84.8% pada akhir tahun ke-25).
                </li>
                <li>
                  <strong>Garansi Unit Inverter:</strong> 10 Tahun garansi penggantian unit atau servis resmi pabrikan bersertifikasi kelistrikan.
                </li>
                <li>
                  <strong>Kepatuhan Teknis Kelistrikan:</strong> Seluruh perakitan dirancang memenuhi standar keselamatan instalasi dan ketentuan paralel jaringan PLN.
                </li>
              </ul>
            </div>

            {/* 9. Sign-off & Catatan Penutup */}
            <div className="proposal-section-block break-inside-avoid print:break-inside-avoid pt-3 border-t border-slate-200 flex flex-col sm:flex-row print:flex-row justify-between items-start sm:items-center print:items-center gap-2 text-[9.5px] text-slate-400">
              <div>
                <span>Dihasilkan melalui analisis komputasi pemodelan SunSight Studio</span>
                <p className="m-0 text-slate-400">Data radiasi dihitung berdasarkan model klimatologi matahari Indonesia</p>
              </div>
              <div className="sm:text-right print:text-right font-medium text-slate-500">
                <span>Platform SunSight — Solusi Cerdas Tenaga Surya Indonesia</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar (Frosted Glass - Hidden on print) */}
        <div className="p-3.5 px-6 border-t border-amber-200/60 bg-white/80 backdrop-blur-xl flex items-center justify-between print:hidden">
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-amber-600">info</span>
            <span>Gunakan opsi <em>“Save as PDF”</em> pada dialog peramban untuk menyimpan dokumen.</span>
          </span>
          <button
            type="button"
            onClick={printProposal}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:brightness-105 active:scale-95 text-amber-950 font-title text-xs font-bold shadow-[0_2px_12px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.75)] border border-amber-300/80 transition flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px] text-amber-950">print</span>
            <span>Cetak / Unduh Proposal PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
