"use client";

import type { SimulationParameters, SimulationResult } from "@/lib/api";
import { decimal, idr, integer, paybackYearsText } from "@/lib/format";
import type { UserBiodata } from "@/lib/profile";

type Props = {
  open: boolean;
  onClose: () => void;
  result: SimulationResult;
  parameters: SimulationParameters;
  latitude: string;
  longitude: string;
  biodata: UserBiodata | null;
};

const PROPERTY_LABELS: Record<string, string> = {
  residential: "Rumah Tinggal",
  commercial: "Ruko / Komersial",
  industrial: "Pabrik / Industri",
};

export function ProposalModal({
  open,
  onClose,
  result,
  parameters,
  latitude,
  longitude,
  biodata,
}: Props) {
  if (!open) return null;

  const { geometry, layout, energy, finance } = result;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs print:static print:bg-white print:p-0">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-0">
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-amber-600 text-[22px]">
              picture_as_pdf
            </span>
            <h3 className="font-title font-bold text-slate-900 text-sm sm:text-base m-0">
              Pratinjau Proposal Studi Kelayakan PLTS
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Printable A4 Sheet */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/80 flex justify-center items-start print:bg-white print:p-0">
          <div className="w-full max-w-xl bg-white shadow-lg border border-slate-200 p-5 sm:p-7 rounded-xl text-slate-900 text-xs space-y-4 print:shadow-none print:border-0">
            {/* Document Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-4 border-slate-200 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.svg" alt="SunSight Logo" className="h-6 w-auto" />
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                    RINGKASAN SIMULASI RESMI
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 m-0">
                  Studi Kelayakan Teknis &amp; Finansial PLTS Atap (Dihitung Server SunSight)
                </p>
              </div>
              <div className="sm:text-right">
                <span className="font-semibold text-slate-700 tracking-tight">
                  KOORDINAT: {latitude}, {longitude}
                </span>
                <p className="text-[10px] text-slate-400 m-0">
                  Tanggal Cetak: {new Date().toLocaleDateString("id-ID")}
                </p>
              </div>
            </div>

            {/* Client Biodata & Location */}
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 flex flex-col sm:flex-row sm:justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Pemohon / Lokasi Properti
                </span>
                <p className="font-bold text-slate-900 text-xs m-0">
                  {biodata?.name || "Pengguna SunSight"} ·{" "}
                  {PROPERTY_LABELS[biodata?.propertyType ?? "residential"] ?? "Rumah Tinggal"}
                </p>
                <p className="text-[11px] text-slate-600 m-0">
                  {biodata?.location || `Titik Koordinat (${latitude}, ${longitude})`}
                </p>
                {biodata?.phone && (
                  <p className="text-[10.5px] text-slate-500 m-0">Kontak: {biodata.phone}</p>
                )}
              </div>
              <div className="sm:text-right text-[10.5px] text-slate-600 space-y-0.5">
                <p className="m-0">
                  Kemiringan: <strong>{parameters.tilt_deg}°</strong> · Azimuth:{" "}
                  <strong>{parameters.azimuth_deg}°</strong>
                </p>
                <p className="text-amber-700 font-semibold m-0">Tarif: {finance.tariff_label}</p>
                <p className="text-slate-500 m-0">
                  Inverter: {parameters.inverter_type === "micro" ? "Micro" : "String"} ·{" "}
                  {parameters.orientation === "landscape" ? "Lanskap" : "Potret"}
                </p>
              </div>
            </div>

            {/* Technical Specs Grid */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs mb-2 m-0 tracking-tight">
                1. Spesifikasi Geometri &amp; Produksi Energi
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex justify-between">
                  <span className="text-slate-500">Kapasitas Terpasang</span>
                  <span className="font-bold text-slate-900 tracking-tight">
                    {decimal.format(energy.capacity_kwp)} kWp ({integer.format(layout.installed)}{" "}
                    modul)
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex justify-between">
                  <span className="text-slate-500">Produksi Tahunan</span>
                  <span className="font-bold text-slate-900 tracking-tight">
                    {integer.format(energy.annual_production_kwh)} kWh/thn
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex justify-between">
                  <span className="text-slate-500">Luas Bidang / Efektif</span>
                  <span className="font-bold text-slate-900 tracking-tight">
                    {decimal.format(geometry.total_area_sqm)} /{" "}
                    {decimal.format(geometry.effective_area_sqm)} m²
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex justify-between">
                  <span className="text-slate-500">Susunan Kisi Modul</span>
                  <span className="font-bold text-slate-900 tracking-tight">
                    {integer.format(layout.rows)} baris × {integer.format(layout.columns)} kolom
                  </span>
                </div>
              </div>
            </div>

            {/* Financial & CAPEX Summary */}
            <div>
              <h4 className="font-title font-bold text-slate-900 text-xs mb-2 m-0">
                2. Rincian CAPEX &amp; Kelayakan Finansial
              </h4>
              <table className="w-full text-[11px] text-left border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-2">Komponen</th>
                    <th className="p-2 text-right">Nilai Server</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2 text-slate-600">Biaya Modul Surya</td>
                    <td className="p-2 text-right font-medium tracking-tight">
                      {idr.format(finance.capex_breakdown.modules_idr)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-slate-600">Biaya Inverter</td>
                    <td className="p-2 text-right font-medium tracking-tight">
                      {idr.format(finance.capex_breakdown.inverter_idr)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-slate-600">Biaya Racking &amp; Instalasi</td>
                    <td className="p-2 text-right font-medium tracking-tight">
                      {idr.format(
                        finance.capex_breakdown.racking_idr +
                          finance.capex_breakdown.installation_idr,
                      )}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="p-2 text-slate-900">Total CAPEX Investasi</td>
                    <td className="p-2 text-right font-bold text-slate-900 tracking-tight">
                      {idr.format(finance.capex_total_idr)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-slate-600">Penghematan Bulanan / Tahunan</td>
                    <td className="p-2 text-right font-bold text-emerald-700 tracking-tight">
                      {idr.format(finance.monthly_saving_idr)} /{" "}
                      {idr.format(finance.annual_saving_idr)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-slate-600">Masa Balik Modal (Payback)</td>
                    <td className="p-2 text-right font-bold text-amber-700 tracking-tight">
                      {paybackYearsText(finance.payback_years)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-slate-600">Dampak Ekologis Tahunan</td>
                    <td className="p-2 text-right font-bold text-emerald-700 tracking-tight">
                      {decimal.format(finance.co2_reduction_kg_per_year)} kg CO₂ ·{" "}
                      {integer.format(finance.trees_equivalent)} pohon
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Source Attribution */}
            <div className="pt-2 border-t border-slate-200 flex flex-wrap justify-between gap-2 text-[10px] text-slate-400">
              <span>
                Sumber Iradiasi: {energy.irradiance_source} ({energy.irradiance_period}) · PR{" "}
                {decimal.format(energy.performance_ratio)}
              </span>
              <span>SunSight Platform — Seluruh angka dihitung oleh server</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-200 bg-white flex items-center justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-95 text-amber-950 font-title text-xs font-bold shadow-xs border border-amber-300 transition flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-950">print</span>
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}

