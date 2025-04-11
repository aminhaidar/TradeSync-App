const config = {
  port: process.env.PORT || 5003,
  alpaca: {
    trading: {
      url: process.env.ALPACA_TRADING_URL || 'https://paper-api.alpaca.markets',
      wsUrl: process.env.ALPACA_TRADING_WS_URL || 'wss://paper-api.alpaca.markets/stream',
      key: process.env.ALPACA_API_KEY,
      secret: process.env.ALPACA_API_SECRET
    },
    data: {
      wsUrl: process.env.ALPACA_DATA_WS_URL || 'wss://stream.data.alpaca.markets/v2/iex',
      key: process.env.ALPACA_DATA_KEY,
      secret: process.env.ALPACA_DATA_SECRET
    }
  },
  data: {
    maxTrades: 100,
    maxQuotes: 100,
    maxBars: 100
  }
};

module.exports = config; 