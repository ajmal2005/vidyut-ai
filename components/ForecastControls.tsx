"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, ChevronDown, Check } from "lucide-react";
import type { ForecastMode } from "@/lib/types";

interface ForecastControlsProps {
    currentMode: ForecastMode;
    onModeChange: (mode: ForecastMode) => void;
}

export default function ForecastControls({ currentMode, onModeChange }: ForecastControlsProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [customDateStr, setCustomDateStr] = useState<string>("");

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;
    const now = new Date();

    const getFutureDate = (hoursAhead: number) => {
        const d = new Date(now);
        d.setHours(d.getHours() + hoursAhead);
        return d;
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "long" });
    };

    const quickOptions = [
        { type: "quick" as const, hours: 24, date: getFutureDate(24), display: formatDate(getFutureDate(24)) },
        { type: "quick" as const, hours: 48, date: getFutureDate(48), display: formatDate(getFutureDate(48)) },
        { type: "quick" as const, hours: 72, date: getFutureDate(72), display: formatDate(getFutureDate(72)) },
    ] as const;

    // Advanced selection boundaries
    const minAdvancedDate = getFutureDate(24 * 3); // 3 days from today
    const maxAdvancedDate = getFutureDate(24 * 365); // 365 days from today

    const toInputString = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const handleAdvancedSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedDate = new Date(e.target.value);
        setCustomDateStr(e.target.value);
        if (!isNaN(selectedDate.getTime())) {
            onModeChange({
                type: "advanced",
                targetDate: selectedDate,
                label: `Forecast Until ${formatDate(selectedDate)}`
            });
            setShowAdvanced(false);
        }
    };

    return (
        <section className="px-5 md:px-10 lg:px-16 mb-8 mt-2">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-navy font-[family-name:var(--font-poppins)]">
                    Energy Forecast
                </h2>
                <p className="text-sm text-text-muted mt-1">Select a future timeframe to view predictive insights</p>
            </motion.div>

            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                {/* Quick Options */}
                <div className="flex flex-wrap gap-3">
                    {quickOptions.map((opt) => {
                        const isSelected = currentMode.type === "quick" && currentMode.hours === opt.hours;
                        return (
                            <button
                                key={opt.hours}
                                onClick={() => onModeChange({ type: "quick", hours: opt.hours, label: opt.display })}
                                className={`relative overflow-hidden group px-5 py-3 rounded-2xl border transition-all duration-300 ${isSelected
                                    ? "bg-saffron text-white border-saffron shadow-lg shadow-saffron/20"
                                    : "bg-white text-navy border-border hover:border-saffron hover:bg-saffron/5"
                                    }`}
                            >
                                <div className="flex flex-col items-start gap-0.5 relative z-10 text-left">
                                    <span className={`text-[10px] font-semibold tracking-wider uppercase ${isSelected ? "text-white/80" : "text-text-muted"}`}>
                                        Forecast Until
                                    </span>
                                    <span className={`font-semibold ${isSelected ? "text-white" : "text-navy"}`}>
                                        {opt.display}
                                    </span>
                                </div>
                                {isSelected && (
                                    <motion.div layoutId="quick-active-bg" className="absolute inset-0 bg-saffron -z-1" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Advanced Forecast */}
                <div className="relative">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl border transition-all duration-300 min-w-[200px] ${currentMode.type === "advanced" || showAdvanced
                            ? "bg-navy text-white border-navy shadow-lg"
                            : "bg-white text-navy border-border hover:border-navy hover:bg-navy/5"
                            }`}
                    >
                        <CalendarIcon className="w-4 h-4 shrink-0" />
                        <div className="flex flex-col items-start gap-0.5 text-left flex-1">
                            <span className={`text-[10px] font-semibold tracking-wider uppercase ${currentMode.type === "advanced" || showAdvanced ? "text-white/70" : "text-text-muted"}`}>
                                Advanced Forecast
                            </span>
                            <span className={`text-sm font-semibold truncate ${currentMode.type === "advanced" || showAdvanced ? "text-white" : "text-navy"}`}>
                                {currentMode.type === "advanced" ? formatDate(currentMode.targetDate!) : "Select Date"}
                            </span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />

                        {currentMode.type === "advanced" && (
                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-saffron rounded-full flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                        )}
                    </button>

                    <AnimatePresence>
                        {showAdvanced && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="absolute top-full lg:left-0 left-auto right-0 lg:right-auto mt-2 z-50 min-w-[320px] p-5 bg-white border border-border shadow-2xl rounded-2xl"
                            >
                                <div className="flex flex-col gap-4">
                                    <div>
                                        <h4 className="font-semibold text-navy">Custom Forecast Range</h4>
                                        <p className="text-xs text-text-muted mt-1">
                                            Predict energy demand between {formatDate(minAdvancedDate)} and {formatDate(maxAdvancedDate)}.
                                        </p>
                                    </div>

                                    <div className="relative">
                                        <label htmlFor="custom-date" className="block text-xs font-medium text-text-muted mb-1.5">
                                            Select Target Date
                                        </label>
                                        <input
                                            id="custom-date"
                                            type="date"
                                            min={toInputString(minAdvancedDate)}
                                            max={toInputString(maxAdvancedDate)}
                                            value={customDateStr || (currentMode.type === "advanced" && currentMode.targetDate ? toInputString(currentMode.targetDate) : "")}
                                            onChange={handleAdvancedSelect}
                                            className="w-full bg-cream-dark/50 border border-border text-navy text-sm rounded-xl focus:ring-2 focus:ring-saffron/20 focus:border-saffron block p-3 outline-none transition-all cursor-pointer font-[family-name:var(--font-poppins)]"
                                        />
                                    </div>

                                    {currentMode.type === "advanced" && (
                                        <button
                                            onClick={() => setShowAdvanced(false)}
                                            className="mt-2 w-full py-2.5 bg-saffron/10 text-saffron hover:bg-saffron hover:text-white transition-colors rounded-xl text-sm font-semibold"
                                        >
                                            Confirm Selection
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}
