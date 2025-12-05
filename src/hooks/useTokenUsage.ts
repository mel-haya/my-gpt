'use client';

import { useState, useEffect, useCallback } from 'react';

interface UsageData {
  todaysUsage: {
    messages_sent: number;
    tokens_used: number;
    daily_message_limit: number;
    usage_date: string;
  };
  remainingMessages: number;
  hasReachedLimit: boolean;
}

// Global state to share usage data across all components
let globalUsage: UsageData | null = null;
let globalLoading = true;
let globalError: string | null = null;
const subscribers: Set<() => void> = new Set();

// Global fetch function
let currentFetchPromise: Promise<void> | null = null;

const fetchUsageGlobal = async (): Promise<void> => {
  // Prevent multiple simultaneous fetches
  if (currentFetchPromise) {
    return currentFetchPromise;
  }

  currentFetchPromise = (async () => {
    try {
      globalLoading = true;
      notifySubscribers();
      
      const response = await fetch('/api/usage');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      globalUsage = data;
      globalError = null;
    } catch (err) {
      console.error('Error fetching usage data:', err);
      globalError = err instanceof Error ? err.message : 'Failed to fetch usage data';
    } finally {
      globalLoading = false;
      currentFetchPromise = null;
      notifySubscribers();
    }
  })();

  return currentFetchPromise;
};

const notifySubscribers = () => {
  subscribers.forEach(callback => callback());
};

export function useTokenUsage() {
  const [, forceUpdate] = useState({});
  
  // Force re-render when global state changes
  const rerender = useCallback(() => {
    forceUpdate({});
  }, []);

  useEffect(() => {
    subscribers.add(rerender);
    
    // Initial fetch if not already done
    if (globalUsage === null && !currentFetchPromise) {
      fetchUsageGlobal();
    }
    
    return () => {
      subscribers.delete(rerender);
    };
  }, [rerender]);

  const refreshUsage = useCallback(async () => {
    await fetchUsageGlobal();
  }, []);

  return { 
    usage: globalUsage, 
    loading: globalLoading, 
    error: globalError, 
    refreshUsage 
  };
}