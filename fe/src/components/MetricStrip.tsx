"use client";

import type { SimulationAssumptions, SimulationResult } from "@/lib/api";
import { decimal, idr, integer, paybackYearsText } from "@/lib/format";

type Props = {
  result: SimulationResult;
  assumptions: SimulationAssumptions;
};

/** Empat metrik utama hasil simulasi. */
export function MetricStrip({ result, assumptions }: Props) {
  const metrics = [
    {
      label: "Kapasitas terpasang",
      value: `${decimal.format(result.capacity_kwp)} kWp`,
      hint: `${integer.format(result.installed)} modul terpasang dari ${integer.format(result.max_slots)} slot`,
      empty: false,
    },
    {
      label: "Produksi tahunan",
      value: `${integer.format(result.annual_production_kwh)} kWh`,
      hint: `${decimal.format(assumptions.daily_irradiance_kwh_per_sqm)} kWh/m²/hari dari ${assumptions.irradiance_source}`,
      empty: false,
    },
    {
      label: "Penghematan bulanan",
      value: idr.format(result.monthly_saving_idr),
      hint: `${idr.format(result.annual_saving_idr)} per tahun, dibatasi tagihan bulanan`,
      empty: false,
    },
    {
      label: "Payback",
      value: paybackYearsText(result.payback_years),
      hint:
        result.payback_years === null
          ? "Penghematan tahunan nol sehingga payback tidak dapat dihitung."
          : "CAPEX total dibagi penghematan tahunan.",
      // Tanpa modul terpasang tidak ada yang bisa dibayar kembali; nilainya
      // ditampilkan sebagai tanda pisah, bukan sebagai angka.
      empty: result.payback_years === null,
    },
  ];

  return (
    <div className="stat-grid">
      {metrics.map((metric) => (
        <article key={metric.label} className="stat">
          <p className="stat__label">{metric.label}</p>
          <p className={metric.empty ? "stat__value stat__value--empty" : "stat__value"}>
            {metric.value}
          </p>
          <p className="stat__hint">{metric.hint}</p>
        </article>
      ))}
    </div>
  );
}
