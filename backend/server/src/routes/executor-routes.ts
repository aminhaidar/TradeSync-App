import { Router, Request, Response, RequestHandler } from 'express';
import { ExecutorService } from '../services/executor/executor-service';
import Logger from '../utils/logger';
import { OrderService } from '../services/executor/order-service';

const router = Router();
const executor = new ExecutorService();
const logger = new Logger('ExecutorRoutes');

const placeOrder: RequestHandler = async (req, res) => {
  try {
    const order = req.body;
    const result = await OrderService.placeOrder(order);
    res.status(200).json(result);
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('Failed to place order', error);
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Unknown error occurred' });
    }
  }
};

const getOrder: RequestHandler = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await executor.getOrder(orderId);
    
    if (!order) {
      res.status(404).json({
        success: false,
        error: 'Order not found'
      });
      return;
    }
    
    res.json(order);
  } catch (error) {
    logger.error('Error getting order', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

const cancelOrder: RequestHandler = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const success = await executor.cancelOrder(orderId);
    
    if (!success) {
      res.status(404).json({
        success: false,
        error: 'Order not found'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Order cancellation requested'
    });
  } catch (error) {
    logger.error('Error canceling order', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

router.post('/orders', placeOrder);
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    
    let orders;
    if (status) {
      orders = await executor.getOrdersByStatus(status as any);
    } else {
      orders = await executor.getAllOrders();
    }
    
    res.json({
      success: true,
      orders
    });
  } catch (error) {
    logger.error('Error getting orders', error);
    res.status(500).json({
      success: false,
      message: 'Error getting orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/orders/:orderId', getOrder);
router.delete('/orders/:orderId', cancelOrder);

export default router; 