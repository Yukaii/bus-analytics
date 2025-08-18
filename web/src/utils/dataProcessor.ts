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
    id: stop['@id'],
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
  const stopMap = new Map(processedStops.map(stop => [stop.id, stop]));
  
  return routePatterns
    .map(pattern => {
      const routeStops = pattern['odpt:busstopPoleOrder']
        ?.sort((a, b) => a['odpt:index'] - b['odpt:index'])
        .map(order => {
          const stopId = order['odpt:busstopPole'];
          const stop = stopMap.get(stopId);
          return stop ? {
            ...stop,
            name: order['odpt:note'] || stop.name
          } : null;
        })
        .filter(Boolean) as ProcessedStop[];

      if (routeStops.length < 2) return null;

      // Calculate total distance
      let totalDistance = 0;
      for (let i = 0; i < routeStops.length - 1; i++) {
        const current = routeStops[i];
        const next = routeStops[i + 1];
        totalDistance += calculateDistance(current.lat, current.lng, next.lat, next.lng);
      }

      const avgDistance = totalDistance / (routeStops.length - 1);
      
      // Extract route coordinates if available
      const coordinates = pattern['ug:region']?.coordinates || 
        routeStops.map(stop => [stop.lng, stop.lat]);

      const routeName = pattern['owl:sameAs']?.split('.')[2] || pattern['odpt:pattern'] || '';

      return {
        routeId: pattern['owl:sameAs'] || pattern['@id'],
        routeName,
        routeNameJa: pattern['dc:title'] || '',
        numStops: routeStops.length,
        totalDistance,
        avgDistance,
        stops: routeStops,
        coordinates
      };
    })
    .filter(Boolean) as ProcessedRoute[];
}

export async function loadBusData(): Promise<{
  stops: ProcessedStop[];
  routes: ProcessedRoute[];
}> {
  try {
    const [stopsResponse, routesResponse] = await Promise.all([
      fetch('/data/BusstopPole.json'),
      fetch('/data/BusroutePattern.json')
    ]);

    const busStops: BusStop[] = await stopsResponse.json();
    const routePatterns: BusRoutePattern[] = await routesResponse.json();

    const processedStops = processStopsData(busStops);
    const processedRoutes = processRoutesData(routePatterns, processedStops);

    return {
      stops: processedStops,
      routes: processedRoutes
    };
  } catch (error) {
    console.error('Error loading bus data:', error);
    return {
      stops: [],
      routes: []
    };
  }
}