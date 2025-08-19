import React from 'react';
import { ArrowLeft, MapPin, Route as RouteIcon } from 'lucide-react';
import { ProcessedRoute } from '../types/BusData';

interface RouteDetailViewProps {
  route: ProcessedRoute;
  onBack: () => void;
  isMobile?: boolean;
}

export const RouteDetailView: React.FC<RouteDetailViewProps> = ({
  route,
  onBack,
  isMobile = false
}) => {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
            Route Details
          </h2>
        </div>
      </div>

      {/* Route Info */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <RouteIcon className="w-5 h-5 text-blue-600" />
              {route.routeNameJa || route.routeName}
            </h3>
            {route.routeName && route.routeNameJa && (
              <p className="text-blue-600 dark:text-blue-400 mt-1">{route.routeName}</p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {route.numStops}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total Stops</div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {route.avgDistance.toFixed(2)}km
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Avg Distance</div>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {route.totalDistance.toFixed(1)}km
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total Distance</div>
            </div>
            
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {route.stops.length > 1 ? 
                  (route.totalDistance / (route.stops.length - 1)).toFixed(2) : 
                  '0.00'
                }km
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Distance/Stop</div>
            </div>
          </div>

          {/* Route Stops List */}
          <div>
            <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Route Stops ({route.stops.length})
            </h4>
            <div className="space-y-2">
              {route.stops.map((stop, index) => (
                <div 
                  key={stop.id} 
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                >
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {stop.name}
                    </h5>
                    {stop.nameEn && stop.nameEn !== stop.name && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {stop.nameEn}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};