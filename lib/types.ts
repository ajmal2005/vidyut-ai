// Shared types for the energy forecasting dashboard.
// This is the single source of truth — no mock data anywhere.

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export interface HourlyPoint {
  time: string;
  predicted: number;
  capacity: number;
  /** Uncertainty band — upper bound (optional, from API) */
  upper?: number;
  /** Uncertainty band — lower bound (optional, from API) */
  lower?: number;
}

export interface LocationMarker {
  /** Display name for the state or city */
  name: string;
  type: "state" | "city";
  lat: number;
  lng: number;
}

export interface ForecastMode {
  type: "quick" | "advanced";
  hours?: number; // for quick: 24, 48, 72
  targetDate?: Date; // for advanced
  label: string;
}

export interface ApiPrediction {
  predictedDemand: number;    // average MW for the day (used for charts)
  rawValue: number;           // Raw value from API (MWh for city, MU for state)
  rawUnit: string;            // Unit for the raw value
  currentCapacity: number;    // grid capacity in MW
  peakHour: string;           // e.g. "7 PM"
  riskLevel: RiskLevel;
  hourlyDemand: HourlyPoint[];
  insights: string[];
  /** Change % vs previous day — positive means increase */
  demandChangePct?: number;
  /** ML model confidence 0–100 */
  confidencePct?: number;
}
