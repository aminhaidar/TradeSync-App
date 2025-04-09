import { Server } from 'socket.io';
import { createServer } from 'http';
import { WebSocketManager } from './websocket-manager';
import { AlpacaConfig } from './types/alpaca';
import dotenv from 'dotenv';
import { WebSocketError } from './utils/errors';

// Load environment variables
dotenv.config();

// Create HTTP server
const httpServer = createServer();

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Alpaca configuration
const config: AlpacaConfig = {
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '5004', 10),
  alpaca: {
    data: {
      key: process.env.ALPACA_API_KEY || '',
      secret: process.env.ALPACA_API_SECRET || '',
      wsUrl: process.env.ALPACA_DATA_WS_URL || 'wss://stream.data.alpaca.markets/v2/test'
    },
    trading: {
      key: process.env.ALPACA_API_KEY || '',
      secret: process.env.ALPACA_API_SECRET || '',
      url: process.env.ALPACA_API_URL || 'https://paper-api.alpaca.markets',
      wsUrl: process.env.ALPACA_TRADING_WS_URL || 'wss://paper-api.alpaca.markets/stream'
    }
  },
  websocket: {
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    batchInterval: 100,
    healthCheckInterval: 30000
  },
  data: {
    maxTrades: 1000,
    cleanupInterval: 3600000 // 1 hour
  }
};

// Create WebSocket manager
const wsManager = new WebSocketManager(io, config);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected');

  // Handle client subscription requests
  socket.on('subscribe', (symbol: string) => {
    console.log(`Client requested subscription to ${symbol}`);
    wsManager.subscribeToSymbol(symbol);
  });

  // Handle client unsubscribe requests
  socket.on('unsubscribe', (symbol: string) => {
    console.log(`Client requested unsubscription from ${symbol}`);
    wsManager.unsubscribeFromSymbol(symbol);
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Handle WebSocket manager events
io.on('connectionHealth', (health) => {
  console.log('Connection health:', health);
});

io.on('marketUpdates', (updates) => {
  console.log('Market updates:', updates);
});

io.on('tradeUpdate', (update) => {
  console.log('Trade update:', update);
});

// Start the server
const PORT = process.env.PORT || 5004;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Connect to Alpaca WebSocket streams
  wsManager.connectDataWebSocket();
  wsManager.connectTradingWebSocket();
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  wsManager.cleanup();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

async function testWebSocket() {
  try {
    console.log('Starting WebSocket test...');
    
    // Create a mock Socket.IO server
    const io = new Server();
    
    // Create WebSocket manager instance
    const wsManager = new WebSocketManager(io, config);
    
    // Test data stream connection
    console.log('Testing data stream connection...');
    wsManager.connectDataWebSocket();
    
    // Test trading stream connection
    console.log('Testing trading stream connection...');
    wsManager.connectTradingWebSocket();
    
    // Subscribe to some test symbols
    const testSymbols = ['AAPL', 'MSFT', 'GOOGL'];
    console.log(`Subscribing to symbols: ${testSymbols.join(', ')}`);
    wsManager.subscribeToSymbols(testSymbols);
    
    // Keep the process running for a while to observe the connection
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Cleanup
    console.log('Cleaning up...');
    wsManager.cleanup();
    
    console.log('Test completed successfully');
  } catch (error) {
    if (error instanceof WebSocketError) {
      console.error(`WebSocket error: ${error.message} (Stream: ${error.stream})`);
    } else {
      console.error('Test failed:', error);
    }
    process.exit(1);
  }
}

// Run the test
testWebSocket(); 