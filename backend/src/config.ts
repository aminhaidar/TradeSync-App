export interface Config {
  // Server Configuration
  port: string;
  nodeEnv: string;

  // Database Configuration
  databaseUrl: string;

  // Alpaca API Configuration
  alpacaApiKey: string;
  alpacaApiSecret: string;
  alpacaTradingUrl: string;
  alpacaTradingWsUrl: string;
  alpacaDataUrl: string;
  alpacaDataWsUrl: string;

  // WebSocket Configuration
  wsMaxReconnectAttempts: number;
  wsReconnectDelay: number;
  wsMaxReconnectDelay: number;
  wsBatchInterval: number;
  wsHealthCheckInterval: number;
  wsBatchSize: number;
  wsMaxQueueSize: number;

  // Data Configuration
  dataMaxTrades: number;
  dataCleanupInterval: number;
  dataMaxPrice: number;
  dataMaxVolume: number;
  dataMaxSpread: number;
  dataMinPrice: number;
  dataMinVolume: number;
}

const config: Config = {
  // Server Configuration
  port: process.env.PORT || '5004',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database Configuration
  databaseUrl: process.env.DATABASE_URL || '',

  // Alpaca API Configuration
  alpacaApiKey: process.env.ALPACA_API_KEY || '',
  alpacaApiSecret: process.env.ALPACA_API_SECRET || '',
  alpacaTradingUrl: process.env.ALPACA_TRADING_URL || 'https://paper-api.alpaca.markets',
  alpacaTradingWsUrl: process.env.ALPACA_TRADING_WS_URL || 'wss://paper-api.alpaca.markets/stream',
  alpacaDataUrl: process.env.ALPACA_DATA_URL || 'https://data.alpaca.markets',
  alpacaDataWsUrl: process.env.ALPACA_DATA_WS_URL || 'wss://stream.data.alpaca.markets/v2/iex',

  // WebSocket Configuration
  wsMaxReconnectAttempts: parseInt(process.env.WS_MAX_RECONNECT_ATTEMPTS || '5', 10),
  wsReconnectDelay: parseInt(process.env.WS_RECONNECT_DELAY || '1000', 10),
  wsMaxReconnectDelay: parseInt(process.env.WS_MAX_RECONNECT_DELAY || '5000', 10),
  wsBatchInterval: parseInt(process.env.WS_BATCH_INTERVAL || '1000', 10),
  wsHealthCheckInterval: parseInt(process.env.WS_HEALTH_CHECK_INTERVAL || '30000', 10),
  wsBatchSize: parseInt(process.env.WS_BATCH_SIZE || '100', 10),
  wsMaxQueueSize: parseInt(process.env.WS_MAX_QUEUE_SIZE || '1000', 10),

  // Data Configuration
  dataMaxTrades: parseInt(process.env.DATA_MAX_TRADES || '1000', 10),
  dataCleanupInterval: parseInt(process.env.DATA_CLEANUP_INTERVAL || '3600000', 10),
  dataMaxPrice: parseInt(process.env.DATA_MAX_PRICE || '1000000', 10),
  dataMaxVolume: parseInt(process.env.DATA_MAX_VOLUME || '1000000', 10),
  dataMaxSpread: parseInt(process.env.DATA_MAX_SPREAD || '100', 10),
  dataMinPrice: parseFloat(process.env.DATA_MIN_PRICE || '0.01'),
  dataMinVolume: parseInt(process.env.DATA_MIN_VOLUME || '1', 10)
};

export default config; 