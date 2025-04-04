import { Server } from 'socket.io';
import { WebSocket } from 'ws';
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
  private readonly config: AlpacaConfig;
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

  constructor(private readonly io: Server, config: AlpacaConfig) {
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
  }

  public connectDataWebSocket(): void {
    try {
      this.logger.info('Connecting to Alpaca Data WebSocket...');
      this.updateConnectionState('data', 'connecting');
      
      if (this.dataWS?.readyState === WebSocket.OPEN) {
        this.logger.warn('Data WebSocket already connected');
        this.updateConnectionState('data', 'connected');
        return;
      }

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
        this.updateMetrics('data', 'error');
        this.dataErrorHandler.handleError(error);
      });
      
      this.dataWS.on('close', () => {
        this.updateConnectionState('data', 'disconnected');
        this.handleClose('data');
      });
      
      this.dataWS.on('ping', () => this.handlePing());
      
    } catch (error) {
      this.logger.error('Failed to create data WebSocket connection', error as Error);
      this.updateMetrics('data', 'error');
      this.updateConnectionState('data', 'error');
      this.dataErrorHandler.handleError(error as Error);
    }
  }

  public connectTradingWebSocket(): void {
    try {
      this.logger.info('Connecting to Alpaca Trading WebSocket...');
      this.updateConnectionState('trading', 'connecting');
      
      if (this.tradingWS?.readyState === WebSocket.OPEN) {
        this.logger.warn('Trading WebSocket already connected');
        this.updateConnectionState('trading', 'connected');
        return;
      }

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
        this.updateMetrics('trading', 'error');
        this.tradingErrorHandler.handleError(error);
      });
      
      this.tradingWS.on('close', () => {
        this.updateConnectionState('trading', 'disconnected');
        this.handleClose('trading');
      });
      
      this.tradingWS.on('ping', () => this.handlePing());
      
    } catch (error) {
      this.logger.error('Failed to create trading WebSocket connection', error as Error);
      this.updateMetrics('trading', 'error');
      this.updateConnectionState('trading', 'error');
      this.tradingErrorHandler.handleError(error as Error);
    }
  }

  private authenticateDataStream(): void {
    if (!this.dataWS) return;

    const authMsg = {
      action: 'auth',
      key: this.config.alpaca.data.key,
      secret: this.config.alpaca.data.secret
    };
    
    this.logger.info('Sending data stream authentication...');
    this.dataWS.send(JSON.stringify(authMsg));
  }

  private authenticateTradingStream(): void {
    if (!this.tradingWS) return;

    const authMsg = {
      action: 'authenticate',
      data: {
        key_id: this.config.alpaca.trading.key,
        secret_key: this.config.alpaca.trading.secret
      }
    };
    
    this.logger.info('Sending trading stream authentication...');
    this.tradingWS.send(JSON.stringify(authMsg));
  }

  private handleDataMessage(data: Buffer): void {
    try {
      const message = JSON.parse(data.toString()) as AlpacaMessage;
      
      // Handle authentication response
      if (message.T === 'success' && message.message === 'authenticated') {
        this.isAuthenticated = true;
        this.updateConnectionState('data', 'authenticated');
        this.logger.info('Successfully authenticated with Alpaca data stream');
        return;
      }
      
      // Handle error messages
      if (message.T === 'error') {
        this.logger.error('Received error from Alpaca:', message);
        this.updateMetrics('data', 'error');
        const wsError = new WebSocketError(
          message.message,
          message.code,
          'data',
          { originalError: message }
        );
        this.dataErrorHandler.handleError(wsError);
        return;
      }
      
      // Process market data messages
      if (message.T === 'q' || message.T === 't' || message.T === 'b') {
        this.handleMarketData(message);
      }
    } catch (error) {
      this.logger.error('Error processing data message:', error as Error);
      this.updateMetrics('data', 'error');
      this.dataErrorHandler.handleError(error as Error);
    }
  }

  private handleMarketData(message: AlpacaMessage): void {
    switch (message.T) {
      case 'q':
        this.handleQuote(message as AlpacaQuote);
        break;
      case 't':
        this.handleTrade(message as AlpacaTrade);
        break;
      case 'b':
        this.handleBar(message as AlpacaBar);
        break;
    }
  }

  private handleQuote(quote: AlpacaQuote): void {
    const marketData: MarketData = {
      symbol: quote.S,
      timestamp: quote.t,
      bidPrice: quote.bp,
      askPrice: quote.ap,
      midPrice: (quote.bp + quote.ap) / 2,
      spread: quote.ap - quote.bp
    };

    this.latestData[quote.S] = marketData;
    this.dataProcessor.addMessage('quote', marketData);
  }

  private handleTrade(trade: AlpacaTrade): void {
    const tradeData: Trade = {
      symbol: trade.S,
      timestamp: trade.t,
      price: trade.p,
      size: trade.s
    };

    this.latestTrades.unshift(tradeData);
    if (this.latestTrades.length > this.config.data.maxTrades) {
      this.latestTrades.pop();
    }

    this.dataProcessor.addMessage('trade', tradeData);
  }

  private handleBar(bar: AlpacaBar): void {
    const barData: Bar = {
      symbol: bar.S,
      timestamp: bar.t,
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v
    };

    this.dataProcessor.addMessage('bar', barData);
  }

  private handleTradingMessage(data: Buffer): void {
    try {
      const msg = JSON.parse(data.toString());
      
      if (msg.stream === 'authorization' && msg.data?.status === 'authorized') {
        this.logger.info('Authentication successful for trading stream');
        this.subscribeToTradingUpdates();
      } else if (msg.stream === 'trade_updates') {
        this.io.emit('tradeUpdate', msg.data);
      }
    } catch (error) {
      this.logger.error('Error processing Trading WebSocket message', error as Error);
    }
  }

  private handleClose(stream: 'data' | 'trading'): void {
    this.logger.warn(`Disconnected from Alpaca ${stream} WebSocket`);
    
    if (stream === 'data') {
      this.isAuthenticated = false;
    }
    
    const wsError = new WebSocketError('Connection closed', 0, stream);
    if (stream === 'data') {
      this.dataErrorHandler.handleError(wsError);
    } else {
      this.tradingErrorHandler.handleError(wsError);
    }
  }

  private handlePing(): void {
    if (this.dataWS?.readyState === WebSocket.OPEN) {
      this.dataWS.pong();
    }
    if (this.tradingWS?.readyState === WebSocket.OPEN) {
      this.tradingWS.pong();
    }
  }

  private checkHealth(): void {
    const isHealthy = this.dataWS?.readyState === WebSocket.OPEN && 
                     this.tradingWS?.readyState === WebSocket.OPEN &&
                     this.isAuthenticated;
    
    const health: ConnectionHealth = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      dataStream: this.dataWS?.readyState === WebSocket.OPEN,
      tradingStream: this.tradingWS?.readyState === WebSocket.OPEN
    };
    
    this.io.emit('connectionHealth', health as unknown as Record<string, unknown>);
    
    if (!isHealthy) {
      this.logger.warn('Connection health check failed', health as unknown as Record<string, unknown>);
    }
  }

  private processMessageBatch(): void {
    if (this.dataProcessor.hasMessages()) {
      const batch = this.dataProcessor.processMessages();
      this.io.emit('marketUpdates', batch);
    }
  }

  private cleanupOldData(): void {
    if (this.latestTrades.length > this.config.data.maxTrades) {
      this.latestTrades = this.latestTrades.slice(-this.config.data.maxTrades);
    }
  }

  public subscribeToSymbols(symbols: string[]): void {
    if (!this.isAuthenticated) {
      this.logger.warn('Cannot subscribe: WebSocket not authenticated');
      return;
    }

    const newSymbols = symbols.filter(symbol => !this.subscriptions.has(symbol));
    if (newSymbols.length === 0) {
      return;
    }

    const subscribeMessage = {
      action: 'subscribe',
      trades: newSymbols,
      quotes: newSymbols,
      bars: newSymbols
    };

    this.logger.info(`Subscribing to symbols: ${newSymbols.join(', ')}`);
    this.dataWS?.send(JSON.stringify(subscribeMessage));
    
    newSymbols.forEach(symbol => this.subscriptions.add(symbol));
  }

  public unsubscribeFromSymbol(symbol: string): void {
    if (!this.subscriptions.has(symbol)) {
      this.logger.warn(`Not subscribed to ${symbol}`);
      return;
    }
    
    this.subscriptions.delete(symbol);
    this.logger.info(`Unsubscribing from ${symbol}`);
    
    if (this.dataWS?.readyState === WebSocket.OPEN && this.isAuthenticated) {
      const unsubscribeMsg = {
        action: 'unsubscribe',
        quotes: [symbol],
        trades: [symbol],
        bars: [symbol]
      };
      
      this.dataWS.send(JSON.stringify(unsubscribeMsg));
    }
  }

  public getLatestData(): Record<string, MarketData> {
    return this.latestData;
  }

  public getLatestTrades(): Trade[] {
    return this.latestTrades;
  }

  public getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  public isConnected(): boolean {
    return this.dataWS?.readyState === WebSocket.OPEN && 
           this.tradingWS?.readyState === WebSocket.OPEN &&
           this.isAuthenticated;
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
    this.dataErrorHandler.cleanup();
    this.tradingErrorHandler.cleanup();
    this.dataProcessor.cleanup();
  }

  private subscribeToTradingUpdates(): void {
    if (!this.tradingWS) return;
    
    const subscribeMsg = {
      action: 'subscribe',
      trades: ['*'],
      quotes: ['*'],
      bars: ['*']
    };
    
    this.logger.info('Subscribing to trading updates');
    this.tradingWS.send(JSON.stringify(subscribeMsg));
  }
} 