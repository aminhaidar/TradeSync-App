import { OrderValidator } from '../../../services/executor/order-validator';
import { ExecutorOrderRequest } from '../../../types/executor-order';
import axios from 'axios';

jest.mock('axios');

describe('OrderValidator', () => {
  let validator: OrderValidator;
  const mockAccountInfo = {
    buying_power: '100000.00',
    cash: '50000.00',
    equity: '75000.00'
  };
  
  const mockQuote = {
    quote: {
      ap: 100.00, // ask price
      bp: 99.50,  // bid price
      t: new Date().toISOString()
    }
  };

  beforeEach(() => {
    validator = new OrderValidator();
    
    // Mock axios responses
    (axios.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/v2/account')) {
        return Promise.resolve({ data: mockAccountInfo });
      } else if (url.includes('/v2/stocks/')) {
        return Promise.resolve({ data: mockQuote });
      }
      return Promise.reject(new Error('Unexpected API call'));
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateOrder', () => {
    it('should validate a valid market order', async () => {
      const order: ExecutorOrderRequest = {
        symbol: 'AAPL',
        qty: 10,
        side: 'buy',
        type: 'market',
        time_in_force: 'day'
      };

      const result = await validator.validateOrder(order);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject an order with missing required fields', async () => {
      const order: Partial<ExecutorOrderRequest> = {
        symbol: 'AAPL',
        side: 'buy'
      };

      const result = await validator.validateOrder(order as ExecutorOrderRequest);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Order type is required');
      expect(result.errors).toContain('Time in force is required');
    });

    it('should reject an order with both qty and notional', async () => {
      const order: ExecutorOrderRequest = {
        symbol: 'AAPL',
        qty: 10,
        notional: 1000,
        side: 'buy',
        type: 'market',
        time_in_force: 'day'
      };

      const result = await validator.validateOrder(order);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Either qty or notional must be provided, but not both');
    });

    it('should reject a limit order without limit price', async () => {
      const order: ExecutorOrderRequest = {
        symbol: 'AAPL',
        qty: 10,
        side: 'buy',
        type: 'limit',
        time_in_force: 'day'
      };

      const result = await validator.validateOrder(order);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Limit price is required for limit orders');
    });

    it('should reject a buy order with insufficient buying power', async () => {
      const order: ExecutorOrderRequest = {
        symbol: 'AAPL',
        qty: 1000, // Would cost $100,000 at current price
        side: 'buy',
        type: 'market',
        time_in_force: 'day'
      };

      const result = await validator.validateOrder(order);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Insufficient buying power');
    });

    it('should validate a bracket order with all required parameters', async () => {
      const order: ExecutorOrderRequest = {
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

      const result = await validator.validateOrder(order);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject a bracket order with missing take profit or stop loss', async () => {
      const order: ExecutorOrderRequest = {
        symbol: 'AAPL',
        qty: 10,
        side: 'buy',
        type: 'market',
        time_in_force: 'day',
        order_class: 'bracket',
        take_profit: {
          limit_price: 110
        }
      };

      const result = await validator.validateOrder(order);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Stop loss stop price is required for bracket orders');
    });
  });
}); 