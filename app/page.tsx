"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import HeroSection from "@/components/HeroSection";
import KeyMetrics from "@/components/KeyMetrics";
import DemandForecastChart from "@/components/DemandForecastChart";
import GridStressChart from "@/components/GridStressChart";
import ForecastControls from "@/components/ForecastControls";
import Footer from "@/components/Footer";
import type { ForecastMode, ApiPrediction, StateMarker } from "@/lib/types";
import { STATE_MARKERS } from "@/lib/stateMarkers";

const IndiaMap = dynamic(() => import("@/components/IndiaMap"), {
  ssr: false,
  loading: () => (
    <div className="bento-card p-8 h-[550px] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-saffron/20 border-t-saffron rounded-full animate-spin mx-auto mb-3" />
        <p className="text-text-muted text-sm">Loading map...</p>
      </div>
    </div>
  ),
});

const API_BASE = "http://localhost:8000";

/** Real normalised Indian load shape (from Energy datasets). Used to distribute
 *  a single daily MW average across 24 hourly slots — for the chart only. */
const LOAD_SHAPE = [
  0.8623, 0.8399, 0.8197, 0.8148, 0.8316, 0.8977,
  0.9698, 1.0468, 1.1154, 1.1781, 1.2050, 1.1957,
  1.1740, 1.1409, 1.1043, 1.0793, 1.0503, 1.0322,
  1.0421, 1.0170, 0.9603, 0.9137, 0.8732, 0.8359,
];

/** Convert a daily average MW figure into a 24-hour curve using the real load shape. */
function buildHourlyCurve(
  avgMW: number,
  capacityMW: number,
  confidencePct: number
): ApiPrediction["hourlyDemand"] {
  return LOAD_SHAPE.map((factor, i) => {
    const predicted = Math.round(avgMW * factor);
    const uncertainty = predicted * ((1 - confidencePct / 100) * 0.3);
    return {
      time: `${i.toString().padStart(2, "0")}:00`,
      predicted,
      capacity: Math.round(capacityMW * (0.95 + (1.205 - factor) * 0.1)),
      upper: Math.round(predicted + uncertainty),
      lower: Math.max(0, Math.round(predicted - uncertainty)),
    };
  });
}

/** Derive peak hour from a load curve */
function derivePeakHour(hourly: ApiPrediction["hourlyDemand"]): string {
  const peak = hourly.reduce((max, h) => (h.predicted > max.predicted ? h : max), hourly[0]);
  const hour = parseInt(peak.time);
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

/** Build a full ApiPrediction from the raw ML output. */
function buildPrediction(
  avgMW: number,
  capacityMW: number,
  confidencePct: number,
  locationName: string,
  demandChangePct?: number
): ApiPrediction {
  const utilization = avgMW / capacityMW;
  let riskLevel: ApiPrediction["riskLevel"] = "Low";
  if (utilization > 0.95) riskLevel = "Critical";
  else if (utilization > 0.85) riskLevel = "High";
  else if (utilization > 0.70) riskLevel = "Medium";

  const hourly = buildHourlyCurve(avgMW, capacityMW, confidencePct);
  const peakHour = derivePeakHour(hourly);

  const changeLabel =
    demandChangePct !== undefined
      ? demandChangePct >= 0
        ? `+${demandChangePct.toFixed(1)}% vs yesterday`
        : `${demandChangePct.toFixed(1)}% vs yesterday`
      : "";

  const insights = [
    `Predicted average demand for ${locationName}: ${avgMW.toLocaleString()} MW.`,
    `Peak demand expected around ${peakHour}.`,
    changeLabel ? `Demand change: ${changeLabel}.` : `Grid utilization at ${Math.round(utilization * 100)}% of capacity.`,
    riskLevel === "Critical" || riskLevel === "High"
      ? "⚠️ High grid stress expected — load management protocols advised."
      : riskLevel === "Medium"
      ? "Grid stress is moderate. Monitor transmission bottlenecks."
      : "Grid expected to handle projected loads comfortably.",
    `Forecast confidence: ${confidencePct}%.`,
  ];

  return {
    predictedDemand: avgMW,
    currentCapacity: capacityMW,
    peakHour,
    riskLevel,
    hourlyDemand: hourly,
    insights,
    demandChangePct,
    confidencePct,
  };
}

/** Approximate state-level capacity (MW) — static grid data, not ML output. */
const STATE_CAPACITY: Record<string, number> = {
  "Delhi": 9000, "ER Odisha": 7000, "Goa": 1000, "Gujarat": 28000,
  "Haryana": 14000, "HP": 3000, "J&K (UT) & Ladakh (UT)": 3500,
  "Jharkhand": 5500, "Kerala": 6500, "Manipur": 700, "Mizoram": 500,
  "MP": 22000, "Nagaland": 600, "NER Meghalaya": 900, "NR UP": 28000,
  "Puducherry": 1300, "Punjab": 15000, "Rajasthan": 22000, "Sikkim": 400,
  "SR Karnataka": 21000, "Tamil Nadu": 24000, "Telangana": 17000,
  "Tripura": 800, "Uttarakhand": 4000, "West Bengal": 13000,
  "WR Maharashtra": 32000, "Andhra Pradesh": 15000, "Arunachal Pradesh": 1000,
  "Assam": 2500, "Bihar": 7000, "Chandigarh": 500, "Chhattisgarh": 9000,
  "DD": 300, "DNH": 400, "DVC": 7000,
};

const DEFAULT_CAPACITY = 10000;

export default function Home() {
  const [selectedMarker, setSelectedMarker] = useState<StateMarker | null>(null);

  const [forecastMode, setForecastMode] = useState<ForecastMode>({
    type: "quick",
    hours: 24,
    label: "Forecast Until Tomorrow",
  });

  // ML API state
  const [prediction, setPrediction] = useState<ApiPrediction | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  const targetDate = useMemo(() => {
    if (forecastMode.type === "quick" && forecastMode.hours) {
      return new Date(Date.now() + forecastMode.hours * 60 * 60 * 1000);
    } else if (forecastMode.type === "advanced" && forecastMode.targetDate) {
      return forecastMode.targetDate;
    }
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }, [forecastMode]);

  const targetDateStr = useMemo(
    () => targetDate.toISOString().split("T")[0],
    [targetDate]
  );

  const fetchPrediction = useCallback(async () => {
    if (!selectedMarker) {
      setPrediction(null);
      setPredictionError(null);
      return;
    }

    setIsPredicting(true);
    setPredictionError(null);
    setPrediction(null);

    try {
      // Use city endpoint (most specific). Falls back to state endpoint on 404/500.
      let avgMW: number;
      let confidencePct = 85;

      const cityRes = await fetch(`${API_BASE}/predict/city`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: selectedMarker.cityName, date: targetDateStr }),
      });

      if (cityRes.ok) {
        const data = await cityRes.json();
        // Backend returns total daily MWh → convert to average MW
        avgMW = Math.round(data.predicted_demand_mwh / 24);
        confidencePct = 90; // city model is more precise
      } else {
        // Fall back to state endpoint
        const stateRes = await fetch(`${API_BASE}/predict/state`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: selectedMarker.stateName, date: targetDateStr }),
        });
        if (!stateRes.ok) {
          const errBody = await stateRes.json().catch(() => ({}));
          throw new Error(errBody?.detail || `API error ${stateRes.status}`);
        }
        const data = await stateRes.json();
        // Backend returns MU (million units = GWh) → convert to average MW
        avgMW = Math.round((data.predicted_demand_mu * 1000) / 24);
        confidencePct = 80;
      }

      const capacity =
        STATE_CAPACITY[selectedMarker.stateName] ?? DEFAULT_CAPACITY;

      const built = buildPrediction(
        avgMW,
        capacity,
        confidencePct,
        selectedMarker.stateName
      );
      setPrediction(built);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setPredictionError(msg);
    } finally {
      setIsPredicting(false);
    }
  }, [selectedMarker, targetDateStr]);

  useEffect(() => {
    fetchPrediction();
  }, [fetchPrediction]);

  const scrollToDashboard = () => {
    setTimeout(() => {
      document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleMarkerSelect = (marker: StateMarker) => {
    setSelectedMarker(marker);
    scrollToDashboard();
  };

  const handleBack = () => {
    setSelectedMarker(null);
    scrollToDashboard();
  };

  const handleClearFilters = () => {
    setSelectedMarker(null);
    setForecastMode({ type: "quick", hours: 24, label: "Forecast Until Tomorrow" });
    scrollToDashboard();
  };

  const locationName = selectedMarker
    ? `${selectedMarker.stateName} (${selectedMarker.cityName})`
    : "India (All States)";

  const isLoading = isPredicting;

  return (
    <main className="min-h-screen bg-cream">
      <HeroSection />

      <div id="dashboard" className="max-w-[1280px] mx-auto py-16 space-y-6">

        {/* Forecast Settings — only if a location is selected */}
        {selectedMarker && (
          <ForecastControls currentMode={forecastMode} onModeChange={setForecastMode} />
        )}

        {/* Breadcrumb + Filters */}
        {(selectedMarker || forecastMode.hours !== 24 || forecastMode.type !== "quick") && (
          <div className="px-5 md:px-10 lg:px-16 mt-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <button onClick={handleBack} className="hover:text-saffron transition-colors cursor-pointer">
                India
              </button>
              {selectedMarker && (
                <>
                  <span className="text-border-hover">/</span>
                  <span className="text-saffron font-semibold">{selectedMarker.stateName}</span>
                  <span className="text-border-hover">/</span>
                  <span className="text-saffron font-semibold">{selectedMarker.cityName}</span>
                </>
              )}
            </div>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-cream-dark text-navy hover:bg-border transition-colors rounded-xl text-xs font-semibold self-start md:self-auto"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Metrics */}
        <div className="relative">
          {isPredicting && (
            <div className="absolute top-4 right-4 text-xs font-semibold text-saffron animate-pulse bg-saffron/10 px-3 py-1 rounded-full z-10">
              ML Model Running...
            </div>
          )}
          <KeyMetrics
            prediction={prediction}
            locationName={locationName}
            isLoading={isLoading}
            error={predictionError}
            onRetry={fetchPrediction}
          />
        </div>

        <div className="px-5 md:px-10 lg:px-16 space-y-6">
          <IndiaMap
            states={STATE_MARKERS}
            onMarkerSelect={handleMarkerSelect}
            selectedMarker={selectedMarker}
            onBack={handleBack}
          />

          {/* Error banner */}
          {predictionError && (
            <div className="bento-card p-4 border-l-4 border-saffron bg-saffron/5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-navy">Could not reach the ML backend</p>
                <p className="text-xs text-text-muted mt-0.5">{predictionError}. Make sure the FastAPI server is running on port 8000.</p>
              </div>
              <button
                onClick={fetchPrediction}
                className="shrink-0 px-4 py-2 bg-saffron text-white rounded-xl text-xs font-semibold hover:bg-saffron/90 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <DemandForecastChart
              data={prediction?.hourlyDemand ?? []}
              locationName={locationName}
              isLoading={isLoading}
              demandChangePct={prediction?.demandChangePct}
              confidencePct={prediction?.confidencePct}
              peakHour={prediction?.peakHour}
            />
            <GridStressChart
              data={prediction?.hourlyDemand ?? []}
              locationName={locationName}
              isLoading={isLoading}
              utilizationPct={
                prediction
                  ? Math.round((prediction.predictedDemand / prediction.currentCapacity) * 100)
                  : null
              }
            />
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
