import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { ExecutorOrderState } from '../../types/executor-order';
import Logger from '../../utils/logger';
import config from '../../config';

export class OrderMonitor extends EventEmitter {
  private logger: Logger;
  private ws: WebSocket | null = null;
  private connected: boolean = false;
  private authenticated: boolean = false;
  private monitoredOrders: Set<string> = new Set();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectInterval: number = 1000;
  
  constructor() {
    super();
    this.logger = new Logger('OrderMonitor');
    this.connect();
  }
  
  /**
   * Connect to Alpaca's WebSocket
   */
  private connect(): void {
    if (this.ws) {
      this.cleanup();
    }
    
    this.logger.info('Connecting to Alpaca WebSocket...');
    this.ws = new WebSocket(config.alpaca.trading.wsUrl);
    
    this.ws.onopen = this.handleOpen.bind(this);
    this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onerror = this.handleError.bind(this);
    this.ws.onclose = this.handleClose.bind(this);
  }
  
  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    this.logger.info('WebSocket connected');
    this.connected = true;
    this.reconnectAttempts = 0;
    this.authenticate();
  }
  
  /**
   * Authenticate with Alpaca
   */
  private authenticate(): void {
    if (!this.ws || !this.connected) {
      this.logger.error('Cannot authenticate: WebSocket not connected');
      return;
    }
    
    this.logger.info('Authenticating with Alpaca...');
    
    const authMsg = JSON.stringify({
      action: 'authenticate',
      data: {
        key_id: config.alpaca.trading.key,
        secret_key: config.alpaca.trading.secret
      }
    });
    
    this.ws.send(authMsg);
  }
  
  /**
   * Subscribe to trade updates
   */
  private subscribe(): void {
    if (!this.ws || !this.connected || !this.authenticated) {
      this.logger.error('Cannot subscribe: WebSocket not ready');
      return;
    }
    
    this.logger.info('Subscribing to trade updates...');
    
    const subMsg = JSON.stringify({
      action: 'listen',
      data: {
        streams: ['trade_updates']
      }
    });
    
    this.ws.send(subMsg);
  }
  
  /**
   * Handle WebSocket messages
   */
  private handleMessage(event: WebSocket.MessageEvent): void {
    try {
      const message = JSON.parse(event.data.toString());
      
      // Handle authentication response
      if (message.stream === 'authorization') {
        if (message.data.status === 'authorized') {
          this.logger.info('Successfully authenticated with Alpaca');
          this.authenticated = true;
          this.subscribe();
        } else {
          this.logger.error('Authentication failed', message.data);
          this.authenticated = false;
        }
        return;
      }
      
      // Handle subscription confirmation
      if (message.stream === 'listening') {
        this.logger.info('Successfully subscribed to streams', message.data.streams);
        return;
      }
      
      // Handle trade updates
      if (message.stream === 'trade_updates') {
        this.handleTradeUpdate(message.data);
        return;
      }
      
    } catch (error) {
      this.logger.error('Error handling WebSocket message', error);
    }
  }
  
  /**
   * Handle trade update messages
   */
  private handleTradeUpdate(data: any): void {
    this.logger.info(`Trade update: ${data.event} for order ID ${data.order.id}`);
    
    // Check if this is an order we're monitoring
    if (this.monitoredOrders.has(data.order.id)) {
      // Emit the update
      this.emit('order_update', data);
      
      // If the order is done, stop monitoring it
      if (['filled', 'canceled', 'expired', 'rejected'].includes(data.order.status)) {
        this.logger.info(`Order ${data.order.id} completed, removing from monitored orders`);
        this.monitoredOrders.delete(data.order.id);
      }
    }
  }
  
  /**
   * Handle WebSocket errors
   */
  private handleError(error: any): void {
    this.logger.error('WebSocket error', error);
    this.connected = false;
    this.authenticated = false;
  }
  
  /**
   * Handle WebSocket close event
   */
  private handleClose(): void {
    this.logger.info('WebSocket closed');
    this.connected = false;
    this.authenticated = false;
    
    // Attempt to reconnect
    this.reconnect();
  }
  
  /**
   * Attempt to reconnect to WebSocket
   */
  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnect attempts reached, giving up');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);
    
    this.logger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  /**
   * Cleanup WebSocket connection
   */
  private cleanup(): void {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      
      if (this.connected) {
        try {
          this.ws.close();
        } catch (error) {
          this.logger.error('Error closing WebSocket', error);
        }
      }
      
      this.ws = null;
    }
    
    this.connected = false;
    this.authenticated = false;
  }
  
  /**
   * Start monitoring an order
   */
  public monitorOrder(order: ExecutorOrderState): void {
    if (!order.alpaca_order_id) {
      this.logger.error(`Cannot monitor order ${order.id}: no Alpaca order ID`);
      return;
    }
    
    this.logger.info(`Monitoring order ${order.id} (Alpaca ID: ${order.alpaca_order_id})`);
    this.monitoredOrders.add(order.alpaca_order_id);
  }
  
  /**
   * Stop monitoring an order
   */
  public stopMonitoring(alpacaOrderId: string): void {
    this.logger.info(`Stopping monitoring for order ${alpacaOrderId}`);
    this.monitoredOrders.delete(alpacaOrderId);
  }
  
  /**
   * Cleanup and close monitor
   */
  public close(): void {
    this.cleanup();
    this.monitoredOrders.clear();
  }
} 