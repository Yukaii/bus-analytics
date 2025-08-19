import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ProcessedRoute } from '../types/BusData';
import { TrendingUp } from 'lucide-react';

interface StatsPanelProps {
  routes: ProcessedRoute[];
  selectedRoute: ProcessedRoute | null;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ routes, selectedRoute }) => {
  // Always show overall statistics now that individual route details are in stack navigation

  // Overall statistics when no route is selected
  const totalStops = routes.reduce((sum, route) => sum + route.numStops, 0);
  const avgDistance = routes.length > 0 ? 
    routes.reduce((sum, route) => sum + route.avgDistance, 0) / routes.length : 0;
  const totalDistance = routes.reduce((sum, route) => sum + route.totalDistance, 0);

  // Distance distribution data
  const distanceRanges = [
    { name: '0-1km', count: 0, color: '#8884d8' },
    { name: '1-2km', count: 0, color: '#82ca9d' },
    { name: '2-5km', count: 0, color: '#ffc658' },
    { name: '5km+', count: 0, color: '#ff7c7c' }
  ];

  routes.forEach(route => {
    if (route.avgDistance <= 1) distanceRanges[0].count++;
    else if (route.avgDistance <= 2) distanceRanges[1].count++;
    else if (route.avgDistance <= 5) distanceRanges[2].count++;
    else distanceRanges[3].count++;
  });

  // Top 10 routes by distance for chart
  const topRoutes = [...routes]
    .sort((a, b) => b.avgDistance - a.avgDistance)
    .slice(0, 10)
    .map(route => ({
      name: route.routeName,
      distance: Number(route.avgDistance.toFixed(2)),
      stops: route.numStops
    }));

  return (
    <div className="h-full overflow-y-auto">
      {/* Overall Stats */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <TrendingUp className="w-5 h-5" />
          Network Statistics
        </h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{routes.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Total Routes</div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalStops}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Total Stops</div>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {avgDistance.toFixed(2)}km
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Avg Distance</div>
          </div>
          
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {totalDistance.toFixed(0)}km
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Total Network</div>
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="p-4">
        {/* Distance Distribution Pie Chart */}
        <div className="mb-6">
          <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Distance Distribution</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distanceRanges}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {distanceRanges.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Top Routes Bar Chart */}
        <div>
          <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Top 10 Routes by Average Distance</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topRoutes}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    name === 'distance' ? `${value}km` : value,
                    name === 'distance' ? 'Avg Distance' : 'Stops'
                  ]}
                />
                <Bar dataKey="distance" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};