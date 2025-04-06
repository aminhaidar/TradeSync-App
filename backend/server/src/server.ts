import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { WebSocketManager } from './websocket-manager';
import Logger from './utils/logger';
import { config } from './types/config';
import { accountService } from './services/account';
import axios from 'axios';

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

    // Enable CORS for all routes
    app.use(cors());

    // Account endpoint
    app.get('/api/account', async (req, res) => {
      try {
        const accountData = await accountService.getAccountData();
        res.json(accountData);
      } catch (error) {
        logger.error('Error fetching account data:', error);
        res.status(500).json({ error: 'Failed to fetch account data' });
      }
    });

    // Orders endpoints
    app.get('/api/orders', async (req, res) => {
      try {
        const status = req.query.status === 'closed' ? 'closed' : 'open';
        const endpoint = `${config.alpaca.trading.url}/v2/orders`;
        
        logger.info('Orders endpoint configuration:', {
          tradingUrl: config.alpaca.trading.url,
          endpoint,
          hasApiKey: !!config.alpaca.trading.key,
          hasApiSecret: !!config.alpaca.trading.secret
        });
        
        logger.info(`Fetching ${status} orders from Alpaca...`);
        
        const response = await axios.get(endpoint, {
          headers: {
            'APCA-API-KEY-ID': config.alpaca.trading.key,
            'APCA-API-SECRET-KEY': config.alpaca.trading.secret
          },
          params: {
            status,
            limit: 100,
            direction: 'desc',
            after: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // Last 30 days
          }
        });
        
        if (!response.data) {
          logger.error('No data received from Alpaca API');
          throw new Error('No data received from Alpaca API');
        }

        const orders = Array.isArray(response.data) ? response.data : [];
        logger.info(`Successfully fetched ${orders.length} ${status} orders`);
        
        res.json(orders);
      } catch (error) {
        logger.error('Error fetching orders:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          url: error.config?.url,
          params: error.config?.params,
          stack: error.stack
        });
        
        res.status(error.response?.status || 500).json({ 
          error: 'Failed to fetch orders',
          details: error.response?.data?.message || error.message,
          status: error.response?.status
        });
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
        symbols.forEach(symbol => wsManager.unsubscribeFromSymbol(symbol));
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected');
      });
    });

    // Connect to Alpaca WebSocket streams
    wsManager.connectDataWebSocket();
    wsManager.connectTradingWebSocket();

    const port = 5003;
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