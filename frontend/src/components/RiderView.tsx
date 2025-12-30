"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Loader2 } from "lucide-react";
import Map from "./Map";

export default function RiderView() {
  const [destination, setDestination] = useState("");
  const [pickup, setPickup] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  const handleFindPool = async () => {
    if (!destination || !pickup) {
      return;
    }

    setIsSearching(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setIsSearching(false);
    setHasResults(true);
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

      {/* Results */}
      {hasResults && !isSearching && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Match Found!</h3>
                <p className="text-sm text-muted-foreground">
                  Driver is 2 minutes away
                </p>
              </div>

              <div className="h-64 w-full rounded-3xl overflow-hidden">
                <Map
                  polyline=""
                  pickup={pickup ? { lat: 37.7749, lng: -122.4194 } : undefined}
                  dropoff={
                    destination
                      ? { lat: 37.7849, lng: -122.4094 }
                      : undefined
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Pickup:</span>
                  <span>{pickup || "123 Main St"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Dropoff:</span>
                  <span>{destination || "456 Oak Ave"}</span>
                </div>
              </div>

              <Button className="w-full" size="lg">
                Confirm Ride
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

