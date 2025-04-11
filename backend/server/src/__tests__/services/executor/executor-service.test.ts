import { ExecutorService } from '../../../services/executor/executor-service';
import { ExecutorOrderRequest, ExecutorOrderState, OrderExecutionStatus } from '../../../types/executor-order';
import { OrderValidator } from '../../../services/executor/order-validator';
import { OrderSubmitter } from '../../../services/executor/order-submitter';
import { OrderMonitor } from '../../../services/executor/order-monitor';
import { OrderRepository } from '../../../services/executor/order-repository';
import EventEmitter from 'events';

jest.mock('../../../services/executor/order-validator');
jest.mock('../../../services/executor/order-submitter');
jest.mock('../../../services/executor/order-monitor');
jest.mock('../../../services/executor/order-repository');

describe('ExecutorService', () => {
  let executor: ExecutorService;
  let mockValidator: jest.Mocked<OrderValidator>;
  let mockSubmitter: jest.Mocked<OrderSubmitter>;
  let mockMonitor: jest.Mocked<OrderMonitor>;
  let mockRepository: jest.Mocked<OrderRepository>;

  const mockOrderRequest: ExecutorOrderRequest = {
    symbol: 'AAPL',
    qty: 10,
    side: 'buy',
    type: 'market',
    time_in_force: 'day'
  };

  const mockOrderState: ExecutorOrderState = {
    id: 'test-order-123',
    client_order_id: 'client-123',
    request: mockOrderRequest,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    execution_attempts: 0
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create instances
    mockValidator = new OrderValidator() as jest.Mocked<OrderValidator>;
    mockSubmitter = new OrderSubmitter() as jest.Mocked<OrderSubmitter>;
    mockMonitor = new OrderMonitor() as jest.Mocked<OrderMonitor>;
    mockRepository = new OrderRepository() as jest.Mocked<OrderRepository>;

    // Setup spies
    jest.spyOn(mockValidator, 'validateOrder').mockResolvedValue({ valid: true, errors: [] });
    jest.spyOn(mockRepository, 'saveOrder').mockResolvedValue();
    jest.spyOn(mockRepository, 'updateOrder').mockResolvedValue();
    jest.spyOn(mockRepository, 'getOrderById').mockResolvedValue(mockOrderState);
    jest.spyOn(mockRepository, 'getOrderByAlpacaOrderId').mockResolvedValue(mockOrderState);
    jest.spyOn(mockSubmitter, 'submitOrder').mockResolvedValue();
    jest.spyOn(mockSubmitter, 'cancelOrder').mockResolvedValue(true);
    jest.spyOn(mockMonitor, 'monitorOrder').mockImplementation();

    // Create executor instance
    executor = new ExecutorService();

    // Register the mocked services
    (executor as any).validator = mockValidator;
    (executor as any).submitter = mockSubmitter;
    (executor as any).monitor = mockMonitor;
    (executor as any).repository = mockRepository;
  });

  describe('submitOrder', () => {
    it('should submit a valid order', async () => {
      const order = await executor.submitOrder(mockOrderRequest);

      expect(order).toBeDefined();
      expect(order.id).toBeDefined();
      expect(order.status).toBe('pending');
      expect(mockRepository.saveOrder).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      jest.spyOn(mockValidator, 'validateOrder').mockResolvedValueOnce({
        valid: false,
        errors: ['Invalid order']
      });

      await expect(executor.submitOrder(mockOrderRequest)).rejects.toThrow('Invalid order');
    });

    it('should emit order_queued event', async () => {
      const eventPromise = new Promise<ExecutorOrderState>((resolve) => {
        executor.once('order_queued', (order) => {
          resolve(order);
        });
      });

      await executor.submitOrder(mockOrderRequest);
      const eventOrder = await eventPromise;

      expect(eventOrder).toBeDefined();
      expect(eventOrder.id).toBeDefined();
    });
  });

  describe('processOrder', () => {
    it('should process a valid order through all stages', async () => {
      // Mock successful order submission
      const mockAlpacaResponse = {
        id: 'alpaca-123',
        status: 'new'
      };
      jest.spyOn(mockSubmitter, 'submitOrder').mockResolvedValueOnce();

      // Add order to queue
      await executor.submitOrder(mockOrderRequest);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockValidator.validateOrder).toHaveBeenCalled();
      expect(mockSubmitter.submitOrder).toHaveBeenCalled();
      expect(mockMonitor.monitorOrder).toHaveBeenCalled();
    });

    it('should handle submission failures', async () => {
      jest.spyOn(mockSubmitter, 'submitOrder').mockRejectedValueOnce(new Error('Submission failed'));

      // Add order to queue
      await executor.submitOrder(mockOrderRequest);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockRepository.updateOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          last_error: 'Submission failed'
        })
      );
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an existing order', async () => {
      const orderId = 'test-order-123';
      jest.spyOn(mockRepository, 'getOrderById').mockResolvedValueOnce({
        ...mockOrderState,
        alpaca_order_id: 'alpaca-123'
      });

      const result = await executor.cancelOrder(orderId);
      expect(result).toBe(true);
      expect(mockSubmitter.cancelOrder).toHaveBeenCalledWith('alpaca-123');
    });

    it('should handle non-existent orders', async () => {
      jest.spyOn(mockRepository, 'getOrderById').mockResolvedValueOnce(null);

      await expect(executor.cancelOrder('non-existent')).rejects.toThrow('Order not found');
    });

    it('should handle orders that cannot be canceled', async () => {
      jest.spyOn(mockRepository, 'getOrderById').mockResolvedValueOnce({
        ...mockOrderState,
        status: 'completed'
      });

      await expect(executor.cancelOrder('test-order-123')).rejects.toThrow('Order cannot be canceled');
    });
  });

  describe('getOrders', () => {
    it('should get all orders', async () => {
      const mockOrders = [mockOrderState];
      jest.spyOn(mockRepository, 'getAllOrders').mockResolvedValueOnce(mockOrders);

      const orders = await executor.getAllOrders();
      expect(orders).toEqual(mockOrders);
    });

    it('should get orders by status', async () => {
      const mockOrders = [mockOrderState];
      jest.spyOn(mockRepository, 'getOrdersByStatus').mockResolvedValueOnce(mockOrders);

      const orders = await executor.getOrdersByStatus('pending');
      expect(orders).toEqual(mockOrders);
    });

    it('should get order by ID', async () => {
      jest.spyOn(mockRepository, 'getOrderById').mockResolvedValueOnce(mockOrderState);

      const order = await executor.getOrder('test-order-123');
      expect(order).toEqual(mockOrderState);
    });
  });

  describe('event handling', () => {
    it('should handle order updates from monitor', async () => {
      const mockUpdate = {
        event: 'fill',
        order: {
          id: 'alpaca-123',
          status: 'filled'
        }
      };

      // Setup repository to return an order
      jest.spyOn(mockRepository, 'getOrderByAlpacaOrderId').mockResolvedValueOnce({
        ...mockOrderState,
        alpaca_order_id: 'alpaca-123'
      });

      // Simulate monitor event
      await (mockMonitor as EventEmitter).emit('order_update', mockUpdate);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify the order was updated
      expect(mockRepository.updateOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed'
        })
      );
    });

    it('should handle order submission events', async () => {
      const mockResponse = {
        id: 'alpaca-123',
        status: 'new'
      };

      // Setup repository to return an order
      jest.spyOn(mockRepository, 'getOrderById').mockResolvedValueOnce(mockOrderState);

      // Simulate submission event
      await (mockSubmitter as EventEmitter).emit('order_submitted', 'test-order-123', mockResponse);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify the order was updated
      expect(mockRepository.updateOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'monitoring',
          alpaca_order_id: 'alpaca-123'
        })
      );
    });
  });
}); 