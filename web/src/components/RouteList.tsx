import React, { useState, useMemo } from 'react';
import { Search, MapPin, Route } from 'lucide-react';
import { ProcessedRoute } from '../types/BusData';

interface RouteListProps {
  routes: ProcessedRoute[];
  selectedRoute: ProcessedRoute | null;
  showAllRoutes: boolean;
  onRouteSelect: (route: ProcessedRoute | null) => void;
  onToggleShowAllRoutes: (show: boolean) => void;
  visibleRouteIds?: Set<string>;
}

export const RouteList: React.FC<RouteListProps> = ({
  routes,
  selectedRoute,
  showAllRoutes,
  onRouteSelect,
  onToggleShowAllRoutes,
  visibleRouteIds
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'distance' | 'stops'>('name');

  // Debug logging
  React.useEffect(() => {
    console.log('🚌 RouteList received:', {
      routesCount: routes.length,
      firstRoute: routes[0],
      searchTerm,
      sortBy
    });
  }, [routes, searchTerm, sortBy]);

  const filteredAndSortedRoutes = useMemo(() => {
    let filtered = routes.filter(route =>
      route.routeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.routeNameJa.includes(searchTerm)
    );

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return b.avgDistance - a.avgDistance;
        case 'stops':
          return b.numStops - a.numStops;
        case 'name':
        default:
          return a.routeName.localeCompare(b.routeName);
      }
    });
  }, [routes, searchTerm, sortBy]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <Route className="w-5 h-5" />
          Tokyo Bus Routes
        </h2>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search routes (English or Japanese)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Sort Options */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'distance' | 'stops')}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="name">Sort by Name</option>
          <option value="distance">Sort by Average Distance</option>
          <option value="stops">Sort by Number of Stops</option>
        </select>

        {/* Map Display Controls */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showAllRoutes"
              checked={showAllRoutes}
              onChange={(e) => onToggleShowAllRoutes(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="showAllRoutes" className="ml-2 text-sm text-gray-700">
              Show routes in view {visibleRouteIds ? `(${visibleRouteIds.size})` : `(${routes.length})`}
            </label>
          </div>
          
          {selectedRoute && (
            <button
              onClick={() => onRouteSelect(null)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear Selection
            </button>
          )}
        </div>
      </div>

      {/* Route List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {filteredAndSortedRoutes.map((route) => (
            <div
              key={route.routeId}
              onClick={() => onRouteSelect(route)}
              className={`p-3 mb-2 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                selectedRoute?.routeId === route.routeId
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-gray-900">
                    {route.routeName}
                  </h3>
                  {route.routeNameJa && (
                    <p className="text-sm text-blue-600 mt-1">
                      {route.routeNameJa}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{route.numStops} stops</span>
                    </div>
                    <div>
                      <span>Avg: {route.avgDistance.toFixed(2)}km</span>
                    </div>
                    <div>
                      <span>Total: {route.totalDistance.toFixed(1)}km</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredAndSortedRoutes.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No routes found matching your search.</p>
          </div>
        )}
      </div>
      
      {/* Footer Stats */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600 text-center">
          Showing {filteredAndSortedRoutes.length} of {routes.length} routes
        </div>
      </div>
    </div>
  );
};