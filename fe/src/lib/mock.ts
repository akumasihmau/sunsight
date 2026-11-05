import {
  ApiRequestError,
  type AuthResponse,
  type Imagery,
  type Paginated,
  type SaveSimulationResponse,
  type SimulationDetail,
  type SimulationInput,
  type SimulationOptions,
  type SimulationResult,
  type SimulationSummary,
  type User,
} from "./api";

const STORAGE_SIMULATIONS_KEY = "sunsight.mock_simulations";

export const MOCK_OPTIONS: SimulationOptions = {
  modules: [
    {
      key: "mono_perc_550",
      label: "550 W Mono PERC Bifacial",
      power_w: 550,
      length_m: 2.278,
      width_m: 1.134,
      efficiency: 0.2129,
      price_idr: 1_850_000,
    },
    {
      key: "compact_450",
      label: "450 W Compact All-Black",
      power_w: 450,
      length_m: 1.906,
      width_m: 1.134,
      efficiency: 0.2082,
      price_idr: 1_520_000,
    },
    {
      key: "bifacial_580",
      label: "580 W Bifacial Dual-Glass",
      power_w: 580,
      length_m: 2.382,
      width_m: 1.134,
      efficiency: 0.2147,
      price_idr: 2_100_000,
    },
  ],
  tariffs: [
    {
      key: "R1",
      label: "R-1 / 1.300 VA",
      idr_per_kwh: 1444.7,
      year: 2024,
    },
    {
      key: "R2",
      label: "R-2 / 3.500-5.500 VA",
      idr_per_kwh: 1700.0,
      year: 2024,
    },
    {
      key: "B2",
      label: "B-2 / Bisnis > 6.600 VA",
      idr_per_kwh: 1444.7,
      year: 2024,
    },
  ],
  defaults: {
    module_key: "mono_perc_550",
    tariff_key: "R2",
    orientation: "portrait",
    inverter_type: "string",
  },
};

const MID_MONTH_DAYS = [17, 47, 75, 105, 135, 162, 198, 228, 258, 288, 318, 344];
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const MIN_ELEVATION_DEG = 5.0;

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180.0;
}

function rad2deg(rad: number): number {
  return (rad * 180.0) / Math.PI;
}

export function calculateIncidenceFactor(
  tiltDeg: number,
  azimuthDeg: number,
  latitude: number,
): number {
  const tilt = deg2rad(tiltDeg);
  const moduleAzimuth = deg2rad(azimuthDeg);
  const latRad = deg2rad(latitude);

  let weighted = 0.0;
  let reference = 0.0;

  for (const dayOfYear of MID_MONTH_DAYS) {
    const declination = deg2rad(23.45 * Math.sin(deg2rad((360.0 / 365.0) * (284 + dayOfYear))));

    for (const hour of HOURS) {
      const hourAngle = deg2rad(15.0 * (hour - 12));

      const sinElevation =
        Math.sin(latRad) * Math.sin(declination) +
        Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngle);

      const elevation = rad2deg(Math.asin(Math.max(-1.0, Math.min(1.0, sinElevation))));

      if (elevation < MIN_ELEVATION_DEG) {
        continue;
      }

      const zenith = deg2rad(90.0 - elevation);
      const sunAzimuth =
        deg2rad(180.0) +
        Math.atan2(
          Math.sin(hourAngle),
          Math.cos(hourAngle) * Math.sin(latRad) - Math.tan(declination) * Math.cos(latRad),
        );

      const cosIncidence =
        Math.cos(zenith) * Math.cos(tilt) +
        Math.sin(zenith) * Math.sin(tilt) * Math.cos(sunAzimuth - moduleAzimuth);

      const cosZenith = Math.cos(zenith);
      weighted += Math.max(0.0, cosIncidence) * cosZenith;
      reference += cosZenith * cosZenith;
    }
  }

  if (reference <= 0.0) {
    return 1.0;
  }

  return Math.round((weighted / reference) * 10000) / 10000;
}

export function calculateSimulationResult(
  input: SimulationInput,
  metersPerPixel = 0.1483,
  lat = -6.5955,
): SimulationResult {
  const module =
    MOCK_OPTIONS.modules.find((m) => m.key === input.module_key) ?? MOCK_OPTIONS.modules[0];
  const tariff =
    MOCK_OPTIONS.tariffs.find((t) => t.key === input.tariff_key) ?? MOCK_OPTIONS.tariffs[1];

  const roofLengthM = Math.round(input.roof_rect.width * metersPerPixel * 100) / 100;
  const roofWidthM = Math.round(input.roof_rect.height * metersPerPixel * 100) / 100;

  const effectiveLengthM = Math.max(0, roofLengthM - 2 * input.setback_m);
  const effectiveWidthM = Math.max(0, roofWidthM - 2 * input.setback_m - input.gutter_m);

  const totalAreaSqm = Math.round(roofLengthM * roofWidthM * 100) / 100;
  const effectiveAreaSqm = Math.round(effectiveLengthM * effectiveWidthM * 100) / 100;

  const isPortrait = input.orientation !== "landscape";
  const alongLength = isPortrait ? module.length_m : module.width_m;
  const alongWidth = isPortrait ? module.width_m : module.length_m;

  const countThatFits = (avail: number, panel: number, clearance: number): number => {
    if (panel <= 0 || avail < panel) return 0;
    return Math.floor((avail + clearance) / (panel + clearance));
  };

  const columns = countThatFits(effectiveLengthM, alongLength, input.clearance_m);
  const rows = countThatFits(effectiveWidthM, alongWidth, input.clearance_m);
  const maxSlots = columns * rows;
  const installed =
    input.panel_count === null
      ? maxSlots
      : Math.max(0, Math.min(input.panel_count, maxSlots));

  const moduleAreaSqm = Math.round(installed * module.length_m * module.width_m * 100) / 100;
  const densityRatio =
    effectiveAreaSqm > 0 ? Math.round((moduleAreaSqm / effectiveAreaSqm) * 10000) / 10000 : 0;

  const capacityKwp = Math.round(((installed * module.power_w) / 1000.0) * 1000) / 1000;
  const dailyIrradiance = 4.8324;
  const incidenceFactor = calculateIncidenceFactor(input.tilt_deg, input.azimuth_deg, lat);
  const performanceRatio = 0.8;

  const annualProductionKwh =
    Math.round(capacityKwp * dailyIrradiance * incidenceFactor * 365.0 * performanceRatio * 100) /
    100;

  // Biaya sistem
  const modulesIdr = installed * module.price_idr;
  const inverterIdr =
    input.inverter_type === "micro"
      ? installed * 1_100_000
      : Math.round(capacityKwp * 1_200_000);
  const rackingIdr = installed * 350_000;
  const installationIdr = 15_000_000;
  const capexTotalIdr = modulesIdr + inverterIdr + rackingIdr + installationIdr;

  const monthlyProductionValue = (annualProductionKwh / 12.0) * tariff.idr_per_kwh;
  const monthlySavingIdr = Math.round(Math.min(monthlyProductionValue, input.monthly_bill_idr));
  const annualSavingIdr = monthlySavingIdr * 12;

  const paybackYears =
    annualSavingIdr > 0 ? Math.round((capexTotalIdr / annualSavingIdr) * 100) / 100 : null;

  const consumptionKwh =
    tariff.idr_per_kwh > 0 ? (input.monthly_bill_idr / tariff.idr_per_kwh) * 12.0 : 0.0;
  const displacedKwh = Math.min(annualProductionKwh, consumptionKwh);
  const co2ReductionKg = Math.round(displacedKwh * 0.8 * 100) / 100;
  const treesEquivalent = Math.round(co2ReductionKg / 22.0);

  return {
    geometry: {
      roof_width_m: roofWidthM,
      roof_length_m: roofLengthM,
      total_area_sqm: totalAreaSqm,
      effective_area_sqm: effectiveAreaSqm,
    },
    layout: {
      max_slots: maxSlots,
      installed,
      rows,
      columns,
      module_area_sqm: moduleAreaSqm,
      density_ratio: densityRatio,
    },
    energy: {
      capacity_kwp: capacityKwp,
      annual_production_kwh: annualProductionKwh,
      daily_irradiance_kwh_per_sqm: dailyIrradiance,
      incidence_factor: incidenceFactor,
      performance_ratio: performanceRatio,
      irradiance_source: "NASA POWER",
      irradiance_period: "klimatologi tahunan",
    },
    finance: {
      capex_total_idr: capexTotalIdr,
      capex_breakdown: {
        modules_idr: modulesIdr,
        inverter_idr: inverterIdr,
        racking_idr: rackingIdr,
        installation_idr: installationIdr,
      },
      monthly_saving_idr: monthlySavingIdr,
      annual_saving_idr: annualSavingIdr,
      payback_years: paybackYears,
      tariff_key: tariff.key,
      tariff_label: tariff.label,
      tariff_idr_per_kwh: tariff.idr_per_kwh,
      monthly_bill_idr: input.monthly_bill_idr,
      co2_reduction_kg_per_year: co2ReductionKg,
      trees_equivalent: treesEquivalent,
    },
  };
}

function getStoredSimulations(): SimulationDetail[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_SIMULATIONS_KEY);
  if (!raw) {
    const seed: SimulationDetail[] = [
      {
        id: 1,
        center_point: { lat: -6.5955, lng: 106.7995 },
        roof_polygon: {
          type: "Polygon",
          coordinates: [
            [
              [106.7992, -6.5953],
              [106.7998, -6.5953],
              [106.7998, -6.5957],
              [106.7992, -6.5957],
              [106.7992, -6.5953],
            ],
          ],
        },
        input: {
          roof_width_m: 7.42,
          roof_length_m: 12.46,
          rotation_deg: 12,
          setback_m: 0.5,
          gutter_m: 0.5,
          tilt_deg: 20,
          azimuth_deg: 180,
          module_key: "mono_perc_550",
          orientation: "portrait",
          clearance_m: 0.03,
          panel_count: null,
          inverter_type: "string",
          monthly_bill_idr: 2_800_000,
          tariff_key: "R2",
        },
        result: {
          total_area_sqm: 92.37,
          effective_area_sqm: 66.62,
          max_slots: 20,
          installed: 20,
          rows: 5,
          columns: 4,
          capacity_kwp: 11,
          annual_production_kwh: 13829.81,
          capex_total_idr: 72_200_000,
          monthly_saving_idr: 1_959_223,
          annual_saving_idr: 23_510_676,
          payback_years: 3.07,
          co2_reduction_kg_per_year: 11063.85,
          trees_equivalent: 503,
        },
        assumptions: {
          daily_irradiance_kwh_per_sqm: 4.8324,
          irradiance_source: "NASA POWER",
          irradiance_period: "klimatologi tahunan",
          incidence_factor: 0.891,
          performance_ratio: 0.8,
          tariff_label: "R-2 / 3.500-5.500 VA",
          tariff_idr_per_kwh: 1700,
          capex_breakdown: {
            modules_idr: 37_000_000,
            inverter_idr: 13_200_000,
            racking_idr: 7_000_000,
            installation_idr: 15_000_000,
          },
        },
        created_at: new Date().toISOString(),
      },
    ];
    window.localStorage.setItem(STORAGE_SIMULATIONS_KEY, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveSimulations(list: SimulationDetail[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_SIMULATIONS_KEY, JSON.stringify(list));
}

export const mockApi = {
  login: async (body: { email: string; password: string }): Promise<AuthResponse> => {
    if (body.password === "salah" || body.password === "wrong") {
      throw new ApiRequestError(401, "Email atau password salah.");
    }
    const name = body.email.split("@")[0].replace(/[._-]/g, " ") || "Pengguna SunSight";
    const capitalName = name.charAt(0).toUpperCase() + name.slice(1);
    return {
      token: "sunsight_mock_token_" + Date.now(),
      user: {
        id: 1,
        name: capitalName,
        email: body.email,
      },
    };
  },

  register: async (body: { name: string; email: string }): Promise<AuthResponse> => {
    if (body.email === "taken@sunsight.id" || body.email === "admin@sunsight.id") {
      throw new ApiRequestError(422, "The email has already been taken.", {
        email: ["The email has already been taken."],
      });
    }
    return {
      token: "sunsight_mock_token_" + Date.now(),
      user: {
        id: 1,
        name: body.name,
        email: body.email,
      },
    };
  },

  logout: async (): Promise<{ message: string }> => {
    return { message: "Logged out (mock)" };
  },

  forgotPassword: async (email?: string): Promise<{ message: string }> => {
    if (email === "notfound@sunsight.id") {
      throw new ApiRequestError(422, "The selected email is invalid.", {
        email: ["The selected email is invalid."],
      });
    }
    return { message: "Tautan reset password telah dikirim ke email Anda (mock)." };
  },

  resetPassword: async (): Promise<{ message: string }> => {
    return { message: "Password berhasil diperbarui (mock)." };
  },

  currentUser: async (): Promise<User> => {
    return {
      id: 1,
      name: "Pengguna SunSight",
      email: "user@sunsight.id",
    };
  },

  fetchOptions: async (): Promise<SimulationOptions> => {
    return MOCK_OPTIONS;
  },

  fetchLocation: async (body: { lat: number; lng: number; zoom: number }): Promise<Imagery> => {
    return {
      image_id: `mock-img-${body.lat.toFixed(4)}-${body.lng.toFixed(4)}`,
      image_url: "/satellite_map.jpg",
      bbox: [body.lng - 0.002, body.lat - 0.002, body.lng + 0.002, body.lat + 0.002],
      width: 1024,
      height: 1024,
      meters_per_pixel: 0.1483,
      attribution: "© Mapbox Satellite Imagery (Mode FE Standalone)",
    };
  },

  simulate: async (body: SimulationInput): Promise<SimulationResult> => {
    return calculateSimulationResult(body);
  },

  saveSimulation: async (body: SimulationInput): Promise<SaveSimulationResponse> => {
    const result = calculateSimulationResult(body);
    const existing = getStoredSimulations();
    const newId = Date.now();

    const detail: SimulationDetail = {
      id: newId,
      center_point: { lat: -6.5955, lng: 106.7995 },
      roof_polygon: {
        type: "Polygon",
        coordinates: [
          [
            [106.7992, -6.5953],
            [106.7998, -6.5953],
            [106.7998, -6.5957],
            [106.7992, -6.5957],
            [106.7992, -6.5953],
          ],
        ],
      },
      input: {
        roof_width_m: result.geometry.roof_width_m,
        roof_length_m: result.geometry.roof_length_m,
        rotation_deg: body.roof_rect.rotation_deg,
        setback_m: body.setback_m,
        gutter_m: body.gutter_m,
        tilt_deg: body.tilt_deg,
        azimuth_deg: body.azimuth_deg,
        module_key: body.module_key,
        orientation: body.orientation,
        clearance_m: body.clearance_m,
        panel_count: body.panel_count,
        inverter_type: body.inverter_type,
        monthly_bill_idr: body.monthly_bill_idr,
        tariff_key: body.tariff_key,
      },
      result: {
        total_area_sqm: result.geometry.total_area_sqm,
        effective_area_sqm: result.geometry.effective_area_sqm,
        max_slots: result.layout.max_slots,
        installed: result.layout.installed,
        rows: result.layout.rows,
        columns: result.layout.columns,
        capacity_kwp: result.energy.capacity_kwp,
        annual_production_kwh: result.energy.annual_production_kwh,
        capex_total_idr: result.finance.capex_total_idr,
        monthly_saving_idr: result.finance.monthly_saving_idr,
        annual_saving_idr: result.finance.annual_saving_idr,
        payback_years: result.finance.payback_years,
        co2_reduction_kg_per_year: result.finance.co2_reduction_kg_per_year,
        trees_equivalent: result.finance.trees_equivalent,
      },
      assumptions: {
        daily_irradiance_kwh_per_sqm: result.energy.daily_irradiance_kwh_per_sqm,
        irradiance_source: result.energy.irradiance_source,
        irradiance_period: result.energy.irradiance_period,
        incidence_factor: result.energy.incidence_factor,
        performance_ratio: result.energy.performance_ratio,
        tariff_label: result.finance.tariff_label,
        tariff_idr_per_kwh: result.finance.tariff_idr_per_kwh,
        capex_breakdown: result.finance.capex_breakdown,
      },
      created_at: new Date().toISOString(),
    };

    existing.unshift(detail);
    saveSimulations(existing);

    return {
      message: "Simulation saved",
      id: newId,
      capacity_kwp: result.energy.capacity_kwp,
      payback_years: result.finance.payback_years,
    };
  },

  listSimulations: async (page = 1, perPage = 10): Promise<Paginated<SimulationSummary>> => {
    const list = getStoredSimulations();
    const start = (page - 1) * perPage;
    const paged = list.slice(start, start + perPage);

    const summaries: SimulationSummary[] = paged.map((item) => ({
      id: item.id,
      center_point: item.center_point,
      capacity_kwp: item.result.capacity_kwp,
      annual_production_kwh: item.result.annual_production_kwh,
      monthly_saving_idr: item.result.monthly_saving_idr,
      payback_years: item.result.payback_years,
      created_at: item.created_at,
    }));

    return {
      data: summaries,
      meta: {
        current_page: page,
        per_page: perPage,
        total: list.length,
        last_page: Math.max(1, Math.ceil(list.length / perPage)),
      },
      links: { first: "?page=1", last: `?page=${Math.ceil(list.length / perPage)}`, prev: null, next: null },
    };
  },

  getSimulation: async (id: number): Promise<SimulationDetail> => {
    const list = getStoredSimulations();
    const found = list.find((item) => item.id === id);
    if (!found) {
      throw new Error("Simulasi tidak ditemukan");
    }
    return found;
  },

  deleteSimulation: async (id: number): Promise<{ message: string }> => {
    const list = getStoredSimulations();
    const filtered = list.filter((item) => item.id !== id);
    saveSimulations(filtered);
    return { message: "Simulation deleted" };
  },
};

