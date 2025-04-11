import Logger from './logger';
import { EventEmitter } from 'events';
import { AlpacaErrorMessage } from '../types/alpaca';
import { 
  WebSocketError, 
  AuthenticationError, 
  SubscriptionError, 
  ConnectionLimitError 
} from './errors';

type ErrorInput = Error | AlpacaErrorMessage | unknown;

export class ErrorHandler extends EventEmitter {
  private readonly logger: Logger;
  private readonly maxReconnectAttempts: number;
  private readonly reconnectDelay: number;
  private readonly maxReconnectDelay: number;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly stream: 'data' | 'trading',
    config: {
      maxReconnectAttempts: number;
      reconnectDelay: number;
      maxReconnectDelay: number;
    }
  ) {
    super();
    this.logger = new Logger('ErrorHandler');
    this.maxReconnectAttempts = config.maxReconnectAttempts;
    this.reconnectDelay = config.reconnectDelay;
    this.maxReconnectDelay = config.maxReconnectDelay;
  }

  public handleError(error: ErrorInput): void {
    const wsError = this.normalizeError(error);
    this.logger.error(`WebSocket error in ${this.stream} stream:`, wsError);

    if (wsError instanceof AuthenticationError) {
      this.handleAuthenticationError();
    } else if (wsError instanceof SubscriptionError) {
      this.handleSubscriptionError();
    } else if (wsError instanceof ConnectionLimitError) {
      this.handleConnectionLimitError();
    } else {
      this.handleGenericError(wsError);
    }
  }

  private normalizeError(error: ErrorInput): WebSocketError {
    if (error instanceof WebSocketError) {
      return error;
    }

    if (error instanceof Error) {
      // Try to extract error code from error message
      const codeMatch = error.message.match(/code: (\d+)/);
      const code = codeMatch ? parseInt(codeMatch[1], 10) : 500;

      return new WebSocketError(
        error.message,
        code,
        this.stream,
        { originalError: error }
      );
    }

    // Handle Alpaca error messages
    if (
      typeof error === 'object' && 
      error !== null && 
      'T' in error && 
      (error as AlpacaErrorMessage).T === 'error' &&
      'code' in error &&
      'message' in error
    ) {
      const alpacaError = error as AlpacaErrorMessage;
      
      // Create appropriate error type based on code
      switch (alpacaError.code) {
        case 401:
        case 402:
          return new WebSocketError(
            alpacaError.message,
            alpacaError.code,
            this.stream,
            { originalError: alpacaError, type: 'authentication' }
          );
        case 405:
          return new WebSocketError(
            alpacaError.message,
            alpacaError.code,
            this.stream,
            { originalError: alpacaError, type: 'subscription' }
          );
        case 406:
          return new WebSocketError(
            alpacaError.message,
            alpacaError.code,
            this.stream,
            { originalError: alpacaError, type: 'connection_limit' }
          );
        default:
          return new WebSocketError(
            alpacaError.message,
            alpacaError.code,
            this.stream,
            { originalError: alpacaError }
          );
      }
    }

    // Handle unknown error type
    return new WebSocketError(
      String(error),
      500,
      this.stream,
      { originalError: error }
    );
  }

  private handleAuthenticationError(): void {
    this.logger.error('Authentication failed. Please check your API credentials.');
    this.scheduleReconnect();
  }

  private handleSubscriptionError(): void {
    this.logger.error('Subscription limit exceeded. Please reduce the number of subscriptions.');
    this.scheduleReconnect();
  }

  private handleConnectionLimitError(): void {
    this.logger.error('Connection limit exceeded. Please wait before reconnecting.');
    this.scheduleReconnect();
  }

  private handleGenericError(error: WebSocketError): void {
    this.logger.error('Unexpected error occurred:', error);
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
        this.maxReconnectDelay
      );

      this.logger.info(
        `Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`
      );

      this.reconnectTimer = setTimeout(() => {
        this.emit('reconnect', this.stream);
      }, delay);
    } else {
      this.logger.error('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached', this.stream);
    }
  }

  public resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
  }

  public handleDisconnect(): void {
    this.logger.info(`WebSocket disconnected in ${this.stream} stream`);
    this.scheduleReconnect();
  }
} 