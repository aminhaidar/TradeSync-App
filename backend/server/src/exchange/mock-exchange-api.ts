import { Order, OrderStatus } from '../services/trade';
import { ExchangeAPI } from './exchange-api';
import Logger from '../utils/logger';

/**
 * Mock implementation of ExchangeAPI for testing and development
 */
export class MockExchangeAPI implements ExchangeAPI {
  private logger: Logger;
  private orders: Map<string, Order> = new Map();
  private orderIdCounter = 1;

  constructor() {
    this.logger = new Logger('MockExchangeAPI');
  }

  /**
   * Places a new order on the mock exchange
   * @param order Order details to place
   * @returns Promise resolving to the order id
   */
  async placeOrder(order: Order): Promise<string> {
    const orderId = `mock-${this.orderIdCounter++}`;
    this.logger.info('Mock placing order:', { order, orderId });
    
    const fullOrder = {
      ...order,
      id: orderId,
      status: OrderStatus.OPEN,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.orders.set(orderId, fullOrder as Order);
    return orderId;
  }

  /**
   * Cancels an existing order
   * @param orderId ID of the order to cancel
   */
  async cancelOrder(orderId: string): Promise<void> {
    this.logger.info('Mock canceling order:', { orderId });
    
    if (this.orders.has(orderId)) {
      const order = this.orders.get(orderId);
      if (order) {
        order.status = OrderStatus.CANCELLED;
        order.updatedAt = new Date();
        this.orders.set(orderId, order);
      }
    } else {
      this.logger.warn('Order not found for cancellation:', { orderId });
    }
    
    return;
  }

  /**
   * Modifies an existing order
   * @param orderId ID of the order to modify
   * @param updates Partial order object with fields to update
   */
  async modifyOrder(orderId: string, updates: Partial<Order>): Promise<void> {
    this.logger.info('Mock modifying order:', { orderId, updates });
    
    if (this.orders.has(orderId)) {
      const order = this.orders.get(orderId);
      if (order) {
        const updatedOrder = { ...order, ...updates, updatedAt: new Date() };
        this.orders.set(orderId, updatedOrder);
      }
    } else {
      this.logger.warn('Order not found for modification:', { orderId });
    }
    
    return;
  }

  /**
   * Gets the current status of an order
   * @param orderId ID of the order to check
   * @returns Promise resolving to the order status
   */
  async getOrderStatus(orderId: string): Promise<string> {
    this.logger.info('Mock getting order status:', { orderId });
    
    if (this.orders.has(orderId)) {
      const order = this.orders.get(orderId);
      return order?.status || 'UNKNOWN';
    }
    
    return 'NOT_FOUND';
  }

  /**
   * Gets all open orders
   * @returns Promise resolving to array of order objects
   */
  async getOpenOrders(): Promise<Order[]> {
    this.logger.info('Mock getting open orders');
    
    const openOrders: Order[] = [];
    this.orders.forEach(order => {
      if (order.status === 'OPEN') {
        openOrders.push(order);
      }
    });
    
    return openOrders;
  }
} 