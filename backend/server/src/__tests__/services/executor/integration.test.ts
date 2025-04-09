import { ExecutorService } from '../../../services/executor/executor-service';
import { ExecutorOrderRequest } from '../../../types/executor-order';

describe('Trade Executor Integration Test', () => {
  let executor: ExecutorService;

  beforeAll(() => {
    // Initialize the executor service
    executor = new ExecutorService();
  });

  afterAll(() => {
    // Clean up any resources
    // Note: We don't need to call close() as it's not part of the ExecutorService interface
  });

  it('should execute a complete trade flow', async () => {
    // Create a test order request
    const orderRequest: ExecutorOrderRequest = {
      symbol: 'AAPL',
      qty: 1,
      side: 'buy',
      type: 'market',
      time_in_force: 'day'
    };

    // Set up event listeners
    const events: string[] = [];
    executor.on('order_queued', (order) => {
      events.push(`Order queued: ${order.id}`);
    });

    executor.on('order_validated', (order) => {
      events.push(`Order validated: ${order.id}`);
    });

    executor.on('order_submitted', (orderId, response) => {
      events.push(`Order submitted: ${orderId} -> ${response.id}`);
    });

    executor.on('order_update', (update) => {
      events.push(`Order update: ${update.event} -> ${update.order.status}`);
    });

    executor.on('order_completed', (order) => {
      events.push(`Order completed: ${order.id}`);
    });

    // Submit the order
    console.log('Submitting order...');
    const order = await executor.submitOrder(orderRequest);
    console.log('Order submitted:', order);

    // Wait for order to be processed
    console.log('Waiting for order processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check order status
    const updatedOrder = await executor.getOrder(order.id);
    if (!updatedOrder) {
      throw new Error('Order not found');
    }
    console.log('Order status:', updatedOrder);

    // Print all events that occurred
    console.log('\nEvents that occurred:');
    events.forEach(event => console.log(`- ${event}`));

    // Verify the order was processed
    expect(updatedOrder).toBeDefined();
    expect(updatedOrder.status).toBeDefined();
    expect(events.length).toBeGreaterThan(0);
  }, 30000); // 30 second timeout for the test

  it('should handle order cancellation', async () => {
    // Create a test order request
    const orderRequest: ExecutorOrderRequest = {
      symbol: 'AAPL',
      qty: 1,
      side: 'buy',
      type: 'limit',
      time_in_force: 'day',
      limit_price: 100 // Set a limit price that won't be hit immediately
    };

    // Submit the order
    console.log('Submitting order for cancellation test...');
    const order = await executor.submitOrder(orderRequest);
    console.log('Order submitted:', order);

    // Wait a bit for the order to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cancel the order
    console.log('Cancelling order...');
    const cancelled = await executor.cancelOrder(order.id);
    console.log('Order cancelled:', cancelled);

    // Check order status
    const updatedOrder = await executor.getOrder(order.id);
    if (!updatedOrder) {
      throw new Error('Order not found');
    }
    console.log('Final order status:', updatedOrder);

    expect(cancelled).toBe(true);
    expect(updatedOrder.status).toBe('cancelled');
  }, 15000); // 15 second timeout for the test
}); 