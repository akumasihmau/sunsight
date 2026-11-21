import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  FALLBACK_FACET,
  computeFacetMetrics,
  computePolygonArea,
  optimizeFacetConfiguration,
  packPanelsInPolygon,
  type RoofFacet,
} from "./studioPhysics.ts";

function makeTestFacet(overrides: Partial<RoofFacet> = {}): RoofFacet {
  return {
    ...FALLBACK_FACET,
    id: "test-facet-1",
    isSolarPopulated: true,
    ...overrides,
  };
}

describe("studioPhysics — geometri & panel packing", () => {
  it("menghitung luas poligon persegi & bentuk-L dengan akurat", () => {
    const rectArea = computePolygonArea([
      { x: -5, y: -4 },
      { x: 5, y: -4 },
      { x: 5, y: 4 },
      { x: -5, y: 4 },
    ]);
    assert.equal(rectArea, 80);

    // Bentuk-L: 10×10 dikurangi potongan sudut 5×5 = 75 m²
    const lArea = computePolygonArea([
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 5 },
      { x: 10, y: 5 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]);
    assert.equal(lArea, 75);
  });

  it("menyusun modul surya di dalam poligon tanpa melampaui batas", () => {
    const poly = [
      { x: -6, y: -4 },
      { x: 6, y: -4 },
      { x: 6, y: 4 },
      { x: -6, y: 4 },
    ];
    const packed = packPanelsInPolygon(poly, {
      panelW: 1.13,
      panelL: 2.27,
      gap: 0.03,
      margin: 0.5,
      marginBottom: 0.5,
    });
    assert.ok(packed.slots.length >= 24, `Harus muat minimal 24 panel, dapat ${packed.slots.length}`);
  });
});

describe("studioPhysics — paritas fisika surya Kota Bogor (FE === BE EnergyModel)", () => {
  it("menghasilkan ~5727.8 kWh/thn untuk 8 modul 550W (4.4 kWp) pada sudut optimal 10° Utara", () => {
    const facet = makeTestFacet({
      modulePower: 550,
      pitch: 10,
      azimuth: 0,
      customModuleCount: 8,
    });
    const metrics = computeFacetMetrics(facet, 12, false, 0, "string", 0);
    assert.equal(metrics.modulesFitted, 8);
    assert.equal(metrics.actualKwp, 4.4);
    assert.ok(
      Math.abs(metrics.annualProductionKwh - 5727.8) < 1.0,
      `Output seharusnya ~5727.8 kWh, dapat ${metrics.annualProductionKwh}`
    );
  });

  it("simetris melingkar 360° pada azimuth 355° dan 5° terhadap Utara (0°)", () => {
    const f355 = makeTestFacet({ pitch: 10, azimuth: 355, customModuleCount: 8, alignToAzimuth: false });
    const f5 = makeTestFacet({ pitch: 10, azimuth: 5, customModuleCount: 8, alignToAzimuth: false });
    const m355 = computeFacetMetrics(f355, 12, false, 0, "string", 10);
    const m5 = computeFacetMetrics(f5, 12, false, 0, "string", 10);

    assert.equal(m355.azimuthEffPct, m5.azimuthEffPct);
    assert.ok(
      Math.abs(m355.annualProductionKwh - m5.annualProductionKwh) < 0.01,
      "355° dan 5° harus menghasilkan kWh identik"
    );
  });

  it("menerapkan derating bayangan samping (10% & 20%) secara proporsional", () => {
    const facet = makeTestFacet({ pitch: 10, azimuth: 0, customModuleCount: 8, alignToAzimuth: false });
    const open = computeFacetMetrics(facet, 12, false, 0, "string", 0);
    const light = computeFacetMetrics(facet, 12, false, 0, "string", 10);
    const heavy = computeFacetMetrics(facet, 12, false, 0, "string", 20);

    assert.ok(Math.abs(light.annualProductionKwh / open.annualProductionKwh - 0.9) < 1e-6);
    assert.ok(Math.abs(heavy.annualProductionKwh / open.annualProductionKwh - 0.8) < 1e-6);
  });

  it("membedakan klimatologi pagi berawan (3.82), sore (3.95), dan siang normal (4.42)", () => {
    const facet = makeTestFacet({ pitch: 10, azimuth: 0, customModuleCount: 8, alignToAzimuth: false });
    const morning = computeFacetMetrics(facet, 9, false, 0, "string", 0);
    const afternoon = computeFacetMetrics(facet, 15, false, 0, "string", 0);
    const noon = computeFacetMetrics(facet, 12, false, 0, "string", 0);

    assert.ok(morning.annualProductionKwh < afternoon.annualProductionKwh);
    assert.ok(afternoon.annualProductionKwh < noon.annualProductionKwh);
  });
});

describe("studioPhysics — optimizer rekomendasi output tertinggi", () => {
  it("menemukan peningkatan output dari konfigurasi suboptimal lalu menandai optimal setelah diterapkan", () => {
    const suboptimal = makeTestFacet({
      modulePower: 450,
      orientation: "portrait",
      panelGap: 6,
      pitch: 30,
      azimuth: 180,
      customModuleCount: null,
    });

    const rec = optimizeFacetConfiguration(suboptimal, 12, false, 10, "string", 0);
    assert.equal(rec.isAlreadyOptimal, false);
    assert.ok(rec.gainKwh > 500, `Harus memberi kenaikan signifikan, dapat +${rec.gainKwh} kWh`);
    assert.equal(rec.pitch, 10);

    const applied: RoofFacet = {
      ...suboptimal,
      modulePower: rec.modulePower,
      orientation: rec.orientation,
      panelGap: rec.panelGap,
      pitch: rec.pitch,
      azimuth: rec.azimuth,
      alignToAzimuth: rec.alignToAzimuth,
      customModuleCount: null,
      slotOverrides: {},
    };
    const recAfter = optimizeFacetConfiguration(applied, 12, false, 10, "string", 0);
    assert.equal(recAfter.isAlreadyOptimal, true);
  });
});
