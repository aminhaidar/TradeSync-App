const config = {
  // Environment settings
  isProduction: process.env.NODE_ENV === 'production',
  
  // Server settings
  port: 5003,
  
  // Alpaca API settings
  alpaca: {
    trading: {
      url: process.env.ALPACA_TRADING_URL || 'https://paper-api.alpaca.markets',
      wsUrl: process.env.ALPACA_TRADING_WS_URL || 'wss://paper-api.alpaca.markets/stream',
      key: process.env.ALPACA_API_KEY,
      secret: process.env.ALPACA_API_SECRET
    },
    data: {
      wsUrl: process.env.ALPACA_DATA_WS_URL || 'wss://stream.data.alpaca.markets/v2/test',
      key: process.env.ALPACA_DATA_API_KEY || process.env.ALPACA_API_KEY,
      secret: process.env.ALPACA_DATA_API_SECRET || process.env.ALPACA_API_SECRET
    }
  },
  
  // WebSocket settings
  websocket: {
    maxReconnectAttempts: 5,
    reconnectDelay: 5000,
    maxReconnectDelay: 30000,
    batchInterval: 100,
    healthCheckInterval: 30000,
    batchSize: 100,
    maxQueueSize: 1000
  },
  
  // Data management settings
  data: {
    maxTrades: 1000,
    cleanupInterval: 60000,
    maxPrice: 10000,
    maxVolume: 1000000,
    maxSpread: 100,
    minPrice: 0.01,
    minVolume: 1
  }
};

// Validate required environment variables
const requiredEnvVars = [
  'ALPACA_API_KEY',
  'ALPACA_API_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Log configuration (excluding sensitive data)
console.log('Configuration loaded:');
console.log('Environment:', config.isProduction ? 'production' : 'development');
console.log('Port:', config.port);
console.log('Trading URL:', config.alpaca.trading.url);
console.log('Trading WebSocket URL:', config.alpaca.trading.wsUrl);
console.log('Data WebSocket URL:', config.alpaca.data.wsUrl);
console.log('API Keys configured:', !!config.alpaca.trading.key && !!config.alpaca.trading.secret);

module.exports = config; 