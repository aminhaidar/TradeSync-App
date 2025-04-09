// Simple Express server for the account endpoint
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Create express app
const app = express();
const server = http.createServer(app);

// Set up Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5004'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  path: '/socket.io/'
});

// Add middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5004'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Configuration from environment
const config = {
  alpaca: {
    trading: {
      url: process.env.ALPACA_TRADING_URL || 'https://paper-api.alpaca.markets',
      key: process.env.ALPACA_API_KEY || '',
      secret: process.env.ALPACA_API_SECRET || ''
    }
  }
};

console.log('Config loaded:', {
  url: config.alpaca.trading.url,
  key: config.alpaca.trading.key ? '***' : 'not set',
  secret: config.alpaca.trading.secret ? '***' : 'not set'
});

// Helper function to fetch account data
async function fetchAccountData() {
  try {
    console.log('Fetching account data...');
    const response = await axios.get(`${config.alpaca.trading.url}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': config.alpaca.trading.key,
        'APCA-API-SECRET-KEY': config.alpaca.trading.secret
      }
    });
    
    console.log('Account data fetched successfully');
    return response.data;
  } catch (error) {
    console.error('Error fetching account data:', error.message);
    throw error;
  }
}

// Account endpoint
app.get('/api/account', async (req, res) => {
  try {
    const accountData = await fetchAccountData();
    
    // Also emit the account data to all connected sockets
    io.emit('account', { account: accountData });
    
    res.json(accountData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch account data' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Socket.IO endpoint to check if Socket.IO is running
app.get('/socket.io/health', (req, res) => {
  res.json({ status: 'Socket.IO is running' });
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Client connected to Socket.IO with id:', socket.id);
  
  // Send connection health event
  socket.emit('connectionHealth', { status: 'connected' });
  socket.emit('connected', true);
  
  // Send initial account data on connection
  fetchAccountData()
    .then(accountData => {
      socket.emit('account', { account: accountData });
    })
    .catch(error => {
      console.error('Error fetching initial account data:', error);
    });
  
  // Mock positions data to prevent errors
  const mockPositions = {
    positions: []
  };
  socket.emit('positions', mockPositions);
  
  // When client subscribes to symbols
  socket.on('subscribe', (symbols) => {
    console.log('Client subscribed to symbols:', symbols);
    // Emit a mock market update to acknowledge subscription
    socket.emit('marketUpdates', { 
      type: 'trade',
      payload: { 
        message: 'Subscription acknowledged',
        symbols: symbols
      }
    });
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected from Socket.IO:', socket.id);
  });

  // Error handling
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Start server
const PORT = 5005;
server.listen(PORT, () => {
  console.log(`Account API Server with Socket.IO running on port ${PORT}`);
}); 