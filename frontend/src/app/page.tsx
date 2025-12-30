"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DriverView from "@/components/DriverView";
import RiderView from "@/components/RiderView";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">RideShare</h1>
          <p className="text-muted-foreground">Pool your ride</p>
        </div>

        <Tabs defaultValue="driver" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-3xl mb-8">
            <TabsTrigger value="driver" className="rounded-3xl">
              Driver
            </TabsTrigger>
            <TabsTrigger value="rider" className="rounded-3xl">
              Rider
            </TabsTrigger>
          </TabsList>

          <TabsContent value="driver" className="mt-0">
            <DriverView />
          </TabsContent>

          <TabsContent value="rider" className="mt-0">
            <RiderView />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

