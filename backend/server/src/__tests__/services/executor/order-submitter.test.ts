import { OrderSubmitter } from '../../../services/executor/order-submitter';
import { ExecutorOrderRequest } from '../../../types/executor-order';
import axios from 'axios';

jest.mock('axios');

describe('OrderSubmitter', () => {
  let submitter: OrderSubmitter;
  const mockOrderResponse = {
    id: 'order-123',
    client_order_id: 'client-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    submitted_at: new Date().toISOString(),
    filled_at: null,
    asset_id: 'asset-123',
    symbol: 'AAPL',
    asset_class: 'us_equity',
    qty: '10',
    filled_qty: '0',
    order_class: 'simple',
    order_type: 'market',
    type: 'market',
    side: 'buy',
    time_in_force: 'day',
    status: 'new',
    extended_hours: false
  };

  beforeEach(() => {
    submitter = new OrderSubmitter();
    (axios.post as jest.Mock).mockResolvedValue({ data: mockOrderResponse });
    (axios.delete as jest.Mock).mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitOrder', () => {
    it('should submit a market order successfully', async () => {
      const orderRequest: ExecutorOrderRequest = {
        symbol: 'AAPL',
        qty: 10,
        side: 'buy',
        type: 'market',
        time_in_force: 'day'
      };

      const orderId = 'test-order-123';
      await submitter.submitOrder(orderId, orderRequest);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/v2/orders'),
        expect.objectContaining({
          symbol: 'AAPL',
          qty: '10',
          side: 'buy',
          type: 'market',
          time_in_force: 'day'
        }),
        expect.any(Object)
      );
    });

    it('should submit a limit order with limit price', async () => {
      const orderRequest: ExecutorOrderRequest = {
        symbol: 'AAPL',
        qty: 10,
        side: 'buy',
        type: 'limit',
        time_in_force: 'day',
        limit_price: 100
      };

      const orderId = 'test-order-123';
      await submitter.submitOrder(orderId, orderRequest);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/v2/orders'),
        expect.objectContaining({
          limit_price: '100'
        }),
        expect.any(Object)
      );
    });

    it('should submit a bracket order with take profit and stop loss', async () => {
      const orderRequest: ExecutorOrderRequest = {
        symbol: 'AAPL',
        qty: 10,
        side: 'buy',
        type: 'market',
        time_in_force: 'day',
        order_class: 'bracket',
        take_profit: {
          limit_price: 110
        },
        stop_loss: {
          stop_price: 90
        }
      };

      const orderId = 'test-order-123';
      await submitter.submitOrder(orderId, orderRequest);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/v2/orders'),
        expect.objectContaining({
          order_class: 'bracket',
          take_profit: {
            limit_price: '110'
          },
          stop_loss: {
            stop_price: '90'
          }
        }),
        expect.any(Object)
      );
    });

    it('should emit order_submitted event on success', async () => {
      const orderRequest: ExecutorOrderRequest = {
        symbol: 'AAPL',
        qty: 10,
        side: 'buy',
        type: 'market',
        time_in_force: 'day'
      };

      const orderId = 'test-order-123';
      const eventPromise = new Promise((resolve) => {
        submitter.once('order_submitted', (id, response) => {
          resolve({ id, response });
        });
      });

      await submitter.submitOrder(orderId, orderRequest);
      const event = await eventPromise;

      expect(event).toEqual({
        id: orderId,
        response: mockOrderResponse
      });
    });

    it('should emit order_failed event on error', async () => {
      const orderRequest: ExecutorOrderRequest = {
        symbol: 'AAPL',
        qty: 10,
        side: 'buy',
        type: 'market',
        time_in_force: 'day'
      };

      const orderId = 'test-order-123';
      const error = new Error('API Error');
      (axios.post as jest.Mock).mockRejectedValue(error);

      const eventPromise = new Promise((resolve) => {
        submitter.once('order_failed', (id, error) => {
          resolve({ id, error });
        });
      });

      await submitter.submitOrder(orderId, orderRequest);
      const event = await eventPromise;

      expect(event).toEqual({
        id: orderId,
        error: { message: 'API Error' }
      });
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an order successfully', async () => {
      const alpacaOrderId = 'order-123';
      await submitter.cancelOrder(alpacaOrderId);

      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining(`/v2/orders/${alpacaOrderId}`),
        expect.any(Object)
      );
    });

    it('should handle 404 error when order not found', async () => {
      const alpacaOrderId = 'order-123';
      const error = {
        response: {
          status: 404
        }
      };
      (axios.delete as jest.Mock).mockRejectedValue(error);

      await expect(submitter.cancelOrder(alpacaOrderId)).resolves.not.toThrow();
    });

    it('should throw error for other API errors', async () => {
      const alpacaOrderId = 'order-123';
      const error = new Error('API Error');
      (axios.delete as jest.Mock).mockRejectedValue(error);

      await expect(submitter.cancelOrder(alpacaOrderId)).rejects.toThrow('API Error');
    });
  });
}); 