import dotenv from 'dotenv';
import path from 'path';
import { AlpacaConfig } from './types/alpaca';
import Logger from './utils/logger';
import { Config } from './types/config';

// Load environment variables from the correct .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const logger = new Logger('Config');

// Clean up API credentials by removing any comments and trimming whitespace
const cleanApiKey = (process.env.ALPACA_API_KEY || '').split('#')[0].trim();
const cleanApiSecret = (process.env.ALPACA_API_SECRET || '').split('#')[0].trim();

// Log environment variables (masking sensitive data)
logger.info('Loading environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  ALPACA_API_KEY: cleanApiKey ? '***' : 'not set',
  ALPACA_API_SECRET: cleanApiSecret ? '***' : 'not set',
  ALPACA_TRADING_URL: process.env.ALPACA_TRADING_URL
});

const config: Config = {
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '5004', 10),
  alpaca: {
    trading: {
      url: process.env.ALPACA_TRADING_URL || 'https://paper-api.alpaca.markets',
      wsUrl: process.env.ALPACA_TRADING_WS_URL || 'wss://paper-api.alpaca.markets/stream',
      key: process.env.ALPACA_API_KEY || '',
      secret: process.env.ALPACA_API_SECRET || ''
    },
    data: {
      url: 'https://data.alpaca.markets',
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
    healthCheckTimeout: parseInt(process.env.WS_HEALTH_CHECK_TIMEOUT || '5000', 10),
    batchSize: parseInt(process.env.WS_BATCH_SIZE || '100', 10),
    maxQueueSize: parseInt(process.env.WS_MAX_QUEUE_SIZE || '1000', 10)
  },
  data: {
    maxPositions: 100,
    maxOrders: 100,
    maxTrades: parseInt(process.env.DATA_MAX_TRADES || '1000', 10),
    cleanupInterval: parseInt(process.env.DATA_CLEANUP_INTERVAL || '3600000', 10),
    maxAge: parseInt(process.env.DATA_MAX_AGE || '86400000', 10),
    maxPrice: parseFloat(process.env.DATA_MAX_PRICE || '1000000'),
    maxVolume: parseFloat(process.env.DATA_MAX_VOLUME || '1000000'),
    maxSpread: parseFloat(process.env.DATA_MAX_SPREAD || '100'),
    minPrice: parseFloat(process.env.DATA_MIN_PRICE || '0.01'),
    minVolume: parseFloat(process.env.DATA_MIN_VOLUME || '1')
  }
};

export default config; 