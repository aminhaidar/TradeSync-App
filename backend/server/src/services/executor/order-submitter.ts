import axios from 'axios';
import { EventEmitter } from 'events';
import { ExecutorOrderRequest } from '../../types/executor-order';
import Logger from '../../utils/logger';
import config from '../../config';
import { v4 as uuidv4 } from 'uuid';

export class OrderSubmitter extends EventEmitter {
  private logger: Logger;

  constructor() {
    super();
    this.logger = new Logger('OrderSubmitter');
  }

  /**
   * Submit an order to Alpaca
   */
  public async submitOrder(orderId: string, orderRequest: ExecutorOrderRequest): Promise<void> {
    try {
      // Prepare the order payload
      const orderPayload = this.prepareAlpacaOrder(orderRequest);
      
      // Submit the order to Alpaca
      const response = await axios.post(`${config.alpaca.trading.url}/v2/orders`, orderPayload, {
        headers: {
          'APCA-API-KEY-ID': config.alpaca.trading.key,
          'APCA-API-SECRET-KEY': config.alpaca.trading.secret
        }
      });
      
      // Log success
      this.logger.info(`Order ${orderId} submitted successfully to Alpaca: ${response.data.id}`);
      
      // Emit event
      this.emit('order_submitted', orderId, response.data);
      
    } catch (error: unknown) {
      let errorMessage = 'Unknown error';
      
      if (axios.isAxiosError(error)) {
        if (error.response?.data) {
          errorMessage = error.response.data.message || JSON.stringify(error.response.data);
          
          // If the error is due to duplicate client_order_id, modify the order and retry
          if (errorMessage.includes('client_order_id must be unique')) {
            const timestamp = Date.now();
            const newClientOrderId = `ts_${timestamp}_${uuidv4()}`;
            orderRequest.client_order_id = newClientOrderId;
            
            // Retry with new client order ID
            return this.submitOrder(orderId, orderRequest);
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Log error
      this.logger.error(`Failed to submit order ${orderId} to Alpaca: ${errorMessage}`);
      
      // Emit event
      this.emit('order_failed', orderId, new Error(errorMessage));
      
      throw new Error(`Failed to submit order: ${errorMessage}`);
    }
  }

  /**
   * Cancel an order in Alpaca
   */
  public async cancelOrder(orderId: string): Promise<boolean> {
    try {
      // Cancel the order in Alpaca
      await axios.delete(`${config.alpaca.trading.url}/v2/orders/${orderId}`, {
        headers: {
          'APCA-API-KEY-ID': config.alpaca.trading.key,
          'APCA-API-SECRET-KEY': config.alpaca.trading.secret
        }
      });
      
      // Log success
      this.logger.info(`Order ${orderId} cancelled successfully in Alpaca`);
      
      return true;
      
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          // Order not found
          this.logger.warn(`Order ${orderId} not found in Alpaca`);
          return false;
        }
      }
      
      // Log error
      this.logger.error(`Failed to cancel order ${orderId} in Alpaca:`, error);
      
      throw new Error('Failed to cancel order');
    }
  }

  /**
   * Prepare the order payload for Alpaca
   */
  private prepareAlpacaOrder(orderRequest: ExecutorOrderRequest): any {
    // Start with the basic order parameters
    const alpacaOrder: any = {
      symbol: orderRequest.symbol,
      side: orderRequest.side,
      type: orderRequest.type,
      time_in_force: orderRequest.time_in_force,
      client_order_id: orderRequest.client_order_id
    };
    
    // Add quantity or notional amount
    if (orderRequest.qty) {
      alpacaOrder.qty = orderRequest.qty.toString();
    } else if (orderRequest.notional) {
      alpacaOrder.notional = orderRequest.notional.toString();
    }
    
    // Add limit price if provided
    if (orderRequest.limit_price) {
      alpacaOrder.limit_price = orderRequest.limit_price.toString();
    }
    
    // Add stop price if provided
    if (orderRequest.stop_price) {
      alpacaOrder.stop_price = orderRequest.stop_price.toString();
    }
    
    // Add extended hours flag if provided
    if (orderRequest.extended_hours) {
      alpacaOrder.extended_hours = orderRequest.extended_hours;
    }
    
    // Add order class and related parameters
    if (orderRequest.order_class) {
      alpacaOrder.order_class = orderRequest.order_class;
      
      // Add take profit if provided
      if (orderRequest.take_profit) {
        alpacaOrder.take_profit = {
          limit_price: orderRequest.take_profit.limit_price.toString()
        };
      }
      
      // Add stop loss if provided
      if (orderRequest.stop_loss) {
        alpacaOrder.stop_loss = {
          stop_price: orderRequest.stop_loss.stop_price.toString()
        };
        
        if (orderRequest.stop_loss.limit_price) {
          alpacaOrder.stop_loss.limit_price = orderRequest.stop_loss.limit_price.toString();
        }
      }
    }
    
    return alpacaOrder;
  }
} 