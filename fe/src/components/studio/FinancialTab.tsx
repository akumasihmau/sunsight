"use client";

import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

import { formatRp } from "@/lib/format";
import type { InverterType } from "@/lib/studioPhysics";

export interface FinancialTabCalc {
  coveragePct: number;
  newMonthlyBill: number;
  cappedSaving: number;
  annualSaving: number;
  cumulative25: number;
  paybackYears: number | null;
  totalCapex: number;
  totalModulesFitted: number;
  costModules: number;
  costInverter: number;
  costRacking: number;
  costInstall: number;
  irr: number;
}

export interface FinancialTabProps {
  plnTariff: number;
  setPlnTariff: (rate: number) => void;
  monthlyBill: number;
  setMonthlyBill: (bill: number) => void;
  isTypingBill: boolean;
  setIsTypingBill: (typing: boolean) => void;
  manualBillInput: string;
  setManualBillInput: (val: string) => void;
  modulePower: number;
  inverterType: InverterType;
  calc: FinancialTabCalc;
  hasValidBep: boolean;
  chartW: number;
  chartH: number;
  chartPadLeft: number;
  plotW: number;
  chartMaxYear: number;
  chartQuickYears: number[];
  currentInspectYear: number;
  currentInspectCashFlow: number;
  effectiveBep: number;
  bepRatio: number;
  zeroY: number;
  deficitFillD: string;
  profitFillD: string;
  curvePathD: string;
  mapChartX: (t: number) => number;
  mapChartY: (v: number) => number;
  onChartPointer: (
    e: ReactMouseEvent<HTMLDivElement> | ReactPointerEvent<HTMLDivElement>
  ) => void;
  onSelectInspectYear: (yr: number | null) => void;
  capexCollapsed: boolean;
  onToggleCapexCollapsed: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
  openedSimulationId: number | null;
  onSave: () => void;
  onOpenProposal: () => void;
  onRequestEpcQuote: () => void;
}

export function FinancialTab({
  plnTariff,
  setPlnTariff,
  monthlyBill,
  setMonthlyBill,
  isTypingBill,
  setIsTypingBill,
  manualBillInput,
  setManualBillInput,
  modulePower,
  inverterType,
  calc,
  hasValidBep,
  chartW,
  chartH,
  chartPadLeft,
  plotW,
  chartMaxYear,
  chartQuickYears,
  currentInspectYear,
  currentInspectCashFlow,
  effectiveBep,
  bepRatio,
  zeroY,
  deficitFillD,
  profitFillD,
  curvePathD,
  mapChartX,
  mapChartY,
  onChartPointer,
  onSelectInspectYear,
  capexCollapsed,
  onToggleCapexCollapsed,
  isSaving,
  saveSuccess,
  openedSimulationId,
  onSave,
  onOpenProposal,
  onRequestEpcQuote,
}: FinancialTabProps) {
  return (
    <div id="studio-pane-financials" className="p-3.5 space-y-3">
      {/* 1. Tarif & Tagihan PLN */}
      <div className="rounded-2xl bg-white/80 backdrop-blur-xl p-3.5 border border-white/90 shadow-[0_4px_20px_rgba(15,23,42,0.04),0_2px_10px_rgba(253,224,71,0.08),inset_0_1px_1px_rgba(255,255,255,0.92)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-title text-xs font-semibold text-slate-900">
            Tarif &amp; Tagihan PLN
          </span>
          <span className="text-[11px] font-semibold text-amber-800 font-code-metric">
            {plnTariff ? `Rp ${Number(plnTariff).toLocaleString("id-ID")}/kWh` : ""}
          </span>
        </div>

        <select
          value={plnTariff}
          onChange={(e) => setPlnTariff(Number(e.target.value))}
          className="w-full p-2.5 rounded-xl bg-slate-900/[0.035] text-xs font-medium text-slate-900 cursor-pointer focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-300/60 transition"
        >
          <option value="1700">R-2 / TR (3.500–5.500 VA) — Rp 1.700/kWh</option>
          <option value="1444.7">R-1 / TR (1.300–2.200 VA) — Rp 1.444,70/kWh</option>
          <option value="1699.53">R-3 / TR (&gt; 6.600 VA) — Rp 1.699,53/kWh</option>
          <option value="1444.7">B-2 / TR (Bisnis Menengah) — Rp 1.444,70/kWh</option>
          <option value="1114.74">B-3 / TM (Bisnis Besar) — Rp 1.114,74/kWh</option>
          <option value="1114.74">I-3 / TM (Industri) — Rp 1.114,74/kWh</option>
          <option value="996.74">I-4 / TT (Industri Besar) — Rp 996,74/kWh</option>
        </select>

        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-slate-600">Tagihan Bulanan</label>
            <span className="text-[10px] text-slate-400">
              ~{Math.round(monthlyBill / plnTariff).toLocaleString("id-ID")} kWh/bln
            </span>
          </div>

          <div className="relative flex items-center">
            <span className="absolute left-3 text-xs font-semibold text-amber-800 select-none">
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={isTypingBill ? manualBillInput : monthlyBill.toLocaleString("id-ID")}
              onFocus={() => {
                setIsTypingBill(true);
                setManualBillInput(monthlyBill.toString());
              }}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setManualBillInput(raw);
                const num = Number(raw);
                if (!isNaN(num) && num > 0) {
                  setMonthlyBill(Math.min(100_000_000, num));
                }
              }}
              onBlur={() => {
                setIsTypingBill(false);
                const num = Number(manualBillInput.replace(/\D/g, ""));
                if (!isNaN(num) && num >= 100_000) {
                  setMonthlyBill(Math.min(100_000_000, Math.max(100_000, num)));
                } else if (!num) {
                  setMonthlyBill(500_000);
                }
              }}
              className="w-full pl-9 pr-14 py-2 rounded-xl bg-slate-900/[0.035] focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-300/60 text-right font-code-metric text-sm font-bold text-slate-900 transition"
              placeholder="2.800.000"
            />
            <span className="absolute right-3 text-[10px] text-slate-400 font-medium select-none">
              / bln
            </span>
          </div>

          <input
            type="range"
            min="500000"
            max="100000000"
            step="250000"
            value={monthlyBill}
            onChange={(e) => {
              const val = Number(e.target.value);
              setMonthlyBill(val);
              setManualBillInput(val.toString());
            }}
            className="w-full h-1.5 bg-slate-200/80 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />

          <div className="grid grid-cols-4 gap-1 font-code-metric text-[10px]">
            {[
              { label: "2 Jt", val: 2_000_000 },
              { label: "5 Jt", val: 5_000_000 },
              { label: "15 Jt", val: 15_000_000 },
              { label: "50 Jt", val: 50_000_000 },
            ].map((preset) => (
              <button
                key={preset.val}
                type="button"
                onClick={() => {
                  setMonthlyBill(preset.val);
                  setManualBillInput(preset.val.toString());
                }}
                className={`py-1 rounded-full font-medium transition cursor-pointer ${
                  monthlyBill === preset.val
                    ? "bg-amber-100 text-amber-950 font-semibold"
                    : "bg-slate-900/[0.03] text-slate-600 hover:bg-slate-900/[0.06]"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Penghematan & Proyeksi Arus Kas */}
      <div className="rounded-2xl bg-white/80 backdrop-blur-xl p-3.5 border border-white/90 shadow-[0_4px_20px_rgba(15,23,42,0.04),0_2px_10px_rgba(253,224,71,0.08),inset_0_1px_1px_rgba(255,255,255,0.92)] space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="font-title text-xs font-semibold text-slate-900">
            Penghematan &amp; Arus Kas
          </span>
          <span
            className={`text-[11px] font-semibold font-code-metric ${
              calc.coveragePct > 0 ? "text-emerald-700" : "text-slate-400"
            }`}
          >
            {calc.coveragePct > 0 ? `Hemat ${calc.coveragePct}%` : "0% PLTS"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-900/[0.03] p-3">
          <div>
            <span className="text-[10.5px] text-slate-500 block">Sebelum PLTS</span>
            <span className="font-title text-sm font-bold text-slate-900 font-code-metric block mt-0.5">
              {formatRp(monthlyBill)}
            </span>
          </div>
          <div>
            <span className="text-[10.5px] text-emerald-800 block">Tagihan Baru PLN</span>
            <span className="font-title text-sm font-bold text-emerald-700 font-code-metric block mt-0.5">
              {formatRp(calc.newMonthlyBill)}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="w-full h-2.5 bg-slate-200/70 rounded-full overflow-hidden flex">
            {calc.coveragePct > 0 && (
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 rounded-full"
                style={{ width: `${calc.coveragePct}%` }}
              />
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div>
              <span className="text-[9.5px] text-slate-400 block">Per Bulan</span>
              <span className="font-title text-xs font-bold text-emerald-700 font-code-metric">
                {formatRp(calc.cappedSaving)}
              </span>
            </div>
            <div>
              <span className="text-[9.5px] text-slate-400 block">1 Tahun</span>
              <span className="font-title text-xs font-bold text-slate-900 font-code-metric">
                {formatRp(calc.annualSaving)}
              </span>
            </div>
            <div>
              <span className="text-[9.5px] text-slate-400 block">25 Tahun</span>
              <span className="font-title text-xs font-bold text-emerald-800 font-code-metric">
                {formatRp(calc.cumulative25)}
              </span>
            </div>
          </div>
        </div>

        {/* BEP & Cashflow Chart */}
        <div className="pt-3 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-700">
              Tahun {currentInspectYear.toFixed(1)} ·{" "}
              <span
                className={`font-code-metric ${
                  currentInspectCashFlow >= 0 ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {formatRp(currentInspectCashFlow)}
              </span>
            </span>
            <span
              className={`text-[10.5px] font-semibold font-code-metric ${
                !hasValidBep
                  ? "text-slate-500"
                  : calc.paybackYears !== null && calc.paybackYears > 25
                    ? "text-amber-700"
                    : "text-emerald-700"
              }`}
            >
              {hasValidBep && calc.paybackYears !== null
                ? `BEP ${calc.paybackYears.toFixed(1)} thn`
                : calc.totalCapex === 0
                  ? "Tanpa Modal"
                  : "Belum BEP"}
            </span>
          </div>

          <div
            className="relative w-full h-40 bg-slate-50/75 rounded-xl p-2 overflow-hidden select-none cursor-crosshair touch-pan-y"
            onPointerDown={onChartPointer}
            onPointerMove={onChartPointer}
            onPointerLeave={() => onSelectInspectYear(null)}
          >
            <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${chartW} ${chartH}`}>
              <defs>
                <linearGradient id="roiProfitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="roiDeficitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="roiCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop
                    offset={`${Math.max(0, (bepRatio - 0.04) * 100).toFixed(1)}%`}
                    stopColor="#f59e0b"
                  />
                  <stop offset={`${(bepRatio * 100).toFixed(1)}%`} stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>

              <line
                x1="28"
                y1="20"
                x2="320"
                y2="20"
                stroke="#f1f5f9"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <line
                x1="28"
                y1="46"
                x2="320"
                y2="46"
                stroke="#f1f5f9"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <line
                x1="28"
                y1="72"
                x2="320"
                y2="72"
                stroke="#f1f5f9"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <line
                x1="28"
                y1={zeroY}
                x2="320"
                y2={zeroY}
                stroke="#cbd5e1"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />

              {deficitFillD && <path d={deficitFillD} fill="url(#roiDeficitGrad)" />}
              {profitFillD && <path d={profitFillD} fill="url(#roiProfitGrad)" />}
              <path
                d={curvePathD}
                fill="none"
                stroke="url(#roiCurveGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {hasValidBep && calc.paybackYears !== null && calc.paybackYears <= chartMaxYear && (
                <g transform={`translate(${mapChartX(effectiveBep)}, ${zeroY})`}>
                  <circle cx="0" cy="0" r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                  <text
                    x="0"
                    y="-8"
                    textAnchor={bepRatio < 0.16 ? "start" : bepRatio > 0.84 ? "end" : "middle"}
                    fontSize="7"
                    fill="#b45309"
                    fontFamily="Inter"
                    fontWeight="700"
                  >
                    BEP {calc.paybackYears.toFixed(1)}t
                  </text>
                </g>
              )}

              <line
                x1={mapChartX(currentInspectYear)}
                y1="12"
                x2={mapChartX(currentInspectYear)}
                y2="108"
                stroke="#0284c7"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
              <circle
                cx={mapChartX(currentInspectYear)}
                cy={mapChartY(currentInspectCashFlow)}
                r="4"
                fill="#0284c7"
                stroke="#ffffff"
                strokeWidth="1.5"
              />

              <text x="28" y="119" fontSize="7.5" fill="#94a3b8" fontFamily="Inter" fontWeight="600">
                Thn 0
              </text>
              <text
                x={chartPadLeft + plotW / 2}
                y="119"
                fontSize="7.5"
                fill="#94a3b8"
                fontFamily="Inter"
                fontWeight="600"
                textAnchor="middle"
              >
                Thn {Math.round(chartMaxYear / 2)}
              </text>
              <text
                x="320"
                y="119"
                fontSize="7.5"
                fill="#94a3b8"
                fontFamily="Inter"
                fontWeight="600"
                textAnchor="end"
              >
                Thn {chartMaxYear}
              </text>
            </svg>
          </div>

          <div className="grid grid-cols-5 gap-1 font-code-metric text-[10px]">
            {chartQuickYears.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => onSelectInspectYear(yr)}
                className={`py-1 rounded-full transition cursor-pointer font-medium ${
                  Math.round(currentInspectYear) === yr
                    ? "bg-amber-100 text-amber-950 font-semibold"
                    : "bg-slate-900/[0.03] hover:bg-slate-900/[0.06] text-slate-600"
                }`}
              >
                Thn {yr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Rincian Modal CAPEX */}
      <div className="rounded-2xl bg-white/80 backdrop-blur-xl border border-white/90 overflow-hidden shadow-[0_4px_20px_rgba(15,23,42,0.04),0_2px_10px_rgba(253,224,71,0.08),inset_0_1px_1px_rgba(255,255,255,0.92)]">
        <button
          type="button"
          onClick={onToggleCapexCollapsed}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-white/50 transition-colors cursor-pointer"
        >
          <div>
            <span className="font-title text-xs font-semibold text-slate-900 block">
              Estimasi Investasi (CAPEX)
            </span>
            <span className="font-code-metric text-[11px] text-slate-500 font-medium">
              {formatRp(calc.totalCapex)}
            </span>
          </div>
          <span
            className={`material-symbols-outlined text-slate-400 transition-transform duration-200 text-[20px] ${
              capexCollapsed ? "" : "rotate-180"
            }`}
          >
            expand_more
          </span>
        </button>

        {!capexCollapsed && (
          <div className="px-3.5 pb-3.5 border-t border-slate-100 divide-y divide-slate-100 text-xs animate-fadeIn">
            <div className="py-2 flex justify-between items-center">
              <span className="text-slate-500">
                Modul ({calc.totalModulesFitted}× {modulePower}W)
              </span>
              <span className="font-code-metric font-semibold text-slate-900">
                {formatRp(calc.costModules)}
              </span>
            </div>
            <div className="py-2 flex justify-between items-center">
              <span className="text-slate-500">
                Inverter ({inverterType === "string" ? "String" : "Micro"})
              </span>
              <span className="font-code-metric font-semibold text-slate-900">
                {formatRp(calc.costInverter)}
              </span>
            </div>
            <div className="py-2 flex justify-between items-center">
              <span className="text-slate-500">Racking Aluminium</span>
              <span className="font-code-metric font-semibold text-slate-900">
                {formatRp(calc.costRacking)}
              </span>
            </div>
            <div className="py-2 flex justify-between items-center">
              <span className="text-slate-500">Instalasi &amp; SLO</span>
              <span className="font-code-metric font-semibold text-slate-900">
                {formatRp(calc.costInstall)}
              </span>
            </div>
            <div className="pt-2.5 flex justify-between items-center font-semibold">
              <span className="text-slate-900">Total · IRR {calc.irr}%</span>
              <span className="font-code-metric text-sky-700">{formatRp(calc.totalCapex)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-0.5 space-y-2">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-amber-100/95 via-yellow-200/95 to-amber-100/95 hover:from-amber-200 hover:to-amber-200 active:scale-[0.98] text-amber-950 font-title text-xs font-semibold shadow-[0_4px_16px_rgba(251,191,36,0.22),inset_0_1px_1px_rgba(255,255,255,0.9)] border border-amber-200/90 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
        >
          <span className={`material-symbols-outlined text-[16px] ${isSaving ? "animate-spin" : ""}`}>
            {isSaving ? "sync" : saveSuccess ? "check_circle" : "cloud_upload"}
          </span>
          <span>
            {isSaving
              ? "Menyimpan..."
              : saveSuccess
                ? "Tersimpan"
                : openedSimulationId !== null
                  ? "Perbarui Proyek"
                  : "Simpan Proyek"}
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenProposal}
          className="w-full py-2 px-4 rounded-full bg-white/80 hover:bg-white border border-white/90 text-slate-700 font-title text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px] text-amber-700">file_download</span>
          <span>Unduh Proposal PDF</span>
        </button>
        <button
          type="button"
          onClick={onRequestEpcQuote}
          className="w-full py-1.5 px-4 rounded-full text-slate-500 hover:text-amber-900 hover:bg-white/60 text-[11px] font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[15px] text-amber-600">verified</span>
          <span>Ajukan Penawaran Mitra EPC</span>
        </button>
      </div>
    </div>
  );
}
