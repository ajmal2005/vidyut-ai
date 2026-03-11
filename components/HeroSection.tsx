"use client";

import { motion } from "framer-motion";
import { Zap, ChevronDown } from "lucide-react";
import Iridescence from "@/components/Iridescence";
import RotatingText from "@/components/RotatingText";

export default function HeroSection() {
    const scrollToDashboard = () => {
        document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-cream">
            <div className="absolute inset-0 z-0">
                <Iridescence color={[0.91, 0.4, 0.18]} speed={0.8} amplitude={0.1} />
            </div>

            {/* Decorative circles */}
            <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[15%] right-[10%] w-72 h-72 rounded-full bg-saffron/10 blur-3xl pointer-events-none z-0"
            />
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-[20%] left-[5%] w-96 h-96 rounded-full bg-india-green/8 blur-3xl pointer-events-none z-0"
            />

            <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-saffron/20 bg-saffron-bg text-saffron text-xs font-semibold mb-8 tracking-wider uppercase"
                >
                    <Zap className="w-3.5 h-3.5" />
                    Energy prediction for smart cities
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.1 }}
                    className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-[-0.02em] mb-5 font-[family-name:var(--font-poppins)] text-navy flex justify-center items-center flex-wrap gap-x-4"
                >
                    <span className="flex items-center">
                        <RotatingText
                            texts={["Vidyut", "विद्युत", "மின்சாரம்", "విద్యుత్", "ವಿದ್ಯುತ್", "വൈദ്യുതി", "বিদ্যুৎ"]}
                            mainClassName="text-navy flex-shrink-0"
                            staggerFrom="last"
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "-120%", opacity: 0 }}
                            staggerDuration={0.025}
                            splitLevelClassName="overflow-hidden py-2 sm:py-3 md:py-4"
                            transition={{ type: "spring", damping: 30, stiffness: 400 }}
                            rotationInterval={1500}
                        />
                    </span>
                    <span className="bg-gradient-to-r from-saffron to-saffron-light bg-clip-text text-transparent flex-shrink-0">
                        AI
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="text-lg sm:text-xl text-text-secondary font-medium mb-4"
                >
                    An AI-powered forecasting platform that predicts future energy demand <br></br> and 
                    visualizes energy insights.
                </motion.p>

                

                <motion.button
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.4 }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={scrollToDashboard}
                    className="group inline-flex items-center gap-2.5 px-7 py-3 bg-saffron text-white font-semibold text-sm rounded-full shadow-lg shadow-saffron/20 hover:shadow-saffron/30 transition-shadow duration-300 cursor-pointer"
                >
                    Get Started
                    <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                </motion.button>
            </div>

            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cream to-transparent pointer-events-none z-10" />
        </section>
    );
}
