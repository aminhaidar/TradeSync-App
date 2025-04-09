import { Order } from './trade';
import Logger from '../utils/logger';
import { ExchangeAPI } from '../exchange/exchange-api';
import { MockExchangeAPI } from '../exchange/mock-exchange-api';

export class OrderSubmitter {
  private logger: Logger;
  private exchangeAPI: ExchangeAPI;

  constructor(exchangeAPI?: ExchangeAPI) {
    this.logger = new Logger('OrderSubmitter');
    this.exchangeAPI = exchangeAPI || new MockExchangeAPI();
  }

  async submitOrder(order: Order): Promise<string> {
    try {
      this.logger.info('Submitting order to exchange:', { order });
      const orderId = await this.exchangeAPI.placeOrder(order);
      this.logger.info('Order submitted successfully', { orderId });
      return orderId;
    } catch (error) {
      this.logger.error('Failed to submit order:', error);
      throw error;
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      this.logger.info('Canceling order:', { orderId });
      await this.exchangeAPI.cancelOrder(orderId);
      this.logger.info('Order canceled successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to cancel order:', error);
      throw error;
    }
  }

  async modifyOrder(orderId: string, updates: Partial<Order>): Promise<boolean> {
    try {
      this.logger.info('Modifying order:', { orderId, updates });
      await this.exchangeAPI.modifyOrder(orderId, updates);
      this.logger.info('Order modified successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to modify order:', error);
      throw error;
    }
  }
} 