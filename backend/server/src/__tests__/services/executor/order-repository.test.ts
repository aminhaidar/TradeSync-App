import { OrderRepository } from '../../../services/executor/order-repository';
import { ExecutorOrderState, OrderExecutionStatus } from '../../../types/executor-order';
import fs from 'fs';
import path from 'path';

jest.mock('fs');

describe('OrderRepository', () => {
  let repository: OrderRepository;
  const mockOrder: ExecutorOrderState = {
    id: 'test-order-123',
    client_order_id: 'client-123',
    request: {
      symbol: 'AAPL',
      qty: 10,
      side: 'buy',
      type: 'market',
      time_in_force: 'day'
    },
    status: 'pending' as OrderExecutionStatus,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    execution_attempts: 0
  };

  beforeEach(() => {
    repository = new OrderRepository();
    jest.clearAllMocks();
  });

  describe('saveOrder', () => {
    it('should save a new order', async () => {
      await repository.saveOrder(mockOrder);

      const savedOrder = await repository.getOrderById(mockOrder.id);
      expect(savedOrder).toEqual(mockOrder);
    });

    it('should update an existing order', async () => {
      // Save initial order
      await repository.saveOrder(mockOrder);

      // Update order
      const updatedOrder = {
        ...mockOrder,
        status: 'submitted' as OrderExecutionStatus,
        alpaca_order_id: 'alpaca-123'
      };
      await repository.updateOrder(updatedOrder);

      const savedOrder = await repository.getOrderById(mockOrder.id);
      expect(savedOrder).toEqual(updatedOrder);
    });
  });

  describe('getOrderById', () => {
    it('should return null for non-existent order', async () => {
      const order = await repository.getOrderById('non-existent');
      expect(order).toBeNull();
    });

    it('should return the correct order', async () => {
      await repository.saveOrder(mockOrder);
      const order = await repository.getOrderById(mockOrder.id);
      expect(order).toEqual(mockOrder);
    });
  });

  describe('getOrderByAlpacaOrderId', () => {
    it('should return null for non-existent order', async () => {
      const order = await repository.getOrderByAlpacaOrderId('non-existent');
      expect(order).toBeNull();
    });

    it('should return the correct order', async () => {
      const orderWithAlpacaId = {
        ...mockOrder,
        alpaca_order_id: 'alpaca-123'
      };
      await repository.saveOrder(orderWithAlpacaId);
      const order = await repository.getOrderByAlpacaOrderId('alpaca-123');
      expect(order).toEqual(orderWithAlpacaId);
    });
  });

  describe('getOrdersByStatus', () => {
    it('should return empty array for non-existent status', async () => {
      const orders = await repository.getOrdersByStatus('non-existent' as OrderExecutionStatus);
      expect(orders).toEqual([]);
    });

    it('should return orders with matching status', async () => {
      const pendingOrder = mockOrder;
      const submittedOrder = {
        ...mockOrder,
        id: 'test-order-456',
        status: 'submitted' as OrderExecutionStatus
      };

      await repository.saveOrder(pendingOrder);
      await repository.saveOrder(submittedOrder);

      const pendingOrders = await repository.getOrdersByStatus('pending');
      expect(pendingOrders).toHaveLength(1);
      expect(pendingOrders[0]).toEqual(pendingOrder);

      const submittedOrders = await repository.getOrdersByStatus('submitted');
      expect(submittedOrders).toHaveLength(1);
      expect(submittedOrders[0]).toEqual(submittedOrder);
    });
  });

  describe('getAllOrders', () => {
    it('should return all orders', async () => {
      const order1 = mockOrder;
      const order2 = {
        ...mockOrder,
        id: 'test-order-456'
      };

      await repository.saveOrder(order1);
      await repository.saveOrder(order2);

      const orders = await repository.getAllOrders();
      expect(orders).toHaveLength(2);
      expect(orders).toContainEqual(order1);
      expect(orders).toContainEqual(order2);
    });
  });

  describe('deleteOrder', () => {
    it('should return false for non-existent order', async () => {
      const result = await repository.deleteOrder('non-existent');
      expect(result).toBe(false);
    });

    it('should delete an existing order', async () => {
      await repository.saveOrder(mockOrder);
      const result = await repository.deleteOrder(mockOrder.id);
      expect(result).toBe(true);

      const order = await repository.getOrderById(mockOrder.id);
      expect(order).toBeNull();
    });
  });

  describe('persistence', () => {
    it('should load orders from file on initialization', async () => {
      const mockOrders = [mockOrder];
      const mockData = JSON.stringify(mockOrders);

      // Mock fs.existsSync to return true
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      // Mock fs.readFileSync to return mock data
      (fs.readFileSync as jest.Mock).mockReturnValue(mockData);

      // Create new repository instance
      const newRepository = new OrderRepository();

      const orders = await newRepository.getAllOrders();
      expect(orders).toEqual(mockOrders);
    });

    it('should save orders to file', async () => {
      await repository.saveOrder(mockOrder);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('orders.json'),
        expect.stringContaining(mockOrder.id),
        'utf8'
      );
    });
  });
}); 