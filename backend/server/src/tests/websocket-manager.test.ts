import { WebSocketManager } from '../websocket-manager';
import { Server } from 'socket.io';
import { WebSocket } from 'ws';
import { AlpacaConfig } from '../types/alpaca';

jest.mock('ws');
jest.mock('socket.io');

const MockWebSocket = WebSocket as unknown as jest.Mock;

describe('WebSocketManager', () => {
  let webSocketManager: WebSocketManager;
  let mockIo: jest.Mocked<Server>;
  let mockConfig: AlpacaConfig;

  beforeEach(() => {
    mockIo = {
      emit: jest.fn()
    } as unknown as jest.Mocked<Server>;

    mockConfig = {
      isProduction: false,
      port: 3000,
      alpaca: {
        trading: {
          url: 'https://paper-api.alpaca.markets',
          wsUrl: 'wss://stream.data.alpaca.markets/v2/iex',
          key: 'test_key',
          secret: 'test_secret'
        },
        data: {
          wsUrl: 'wss://stream.data.alpaca.markets/v2/iex',
          key: 'test_key',
          secret: 'test_secret'
        }
      },
      websocket: {
        maxReconnectAttempts: 3,
        reconnectDelay: 1000,
        maxReconnectDelay: 5000,
        batchInterval: 100,
        healthCheckInterval: 5000,
        batchSize: 10,
        maxQueueSize: 100
      },
      data: {
        maxTrades: 100,
        cleanupInterval: 60000,
        maxPrice: 1000,
        maxVolume: 1000000,
        maxSpread: 10,
        minPrice: 0,
        minVolume: 0
      }
    };

    webSocketManager = new WebSocketManager(mockIo, mockConfig);
  });

  afterEach(() => {
    webSocketManager.cleanup();
  });

  describe('connectDataWebSocket', () => {
    it('should create WebSocket connection', () => {
      const mockWs = {
        on: jest.fn(),
        readyState: WebSocket.CLOSED
      };

      MockWebSocket.mockImplementation(() => mockWs);

      webSocketManager.connectDataWebSocket();

      expect(MockWebSocket).toHaveBeenCalledWith(mockConfig.alpaca.data.wsUrl);
      expect(mockWs.on).toHaveBeenCalledWith('open', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('ping', expect.any(Function));
    });

    it('should not create new connection if already connected', () => {
      const mockWs = {
        on: jest.fn(),
        readyState: WebSocket.OPEN
      };

      MockWebSocket.mockImplementation(() => mockWs);

      webSocketManager.connectDataWebSocket();

      expect(MockWebSocket).not.toHaveBeenCalled();
    });
  });

  describe('handleDataMessage', () => {
    it('should handle authentication success message', () => {
      const authMessage = {
        T: 'success',
        message: 'authenticated'
      };

      const mockWs = {
        on: jest.fn(),
        readyState: WebSocket.CLOSED,
        send: jest.fn()
      };

      MockWebSocket.mockImplementation(() => mockWs);

      webSocketManager.connectDataWebSocket();

      // Find the message handler
      const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
      
      // Simulate receiving auth message
      messageHandler(Buffer.from(JSON.stringify(authMessage)));

      expect(mockIo.emit).toHaveBeenCalledWith('connectionState', expect.any(Object));
    });

    it('should handle error message', () => {
      const errorMessage = {
        T: 'error',
        message: 'Authentication failed',
        code: 401
      };

      const mockWs = {
        on: jest.fn(),
        readyState: WebSocket.CLOSED,
        send: jest.fn()
      };

      MockWebSocket.mockImplementation(() => mockWs);

      webSocketManager.connectDataWebSocket();

      // Find the message handler
      const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
      
      // Simulate receiving error message
      messageHandler(Buffer.from(JSON.stringify(errorMessage)));

      expect(mockIo.emit).toHaveBeenCalledWith('connectionState', expect.any(Object));
    });

    it('should handle market data message', () => {
      const quoteMessage = {
        T: 'q',
        S: 'AAPL',
        bp: 100,
        bs: 100,
        ap: 101,
        as: 100,
        t: '2024-01-01T00:00:00Z',
        c: ['R'],
        z: 'A'
      };

      const mockWs = {
        on: jest.fn(),
        readyState: WebSocket.CLOSED,
        send: jest.fn()
      };

      MockWebSocket.mockImplementation(() => mockWs);

      webSocketManager.connectDataWebSocket();

      // Find the message handler
      const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
      
      // Simulate receiving quote message
      messageHandler(Buffer.from(JSON.stringify(quoteMessage)));

      expect(mockIo.emit).toHaveBeenCalledWith('marketUpdates', expect.any(Array));
    });
  });

  describe('subscribeToSymbols', () => {
    it('should subscribe to new symbols', () => {
      const mockWs = {
        on: jest.fn(),
        readyState: WebSocket.OPEN,
        send: jest.fn()
      };

      MockWebSocket.mockImplementation(() => mockWs);

      webSocketManager.connectDataWebSocket();
      webSocketManager.subscribeToSymbols(['AAPL', 'MSFT']);

      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('subscribe'));
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('AAPL'));
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('MSFT'));
    });

    it('should not subscribe if not authenticated', () => {
      const mockWs = {
        on: jest.fn(),
        readyState: WebSocket.OPEN,
        send: jest.fn()
      };

      MockWebSocket.mockImplementation(() => mockWs);

      webSocketManager.connectDataWebSocket();
      webSocketManager.subscribeToSymbols(['AAPL']);

      expect(mockWs.send).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clean up resources', () => {
      const mockWs = {
        on: jest.fn(),
        readyState: WebSocket.OPEN,
        close: jest.fn()
      };

      MockWebSocket.mockImplementation(() => mockWs);

      webSocketManager.connectDataWebSocket();
      webSocketManager.cleanup();

      expect(mockWs.close).toHaveBeenCalled();
    });
  });
}); 