-- Enable PostGIS extension for geographic data support
CREATE EXTENSION IF NOT EXISTS postgis;

-- Profiles table to store user information
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL CHECK (role IN ('driver', 'rider')),
    full_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trips table to store driver trips
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    start_location GEOGRAPHY(POINT, 4326) NOT NULL,
    end_location GEOGRAPHY(POINT, 4326) NOT NULL,
    route_polyline TEXT, -- Encoded polyline string from Google Routes API
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on driver_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
-- Create spatial index on start_location for geographic queries
CREATE INDEX IF NOT EXISTS idx_trips_start_location ON trips USING GIST(start_location);
-- Create spatial index on end_location for geographic queries
CREATE INDEX IF NOT EXISTS idx_trips_end_location ON trips USING GIST(end_location);

-- Requests table to store rider requests
CREATE TABLE IF NOT EXISTS requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    pickup GEOGRAPHY(POINT, 4326) NOT NULL,
    dropoff GEOGRAPHY(POINT, 4326) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'accepted', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on rider_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_requests_rider_id ON requests(rider_id);
-- Create spatial index on pickup for geographic queries
CREATE INDEX IF NOT EXISTS idx_requests_pickup ON requests USING GIST(pickup);
-- Create spatial index on dropoff for geographic queries
CREATE INDEX IF NOT EXISTS idx_requests_dropoff ON requests USING GIST(dropoff);

-- Function to decode polyline and create a LINESTRING geometry
-- This function converts a Google polyline string to a PostGIS LINESTRING
CREATE OR REPLACE FUNCTION polyline_to_linestring(polyline_text TEXT)
RETURNS GEOGRAPHY AS $$
DECLARE
    result GEOGRAPHY;
BEGIN
    -- Note: This is a simplified version. In production, you'd need a proper polyline decoder
    -- For now, we'll assume the polyline is already decoded or use a library function
    -- The actual implementation would decode the polyline string into coordinate pairs
    -- and create a LINESTRING from them
    
    -- Placeholder: In a real implementation, you would:
    -- 1. Decode the polyline string to get coordinate pairs
    -- 2. Build a PostGIS LINESTRING from those coordinates
    -- 3. Return as GEOGRAPHY
    
    -- For now, return NULL if polyline is empty
    IF polyline_text IS NULL OR polyline_text = '' THEN
        RETURN NULL;
    END IF;
    
    -- This would need a proper polyline decoder implementation
    -- For Supabase, you might want to use a JavaScript function in an Edge Function
    -- or use a PostgreSQL extension that supports polyline decoding
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Main function to match routes
-- Takes a request_id and returns matching trips where:
-- 1. The dropoff is within 500 meters of the trip's route
-- 2. The dropoff occurs after the pickup on the route (direction check)
CREATE OR REPLACE FUNCTION match_route(request_id UUID)
RETURNS TABLE (
    trip_id UUID,
    driver_id UUID,
    driver_name TEXT,
    start_location GEOGRAPHY,
    end_location GEOGRAPHY,
    route_polyline TEXT,
    trip_status TEXT,
    distance_to_route NUMERIC,
    pickup_fraction NUMERIC,
    dropoff_fraction NUMERIC
) AS $$
DECLARE
    req_pickup GEOGRAPHY;
    req_dropoff GEOGRAPHY;
    route_linestring GEOGRAPHY;
    trip_record RECORD;
    pickup_frac NUMERIC;
    dropoff_frac NUMERIC;
    dist_to_route NUMERIC;
    driver_name TEXT;
BEGIN
    -- Get the pickup and dropoff locations from the request
    SELECT pickup, dropoff INTO req_pickup, req_dropoff
    FROM requests
    WHERE id = request_id;
    
    -- If request not found, return empty
    IF req_pickup IS NULL OR req_dropoff IS NULL THEN
        RETURN;
    END IF;
    
    -- Loop through all active trips
    FOR trip_record IN
        SELECT t.id, t.driver_id, t.start_location, t.end_location, t.route_polyline, t.status
        FROM trips t
        WHERE t.status = 'active' OR t.status = 'pending'
    LOOP
        -- If route_polyline exists, we need to check if dropoff is on the route
        -- Note: In production, you would decode the polyline here to create the actual route
        -- For now, we'll use a simplified approach: create a direct route from start to end
        -- The polyline decoding would typically be done in an Edge Function or using a library
        IF trip_record.route_polyline IS NOT NULL AND trip_record.route_polyline != '' THEN
            -- In production, decode the polyline and create the actual route linestring
            -- For now, create a direct line from start to end as a fallback
            route_linestring := ST_MakeLine(
                trip_record.start_location::geometry,
                trip_record.end_location::geometry
            )::geography;
        ELSE
            -- If no polyline, create a direct line from start to end
            route_linestring := ST_MakeLine(
                trip_record.start_location::geometry,
                trip_record.end_location::geometry
            )::geography;
        END IF;
        
        -- Check if dropoff is within 500 meters of the route
        IF ST_DWithin(req_dropoff, route_linestring, 500) THEN
            -- Get the fraction of the route where pickup is closest
            pickup_frac := ST_LineLocatePoint(route_linestring::geometry, req_pickup::geometry);
            -- Get the fraction of the route where dropoff is closest
            dropoff_frac := ST_LineLocatePoint(route_linestring::geometry, req_dropoff::geometry);
            
            -- Direction check: dropoff must occur after pickup (dropoff_fraction > pickup_fraction)
            IF dropoff_frac > pickup_frac THEN
                -- Calculate distance to route
                dist_to_route := ST_Distance(req_dropoff, route_linestring);
                
                -- Get driver name
                SELECT full_name INTO driver_name
                FROM profiles
                WHERE id = trip_record.driver_id;
                
                -- Return the matching trip
                RETURN QUERY SELECT
                    trip_record.id,
                    trip_record.driver_id,
                    driver_name,
                    trip_record.start_location,
                    trip_record.end_location,
                    trip_record.route_polyline,
                    trip_record.status,
                    dist_to_route,
                    pickup_frac,
                    dropoff_frac;
            END IF;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at
    BEFORE UPDATE ON requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE profiles IS 'User profiles with role (driver or rider)';
COMMENT ON TABLE trips IS 'Driver trips with start/end locations and route polyline';
COMMENT ON TABLE requests IS 'Rider requests with pickup and dropoff locations';
COMMENT ON FUNCTION match_route(UUID) IS 'Matches a rider request with driver trips based on route proximity and direction';

