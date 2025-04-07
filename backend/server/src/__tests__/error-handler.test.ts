import { ErrorHandler } from '../utils/error-handler';
import { WebSocketError } from '../utils/errors';
import { AlpacaErrorMessage } from '../types/alpaca';
import Logger from '../utils/logger';

// Mock the Logger class
const mockLoggerInstance = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

jest.mock('../utils/logger', () => {
  return jest.fn().mockImplementation(() => mockLoggerInstance);
});

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  const mockConfig = {
    maxReconnectAttempts: 3,
    reconnectDelay: 1000,
    maxReconnectDelay: 5000
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    errorHandler = new ErrorHandler('data', mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Error Handling', () => {
    it('should handle WebSocketError directly', () => {
      const wsError = new WebSocketError('Test error', 500, 'data');
      const reconnectSpy = jest.spyOn(errorHandler as any, 'scheduleReconnect');

      errorHandler.handleError(wsError);

      expect(mockLoggerInstance.error).toHaveBeenCalled();
      expect(reconnectSpy).toHaveBeenCalled();
    });

    it('should handle standard Error objects', () => {
      const error = new Error('Test error');
      const reconnectSpy = jest.spyOn(errorHandler as any, 'scheduleReconnect');

      errorHandler.handleError(error);

      expect(mockLoggerInstance.error).toHaveBeenCalled();
      expect(reconnectSpy).toHaveBeenCalled();
    });

    it('should handle Alpaca error messages', () => {
      const alpacaError: AlpacaErrorMessage = {
        T: 'error',
        code: 401,
        message: 'Authentication failed',
        name: 'AuthenticationError'
      };
      const reconnectSpy = jest.spyOn(errorHandler as any, 'scheduleReconnect');

      errorHandler.handleError(alpacaError);

      expect(mockLoggerInstance.error).toHaveBeenCalled();
      expect(reconnectSpy).toHaveBeenCalled();
    });

    it('should handle unknown error types', () => {
      const unknownError = { foo: 'bar' };
      const reconnectSpy = jest.spyOn(errorHandler as any, 'scheduleReconnect');

      errorHandler.handleError(unknownError);

      expect(mockLoggerInstance.error).toHaveBeenCalled();
      expect(reconnectSpy).toHaveBeenCalled();
    });
  });

  describe('Specific Error Types', () => {
    it('should handle authentication errors', () => {
      const authError = new WebSocketError('Auth failed', 401, 'data', { type: 'authentication' });
      const reconnectSpy = jest.spyOn(errorHandler as any, 'scheduleReconnect');

      errorHandler.handleError(authError);

      expect(mockLoggerInstance.error).toHaveBeenCalledWith('WebSocket error in data stream:', authError);
      expect(reconnectSpy).toHaveBeenCalled();
    });

    it('should handle subscription errors', () => {
      const subError = new WebSocketError('Sub limit exceeded', 405, 'data', { type: 'subscription' });
      const reconnectSpy = jest.spyOn(errorHandler as any, 'scheduleReconnect');

      errorHandler.handleError(subError);

      expect(mockLoggerInstance.error).toHaveBeenCalledWith('WebSocket error in data stream:', subError);
      expect(reconnectSpy).toHaveBeenCalled();
    });

    it('should handle connection limit errors', () => {
      const connError = new WebSocketError('Conn limit exceeded', 406, 'data', { type: 'connection_limit' });
      const reconnectSpy = jest.spyOn(errorHandler as any, 'scheduleReconnect');

      errorHandler.handleError(connError);

      expect(mockLoggerInstance.error).toHaveBeenCalledWith('WebSocket error in data stream:', connError);
      expect(reconnectSpy).toHaveBeenCalled();
    });
  });

  describe('Reconnection Logic', () => {
    it('should schedule reconnect with exponential backoff', () => {
      const error = new Error('Test error');
      const reconnectListener = jest.fn();
      errorHandler.on('reconnect', reconnectListener);

      errorHandler.handleError(error);
      const timeoutCalls = jest.getTimerCount();
      expect(timeoutCalls).toBe(1);

      // Run all pending timers
      jest.runAllTimers();
      expect(reconnectListener).toHaveBeenCalledWith('data');

      // Second attempt should use exponential backoff
      errorHandler.handleError(error);
      const secondTimeoutCalls = jest.getTimerCount();
      expect(secondTimeoutCalls).toBe(1);
    });

    it('should respect max reconnect attempts', () => {
      const error = new Error('Test error');
      const maxAttemptsListener = jest.fn();
      errorHandler.on('maxReconnectAttemptsReached', maxAttemptsListener);

      // Exhaust all reconnect attempts
      for (let i = 0; i <= mockConfig.maxReconnectAttempts; i++) {
        errorHandler.handleError(error);
        jest.runAllTimers();
      }

      expect(maxAttemptsListener).toHaveBeenCalledWith('data');
      expect(mockLoggerInstance.error).toHaveBeenCalledWith('Max reconnection attempts reached');
    });

    it('should respect max reconnect delay', () => {
      // Create a new error handler with higher max attempts for this test
      const testConfig = {
        maxReconnectAttempts: 10,
        reconnectDelay: 1000,
        maxReconnectDelay: 5000
      };
      const localErrorHandler = new ErrorHandler('data', testConfig);
      const error = new Error('Test error');
      const reconnectListener = jest.fn();
      localErrorHandler.on('reconnect', reconnectListener);

      // Force multiple reconnects to test delay capping
      for (let i = 0; i < 5; i++) {
        localErrorHandler.handleError(error);
        jest.runAllTimers();
      }

      // Verify that the reconnect was called the expected number of times
      expect(reconnectListener).toHaveBeenCalledTimes(5);

      // Trigger one more error to check the delay
      jest.spyOn(global, 'setTimeout');
      localErrorHandler.handleError(error);

      // The delay should be capped at maxReconnectDelay
      expect(setTimeout).toHaveBeenLastCalledWith(
        expect.any(Function),
        testConfig.maxReconnectDelay
      );
    });
  });

  describe('Cleanup and Reset', () => {
    it('should reset reconnect attempts', () => {
      const error = new Error('Test error');
      errorHandler.handleError(error);
      jest.advanceTimersByTime(mockConfig.reconnectDelay);

      errorHandler.resetReconnectAttempts();
      errorHandler.handleError(error);

      const timeoutCalls = jest.getTimerCount();
      expect(timeoutCalls).toBe(1);
    });

    it('should cleanup timers', () => {
      const error = new Error('Test error');
      errorHandler.handleError(error);

      errorHandler.cleanup();
      const timeoutCalls = jest.getTimerCount();
      expect(timeoutCalls).toBe(0);
    });
  });

  describe('Disconnect Handling', () => {
    it('should handle disconnects', () => {
      const reconnectSpy = jest.spyOn(errorHandler as any, 'scheduleReconnect');
      
      errorHandler.handleDisconnect();

      expect(mockLoggerInstance.info).toHaveBeenCalledWith('WebSocket disconnected in data stream');
      expect(reconnectSpy).toHaveBeenCalled();
    });
  });
}); 