import { Server } from 'socket.io';
import { WebSocket } from 'ws';
import { WebSocketManager } from '../websocket-manager';
import { AlpacaQuote, AlpacaTrade, AlpacaBar, AlpacaConfig } from '../types/alpaca';
import { ErrorHandler } from '../utils/error-handler';
import { DataProcessor } from '../utils/data-processor';

jest.mock('ws');
jest.mock('socket.io');
jest.mock('../utils/error-handler');
jest.mock('../utils/data-processor');

describe('WebSocketManager', () => {
  let wsManager: WebSocketManager;
  let mockIo: Server;
  let mockConfig: AlpacaConfig;
  let mockDataWs: jest.Mocked<WebSocket>;
  let mockTradingWs: jest.Mocked<WebSocket>;
  let mockDataErrorHandler: jest.Mocked<ErrorHandler>;
  let mockTradingErrorHandler: jest.Mocked<ErrorHandler>;
  let mockDataProcessor: jest.Mocked<DataProcessor>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock error handlers
    mockDataErrorHandler = {
      handleError: jest.fn(),
      resetReconnectAttempts: jest.fn(),
      on: jest.fn(),
      cleanup: jest.fn()
    } as unknown as jest.Mocked<ErrorHandler>;

    mockTradingErrorHandler = {
      handleError: jest.fn(),
      resetReconnectAttempts: jest.fn(),
      on: jest.fn(),
      cleanup: jest.fn()
    } as unknown as jest.Mocked<ErrorHandler>;

    // Mock data processor
    mockDataProcessor = {
      addMessage: jest.fn(),
      hasMessages: jest.fn(),
      processMessages: jest.fn(),
      cleanup: jest.fn()
    } as unknown as jest.Mocked<DataProcessor>;

    (ErrorHandler as unknown as jest.MockedClass<typeof ErrorHandler>).mockImplementation((type: string) => {
      return type === 'data' ? mockDataErrorHandler : mockTradingErrorHandler;
    });

    (DataProcessor as unknown as jest.MockedClass<typeof DataProcessor>).mockImplementation(() => {
      return mockDataProcessor;
    });

    mockIo = {
      on: jest.fn(),
      emit: jest.fn()
    } as unknown as Server;

    mockConfig = {
      isProduction: false,
      port: 3000,
      alpaca: {
        data: {
          key: 'test_key',
          secret: 'test_secret',
          wsUrl: 'wss://test.data.url'
        },
        trading: {
          key: 'test_key',
          secret: 'test_secret',
          url: 'https://test.trading.url',
          wsUrl: 'wss://test.trading.url'
        }
      },
      websocket: {
        maxReconnectAttempts: 3,
        reconnectDelay: 1000,
        maxReconnectDelay: 5000,
        batchInterval: 100,
        healthCheckInterval: 30000,
        batchSize: 100,
        maxQueueSize: 1000
      },
      data: {
        maxTrades: 100,
        cleanupInterval: 3600000,
        maxPrice: 1000000,
        maxVolume: 1000000,
        maxSpread: 1000,
        minPrice: 0.01,
        minVolume: 1
      }
    };

    // Create mock WebSocket instances
    mockDataWs = {
      on: jest.fn(),
      send: jest.fn(),
      readyState: WebSocket.OPEN,
      close: jest.fn(),
      emit: jest.fn()
    } as unknown as jest.Mocked<WebSocket>;

    mockTradingWs = {
      on: jest.fn(),
      send: jest.fn(),
      readyState: WebSocket.OPEN,
      close: jest.fn(),
      emit: jest.fn()
    } as unknown as jest.Mocked<WebSocket>;

    // Mock WebSocket constructor to return appropriate mock instance
    (WebSocket as unknown as jest.Mock).mockImplementation((url: string) => {
      return url.includes('data') ? mockDataWs : mockTradingWs;
    });

    wsManager = new WebSocketManager(mockIo, mockConfig);
  });

  afterEach(() => {
    wsManager.cleanup();
  });

  describe('Connection Management', () => {
    it('should connect to both WebSocket endpoints', () => {
      wsManager.connectDataWebSocket();
      wsManager.connectTradingWebSocket();

      expect(WebSocket).toHaveBeenCalledWith('wss://test.data.url');
      expect(WebSocket).toHaveBeenCalledWith('wss://test.trading.url');
      expect(WebSocket).toHaveBeenCalledTimes(2);
    });

    it('should attempt reconnection on connection close', () => {
      jest.useFakeTimers();
      
      // Initial connection
      wsManager.connectDataWebSocket();
      expect(WebSocket).toHaveBeenCalledTimes(1);
      
      // Simulate connection close
      const closeCall = mockDataWs.on.mock.calls.find(call => call[0] === 'close');
      if (!closeCall) throw new Error('Close handler not found');
      const closeHandler = closeCall[1] as () => void;
      closeHandler();
      
      // Verify error handler was called
      expect(mockDataErrorHandler.handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Connection closed',
          stream: 'data'
        })
      );
      
      // Reset mock to prepare for reconnection
      (WebSocket as unknown as jest.Mock).mockReset();
      
      // Get the reconnect callback that was registered
      const onCalls = mockDataErrorHandler.on.mock.calls;
      const reconnectCallback = onCalls.find(call => call[0] === 'reconnect')?.[1];
      expect(reconnectCallback).toBeDefined();
      
      // Simulate error handler triggering reconnect
      if (reconnectCallback) {
        reconnectCallback();
      }
      
      // Should attempt to reconnect
      expect(WebSocket).toHaveBeenCalledTimes(1);
      expect(WebSocket).toHaveBeenCalledWith('wss://test.data.url');
      
      jest.useRealTimers();
    });
  });

  describe('Authentication', () => {
    it('should send authentication message on connection', () => {
      wsManager.connectDataWebSocket();
      
      // Simulate connection open
      const openCall = mockDataWs.on.mock.calls.find(call => call[0] === 'open');
      if (!openCall) throw new Error('Open handler not found');
      const openHandler = openCall[1] as () => void;
      openHandler();

      expect(mockDataWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"action":"auth"')
      );
    });
  });

  describe('Message Handling', () => {
    const mockQuote: AlpacaQuote = {
      T: 'q',
      S: 'AAPL',
      bp: 150.5,
      bs: 100,
      ap: 150.6,
      as: 100,
      t: '2024-03-28T12:00:00Z',
      c: [],
      z: 'A'
    };

    const mockTrade: AlpacaTrade = {
      T: 't',
      S: 'AAPL',
      p: 150.55,
      s: 100,
      t: '2024-03-28T12:00:00Z',
      c: [],
      z: 'A'
    };

    const mockBar: AlpacaBar = {
      T: 'b',
      S: 'AAPL',
      o: 150.0,
      h: 151.0,
      l: 149.0,
      c: 150.5,
      v: 1000,
      t: '2024-03-28T12:00:00Z',
      n: 100,
      vw: 150.25
    };

    beforeEach(() => {
      wsManager.connectDataWebSocket();
      
      // Simulate connection open
      const openCall = mockDataWs.on.mock.calls.find(call => call[0] === 'open');
      if (!openCall) throw new Error('Open handler not found');
      const openHandler = openCall[1] as () => void;
      openHandler();
      
      // Get the message handler
      const messageCall = mockDataWs.on.mock.calls.find(call => call[0] === 'message');
      if (!messageCall) throw new Error('Message handler not found');
      const messageHandler = messageCall[1] as (data: Buffer) => void;
      
      // Simulate successful authentication
      messageHandler(Buffer.from(JSON.stringify({ T: 'success', message: 'authenticated' })));
      
      // Subscribe to symbol
      wsManager.subscribeToSymbols(['AAPL']);
      
      // Clear any previous mock calls
      (mockDataWs.send as jest.Mock).mockClear();
      (mockDataProcessor.addMessage as jest.Mock).mockClear();
      (mockIo.emit as jest.Mock).mockClear();
    });

    it('should process quote messages', () => {
      // Get the message handler
      const messageCall = mockDataWs.on.mock.calls.find(call => call[0] === 'message');
      if (!messageCall) throw new Error('Message handler not found');
      const messageHandler = messageCall[1] as (data: Buffer) => void;
      
      // Process quote message
      messageHandler(Buffer.from(JSON.stringify([mockQuote])));

      const latestData = wsManager.getLatestData();
      expect(latestData['AAPL']).toBeDefined();
      expect(latestData['AAPL'].bidPrice).toBe(150.5);
      expect(latestData['AAPL'].askPrice).toBe(150.6);
      expect(latestData['AAPL'].spread).toBe(0.1);

      expect(mockDataProcessor.addMessage).toHaveBeenCalledWith('quote', expect.objectContaining({
        symbol: 'AAPL',
        bidPrice: 150.5,
        askPrice: 150.6,
        spread: 0.1,
        timestamp: '2024-03-28T12:00:00Z'
      }));
    });

    it('should process trade messages', () => {
      // Get the message handler
      const messageCall = mockDataWs.on.mock.calls.find(call => call[0] === 'message');
      if (!messageCall) throw new Error('Message handler not found');
      const messageHandler = messageCall[1] as (data: Buffer) => void;
      
      // Process trade message
      messageHandler(Buffer.from(JSON.stringify([mockTrade])));

      const trades = wsManager.getLatestTrades();
      expect(trades).toHaveLength(1);
      expect(trades[0].symbol).toBe('AAPL');
      expect(trades[0].price).toBe(150.55);
      expect(trades[0].size).toBe(100);
      expect(trades[0].timestamp).toBe('2024-03-28T12:00:00Z');

      expect(mockDataProcessor.addMessage).toHaveBeenCalledWith('trade', expect.objectContaining({
        symbol: 'AAPL',
        price: 150.55,
        size: 100,
        timestamp: '2024-03-28T12:00:00Z'
      }));
    });

    it('should process bar messages', () => {
      // Get the message handler
      const messageCall = mockDataWs.on.mock.calls.find(call => call[0] === 'message');
      if (!messageCall) throw new Error('Message handler not found');
      const messageHandler = messageCall[1] as (data: Buffer) => void;
      
      // Process bar message
      messageHandler(Buffer.from(JSON.stringify([mockBar])));

      expect(mockDataProcessor.addMessage).toHaveBeenCalledWith('bar', expect.objectContaining({
        symbol: 'AAPL',
        open: 150.0,
        high: 151.0,
        low: 149.0,
        close: 150.5,
        volume: 1000,
        timestamp: '2024-03-28T12:00:00Z'
      }));
    });
  });

  describe('Subscription Management', () => {
    beforeEach(() => {
      wsManager.connectDataWebSocket();
      
      // Simulate connection open
      const openCall = mockDataWs.on.mock.calls.find(call => call[0] === 'open');
      if (!openCall) throw new Error('Open handler not found');
      const openHandler = openCall[1] as () => void;
      openHandler();
      
      // Simulate successful authentication
      const messageCall = mockDataWs.on.mock.calls.find(call => call[0] === 'message');
      if (!messageCall) throw new Error('Message handler not found');
      const messageHandler = messageCall[1] as (data: Buffer) => void;
      messageHandler(Buffer.from(JSON.stringify({ T: 'success', message: 'authenticated' })));
    });

    it('should manage symbol subscriptions', () => {
      wsManager.subscribeToSymbols(['AAPL']);
      expect(mockDataWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"action":"subscribe"')
      );
      expect(wsManager.getSubscriptions()).toContain('AAPL');

      wsManager.unsubscribeFromSymbol('AAPL');
      expect(mockDataWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"action":"unsubscribe"')
      );
      expect(wsManager.getSubscriptions()).not.toContain('AAPL');
    });

    it('should not duplicate subscriptions', () => {
      wsManager.subscribeToSymbols(['AAPL']);
      wsManager.subscribeToSymbols(['AAPL']);
      
      const subscriptions = wsManager.getSubscriptions();
      expect(subscriptions.filter(s => s === 'AAPL')).toHaveLength(1);
      
      // Should only send subscribe message once
      const subscribeCalls = (mockDataWs.send as jest.Mock).mock.calls.filter(
        call => call[0].includes('"action":"subscribe"')
      );
      expect(subscribeCalls).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      wsManager.connectDataWebSocket();
    });

    it('should handle WebSocket errors', () => {
      const mockError = new Error('WebSocket error');
      const errorCall = mockDataWs.on.mock.calls.find(call => call[0] === 'error');
      if (!errorCall) throw new Error('Error handler not found');
      const errorHandler = errorCall[1] as (error: Error) => void;
      errorHandler(mockError);

      expect(mockIo.emit).toHaveBeenCalledWith(
        'connectionState',
        expect.objectContaining({
          data: expect.objectContaining({
            metrics: expect.objectContaining({
              errorCount: 1
            })
          })
        })
      );
    });

    it('should handle message parsing errors', () => {
      const messageCall = mockDataWs.on.mock.calls.find(call => call[0] === 'message');
      if (!messageCall) throw new Error('Message handler not found');
      const messageHandler = messageCall[1] as (data: Buffer) => void;
      messageHandler(Buffer.from('invalid json'));

      expect(mockIo.emit).toHaveBeenCalledWith(
        'connectionState',
        expect.objectContaining({
          data: expect.objectContaining({
            metrics: expect.objectContaining({
              errorCount: 1
            })
          })
        })
      );
    });
  });
}); 