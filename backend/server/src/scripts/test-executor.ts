import { ExecutorService } from '../services/executor/executor-service';
import { ExecutorOrderRequest } from '../types/executor-order';

async function testExecutor() {
  console.log('Initializing executor service...');
  const executor = new ExecutorService();

  try {
    // Test 1: Submit a market order
    console.log('\nTest 1: Submitting market order');
    const marketOrder: ExecutorOrderRequest = {
      symbol: 'AAPL',
      qty: 1,
      side: 'buy',
      type: 'market',
      time_in_force: 'day'
    };

    console.log('Submitting order:', marketOrder);
    const order = await executor.submitOrder(marketOrder);
    console.log('Order submitted successfully:', order);

    // Wait for order to be processed
    console.log('Waiting for order processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check order status
    const updatedOrder = await executor.getOrder(order.id);
    if (!updatedOrder) {
      throw new Error('Order not found');
    }
    console.log('Order status:', updatedOrder);

    // Test 2: Submit and cancel a limit order
    console.log('\nTest 2: Submitting and canceling limit order');
    const limitOrder: ExecutorOrderRequest = {
      symbol: 'AAPL',
      qty: 1,
      side: 'buy',
      type: 'limit',
      time_in_force: 'day',
      limit_price: 100 // Set a limit price that won't be hit immediately
    };

    console.log('Submitting order:', limitOrder);
    const limitOrderResult = await executor.submitOrder(limitOrder);
    console.log('Order submitted successfully:', limitOrderResult);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cancel the order
    console.log('Cancelling order...');
    const cancelled = await executor.cancelOrder(limitOrderResult.id);
    console.log('Order cancelled:', cancelled);

    // Check final status
    const finalStatus = await executor.getOrder(limitOrderResult.id);
    if (!finalStatus) {
      throw new Error('Order not found');
    }
    console.log('Final order status:', finalStatus);

    // Test 3: Get all orders
    console.log('\nTest 3: Getting all orders');
    const allOrders = await executor.getAllOrders();
    console.log('All orders:', allOrders);

  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run the test
testExecutor()
  .then(() => console.log('\nTest completed'))
  .catch(error => console.error('Test failed:', error)); 