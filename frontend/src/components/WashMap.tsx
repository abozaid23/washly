"use client";

import { useEffect, useRef } from "react";
import { APIProvider, Map, Marker, useMap } from "@vis.gl/react-google-maps";
import type { Wash } from "@/lib/api";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

const CAIRO_CENTER = { lat: 30.0444, lng: 31.2357 };

/** Dark "midnight detailing bay" map skin — approximate hex of the OKLCH tokens in globals.css. */
const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0e0f0a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0e0f0a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9a9d8c" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#34392a" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#181a12" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6f7263" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#171b10" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1c1f15" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#272b1c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#7a7d6c" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#24281a" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#34392a" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#181a12" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a1416" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4a7d8c" }] },
];

function markerIcon(active: boolean): google.maps.Symbol | undefined {
  if (typeof google === "undefined" || !google.maps) return undefined;
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: active ? 11 : 6,
    fillColor: active ? "#d6e36a" : "#cfd2c2",
    fillOpacity: 1,
    strokeColor: "#0e0f0a",
    strokeWeight: active ? 3 : 1.5,
  };
}

function FitToMarkers({ washes }: { washes: Wash[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (!map || washes.length === 0 || fitted.current) return;
    if (washes.length === 1) {
      map.setCenter({ lat: washes[0].latitude, lng: washes[0].longitude });
      map.setZoom(14);
    } else {
      const bounds = new google.maps.LatLngBounds();
      washes.forEach((w) => bounds.extend({ lat: w.latitude, lng: w.longitude }));
      map.fitBounds(bounds, 64);
    }
    fitted.current = true;
  }, [map, washes]);

  return null;
}

export function WashMap({
  washes,
  activeId,
  onSelect,
}: {
  washes: Wash[];
  activeId: number | null;
  onSelect: (id: number) => void;
}) {
  if (!API_KEY) {
    return (
      <div className="mt-5 grid h-44 place-items-center rounded-2xl bg-surface text-sm text-muted ring-1 ring-border">
        محتاج NEXT_PUBLIC_GOOGLE_MAPS_API_KEY في .env.local
      </div>
    );
  }

  return (
    <div className="mt-5 h-44 overflow-hidden rounded-2xl ring-1 ring-border">
      <APIProvider apiKey={API_KEY}>
        <Map
          defaultCenter={CAIRO_CENTER}
          defaultZoom={12}
          gestureHandling="greedy"
          disableDefaultUI
          styles={DARK_STYLE}
          style={{ width: "100%", height: "100%" }}
        >
          <FitToMarkers washes={washes} />
          {washes.map((w) => (
            <Marker
              key={w.id}
              position={{ lat: w.latitude, lng: w.longitude }}
              icon={markerIcon(w.id === activeId)}
              onClick={() => onSelect(w.id)}
              zIndex={w.id === activeId ? 10 : 1}
            />
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
