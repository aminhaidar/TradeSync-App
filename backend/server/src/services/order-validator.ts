import { Order } from './trade';
import Logger from '../utils/logger';

export class OrderValidator {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('OrderValidator');
  }

  async validateOrder(order: Order): Promise<boolean> {
    this.logger.info('Validating order:', { order });

    if (!order.symbol || typeof order.symbol !== 'string') {
      this.logger.error('Invalid symbol');
      return false;
    }

    if (!['market', 'limit'].includes(order.type)) {
      this.logger.error('Invalid order type');
      return false;
    }

    if (!['buy', 'sell'].includes(order.side)) {
      this.logger.error('Invalid order side');
      return false;
    }

    if (typeof order.quantity !== 'number' || order.quantity <= 0) {
      this.logger.error('Invalid quantity');
      return false;
    }

    if (order.type === 'limit' && (!order.price || order.price <= 0)) {
      this.logger.error('Limit order requires valid price');
      return false;
    }

    this.logger.info('Order validation successful');
    return true;
  }
} 