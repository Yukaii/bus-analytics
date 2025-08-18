import React, { useState, useEffect } from 'react';
import { MapView } from './components/MapView';
import { RouteList } from './components/RouteList';
import { StatsPanel } from './components/StatsPanel';
import { loadBusData } from './utils/dataProcessor';
import { ProcessedRoute, ProcessedStop } from './types/BusData';
import { Loader, Bus, PanelLeftOpen, PanelLeftClose, Moon, Sun } from 'lucide-react';
import './App.css';
import { parseUrlState, pushUrlState } from './utils/urlState';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    // Apply theme to html for tailwind dark classes
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);
  const [routes, setRoutes] = useState<ProcessedRoute[]>([]);
  const [stops, setStops] = useState<ProcessedStop[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<ProcessedRoute | null>(null);
  const [selectedStop, setSelectedStop] = useState<ProcessedStop | null>(null);
  const [showAllRoutes, setShowAllRoutes] = useState(true);
  const [visibleRouteIds, setVisibleRouteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBusData()
      .then(({ stops, routes }) => {
        setStops(stops);
        setRoutes(routes);
        // Initialize from URL after data is loaded, so we can match route ids
        const u = parseUrlState();
        if (typeof u.all === 'boolean') setShowAllRoutes(u.all);
        if (u.route) {
          const r = routes.find(rt => rt.routeId === u.route || rt.routeName === u.route);
          if (r) setSelectedRoute(r);
        }
        
        // Set default viewport in URL if not present
        const sp = new URLSearchParams(window.location.search);
        const hasViewport = sp.has('lat') && sp.has('lng') && sp.has('zoom');
        if (!hasViewport) {
          pushUrlState({ lat: 35.68853, lng: 139.75742, zoom: 12 }, true);
        }
        
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to load bus data');
        setLoading(false);
        console.error('Error loading data:', err);
      });
  }, []);

  // Sync map viewport (lat,lng,zoom) to URL based on MapView signal
  useEffect(() => {
    const t = setInterval(() => {
      const v = (window as any).__mapViewport as { lat: number; lng: number; zoom: number } | undefined;
      if (!v) return;
      // Suppress viewport URL sync briefly after route selection to avoid racing the route push
      const suppressUntil = (window as any).__suppressViewportUrlSyncUntil as number | undefined;
      if (suppressUntil && Date.now() < suppressUntil) return;
      const sp = new URLSearchParams(window.location.search);
      const lat = Number(sp.get('lat')); const lng = Number(sp.get('lng')); const zoom = Number(sp.get('zoom'));
      const changed = !Number.isFinite(lat) || Math.abs(lat - v.lat) > 1e-5 || !Number.isFinite(lng) || Math.abs(lng - v.lng) > 1e-5 || !Number.isFinite(zoom) || Math.round(zoom) !== Math.round(v.zoom);
      if (changed) {
        // Preserve current route and flags by merging via pushUrlState/buildSearch
        pushUrlState({ lat: v.lat, lng: v.lng, zoom: v.zoom }, true);
      }
    }, 600);
    return () => clearInterval(t);
  }, []);

  // Handle browser back/forward to restore route selection and list toggle
  useEffect(() => {
    const onPop = () => {
      const u = parseUrlState();
      if (typeof u.all === 'boolean') setShowAllRoutes(u.all);
      if (u.route) {
        const r = routes.find(rt => rt.routeId === u.route || rt.routeName === u.route) || null;
        setSelectedRoute(r);
      } else {
        setSelectedRoute(null);
      }

    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [routes]);

  const handleRouteSelect = (route: ProcessedRoute | null) => {
    setSelectedRoute(route);
    setSelectedStop(null);
    // Update URL state
    pushUrlState({ route: route ? route.routeId : null });
    // After fitBounds, map will move; temporarily pause viewport URL syncing to avoid race
    (window as any).__suppressViewportUrlSyncUntil = Date.now() + 800;
  };

  // Poll lightweight signal from MapView to update visible route ids for sidebar count
  useEffect(() => {
    const t = setInterval(() => {
      const ids = (window as any).__visibleRouteIds as Set<string> | undefined;
      if (ids) setVisibleRouteIds(new Set(ids));
    }, 500);
    return () => clearInterval(t);
  }, []);


  const handleStopClick = (stop: ProcessedStop) => {
    setSelectedStop(stop);
  };

  const handleToggleShowAllRoutes = (show: boolean) => {
    setShowAllRoutes(show);
    // Clear selected route when toggling show all routes
    if (show) {
      setSelectedRoute(null);
      pushUrlState({ route: null, all: show });
    } else {
      pushUrlState({ all: show });
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg text-gray-600 dark:text-gray-300">Loading Tokyo bus data...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Bus className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-lg text-red-600 mb-2">Error Loading Data</p>
          <p className="text-gray-600 dark:text-gray-300">{error}</p>
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
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center gap-2">
          <Bus className="w-6 h-6 text-blue-600" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">Tokyo Bus Analytics</h1>
          <button
            aria-label="Toggle theme"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className="rounded-full p-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
            title="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Route List */}
        <div className={`relative bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-[width] duration-300 overflow-hidden ${sidebarOpen ? 'w-80' : 'w-0'}`} id="sidebar">
          {sidebarOpen && (
            <RouteList
              routes={routes}
              selectedRoute={selectedRoute}
              showAllRoutes={showAllRoutes}
              onRouteSelect={handleRouteSelect}
              onToggleShowAllRoutes={handleToggleShowAllRoutes}
              visibleRouteIds={visibleRouteIds}
            />
          )}
        </div>

        {/* Floating sidebar toggle like Google Maps */}
        <button
          type='button'
          aria-label="Toggle sidebar"
          onClick={() => setSidebarOpen(o => !o)}
          className={`fixed bottom-10 z-[9999] rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl p-2 transition-all duration-300 ${
            sidebarOpen ? 'left-[332px]' : 'left-3'
          }`}
        >
          {sidebarOpen ? <PanelLeftClose className="w-5 h-5 text-gray-700 dark:text-gray-300" /> : <PanelLeftOpen className="w-5 h-5 text-gray-700 dark:text-gray-300" />}
        </button>

        {/* Center - Map */}
        <div className="flex-1 relative">
          <MapView
            routes={routes}
            stops={stops}
            selectedRoute={selectedRoute}
            showAllRoutes={showAllRoutes}
            onStopClick={handleStopClick}
            onRouteSelect={handleRouteSelect}
          />

          {/* Selected Stop Info Overlay */}
          {selectedStop && (
            <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 dark:text-gray-100 p-4 rounded-lg shadow-lg border max-w-sm">
              <h3 className="font-bold text-lg mb-2">{selectedStop.name}</h3>
              {selectedStop.nameEn && (
                <p className="text-gray-600 dark:text-gray-300 mb-2">{selectedStop.nameEn}</p>
              )}
              <div className="text-sm text-gray-500 dark:text-gray-300">
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
        <div className="w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
          <StatsPanel routes={routes} selectedRoute={selectedRoute} />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-2">
        <div className="text-center text-xs text-gray-600 dark:text-gray-300">
          <p className="truncate">
            Source: Tokyo Open Data Platform (ODPT) |
            <a
              href="https://github.com/Yukaii/bus-analytics"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 ml-1"
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
