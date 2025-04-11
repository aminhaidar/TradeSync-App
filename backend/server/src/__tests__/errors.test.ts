import {
  WebSocketError,
  AuthenticationError,
  SubscriptionError,
  ConnectionLimitError,
  AlpacaError
} from '../utils/errors';

describe('Custom Errors', () => {
  describe('WebSocketError', () => {
    it('should create a WebSocketError with basic properties', () => {
      const error = new WebSocketError('Test error', 500, 'data');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(500);
      expect(error.stream).toBe('data');
      expect(error.name).toBe('WebSocketError');
    });

    it('should create a WebSocketError with additional context', () => {
      const originalError = new Error('Original error');
      const error = new WebSocketError('Test error', 500, 'data', {
        originalError,
        type: 'authentication'
      });
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(500);
      expect(error.stream).toBe('data');
      expect(error.context?.originalError).toBe(originalError);
      expect(error.context?.type).toBe('authentication');
    });
  });

  describe('AuthenticationError', () => {
    it('should create an AuthenticationError', () => {
      const error = new AuthenticationError();
      
      expect(error.message).toBe('Authentication failed');
      expect(error.code).toBe(401);
      expect(error.name).toBe('AuthenticationError');
      expect(error instanceof AlpacaError).toBe(true);
    });

    it('should create an AuthenticationError with custom message', () => {
      const error = new AuthenticationError('Custom auth error');
      
      expect(error.message).toBe('Custom auth error');
      expect(error.code).toBe(401);
      expect(error.name).toBe('AuthenticationError');
    });
  });

  describe('SubscriptionError', () => {
    it('should create a SubscriptionError', () => {
      const error = new SubscriptionError();
      
      expect(error.message).toBe('Subscription limit exceeded');
      expect(error.code).toBe(405);
      expect(error.name).toBe('SubscriptionError');
      expect(error instanceof AlpacaError).toBe(true);
    });

    it('should create a SubscriptionError with custom message', () => {
      const error = new SubscriptionError('Custom sub error');
      
      expect(error.message).toBe('Custom sub error');
      expect(error.code).toBe(405);
      expect(error.name).toBe('SubscriptionError');
    });
  });

  describe('ConnectionLimitError', () => {
    it('should create a ConnectionLimitError', () => {
      const error = new ConnectionLimitError();
      
      expect(error.message).toBe('Connection limit exceeded');
      expect(error.code).toBe(406);
      expect(error.name).toBe('ConnectionLimitError');
      expect(error instanceof AlpacaError).toBe(true);
    });

    it('should create a ConnectionLimitError with custom message', () => {
      const error = new ConnectionLimitError('Custom conn error');
      
      expect(error.message).toBe('Custom conn error');
      expect(error.code).toBe(406);
      expect(error.name).toBe('ConnectionLimitError');
    });
  });

  describe('AlpacaError', () => {
    it('should create an AlpacaError with basic properties', () => {
      const error = new AlpacaError('Test error', 500);
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(500);
      expect(error.name).toBe('AlpacaError');
    });

    it('should create an AlpacaError with additional context', () => {
      const error = new AlpacaError('Test error', 500, {
        field: 'price',
        value: -1
      });
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(500);
      expect(error.context).toEqual({
        field: 'price',
        value: -1
      });
    });
  });
}); 