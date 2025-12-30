# Ride-Sharing Backend Setup

This directory contains the backend setup for a ride-sharing app that matches drivers with riders based on route proximity and direction.

## Database Schema

The `schema.sql` file contains:

- **profiles** table: Stores user information with roles (driver/rider)
- **trips** table: Stores driver trips with start/end locations and route polylines
- **requests** table: Stores rider requests with pickup and dropoff locations
- **match_route()** function: PostgreSQL function that matches rider requests with driver trips

### Key Features:

1. **PostGIS Extension**: Enabled for geographic data support
2. **Spatial Indexes**: GIST indexes on all geographic columns for fast queries
3. **Route Matching Logic**:
   - Uses `ST_DWithin` to check if dropoff is within 500 meters of the route
   - Uses `ST_LineLocatePoint` to verify dropoff occurs after pickup (direction check)

### Setup Instructions:

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Run the `schema.sql` file to create all tables, indexes, and functions

## Edge Function: Calculate Detour

The `supabase/functions/calculate-detour/index.ts` function calculates the detour percentage when a driver picks up a rider.

### Functionality:

- Calculates original distance (Driver Start → Driver End)
- Calculates new distance (Driver Start → Rider Pickup → Rider Dropoff → Driver End)
- Returns detour percentage: `((New - Original) / Original) * 100`

### Setup Instructions:

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Link your project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Set environment variable**:
   ```bash
   supabase secrets set GOOGLE_MAPS_API_KEY=your-api-key
   ```

4. **Deploy the function**:
   ```bash
   supabase functions deploy calculate-detour
   ```

### API Usage:

**Endpoint**: `https://your-project.supabase.co/functions/v1/calculate-detour`

**Method**: POST

**Headers**:
```
Content-Type: application/json
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
```

**Request Body**:
```json
{
  "driverRoute": {
    "start": {
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "end": {
      "latitude": 37.7849,
      "longitude": -122.4094
    }
  },
  "riderRequest": {
    "pickup": {
      "latitude": 37.7799,
      "longitude": -122.4144
    },
    "dropoff": {
      "latitude": 37.7899,
      "longitude": -122.4044
    }
  }
}
```

**Response**:
```json
{
  "original_distance": 5000,
  "new_distance": 6500,
  "detour_distance": 1500,
  "detour_percentage": 30.0,
  "original_route_polyline": "...",
  "new_route_polyline": "..."
}
```

## Notes

- The `match_route()` function currently uses a simplified route (direct line from start to end) when no polyline is provided. In production, you should decode the polyline string to create the actual route geometry.
- The Edge Function requires a Google Maps API key with Routes API enabled.
- All geographic coordinates use WGS84 (SRID 4326).

