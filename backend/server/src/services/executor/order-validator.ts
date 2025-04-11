import axios from 'axios';
import { ExecutorOrderRequest } from '../../types/executor-order';
import Logger from '../../utils/logger';
import config from '../../config';

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class OrderValidator {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('OrderValidator');
  }

  /**
   * Validate order parameters before submission
   */
  public async validateOrder(order: ExecutorOrderRequest): Promise<ValidationResult> {
    const errors: string[] = [];

    // Check required fields
    if (!order.symbol) {
      errors.push('Symbol is required');
    }
    if (!order.side) {
      errors.push('Side is required');
    }
    if (!order.type) {
      errors.push('Type is required');
    }
    if (!order.time_in_force) {
      errors.push('Time in force is required');
    }

    // Check quantity vs notional
    if (order.qty && order.notional) {
      errors.push('Cannot specify both quantity and notional');
    } else if (!order.qty && !order.notional) {
      errors.push('Either quantity or notional must be specified');
    }

    // Check limit price for limit orders
    if (order.type === 'limit' && !order.limit_price) {
      errors.push('Limit price is required for limit orders');
    }

    // Check stop price for stop orders
    if (order.type === 'stop' && !order.stop_price) {
      errors.push('Stop price is required for stop orders');
    }

    // Check stop limit price for stop limit orders
    if (order.type === 'stop_limit' && !order.stop_price) {
      errors.push('Stop price is required for stop limit orders');
    }
    if (order.type === 'stop_limit' && !order.limit_price) {
      errors.push('Limit price is required for stop limit orders');
    }

    // Check bracket order parameters
    if (order.order_class === 'bracket') {
      if (!order.take_profit) {
        errors.push('Take profit is required for bracket orders');
      }
      if (!order.stop_loss) {
        errors.push('Stop loss is required for bracket orders');
      }
    }

    // If there are validation errors, return early
    if (errors.length > 0) {
      return {
        valid: false,
        errors
      };
    }

    try {
      // First check account status using the helper method
      const accountInfo = await this.getAccountInfo();

      // Check if account is active
      if (accountInfo.status !== 'ACTIVE') {
        return {
          valid: false,
          errors: [`Account is not active. Current status: ${accountInfo.status}`]
        };
      }

      // Check buying power for buy orders
      if (order.side === 'buy') {
        const buyingPower = parseFloat(accountInfo.buying_power);
        
        // Get current price for more accurate buying power check
        const currentPrice = await this.getCurrentPrice(order.symbol);
        const orderValue = order.notional || (order.qty ? order.qty * currentPrice : 0);

        if (orderValue > buyingPower) {
          return {
            valid: false,
            errors: [`Insufficient buying power. Required: $${orderValue.toFixed(2)}, Available: $${buyingPower.toFixed(2)}`]
          };
        }
      }

      // Validate with Alpaca
      const response = await axios.post(`${config.alpaca.trading.url}/v2/orders`, order, {
        headers: {
          'APCA-API-KEY-ID': config.alpaca.trading.key,
          'APCA-API-SECRET-KEY': config.alpaca.trading.secret
        }
      });

      // If we get here, the order is valid
      return {
        valid: true,
        errors: []
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          return {
            valid: false,
            errors: ['Authentication failed: Please check your Alpaca API credentials']
          };
        }
        if (error.response?.data) {
          const errorMessage = error.response.data.message || JSON.stringify(error.response.data);
          return {
            valid: false,
            errors: ['Validation error: ' + errorMessage]
          };
        }
      }
      
      this.logger.error('Validation error:', error);
      return {
        valid: false,
        errors: ['Validation error: An unexpected error occurred']
      };
    }
  }

  /**
   * Get account information from Alpaca
   */
  private async getAccountInfo(): Promise<any> {
    try {
      const response = await axios.get(`${config.alpaca.trading.url}/v2/account`, {
        headers: {
          'APCA-API-KEY-ID': config.alpaca.trading.key,
          'APCA-API-SECRET-KEY': config.alpaca.trading.secret
        }
      });
      return response.data;
    } catch (error) {
      this.logger.error('Error getting account info', error);
      throw error;
    }
  }

  /**
   * Get current price for a symbol
   */
  private async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const response = await axios.get(`${config.alpaca.trading.url}/v2/stocks/${symbol}/quotes/latest`, {
        headers: {
          'APCA-API-KEY-ID': config.alpaca.data.key,
          'APCA-API-SECRET-KEY': config.alpaca.data.secret
        }
      });
      
      // Use the ask price as an estimate
      return response.data.quote.ap;
    } catch (error) {
      this.logger.error(`Error getting current price for ${symbol}`, error);
      throw error;
    }
  }
} 