import { Server } from 'socket.io';
import WebSocket from 'ws';
import { 
  AlpacaConfig, 
  AlpacaMessage, 
  MarketData, 
  Trade, 
  Bar, 
  ConnectionHealth,
  AlpacaQuote,
  AlpacaTrade,
  AlpacaBar
} from './types/alpaca';
import Logger from './utils/logger';
import { ErrorHandler } from './utils/error-handler';
import { WebSocketError } from './utils/errors';
import { DataProcessor } from './utils/data-processor';
import { Config } from './types/config';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'authenticated' | 'error';

interface ConnectionMetrics {
  lastMessageTime: Date;
  messageCount: number;
  errorCount: number;
  latency: number;
  reconnectCount: number;
}

export class WebSocketManager {
  private readonly logger: Logger;
  private readonly config: Config;
  private dataWS: WebSocket | null = null;
  private tradingWS: WebSocket | null = null;
  private subscriptions = new Set<string>();
  private latestData: Record<string, MarketData> = {};
  private latestTrades: Trade[] = [];
  private isAuthenticated = false;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private readonly dataErrorHandler: ErrorHandler;
  private readonly tradingErrorHandler: ErrorHandler;
  private readonly dataProcessor: DataProcessor;
  
  // Connection state tracking
  private dataState: ConnectionState = 'disconnected';
  private tradingState: ConnectionState = 'disconnected';
  private dataMetrics: ConnectionMetrics = {
    lastMessageTime: new Date(),
    messageCount: 0,
    errorCount: 0,
    latency: 0,
    reconnectCount: 0
  };
  private tradingMetrics: ConnectionMetrics = {
    lastMessageTime: new Date(),
    messageCount: 0,
    errorCount: 0,
    latency: 0,
    reconnectCount: 0
  };

  constructor(private readonly io: Server, config: Config) {
    this.config = config;
    this.logger = new Logger('WebSocketManager');
    
    // Initialize error handlers
    this.dataErrorHandler = new ErrorHandler('data', {
      maxReconnectAttempts: config.websocket.maxReconnectAttempts,
      reconnectDelay: config.websocket.reconnectDelay,
      maxReconnectDelay: config.websocket.maxReconnectDelay
    });
    
    this.tradingErrorHandler = new ErrorHandler('trading', {
      maxReconnectAttempts: config.websocket.maxReconnectAttempts,
      reconnectDelay: config.websocket.reconnectDelay,
      maxReconnectDelay: config.websocket.maxReconnectDelay
    });

    // Initialize data processor
    this.dataProcessor = new DataProcessor(
      {
        maxBatchSize: config.websocket.batchSize,
        maxBatchDelay: config.websocket.batchInterval,
        maxQueueSize: config.websocket.maxQueueSize
      },
      {
        maxPrice: config.data.maxPrice,
        maxVolume: config.data.maxVolume,
        maxSpread: config.data.maxSpread,
        minPrice: config.data.minPrice,
        minVolume: config.data.minVolume
      },
      (batch) => {
        this.io.emit('marketUpdates', batch);
      }
    );

    // Set up error handler event listeners
    this.dataErrorHandler.on('reconnect', () => {
      this.dataMetrics.reconnectCount++;
      this.connectDataWebSocket();
    });
    this.dataErrorHandler.on('maxReconnectAttemptsReached', () => {
      this.logger.error('Max reconnection attempts reached for data stream');
      this.dataState = 'error';
      this.emitConnectionStateUpdate();
    });

    this.tradingErrorHandler.on('reconnect', () => {
      this.tradingMetrics.reconnectCount++;
      this.connectTradingWebSocket();
    });
    this.tradingErrorHandler.on('maxReconnectAttemptsReached', () => {
      this.logger.error('Max reconnection attempts reached for trading stream');
      this.tradingState = 'error';
      this.emitConnectionStateUpdate();
    });

    this.initializeTimers();

    // Register account update handlers
    this.io.on('accountUpdate', (data: any) => {
      console.log('Received account update:', data)
      this.logEvent('←', 'accountUpdate', data)
      // Always wrap the data in the success format
      this.notifySubscribers('accountUpdate', { success: true, account: data })
      this.notifySubscribers('accountInfo', { success: true, account: data })
    })

    this.io.on('accountInfo', (data: any) => {
      console.log('Received account info:', data)
      this.logEvent('←', 'accountInfo', data)
      // Always wrap the data in the success format
      this.notifySubscribers('accountInfo', { success: true, account: data })
      this.notifySubscribers('accountUpdate', { success: true, account: data })
    })
  }

  private emitConnectionStateUpdate(): void {
    this.io.emit('connectionState', {
      data: {
        state: this.dataState,
        metrics: this.dataMetrics
      },
      trading: {
        state: this.tradingState,
        metrics: this.tradingMetrics
      }
    });
  }

  private updateConnectionState(stream: 'data' | 'trading', state: ConnectionState): void {
    if (stream === 'data') {
      this.dataState = state;
    } else {
      this.tradingState = state;
    }
    this.emitConnectionStateUpdate();
  }

  private updateMetrics(stream: 'data' | 'trading', type: 'message' | 'error' | 'latency', value?: number): void {
    const metrics = stream === 'data' ? this.dataMetrics : this.tradingMetrics;
    metrics.lastMessageTime = new Date();

    switch (type) {
      case 'message':
        metrics.messageCount++;
        break;
      case 'error':
        metrics.errorCount++;
        break;
      case 'latency':
        if (value !== undefined) {
          metrics.latency = value;
        }
        break;
    }

    this.emitConnectionStateUpdate();
  }

  private initializeTimers(): void {
    // Health check interval
    this.healthCheckTimer = setInterval(() => this.checkHealth(), this.config.websocket.healthCheckInterval);
    
    // Message batching interval
    setInterval(() => this.processMessageBatch(), this.config.websocket.batchInterval);
    
    // Data cleanup interval
    setInterval(() => this.cleanupOldData(), this.config.data.cleanupInterval);

    // Account data update interval (every 5 seconds)
    setInterval(() => this.fetchAndEmitAccountData(), 5000);
  }

  public connectDataWebSocket(): void {
    try {
      this.logger.info('Connecting to Alpaca Data WebSocket...');
      this.updateConnectionState('data', 'connecting');
      
      if (this.dataWS && this.dataWS.readyState === 1) { // 1 = OPEN
        this.logger.warn('Data WebSocket already connected');
        this.updateConnectionState('data', 'connected');
        return;
      }

      this.logger.info('Creating new Data WebSocket connection to:', this.config.alpaca.data.wsUrl);
      this.dataWS = new WebSocket(this.config.alpaca.data.wsUrl);
      
      this.dataWS.on('open', () => {
        this.logger.info('Connected to Alpaca Data WebSocket');
        this.dataErrorHandler.resetReconnectAttempts();
        this.updateConnectionState('data', 'connected');
        this.authenticateDataStream();
      });
      
      this.dataWS.on('message', (data: Buffer) => {
        const startTime = Date.now();
        this.handleDataMessage(data);
        const latency = Date.now() - startTime;
        this.updateMetrics('data', 'message');
        this.updateMetrics('data', 'latency', latency);
      });
      
      this.dataWS.on('error', (error: Error) => {
        this.logger.error('Data WebSocket error:', {
          error: error.message,
          stack: error.stack,
          url: this.config.alpaca.data.wsUrl
        });
        this.dataErrorHandler.handleError(error);
        this.updateMetrics('data', 'error');
      });
      
      this.dataWS.on('close', (code: number, reason: string) => {
        this.logger.info('Data WebSocket closed:', { code, reason });
        this.updateConnectionState('data', 'disconnected');
        this.dataErrorHandler.handleDisconnect();
      });
    } catch (error) {
      this.logger.error('Error connecting to Data WebSocket:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        url: this.config.alpaca.data.wsUrl
      });
      this.dataErrorHandler.handleError(error);
    }
  }

  public connectTradingWebSocket(): void {
    try {
      this.logger.info('Connecting to Alpaca Trading WebSocket...');
      this.updateConnectionState('trading', 'connecting');
      
      if (this.tradingWS && this.tradingWS.readyState === 1) { // 1 = OPEN
        this.logger.warn('Trading WebSocket already connected');
        this.updateConnectionState('trading', 'connected');
        return;
      }

      this.logger.info('Creating new Trading WebSocket connection to:', this.config.alpaca.trading.wsUrl);
      this.tradingWS = new WebSocket(this.config.alpaca.trading.wsUrl);
      
      this.tradingWS.on('open', () => {
        this.logger.info('Connected to Alpaca Trading WebSocket');
        this.tradingErrorHandler.resetReconnectAttempts();
        this.updateConnectionState('trading', 'connected');
        this.authenticateTradingStream();
      });
      
      this.tradingWS.on('message', (data: Buffer) => {
        const startTime = Date.now();
        this.handleTradingMessage(data);
        const latency = Date.now() - startTime;
        this.updateMetrics('trading', 'message');
        this.updateMetrics('trading', 'latency', latency);
      });
      
      this.tradingWS.on('error', (error: Error) => {
        this.logger.error('Trading WebSocket error:', {
          error: error.message,
          stack: error.stack,
          url: this.config.alpaca.trading.wsUrl
        });
        this.tradingErrorHandler.handleError(error);
        this.updateMetrics('trading', 'error');
      });
      
      this.tradingWS.on('close', (code: number, reason: string) => {
        this.logger.info('Trading WebSocket closed:', { code, reason });
        this.updateConnectionState('trading', 'disconnected');
        this.tradingErrorHandler.handleDisconnect();
      });
    } catch (error) {
      this.logger.error('Error connecting to Trading WebSocket:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        url: this.config.alpaca.trading.wsUrl
      });
      this.tradingErrorHandler.handleError(error);
    }
  }

  private authenticateDataStream(): void {
    try {
      if (!this.dataWS || this.dataWS.readyState !== 1) { // 1 = OPEN
        this.logger.error('Cannot authenticate: Data WebSocket not connected');
        return;
      }

      const authMessage = {
        action: 'auth',
        key: this.config.alpaca.data.key,
        secret: this.config.alpaca.data.secret
      };

      this.logger.info('Authenticating Data WebSocket with API key:', this.config.alpaca.data.key);
      this.dataWS.send(JSON.stringify(authMessage));
    } catch (error) {
      this.logger.error('Error authenticating Data WebSocket:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      this.dataErrorHandler.handleError(error);
    }
  }

  private authenticateTradingStream(): void {
    try {
      if (!this.tradingWS || this.tradingWS.readyState !== 1) { // 1 = OPEN
        this.logger.error('Cannot authenticate: Trading WebSocket not connected');
        return;
      }

      const authMessage = {
        action: 'authenticate',
        data: {
          key_id: this.config.alpaca.trading.key,
          secret_key: this.config.alpaca.trading.secret
        }
      };

      this.logger.info('Authenticating Trading WebSocket with API key:', this.config.alpaca.trading.key);
      this.tradingWS.send(JSON.stringify(authMessage));
    } catch (error) {
      this.logger.error('Error authenticating Trading WebSocket:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      this.tradingErrorHandler.handleError(error);
    }
  }

  private isAlpacaMessage(message: unknown): message is AlpacaMessage {
    return (
      typeof message === 'object' &&
      message !== null &&
      'T' in message &&
      typeof (message as { T: unknown }).T === 'string'
    );
  }

  private handleDataMessage(data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());
      
      if (this.isAlpacaMessage(message)) {
        const messageType = message.T;
        switch (messageType) {
          case 't':
            this.handleTradeMessage(message as AlpacaTrade);
            break;
          case 'q':
            this.handleQuoteMessage(message as AlpacaQuote);
            break;
          case 'b':
            this.handleBarMessage(message as AlpacaBar);
            break;
          case 'error':
            this.dataErrorHandler.handleError(message);
            break;
          case 'success':
            this.logger.info('Success message received:', message.message);
            break;
          case 'subscription':
            this.logger.info('Subscription update received:', JSON.stringify(message));
            break;
          default:
            this.logger.warn('Unknown message type:', messageType);
        }
      }
    } catch (error) {
      this.dataErrorHandler.handleError(error);
    }
  }

  private handleTradingMessage(data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());
      
      if (this.isAlpacaMessage(message)) {
        const messageType = message.T;
        switch (messageType) {
          case 't':
            this.handleTradeMessage(message as AlpacaTrade);
            break;
          case 'q':
            this.handleQuoteMessage(message as AlpacaQuote);
            break;
          case 'b':
            this.handleBarMessage(message as AlpacaBar);
            break;
          case 'error':
            this.tradingErrorHandler.handleError(message);
            break;
          case 'success':
            this.logger.info('Success message received:', message.message);
            break;
          case 'subscription':
            this.logger.info('Subscription update received:', JSON.stringify(message));
            break;
          default:
            this.logger.warn('Unknown message type:', messageType);
        }
      }
    } catch (error) {
      this.tradingErrorHandler.handleError(error);
    }
  }

  private handleTradeMessage(trade: AlpacaTrade): void {
    const marketData: Trade = {
      symbol: trade.S,
      price: trade.p,
      size: trade.s,
      timestamp: trade.t
    };

    this.dataProcessor.addMessage('trade', marketData);
  }

  private handleQuoteMessage(quote: AlpacaQuote): void {
    const marketData: MarketData = {
      symbol: quote.S,
      bidPrice: quote.bp,
      askPrice: quote.ap,
      timestamp: quote.t,
      midPrice: (quote.bp + quote.ap) / 2,
      spread: quote.ap - quote.bp
    };

    this.dataProcessor.addMessage('quote', marketData);
  }

  private handleBarMessage(bar: AlpacaBar): void {
    const marketData: Bar = {
      symbol: bar.S,
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
      timestamp: bar.t
    };

    this.dataProcessor.addMessage('bar', marketData);
  }

  private handleOrderMessage(message: any): void {
    // Handle order updates
    this.io.emit('orderUpdate', message);
  }

  private processMessageBatch(): void {
    if (this.dataProcessor.hasMessages()) {
      this.dataProcessor.processMessages();
    }
  }

  private cleanupOldData(): void {
    const now = new Date();
    const cutoff = new Date(now.getTime() - this.config.data.maxAge);
    
    for (const symbol in this.latestData) {
      if (new Date(this.latestData[symbol].timestamp) < cutoff) {
        delete this.latestData[symbol];
      }
    }
    
    // Clean up the data processor
    this.dataProcessor.cleanup();
  }

  private checkHealth(): void {
    const now = new Date();
    const dataTimeout = new Date(now.getTime() - this.config.websocket.healthCheckTimeout);
    const tradingTimeout = new Date(now.getTime() - this.config.websocket.healthCheckTimeout);
    
    if (this.dataState === 'connected' && this.dataMetrics.lastMessageTime < dataTimeout) {
      this.dataErrorHandler.handleError(new WebSocketError('Health check timeout', 408, 'data'));
    }
    
    if (this.tradingState === 'connected' && this.tradingMetrics.lastMessageTime < tradingTimeout) {
      this.tradingErrorHandler.handleError(new WebSocketError('Health check timeout', 408, 'trading'));
    }
  }

  public subscribeToSymbols(symbols: string[]): void {
    if (!this.dataWS || this.dataWS.readyState !== WebSocket.OPEN) {
      this.logger.warn('Cannot subscribe: Data WebSocket not connected');
      return;
    }
    
    const subscribeMessage = {
      action: 'subscribe',
      trades: symbols,
      quotes: symbols,
      bars: symbols
    };
    
    this.dataWS.send(JSON.stringify(subscribeMessage));
    
    symbols.forEach(symbol => {
      this.subscriptions.add(symbol);
    });
  }

  public unsubscribeFromSymbol(symbol: string): void {
    if (!this.dataWS || this.dataWS.readyState !== WebSocket.OPEN) {
      this.logger.warn('Cannot unsubscribe: Data WebSocket not connected');
      return;
    }
    
    const unsubscribeMessage = {
      action: 'unsubscribe',
      trades: [symbol],
      quotes: [symbol],
      bars: [symbol]
    };
    
    this.dataWS.send(JSON.stringify(unsubscribeMessage));
    
    this.subscriptions.delete(symbol);
  }

  public cleanup(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    if (this.dataWS) {
      this.dataWS.close();
    }
    
    if (this.tradingWS) {
      this.tradingWS.close();
    }
  }

  public destroy(): void {
    if (this.dataWS) {
      this.dataWS.close();
    }
    if (this.tradingWS) {
      this.tradingWS.close();
    }
    this.dataProcessor.cleanup();
    this.dataErrorHandler.cleanup();
    this.tradingErrorHandler.cleanup();
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }

  private async fetchAndEmitAccountData(): Promise<void> {
    try {
      this.logger.info('Fetching account data...')
      const response = await fetch(`${this.config.alpaca.trading.url}/v2/account`, {
        headers: {
          'APCA-API-KEY-ID': this.config.alpaca.trading.key,
          'APCA-API-SECRET-KEY': this.config.alpaca.trading.secret
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch account data: ${response.statusText}`);
      }

      const accountData = await response.json();
      this.logger.info('Account data fetched:', {
        unrealized_pl: accountData.unrealized_pl,
        equity: accountData.equity,
        last_equity: accountData.last_equity,
        position_market_value: accountData.position_market_value
      })
      
      // Always emit in the same format
      const wrappedData = { success: true, account: accountData }
      this.io.emit('accountUpdate', wrappedData);
      this.io.emit('accountInfo', wrappedData);
      
      this.logger.info('Account updates emitted')
    } catch (error) {
      this.logger.error('Error fetching account data:', error);
      this.io.emit('accountUpdate', { success: false, error: 'Failed to fetch account data' });
    }
  }

  private logEvent(direction: '←' | '→', event: string, data: any): void {
    this.logger.info(`${direction} ${event}`, data);
  }

  private notifySubscribers(event: string, data: any): void {
    this.io.emit(event, data);
  }
} 