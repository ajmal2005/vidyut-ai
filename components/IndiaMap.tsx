"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON, CircleMarker } from "react-leaflet";
import L from "leaflet";
import { motion } from "framer-motion";
import { Map as MapIcon, ArrowLeft, Loader2 } from "lucide-react";
import type { StateMarker } from "@/lib/types";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon paths broken by Webpack/Next.js bundling
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const GEOJSON_URL = "/india_states.geojson";

function createMarkerIcon(selected = false) {
    const color = "#E8652E";
    const size = selected ? 22 : 14;
    return L.divIcon({
        className: "custom-energy-marker",
        html: `<div style="
            width:${size}px;height:${size}px;border-radius:50%;
            background:${color};border:${selected ? "3" : "2"}px solid white;
            box-shadow:0 2px 12px ${color}80;
            position:relative;z-index:${selected ? 1001 : 1000};
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    useEffect(() => { map.flyTo(center, zoom, { duration: 1.2 }); }, [center, zoom, map]);
    return null;
}

interface IndiaMapProps {
    states: StateMarker[];
    onMarkerSelect: (marker: StateMarker) => void;
    selectedMarker: StateMarker | null;
    onBack: () => void;
}

/** Try to match GeoJSON feature name to one of our state markers by fuzzy comparison. */
function matchGeoState(geoName: string, markers: StateMarker[]): StateMarker | undefined {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "").replace("and", "");
    const geoNorm = normalize(geoName);
    return markers.find((m) => {
        const dataNorm = normalize(m.stateName);
        return dataNorm === geoNorm || geoNorm.includes(dataNorm) || dataNorm.includes(geoNorm);
    });
}

export default function IndiaMap({ states, onMarkerSelect, selectedMarker, onBack }: IndiaMapProps) {
    const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(GEOJSON_URL)
            .then((r) => r.json())
            .then((data) => { setGeoData(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const defaultCenter: [number, number] = [22.5, 82.0];
    const defaultZoom = 5;

    const center: [number, number] = selectedMarker
        ? [selectedMarker.lat, selectedMarker.lng]
        : defaultCenter;
    const zoom = selectedMarker ? 7 : defaultZoom;

    const getStateStyle = useCallback(() => ({
        fillColor: "transparent",
        fillOpacity: 0,
        color: "#000000",
        weight: 1.5,
        opacity: 0.8,
    }), []);

    const onEachFeature = useCallback((feature: GeoJSON.Feature, layer: L.Layer) => {
        const geoName =
            feature.properties?.ST_NM ||
            feature.properties?.Name ||
            feature.properties?.NAME ||
            feature.properties?.name || "";

        const matched = matchGeoState(geoName, states);

        (layer as L.Path).on({
            mouseover: (e: L.LeafletMouseEvent) => {
                e.target.setStyle({ fillOpacity: 0.1, fillColor: "#E8652E", weight: 2, opacity: 1 });
                e.target.bringToFront();
            },
            mouseout: (e: L.LeafletMouseEvent) => e.target.setStyle(getStateStyle()),
            click: () => {
                if (matched) setTimeout(() => onMarkerSelect(matched), 10);
            },
        });

        if (matched) {
            layer.bindTooltip(
                `<div style="font-family:Poppins,sans-serif;">
                    <div style="font-size:13px;font-weight:700;color:#1A1F36;margin-bottom:2px;">${matched.stateName}</div>
                    <div style="font-size:11px;color:#6B7084;">📍 ${matched.cityName}</div>
                    <div style="font-size:10px;color:#E8652E;margin-top:2px;">Click to view forecast</div>
                </div>`,
                { sticky: true, direction: "top", offset: [0, -10] }
            );
        }
    }, [states, onMarkerSelect, getStateStyle]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bento-card p-5 md:p-6 relative"
        >
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-saffron/10">
                        <MapIcon className="w-5 h-5 text-saffron" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-navy font-[family-name:var(--font-poppins)]">
                            Interactive Energy Map
                        </h3>
                        <p className="text-xs text-text-muted mt-0.5">
                            {selectedMarker
                                ? <>Viewing <span className="text-saffron font-medium">{selectedMarker.stateName}</span> — {selectedMarker.cityName}</>
                                : "Click any state or marker to load ML forecast"}
                        </p>
                    </div>
                </div>
                {selectedMarker && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onBack}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-cream-dark border border-border rounded-lg text-text-secondary text-xs font-medium hover:bg-border transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back
                    </motion.button>
                )}
            </div>

            <div className="w-full h-[450px] md:h-[550px] rounded-2xl overflow-hidden border border-border">
                {loading ? (
                    <div className="w-full h-full flex items-center justify-center bg-cream-dark/50">
                        <Loader2 className="w-8 h-8 text-saffron animate-spin" />
                    </div>
                ) : (
                    <MapContainer
                        center={defaultCenter}
                        zoom={defaultZoom}
                        className="w-full h-full"
                        scrollWheelZoom={true}
                        zoomControl={true}
                    >
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                        />
                        <MapController center={center} zoom={zoom} />

                        {/* GeoJSON state borders */}
                        {geoData && (
                            <GeoJSON data={geoData} style={getStateStyle} onEachFeature={onEachFeature} />
                        )}

                        {/* All state/city markers */}
                        {states.map((marker) => {
                            const isSelected =
                                selectedMarker?.stateName === marker.stateName;
                            return (
                                <Marker
                                    key={`${marker.stateName}-${marker.cityName}`}
                                    position={[marker.lat, marker.lng]}
                                    icon={createMarkerIcon(isSelected)}
                                    eventHandlers={{
                                        click: () => setTimeout(() => onMarkerSelect(marker), 10),
                                    }}
                                >
                                    <Popup>
                                        <div
                                            className="min-w-[180px] p-1"
                                            style={{ fontFamily: "Poppins, sans-serif" }}
                                        >
                                            <h4 className="font-bold text-sm text-navy mb-1">
                                                {marker.stateName}
                                            </h4>
                                            <p className="text-xs text-text-muted mb-2">
                                                📍 {marker.cityName}
                                            </p>
                                            <button
                                                onClick={() => onMarkerSelect(marker)}
                                                className="w-full py-1.5 bg-saffron text-white rounded-lg text-xs font-semibold"
                                            >
                                                View ML Forecast →
                                            </button>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}

                        {/* Highlight ring around selected marker */}
                        {selectedMarker && (
                            <CircleMarker
                                center={[selectedMarker.lat, selectedMarker.lng]}
                                radius={35}
                                pathOptions={{
                                    color: "#E8652E",
                                    fillColor: "#E8652E",
                                    fillOpacity: 0.06,
                                    weight: 1,
                                    opacity: 0.25,
                                }}
                            />
                        )}
                    </MapContainer>
                )}
            </div>
        </motion.div>
    );
}
