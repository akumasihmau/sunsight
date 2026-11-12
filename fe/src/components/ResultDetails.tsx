"use client";

import type { CapexBreakdown, SimulationAssumptions, SimulationResult } from "@/lib/api";
import { decimal, idr, integer } from "@/lib/format";

type CapexTableProps = {
  breakdown: CapexBreakdown;
  total: number;
};

/** Rincian CAPEX beserta totalnya; dipakai panel hasil studio dan detail riwayat. */
export function CapexTable({ breakdown, total }: CapexTableProps) {
  const rows = [
    { label: "Modul surya", value: breakdown.modules_idr },
    { label: "Inverter", value: breakdown.inverter_idr },
    { label: "Racking", value: breakdown.racking_idr },
    { label: "Instalasi", value: breakdown.installation_idr },
  ];

  return (
    <table className="data-table data-table--compact">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td>{row.label}</td>
            <td>{idr.format(row.value)}</td>
          </tr>
        ))}
        <tr className="is-total">
          <td>Total CAPEX</td>
          <td>{idr.format(total)}</td>
        </tr>
      </tbody>
    </table>
  );
}

type Props = {
  result: SimulationResult;
  assumptions: SimulationAssumptions;
};

/** Rincian agregat bidang, anggaran, dan asumsi dari satu hasil simulasi. */
export function ResultDetails({ result, assumptions }: Props) {
  const geometryRows = [
    { label: "Jumlah bidang", value: integer.format(result.roof_count) },
    { label: "Luas bidang", value: `${decimal.format(result.total_area_sqm)} m²` },
    { label: "Luas efektif", value: `${decimal.format(result.effective_area_sqm)} m²` },
    { label: "Slot maksimum", value: integer.format(result.max_slots) },
    { label: "Modul terpasang", value: integer.format(result.installed) },
    { label: "Luas modul", value: `${decimal.format(result.module_area_sqm)} m²` },
    { label: "Rasio kerapatan", value: decimal.format(result.density_ratio) },
  ];

  const assumptionRows = [
    {
      label: "Iradiasi harian rata-rata",
      value: `${decimal.format(assumptions.daily_irradiance_kwh_per_sqm)} kWh/m²/hari`,
    },
    {
      label: "Sumber iradiasi",
      value: `${assumptions.irradiance_source} · ${assumptions.irradiance_period}`,
    },
    { label: "Faktor sudut datang", value: decimal.format(assumptions.incidence_factor) },
    { label: "Performance ratio", value: decimal.format(assumptions.performance_ratio) },
    {
      label: "Golongan tarif",
      value: `${assumptions.tariff_label} · ${idr.format(assumptions.tariff_idr_per_kwh)}/kWh`,
    },
    {
      label: "Reduksi CO₂",
      value: `${decimal.format(result.co2_reduction_kg_per_year)} kg/tahun · setara ${integer.format(result.trees_equivalent)} pohon`,
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Bidang dan tata letak</h2>
          <p className="card__hint">Ukuran bidang yang ditandai, setelah setback, talang, dan kisi modul.</p>
        </div>
        <table className="data-table data-table--compact">
          <tbody>
            {geometryRows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Rincian CAPEX</h2>
          <p className="card__hint">Biaya modal awal sebagai dasar perhitungan payback.</p>
        </div>
        <CapexTable breakdown={assumptions.capex_breakdown} total={result.capex_total_idr} />
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Asumsi perhitungan</h2>
          <p className="card__hint">Nilai yang dipakai server pada perhitungan terakhir.</p>
        </div>
        <table className="data-table data-table--compact">
          <tbody>
            {assumptionRows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
