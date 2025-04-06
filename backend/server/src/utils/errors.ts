import { BaseError } from '../types/alpaca';

export class AlpacaError extends Error implements BaseError {
  constructor(
    message: string,
    public readonly code: number,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AlpacaError';
  }
}

export class WebSocketError extends Error implements BaseError {
  constructor(
    message: string,
    public readonly code: number,
    public readonly stream: 'data' | 'trading',
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'WebSocketError';
  }
}

export class AuthenticationError extends AlpacaError {
  constructor(message: string = 'Authentication failed', context?: Record<string, unknown>) {
    super(message, 401, context);
    this.name = 'AuthenticationError';
  }
}

export class SubscriptionError extends AlpacaError {
  constructor(message: string = 'Subscription limit exceeded', context?: Record<string, unknown>) {
    super(message, 405, context);
    this.name = 'SubscriptionError';
  }
}

export class ConnectionLimitError extends AlpacaError {
  constructor(message: string = 'Connection limit exceeded', context?: Record<string, unknown>) {
    super(message, 406, context);
    this.name = 'ConnectionLimitError';
  }
} 