"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Loader2 } from "lucide-react";
import Map from "./Map";
import { useRideMatching } from "@/hooks/useRideMatching";

export default function RiderView() {
  const [destination, setDestination] = useState("");
  const [pickup, setPickup] = useState("");
  const [userId] = useState(() => {
    // Generate or retrieve user ID (in production, use auth)
    if (typeof window !== "undefined") {
      let id = localStorage.getItem("rider_user_id");
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("rider_user_id", id);
      }
      return id;
    }
    return "rider-" + Math.random().toString(36).substr(2, 9);
  });
  const [userName] = useState("Rider User");

  const {
    currentRequest,
    matches,
    isLoading,
    error,
    createRequest,
  } = useRideMatching({
    userId,
    userRole: "rider",
    userName,
  });

  const isSearching = isLoading;
  const hasResults = matches.length > 0;

  const handleFindPool = async () => {
    if (!destination || !pickup) {
      return;
    }

    try {
      await createRequest(pickup, destination);
    } catch (err) {
      console.error("Failed to find pool:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Pickup Location
          </label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Where are you?"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              className="pl-12"
              disabled={isSearching}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Destination
          </label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Where to?"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="pl-12"
              disabled={isSearching}
            />
          </div>
        </div>
      </div>

      {/* Find Pool Button */}
      <Button
        onClick={handleFindPool}
        disabled={isSearching || !destination || !pickup}
        className="w-full"
        size="lg"
      >
        {isSearching ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Finding Pool...
          </>
        ) : (
          "Find Pool"
        )}
      </Button>

      {/* Skeleton Loader State */}
      {isSearching && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-48 w-full rounded-3xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {hasResults && !isSearching && matches[0] && currentRequest && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Match Found!</h3>
                <p className="text-sm text-muted-foreground">
                  Driver: {matches[0].driver_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Distance: {Math.round(matches[0].distance_to_route)}m from route
                </p>
              </div>

              <div className="h-64 w-full rounded-3xl overflow-hidden">
                <Map
                  polyline={matches[0].route_polyline || ""}
                  pickup={currentRequest.pickup}
                  dropoff={currentRequest.dropoff}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Pickup:</span>
                  <span>{pickup}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Dropoff:</span>
                  <span>{destination}</span>
                </div>
              </div>

              <Button className="w-full" size="lg">
                Confirm Ride
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {!hasResults && !isSearching && currentRequest && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              No matches found. Try again later.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

