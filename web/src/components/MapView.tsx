import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvent } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ProcessedRoute, ProcessedStop } from '../types/BusData';
import { BBox, filterRoutesInBBox, sampleStopsForViewport } from '../utils/dataProcessor';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
  routes: ProcessedRoute[];
  stops: ProcessedStop[];
  selectedRoute: ProcessedRoute | null;
  showAllRoutes: boolean;
  onStopClick: (stop: ProcessedStop) => void;
  onRouteSelect: (route: ProcessedRoute | null) => void;
}

const getRouteColor = (routeName: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#C44569', '#F8B500', '#6C5CE7', '#A29BFE', '#FD79A8'
  ];
  
  let hash = 0;
  for (let i = 0; i < routeName.length; i++) {
    hash = routeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

function MapController({ selectedRoute, onViewportChange, setProjector }: { selectedRoute: ProcessedRoute | null, onViewportChange: (bbox: BBox, zoom: number) => void, setProjector: (m: L.Map) => void }) {
  const map = useMap();

  // Expose map instance for projection
  useEffect(() => {
    setProjector(map);
  }, [map, setProjector]);

  // Fit to selected route
  useEffect(() => {
    if (selectedRoute && selectedRoute.stops.length > 0) {
      const bounds = L.latLngBounds(
        selectedRoute.stops.map(stop => [stop.lat, stop.lng] as L.LatLngTuple)
      );
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, selectedRoute]);

  // Report viewport on moveend/zoomend (debounced via RAF)
  const report = useRef<number | null>(null);
  const emit = () => {
    const b = map.getBounds();
    const bbox: BBox = { minLat: b.getSouth(), minLng: b.getWest(), maxLat: b.getNorth(), maxLng: b.getEast() };
    onViewportChange(bbox, map.getZoom());
  };
  useMapEvent('moveend', () => {
    if (report.current) cancelAnimationFrame(report.current);
    report.current = requestAnimationFrame(emit);
  });
  useMapEvent('zoomend', () => {
    if (report.current) cancelAnimationFrame(report.current);
    report.current = requestAnimationFrame(emit);
  });

  useEffect(() => {
    emit(); // initial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export const MapView: React.FC<MapViewProps> = ({ 
  routes, 
  stops, 
  selectedRoute, 
  showAllRoutes,
  onStopClick,
  onRouteSelect
}) => {
  const [mapCenter] = useState<[number, number]>([35.6762, 139.6503]); // Tokyo center
  const [bbox, setBbox] = useState<BBox | null>(null);
  const [zoom, setZoom] = useState<number>(11);

  const handleViewportChange = (b: BBox, z: number) => {
    setBbox(b);
    setZoom(z);
  };

  const visibleRoutes = useMemo(() => {
    if (selectedRoute) return [selectedRoute];
    if (!showAllRoutes || !bbox) return [];
    return filterRoutesInBBox(routes, bbox);
  }, [routes, bbox, showAllRoutes, selectedRoute]);

  const projectorRef = useRef<L.Map | null>(null);

  const projected = (lat: number, lng: number) => {
    if (!projectorRef.current) return { x: 0, y: 0 };
    const p = projectorRef.current.latLngToContainerPoint([lat, lng]);
    return { x: p.x, y: p.y };
  };

  const displayedStops = useMemo(() => {
    if (selectedRoute) return selectedRoute.stops;
    if (!bbox) return [];
    // Collect stops from visible routes only
    const stopSet = new Map<string, ProcessedStop>();
    for (const r of visibleRoutes) {
      for (const s of r.stops) {
        if (
          s.lat >= bbox.minLat && s.lat <= bbox.maxLat &&
          s.lng >= bbox.minLng && s.lng <= bbox.maxLng
        ) {
          stopSet.set(s.id, s);
        }
      }
    }
    const allStops = Array.from(stopSet.values());
    // Viewport-aware sampling
    const targetTotal = Math.max(80, Math.min(250, Math.floor(zoom * 20)));
    return sampleStopsForViewport(allStops, projected, { targetTotal, minPxGap: 28 });
  }, [selectedRoute, bbox, visibleRoutes, zoom]);

  const displayedRoutes = visibleRoutes;

  // Expose visible route ids to parent via a custom event on window (simple signal)
  useEffect(() => {
    const ids = new Set(visibleRoutes.map(r => r.routeId));
    (window as any).__visibleRouteIds = ids;
  }, [visibleRoutes]);

  return (
    <div className="h-full w-full">
      <MapContainer
        center={mapCenter}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <MapController selectedRoute={selectedRoute} onViewportChange={handleViewportChange} setProjector={(m) => { projectorRef.current = m; }} />
        
        {/* Render route lines */}
        {displayedRoutes
          .filter(route => route.coordinates && route.coordinates.length >= 2)
          .map((route) => (
            <Polyline
              key={route.routeId}
              positions={route.coordinates as L.LatLngTuple[]}
              color={getRouteColor(route.routeName)}
              weight={selectedRoute ? 4 : 2}
              opacity={selectedRoute ? 0.8 : 0.6}
            />
          ))}
      
        
        {/* Render bus stops (sampled) */}
        {displayedStops.map((stop) => (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lng]}
            eventHandlers={{
              click: () => onStopClick(stop)
            }}
          >
            <Popup>
              <div className="p-3 min-w-[250px]">
                <h3 className="font-bold text-sm mb-2">{stop.name}</h3>
                {stop.nameEn && (
                  <p className="text-xs text-gray-600 mb-2">{stop.nameEn}</p>
                )}
                
                <div className="mb-3">
                  <p className="text-xs text-gray-700 mb-2">
                    {stop.routes.length} routes pass through this stop:
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {stop.routes.slice(0, 10).map((routeId) => {
                      const route = routes.find(r => r.routeId === routeId);
                      return route ? (
                        <button
                          key={routeId}
                          onClick={() => onRouteSelect(route)}
                          className="block w-full text-left px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                        >
                          <div className="font-medium text-blue-800">{route.routeName}</div>
                          <div className="text-blue-600 text-[10px]">{route.routeNameJa}</div>
                        </button>
                      ) : (
                        <div key={routeId} className="text-xs text-gray-500 px-2 py-1">
                          {routeId.split(':').pop()?.split('.').slice(1, 3).join(' ')}
                        </div>
                      );
                    })}
                    {stop.routes.length > 10 && (
                      <p className="text-xs text-gray-500 px-2">
                        ... and {stop.routes.length - 10} more routes
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="border-t pt-2 text-xs text-gray-500">
                  <p>{stop.lat.toFixed(6)}, {stop.lng.toFixed(6)}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
