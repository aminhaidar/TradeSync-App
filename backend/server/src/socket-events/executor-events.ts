import { Server as SocketServer } from 'socket.io';
import { ExecutorService } from '../services/executor/executor-service';
import Logger from '../utils/logger';

export function setupExecutorEvents(io: SocketServer, executor: ExecutorService): void {
  const logger = new Logger('ExecutorEvents');
  
  // Listen for executor events
  executor.on('order_queued', (order) => {
    io.emit('executor:order_queued', { order });
  });
  
  executor.on('order_submitted', (order, response) => {
    io.emit('executor:order_submitted', { order, response });
  });
  
  executor.on('order_updated', (order, update) => {
    io.emit('executor:order_updated', { order, update });
  });
  
  executor.on('order_failed', (order, error) => {
    io.emit('executor:order_failed', { order, error });
  });
  
  // Handle client events
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    // Handle execute order request
    socket.on('executor:execute_order', async (data, callback) => {
      try {
        const order = await executor.submitOrder(data);
        
        if (callback) {
          callback({
            success: true,
            order
          });
        }
      } catch (error) {
        logger.error('Error executing order via socket', error);
        
        if (callback) {
          callback({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    });
    
    // Handle cancel order request
    socket.on('executor:cancel_order', async (data, callback) => {
      try {
        const success = await executor.cancelOrder(data.orderId);
        
        if (callback) {
          callback({
            success
          });
        }
      } catch (error) {
        logger.error('Error canceling order via socket', error);
        
        if (callback) {
          callback({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    });
    
    // Handle get order(s) request
    socket.on('executor:get_orders', async (data, callback) => {
      try {
        let result;
        
        if (data && data.orderId) {
          // Get a specific order
          result = await executor.getOrder(data.orderId);
        } else if (data && data.status) {
          // Get orders by status
          result = await executor.getOrdersByStatus(data.status);
        } else {
          // Get all orders
          result = await executor.getAllOrders();
        }
        
        if (callback) {
          callback({
            success: true,
            result
          });
        }
      } catch (error) {
        logger.error('Error getting orders via socket', error);
        
        if (callback) {
          callback({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    });
  });
} 