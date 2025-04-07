// Load environment variables first
require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const config = require('./config');
const WebSocketManager = require('./websocket-manager');

// Log environment variables
console.log('Configuration loaded:');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', config.port);
console.log('Trading URL:', config.alpaca.trading.url);
console.log('Trading WebSocket URL:', config.alpaca.trading.wsUrl);
console.log('Data WebSocket URL:', config.alpaca.data.wsUrl);
console.log('API Keys configured:', config.alpaca.trading.key ? 'true' : 'false');

// Create Express app
const app = express();
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io for client connections
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize WebSocket Manager
const wsManager = new WebSocketManager(io);

// Initialize Trade Service
const { TradeService } = require('./src/services/trade');
const tradeService = new TradeService(io);

// Connect to Alpaca WebSockets
wsManager.connectDataWebSocket();
wsManager.connectTradingWebSocket();

// Set up periodic updates
const ACCOUNT_UPDATE_INTERVAL = 5000; // 5 seconds
const POSITIONS_UPDATE_INTERVAL = 5000; // 5 seconds
let accountUpdateInterval;
let positionsUpdateInterval;

// Start account updates
const startAccountUpdates = () => {
  accountUpdateInterval = setInterval(async () => {
    try {
      const accountInfo = await getAccountInfo();
      if (accountInfo) {
        io.emit('accountUpdate', accountInfo);
      }
    } catch (error) {
      console.error('Error in account update interval:', error);
    }
  }, ACCOUNT_UPDATE_INTERVAL);
};

// Start position updates
const startPositionUpdates = () => {
  positionsUpdateInterval = setInterval(async () => {
    try {
      const positions = await getPositions();
      if (positions) {
        io.emit('positions', positions);
      }
    } catch (error) {
      console.error('Error in positions update interval:', error);
    }
  }, POSITIONS_UPDATE_INTERVAL);
};

// Start updates
startAccountUpdates();
startPositionUpdates();

// Socket.io connection for clients
io.on('connection', async (socket) => {
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

  // Send positions to new client
  try {
    const positions = await getPositions();
    if (positions) {
      socket.emit('positions', positions);
    }
  } catch (error) {
    console.error('Error sending initial positions:', error);
  }

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
app.get('/api/test/alpaca', async (req, res) => {
  try {
    console.log('Testing Alpaca connection...');
    console.log('Alpaca Trading URL:', config.alpaca.trading.url);
    console.log('Alpaca API Key:', config.alpaca.trading.key);
    
    const response = await axios.get(`${config.alpaca.trading.url}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': config.alpaca.trading.key,
        'APCA-API-SECRET-KEY': config.alpaca.trading.secret
      }
    });
    console.log('Alpaca connection successful:', response.data);
    res.json({ success: true, account: response.data });
  } catch (error) {
    console.error('Alpaca connection failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
    }
    res.status(500).json({ success: false, error: 'Failed to connect to Alpaca' });
  }
});

app.get('/api/trades/history', async (req, res) => {
  try {
    console.log('Fetching trade history...');
    const trades = await tradeService.getTradeHistory();
    console.log(`Found ${trades.length} trades`);
    res.json(trades);
  } catch (error) {
    console.error('Error in trade history endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch trade history' });
  }
});

app.get('/api/trades/orders', async (req, res) => {
  try {
    console.log('Fetching open orders...');
    const orders = tradeService.getOpenOrders();
    console.log(`Found ${orders.length} orders`);
    res.json(orders);
  } catch (error) {
    console.error('Error in open orders endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch open orders' });
  }
});

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

// Helper function to get positions
const getPositions = async () => {
  try {
    const response = await axios.get(`${config.alpaca.trading.url}/v2/positions`, {
      headers: {
        'APCA-API-KEY-ID': config.alpaca.trading.key,
        'APCA-API-SECRET-KEY': config.alpaca.trading.secret
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching positions:', error);
    return null;
  }
};

// Add positions endpoint
app.get('/api/positions', async (req, res) => {
  try {
    const positions = await getPositions();
    if (positions) {
      res.json(positions);
    } else {
      res.status(500).json({ error: 'Failed to fetch positions' });
    }
  } catch (error) {
    console.error('Error handling positions request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Trade routes
app.post('/api/trades/orders', async (req, res) => {
  try {
    const order = await tradeService.placeOrder(req.body);
    res.json(order);
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

app.put('/api/trades/orders/:orderId', async (req, res) => {
  try {
    const order = await tradeService.modifyOrder(req.params.orderId, req.body);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json(order);
  } catch (error) {
    console.error('Error modifying order:', error);
    res.status(500).json({ error: 'Failed to modify order' });
  }
});

app.delete('/api/trades/orders/:orderId', async (req, res) => {
  try {
    const success = await tradeService.cancelOrder(req.params.orderId);
    if (!success) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Start server
server.listen(config.port, () => {
  console.log(`TradeSync Server running on port ${config.port}`);
});