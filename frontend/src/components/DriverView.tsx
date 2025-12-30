"use client";

import { useState } from "react";
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

export default function DriverView() {
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const [detourTime, setDetourTime] = useState(4);

  const handleGoOnline = async () => {
    if (!startLocation || !endLocation) {
      return;
    }

    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsOnline(true);
    setIsLoading(false);

    // Simulate match after 3 seconds
    setTimeout(() => {
      setShowMatch(true);
    }, 3000);
  };

  const handleGoOffline = () => {
    setIsOnline(false);
    setShowMatch(false);
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

      {/* Map Preview */}
      {isOnline && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Route</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full rounded-3xl overflow-hidden">
              <Map
                polyline=""
                pickup={
                  startLocation
                    ? { lat: 37.7749, lng: -122.4194 }
                    : undefined
                }
                dropoff={
                  endLocation ? { lat: 37.7849, lng: -122.4094 } : undefined
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Request Sheet */}
      <Sheet open={showMatch} onOpenChange={setShowMatch}>
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
                    <p className="font-semibold">Sarah M.</p>
                    <p className="text-sm text-muted-foreground">
                      Pickup: 2 blocks away
                    </p>
                  </div>
                  <Badge variant="success" className="bg-green-500">
                    Detour: +{detourTime} mins
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>123 Main St</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>456 Oak Ave</span>
                  </div>
                </div>

                <div className="h-48 w-full rounded-3xl overflow-hidden mb-4">
                  <Map
                    polyline=""
                    pickup={{ lat: 37.7799, lng: -122.4144 }}
                    dropoff={{ lat: 37.7899, lng: -122.4044 }}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowMatch(false)}
                  >
                    Decline
                  </Button>
                  <Button className="flex-1" onClick={() => setShowMatch(false)}>
                    Accept
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

