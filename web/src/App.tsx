import React, { useState, useEffect, useRef } from 'react';
import { useMedia } from 'react-use';
import { MapView, MapViewRef } from './components/MapView';
import { SidebarTabs } from './components/SidebarTabs';
import { RouteNavigator } from './components/RouteNavigator';
import { Sheet } from 'react-modal-sheet';
import { loadBusData } from './utils/dataProcessor';
import { ProcessedRoute, ProcessedStop } from './types/BusData';
import { Loader, Bus, PanelLeftOpen, PanelLeftClose, Moon, Sun, X } from 'lucide-react';
import './App.css';
import { parseUrlState, pushUrlState } from './utils/urlState';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useMedia('(max-width: 767px)');
  
  // URL state management refs
  const urlStateRef = useRef({
    route: null as string | null,
    all: true as boolean,
    lat: 35.68853 as number,
    lng: 139.75742 as number,
    zoom: 12 as number
  });
  const isNavigatingRef = useRef(false);
  const skipNextViewportSync = useRef(false);
  const mapViewRef = useRef<MapViewRef>(null);
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

  // Close desktop sidebar when switching to mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isMobile, sidebarOpen]);
  const [routes, setRoutes] = useState<ProcessedRoute[]>([]);
  const [stops, setStops] = useState<ProcessedStop[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<ProcessedRoute | null>(null);
  const [selectedStop, setSelectedStop] = useState<ProcessedStop | null>(null);
  const [showAllRoutes, setShowAllRoutes] = useState(true);
  const [visibleRouteIds, setVisibleRouteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Centralized URL state sync function
  const syncUrlState = (partialState: Partial<typeof urlStateRef.current>, replace = false) => {
    if (isNavigatingRef.current) return; // Don't sync during navigation
    
    const newState = { ...urlStateRef.current, ...partialState };
    urlStateRef.current = newState;
    pushUrlState(newState, replace);
  };

  // Calculate distance between two geographic points (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  };

  // Handle viewport changes from MapView
  const handleViewportChange = (viewport: { lat: number; lng: number; zoom: number }) => {
    if (skipNextViewportSync.current) {
      skipNextViewportSync.current = false;
      return;
    }
    
    if (isNavigatingRef.current) return;
    
    // Check if viewport has changed significantly
    const latChanged = Math.abs(urlStateRef.current.lat - viewport.lat) > 1e-5;
    const lngChanged = Math.abs(urlStateRef.current.lng - viewport.lng) > 1e-5;
    const zoomChanged = Math.round(urlStateRef.current.zoom) !== Math.round(viewport.zoom);
    
    if (latChanged || lngChanged || zoomChanged) {
      syncUrlState({ lat: viewport.lat, lng: viewport.lng, zoom: viewport.zoom }, true);
    }
  };

  // Initialize from URL and load data
  useEffect(() => {
    // Parse initial URL state
    const initialUrlState = parseUrlState();
    urlStateRef.current = {
      route: initialUrlState.route || null,
      all: initialUrlState.all ?? true,
      lat: initialUrlState.lat ?? 35.68853,
      lng: initialUrlState.lng ?? 139.75742,
      zoom: initialUrlState.zoom ?? 12
    };

    loadBusData()
      .then(({ stops, routes }) => {
        setStops(stops);
        setRoutes(routes);
        
        // Set initial state from URL
        setShowAllRoutes(urlStateRef.current.all);
        if (urlStateRef.current.route) {
          const r = routes.find(rt => rt.routeId === urlStateRef.current.route || rt.routeName === urlStateRef.current.route);
          if (r) setSelectedRoute(r);
        }

        // Ensure URL has all required params
        syncUrlState({}, true);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to load bus data');
        setLoading(false);
        console.error('Error loading data:', err);
      });
  }, []);


  // Handle browser back/forward navigation
  useEffect(() => {
    const onPop = () => {
      isNavigatingRef.current = true;
      
      // Parse URL state and update our ref
      const newUrlState = parseUrlState();
      urlStateRef.current = {
        route: newUrlState.route || null,
        all: newUrlState.all ?? true,
        lat: newUrlState.lat ?? 35.68853,
        lng: newUrlState.lng ?? 139.75742,
        zoom: newUrlState.zoom ?? 12
      };
      
      // Update React state
      setShowAllRoutes(urlStateRef.current.all);
      if (urlStateRef.current.route) {
        const r = routes.find(rt => rt.routeId === urlStateRef.current.route || rt.routeName === urlStateRef.current.route) || null;
        setSelectedRoute(r);
      } else {
        setSelectedRoute(null);
      }

      // Update map viewport to match URL with smart animation
      const currentViewport = mapViewRef.current?.getViewport();
      if (currentViewport) {
        const distance = calculateDistance(
          currentViewport.lat, currentViewport.lng,
          urlStateRef.current.lat, urlStateRef.current.lng
        );
        
        // Use smooth animation if distance is reasonable (< 50km) and zoom difference is small
        const zoomDiff = Math.abs(currentViewport.zoom - urlStateRef.current.zoom);
        const shouldAnimate = distance < 50 && zoomDiff < 3;
        
        mapViewRef.current?.setViewport({
          lat: urlStateRef.current.lat,
          lng: urlStateRef.current.lng,
          zoom: urlStateRef.current.zoom
        }, { animate: shouldAnimate });
      } else {
        // Fallback for when viewport is not available
        mapViewRef.current?.setViewport({
          lat: urlStateRef.current.lat,
          lng: urlStateRef.current.lng,
          zoom: urlStateRef.current.zoom
        });
      }

      // Re-enable syncing after animation completes (longer delay for animated transitions)
      const delay = currentViewport && 
        calculateDistance(currentViewport.lat, currentViewport.lng, urlStateRef.current.lat, urlStateRef.current.lng) < 50 && 
        Math.abs(currentViewport.zoom - urlStateRef.current.zoom) < 3 
        ? 1000 // Wait for animation to complete
        : 300;  // Short delay for instant transitions
        
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, delay);
    };
    
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [routes]);

  const handleRouteSelect = (route: ProcessedRoute | null) => {
    setSelectedRoute(route);
    setSelectedStop(null);
    
    // Update URL state without viewport changes (map will fit bounds)
    syncUrlState({ route: route ? route.routeId : null });
    
    // Skip next viewport sync since map will move programmatically
    skipNextViewportSync.current = true;
  };

  // Handle popup route selection - trigger navigation detail view
  const handlePopupRouteSelect = (route: ProcessedRoute) => {
    // First focus the map to the route
    handleRouteSelect(route);
    
    // Then trigger a custom event that RouteNavigator can listen to
    window.dispatchEvent(new CustomEvent('popupRouteSelect', { detail: { route } }));
  };

  // Update visible route IDs periodically for sidebar count
  useEffect(() => {
    const t = setInterval(() => {
      if (mapViewRef.current) {
        const ids = mapViewRef.current.getVisibleRouteIds();
        setVisibleRouteIds(new Set(ids));
      }
    }, 500);
    return () => clearInterval(t);
  }, []);


  const handleStopClick = (stop: ProcessedStop) => {
    setSelectedStop(stop);
  };

  const handleToggleShowAllRoutes = (show: boolean) => {
    setShowAllRoutes(show);
    
    // Clear selected route when toggling to show all routes
    if (show) {
      setSelectedRoute(null);
      syncUrlState({ route: null, all: show });
    } else {
      syncUrlState({ all: show });
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
        {/* Desktop Left Sidebar - Route List */}
        {!isMobile && (
          <>
            <div className={`relative bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-[width] duration-300 overflow-hidden ${sidebarOpen ? 'w-80' : 'w-0'}`} id="sidebar">
              {sidebarOpen && (
                <SidebarTabs
                  routes={routes}
                  selectedRoute={selectedRoute}
                  showAllRoutes={showAllRoutes}
                  onRouteSelect={handleRouteSelect}
                  onToggleShowAllRoutes={handleToggleShowAllRoutes}
                  visibleRouteIds={visibleRouteIds}
                  isMobile={false}
                />
              )}
            </div>

            {/* Floating sidebar toggle like Google Maps */}
            <button
              type='button'
              aria-label="Toggle sidebar"
              onClick={() => setSidebarOpen(o => !o)}
              className={`fixed bottom-10 z-[999] rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl p-2 transition-all duration-300 ${
                sidebarOpen ? 'left-[332px]' : 'left-3'
              }`}
            >
              {sidebarOpen ? <PanelLeftClose className="w-5 h-5 text-gray-700 dark:text-gray-300" /> : <PanelLeftOpen className="w-5 h-5 text-gray-700 dark:text-gray-300" />}
            </button>
          </>
        )}

        {/* Center - Map */}
        <div className="flex-1 relative">
          <MapView
            ref={mapViewRef}
            routes={routes}
            stops={stops}
            selectedRoute={selectedRoute}
            showAllRoutes={showAllRoutes}
            onStopClick={handleStopClick}
            onRouteSelect={handleRouteSelect}
            onViewportChange={handleViewportChange}
            onPopupRouteSelect={handlePopupRouteSelect}
          />

          {/* Mobile Clear Selection Button */}
          {isMobile && selectedRoute && (
            <button
              onClick={() => handleRouteSelect(null)}
              className="absolute top-4 right-4 z-[999] flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              title="Clear route selection"
            >
              <X className="w-4 h-4" />
              <span>Clear Route</span>
            </button>
          )}

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

      </div>

      {/* Mobile Bottom Sheet */}
      {isMobile && (
        <Sheet
          isOpen={true}
          onClose={() => {}}
          snapPoints={[1, 0.7, 80]}
          initialSnap={2}
        >
          <Sheet.Container style={{ backgroundColor: theme === 'dark' ? 'rgb(17 24 39)' : 'white' }}>
            <Sheet.Header />
            <Sheet.Content>
              <Sheet.Scroller draggableAt="top" style={{ backgroundColor: theme === 'dark' ? 'rgb(17 24 39)' : 'white' }}>
                <RouteNavigator
                  routes={routes}
                  selectedRoute={selectedRoute}
                  showAllRoutes={showAllRoutes}
                  onRouteSelect={handleRouteSelect}
                  onToggleShowAllRoutes={handleToggleShowAllRoutes}
                  visibleRouteIds={visibleRouteIds}
                  isMobile={true}
                />
              </Sheet.Scroller>
            </Sheet.Content>
          </Sheet.Container>
          <Sheet.Backdrop />
        </Sheet>
      )}

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
