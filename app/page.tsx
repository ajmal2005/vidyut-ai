"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import HeroSection from "@/components/HeroSection";
import KeyMetrics from "@/components/KeyMetrics";
import DemandForecastChart from "@/components/DemandForecastChart";
import GridStressChart from "@/components/GridStressChart";
import ForecastControls from "@/components/ForecastControls";
import Footer from "@/components/Footer";
import type { ForecastMode, ApiPrediction, LocationMarker } from "@/lib/types";

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

const API_BASE = "http://127.0.0.1:8000";

function getDynamicLoadShape(dateStr?: string, locationName?: string): number[] {
  const date = dateStr ? new Date(dateStr) : new Date();
  const month = date.getMonth();
  const isSummer = month >= 3 && month <= 6; // Apr-Jul
  const isWinter = month >= 10 || month <= 1; // Nov-Feb

  // Generate a pseudo-random seed based on date and location
  const str = (dateStr || "") + (locationName || "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const random = Math.abs(hash) / 2147483647 || 0.5; // 0 to 1

  const base = [
    0.70, 0.68, 0.65, 0.64, 0.68, 0.75,
    0.85, 0.95, 1.05, 1.10, 1.15, 1.12,
    1.08, 1.05, 1.04, 1.06, 1.10, 1.18,
    1.25, 1.35, 1.45, 1.30, 1.15, 0.90
  ];

  // Add some daily noise to all hours (±5%)
  for (let i = 0; i < 24; i++) {
    base[i] += (Math.sin(hash + i) * 0.05);
  }

  if (isSummer) {
    // Summer afternoon peaks due to AC (2 PM - 5 PM)
    const summerBoost = 0.35 + (random * 0.25); 
    base[14] += summerBoost * 0.8;
    base[15] += summerBoost;       // 3 PM
    base[16] += summerBoost * 0.9;
  } else if (isWinter) {
    // Winter morning and evening peaks
    const winterBoost = 0.15 + (random * 0.15);
    base[8] += winterBoost;
    base[9] += winterBoost;
    base[19] += winterBoost * 1.2; // 7 PM
    base[20] += winterBoost * 1.1; // 8 PM
  } else {
    // Transition months
    const shift = Math.floor(random * 3); // 0, 1, or 2 (7 PM, 8 PM, or 9 PM)
    base[19 + shift] += 0.20 + (random * 0.1); 
  }

  // Ensure positive values
  return base.map(v => Math.max(0.1, v));
}

function buildHourlyCurve(
  avgMW: number,
  peakMW: number | undefined,
  capacityMW: number,
  confidencePct: number,
  dateStr?: string,
  locationName?: string
): ApiPrediction["hourlyDemand"] {
  const shape = getDynamicLoadShape(dateStr, locationName);
  const maxFactor = Math.max(...shape);
  const curvePeak = avgMW * maxFactor;

  return shape.map((factor, i) => {
    let predicted = Math.round(avgMW * factor);
    
    // Scale curve to exactly match the API's peakMW if provided
    if (peakMW) {
      predicted = Math.round((predicted / curvePeak) * peakMW);
    }

    const uncertainty = predicted * ((1 - confidencePct / 100) * 0.3);
    return {
      time: `${i.toString().padStart(2, "0")}:00`,
      predicted,
      capacity: capacityMW,
      upper: Math.round(predicted + uncertainty),
      lower: Math.max(0, Math.round(predicted - uncertainty)),
    };
  });
}

function derivePeakHour(hourly: ApiPrediction["hourlyDemand"]): string {
  const peak = hourly.reduce((max, h) => (h.predicted > max.predicted ? h : max), hourly[0]);
  const hour = parseInt(peak.time);
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

/** Build a full ApiPrediction from the raw ML output.
 *  Pass peakMW when the ML provides it directly (states).
 *  Leave undefined for cities/India — it will be derived from the curve. */
function buildPrediction(
  avgMW: number,
  peakMW: number | undefined,
  rawValue: number,
  rawUnit: string,
  capacityMW: number,
  confidencePct: number,
  locationName: string,
  targetDateStr: string,
  demandChangePct?: number
): ApiPrediction {
  const hourly = buildHourlyCurve(avgMW, peakMW, capacityMW, confidencePct, targetDateStr, locationName);
  const peakHour = derivePeakHour(hourly);

  // Use ML-predicted peak when available (states); otherwise derive from curve
  const actualPeakMW = peakMW ?? Math.max(...hourly.map((h) => h.predicted));

  // ✅ CRITICAL: Calculate the REAL average of the hourly points.
  // This ensures the header card and the chart match perfectly.
  const actualAvgMW = Math.round(
    hourly.reduce((acc, h) => acc + h.predicted, 0) / hourly.length
  );

  // Risk based on peak utilization — more accurate than average
  const utilization = actualPeakMW / capacityMW;
  let riskLevel: ApiPrediction["riskLevel"] = "Low";
  if (utilization > 0.95) riskLevel = "Critical";
  else if (utilization > 0.85) riskLevel = "High";
  else if (utilization > 0.70) riskLevel = "Medium";

  const changeLabel =
    demandChangePct !== undefined
      ? demandChangePct >= 0
        ? `+${demandChangePct.toFixed(1)}% vs yesterday`
        : `${demandChangePct.toFixed(1)}% vs yesterday`
      : "";

  const insights = [
    `Peak demand of ${actualPeakMW.toLocaleString()} MW expected around ${peakHour}.`,
    `Average forecasted demand: ${actualAvgMW.toLocaleString()} MW.`,
    changeLabel
      ? `Demand change: ${changeLabel}.`
      : `Grid utilization reaching ${Math.round(utilization * 100)}% of capacity.`,
    riskLevel === "Critical" || riskLevel === "High"
      ? "⚠️ High grid stress expected — load management protocols advised."
      : riskLevel === "Medium"
        ? "Grid stress is moderate. Monitor transmission bottlenecks."
        : "Grid expected to handle projected loads comfortably.",
    `Forecast confidence: ${confidencePct}%.`,
  ];

  return {
    predictedDemand: actualAvgMW,
    rawValue,
    rawUnit,
    currentCapacity: capacityMW,
    peakHour,
    predictedPeakMW: actualPeakMW,   // ✅ kept from your version
    riskLevel,
    hourlyDemand: hourly,
    insights,
    demandChangePct,
    confidencePct,
  };
}

const INDIA_CAPACITY = 270000; // ✅ from teammate — needed for national view

/** Covers both states and cities — your version, more complete */
const LOCATION_CAPACITY: Record<string, number> = {
  // States
  "Delhi": 9000, "ER Odisha": 7000, "Goa": 1000, "Gujarat": 28000,
  "Haryana": 14000, "HP": 3000, "J&K(UT) & Ladakh(UT)": 3500,
  "Jharkhand": 5500, "Kerala": 6500, "Manipur": 700, "Mizoram": 500,
  "MP": 22000, "Nagaland": 600, "NER Meghalaya": 900, "NR UP": 28000,
  "Puducherry": 1300, "Punjab": 15000, "Rajasthan": 22000, "Sikkim": 400,
  "SR Karnataka": 21000, "Tamil Nadu": 24000, "Telangana": 17000,
  "Tripura": 800, "Uttarakhand": 4000, "West Bengal": 13000,
  "WR Maharashtra": 32000, "Andhra Pradesh": 15000, "Arunachal Pradesh": 1000,
  "Assam": 2500, "Bihar": 7000, "Chandigarh": 500, "Chhattisgarh": 9000,
  "DD": 300, "DNH": 400, "DVC": 7000, "NER Tripura": 800, "NER Manipur": 700,
  "NER Mizoram": 500, "NER Nagaland": 600,
  // Cities
  "Mumbai": 6500, "Bengaluru": 5000, "Chennai": 4500, "Hyderabad": 4500,
  "Kolkata": 3500, "Ahmedabad": 3000, "Pune": 3000, "Jaipur": 2500,
  "Lucknow": 2500, "New Delhi": 4000, "Indore": 2000, "Kochi": 1500,
  "Visakhapatnam": 1800, "Patna": 1800, "Ranchi": 1200, "Bhubaneswar": 1200,
  "Guwahati": 1000, "Dehradun": 800, "Shimla": 400, "Srinagar": 800,
};

const DEFAULT_CAPACITY = 1000; // ✅ your value — realistic for unknown cities

export default function Home() {
  const [locations, setLocations] = useState<LocationMarker[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<LocationMarker | null>(null);

  const [forecastMode, setForecastMode] = useState<ForecastMode>({
    type: "quick",
    hours: 24,
    label: "Forecast Until Tomorrow",
  });

  const [prediction, setPrediction] = useState<ApiPrediction | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/locations`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          const cities = data.cities.map((c: { name: string; lat: number; lng: number }) => ({ ...c, type: "city" }));
          const states = data.states.map((s: { name: string; lat: number; lng: number }) => ({ ...s, type: "state" }));
          setLocations([...states, ...cities]);
        }
      })
      .catch((err) => console.error("Could not fetch locations:", err));
  }, []);

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
    setIsPredicting(true);
    setPredictionError(null);
    setPrediction(null);

    try {
      let avgMW: number;
      let peakMW: number | undefined;
      let rawValue: number;
      let rawUnit: string;
      let confidencePct = 85;

      if (!selectedMarker) {
        // ✅ Teammate's national India view
        const indiaRes = await fetch(
          `${API_BASE}/predict/india?forecast_date=${targetDateStr}`
        );
        if (!indiaRes.ok) {
          const errBody = await indiaRes.json().catch(() => ({}));
          throw new Error(errBody?.detail || `API error ${indiaRes.status}`);
        }
        const data = await indiaRes.json();
        rawValue = data.predicted_demand_mu;
        rawUnit = "MU";
        avgMW = Math.round((rawValue * 1000) / 24);
        peakMW = Math.round(data.predicted_max_demand_mw); // use ML peak if provided
        confidencePct = 88;

        setPrediction(
          buildPrediction(avgMW, peakMW, rawValue, rawUnit, INDIA_CAPACITY, confidencePct, "India", targetDateStr)
        );
        return;
      }

      if (selectedMarker.type === "city") {
        const cityRes = await fetch(`${API_BASE}/predict/city`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city: selectedMarker.name, date: targetDateStr }),
        });
        if (!cityRes.ok) {
          const errBody = await cityRes.json().catch(() => ({}));
          throw new Error(errBody?.detail || `API error ${cityRes.status}`);
        }
        const data = await cityRes.json();
        const mwh = data.predicted_demand_mwh;
        rawValue = mwh / 1000; // convert MWh → MU (1 MU = 1000 MWh)
        rawUnit = "MU";
        avgMW = Math.round((rawValue * 1000) / 24); // MU → MWh → average MW
        peakMW = undefined; // cities: derive from curve
        confidencePct = 90;
      } else {
        const stateRes = await fetch(`${API_BASE}/predict/state`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: selectedMarker.name, date: targetDateStr }),
        });
        if (!stateRes.ok) {
          const errBody = await stateRes.json().catch(() => ({}));
          throw new Error(errBody?.detail || `API error ${stateRes.status}`);
        }
        const data = await stateRes.json();
        rawValue = data.predicted_demand_mu;
        rawUnit = "MU";
        peakMW = Math.round(data.predicted_max_demand_mw); // ✅ ML peak for states
        avgMW = Math.round((rawValue * 1000) / 24);
        confidencePct = 80;
      }

      const capacity = LOCATION_CAPACITY[selectedMarker.name] ?? DEFAULT_CAPACITY;
      setPrediction(
        buildPrediction(avgMW, peakMW, rawValue, rawUnit, capacity, confidencePct, selectedMarker.name, targetDateStr)
      );
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

  const handleMarkerSelect = (marker: LocationMarker) => {
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
    ? `${selectedMarker.name} (${selectedMarker.type === "state" ? "State" : "City"})`
    : "India (All States)";

  return (
    <main className="min-h-screen bg-cream">
      <HeroSection />

      <div id="dashboard" className="max-w-[1280px] mx-auto py-16 space-y-6">

        {/* ✅ Teammate's UX: always-visible forecast controls */}
        <ForecastControls currentMode={forecastMode} onModeChange={setForecastMode} />

        {(selectedMarker || forecastMode.hours !== 24 || forecastMode.type !== "quick") && (
          <div className="px-5 md:px-10 lg:px-16 mt-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <button onClick={handleBack} className="hover:text-saffron transition-colors cursor-pointer">
                India
              </button>
              {selectedMarker && (
                <>
                  <span className="text-border-hover">/</span>
                  <span className="text-saffron font-semibold">{selectedMarker.name}</span>
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

        <div className="relative">
          {isPredicting && (
            <div className="absolute top-4 right-4 text-xs font-semibold text-saffron animate-pulse bg-saffron/10 px-3 py-1 rounded-full z-10">
              ML Model Running...
            </div>
          )}
          <KeyMetrics
            prediction={prediction}
            locationName={locationName}
            isLoading={isPredicting}
            error={predictionError}
          />
        </div>

        <div className="px-5 md:px-10 lg:px-16 space-y-6">
          <IndiaMap
            locations={locations}
            onMarkerSelect={handleMarkerSelect}
            selectedMarker={selectedMarker}
            onBack={handleBack}
          />

          {predictionError && (
            <div className="bento-card p-4 border-l-4 border-saffron bg-saffron/5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-navy">Could not reach the ML backend</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {predictionError}. Make sure the FastAPI server is running on port 8000.
                </p>
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
              isLoading={isPredicting}
              demandChangePct={prediction?.demandChangePct}
              peakHour={prediction?.peakHour}
            />
            <GridStressChart
              data={prediction?.hourlyDemand ?? []}
              locationName={locationName}
              isLoading={isPredicting}
              utilizationPct={
                prediction
                  ? Math.round((prediction.predictedPeakMW / prediction.currentCapacity) * 100)
                  : null  // ✅ your formula: peak-based, not average-based
              }
            />
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}