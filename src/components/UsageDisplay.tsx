'use client';

import { useTokenUsage } from '@/hooks/useTokenUsage';

interface UsageDisplayProps {
  className?: string;
}

export default function UsageDisplay({ className = '' }: UsageDisplayProps) {
  const { usage, loading, error, refreshUsage } = useTokenUsage();

  if (loading) {
    return (
      <div className={`p-3 bg-gray-50 rounded-lg ${className}`}>
        <div className="text-sm text-gray-600">Loading usage data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-3 bg-red-50 rounded-lg ${className}`}>
        <div className="text-sm text-red-600">Error: {error}</div>
        <button 
          onClick={refreshUsage}
          className="mt-2 text-xs text-red-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!usage) {
    return null;
  }

  const { todaysUsage, remainingMessages, hasReachedLimit } = usage;
  const progressPercentage = (todaysUsage.messages_sent / todaysUsage.daily_message_limit) * 100;

  return (
    <div className={`p-3 bg-white border rounded-lg shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">Daily Usage</h3>
        <button 
          onClick={refreshUsage}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          ↻ Refresh
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Messages:</span>
          <span className={hasReachedLimit ? 'text-red-600 font-medium' : 'text-gray-900'}>
            {todaysUsage.messages_sent}/{todaysUsage.daily_message_limit}
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              hasReachedLimit ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Remaining: {remainingMessages}</span>
          <span>Tokens: {todaysUsage.tokens_used.toLocaleString()}</span>
        </div>

        {hasReachedLimit && (
          <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
            ⚠️ You&apos;ve reached your daily message limit. Try again tomorrow!
          </div>
        )}
      </div>
    </div>
  );
}