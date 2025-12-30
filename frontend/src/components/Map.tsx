"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { decodePolyline } from "@/lib/polyline";

interface MapProps {
  polyline?: string;
  pickup?: { lat: number; lng: number };
  dropoff?: { lat: number; lng: number };
  className?: string;
}

export default function Map({ polyline, pickup, dropoff, className }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: pickup ? [pickup.lng, pickup.lat] : [-122.4194, 37.7749],
      zoom: 13,
      accessToken: mapboxToken,
    });

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing sources and layers
    if (map.current.getSource("route")) {
      map.current.removeLayer("route");
      map.current.removeSource("route");
    }
    if (map.current.getSource("pickup")) {
      map.current.removeLayer("pickup");
      map.current.removeSource("pickup");
    }
    if (map.current.getSource("dropoff")) {
      map.current.removeLayer("dropoff");
      map.current.removeSource("dropoff");
    }

    // Add route polyline if provided
    if (polyline) {
      try {
        // Decode polyline to coordinates
        const coordinates = decodePolyline(polyline).map(([lat, lng]) => [lng, lat]);

        map.current.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: coordinates,
            },
          },
        });

        map.current.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#3b82f6",
            "line-width": 4,
          },
        });

        // Fit bounds to route
        if (coordinates.length > 0) {
          const bounds = coordinates.reduce(
            (bounds, coord) => {
              return bounds.extend(coord as [number, number]);
            },
            new mapboxgl.LngLatBounds(
              coordinates[0] as [number, number],
              coordinates[0] as [number, number]
            )
          );
          map.current.fitBounds(bounds, { padding: 50 });
        }
      } catch (error) {
        console.error("Error decoding polyline:", error);
      }
    }

    // Add pickup marker
    if (pickup) {
      map.current.addSource("pickup", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [pickup.lng, pickup.lat],
          },
        },
      });

      map.current.addLayer({
        id: "pickup",
        type: "circle",
        source: "pickup",
        paint: {
          "circle-radius": 8,
          "circle-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#000000",
        },
      });
    }

    // Add dropoff marker
    if (dropoff) {
      map.current.addSource("dropoff", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [dropoff.lng, dropoff.lat],
          },
        },
      });

      map.current.addLayer({
        id: "dropoff",
        type: "circle",
        source: "dropoff",
        paint: {
          "circle-radius": 8,
          "circle-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#000000",
        },
      });
    }
  }, [polyline, pickup, dropoff, mapLoaded]);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!mapboxToken) {
    return (
      <div
        className={`w-full h-full rounded-3xl overflow-hidden bg-muted flex items-center justify-center ${className || ""}`}
      >
        <p className="text-sm text-muted-foreground text-center px-4">
          Map requires Mapbox token. Add NEXT_PUBLIC_MAPBOX_TOKEN to your .env file.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      className={`w-full h-full rounded-3xl overflow-hidden ${className || ""}`}
    />
  );
}

