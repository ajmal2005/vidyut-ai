"use client";

import { motion } from "framer-motion";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface HourlyPoint {
    time: string;
    predicted: number;
    upper?: number;
    lower?: number;
}

interface DemandChartProps {
    data: HourlyPoint[];
    locationName: string;
    isLoading: boolean;
    demandChangePct?: number;
    confidencePct?: number;
    peakHour?: string;
}

function CustomTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string; name: string }>;
    label?: string;
}) {
    if (!active || !payload?.length) return null;
    const predicted = payload.find((p) => p.dataKey === "predicted");
    const upper = payload.find((p) => p.dataKey === "upper");
    const lower = payload.find((p) => p.dataKey === "lower");
    return (
        <div className="bg-white rounded-xl p-3 text-xs border border-border shadow-lg min-w-[160px]">
            <p className="text-navy font-semibold mb-2">{label}</p>
            {predicted && (
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#E8652E]" />
                    <span className="text-text-muted">Predicted:</span>
                    <span className="text-navy font-semibold ml-auto">{predicted.value.toLocaleString()} MW</span>
                </div>
            )}
            {upper && lower && (
                <div className="flex items-center gap-2 text-text-muted">
                    <span className="w-2 h-2 rounded-full bg-[#E8652E]/30" />
                    <span>Confidence band:</span>
                    <span className="ml-auto">{lower.value.toLocaleString()}–{upper.value.toLocaleString()}</span>
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

export default function DemandForecastChart({
    data,
    locationName,
    isLoading,
    demandChangePct,
    confidencePct,
    peakHour,
}: DemandChartProps) {
    // Find peak hour index for reference line
    const peakPoint = data.length
        ? data.reduce((max, h) => (h.predicted > max.predicted ? h : max), data[0])
        : null;

    const hasConfidenceBand = data.some((d) => d.upper !== undefined && d.lower !== undefined);

    const ChangeBadge = () => {
        if (demandChangePct === undefined) return null;
        const isUp = demandChangePct > 0;
        const isFlat = Math.abs(demandChangePct) < 0.05;
        const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
        const color = isFlat ? "text-text-muted" : isUp ? "text-saffron" : "text-india-green";
        const bg = isFlat ? "bg-cream-dark" : isUp ? "bg-saffron/10" : "bg-india-green/10";
        return (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${bg}`}>
                <Icon className={`w-3 h-3 ${color}`} />
                <span className={`text-[11px] font-semibold ${color}`}>
                    {isFlat ? "No change" : `${isUp ? "+" : ""}${demandChangePct.toFixed(1)}% vs yesterday`}
                </span>
            </div>
        );
    };

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
                    <div className="p-2 rounded-xl bg-saffron/10">
                        <TrendingUp className="w-5 h-5 text-saffron" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-navy font-[family-name:var(--font-poppins)]">
                            24-Hour Demand Forecast
                        </h3>
                        <p className="text-xs text-text-muted">
                            {isLoading ? "Loading prediction…" : data.length ? locationName : "Select a location"}
                        </p>
                    </div>
                </div>
                <ChangeBadge />
            </div>

            {/* Stats strip */}
            {!isLoading && (peakHour || confidencePct !== undefined) && (
                <div className="flex gap-4 mb-4 px-1">
                    {peakHour && (
                        <div className="text-center">
                            <p className="text-[10px] text-text-muted uppercase tracking-wide">Peak Hour</p>
                            <p className="text-sm font-bold text-navy">{peakHour}</p>
                        </div>
                    )}
                    {peakPoint && (
                        <div className="text-center">
                            <p className="text-[10px] text-text-muted uppercase tracking-wide">Peak Demand</p>
                            <p className="text-sm font-bold text-saffron">{peakPoint.predicted.toLocaleString()} MW</p>
                        </div>
                    )}
                    {confidencePct !== undefined && (
                        <div className="text-center">
                            <p className="text-[10px] text-text-muted uppercase tracking-wide">Confidence</p>
                            <p className="text-sm font-bold text-navy">{confidencePct}%</p>
                        </div>
                    )}
                </div>
            )}

            <div className="w-full h-[260px] md:h-[290px] min-w-0 min-h-0">
                {isLoading ? (
                    <ChartSkeleton />
                ) : data.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-sm text-text-muted flex-col gap-2">
                        <TrendingUp className="w-8 h-8 text-border" />
                        <span>Select a location to view the forecast curve</span>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <AreaChart data={data} margin={{ top: 20, right: 4, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#E8652E" stopOpacity={0.28} />
                                    <stop offset="100%" stopColor="#E8652E" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#E8652E" stopOpacity={0.08} />
                                    <stop offset="100%" stopColor="#E8652E" stopOpacity={0.02} />
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
                                        {v === "predicted" ? "Predicted Demand (MW)" : v === "upper" ? "Upper Bound" : "Lower Bound"}
                                    </span>
                                )}
                            />

                            {/* Confidence band (upper/lower) */}
                            {hasConfidenceBand && (
                                <>
                                    <Area
                                        type="monotone"
                                        dataKey="upper"
                                        stroke="transparent"
                                        fill="url(#bandGrad)"
                                        dot={false}
                                        legendType="none"
                                        tooltipType="none"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="lower"
                                        stroke="transparent"
                                        fill="white"
                                        dot={false}
                                        legendType="none"
                                        tooltipType="none"
                                    />
                                </>
                            )}

                            {/* Main predicted demand line */}
                            <Area
                                type="monotone"
                                dataKey="predicted"
                                stroke="#E8652E"
                                strokeWidth={3}
                                fill="url(#predGrad)"
                                dot={false}
                                activeDot={{ r: 5, fill: "#E8652E", strokeWidth: 0 }}
                            />

                            {/* Peak hour reference line */}
                            {peakPoint && (
                                <ReferenceLine
                                    x={peakPoint.time}
                                    stroke="#E8652E"
                                    strokeDasharray="4 3"
                                    strokeWidth={1.5}
                                    label={{ value: "Peak", position: "top", fill: "#E8652E", fontSize: 10, fontWeight: 700 }}
                                />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </motion.div>
    );
}
