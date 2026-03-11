"use client";

import { Zap } from "lucide-react";

export default function Footer() {
    return (
        <footer className="border-t border-border bg-white/50 backdrop-blur-xl mt-16">
            <div className="max-w-[1280px] mx-auto px-6 py-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-lg bg-saffron/10">
                                <Zap className="w-4 h-4 text-saffron" />
                            </div>
                            <span className="text-base font-bold text-navy font-[family-name:var(--font-poppins)]">Vidyut AI</span>
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed">
                            AI-Powered Energy Demand Forecasting<br />for Smart Cities across India.
                        </p>
                    </div>
                    <div>
                        
                    </div>
                    <div>
                        
                            
                            
                        
                    </div>
                </div>
                
            </div>
        </footer>
    );
}
