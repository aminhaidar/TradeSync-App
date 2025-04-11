import { Server } from 'socket.io'
import Logger from '../utils/logger'
import { OrderValidator } from './order-validator'
import { OrderSubmitter } from './order-submitter'
import config from '../config'
import { Config } from '../types/config'

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP = 'STOP',
  STOP_LIMIT = 'STOP_LIMIT'
}

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum TimeInForce {
  GTC = 'GTC', // Good Till Cancelled
  IOC = 'IOC', // Immediate or Cancel
  FOK = 'FOK'  // Fill or Kill
}

export enum OrderStatus {
  PENDING = 'PENDING',
  OPEN = 'OPEN',
  FILLED = 'FILLED',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

export interface Order {
  id?: string;
  symbol: string;
  type: OrderType;
  side: OrderSide;
  quantity: number;
  price?: number;       // Required for LIMIT orders
  stopPrice?: number;   // Required for STOP and STOP_LIMIT orders
  timeInForce: TimeInForce;
  clientOrderId?: string;
  status?: OrderStatus;
  filledQuantity?: number;
  averagePrice?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Trade {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: OrderSide;
  timestamp: Date;
}

export class TradeService {
  private trades: Trade[] = [];
  private orders: Order[] = [];
  private logger: Logger;
  private io: Server | null = null;
  private readonly isTestMode: boolean;
  private readonly validator: OrderValidator;
  private readonly submitter: OrderSubmitter;
  private readonly config: Config;

  constructor(
    io?: Server,
    validator?: OrderValidator,
    submitter?: OrderSubmitter,
    conf?: Config
  ) {
    this.logger = new Logger('TradeService');
    this.io = io || null;
    this.isTestMode = process.env.NODE_ENV === 'test';
    this.validator = validator || new OrderValidator();
    this.submitter = submitter || new OrderSubmitter();
    this.config = conf || config;
    
    this.loadInitialTrades();
  }

  private loadInitialTrades() {
    if (this.isTestMode) {
      this.logger.info('Loading test trades and orders');
      // Add some test data
      this.trades = [
        {
          id: 'test-trade-1',
          symbol: 'AAPL',
          price: 150.25,
          quantity: 10,
          side: OrderSide.BUY,
          timestamp: new Date()
        },
        {
          id: 'test-trade-2',
          symbol: 'MSFT',
          price: 325.75,
          quantity: 5,
          side: OrderSide.SELL,
          timestamp: new Date()
        }
      ];
      
      this.orders = [
        {
          id: 'test-order-1',
          symbol: 'AAPL',
          type: OrderType.LIMIT,
          side: OrderSide.BUY,
          quantity: 10,
          price: 150.00,
          timeInForce: TimeInForce.GTC,
          status: OrderStatus.OPEN
        },
        {
          id: 'test-order-2',
          symbol: 'MSFT',
          type: OrderType.MARKET,
          side: OrderSide.SELL,
          quantity: 5,
          timeInForce: TimeInForce.IOC,
          status: OrderStatus.FILLED
        }
      ];
    } else {
      this.logger.info('Will fetch trades and orders from API in a real implementation');
    }
  }

  public getTradeHistory(): Trade[] {
    return this.trades;
  }

  public getOpenOrders(): Order[] {
    return this.orders;
  }

  public async placeOrder(order: Order): Promise<boolean> {
    try {
      const isValid = await this.validator.validateOrder(order);
      if (!isValid) {
        this.io?.emit('order_failed', { 
          id: order.id, 
          error: 'Order validation failed' 
        });
        return false;
      }

      const result = await this.submitter.submitOrder(order);
      this.io?.emit('order_update', result);
      return true;
    } catch (error) {
      this.io?.emit('order_failed', { 
        id: order.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  public async cancelOrder(orderId: string): Promise<boolean> {
    try {
      await this.submitter.cancelOrder(orderId);
      this.io?.emit('order_update', { id: orderId, status: OrderStatus.CANCELLED });
      return true;
    } catch (error) {
      this.io?.emit('order_failed', { 
        id: orderId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  public async modifyOrder(orderId: string, updates: Partial<Order>): Promise<Order | null> {
    try {
      const order = this.orders.find(o => o.id === orderId);
      if (!order) return null;

      const updatedOrder = { ...order, ...updates };
      await this.submitter.modifyOrder(orderId, updatedOrder);
      this.io?.emit('order_update', updatedOrder);
      return updatedOrder;
    } catch (error) {
      return null;
    }
  }

  public setIo(io: Server) {
    this.logger.info('Setting Socket.IO server instance');
    this.io = io;
    // Notify clients of current data when a new socket connects
    this.notifyClients();
  }

  private notifyClients() {
    if (this.io) {
      this.logger.info('Emitting trade update to all clients');
      this.io.emit('trade_update', {
        trades: this.trades,
        orders: this.orders
      });
    } else {
      this.logger.warn('Socket.IO server instance not available');
    }
  }
} 