"use client";

import { useEffect, useRef, useState } from "react";

export interface MapProjectItem {
  id: string;
  name: string;
  district: string;
  city: string;
  lat: number;
  lng: number;
  capacityKwp: number;
  annualProdMwh: number;
}

interface BogorProjectsMapProps {
  projects: MapProjectItem[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  onOpenStudio?: (id: string) => void;
  roofScore?: number;
  irradiance?: number;
}

export function BogorProjectsMap({
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenStudio,
  roofScore = 94,
  irradiance = 4.85,
}: BogorProjectsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Record<string, any>>({});

  const [mapReady, setMapReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(14);
  const [isPotentialOpen, setIsPotentialOpen] = useState(false);
  const onSelectProjectRef = useRef(onSelectProject);

  useEffect(() => {
    onSelectProjectRef.current = onSelectProject;
  }, [onSelectProject]);

  // Helper to construct marker HTML
  function createMarkerHtml(proj: MapProjectItem, active: boolean, isZoomedOut: boolean): string {
    // When active and not zoomed out too far, show soft yellow/amber pill with project name
    if (active && !isZoomedOut) {
      return `
        <div class="sunsight-map-pin sunsight-map-pin--active" title="${proj.name}" style="
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%);
          color: #451a03;
          padding: 5px 12px 5px 8px;
          border-radius: 9999px;
          border: 1px solid rgba(245, 158, 11, 0.75);
          box-shadow: 0 4px 16px rgba(245, 158, 11, 0.32), inset 0 1px 1px rgba(255, 255, 255, 0.85);
          font-family: inherit;
          font-size: 11.5px;
          font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
          transform: translate(-50%, -50%) scale(1.05);
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          user-select: none;
        ">
          <span style="
            width: 8px;
            height: 8px;
            border-radius: 9999px;
            background: #b45309;
            box-shadow: 0 0 6px rgba(180, 83, 9, 0.7);
            flex-shrink: 0;
          "></span>
          <span style="letter-spacing: -0.01em;">${proj.name}</span>
        </div>
      `;
    }

    // When unselected or zoomed out: just a glowing/pulsing dot without name or kwp
    return `
      <div class="sunsight-map-dot-wrapper" title="${proj.name}" style="
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transform: translate(-50%, -50%);
        user-select: none;
      ">
        <div class="map-glowing-dot" style="
          width: 10px;
          height: 10px;
          border-radius: 9999px;
          background: #f59e0b;
          border: 2px solid #ffffff;
        "></div>
      </div>
    `;
  }

  // Initialize Leaflet map
  useEffect(() => {
    let isCancelled = false;

    function initMap() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;
      if (!L || !mapContainerRef.current || mapInstanceRef.current || isCancelled) return;

      try {
        // Center around Kota Bogor (Fokus langsung mode Citra Satelit)
        const map = L.map(mapContainerRef.current, {
          center: [-6.589, 106.797],
          zoom: 14,
          minZoom: 11,
          maxZoom: 18,
          zoomControl: false,
          attributionControl: false,
        });

        // Restrict to Kota Bogor & surrounds
        const bogorBounds = L.latLngBounds(
          L.latLng(-6.67, 106.72),
          L.latLng(-6.52, 106.87)
        );
        map.setMaxBounds(bogorBounds);

        // Track zoom level to collapse markers when zoomed out
        map.on("zoomend", () => {
          setZoomLevel(map.getZoom());
        });

        // Esri Satellite Layer (Tampilan Utama Fokus Satelit)
        const satellite = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          { maxNativeZoom: 19, maxZoom: 19 }
        );

        // Reference labels layer for satellite
        const labels = L.tileLayer(
          "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          { maxNativeZoom: 19, maxZoom: 19 }
        );

        satellite.addTo(map);
        labels.addTo(map);

        mapInstanceRef.current = map;
        markersRef.current = {};
        setMapReady(true);

        // Invalidate size once DOM stabilizes
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 150);
      } catch (err) {
        console.warn("Leaflet init error:", err);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).L) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => initMap();
      document.body.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers dynamically whenever project list, selection, or zoom changes
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map || !mapReady) return;

    const nextIds = new Set(projects.map((p) => p.id));

    // Remove markers for deleted or unloaded projects
    Object.keys(markersRef.current).forEach((id) => {
      if (!nextIds.has(id)) {
        markersRef.current[id]?.remove();
        delete markersRef.current[id];
      }
    });

    // Add missing markers or update existing ones
    projects.forEach((proj) => {
      const isSelected = proj.id === selectedProjectId;
      const icon = L.divIcon({
        html: createMarkerHtml(proj, isSelected, zoomLevel < 12),
        className: "sunsight-leaflet-marker",
        iconSize: [0, 0],
      });

      const existing = markersRef.current[proj.id];
      if (!existing) {
        const marker = L.marker([proj.lat, proj.lng], {
          icon,
          zIndexOffset: isSelected ? 1000 : 0,
        });
        marker.on("click", () => {
          onSelectProjectRef.current(proj.id);
        });
        marker.addTo(map);
        markersRef.current[proj.id] = marker;
      } else {
        existing.setLatLng([proj.lat, proj.lng]);
        existing.setIcon(icon);
        existing.setZIndexOffset(isSelected ? 1000 : 0);
      }
    });

    const activeProject = projects.find((p) => p.id === selectedProjectId);
    if (activeProject) {
      map.panTo([activeProject.lat, activeProject.lng], {
        animate: true,
        duration: 0.6,
      });
    }
  }, [selectedProjectId, projects, mapReady, zoomLevel]);

  function handleZoomIn() {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  }

  function handleZoomOut() {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  }

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  function handleExpandToStudio() {
    if (onOpenStudio) {
      onOpenStudio(activeProject?.id ?? "");
    }
  }

  return (
    <div className="relative w-full h-full min-h-[320px] rounded-[18px] bg-slate-900 overflow-hidden shadow-2xs select-none">
      {/* Real Leaflet Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Loading state before Leaflet initializes */}
      {!mapReady && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-xs text-slate-300 gap-2">
          <span className="material-symbols-outlined text-[28px] animate-spin text-amber-400">
            sync
          </span>
          <span className="text-xs font-medium">Memuat citra satelit Kota Bogor...</span>
        </div>
      )}

      {/* Top Right Map Controls: Zoom & Buka Proyek di Studio */}
      <div className="absolute top-3 right-3 z-20 flex items-center justify-end pointer-events-none">
        <div className="flex items-center gap-1 bg-white/90 backdrop-blur-xl border border-white/90 rounded-full p-0.5 shadow-[0_8px_24px_rgba(15,23,42,0.16)] pointer-events-auto">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Perbesar"
            className="w-7 h-7 rounded-full hover:bg-amber-50/90 text-slate-700 hover:text-amber-950 flex items-center justify-center transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Perkecil"
            className="w-7 h-7 rounded-full hover:bg-amber-50/90 text-slate-700 hover:text-amber-950 flex items-center justify-center transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">remove</span>
          </button>
          <button
            type="button"
            onClick={handleExpandToStudio}
            title={`Buka ${activeProject?.name || "Proyek"} di Studio CAD`}
            aria-label={`Buka ${activeProject?.name || "Proyek"} di Studio CAD`}
            className="w-7 h-7 rounded-full hover:bg-gradient-to-r hover:from-amber-200 hover:via-amber-300 hover:to-amber-200 text-slate-700 hover:text-amber-950 flex items-center justify-center transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">crop_free</span>
          </button>
        </div>
      </div>

      {/* Bottom Right Floating Solar Potential Component (Expandable with Smooth Transition) */}
      {activeProject && (
        <div className="absolute right-3 bottom-3 z-20 pointer-events-auto flex flex-col items-end">
          {/* Expanded State Card */}
          <div
            className={`transition-all duration-300 ease-out origin-bottom-right ${
              isPotentialOpen
                ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                : "opacity-0 scale-90 translate-y-3 pointer-events-none absolute bottom-0 right-0"
            }`}
          >
            <div className="w-[270px] sm:w-[310px] bg-white/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 shadow-lg border border-slate-200/90 flex flex-col gap-2 relative">
              {/* Header with Title and Close Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-amber-500">wb_sunny</span>
                  <h4 className="text-[13px] sm:text-[14px] font-bold text-slate-900">Potensi surya</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPotentialOpen(false)}
                  className="w-6 h-6 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
                  title="Tutup ringkasan potensi"
                  aria-label="Tutup ringkasan potensi"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>

              {/* Body stats & gauge */}
              <div className="flex items-center justify-between gap-3 pt-0.5">
                <div className="min-w-0">
                  <p className="text-[12px] sm:text-[13px] font-semibold text-slate-800 truncate">
                    {activeProject.district !== "-" ? activeProject.district : "Kota Bogor"}
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-snug">
                    {irradiance} kWh/m² per hari
                  </p>
                </div>
                <div className="relative w-12 h-12 sm:w-13 sm:h-13 shrink-0">
                  <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
                    <circle cx={28} cy={28} r={22} fill="none" stroke="#f1f5f9" strokeWidth={5} />
                    <circle
                      cx={28}
                      cy={28}
                      r={22}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={5}
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 22}
                      strokeDashoffset={2 * Math.PI * 22 * (1 - Math.min(100, Math.max(0, roofScore)) / 100)}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] sm:text-[12px] font-bold text-slate-900">
                    {roofScore}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Collapsed State Mini Sun Button */}
          <button
            type="button"
            onClick={() => setIsPotentialOpen(true)}
            className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/95 backdrop-blur-md text-amber-500 flex items-center justify-center shadow-md border border-slate-200/90 hover:bg-white hover:scale-105 active:scale-95 transition-all duration-300 ease-out cursor-pointer group ${
              isPotentialOpen ? "opacity-0 scale-75 pointer-events-none absolute" : "opacity-100 scale-100"
            }`}
            title="Buka Potensi Surya"
            aria-label="Buka Potensi Surya"
          >
            <span className="material-symbols-outlined text-[20px] sm:text-[22px] group-hover:rotate-45 group-hover:scale-110 transition-transform duration-300">
              wb_sunny
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
