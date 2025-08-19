import React from 'react';
import { RouteList } from './RouteList';
import { RouteDetailView } from './RouteDetailView';
import { useNavigationStack } from '../hooks/useNavigationStack';
import { ProcessedRoute } from '../types/BusData';

interface RouteNavigatorProps {
  routes: ProcessedRoute[];
  selectedRoute: ProcessedRoute | null;
  showAllRoutes: boolean;
  onRouteSelect: (route: ProcessedRoute | null) => void;
  onToggleShowAllRoutes: (show: boolean) => void;
  visibleRouteIds?: Set<string>;
  isMobile?: boolean;
}

export const RouteNavigator: React.FC<RouteNavigatorProps> = ({
  routes,
  selectedRoute,
  showAllRoutes,
  onRouteSelect,
  onToggleShowAllRoutes,
  visibleRouteIds,
  isMobile = false
}) => {
  const { currentView, push, pop } = useNavigationStack();

  const handleRouteSelect = (route: ProcessedRoute | null) => {
    if (!route) {
      // Handle null route (clear selection)
      onRouteSelect(null);
      return;
    }
    
    // Focus map to the route
    onRouteSelect(route);
    
    // Push detail view to navigation stack
    push({ type: 'detail', route });
  };

  const handleBackToList = () => {
    // Clear route selection (optional - keeps map focused)
    // onRouteSelect(null);
    
    // Pop back to list view
    pop();
  };

  if (currentView.type === 'detail') {
    return (
      <RouteDetailView
        route={currentView.route}
        onBack={handleBackToList}
        isMobile={isMobile}
      />
    );
  }

  return (
    <RouteList
      routes={routes}
      selectedRoute={selectedRoute}
      showAllRoutes={showAllRoutes}
      onRouteSelect={handleRouteSelect}
      onToggleShowAllRoutes={onToggleShowAllRoutes}
      visibleRouteIds={visibleRouteIds}
      isMobile={isMobile}
    />
  );
};