import { Server } from 'socket.io';
import { Trade } from '../services/trade';
import { OrderValidator } from '../services/order-validator';
import { OrderSubmitter } from '../services/order-submitter';
import { Config } from '../types/config';

jest.mock('../services/order-validator');
jest.mock('../services/order-submitter');

describe('Trade', () => {
  let trade: Trade;
  let mockServer: jest.Mocked<Server>;
  let mockValidator: jest.Mocked<OrderValidator>;
  let mockSubmitter: jest.Mocked<OrderSubmitter>;

  const mockConfig: Config = {
    isProduction: false,
    port: 5004,
    alpaca: {
      trading: {
        url: 'https://paper-api.alpaca.markets',
        wsUrl: 'wss://paper-api.alpaca.markets/stream',
        key: 'test-key',
        secret: 'test-secret'
      },
      data: {
        url: 'https://data.alpaca.markets/v2',
        wsUrl: 'wss://stream.data.alpaca.markets/v2',
        key: 'test-key',
        secret: 'test-secret'
      }
    },
    websocket: {
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      batchInterval: 100,
      healthCheckInterval: 30000,
      healthCheckTimeout: 5000,
      batchSize: 100,
      maxQueueSize: 1000
    },
    data: {
      maxPositions: 100,
      maxOrders: 100,
      maxTrades: 1000,
      cleanupInterval: 60000,
      maxAge: 3600000,
      maxPrice: 1000000,
      maxVolume: 1000000,
      maxSpread: 100,
      minPrice: 0.01,
      minVolume: 1
    }
  };

  beforeEach(() => {
    mockServer = {
      emit: jest.fn()
    } as unknown as jest.Mocked<Server>;

    mockValidator = {
      validateOrder: jest.fn()
    } as unknown as jest.Mocked<OrderValidator>;

    mockSubmitter = {
      submitOrder: jest.fn(),
      cancelOrder: jest.fn(),
      modifyOrder: jest.fn()
    } as unknown as jest.Mocked<OrderSubmitter>;

    trade = new Trade(mockServer, mockConfig, mockValidator, mockSubmitter);
  });

  describe('placeOrder', () => {
    const validOrder = {
      id: 'test-order-123',
      symbol: 'AAPL',
      type: 'market',
      side: 'buy',
      quantity: 100
    };

    it('should successfully place a valid order', async () => {
      mockValidator.validateOrder.mockResolvedValue(true);
      mockSubmitter.submitOrder.mockResolvedValue({ id: 'test-order-123', status: 'filled' });

      await trade.placeOrder(validOrder);

      expect(mockValidator.validateOrder).toHaveBeenCalledWith(validOrder);
      expect(mockSubmitter.submitOrder).toHaveBeenCalledWith(validOrder);
      expect(mockServer.emit).toHaveBeenCalledWith('order_update', { id: 'test-order-123', status: 'filled' });
    });

    it('should handle validation failure', async () => {
      mockValidator.validateOrder.mockResolvedValue(false);

      await trade.placeOrder(validOrder);

      expect(mockValidator.validateOrder).toHaveBeenCalledWith(validOrder);
      expect(mockSubmitter.submitOrder).not.toHaveBeenCalled();
      expect(mockServer.emit).toHaveBeenCalledWith('order_failed', { 
        id: validOrder.id, 
        error: 'Order validation failed' 
      });
    });

    it('should handle submission failure', async () => {
      mockValidator.validateOrder.mockResolvedValue(true);
      mockSubmitter.submitOrder.mockRejectedValue(new Error('API Error'));

      await trade.placeOrder(validOrder);

      expect(mockValidator.validateOrder).toHaveBeenCalledWith(validOrder);
      expect(mockSubmitter.submitOrder).toHaveBeenCalledWith(validOrder);
      expect(mockServer.emit).toHaveBeenCalledWith('order_failed', { 
        id: validOrder.id, 
        error: 'API Error' 
      });
    });
  });

  describe('cancelOrder', () => {
    it('should successfully cancel an order', async () => {
      mockSubmitter.cancelOrder.mockResolvedValue({ id: 'order-123', status: 'cancelled' });

      await trade.cancelOrder('order-123');

      expect(mockSubmitter.cancelOrder).toHaveBeenCalledWith('order-123');
      expect(mockServer.emit).toHaveBeenCalledWith('order_update', { 
        id: 'order-123', 
        status: 'cancelled' 
      });
    });

    it('should handle cancellation failure', async () => {
      mockSubmitter.cancelOrder.mockRejectedValue(new Error('Order not found'));

      await trade.cancelOrder('order-123');

      expect(mockSubmitter.cancelOrder).toHaveBeenCalledWith('order-123');
      expect(mockServer.emit).toHaveBeenCalledWith('order_failed', { 
        id: 'order-123', 
        error: 'Order not found' 
      });
    });
  });

  describe('getTradeHistory', () => {
    it('should return trade history', () => {
      const trades = trade.getTradeHistory()
      expect(Array.isArray(trades)).toBe(true)
      expect(trades.length).toBeGreaterThan(0)
      expect(trades[0]).toHaveProperty('id')
      expect(trades[0]).toHaveProperty('symbol')
      expect(trades[0]).toHaveProperty('action')
    })
  })

  describe('getOpenOrders', () => {
    it('should return open orders', () => {
      const orders = trade.getOpenOrders()
      expect(Array.isArray(orders)).toBe(true)
      expect(orders.length).toBeGreaterThan(0)
      expect(orders[0]).toHaveProperty('id')
      expect(orders[0]).toHaveProperty('symbol')
      expect(orders[0]).toHaveProperty('status')
    })
  })

  describe('modifyOrder', () => {
    it('should modify an existing order', async () => {
      const orders = trade.getOpenOrders()
      const orderId = orders[0].id
      const updates = {
        quantity: 15,
        price: 190.50
      }

      const modifiedOrder = await trade.modifyOrder(orderId, updates)
      expect(modifiedOrder).not.toBeNull()
      expect(modifiedOrder?.quantity).toBe(updates.quantity)
      expect(modifiedOrder?.price).toBe(updates.price)
    })

    it('should return null for non-existent order', async () => {
      const modifiedOrder = await trade.modifyOrder('non-existent-id', { quantity: 10 })
      expect(modifiedOrder).toBeNull()
    })
  })
}) 