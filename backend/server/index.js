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
    const accountInfo = await getAccountInfo();
    if (accountInfo) {
      res.json(accountInfo);
    } else {
      res.status(500).json({ error: 'Failed to fetch account information' });
    }
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

// Helper function to get account information
const getAccountInfo = async () => {
  try {
    const response = await axios.get(`${config.alpaca.trading.url}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': config.alpaca.trading.key,
        'APCA-API-SECRET-KEY': config.alpaca.trading.secret
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching account info:', error);
    return null;
  }
};

// Start server
server.listen(config.port, () => {
  console.log(`TradeSync Server running on port ${config.port}`);
});