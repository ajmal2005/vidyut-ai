"use client";

import { motion } from "framer-motion";
import { Zap, Power, Database, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import type { ApiPrediction } from "@/lib/types";

interface MetricsProps {
    prediction: ApiPrediction | null;
    locationName: string;
    isLoading: boolean;
    error: string | null;
}

function SkeletonCard({ className }: { className?: string }) {
    return (
        <div className={`bento-card p-5 flex flex-col justify-between animate-pulse ${className ?? ""}`}>
            <div className="h-3 w-24 bg-cream-dark rounded-full mb-4" />
            <div className="h-8 w-32 bg-cream-dark rounded-full" />
        </div>
    );
}

function SkeletonLarge() {
    return (
        <div className="bento-card col-span-4 row-span-2 p-6 flex flex-col justify-between bg-gradient-to-br from-saffron-bg to-white animate-pulse">
            <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cream-dark" />
                <div className="h-3 w-28 bg-cream-dark rounded-full" />
            </div>
            <div className="space-y-2">
                <div className="h-14 w-48 bg-cream-dark rounded-xl" />
                <div className="h-3 w-36 bg-cream-dark rounded-full" />
            </div>
        </div>
    );
}

export default function KeyMetrics({ prediction, locationName, isLoading, error }: MetricsProps) {
    const utilizationPct = prediction
        ? Math.round((prediction.predictedPeakMW / prediction.currentCapacity) * 100)
        : null;

    const riskColor: Record<string, string> = {
        Low: "text-india-green",
        Medium: "text-amber-500",
        High: "text-saffron",
        Critical: "text-red-600",
    };

    const RiskIcon = prediction?.riskLevel === "Low" || prediction?.riskLevel === "Medium"
        ? CheckCircle
        : AlertTriangle;

    return (
        <section className="px-5 md:px-10 lg:px-16">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-5">
                <h2 className="text-2xl md:text-3xl font-bold text-navy font-[family-name:var(--font-poppins)]">
                    Dashboard Overview
                </h2>
                <p className="text-sm text-text-muted mt-1">
                    {isLoading
                        ? "Fetching ML prediction…"
                        : error
                            ? "Select a location on the map to load forecast data"
                            : prediction
                                ? <>Showing ML forecast for <span className="text-saffron font-semibold">{locationName}</span></>
                                : <>Select a location on the map to view <span className="text-saffron font-semibold">live ML predictions</span></>}
                </p>
            </motion.div>

            {/* Bento Grid */}
            <div className="grid grid-cols-4 md:grid-cols-8 gap-4 auto-rows-[120px]">

                {/* ── Total Power Required — large card, 4 cols × 2 rows ── */}
                {isLoading ? (
                    <SkeletonLarge />
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4 }}
                        className="bento-card col-span-4 row-span-2 p-6 flex flex-col justify-between bg-gradient-to-br from-saffron-bg to-white"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-saffron/10">
                                <Database className="w-5 h-5 text-saffron" />
                            </div>
                            <span className="text-sm font-semibold text-text-secondary">
                                {prediction ? "Total Power Required" : "Total Power Required"}
                            </span>
                        </div>
                        <div>
                            {prediction ? (
                                <>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl md:text-6xl font-bold text-navy tracking-tight font-[family-name:var(--font-poppins)]">
                                            {prediction.rawValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-lg text-text-muted font-medium">{prediction.rawUnit}</span>
                                    </div>
                                    <p className="text-xs text-text-muted mt-6">
                                        Total forecasted energy · Peak at <strong className="text-navy">{prediction.peakHour}</strong>
                                    </p>
                                    {prediction.demandChangePct !== undefined && (
                                        <div className="flex items-center gap-1.5 mt-2">
                                            {prediction.demandChangePct >= 0
                                                ? <TrendingUp className="w-3.5 h-3.5 text-saffron" />
                                                : <TrendingDown className="w-3.5 h-3.5 text-india-green" />}
                                            <span className={`text-xs font-semibold ${prediction.demandChangePct >= 0 ? "text-saffron" : "text-india-green"}`}>
                                                {prediction.demandChangePct >= 0 ? "+" : ""}{prediction.demandChangePct.toFixed(1)}% vs yesterday
                                            </span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-text-muted">
                                    Select a state or city on the map above to load the ML forecast.
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* ── Grid Capacity ── */}
                {isLoading ? (
                    <SkeletonCard className="col-span-2 row-span-1 bg-gradient-to-br from-india-green-bg to-white" />
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.08 }}
                        className="bento-card col-span-2 row-span-1 p-5 flex flex-col justify-between bg-gradient-to-br from-india-green-bg to-white"
                    >
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-india-green/10">
                                <Power className="w-4 h-4 text-india-green" />
                            </div>
                            <span className="text-xs font-semibold text-text-secondary">Grid Capacity</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl md:text-3xl font-bold text-navy tracking-tight font-[family-name:var(--font-poppins)]">
                                {prediction ? prediction.currentCapacity.toLocaleString() : "—"}
                            </span>
                            <span className="text-sm text-text-muted">MW</span>
                        </div>
                    </motion.div>
                )}

                {/* ── Risk Level ── */}
                {isLoading ? (
                    <SkeletonCard className="col-span-2 row-span-1" />
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.12 }}
                        className="bento-card col-span-2 row-span-1 p-5 flex flex-col justify-between"
                    >
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-saffron/10">
                                {prediction
                                    ? <RiskIcon className={`w-4 h-4 ${riskColor[prediction.riskLevel]}`} />
                                    : <AlertTriangle className="w-4 h-4 text-text-muted" />}
                            </div>
                            <span className="text-xs font-semibold text-text-secondary">Grid Risk</span>
                        </div>
                        <span className={`text-2xl md:text-3xl font-bold tracking-tight font-[family-name:var(--font-poppins)] ${prediction ? riskColor[prediction.riskLevel] : "text-text-muted"}`}>
                            {prediction ? prediction.riskLevel : "—"}
                        </span>
                    </motion.div>
                )}

                {/* ── Peak Demand ── */}
                {isLoading ? (
                    <SkeletonCard className="col-span-2 row-span-1" />
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.16 }}
                        className="bento-card col-span-2 row-span-1 p-5 flex flex-col justify-between"
                    >
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-navy/5">
                                <Zap className="w-4 h-4 text-navy" />
                            </div>
                            <span className="text-xs font-semibold text-text-secondary">Peak Demand</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl md:text-3xl font-bold text-navy tracking-tight font-[family-name:var(--font-poppins)]">
                                {prediction ? prediction.predictedPeakMW.toLocaleString() : "—"}
                            </span>
                            {prediction && (
                                <span className="text-sm text-text-muted font-medium">MW</span>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* ── Capacity Utilization ── */}
                {isLoading ? (
                    <SkeletonCard className="col-span-2 row-span-1 bg-gradient-to-br from-india-green-bg/50 to-white" />
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="bento-card col-span-2 row-span-1 p-5 flex flex-col justify-between bg-gradient-to-br from-india-green-bg/50 to-white"
                    >
                        <span className="text-xs font-semibold text-text-secondary">Capacity Used</span>
                        {utilizationPct !== null ? (
                            <div className="flex items-center gap-3">
                                <span className="text-2xl md:text-3xl font-bold text-india-green tracking-tight font-[family-name:var(--font-poppins)]">
                                    {utilizationPct}%
                                </span>
                                <div className="flex-1 h-2 bg-cream-dark rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        whileInView={{ width: `${Math.min(utilizationPct, 100)}%` }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1, delay: 0.3 }}
                                        className={`h-full rounded-full ${utilizationPct > 85
                                            ? "bg-gradient-to-r from-saffron to-[#E15320]"
                                            : "bg-gradient-to-r from-india-green to-india-green-light"
                                            }`}
                                    />
                                </div>
                            </div>
                        ) : (
                            <span className="text-2xl md:text-3xl font-bold text-text-muted tracking-tight font-[family-name:var(--font-poppins)]">—</span>
                        )}
                    </motion.div>
                )}



            </div>
        </section>
    );
}
