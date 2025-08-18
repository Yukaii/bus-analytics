import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ProcessedRoute, ProcessedStop } from '../types/BusData';

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
  onStopClick: (stop: ProcessedStop) => void;
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

function MapController({ selectedRoute }: { selectedRoute: ProcessedRoute | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedRoute && selectedRoute.stops.length > 0) {
      const bounds = L.latLngBounds(
        selectedRoute.stops.map(stop => [stop.lat, stop.lng] as L.LatLngTuple)
      );
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, selectedRoute]);
  
  return null;
}

export const MapView: React.FC<MapViewProps> = ({ 
  routes, 
  stops, 
  selectedRoute, 
  onStopClick 
}) => {
  const [mapCenter] = useState<[number, number]>([35.6762, 139.6503]); // Tokyo center
  
  const displayedStops = selectedRoute ? selectedRoute.stops : stops.slice(0, 500); // Limit for performance
  const displayedRoutes = selectedRoute ? [selectedRoute] : routes.slice(0, 50);

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
        
        <MapController selectedRoute={selectedRoute} />
        
        {/* Render route lines */}
        {displayedRoutes.map((route) => (
          <Polyline
            key={route.routeId}
            positions={route.coordinates as L.LatLngTuple[]}
            color={getRouteColor(route.routeName)}
            weight={selectedRoute ? 4 : 2}
            opacity={selectedRoute ? 0.8 : 0.6}
          />
        ))}
        
        {/* Render bus stops */}
        {displayedStops.map((stop) => (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lng]}
            eventHandlers={{
              click: () => onStopClick(stop)
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-sm">{stop.name}</h3>
                {stop.nameEn && (
                  <p className="text-xs text-gray-600">{stop.nameEn}</p>
                )}
                <p className="text-xs mt-1">
                  Routes: {stop.routes.length}
                </p>
                <p className="text-xs text-gray-500">
                  {stop.lat.toFixed(6)}, {stop.lng.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};