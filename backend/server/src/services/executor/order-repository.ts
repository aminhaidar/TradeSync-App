import { ExecutorOrderState, OrderExecutionStatus } from '../../types/executor-order';
import Logger from '../../utils/logger';
import fs from 'fs';
import path from 'path';

/**
 * Simple file-based repository
 * In a production environment, this would use a database
 */
export class OrderRepository {
  private logger: Logger;
  private dataDir: string;
  private ordersFile: string;
  private orders: Map<string, ExecutorOrderState> = new Map();
  private alpacaOrderMap: Map<string, string> = new Map(); // Alpaca Order ID -> Order ID
  
  constructor() {
    this.logger = new Logger('OrderRepository');
    this.dataDir = path.join(process.cwd(), 'data');
    this.ordersFile = path.join(this.dataDir, 'orders.json');
    
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    // Load existing orders
    this.loadOrders();
  }
  
  /**
   * Load orders from file
   */
  private loadOrders(): void {
    try {
      if (fs.existsSync(this.ordersFile)) {
        const data = fs.readFileSync(this.ordersFile, 'utf8');
        const orders = JSON.parse(data) as ExecutorOrderState[];
        
        this.orders.clear();
        this.alpacaOrderMap.clear();
        
        for (const order of orders) {
          this.orders.set(order.id, order);
          
          if (order.alpaca_order_id) {
            this.alpacaOrderMap.set(order.alpaca_order_id, order.id);
          }
        }
        
        this.logger.info(`Loaded ${this.orders.size} orders from storage`);
      }
    } catch (error) {
      this.logger.error('Error loading orders', error);
    }
  }
  
  /**
   * Save orders to file
   */
  private saveOrders(): void {
    try {
      const orders = Array.from(this.orders.values());
      fs.writeFileSync(this.ordersFile, JSON.stringify(orders, null, 2), 'utf8');
    } catch (error) {
      this.logger.error('Error saving orders', error);
    }
  }
  
  /**
   * Save a new order
   */
  public async saveOrder(order: ExecutorOrderState): Promise<void> {
    this.orders.set(order.id, order);
    
    if (order.alpaca_order_id) {
      this.alpacaOrderMap.set(order.alpaca_order_id, order.id);
    }
    
    this.saveOrders();
  }
  
  /**
   * Update an existing order
   */
  public async updateOrder(order: ExecutorOrderState): Promise<void> {
    // Check if order exists
    if (!this.orders.has(order.id)) {
      throw new Error(`Order not found: ${order.id}`);
    }
    
    // Update the alpaca order mapping if needed
    const existingOrder = this.orders.get(order.id);
    if (existingOrder?.alpaca_order_id && existingOrder.alpaca_order_id !== order.alpaca_order_id) {
      // Remove old mapping
      this.alpacaOrderMap.delete(existingOrder.alpaca_order_id);
    }
    
    if (order.alpaca_order_id) {
      this.alpacaOrderMap.set(order.alpaca_order_id, order.id);
    }
    
    // Update the order
    this.orders.set(order.id, order);
    
    this.saveOrders();
  }
  
  /**
   * Get an order by ID
   */
  public async getOrderById(orderId: string): Promise<ExecutorOrderState | null> {
    return this.orders.get(orderId) || null;
  }
  
  /**
   * Get an order by Alpaca order ID
   */
  public async getOrderByAlpacaOrderId(alpacaOrderId: string): Promise<ExecutorOrderState | null> {
    const orderId = this.alpacaOrderMap.get(alpacaOrderId);
    
    if (!orderId) {
      return null;
    }
    
    return this.getOrderById(orderId);
  }
  
  /**
   * Get orders by status
   */
  public async getOrdersByStatus(status: OrderExecutionStatus): Promise<ExecutorOrderState[]> {
    return Array.from(this.orders.values())
      .filter(order => order.status === status);
  }
  
  /**
   * Get all orders
   */
  public async getAllOrders(): Promise<ExecutorOrderState[]> {
    return Array.from(this.orders.values());
  }
  
  /**
   * Delete an order
   */
  public async deleteOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    
    if (!order) {
      return false;
    }
    
    // Remove from alpaca order map if needed
    if (order.alpaca_order_id) {
      this.alpacaOrderMap.delete(order.alpaca_order_id);
    }
    
    // Remove the order
    this.orders.delete(orderId);
    
    this.saveOrders();
    return true;
  }
} 