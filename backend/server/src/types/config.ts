import dotenv from 'dotenv';

dotenv.config();

export interface AlpacaConfig {
  trading: {
    url: string;
    wsUrl: string;
    key: string;
    secret: string;
  };
  data: {
    url: string;
    wsUrl: string;
    key: string;
    secret: string;
  };
}

export interface WebSocketConfig {
  maxReconnectAttempts: number;
  reconnectDelay: number;
  maxReconnectDelay: number;
  batchInterval: number;
  healthCheckInterval: number;
  batchSize: number;
  maxQueueSize: number;
}

export interface DataConfig {
  maxPositions: number;
  maxOrders: number;
  maxTrades: number;
  cleanupInterval: number;
  maxPrice: number;
  maxVolume: number;
  maxSpread: number;
  minPrice: number;
  minVolume: number;
}

export interface Config {
  isProduction: boolean;
  port: number;
  alpaca: AlpacaConfig;
  websocket: WebSocketConfig;
  data: DataConfig;
}

export const config: Config = {
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '5004', 10),
  alpaca: {
    trading: {
      url: process.env.ALPACA_API_URL || 'https://paper-api.alpaca.markets',
      wsUrl: process.env.ALPACA_TRADING_WS_URL || 'wss://paper-api.alpaca.markets/stream',
      key: process.env.ALPACA_API_KEY || '',
      secret: process.env.ALPACA_API_SECRET || ''
    },
    data: {
      url: process.env.ALPACA_DATA_URL || 'https://data.alpaca.markets',
      wsUrl: process.env.ALPACA_DATA_WS_URL || 'wss://stream.data.alpaca.markets/v2/iex',
      key: process.env.ALPACA_API_KEY || '',
      secret: process.env.ALPACA_API_SECRET || ''
    }
  },
  websocket: {
    maxReconnectAttempts: parseInt(process.env.WS_MAX_RECONNECT_ATTEMPTS || '5', 10),
    reconnectDelay: parseInt(process.env.WS_RECONNECT_DELAY || '1000', 10),
    maxReconnectDelay: parseInt(process.env.WS_MAX_RECONNECT_DELAY || '5000', 10),
    batchInterval: parseInt(process.env.WS_BATCH_INTERVAL || '1000', 10),
    healthCheckInterval: parseInt(process.env.WS_HEALTH_CHECK_INTERVAL || '30000', 10),
    batchSize: parseInt(process.env.WS_BATCH_SIZE || '100', 10),
    maxQueueSize: parseInt(process.env.WS_MAX_QUEUE_SIZE || '1000', 10)
  },
  data: {
    maxPositions: 100,
    maxOrders: 100,
    maxTrades: 1000,
    cleanupInterval: 3600000, // 1 hour
    maxPrice: 1000000,
    maxVolume: 1000000,
    maxSpread: 0.1,
    minPrice: 0.01,
    minVolume: 1
  }
}; 