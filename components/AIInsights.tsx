"use client";

import { motion } from "framer-motion";
import { Brain, Lightbulb, TrendingUp, AlertCircle } from "lucide-react";

interface AIInsightsProps {
    insights: string[];
    locationName: string;
}

const icons = [
    <Brain key="b" className="w-4 h-4 text-electric-light" />,
    <Lightbulb key="l" className="w-4 h-4 text-neon-green" />,
    <TrendingUp key="t" className="w-4 h-4 text-neon-orange" />,
    <AlertCircle key="a" className="w-4 h-4 text-violet-400" />,
];

export default function AIInsights({ insights, locationName }: AIInsightsProps) {
    return (
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="glass-card p-5 md:p-6">
            <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-lg bg-electric/10 border border-electric/15 pulse-glow">
                    <Brain className="w-5 h-5 text-electric-light" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-white font-[family-name:var(--font-outfit)]">AI-Powered Insights</h3>
                    <p className="text-xs text-slate-500">Forecast for {locationName}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.map((insight, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -16 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.08, duration: 0.4 }}
                        whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
                        className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-electric/15 transition-colors"
                    >
                        <div className="p-1.5 rounded-md bg-white/[0.04] shrink-0 mt-0.5">{icons[i % icons.length]}</div>
                        <p className="text-xs text-slate-400 leading-relaxed">{insight}</p>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
