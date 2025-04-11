'use client';

import React, { useEffect, useState } from 'react';
import { useAccountData } from '../hooks/use-account-data';
import { AccountData, Activity, Fee } from '../types/account';
import { ThemeProvider } from '../components/theme-provider';

export default function WebSocketTest() {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
  const { isConnected, isLoading, accountData, activities, fees, error, reconnect } = useAccountData(wsUrl || '');
  const [lastMessage, setLastMessage] = useState<string>('');
  const [latency, setLatency] = useState<number>(0);
  const [connectionAttempts, setConnectionAttempts] = useState<number>(0);

  useEffect(() => {
    if (accountData) {
      setLastMessage(`Account data updated at ${new Date().toISOString()}`);
      setLatency(performance.now());
    }
  }, [accountData]);

  useEffect(() => {
    if (activities.length > 0) {
      const activity = activities[0];
      setLastMessage(`New activity: ${activity.activity_type} at ${new Date().toISOString()}`);
    }
  }, [activities]);

  useEffect(() => {
    if (fees.length > 0) {
      const fee = fees[0];
      setLastMessage(`New fee: ${fee.fee_type} at ${new Date().toISOString()}`);
    }
  }, [fees]);

  useEffect(() => {
    if (error) {
      setConnectionAttempts(prev => prev + 1);
    }
  }, [error]);

  return (
    <ThemeProvider>
      <div className="p-4 border rounded-lg shadow-sm bg-white">
        <h2 className="text-lg font-semibold mb-4">WebSocket Connection Status</h2>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>

          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${isLoading ? 'bg-yellow-500' : 'bg-gray-500'}`} />
            <span>Loading: {isLoading ? 'Yes' : 'No'}</span>
          </div>

          {error && (
            <div className="p-2 bg-red-100 text-red-700 rounded">
              <div className="font-medium">Error Details:</div>
              <div>Message: {error.message}</div>
              <div>Connection Attempts: {connectionAttempts}</div>
              <div>WebSocket URL: {wsUrl}</div>
            </div>
          )}

          <div>
            <span className="font-medium">Latency: </span>
            <span>{latency.toFixed(2)}ms</span>
          </div>

          <div>
            <span className="font-medium">Last Message: </span>
            <span>{lastMessage || 'No messages received yet'}</span>
          </div>

          {accountData && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Account Data:</h3>
              <pre className="bg-gray-50 p-2 rounded text-sm overflow-auto">
                {JSON.stringify(accountData, null, 2)}
              </pre>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={reconnect}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isLoading ? 'Reconnecting...' : 'Reconnect'}
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
} 