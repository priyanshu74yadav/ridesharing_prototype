// Supabase Edge Function: Calculate Detour
// This function calculates the detour percentage when a driver picks up a rider
// It uses the Google Routes API to calculate distances

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_ROUTES_API_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");

interface DriverRoute {
  start: {
    latitude: number;
    longitude: number;
  };
  end: {
    latitude: number;
    longitude: number;
  };
}

interface RiderRequest {
  pickup: {
    latitude: number;
    longitude: number;
  };
  dropoff: {
    latitude: number;
    longitude: number;
  };
}

interface RequestBody {
  driverRoute: DriverRoute;
  riderRequest: RiderRequest;
}

interface GoogleRoutesResponse {
  routes: Array<{
    distanceMeters: number;
    duration: string;
    polyline: {
      encodedPolyline: string;
    };
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Validate API key
    if (!GOOGLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Google Maps API key not configured" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { driverRoute, riderRequest } = body;

    // Validate input
    if (!driverRoute || !riderRequest) {
      return new Response(
        JSON.stringify({ error: "Missing driverRoute or riderRequest in request body" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Validate coordinates
    if (
      !driverRoute.start?.latitude || !driverRoute.start?.longitude ||
      !driverRoute.end?.latitude || !driverRoute.end?.longitude ||
      !riderRequest.pickup?.latitude || !riderRequest.pickup?.longitude ||
      !riderRequest.dropoff?.latitude || !riderRequest.dropoff?.longitude
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid coordinates in request" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Calculate Original Distance: Driver Start -> Driver End
    const originalRouteResponse = await fetch(GOOGLE_ROUTES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: driverRoute.start.latitude,
              longitude: driverRoute.start.longitude,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: driverRoute.end.latitude,
              longitude: driverRoute.end.longitude,
            },
          },
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });

    if (!originalRouteResponse.ok) {
      const errorText = await originalRouteResponse.text();
      return new Response(
        JSON.stringify({
          error: "Failed to calculate original route",
          details: errorText,
        }),
        {
          status: originalRouteResponse.status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const originalRouteData: GoogleRoutesResponse = await originalRouteResponse.json();
    const originalDistance = originalRouteData.routes[0]?.distanceMeters;

    if (!originalDistance) {
      return new Response(
        JSON.stringify({ error: "No route found for original distance" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Calculate New Distance: Driver Start -> Rider Pickup -> Rider Dropoff -> Driver End
    const newRouteResponse = await fetch(GOOGLE_ROUTES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: driverRoute.start.latitude,
              longitude: driverRoute.start.longitude,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: driverRoute.end.latitude,
              longitude: driverRoute.end.longitude,
            },
          },
        },
        intermediates: [
          {
            location: {
              latLng: {
                latitude: riderRequest.pickup.latitude,
                longitude: riderRequest.pickup.longitude,
              },
            },
          },
          {
            location: {
              latLng: {
                latitude: riderRequest.dropoff.latitude,
                longitude: riderRequest.dropoff.longitude,
              },
            },
          },
        ],
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });

    if (!newRouteResponse.ok) {
      const errorText = await newRouteResponse.text();
      return new Response(
        JSON.stringify({
          error: "Failed to calculate new route",
          details: errorText,
        }),
        {
          status: newRouteResponse.status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const newRouteData: GoogleRoutesResponse = await newRouteResponse.json();
    const newDistance = newRouteData.routes[0]?.distanceMeters;

    if (!newDistance) {
      return new Response(
        JSON.stringify({ error: "No route found for new distance" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Calculate detour percentage: ((New - Original) / Original) * 100
    const detourPercentage = ((newDistance - originalDistance) / originalDistance) * 100;

    // Return the result
    return new Response(
      JSON.stringify({
        original_distance: originalDistance,
        new_distance: newDistance,
        detour_distance: newDistance - originalDistance,
        detour_percentage: parseFloat(detourPercentage.toFixed(2)),
        original_route_polyline: originalRouteData.routes[0]?.polyline?.encodedPolyline,
        new_route_polyline: newRouteData.routes[0]?.polyline?.encodedPolyline,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error calculating detour:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

