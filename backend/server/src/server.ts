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
import accountRoutes from './routes/account-routes';

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

    // Add CORS middleware
    app.use(cors({
      origin: ['http://localhost:3000', 'http://localhost:5004'],
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

    // Use routes
    app.use('/api', accountRoutes);

    // API routes middleware
    app.use('/api', (req, res, next) => {
      logger.info(`API request: ${req.method} ${req.path}`);
      next();
    });

    // Test Alpaca connection endpoint
    app.get('/api/test/alpaca', async (req, res) => {
      try {
        logger.info('Testing Alpaca connection...');
        logger.info('Alpaca Trading URL:', { url: config.alpaca.trading.url });
        logger.info('Alpaca API Key:', { key: config.alpaca.trading.key });
        
        const response = await axios.get(`${config.alpaca.trading.url}/v2/account`, {
          headers: {
            'APCA-API-KEY-ID': config.alpaca.trading.key,
            'APCA-API-SECRET-KEY': config.alpaca.trading.secret
          }
        });
        
        logger.info('Alpaca connection successful:', response.data);
        res.json({ success: true, data: response.data });
      } catch (error: unknown) {
        logger.error('Alpaca connection failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        res.status(500).json({ success: false, error: errorMessage });
      }
    });

    // Positions endpoint
    app.get('/api/positions', async (req, res) => {
      try {
        logger.info('Fetching positions...');
        const positions = await positionsService.getPositions();
        logger.info(`Found ${positions.length} positions`);
        res.json(positions);
      } catch (error) {
        logger.error('Error in positions endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch positions' });
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

    // Connect to Alpaca WebSocket streams
    wsManager.connectDataWebSocket();
    wsManager.connectTradingWebSocket();

    // Start the server
    httpServer.listen(config.port, () => {
      logger.info(`Server listening on port ${config.port}`);
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

  } catch (error: unknown) {
    logger.error('Failed to start server:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    process.exit(1);
  }
}

startServer(); 