import { useState, useCallback } from 'react';
import { ProcessedRoute } from '../types/BusData';

export type NavigationView = 
  | { type: 'list' }
  | { type: 'detail'; route: ProcessedRoute };

export const useNavigationStack = () => {
  const [stack, setStack] = useState<NavigationView[]>([{ type: 'list' }]);
  
  const currentView = stack[stack.length - 1];
  
  const push = useCallback((view: NavigationView) => {
    setStack(prev => [...prev, view]);
  }, []);
  
  const pop = useCallback(() => {
    setStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
  }, []);
  
  const reset = useCallback(() => {
    setStack([{ type: 'list' }]);
  }, []);
  
  const canGoBack = stack.length > 1;
  
  return {
    currentView,
    push,
    pop,
    reset,
    canGoBack
  };
};