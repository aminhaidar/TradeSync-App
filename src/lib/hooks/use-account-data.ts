import { useEffect, useState, useCallback } from 'react';
import { logger } from '../logger';

export interface AccountData {
  buying_power: number;
  cash: number;
  equity: number;
  initial_margin: number;
  maintenance_margin: number;
  market_value: number;
  pattern_day_trader: boolean;
  regt_buying_power: number;
  daytrading_buying_power: number;
  non_marginable_buying_power: number;
  last_equity: number;
  last_maintenance_margin: number;
  last_market_value: number;
  last_initial_margin: number;
  last_regt_buying_power: number;
  last_daytrading_buying_power: number;
  last_non_marginable_buying_power: number;
  last_cash: number;
  last_buying_power: number;
}

export interface Activity {
  id: string;
  activity_type: string;
  activity_sub_type?: string;
  transaction_time?: string;
  type?: string;
  price?: string;
  qty?: string;
  side?: string;
  symbol?: string;
  leaves_qty?: string;
  order_id?: string;
  cum_qty?: string;
  order_status?: string;
  date?: string;
  net_amount?: string;
  description?: string;
  status?: string;
  execution_id?: string;
}

export interface Fee {
  id: string;
  activity_type: string;
  activity_sub_type: string;
  date: string;
  net_amount: string;
  description: string;
  status: string;
  execution_id?: string;
}

export interface TransformedAccountData {
  balance: number;
  buyingPower: number;
  openEquity: number;
  dayPL: number;
  dayPLPercent: number;
  weekPL: number;
  weekPLPercent: number;
  monthPL: number;
  monthPLPercent: number;
  totalPL: number;
  totalPLPercent: number;
  positions: any[];
  daytradingBuyingPower: number;
  dayTrades: number;
}

const transformAccountData = (data: any): TransformedAccountData => {
  // Ensure we have the account data
  const account = data.account || data;
  
  // Convert string values to numbers
  const equity = parseFloat(account.equity || 0);
  const lastEquity = parseFloat(account.last_equity || 0);
  const buyingPower = parseFloat(account.buying_power || 0);
  const daytradingBuyingPower = parseFloat(account.daytrading_buying_power || 0);
  const dayTrades = parseInt(account.daytrade_count || 0, 10);
  
  // Calculate P/L values
  const dayPL = equity - lastEquity;
  const dayPLPercent = lastEquity !== 0 ? (dayPL / lastEquity) * 100 : 0;
  
  return {
    balance: equity,
    buyingPower: buyingPower,
    openEquity: equity - lastEquity,
    dayPL: dayPL,
    dayPLPercent: dayPLPercent,
    weekPL: 0, // These would need to be calculated based on historical data
    weekPLPercent: 0,
    monthPL: 0,
    monthPLPercent: 0,
    totalPL: dayPL,
    totalPLPercent: dayPLPercent,
    positions: [], // This would need to be populated from a separate API call
    daytradingBuyingPower: daytradingBuyingPower,
    dayTrades: dayTrades
  };
};

export const useAccountData = (wsUrl: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [accountData, setAccountData] = useState<TransformedAccountData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    try {
      // Ensure we have a valid WebSocket URL
      const url = wsUrl.startsWith('ws://') || wsUrl.startsWith('wss://') 
        ? wsUrl 
        : `ws://${wsUrl.replace(/^https?:\/\//, '')}`;
      
      logger.info('Setting up WebSocket connection', { url });
      const websocket = new WebSocket(url);
      setWs(websocket);

      websocket.onopen = () => {
        logger.info('WebSocket connection established');
        setIsConnected(true);
        setIsLoading(false);
        setReconnectAttempts(0);
      };

      websocket.onclose = () => {
        logger.info('WebSocket connection closed');
        setIsConnected(false);
        setIsLoading(false);
        
        // Only attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          logger.info(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          
          setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, delay);
        } else {
          logger.error('Max reconnection attempts reached');
          setError(new Error('Failed to establish WebSocket connection after multiple attempts'));
        }
      };

      websocket.onerror = (event) => {
        logger.error('WebSocket error:', event);
        setError(new Error('WebSocket connection error'));
        setIsConnected(false);
        setIsLoading(false);
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          logger.debug('Received WebSocket message:', data);

          if (data.success && data.account) {
            // Handle account data
            const transformedData = transformAccountData(data);
            logger.debug('Transformed account data:', transformedData);
            setAccountData(transformedData);
          } else if (data.stream === 'activity') {
            setActivities(prev => [...prev, data.data]);
          } else if (data.stream === 'fee') {
            setFees(prev => [...prev, data.data]);
          }
        } catch (err) {
          logger.error('Error parsing WebSocket message:', err);
        }
      };
    } catch (err) {
      logger.error('Error creating WebSocket connection:', err);
      setError(err instanceof Error ? err : new Error('Failed to create WebSocket connection'));
      setIsConnected(false);
      setIsLoading(false);
    }
  }, [wsUrl, reconnectAttempts]);

  useEffect(() => {
    connect();
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    if (ws) {
      ws.close();
    }
    setReconnectAttempts(0);
    setIsLoading(true);
    setError(null);
    connect();
  }, [connect, ws]);

  return {
    isConnected,
    isLoading,
    error,
    accountData,
    activities,
    fees,
    reconnect
  };
}; 