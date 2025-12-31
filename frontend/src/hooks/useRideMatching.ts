"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

// Types
export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface Trip {
  id: string;
  driver_id: string;
  start_location: Location;
  end_location: Location;
  route_polyline?: string;
  status: "pending" | "active" | "completed" | "cancelled";
}

export interface Request {
  id: string;
  rider_id: string;
  pickup: Location;
  dropoff: Location;
  status: "pending" | "matched" | "accepted" | "completed" | "cancelled";
}

export interface MatchResult {
  trip_id: string;
  driver_id: string;
  driver_name: string;
  start_location: Location;
  end_location: Location;
  route_polyline: string;
  trip_status: string;
  distance_to_route: number;
  pickup_fraction: number;
  dropoff_fraction: number;
}

export interface DetourResult {
  original_distance: number;
  new_distance: number;
  detour_distance: number;
  detour_percentage: number;
  original_route_polyline?: string;
  new_route_polyline?: string;
}

interface UseRideMatchingOptions {
  userId: string;
  userRole: "driver" | "rider";
  userName: string;
}

export function useRideMatching({
  userId,
  userRole,
  userName,
}: UseRideMatchingOptions) {
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [currentRequest, setCurrentRequest] = useState<Request | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [detourResult, setDetourResult] = useState<DetourResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentTripRef = useRef<Trip | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    currentTripRef.current = currentTrip;
  }, [currentTrip]);

  // Helper function to convert address to coordinates (mock for now)
  // In production, use Google Geocoding API
  const addressToCoordinates = useCallback(
    async (address: string): Promise<Location> => {
      // Mock coordinates - in production, use geocoding API
      const mockCoords: { [key: string]: Location } = {
        default: { lat: 37.7749, lng: -122.4194 },
      };
      return mockCoords[address.toLowerCase()] || mockCoords.default;
    },
    []
  );

  // Helper function to create geography point from location
  const locationToGeography = useCallback((location: Location): string => {
    return `POINT(${location.lng} ${location.lat})`;
  }, []);

  // Create or get user profile
  const ensureProfile = useCallback(async () => {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (existingProfile) {
      return existingProfile;
    }

    const { data: newProfile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        role: userRole,
        full_name: userName,
      })
      .select()
      .single();

    if (profileError) {
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    return newProfile;
  }, [userId, userRole, userName]);

  // Driver: Create a trip
  const createTrip = useCallback(
    async (startAddress: string, endAddress: string, routePolyline?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        await ensureProfile();

        const startLocation = await addressToCoordinates(startAddress);
        const endLocation = await addressToCoordinates(endAddress);

        const { data: trip, error: tripError } = await supabase
          .from("trips")
          .insert({
            driver_id: userId,
            start_location: locationToGeography(startLocation),
            end_location: locationToGeography(endLocation),
            route_polyline: routePolyline || null,
            status: "active",
          })
          .select()
          .single();

        if (tripError) {
          throw new Error(`Failed to create trip: ${tripError.message}`);
        }

        setCurrentTrip({
          id: trip.id,
          driver_id: trip.driver_id,
          start_location: startLocation,
          end_location: endLocation,
          route_polyline: routePolyline,
          status: trip.status as Trip["status"],
        });

        // Subscribe to requests table
        subscribeToRequests(trip.id);

        return trip;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create trip";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [userId, addressToCoordinates, locationToGeography, ensureProfile]
  );

  // Helper to parse geography point
  const parseGeographyPoint = useCallback((geography: string): Location => {
    // Geography format: "POINT(lng lat)"
    const match = geography.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (match) {
      return {
        lng: parseFloat(match[1]),
        lat: parseFloat(match[2]),
      };
    }
    return { lat: 0, lng: 0 };
  }, []);

  // Calculate detour using Edge Function
  const calculateDetour = useCallback(
    async (
      trip: Trip,
      request: Request,
      match: MatchResult
    ): Promise<DetourResult | null> => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

        const response = await fetch(
          `${supabaseUrl}/functions/v1/calculate-detour`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              driverRoute: {
                start: {
                  latitude: trip.start_location.lat,
                  longitude: trip.start_location.lng,
                },
                end: {
                  latitude: trip.end_location.lat,
                  longitude: trip.end_location.lng,
                },
              },
              riderRequest: {
                pickup: {
                  latitude: request.pickup.lat,
                  longitude: request.pickup.lng,
                },
                dropoff: {
                  latitude: request.dropoff.lat,
                  longitude: request.dropoff.lng,
                },
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Edge function error: ${response.statusText}`);
        }

        const data: DetourResult = await response.json();
        return data;
      } catch (err) {
        console.error("Error calculating detour:", err);
        return null;
      }
    },
    []
  );

  // Rider: Create a request and find matches
  const createRequest = useCallback(
    async (pickupAddress: string, dropoffAddress: string) => {
      setIsLoading(true);
      setError(null);
      setMatches([]);

      try {
        await ensureProfile();

        const pickup = await addressToCoordinates(pickupAddress);
        const dropoff = await addressToCoordinates(dropoffAddress);

        const { data: request, error: requestError } = await supabase
          .from("requests")
          .insert({
            rider_id: userId,
            pickup: locationToGeography(pickup),
            dropoff: locationToGeography(dropoff),
            status: "pending",
          })
          .select()
          .single();

        if (requestError) {
          throw new Error(`Failed to create request: ${requestError.message}`);
        }

        setCurrentRequest({
          id: request.id,
          rider_id: request.rider_id,
          pickup,
          dropoff,
          status: request.status as Request["status"],
        });

        // Call match_route RPC function
        const { data: matchData, error: matchError } = await supabase.rpc(
          "match_route",
          {
            request_id: request.id,
          }
        );

        if (matchError) {
          throw new Error(`Failed to match route: ${matchError.message}`);
        }

        if (matchData && matchData.length > 0) {
          // Parse match results
          const parsedMatches: MatchResult[] = matchData.map((m: any) => ({
            trip_id: m.trip_id,
            driver_id: m.driver_id,
            driver_name: m.driver_name,
            start_location: parseGeographyPoint(m.start_location),
            end_location: parseGeographyPoint(m.end_location),
            route_polyline: m.route_polyline || "",
            trip_status: m.trip_status,
            distance_to_route: m.distance_to_route,
            pickup_fraction: m.pickup_fraction,
            dropoff_fraction: m.dropoff_fraction,
          }));

          setMatches(parsedMatches);
        }

        return request;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create request";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [
      userId,
      addressToCoordinates,
      locationToGeography,
      ensureProfile,
      parseGeographyPoint,
    ]
  );

  // Cancel trip/request
  const cancelTrip = useCallback(async () => {
    if (!currentTrip) return;

    try {
      const { error } = await supabase
        .from("trips")
        .update({ status: "cancelled" })
        .eq("id", currentTrip.id);

      if (error) {
        throw new Error(`Failed to cancel trip: ${error.message}`);
      }

      // Clean up subscription
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      setCurrentTrip(null);
      setMatches([]);
      setDetourResult(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to cancel trip";
      setError(errorMessage);
    }
  }, [currentTrip]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return {
    // State
    currentTrip,
    currentRequest,
    matches,
    detourResult,
    isLoading,
    error,

    // Actions
    createTrip,
    createRequest,
    cancelTrip,

    // Helpers
    addressToCoordinates,
  };
}

