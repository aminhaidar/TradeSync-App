import { Order } from '../services/trade';

/**
 * Interface for exchange API interactions
 */
export interface ExchangeAPI {
  /**
   * Places a new order on the exchange
   * @param order Order details to place
   * @returns Promise resolving to the order id
   */
  placeOrder(order: Order): Promise<string>;

  /**
   * Cancels an existing order
   * @param orderId ID of the order to cancel
   * @returns Promise resolving to true if successful
   */
  cancelOrder(orderId: string): Promise<void>;

  /**
   * Modifies an existing order
   * @param orderId ID of the order to modify
   * @param updates Partial order object with fields to update
   * @returns Promise resolving to true if successful
   */
  modifyOrder(orderId: string, updates: Partial<Order>): Promise<void>;

  /**
   * Gets the current status of an order
   * @param orderId ID of the order to check
   * @returns Promise resolving to the order status
   */
  getOrderStatus(orderId: string): Promise<string>;

  /**
   * Gets all open orders
   * @returns Promise resolving to array of order objects
   */
  getOpenOrders(): Promise<Order[]>;
} 