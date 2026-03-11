"use client";

import { motion } from "framer-motion";
import {
    ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { Activity } from "lucide-react";

interface HourlyPoint {
    time: string;
    predicted: number;
    capacity: number;
}

interface GridStressChartProps {
    data: HourlyPoint[];
    locationName: string;
    isLoading: boolean;
    utilizationPct: number | null;
}

function CustomTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string }>;
    label?: string;
}) {
    if (!active || !payload?.length) return null;
    const demand = payload.find((p) => p.dataKey === "predicted");
    const cap = payload.find((p) => p.dataKey === "capacity");
    const util = demand && cap && cap.value > 0
        ? Math.round((demand.value / cap.value) * 100)
        : null;

    return (
        <div className="bg-white rounded-xl p-3 text-xs border border-border shadow-lg min-w-[160px]">
            <p className="text-navy font-semibold mb-2">{label}</p>
            {demand && (
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#E8652E]" />
                    <span className="text-text-muted">Demand:</span>
                    <span className="text-navy font-semibold ml-auto">{demand.value.toLocaleString()} MW</span>
                </div>
            )}
            {cap && (
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#1B8B3D]" />
                    <span className="text-text-muted">Capacity:</span>
                    <span className="text-navy font-semibold ml-auto">{cap.value.toLocaleString()} MW</span>
                </div>
            )}
            {util !== null && (
                <div className="mt-1.5 pt-1.5 border-t border-border">
                    <div className="flex items-center gap-2">
                        <span className="text-text-muted">Load factor:</span>
                        <span className={`font-semibold ml-auto ${util > 90 ? "text-red-600" : util > 80 ? "text-saffron" : "text-india-green"}`}>
                            {util}%
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

function ChartSkeleton() {
    return (
        <div className="w-full h-[280px] md:h-[320px] animate-pulse flex flex-col gap-3 pt-2">
            <div className="flex-1 bg-cream-dark rounded-xl" />
            <div className="h-4 w-48 bg-cream-dark rounded-full mx-auto" />
        </div>
    );
}

/** Find hours where demand exceeds 85% of capacity (stress zones) */
function findStressHours(data: HourlyPoint[]): string[] {
    return data
        .filter((h) => h.capacity > 0 && h.predicted / h.capacity > 0.85)
        .map((h) => h.time);
}

export default function GridStressChart({
    data,
    locationName,
    isLoading,
    utilizationPct,
}: GridStressChartProps) {
    const stressHours = findStressHours(data);
    const firstStress = stressHours[0] ?? null;

    const utilizationColor =
        utilizationPct === null ? "text-text-muted"
        : utilizationPct > 90 ? "text-red-600"
        : utilizationPct > 80 ? "text-saffron"
        : "text-india-green";

    const utilizationBg =
        utilizationPct === null ? "bg-cream-dark"
        : utilizationPct > 90 ? "bg-red-50"
        : utilizationPct > 80 ? "bg-saffron/10"
        : "bg-india-green-bg";

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bento-card p-5 md:p-6"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-india-green/10">
                        <Activity className="w-5 h-5 text-india-green" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-navy font-[family-name:var(--font-poppins)]">
                            Grid Stress & Utilization
                        </h3>
                        <p className="text-xs text-text-muted">
                            {isLoading ? "Loading prediction…" : data.length ? `Demand vs Capacity · ${locationName}` : "Select a location"}
                        </p>
                    </div>
                </div>

                {/* Utilization badge */}
                {utilizationPct !== null && !isLoading && (
                    <div className={`flex flex-col items-center px-3 py-1.5 rounded-xl ${utilizationBg}`}>
                        <span className={`text-lg font-bold ${utilizationColor} font-[family-name:var(--font-poppins)]`}>
                            {utilizationPct}%
                        </span>
                        <span className="text-[10px] text-text-muted">utilization</span>
                    </div>
                )}
            </div>

            {/* Stress alert */}
            {!isLoading && stressHours.length > 0 && (
                <div className="mb-3 px-3 py-2 bg-saffron/8 border border-saffron/20 rounded-xl text-xs text-saffron font-medium">
                    ⚡ High stress expected from <strong>{stressHours[0]}</strong> to <strong>{stressHours[stressHours.length - 1]}</strong> ({stressHours.length} hrs above 85% capacity)
                </div>
            )}

            <div className="w-full h-[260px] md:h-[280px] min-w-0 min-h-0">
                {isLoading ? (
                    <ChartSkeleton />
                ) : data.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-sm text-text-muted flex-col gap-2">
                        <Activity className="w-8 h-8 text-border" />
                        <span>Select a location to view grid stress</span>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <ComposedChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#E8652E" stopOpacity={0.18} />
                                    <stop offset="100%" stopColor="#E8652E" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DB" />
                            <XAxis
                                dataKey="time"
                                tick={{ fill: "#9CA0B0", fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                                interval={3}
                            />
                            <YAxis
                                tick={{ fill: "#9CA0B0", fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{ paddingTop: 8, fontSize: 11 }}
                                formatter={(v: string) => (
                                    <span className="text-text-secondary text-xs">
                                        {v === "predicted" ? "Demand (MW)" : "Capacity (MW)"}
                                    </span>
                                )}
                            />

                            {/* Demand area */}
                            <Area
                                type="monotone"
                                dataKey="predicted"
                                stroke="#E8652E"
                                strokeWidth={2}
                                fill="url(#demandGrad)"
                                dot={false}
                                activeDot={{ r: 4, fill: "#E8652E", strokeWidth: 0 }}
                            />

                            {/* Capacity line — dashed ceiling */}
                            <Line
                                type="monotone"
                                dataKey="capacity"
                                stroke="#1B8B3D"
                                strokeWidth={2}
                                strokeDasharray="6 3"
                                dot={false}
                                activeDot={{ r: 4, fill: "#1B8B3D", strokeWidth: 0 }}
                            />

                            {/* 85% stress threshold reference line */}
                            {data[0]?.capacity && (
                                <ReferenceLine
                                    y={Math.round(data[0].capacity * 0.85)}
                                    stroke="#E8652E"
                                    strokeDasharray="3 4"
                                    strokeWidth={1}
                                    strokeOpacity={0.5}
                                    label={{
                                        value: "85% threshold",
                                        position: "insideTopRight",
                                        fill: "#E8652E",
                                        fontSize: 9,
                                        opacity: 0.7,
                                    }}
                                />
                            )}

                            {/* First high-stress hour marker */}
                            {firstStress && (
                                <ReferenceLine
                                    x={firstStress}
                                    stroke="#E8652E"
                                    strokeDasharray="4 3"
                                    strokeWidth={1.5}
                                    strokeOpacity={0.6}
                                    label={{ value: "Stress start", position: "top", fill: "#E8652E", fontSize: 9 }}
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>
        </motion.div>
    );
}
