import { BusStop, BusRoutePattern, ProcessedRoute, ProcessedStop } from '../types/BusData';

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
}

export function processStopsData(busStops: BusStop[]): ProcessedStop[] {
  return busStops.map(stop => ({
    id: stop['owl:sameAs'] || stop['@id'], // Use owl:sameAs for ODPT ID mapping
    name: stop.title?.ja || stop['dc:title'],
    nameEn: stop.title?.en || '',
    lat: stop['geo:lat'],
    lng: stop['geo:long'],
    routes: stop['odpt:busroutePattern'] || []
  }));
}

export function processRoutesData(
  routePatterns: BusRoutePattern[],
  processedStops: ProcessedStop[]
): ProcessedRoute[] {
  console.log('🔄 Processing routes data...', {
    patternsCount: routePatterns.length,
    stopsCount: processedStops.length
  });

  const stopMap = new Map(processedStops.map(stop => [stop.id, stop]));
  console.log('📍 Stop map created with', stopMap.size, 'stops');
  
  const results = routePatterns
    .map((pattern, index) => {
      if (index < 3) { // Log first few patterns for debugging
        console.log(`🛣️ Processing pattern ${index}:`, {
          id: pattern['@id'],
          title: pattern['dc:title'],
          sameAs: pattern['owl:sameAs'],
          stopsOrder: pattern['odpt:busstopPoleOrder']?.length || 0,
          rawStopsOrder: pattern['odpt:busstopPoleOrder']
        });
      }
      const routeStops = pattern['odpt:busstopPoleOrder']
        ?.sort((a, b) => a['odpt:index'] - b['odpt:index'])
        .map(order => {
          const stopId = order['odpt:busstopPole'];
          const stop = stopMap.get(stopId);
          if (index < 3) {
            console.log(`  Stop lookup: ${stopId} -> ${stop ? 'found' : 'NOT FOUND'}`);
          }
          return stop ? {
            ...stop,
            name: order['odpt:note'] || stop.name
          } : null;
        })
        .filter(Boolean) as ProcessedStop[];

      // Count missing stops for debugging
      const totalStopsInPattern = pattern['odpt:busstopPoleOrder']?.length || 0;
      const foundStops = routeStops.length;
      const missingStops = totalStopsInPattern - foundStops;
      
      if (index < 3 && missingStops > 0) {
        console.log(`  ⚠️ Route ${index}: ${missingStops} out of ${totalStopsInPattern} stops are missing from dataset`);
      }

      if (index < 3) {
        console.log(`  Route stops found: ${routeStops.length} out of ${pattern['odpt:busstopPoleOrder']?.length || 0}`);
      }

      // Extract route coordinates - prefer geometric path, fall back to stop coordinates
      let coordinates: number[][];
      
      if (pattern['ug:region']?.coordinates && pattern['ug:region'].coordinates.length > 0) {
        // Use the geometric route path (convert from [lng, lat] to [lat, lng] for Leaflet)
        coordinates = pattern['ug:region'].coordinates.map(coord => [coord[1], coord[0]]);
        if (index < 3) {
          console.log(`  Using geometric coordinates: ${coordinates.length} points`);
        }
      } else if (routeStops.length >= 2) {
        // Fall back to connecting available bus stops
        coordinates = routeStops.map(stop => [stop.lat, stop.lng]);
        if (index < 3) {
          console.log(`  Using stop coordinates: ${coordinates.length} points`);
        }
      } else {
        // Not enough data to draw the route
        coordinates = [];
        if (index < 3) {
          console.log(`  No coordinates available for route`);
        }
      }

      // Skip route only if we have insufficient data for both stops and coordinates
      if (routeStops.length < 2 && coordinates.length < 2) {
        if (index < 3) {
          console.log(`  ❌ Skipping route ${index}: only ${routeStops.length} stops found and ${coordinates.length} coordinates`);
        }
        return null;
      }

      // Calculate total distance
      let totalDistance = 0;
      let avgDistance = 0;
      
      if (routeStops.length >= 2) {
        for (let i = 0; i < routeStops.length - 1; i++) {
          const current = routeStops[i];
          const next = routeStops[i + 1];
          totalDistance += calculateDistance(current.lat, current.lng, next.lat, next.lng);
        }
        avgDistance = totalDistance / (routeStops.length - 1);
      } else if (coordinates.length >= 2) {
        // Calculate distance from coordinate path
        for (let i = 0; i < coordinates.length - 1; i++) {
          const [lat1, lng1] = coordinates[i];
          const [lat2, lng2] = coordinates[i + 1];
          totalDistance += calculateDistance(lat1, lng1, lat2, lng2);
        }
        avgDistance = totalDistance / (coordinates.length - 1);
      }

      const routeName = pattern['owl:sameAs']?.split('.')[2] || pattern['odpt:pattern'] || '';

      const result = {
        routeId: pattern['owl:sameAs'] || pattern['@id'],
        routeName,
        routeNameJa: pattern['dc:title'] || '',
        numStops: routeStops.length,
        totalDistance,
        avgDistance,
        stops: routeStops,
        coordinates
      };

      if (index < 3) { // Log first few results
        console.log(`✅ Processed route ${index}:`, {
          routeId: result.routeId,
          routeName: result.routeName,
          routeNameJa: result.routeNameJa,
          numStops: result.numStops,
          coordinatesLength: coordinates.length
        });
      }

      return result;
    })
    .filter(Boolean) as ProcessedRoute[];

  console.log(`🎯 Final processed routes: ${results.length} routes created`);
  return results;
}

export async function loadBusData(): Promise<{
  stops: ProcessedStop[];
  routes: ProcessedRoute[];
}> {
  try {
    console.log('🚌 Starting to load bus data...');
    const [stopsResponse, routesResponse] = await Promise.all([
      fetch('/data/BusstopPole.json'),
      fetch('/data/BusroutePattern.json')
    ]);

    console.log('📡 Fetch responses:', {
      stopsStatus: stopsResponse.status,
      routesStatus: routesResponse.status
    });

    const busStops: BusStop[] = await stopsResponse.json();
    const routePatterns: BusRoutePattern[] = await routesResponse.json();

    console.log('📊 Raw data loaded:', {
      stopsCount: busStops.length,
      routePatternsCount: routePatterns.length
    });

    const processedStops = processStopsData(busStops);
    const processedRoutes = processRoutesData(routePatterns, processedStops);

    console.log('✅ Processed data:', {
      processedStopsCount: processedStops.length,
      processedRoutesCount: processedRoutes.length
    });

    return {
      stops: processedStops,
      routes: processedRoutes
    };
  } catch (error) {
    console.error('❌ Error loading bus data:', error);
    return {
      stops: [],
      routes: []
    };
  }
}