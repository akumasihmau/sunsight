"use client";

import type {
  InverterType,
  ModuleRecommendation,
  Orientation,
} from "@/lib/studioPhysics";

export interface ModuleTabCalc {
  currentSpec: { eff: string; l: number; w: number; tech: string };
  totalValidSlots: number;
  modulesFitted: number;
  portraitSlotsCount: number;
  landscapeSlotsCount: number;
  bestOrientation: Orientation;
  dcAcRatio: string;
  inverterEffPct: string;
  densityPct: number;
  totalModulesFitted: number;
  cols: number;
  rows: number;
  actualKwp: number;
}

export interface ModuleTabProps {
  activeFacetId: string;
  modulePower: number;
  setModulePower: (power: number) => void;
  adjustModuleCount: (delta: number) => void;
  setCustomModuleCount: (count: number | null) => void;
  setCountPreset: (preset: "max" | "opt" | "min") => void;
  orientation: Orientation;
  setOrientation: (orientation: Orientation) => void;
  panelGap: number;
  setPanelGap: (gap: number) => void;
  extraTilt: number;
  setExtraTilt: (tilt: number) => void;
  shadingLossPct: number;
  setShadingLossPct: (pct: number) => void;
  inverterType: InverterType;
  setInverterType: (type: InverterType) => void;
  calc: ModuleTabCalc;
  moduleRecommendation: ModuleRecommendation | null;
  onDismissRecommendation: () => void;
  onFindOptimalRecommendation: () => void;
  onApplyRecommendation: () => void;
  onNextTab: () => void;
}

export function ModuleTab({
  activeFacetId,
  modulePower,
  setModulePower,
  adjustModuleCount,
  setCustomModuleCount,
  setCountPreset,
  orientation,
  setOrientation,
  panelGap,
  setPanelGap,
  extraTilt,
  setExtraTilt,
  shadingLossPct,
  setShadingLossPct,
  inverterType,
  setInverterType,
  calc,
  moduleRecommendation,
  onDismissRecommendation,
  onFindOptimalRecommendation,
  onApplyRecommendation,
  onNextTab,
}: ModuleTabProps) {
  return (
    <div id="studio-pane-pvarray" className="p-3.5 space-y-3">
      {/* 1. Pilihan Modul */}
      <div className="rounded-2xl bg-white/80 backdrop-blur-xl p-3.5 border border-white/90 shadow-[0_4px_20px_rgba(15,23,42,0.04),0_2px_10px_rgba(253,224,71,0.08),inset_0_1px_1px_rgba(255,255,255,0.92)] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-title text-xs font-semibold text-slate-900">Modul Surya</span>
          <span className="font-code-metric text-[11px] font-semibold text-emerald-700">
            {calc.currentSpec.eff} efis.
          </span>
        </div>
        <div className="relative">
          <select
            value={modulePower}
            onChange={(e) => setModulePower(Number(e.target.value))}
            className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-900/[0.035] text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-300/60 appearance-none cursor-pointer transition"
          >
            <option value="550">Tier-1 550W Mono PERC — 2.27 × 1.13 m</option>
            <option value="450">Tier-1 450W All-Black — 1.76 × 1.04 m</option>
            <option value="580">Bifacial 580W Dual-Glass — 2.38 × 1.13 m</option>
          </select>
          <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
            expand_more
          </span>
        </div>
        <p className="text-[11px] text-slate-500">
          {calc.currentSpec.l} × {calc.currentSpec.w} m · {calc.currentSpec.tech}
        </p>
      </div>

      {/* 2. Jumlah Modul */}
      <div className="rounded-2xl bg-white/80 backdrop-blur-xl p-3.5 border border-white/90 shadow-[0_4px_20px_rgba(15,23,42,0.04),0_2px_10px_rgba(253,224,71,0.08),inset_0_1px_1px_rgba(255,255,255,0.92)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-title text-xs font-semibold text-slate-900">Jumlah Panel</span>
          <span className="font-code-metric text-[11px] text-slate-400 font-medium">
            maks {calc.totalValidSlots} slot
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/[0.035] p-1.5">
          <button
            type="button"
            onClick={() => adjustModuleCount(-1)}
            className="w-8 h-8 rounded-lg bg-white/90 hover:bg-white text-slate-700 flex items-center justify-center transition shadow-2xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">remove</span>
          </button>
          <span className="font-title text-base font-bold text-slate-900">
            {calc.modulesFitted} Modul
          </span>
          <button
            type="button"
            onClick={() => adjustModuleCount(1)}
            className="w-8 h-8 rounded-lg bg-white/90 hover:bg-white text-slate-700 flex items-center justify-center transition shadow-2xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
        </div>

        <input
          type="range"
          min="1"
          max={Math.max(1, calc.totalValidSlots)}
          value={calc.modulesFitted}
          onChange={(e) => setCustomModuleCount(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-200/80 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />

        <div className="grid grid-cols-3 gap-1 font-code-metric text-[10px]">
          <button
            type="button"
            onClick={() => setCountPreset("max")}
            className="py-1 rounded-full bg-slate-900/[0.035] hover:bg-amber-100/80 text-slate-700 hover:text-amber-950 font-medium transition cursor-pointer"
          >
            Penuh
          </button>
          <button
            type="button"
            onClick={() => setCountPreset("opt")}
            className="py-1 rounded-full bg-slate-900/[0.035] hover:bg-amber-100/80 text-slate-700 hover:text-amber-950 font-medium transition cursor-pointer"
          >
            Ideal
          </button>
          <button
            type="button"
            onClick={() => setCountPreset("min")}
            className="py-1 rounded-full bg-slate-900/[0.035] hover:bg-amber-100/80 text-slate-700 hover:text-amber-950 font-medium transition cursor-pointer"
          >
            Hemat
          </button>
        </div>

        <p className="text-[10.5px] text-slate-500">
          Klik langsung panel di peta untuk menyalakan atau mematikan slot satuan.
        </p>
      </div>

      {/* 3. Tata Letak & Inverter */}
      <div className="rounded-2xl bg-white/80 backdrop-blur-xl p-3.5 border border-white/90 shadow-[0_4px_20px_rgba(15,23,42,0.04),0_2px_10px_rgba(253,224,71,0.08),inset_0_1px_1px_rgba(255,255,255,0.92)] space-y-3.5">
        <span className="font-title text-xs font-semibold text-slate-900 block">
          Tata Letak &amp; Inverter
        </span>

        <div className="space-y-1.5">
          <span className="text-[11px] font-medium text-slate-500 block">Orientasi</span>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-900/[0.04]">
            <button
              type="button"
              onClick={() => setOrientation("portrait")}
              className={`py-1.5 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                orientation === "portrait"
                  ? "bg-gradient-to-r from-amber-100/95 via-yellow-200/95 to-amber-100/95 text-amber-950 font-semibold border border-amber-200/90 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">stay_current_portrait</span>
              <span>Potret ({calc.portraitSlotsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setOrientation("landscape")}
              className={`py-1.5 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                orientation === "landscape"
                  ? "bg-gradient-to-r from-amber-100/95 via-yellow-200/95 to-amber-100/95 text-amber-950 font-semibold border border-amber-200/90 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">stay_current_landscape</span>
              <span>Lanskap ({calc.landscapeSlotsCount})</span>
            </button>
          </div>
          {calc.portraitSlotsCount !== calc.landscapeSlotsCount &&
            orientation !== calc.bestOrientation && (
              <div className="flex items-center justify-between text-[11px] text-amber-900 pt-0.5">
                <span>
                  {calc.bestOrientation === "portrait" ? "Potret" : "Lanskap"} muat +
                  {Math.abs(calc.portraitSlotsCount - calc.landscapeSlotsCount)} panel
                </span>
                <button
                  type="button"
                  onClick={() => setOrientation(calc.bestOrientation)}
                  className="font-semibold text-amber-800 hover:underline cursor-pointer"
                >
                  Terapkan
                </button>
              </div>
            )}
        </div>

        <div className="space-y-1.5 pt-2.5 border-t border-slate-100">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-600">Jarak Antar Modul</span>
            <span className="font-code-metric font-semibold text-slate-900">{panelGap} cm</span>
          </div>
          <input
            type="range"
            min="2"
            max="10"
            step="1"
            value={panelGap}
            onChange={(e) => setPanelGap(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200/80 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-600">Sudut Ekstra Racking</span>
            <span className="font-code-metric font-semibold text-amber-800">+{extraTilt}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={extraTilt}
            onChange={(e) => setExtraTilt(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200/80 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        <div className="space-y-1.5 pt-2.5 border-t border-slate-100">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-600">Bayangan Samping</span>
            <span className="font-code-metric text-[10.5px] font-semibold text-amber-800">
              {shadingLossPct === 0 ? "0% rugi" : `-${shadingLossPct}%`}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { pct: 0, label: "Terbuka" },
              { pct: 10, label: "Ringan" },
              { pct: 20, label: "Padat" },
            ].map((opt) => (
              <button
                key={opt.pct}
                type="button"
                onClick={() => setShadingLossPct(opt.pct)}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition cursor-pointer border ${
                  shadingLossPct === opt.pct
                    ? "bg-gradient-to-r from-amber-100/95 via-yellow-200/90 to-amber-100/95 text-amber-950 border-amber-200/90 font-semibold shadow-2xs"
                    : "bg-slate-900/[0.03] text-slate-600 border-transparent hover:bg-slate-900/[0.06]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 pt-2.5 border-t border-slate-100">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-600">Inverter</span>
            <span className="font-code-metric text-[10.5px] text-slate-500">
              DC/AC {calc.dcAcRatio}× · {calc.inverterEffPct}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setInverterType("string")}
              className={`p-2 rounded-xl text-left transition cursor-pointer border ${
                inverterType === "string"
                  ? "bg-gradient-to-r from-amber-100/95 via-yellow-200/90 to-amber-100/95 text-amber-950 border-amber-200/90 font-semibold shadow-2xs"
                  : "bg-slate-900/[0.03] text-slate-700 border-transparent hover:bg-slate-900/[0.06]"
              }`}
            >
              <span className="text-xs font-semibold block">Central String</span>
              <span className="text-[10px] text-slate-500 block">3-Phase Sentral</span>
            </button>
            <button
              type="button"
              onClick={() => setInverterType("micro")}
              className={`p-2 rounded-xl text-left transition cursor-pointer border ${
                inverterType === "micro"
                  ? "bg-gradient-to-r from-amber-100/95 via-yellow-200/90 to-amber-100/95 text-amber-950 border-amber-200/90 font-semibold shadow-2xs"
                  : "bg-slate-900/[0.03] text-slate-700 border-transparent hover:bg-slate-900/[0.06]"
              }`}
            >
              <span className="text-xs font-semibold block">Microinverter</span>
              <span className="text-[10px] text-slate-500 block">Per Panel</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Ringkasan Array */}
      <div className="rounded-2xl bg-white/80 backdrop-blur-xl p-3.5 border border-white/90 shadow-[0_4px_20px_rgba(15,23,42,0.04),0_2px_10px_rgba(253,224,71,0.08),inset_0_1px_1px_rgba(255,255,255,0.92)] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-title text-xs font-semibold text-slate-900">Ringkasan Array</span>
          <span className="text-[11px] font-semibold text-emerald-700 font-code-metric">
            {calc.densityPct}% terpakai
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <span className="text-[10.5px] text-slate-400 block">Total Modul</span>
            <span className="font-semibold text-slate-900 text-sm font-code-metric">
              {calc.totalModulesFitted} unit
            </span>
          </div>
          <div>
            <span className="text-[10.5px] text-slate-400 block">Formasi Grid</span>
            <span className="font-semibold text-slate-900 text-sm">
              {calc.cols} × {calc.rows}
            </span>
          </div>
          <div>
            <span className="text-[10.5px] text-slate-400 block">Kapasitas Puncak</span>
            <span className="font-semibold text-sky-700 text-sm font-code-metric">
              {calc.actualKwp.toFixed(2)} kWp
            </span>
          </div>
          <div>
            <span className="text-[10.5px] text-slate-400 block">Luas Array</span>
            <span className="font-semibold text-slate-900 text-sm font-code-metric">
              {(calc.totalModulesFitted * calc.currentSpec.w * calc.currentSpec.l).toFixed(1)} m²
            </span>
          </div>
        </div>
      </div>

      {/* Rekomendasi Output Maksimal */}
      {moduleRecommendation && moduleRecommendation.facetId === activeFacetId && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-50/90 via-white/85 to-sky-50/55 backdrop-blur-xl p-3 border border-amber-200/80 shadow-[0_6px_20px_rgba(245,158,11,0.10),inset_0_1px_1px_rgba(255,255,255,0.9)] space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-amber-950 font-title flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-amber-600">
                auto_awesome
              </span>
              <span>Rekomendasi Output Tertinggi</span>
            </span>
            <button
              type="button"
              onClick={onDismissRecommendation}
              className="w-5 h-5 rounded-full hover:bg-slate-900/[0.06] text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              title="Tutup"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>

          {moduleRecommendation.isAlreadyOptimal ? (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
              <span className="material-symbols-outlined text-[15px]">check_circle</span>
              <span>
                Konfigurasi atap ini sudah optimal (
                {Math.round(moduleRecommendation.currentAnnualKwh).toLocaleString("id-ID")} kWh/thn).
              </span>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1 font-code-metric text-[10px]">
                <span className="px-2 py-0.5 rounded-full bg-white/90 text-slate-800 border border-slate-200/70 font-semibold">
                  {moduleRecommendation.modulePower} Wp
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/90 text-slate-800 border border-slate-200/70 font-semibold">
                  {moduleRecommendation.orientation === "landscape" ? "Landscape" : "Portrait"}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/90 text-slate-800 border border-slate-200/70 font-semibold">
                  Gap {moduleRecommendation.panelGap} cm
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/90 text-slate-800 border border-slate-200/70 font-semibold">
                  Azimuth {moduleRecommendation.azimuth}°
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/90 text-slate-800 border border-slate-200/70 font-semibold">
                  Sudut {moduleRecommendation.pitch}°
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="text-[11px]">
                  <span className="font-code-metric font-bold text-slate-900">
                    {Math.round(moduleRecommendation.annualProductionKwh).toLocaleString("id-ID")}{" "}
                    kWh/thn
                  </span>
                  <span className="block text-[10px] font-semibold text-emerald-700">
                    +{Math.round(moduleRecommendation.gainKwh).toLocaleString("id-ID")} kWh (+
                    {moduleRecommendation.gainPct.toFixed(1)}%) ·{" "}
                    {moduleRecommendation.modulesFitted} modul
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onApplyRecommendation}
                  className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 hover:brightness-105 text-amber-950 font-title text-[11px] font-semibold border border-amber-300/80 shadow-2xs shrink-0 cursor-pointer"
                >
                  Terapkan
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="pt-0.5 space-y-2">
        <button
          type="button"
          onClick={onFindOptimalRecommendation}
          className="w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-amber-100/95 via-yellow-200/95 to-amber-100/95 hover:from-amber-200 hover:to-amber-200 active:scale-[0.98] text-amber-950 font-title text-xs font-semibold shadow-[0_4px_16px_rgba(251,191,36,0.22),inset_0_1px_1px_rgba(255,255,255,0.9)] border border-amber-200/90 transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[17px]">auto_awesome</span>
          <span>Cari Rekomendasi Optimal</span>
        </button>
        <button
          type="button"
          onClick={onNextTab}
          className="w-full py-2 px-4 rounded-full bg-white/80 hover:bg-white border border-white/90 text-slate-700 font-title text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Lanjut ke Finansial</span>
          <span className="material-symbols-outlined text-[16px] text-amber-700">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
