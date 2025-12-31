"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MapPin, Loader2 } from "lucide-react";
import Map from "./Map";
import { useRideMatching } from "@/hooks/useRideMatching";

export default function DriverView() {
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [userId] = useState(() => {
    // Generate or retrieve user ID (in production, use auth)
    if (typeof window !== "undefined") {
      let id = localStorage.getItem("driver_user_id");
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("driver_user_id", id);
      }
      return id;
    }
    return "driver-" + Math.random().toString(36).substr(2, 9);
  });
  const [userName] = useState("Driver User");

  const {
    currentTrip,
    matches,
    detourResult,
    isLoading,
    error,
    createTrip,
    cancelTrip,
  } = useRideMatching({
    userId,
    userRole: "driver",
    userName,
  });

  const isOnline = !!currentTrip;
  const showMatch = detourResult !== null && matches.length > 0;

  const handleGoOnline = async () => {
    if (!startLocation || !endLocation) {
      return;
    }

    try {
      await createTrip(startLocation, endLocation);
    } catch (err) {
      console.error("Failed to go online:", err);
    }
  };

  const handleGoOffline = async () => {
    try {
      await cancelTrip();
      setStartLocation("");
      setEndLocation("");
    } catch (err) {
      console.error("Failed to go offline:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Where to?
          </label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Start location"
              value={startLocation}
              onChange={(e) => setStartLocation(e.target.value)}
              className="pl-12"
              disabled={isOnline}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="End location"
              value={endLocation}
              onChange={(e) => setEndLocation(e.target.value)}
              className="pl-12"
              disabled={isOnline}
            />
          </div>
        </div>
      </div>

      {/* Go Online Button */}
      <Button
        onClick={isOnline ? handleGoOffline : handleGoOnline}
        disabled={isLoading || (!startLocation || !endLocation)}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Going Online...
          </>
        ) : isOnline ? (
          "Go Offline"
        ) : (
          "Go Online"
        )}
      </Button>

      {/* Error Message */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Map Preview */}
      {isOnline && currentTrip && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Route</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full rounded-3xl overflow-hidden">
              <Map
                polyline={currentTrip.route_polyline || ""}
                pickup={currentTrip.start_location}
                dropoff={currentTrip.end_location}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Request Sheet */}
      {showMatch && matches[0] && detourResult && (
        <Sheet open={showMatch} onOpenChange={() => {}}>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader>
              <SheetTitle>Live Request</SheetTitle>
              <SheetDescription>
                A rider wants to join your route
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-semibold">{matches[0].driver_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Distance: {Math.round(matches[0].distance_to_route)}m from route
                      </p>
                    </div>
                    <Badge variant="success" className="bg-green-500">
                      Detour: {detourResult.detour_percentage.toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Pickup: {matches[0].pickup_fraction.toFixed(2)} along route
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Dropoff: {matches[0].dropoff_fraction.toFixed(2)} along route
                      </span>
                    </div>
                  </div>

                  {detourResult.new_route_polyline && (
                    <div className="h-48 w-full rounded-3xl overflow-hidden mb-4">
                      <Map
                        polyline={detourResult.new_route_polyline}
                        pickup={currentTrip?.start_location}
                        dropoff={currentTrip?.end_location}
                      />
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleGoOffline}
                    >
                      Decline
                    </Button>
                    <Button className="flex-1" onClick={handleGoOffline}>
                      Accept
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

