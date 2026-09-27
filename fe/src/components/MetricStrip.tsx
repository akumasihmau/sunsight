"use client";

import type { SimulationResult } from "@/lib/api";
import { decimal, idr, integer, paybackYearsText } from "@/lib/format";

type Props = {
  result: SimulationResult;
};

/** Empat metrik utama hasil simulasi. */
export function MetricStrip({ result }: Props) {
  const { energy, finance, layout } = result;

  const metrics = [
    {
      label: "Kapasitas terpasang",
      value: `${decimal.format(energy.capacity_kwp)} kWp`,
      hint: `${integer.format(layout.installed)} modul terpasang dari ${integer.format(layout.max_slots)} slot`,
    },
    {
      label: "Produksi tahunan",
      value: `${integer.format(energy.annual_production_kwh)} kWh`,
      hint: `${decimal.format(energy.daily_irradiance_kwh_per_sqm)} kWh/m²/hari dari ${energy.irradiance_source}`,
    },
    {
      label: "Penghematan bulanan",
      value: idr.format(finance.monthly_saving_idr),
      hint: `${idr.format(finance.annual_saving_idr)} per tahun, dibatasi tagihan bulanan`,
    },
    {
      label: "Payback",
      value: paybackYearsText(finance.payback_years),
      hint:
        finance.payback_years === null
          ? "Penghematan tahunan nol sehingga payback tidak dapat dihitung."
          : "CAPEX total dibagi penghematan tahunan.",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{metric.label}</p>
          <p className="mt-1 text-lg font-semibold text-sky-700 dark:text-sky-300">{metric.value}</p>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{metric.hint}</p>
        </div>
      ))}
    </div>
  );
}
