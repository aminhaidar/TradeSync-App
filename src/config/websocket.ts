export const WS_CONFIG = {
  // WebSocket connection settings
  connection: {
    path: '/ws',
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 30000,
    autoConnect: true,
    pingInterval: 25000,
    pingTimeout: 20000
  },

  // Message types
  messageTypes: {
    ACCOUNT_UPDATE: 'accountUpdate',
    ACTIVITY: 'activity',
    FEE: 'fee',
    QUOTE: 'quote',
    TRADE_UPDATE: 'tradeUpdate',
    PING: 'ping',
    PONG: 'pong'
  },

  // Alpaca stream settings
  streams: {
    trade: {
      feed: 'iex',
      paper: true
    },
    quote: {
      feed: 'iex',
      paper: true
    }
  },

  // Subscription settings
  subscription: {
    maxSymbols: 100,
    batchSize: 10
  },

  // Error handling
  error: {
    maxRetries: 5,
    retryDelay: 1000,
    maxRetryDelay: 5000,
    exponentialBackoff: true,
    backoffFactor: 2
  }
} 