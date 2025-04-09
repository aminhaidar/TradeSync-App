import { Router, RequestHandler } from 'express';
import Logger from '../utils/logger';
import { TradeService } from '../services/trade';

interface TradingViewAlert {
  action: 'entry' | 'exit';
  ticker: string;
  position_type: 'long' | 'short';
  strike_price?: number;
  expiration_date?: string;
  entry_price: number;
  quantity: number;
}

type OrderType = 'Market' | 'Limit' | 'Stop' | 'Stop Limit';
type OrderSide = 'Buy' | 'Sell';
type TimeInForce = 'Day' | 'GTC';
type OrderClass = 'Simple' | 'Bracket' | 'OCO' | 'OTO';

const router = Router();
const logger = new Logger('WebhookRoutes');
const tradeService = new TradeService();

const handleWebhook: RequestHandler = async (req, res) => {
  try {
    logger.info('Received webhook:', req.body);

    const parsedAlert = req.body as TradingViewAlert;
    if (!parsedAlert || typeof parsedAlert !== 'object') {
      throw new Error('Invalid alert format');
    }

    if (parsedAlert.action === 'entry') {
      const orderType: OrderType = parsedAlert.strike_price ? 'Limit' : 'Market';
      const orderData = {
        symbol: parsedAlert.ticker,
        side: parsedAlert.position_type === 'long' ? 'Buy' : 'Sell' as OrderSide,
        type: orderType,
        timeInForce: 'Day' as TimeInForce,
        orderClass: 'Simple' as OrderClass,
        quantity: parsedAlert.quantity,
        price: parsedAlert.strike_price || parsedAlert.entry_price
      };

      if (parsedAlert.expiration_date) {
        Object.assign(orderData, { expirationDate: new Date(parsedAlert.expiration_date) });
      }

      await tradeService.placeOrder(orderData);

      res.json({
        success: true,
        message: 'Order placed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Unsupported action type'
      });
    }
  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

router.post('/', handleWebhook);

export default router; 