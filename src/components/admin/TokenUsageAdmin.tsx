'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

interface UserUsageStats {
  id: number;
  user_id: string;
  usage_date: string;
  messages_sent: number;
  tokens_used: number;
  daily_message_limit: number;
  created_at: string;
  updated_at: string;
  remaining_messages: number;
  usage_percentage: number;
  total_usage_days: number;
  total_tokens_all_time: number;
  total_messages_all_time: number;
}

interface UsersUsageResponse {
  users: UserUsageStats[];
  totalUsers: number;
  totalTokensToday: number;
  totalMessagesToday: number;
  averageDailyLimit: number;
}

export default function AdminTokenUsage() {
  const { user  } = useUser();
  const [usageData, setUsageData] = useState<UsersUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('usage_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchUsageData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sortBy,
        sortOrder
      });
      const response = await fetch(`/api/admin/usage?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: UsersUsageResponse = await response.json();
      console.log('Response data:', data);
      setUsageData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching admin usage data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch usage data');
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortBy, sortOrder]);

  useEffect(() => {
    fetchUsageData();
  }, [user, currentPage, sortBy, sortOrder]);

  if (loading) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen">
        <div className="text-center text-gray-300">Loading admin data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen">
        <div className="bg-red-900 border border-red-700 rounded-lg p-4">
          <div className="text-red-300">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Token Usage Administration</h1>
        <p className="text-gray-400 mt-2">Monitor and manage user token usage across the platform.</p>
      </div>

      {/* Statistics Cards */}
      {usageData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <div className="text-sm font-medium text-gray-400">Total Users</div>
            <div className="text-2xl font-bold text-white">{usageData.totalUsers}</div>
          </div>
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <div className="text-sm font-medium text-gray-400">Today&apos;s Messages</div>
            <div className="text-2xl font-bold text-white">{usageData.totalMessagesToday.toLocaleString()}</div>
          </div>
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <div className="text-sm font-medium text-gray-400">Today&apos;s Tokens</div>
            <div className="text-2xl font-bold text-white">{usageData.totalTokensToday.toLocaleString()}</div>
          </div>
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <div className="text-sm font-medium text-gray-400">Avg Daily Limit</div>
            <div className="text-2xl font-bold text-white">{usageData.averageDailyLimit}</div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mb-4 flex gap-4 items-center">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border border-gray-600 bg-gray-800 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="usage_date">Sort by Date</option>
          <option value="messages_sent">Sort by Messages</option>
          <option value="tokens_used">Sort by Tokens</option>
          <option value="usage_percentage">Sort by Usage %</option>
          <option value="total_tokens_all_time">Sort by Total Tokens</option>
        </select>
        
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
          className="border border-gray-600 bg-gray-800 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
        
        <button 
          onClick={fetchUsageData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          Refresh Data
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-medium text-white">User Usage Statistics</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Messages Today
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Daily Limit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tokens Today
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Progress
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {usageData?.users.map((usage: UserUsageStats) => {
                const hasReachedLimit = usage.messages_sent >= usage.daily_message_limit;
                
                return (
                  <tr key={usage.id} className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {usage.user_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(usage.usage_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <span className={hasReachedLimit ? 'text-red-400 font-medium' : 'text-gray-300'}>
                        {usage.messages_sent}
                      </span>
                      <span className="text-gray-500 ml-1">
                        ({usage.remaining_messages} left)
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {usage.daily_message_limit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {usage.tokens_used.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-600 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${hasReachedLimit ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(usage.usage_percentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">
                          {usage.usage_percentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              }) || []}
            </tbody>
          </table>
        </div>

        {usageData?.users.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-400">
            No usage data available yet.
          </div>
        )}
        
        {/* Pagination */}
        {usageData && usageData.totalUsers > 20 && (
          <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Page {currentPage} - Showing {usageData.users.length} of {usageData.totalUsers} users
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-600 bg-gray-800 text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={usageData.users.length < 20}
                className="px-3 py-1 border border-gray-600 bg-gray-800 text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}