# Executor Service

The executor service is responsible for managing all trading operations through Alpaca's API. It provides a robust, event-driven system for submitting, monitoring, and managing orders.

## Architecture

The service is composed of four main components:

### 1. ExecutorService (`executor-service.ts`)

The main service that coordinates all trading operations. It provides a high-level interface for:

- Submitting orders
- Monitoring order status
- Canceling orders
- Retrieving order history

```typescript
const executor = new ExecutorService();

// Submit a market order
await executor.submitOrder({
  symbol: 'AAPL',
  qty: 1,
  side: 'buy',
  type: 'market',
  time_in_force: 'day'
});

// Submit a limit order
await executor.submitOrder({
  symbol: 'AAPL',
  qty: 1,
  side: 'buy',
  type: 'limit',
  time_in_force: 'day',
  limit_price: 150.00
});

// Cancel an order
await executor.cancelOrder('order_id');

// Get all orders
const orders = await executor.getOrders();
```

### 2. OrderSubmitter (`order-submitter.ts`)

Handles the submission and cancellation of orders through Alpaca's API:

- Supports market, limit, and bracket orders
- Handles order validation
- Manages API communication
- Emits events for order status changes

### 3. OrderMonitor (`order-monitor.ts`)

Monitors order status through Alpaca's WebSocket API:

- Real-time order status updates
- Automatic reconnection with exponential backoff
- Event-based notifications
- Handles connection errors and retries

### 4. OrderRepository (`order-repository.ts`)

Manages order persistence and history:

- Stores order details and status
- Tracks order updates
- Provides querying capabilities
- Handles data persistence

## Events

The service uses an event-driven architecture. Key events include:

- `order_submitted`: Emitted when an order is successfully submitted
- `order_failed`: Emitted when order submission fails
- `order_canceled`: Emitted when an order is canceled
- `order_status_updated`: Emitted when an order's status changes
- `order_filled`: Emitted when an order is filled

## Testing

The service includes comprehensive tests for all components:

```bash
npm run test:executor
```

Test coverage includes:
- Order submission (market and limit orders)
- WebSocket connection and authentication
- Order status monitoring
- Order cancellation
- Error handling and validation
- Event emission and handling

## Error Handling

The service implements robust error handling:

1. **API Errors**
   - Authentication failures
   - Invalid order parameters
   - Insufficient buying power
   - Rate limiting

2. **WebSocket Errors**
   - Connection failures
   - Authentication issues
   - Reconnection with exponential backoff

3. **Validation Errors**
   - Missing required fields
   - Invalid order types
   - Invalid price/quantity values

## Configuration

Configuration is managed through environment variables:

```env
ALPACA_API_KEY=your_api_key
ALPACA_API_SECRET=your_api_secret
ALPACA_TRADING_URL=https://paper-api.alpaca.markets
ALPACA_TRADING_WS_URL=wss://paper-api.alpaca.markets/stream
```

## Best Practices

1. **Order Management**
   - Always use unique client order IDs
   - Implement proper error handling
   - Monitor order status changes
   - Store order history

2. **WebSocket Handling**
   - Implement reconnection logic
   - Handle authentication properly
   - Process messages asynchronously
   - Monitor connection health

3. **Error Handling**
   - Validate orders before submission
   - Handle API errors gracefully
   - Log errors appropriately
   - Provide meaningful error messages

4. **Testing**
   - Run tests before deployment
   - Test with paper trading first
   - Verify order validation
   - Check error handling 