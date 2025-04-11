import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { ExecutorOrderRequest, ExecutorOrderState, OrderExecutionStatus } from '../../types/executor-order';
import { OrderValidator } from './order-validator';
import { OrderSubmitter } from './order-submitter';
import { OrderMonitor } from './order-monitor';
import { OrderRepository } from './order-repository';
import Logger from '../../utils/logger';

export class ExecutorService extends EventEmitter {
  private validator: OrderValidator;
  private submitter: OrderSubmitter;
  private monitor: OrderMonitor;
  private repository: OrderRepository;
  private logger: Logger;
  private processingQueue: boolean = false;
  private orderQueue: ExecutorOrderState[] = [];

  constructor() {
    super();
    this.validator = new OrderValidator();
    this.submitter = new OrderSubmitter();
    this.monitor = new OrderMonitor();
    this.repository = new OrderRepository();
    this.logger = new Logger('ExecutorService');
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Start processing queue
    setInterval(() => this.processQueue(), 1000);
  }

  private setupEventListeners(): void {
    // Handle monitor events
    this.monitor.on('order_update', (update) => {
      this.handleOrderUpdate(update);
    });
    
    // Handle submitter events
    this.submitter.on('order_submitted', (orderId, response) => {
      this.handleOrderSubmitted(orderId, response);
    });
    
    this.submitter.on('order_failed', (orderId, error) => {
      this.handleOrderFailed(orderId, error);
    });
  }

  /**
   * Submit a new order request to the executor
   */
  public async submitOrder(orderRequest: ExecutorOrderRequest): Promise<ExecutorOrderState> {
    // Generate a unique ID if not provided
    const timestamp = Date.now();
    const clientOrderId = orderRequest.client_order_id || `ts_${timestamp}_${uuidv4()}`;
    
    // Create the initial order state
    const orderState: ExecutorOrderState = {
      id: uuidv4(),
      client_order_id: clientOrderId,
      request: {
        ...orderRequest,
        client_order_id: clientOrderId
      },
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      execution_attempts: 0
    };
    
    // Log the order request
    this.logger.info(`New order request: ${orderState.id} for ${orderRequest.symbol}`);
    
    // Store the order state
    await this.repository.saveOrder(orderState);
    
    // Add to queue
    this.orderQueue.push(orderState);
    
    // Emit event
    this.emit('order_queued', orderState);
    
    return orderState;
  }

  /**
   * Process the order queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.orderQueue.length === 0) {
      return;
    }
    
    this.processingQueue = true;
    
    try {
      const order = this.orderQueue.shift();
      if (order) {
        await this.processOrder(order);
      }
    } catch (error) {
      this.logger.error('Error processing queue', error);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Process a single order
   */
  private async processOrder(order: ExecutorOrderState): Promise<void> {
    try {
      // Update the order status
      order.status = 'validating';
      order.updated_at = new Date().toISOString();
      await this.repository.updateOrder(order);
      
      // Validate the order
      const validationResult = await this.validator.validateOrder(order.request);
      
      if (!validationResult.valid) {
        // Order failed validation
        order.status = 'failed';
        order.last_error = `Validation failed: ${validationResult.errors.join(', ')}`;
        order.updated_at = new Date().toISOString();
        await this.repository.updateOrder(order);
        
        this.emit('order_failed', order, order.last_error);
        return;
      }
      
      // Update order status to submitting
      order.status = 'submitting';
      order.execution_attempts += 1;
      order.updated_at = new Date().toISOString();
      await this.repository.updateOrder(order);
      
      // Submit the order to Alpaca
      await this.submitter.submitOrder(order.id, order.request);
      
    } catch (error: unknown) {
      this.logger.error(`Error processing order ${order.id}`, error);
      
      // Update order status
      order.status = 'failed';
      order.last_error = error instanceof Error ? error.message : 'Unknown error';
      order.updated_at = new Date().toISOString();
      await this.repository.updateOrder(order);
      
      this.emit('order_failed', order, order.last_error);
    }
  }

  /**
   * Handle order submitted event
   */
  private async handleOrderSubmitted(orderId: string, response: any): Promise<void> {
    try {
      // Get the order
      const order = await this.repository.getOrderById(orderId);
      if (!order) {
        this.logger.error(`Order not found: ${orderId}`);
        return;
      }
      
      // Update order status
      order.status = 'monitoring';
      order.alpaca_order_id = response.id;
      order.order_response = response;
      order.updated_at = new Date().toISOString();
      await this.repository.updateOrder(order);
      
      // Start monitoring the order
      this.monitor.monitorOrder(order);
      
      // Emit event
      this.emit('order_submitted', order, response);
    } catch (error) {
      this.logger.error(`Error handling order submitted for ${orderId}`, error);
    }
  }

  /**
   * Handle order failed event
   */
  private async handleOrderFailed(orderId: string, error: any): Promise<void> {
    try {
      // Get the order
      const order = await this.repository.getOrderById(orderId);
      if (!order) {
        this.logger.error(`Order not found: ${orderId}`);
        return;
      }
      
      // Check if we should retry
      if (order.execution_attempts < 3) {
        // Update for retry
        order.status = 'retrying';
        order.last_error = error.message || 'Unknown error';
        order.updated_at = new Date().toISOString();
        await this.repository.updateOrder(order);
        
        // Add back to queue
        this.orderQueue.push(order);
        
        this.logger.info(`Retrying order ${orderId}, attempt ${order.execution_attempts + 1}`);
      } else {
        // Max retries reached
        order.status = 'failed';
        order.last_error = error.message || 'Unknown error';
        order.updated_at = new Date().toISOString();
        await this.repository.updateOrder(order);
        
        this.emit('order_failed', order, order.last_error);
      }
    } catch (error) {
      this.logger.error(`Error handling order failed for ${orderId}`, error);
    }
  }

  /**
   * Handle order update from monitor
   */
  private async handleOrderUpdate(update: any): Promise<void> {
    try {
      const alpacaOrderId = update.order.id;
      
      // Find the order by Alpaca order ID
      const order = await this.repository.getOrderByAlpacaOrderId(alpacaOrderId);
      if (!order) {
        this.logger.error(`Order not found for Alpaca order ID: ${alpacaOrderId}`);
        return;
      }
      
      // Update the order response
      order.order_response = update.order;
      order.updated_at = new Date().toISOString();
      
      // Check if the order is completed
      if (['filled', 'canceled', 'expired', 'rejected'].includes(update.order.status)) {
        order.status = 'completed';
      }
      
      await this.repository.updateOrder(order);
      
      // Emit event
      this.emit('order_updated', order, update);
    } catch (error) {
      this.logger.error(`Error handling order update`, error);
    }
  }

  /**
   * Cancel an order
   */
  public async cancelOrder(orderId: string): Promise<boolean> {
    try {
      const order = await this.repository.getOrderById(orderId);
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }
      
      // Check if the order can be canceled
      if (!order.alpaca_order_id || ['completed', 'failed'].includes(order.status)) {
        throw new Error(`Order cannot be canceled (status: ${order.status})`);
      }
      
      // Cancel the order with Alpaca
      await this.submitter.cancelOrder(order.alpaca_order_id);
      
      return true;
    } catch (error) {
      this.logger.error(`Error canceling order ${orderId}`, error);
      throw error;
    }
  }

  /**
   * Get an order by ID
   */
  public async getOrder(orderId: string): Promise<ExecutorOrderState | null> {
    return this.repository.getOrderById(orderId);
  }

  /**
   * Get orders by status
   */
  public async getOrdersByStatus(status: OrderExecutionStatus): Promise<ExecutorOrderState[]> {
    return this.repository.getOrdersByStatus(status);
  }

  /**
   * Get all orders
   */
  public async getAllOrders(): Promise<ExecutorOrderState[]> {
    return this.repository.getAllOrders();
  }
} 