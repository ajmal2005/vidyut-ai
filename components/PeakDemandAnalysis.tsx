"use client";

import { motion } from "framer-motion";
import { Gauge, Clock, Zap } from "lucide-react";

interface PeakDemandProps {
    peakHour: string;
    predictedDemand: number;
    currentCapacity: number;
}

export default function PeakDemandAnalysis({ peakHour, predictedDemand, currentCapacity }: PeakDemandProps) {
    const utilizationPct = Math.round((predictedDemand / currentCapacity) * 100);
    const gaugeAngle = Math.min((predictedDemand / 8000) * 180, 180);

    return (
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="bento-card p-5 md:p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-saffron/10">
                    <Gauge className="w-5 h-5 text-saffron" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-navy font-[family-name:var(--font-poppins)]">Peak Demand Analysis</h3>
                    <p className="text-xs text-text-muted">Critical load indicators</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center">
                    <div className="relative w-40 h-24 mb-3">
                        <svg viewBox="0 0 200 110" className="w-full h-full">
                            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#E8E3DB" strokeWidth="10" strokeLinecap="round" />
                            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#E8652E" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${gaugeAngle * 1.4}, 1000`} />
                            <text x="100" y="82" textAnchor="middle" fill="#1A1F36" fontSize="26" fontWeight="700">{predictedDemand.toLocaleString()}</text>
                            <text x="100" y="102" textAnchor="middle" fill="#9CA0B0" fontSize="11">MW</text>
                        </svg>
                    </div>
                    <p className="text-xs text-text-muted">Peak Load</p>
                </div>

                <div className="flex flex-col items-center justify-center">
                    <div className="p-3 rounded-xl bg-cream-dark border border-border mb-2">
                        <Clock className="w-7 h-7 text-navy" />
                    </div>
                    <p className="text-3xl font-bold text-navy font-[family-name:var(--font-poppins)]">{peakHour}</p>
                    <p className="text-xs text-text-muted mt-1">Peak Time</p>
                </div>

                <div className="flex flex-col items-center justify-center">
                    <div className="p-3 rounded-xl bg-india-green-bg border border-india-green/10 mb-2">
                        <Zap className="w-7 h-7 text-india-green" />
                    </div>
                    <p className={`text-3xl font-bold font-[family-name:var(--font-poppins)] ${utilizationPct > 85 ? 'text-saffron' : 'text-india-green'}`}>{utilizationPct}%</p>
                    <p className="text-xs text-text-muted mt-1">Utilization</p>
                </div>
            </div>
        </motion.div>
    );
}
