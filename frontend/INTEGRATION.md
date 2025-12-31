# Supabase Backend Integration

This document explains how the frontend connects to the Supabase backend for ride matching.

## Architecture Overview

The integration uses a custom React hook `useRideMatching` that handles all backend communication for both drivers and riders.

## Components

### 1. Supabase Client (`src/lib/supabase.ts`)

Initializes the Supabase client using environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. useRideMatching Hook (`src/hooks/useRideMatching.ts`)

A comprehensive hook that manages:
- Driver trip creation and subscription
- Rider request creation and matching
- Real-time request notifications
- Detour calculation

## Driver Flow

1. **Create Trip**: When driver clicks "Go Online"
   - Converts addresses to coordinates (currently mocked)
   - Creates a trip record in the `trips` table
   - Sets trip status to "active"

2. **Subscribe to Requests**: After trip creation
   - Sets up a real-time subscription to the `requests` table
   - Listens for new `INSERT` events where `status = 'pending'`

3. **Match Detection**: When a new request is inserted
   - Calls the `match_route` RPC function with the request ID
   - Checks if the match is for the current driver's trip
   - If matched, calculates detour using the Edge Function

4. **Detour Calculation**: 
   - Calls the `calculate-detour` Edge Function
   - Passes driver route and rider request
   - Only displays match if detour < 15%

5. **Display Match**: 
   - Shows a bottom sheet with match details
   - Displays detour percentage in a green badge
   - Shows route on map with polyline

## Rider Flow

1. **Create Request**: When rider clicks "Find Pool"
   - Converts addresses to coordinates (currently mocked)
   - Creates a request record in the `requests` table
   - Sets request status to "pending"

2. **Find Matches**: After request creation
   - Calls the `match_route` RPC function with the request ID
   - Receives array of matching trips
   - Displays matches with driver information

3. **Display Results**:
   - Shows matched driver name
   - Displays route on map
   - Shows pickup and dropoff locations

## Key Functions

### Driver Functions

- `createTrip(startAddress, endAddress, routePolyline?)`: Creates a trip and subscribes to requests
- `subscribeToRequests(tripId)`: Sets up real-time subscription
- `handleNewRequest(request, tripId)`: Processes new requests and checks for matches
- `calculateDetour(trip, request, match)`: Calls Edge Function to calculate detour
- `cancelTrip()`: Cancels current trip and cleans up subscription

### Rider Functions

- `createRequest(pickupAddress, dropoffAddress)`: Creates a request and finds matches
- `addressToCoordinates(address)`: Converts address to lat/lng (currently mocked)

## Real-time Subscription

The hook uses Supabase's real-time features to listen for new requests:

```typescript
supabase
  .channel(`requests:${tripId}`)
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "requests",
    filter: "status=eq.pending",
  }, handleNewRequest)
  .subscribe()
```

## Edge Function Integration

The detour calculation calls the Supabase Edge Function:

```typescript
POST /functions/v1/calculate-detour
Headers: {
  Authorization: Bearer {anon_key}
}
Body: {
  driverRoute: { start: {...}, end: {...} },
  riderRequest: { pickup: {...}, dropoff: {...} }
}
```

Returns:
- `original_distance`: Driver's original route distance
- `new_distance`: Distance with rider pickup/dropoff
- `detour_percentage`: Percentage increase
- `original_route_polyline`: Encoded polyline for original route
- `new_route_polyline`: Encoded polyline for new route

## Database Schema

The hook interacts with these tables:

- **profiles**: User profiles (auto-created if not exists)
- **trips**: Driver trips with start/end locations
- **requests**: Rider requests with pickup/dropoff locations

## RPC Functions

- **match_route(request_id)**: Returns matching trips for a request
  - Checks if dropoff is within 500m of route
  - Verifies dropoff occurs after pickup (direction check)
  - Returns trip details with distance and fractions

## Environment Variables

Required in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
```

## Current Limitations

1. **Address Geocoding**: Currently uses mock coordinates. In production, integrate with Google Geocoding API or similar.

2. **Route Polylines**: Trip creation doesn't automatically fetch route polylines. You may want to:
   - Call Google Routes API when creating a trip
   - Store the encoded polyline in the `route_polyline` field
   - Use it for better route matching

3. **User Authentication**: Currently uses localStorage for user IDs. In production, use Supabase Auth.

4. **Error Handling**: Basic error handling is in place, but you may want to add more user-friendly error messages.

## Testing

To test the integration:

1. Set up Supabase project and run `schema.sql`
2. Deploy the `calculate-detour` Edge Function
3. Add environment variables to `.env.local`
4. Start the dev server: `npm run dev`
5. Open two browser windows:
   - Window 1: Driver view, go online
   - Window 2: Rider view, create a request
6. Watch for the match alert in the driver view (if detour < 15%)

## Next Steps

1. Integrate Google Geocoding API for address conversion
2. Add route polyline fetching when creating trips
3. Implement Supabase Auth for user management
4. Add more robust error handling and loading states
5. Implement accept/decline functionality for matches

