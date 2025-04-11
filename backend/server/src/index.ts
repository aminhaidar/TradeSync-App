import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { WebSocketManager } from './websocket-manager';
import Logger from './utils/logger';
import config from './config';
import { positionsService } from './services/positions';
import cors from 'cors';
import { TradeService } from './services/trade'
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { performanceService } from './services/performance';
import { NextFunction, Request, Response } from 'express';

// Load environment variables from the correct .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const logger = new Logger('Server');

// Global error handlers
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  // Don't exit the process, let it recover if possible
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled promise rejection:', reason);
  // Don't exit the process, let it recover if possible
});

// Log environment variables (masking sensitive data)
logger.info('Environment variables loaded:', {
  ALPACA_API_KEY: config.alpaca.trading.key ? '***' : 'not set',
  ALPACA_API_SECRET: config.alpaca.trading.secret ? '***' : 'not set',
  ALPACA_TRADING_URL: config.alpaca.trading.url
});

async function startServer() {
  try {
    // Test Alpaca connection
    try {
      const url = `${config.alpaca.trading.url}/v2/account`;
      const headers = {
        'APCA-API-KEY-ID': config.alpaca.trading.key,
        'APCA-API-SECRET-KEY': config.alpaca.trading.secret
      };
      
      logger.info('Testing Alpaca connection on startup...');
      logger.info('Making request to:', url);
      logger.info('With headers:', {
        'APCA-API-KEY-ID': headers['APCA-API-KEY-ID'] ? '***' : 'not set',
        'APCA-API-SECRET-KEY': '***'
      });
      
      const response = await axios.get(url, { headers });
      logger.info('Alpaca connection successful:', { data: response.data });
    } catch (error) {
      logger.error('Failed to connect to Alpaca on startup:', error);
      if (axios.isAxiosError(error)) {
        logger.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      }
    }

    const app = express();
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      connectTimeout: 45000
    });

    // Add CORS middleware
    app.use(cors({
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }));

    // Add JSON parsing middleware
    app.use(express.json());

    // Initialize services
    const tradeService = new TradeService(io)
    const wsManager = new WebSocketManager(io, config)
    logger.info('Services initialized')

    // Start WebSocket connections
    wsManager.connectDataWebSocket();
    wsManager.connectTradingWebSocket();

    // Test Alpaca connection endpoint
    app.get('/api/test/alpaca', async (req, res) => {
      try {
        logger.info('Testing Alpaca connection...');
        logger.info('Environment variables:', {
          ALPACA_API_KEY: config.alpaca.trading.key,
          ALPACA_API_SECRET: config.alpaca.trading.secret,
          ALPACA_TRADING_URL: config.alpaca.trading.url
        });
        
        const url = `${config.alpaca.trading.url}/v2/account`;
        const headers = {
          'APCA-API-KEY-ID': config.alpaca.trading.key,
          'APCA-API-SECRET-KEY': config.alpaca.trading.secret
        };
        
        logger.info('Making request to:', url);
        logger.info('With headers:', {
          'APCA-API-KEY-ID': headers['APCA-API-KEY-ID'],
          'APCA-API-SECRET-KEY': '***'
        });
        
        const response = await axios.get(url, { headers });
        logger.info('Alpaca connection successful:', { data: response.data });
        res.json({ success: true, account: response.data });
      } catch (error) {
        logger.error('Alpaca connection failed:', error);
        if (axios.isAxiosError(error)) {
          logger.error('Axios error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            headers: error.response?.headers,
            config: {
              url: error.config?.url,
              method: error.config?.method,
              headers: {
                'APCA-API-KEY-ID': error.config?.headers?.['APCA-API-KEY-ID'],
                'APCA-API-SECRET-KEY': '***'
              }
            }
          });
        }
        res.status(500).json({ success: false, error: 'Failed to connect to Alpaca' });
      }
    });

    // API routes
    app.use('/api', (req, res, next) => {
      logger.info(`API request: ${req.method} ${req.path}`);
      next();
    });

    // Performance endpoint
    app.get('/api/performance', async (req, res) => {
      try {
        logger.info('Fetching performance data...');
        const timeRange = (req.query.timeRange as '7d' | '30d' | '90d') || '7d';
        const performanceData = await performanceService.getPerformanceData(timeRange);
        res.json({ success: true, data: performanceData });
      } catch (error) {
        logger.error('Error in performance endpoint:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to fetch performance data',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Positions endpoint
    app.get('/api/positions', async (req, res) => {
      try {
        logger.info('Fetching positions...');
        const positions = await positionsService.getPositions();
        logger.info(`Found ${positions.length} positions`);
        res.json({ success: true, data: positions });
      } catch (error) {
        logger.error('Error in positions endpoint:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to fetch positions',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Account endpoint
    app.get('/api/account', async (req, res) => {
      try {
        logger.info('Fetching account data...');
        const response = await axios.get(`${config.alpaca.trading.url}/v2/account`, {
          headers: {
            'APCA-API-KEY-ID': config.alpaca.trading.key,
            'APCA-API-SECRET-KEY': config.alpaca.trading.secret
          }
        });
        
        logger.info('Account data fetched successfully');
        res.json(response.data);
      } catch (error) {
        logger.error('Error fetching account data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch account data';
        res.status(500).json({ error: errorMessage });
      }
    });

    // Trade history endpoint
    app.get('/api/trades/history', async (req, res) => {
      try {
        logger.info('Fetching trade history...');
        const trades = tradeService.getTradeHistory();
        logger.info(`Found ${trades.length} trades`);
        res.json(trades);
      } catch (error) {
        logger.error('Error in trade history endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch trade history' });
      }
    });

    // Open orders endpoint
    app.get('/api/trades/orders', async (req, res) => {
      try {
        logger.info('Fetching open orders...');
        const orders = tradeService.getOpenOrders();
        logger.info(`Found ${orders.length} open orders`);
        res.json(orders);
      } catch (error) {
        logger.error('Error in open orders endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch open orders' });
      }
    });

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    // Set up WebSocket connection for trade updates
    io.on('connection', (socket) => {
      logger.info('Client connected');

      // Send initial trade data to the new client
      const initialData = {
        trades: tradeService.getTradeHistory(),
        orders: tradeService.getOpenOrders()
      }
      logger.info('Sending initial trade data:', initialData)
      socket.emit('trade_update', initialData)

      // Handle trade-related events
      socket.on('place_order', async (order) => {
        try {
          logger.info('Received place_order event:', order)
          const newOrder = await tradeService.placeOrder(order)
          socket.emit('order_placed', newOrder)
        } catch (error) {
          logger.error('Error placing order:', error)
          socket.emit('order_error', { error: 'Failed to place order' })
        }
      })

      socket.on('cancel_order', async (orderId) => {
        try {
          logger.info('Received cancel_order event:', orderId)
          const success = await tradeService.cancelOrder(orderId)
          if (success) {
            socket.emit('order_cancelled', { orderId })
          } else {
            socket.emit('order_error', { error: 'Order not found' })
          }
        } catch (error) {
          logger.error('Error cancelling order:', error)
          socket.emit('order_error', { error: 'Failed to cancel order' })
        }
      })

      socket.on('modify_order', async ({ orderId, updates }) => {
        try {
          logger.info('Received modify_order event:', { orderId, updates })
          const order = await tradeService.modifyOrder(orderId, updates)
          if (order) {
            socket.emit('order_modified', order)
          } else {
            socket.emit('order_error', { error: 'Order not found' })
          }
        } catch (error) {
          logger.error('Error modifying order:', error)
          socket.emit('order_error', { error: 'Failed to modify order' })
        }
      })

      // Handle market data subscriptions
      socket.on('subscribe', (symbols: string[]) => {
        logger.info('Subscribe request received:', { symbols });
        symbols.forEach(symbol => wsManager.subscribeToSymbols([symbol]));
      });

      socket.on('unsubscribe', (symbols: string[]) => {
        logger.info('Unsubscribe request received:', { symbols });
        symbols.forEach(symbol => wsManager.unsubscribeFromSymbol(symbol));
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected');
      });
    });

    // Trade routes
    app.post('/api/trades/orders', async (req, res) => {
      try {
        const order = await tradeService.placeOrder(req.body)
        res.json(order)
      } catch (error) {
        console.error('Error placing order:', error)
        res.status(500).json({ error: 'Failed to place order' })
      }
    })

    app.put('/api/trades/orders/:orderId', async (req, res) => {
      try {
        const order = await tradeService.modifyOrder(req.params.orderId, req.body)
        if (!order) {
          res.status(404).json({ error: 'Order not found' })
          return
        }
        res.json(order)
      } catch (error) {
        console.error('Error modifying order:', error)
        res.status(500).json({ error: 'Failed to modify order' })
      }
    })

    app.delete('/api/trades/orders/:orderId', async (req, res) => {
      try {
        const success = await tradeService.cancelOrder(req.params.orderId)
        if (!success) {
          res.status(404).json({ error: 'Order not found' })
          return
        }
        res.json({ success: true })
      } catch (error) {
        console.error('Error cancelling order:', error)
        res.status(500).json({ error: 'Failed to cancel order' })
      }
    })

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

    // Error handling middleware
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('Internal server error:', err);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error',
        details: err.message || 'Unknown error'
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 