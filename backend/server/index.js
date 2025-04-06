require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const config = require('./config');
const WebSocketManager = require('./websocket-manager');

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io for client connections
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize WebSocket Manager
const wsManager = new WebSocketManager(io);

// Connect to Alpaca WebSockets
wsManager.connectDataWebSocket();
wsManager.connectTradingWebSocket();

// Socket.io connection for clients
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Send current data to new client
  socket.emit('initialData', {
    marketData: wsManager.getLatestData(),
    trades: wsManager.getLatestTrades()
  });
  
  // Send account info to new client
  getAccountInfo().then(accountInfo => {
    if (accountInfo) {
      socket.emit('accountInfo', accountInfo);
    }
  });
  
  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
  
  // Handle client requesting to subscribe to a new symbol
  socket.on('subscribe', (symbol) => {
    console.log(`Client subscribing to ${symbol}`);
    wsManager.subscribeToSymbol(symbol);
  });
  
  // Handle client requesting to unsubscribe from a symbol
  socket.on('unsubscribe', (symbol) => {
    console.log(`Client unsubscribing from ${symbol}`);
    wsManager.unsubscribeFromSymbol(symbol);
  });
});

// REST API endpoints
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    dataWebSocketConnected: wsManager.isConnected(),
    subscriptions: wsManager.getSubscriptions()
  });
});

app.get('/api/account', async (req, res) => {
  try {
    const response = await axios.get(`${config.alpaca.trading.url}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': config.alpaca.trading.key,
        'APCA-API-SECRET-KEY': config.alpaca.trading.secret
      }
    });
    
    const data = response.data;
    const transformedData = {
      balance: parseFloat(data.equity),
      dayPL: parseFloat(data.equity) - parseFloat(data.last_equity),
      dayPLPercent: ((parseFloat(data.equity) - parseFloat(data.last_equity)) / parseFloat(data.last_equity)) * 100,
      openPL: parseFloat(data.position_market_value) + parseFloat(data.cash) - parseFloat(data.equity),
      buyingPower: parseFloat(data.buying_power),
      unsettledCash: parseFloat(data.non_marginable_buying_power)
    };
    
    console.log('Raw Alpaca data:', data);
    console.log('Transformed data:', transformedData);
    
    res.json(transformedData);
  } catch (error) {
    console.error('Error handling account info request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/market-data', (req, res) => {
  res.json(wsManager.getLatestData());
});

app.get('/api/trades', (req, res) => {
  res.json(wsManager.getLatestTrades());
});

app.get('/api/symbols', (req, res) => {
  res.json({ symbols: wsManager.getSubscriptions() });
});

app.post('/api/symbols', (req, res) => {
  const { symbol } = req.body;
  
  if (!symbol) {
    return res.status(400).json({ error: 'Symbol is required' });
  }
  
  const formattedSymbol = symbol.toUpperCase().trim();
  
  if (!wsManager.getSubscriptions().includes(formattedSymbol)) {
    wsManager.subscribeToSymbol(formattedSymbol);
    res.json({ success: true, symbols: wsManager.getSubscriptions() });
  } else {
    res.json({ success: false, message: 'Symbol already being tracked', symbols: wsManager.getSubscriptions() });
  }
});

app.get('/api/portfolio/history', async (req, res) => {
  try {
    const { period = '1M', timeframe = '1D' } = req.query;
    
    const response = await axios.get(`${config.alpaca.trading.url}/v2/account/portfolio/history`, {
      headers: {
        'APCA-API-KEY-ID': config.alpaca.trading.key,
        'APCA-API-SECRET-KEY': config.alpaca.trading.secret
      },
      params: {
        period,
        timeframe,
        extended_hours: true
      }
    });
    
    const data = response.data;
    const transformedData = data.timestamp.map((timestamp, index) => ({
      timestamp: new Date(timestamp * 1000).toISOString(),
      equity: data.equity[index],
      profitLoss: data.profit_loss[index],
      profitLossPct: data.profit_loss_pct[index]
    }));
    
    res.json(transformedData);
  } catch (error) {
    console.error('Error fetching portfolio history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/positions', async (req, res) => {
  try {
    const response = await axios.get(`${config.alpaca.trading.url}/v2/positions`, {
      headers: {
        'APCA-API-KEY-ID': config.alpaca.trading.key,
        'APCA-API-SECRET-KEY': config.alpaca.trading.secret
      }
    });
    
    const positions = response.data.map(position => ({
      symbol: position.symbol,
      qty: parseFloat(position.qty),
      avgPrice: parseFloat(position.avg_entry_price),
      marketPrice: parseFloat(position.current_price),
      marketValue: parseFloat(position.market_value),
      unrealizedPL: parseFloat(position.unrealized_pl),
      unrealizedPLPercent: parseFloat(position.unrealized_plpc) * 100,
      type: position.side
    }));
    
    res.json(positions);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to get account information
const getAccountInfo = async () => {
  try {
    console.log('Fetching account info from Alpaca...');
    console.log('URL:', `${config.alpaca.trading.url}/v2/account`);
    console.log('Using API Key:', config.alpaca.trading.key ? '✓ Present' : '✗ Missing');
    console.log('Using Secret Key:', config.alpaca.trading.secret ? '✓ Present' : '✗ Missing');
    
    const response = await axios.get(`${config.alpaca.trading.url}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': config.alpaca.trading.key,
        'APCA-API-SECRET-KEY': config.alpaca.trading.secret
      }
    });
    
    console.log('Alpaca response:', response.data);
    
    const data = response.data;
    const transformedData = {
      balance: parseFloat(data.equity),
      dayPL: parseFloat(data.equity) - parseFloat(data.last_equity),
      dayPLPercent: ((parseFloat(data.equity) - parseFloat(data.last_equity)) / parseFloat(data.last_equity)) * 100,
      openPL: parseFloat(data.position_market_value) + parseFloat(data.cash) - parseFloat(data.equity),
      buyingPower: parseFloat(data.buying_power),
      unsettledCash: parseFloat(data.non_marginable_buying_power)
    };
    
    console.log('Transformed data:', transformedData);
    return transformedData;
  } catch (error) {
    console.error('Error fetching account info:', error.message);
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
    }
    return null;
  }
};

// Start server
server.listen(config.port, () => {
  console.log(`TradeSync Server running on port ${config.port}`);
});