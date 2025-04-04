import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { WebSocketManager } from './websocket-manager';
import Logger from './utils/logger';
import { config } from './config';

const logger = new Logger('Server');

async function startServer() {
  try {
    const app = express();
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    const wsManager = new WebSocketManager(io, config);

    io.on('connection', (socket) => {
      logger.info('Client connected');

      socket.on('subscribe', (symbols: string[]) => {
        logger.info('Subscribe request received:', { symbols });
        wsManager.subscribeToSymbols(symbols);
      });

      socket.on('unsubscribe', (symbols: string[]) => {
        logger.info('Unsubscribe request received:', { symbols });
        wsManager.unsubscribeFromSymbols(symbols);
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected');
      });
    });

    // Connect to Alpaca WebSocket streams
    wsManager.connectDataWebSocket();
    wsManager.connectTradingWebSocket();

    const port = process.env.PORT || 5004;
    httpServer.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });

    // Handle process termination
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      wsManager.cleanup();
      httpServer.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received. Shutting down gracefully...');
      wsManager.cleanup();
      httpServer.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      wsManager.cleanup();
      httpServer.close(() => {
        logger.info('Server closed due to uncaught exception');
        process.exit(1);
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection:', { reason, promise });
      wsManager.cleanup();
      httpServer.close(() => {
        logger.info('Server closed due to unhandled rejection');
        process.exit(1);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 