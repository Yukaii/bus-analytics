import React, { useState } from 'react';
import { Route, BarChart3 } from 'lucide-react';
import { RouteNavigator } from './RouteNavigator';
import { StatsPanel } from './StatsPanel';
import { ProcessedRoute } from '../types/BusData';

interface SidebarTabsProps {
  routes: ProcessedRoute[];
  selectedRoute: ProcessedRoute | null;
  showAllRoutes: boolean;
  onRouteSelect: (route: ProcessedRoute | null) => void;
  onToggleShowAllRoutes: (show: boolean) => void;
  visibleRouteIds?: Set<string>;
  isMobile?: boolean;
}

type TabType = 'routes' | 'statistics';

export const SidebarTabs: React.FC<SidebarTabsProps> = ({
  routes,
  selectedRoute,
  showAllRoutes,
  onRouteSelect,
  onToggleShowAllRoutes,
  visibleRouteIds,
  isMobile = false
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('routes');

  const tabs = [
    {
      id: 'routes' as const,
      label: 'Routes',
      icon: Route,
      count: routes.length
    },
    {
      id: 'statistics' as const,
      label: 'Statistics',
      icon: BarChart3,
      count: null
    }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count && (
                <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'routes' && (
          <RouteNavigator
            routes={routes}
            selectedRoute={selectedRoute}
            showAllRoutes={showAllRoutes}
            onRouteSelect={onRouteSelect}
            onToggleShowAllRoutes={onToggleShowAllRoutes}
            visibleRouteIds={visibleRouteIds}
            isMobile={isMobile}
          />
        )}
        
        {activeTab === 'statistics' && (
          <StatsPanel routes={routes} selectedRoute={selectedRoute} />
        )}
      </div>
    </div>
  );
};