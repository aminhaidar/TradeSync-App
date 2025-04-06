import { io } from 'socket.io-client';
import Logger from './utils/logger';

const logger = new Logger('TestClient');

async function testWebSocketConnection() {
  try {
    logger.info('Connecting to WebSocket server...');
    const socket = io('http://localhost:5004');

    socket.on('connect', () => {
      logger.info('Connected to WebSocket server');
    });

    socket.on('connectionState', (state) => {
      logger.info('Connection state update:', state);
    });

    socket.on('marketUpdates', (updates) => {
      logger.info('Received market updates:', updates);
    });

    socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });

    socket.on('disconnect', (reason: string) => {
      logger.warn('Disconnected from server:', { reason });
    });

    // Subscribe to some test symbols
    setTimeout(() => {
      logger.info('Subscribing to test symbols...');
      socket.emit('subscribe', ['AAPL', 'MSFT', 'GOOGL']);
    }, 2000);

    // Keep the connection alive for testing
    setTimeout(() => {
      logger.info('Test completed. Disconnecting...');
      socket.disconnect();
      process.exit(0);
    }, 30000); // Run for 30 seconds

  } catch (error) {
    logger.error('Test failed:', error);
    process.exit(1);
  }
}

testWebSocketConnection(); 