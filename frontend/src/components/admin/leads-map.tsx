"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Lead } from "@/lib/types";

// Category color mapping for markers
const CATEGORY_COLORS: Record<string, string> = {
  "Home & Trade Services": "#2563eb",
  "Real Estate Investment": "#059669",
  "Professional Services": "#7c3aed",
  "Financial Vehicle": "#d97706",
  "Retail & E-commerce": "#dc2626",
  "Health & Wellness": "#db2777",
  "Food & Beverage": "#ea580c",
  "Creative & Marketing": "#0891b2",
  "Non-Profit": "#65a30d",
  Unclear: "#64748b",
};

const DEFAULT_COLOR = "#64748b";

export interface MapLead {
  id: string;
  business_name: string;
  business_category?: string;
  target_fit?: string;
  address: string;
  lat: number;
  lng: number;
  /** "address" is the door; "zip" is the centre of the postcode. */
  geo_precision?: string | null;
}

interface LeadsMapProps {
  leads: MapLead[];
  onSelect?: (leadId: string) => void;
}

export function LeadsMap({ leads, onSelect }: LeadsMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [28.5, -81.5], // Florida center
      zoom: 7,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, []);

  // Update markers when leads change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (leads.length === 0) return;

    const bounds = L.latLngBounds([]);

    leads.forEach((lead) => {
      const color = CATEGORY_COLORS[lead.business_category ?? ""] ?? DEFAULT_COLOR;
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([lead.lat, lead.lng], { icon });
      marker.bindPopup(
        `<div style="font-family:system-ui,sans-serif;font-size:13px;min-width:160px;">
          <strong>${lead.business_name}</strong>
          <div style="color:#64748b;margin-top:2px;">${lead.address}</div>
          <div style="margin-top:4px;">
            <span style="display:inline-block;background:#f1f5f9;border-radius:9999px;padding:1px 8px;font-size:11px;color:#334155;">${lead.business_category ?? "Uncategorized"}</span>
          </div>
          ${lead.target_fit ? `<div style="margin-top:4px;font-size:11px;color:#64748b;">Target fit: ${lead.target_fit}</div>` : ""}
        </div>`
      );
      marker.on("click", () => onSelect?.(lead.id));
      marker.addTo(map);
      markersRef.current.push(marker);
      bounds.extend([lead.lat, lead.lng]);
    });

    // Fit bounds if we have markers, otherwise reset to Florida
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    } else {
      map.setView([28.5, -81.5], 7);
    }
  }, [leads, onSelect]);

  return <div ref={containerRef} className="w-full h-[70vh] min-h-[500px]" />;
}