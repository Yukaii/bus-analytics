import React, { useState, useEffect } from 'react';
import { MapView } from './components/MapView';
import { RouteList } from './components/RouteList';
import { StatsPanel } from './components/StatsPanel';
import { loadBusData } from './utils/dataProcessor';
import { ProcessedRoute, ProcessedStop } from './types/BusData';
import { Loader, Bus } from 'lucide-react';
import './App.css';

function App() {
  const [routes, setRoutes] = useState<ProcessedRoute[]>([]);
  const [stops, setStops] = useState<ProcessedStop[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<ProcessedRoute | null>(null);
  const [selectedStop, setSelectedStop] = useState<ProcessedStop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBusData()
      .then(({ stops, routes }) => {
        setStops(stops);
        setRoutes(routes);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to load bus data');
        setLoading(false);
        console.error('Error loading data:', err);
      });
  }, []);

  const handleRouteSelect = (route: ProcessedRoute | null) => {
    setSelectedRoute(route);
    setSelectedStop(null);
  };

  const handleStopClick = (stop: ProcessedStop) => {
    setSelectedStop(stop);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg text-gray-600">Loading Tokyo bus data...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Bus className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-lg text-red-600 mb-2">Error Loading Data</p>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <Bus className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Tokyo Bus Analytics Explorer
            </h1>
            <p className="text-sm text-gray-600">
              Interactive route exploration and network analysis
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Route List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <RouteList
            routes={routes}
            selectedRoute={selectedRoute}
            onRouteSelect={handleRouteSelect}
          />
        </div>

        {/* Center - Map */}
        <div className="flex-1 relative">
          <MapView
            routes={routes}
            stops={stops}
            selectedRoute={selectedRoute}
            onStopClick={handleStopClick}
          />
          
          {/* Selected Stop Info Overlay */}
          {selectedStop && (
            <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg border max-w-sm">
              <h3 className="font-bold text-lg mb-2">{selectedStop.name}</h3>
              {selectedStop.nameEn && (
                <p className="text-gray-600 mb-2">{selectedStop.nameEn}</p>
              )}
              <div className="text-sm text-gray-500">
                <p>Coordinates: {selectedStop.lat.toFixed(6)}, {selectedStop.lng.toFixed(6)}</p>
                <p>Routes: {selectedStop.routes.length}</p>
              </div>
              <button
                onClick={() => setSelectedStop(null)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar - Stats */}
        <div className="w-96 bg-white border-l border-gray-200">
          <StatsPanel routes={routes} selectedRoute={selectedRoute} />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 p-3">
        <div className="text-center text-sm text-gray-600">
          <p>
            Data: {routes.length} routes, {stops.length} stops | 
            Built with React + TypeScript + Leaflet
          </p>
          <p className="text-xs mt-1">
            Source: Tokyo Open Data Platform (ODPT) | 
            <a 
              href="https://github.com/yukai/bus-analytics" 
              className="text-blue-600 hover:text-blue-800 ml-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;