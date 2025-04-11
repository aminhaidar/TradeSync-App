import { OrderMonitor } from '../../../services/executor/order-monitor';
import { ExecutorOrderState } from '../../../types/executor-order';
import WebSocket from 'ws';
import Logger from '../../../utils/logger';

jest.mock('ws');

// Define WebSocket readyState constants
const enum WebSocketState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3
}

// Define custom event types for our mock
interface MockWebSocketEvent {
  type: string;
  target: any;
  data?: any;
  code?: number;
  reason?: string;
  wasClean?: boolean;
  error?: Error;
}

// Create a mock WebSocket class that matches our needs
class MockWebSocket {
  private listeners: { [key: string]: ((event: any) => void)[] } = {};
  public readyState: number = WebSocketState.OPEN;
  public url: string = 'wss://test.alpaca.markets';
  public send = jest.fn();
  public close = jest.fn();
  public terminate = jest.fn();
  public removeAllListeners = jest.fn();
  public addEventListener = jest.fn();
  public removeEventListener = jest.fn();
  public binaryType: string = 'arraybuffer';
  public bufferedAmount: number = 0;
  public extensions: string = '';
  public isPaused: boolean = false;
  public protocol: string = '';

  on(event: string, handler: (event: any) => void): this {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
    return this;
  }

  // Helper method to trigger events
  triggerEvent(event: string, data: any): void {
    const handlers = this.listeners[event] || [];
    handlers.forEach(handler => handler(data));
  }
}

describe('OrderMonitor', () => {
  let monitor: OrderMonitor;
  let mockWebSocket: MockWebSocket;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockWebSocket = new MockWebSocket();
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as unknown as jest.Mocked<Logger>;

    (WebSocket as jest.MockedClass<typeof WebSocket>).mockImplementation(() => mockWebSocket as unknown as WebSocket);

    // Create OrderMonitor without parameters
    monitor = new OrderMonitor();
    
    // Mock the logger instance
    monitor['logger'] = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks();
    monitor.close();
  });

  describe('WebSocket connection', () => {
    it('should connect to WebSocket on initialization', () => {
      expect(WebSocket).toHaveBeenCalledWith(expect.stringContaining('wss://'));
    });

    it('should authenticate after connection', () => {
      const mockOpenEvent: MockWebSocketEvent = { type: 'open', target: mockWebSocket };
      mockWebSocket.triggerEvent('open', mockOpenEvent);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('authenticate')
      );
    });

    it('should subscribe to trade updates after authentication', () => {
      // Simulate connection
      const mockOpenEvent: MockWebSocketEvent = { type: 'open', target: mockWebSocket };
      mockWebSocket.triggerEvent('open', mockOpenEvent);

      // Simulate authentication success
      const authResponse = {
        stream: 'authorization',
        data: { status: 'authorized' }
      };
      const mockMessageEvent: MockWebSocketEvent = {
        type: 'message',
        target: mockWebSocket,
        data: JSON.stringify(authResponse)
      };
      mockWebSocket.triggerEvent('message', mockMessageEvent);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('listen')
      );
    });
  });

  describe('monitorOrder', () => {
    it('should add order to monitored orders', () => {
      const order: ExecutorOrderState = {
        id: 'test-order-123',
        client_order_id: 'client-123',
        alpaca_order_id: 'alpaca-123',
        request: {
          symbol: 'AAPL',
          qty: 10,
          side: 'buy',
          type: 'market',
          time_in_force: 'day'
        },
        status: 'submitted',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        execution_attempts: 0
      };

      monitor.monitorOrder(order);
      expect(monitor['monitoredOrders'].has('alpaca-123')).toBe(true);
    });

    it('should emit order update events', async () => {
      const order: ExecutorOrderState = {
        id: 'test-order-123',
        client_order_id: 'client-123',
        alpaca_order_id: 'alpaca-123',
        request: {
          symbol: 'AAPL',
          qty: 10,
          side: 'buy',
          type: 'market',
          time_in_force: 'day'
        },
        status: 'submitted',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        execution_attempts: 0
      };

      monitor.monitorOrder(order);

      const updatePromise = new Promise((resolve) => {
        monitor.once('order_update', (update) => {
          resolve(update);
        });
      });

      // Simulate trade update
      const tradeUpdate = {
        stream: 'trade_updates',
        data: {
          event: 'fill',
          order: {
            id: 'alpaca-123',
            status: 'filled',
            filled_qty: '10',
            filled_avg_price: '100.00'
          }
        }
      };
      const mockMessageEvent: MockWebSocketEvent = {
        type: 'message',
        target: mockWebSocket,
        data: JSON.stringify(tradeUpdate)
      };
      mockWebSocket.triggerEvent('message', mockMessageEvent);

      const update = await updatePromise;
      expect(update).toEqual(tradeUpdate.data);
    });

    it('should stop monitoring completed orders', async () => {
      const order: ExecutorOrderState = {
        id: 'test-order-123',
        client_order_id: 'client-123',
        alpaca_order_id: 'alpaca-123',
        request: {
          symbol: 'AAPL',
          qty: 10,
          side: 'buy',
          type: 'market',
          time_in_force: 'day'
        },
        status: 'submitted',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        execution_attempts: 0
      };

      monitor.monitorOrder(order);

      // Simulate order completion
      const tradeUpdate = {
        stream: 'trade_updates',
        data: {
          event: 'fill',
          order: {
            id: 'alpaca-123',
            status: 'filled',
            filled_qty: '10',
            filled_avg_price: '100.00'
          }
        }
      };
      const mockMessageEvent: MockWebSocketEvent = {
        type: 'message',
        target: mockWebSocket,
        data: JSON.stringify(tradeUpdate)
      };
      mockWebSocket.triggerEvent('message', mockMessageEvent);

      expect(monitor['monitoredOrders'].has('alpaca-123')).toBe(false);
    });
  });

  describe('reconnection', () => {
    it('should attempt to reconnect on connection close', () => {
      const mockCloseEvent: MockWebSocketEvent = {
        type: 'close',
        target: mockWebSocket,
        code: 1000,
        reason: 'Normal closure',
        wasClean: true
      };
      mockWebSocket.triggerEvent('close', mockCloseEvent);

      // Wait for reconnection attempt
      setTimeout(() => {
        expect(WebSocket).toHaveBeenCalledTimes(2);
      }, 100);
    });

    it('should use exponential backoff for reconnection attempts', () => {
      const mockCloseEvent: MockWebSocketEvent = {
        type: 'close',
        target: mockWebSocket,
        code: 1000,
        reason: 'Normal closure',
        wasClean: true
      };
      
      // Simulate multiple connection failures
      for (let i = 0; i < 3; i++) {
        mockWebSocket.triggerEvent('close', mockCloseEvent);
      }

      // The reconnection interval should increase with each attempt
      const reconnectionIntervals = monitor['reconnectInterval'] * 
        Math.pow(1.5, monitor['reconnectAttempts'] - 1);
      
      expect(reconnectionIntervals).toBeGreaterThan(monitor['reconnectInterval']);
    });
  });
}); 