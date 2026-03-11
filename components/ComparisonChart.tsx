"use client";

import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BarChart3 } from "lucide-react";

interface ComparisonProps {
    data: { name: string; demand: number }[];
    title: string;
}

const barColors = ["#E8652E", "#FF8C5A", "#1B8B3D", "#34C05E", "#1A1F36", "#6B7084", "#E8652E", "#FF8C5A", "#1B8B3D", "#34C05E"];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
    if (!active || !payload) return null;
    return (
        <div className="bg-white rounded-xl p-3 text-xs border border-border shadow-lg">
            <p className="text-navy font-semibold mb-1">{label}</p>
            <p className="text-saffron font-bold">{payload[0].value.toLocaleString()} MW</p>
        </div>
    );
}

export default function ComparisonChart({ data, title }: ComparisonProps) {
    return (
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="bento-card p-5 md:p-6">
            <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-xl bg-navy/5">
                    <BarChart3 className="w-5 h-5 text-navy" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-navy font-[family-name:var(--font-poppins)]">{title}</h3>
                    <p className="text-xs text-text-muted">Comparative demand analysis</p>
                </div>
            </div>
            <div className="w-full h-[280px] md:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DB" />
                        <XAxis dataKey="name" tick={{ fill: "#6B7084", fontSize: 10 }} axisLine={false} tickLine={false} angle={-15} textAnchor="end" height={50} />
                        <YAxis tick={{ fill: "#9CA0B0", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="demand" radius={[6, 6, 0, 0]} maxBarSize={42}>
                            {data.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
