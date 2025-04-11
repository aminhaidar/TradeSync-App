import { Server, Socket } from 'socket.io';
import AlpacaClient from '@alpacahq/alpaca-trade-api';
import { WebSocket } from 'ws';
import { Config } from './src/types/config';
import { MarketData, AlpacaMessage } from './src/types/alpaca';
import { Logger } from './src/utils/logger';

interface AccountInfo {
  cash: number;
  equity: number;
  buying_power: number;
  positions: {
    symbol: string;
    qty: number;
    avg_entry_price: number;
    current_price: number;
    market_value: number;
    unrealized_pl: number;
    unrealized_plpc: number;
  }[];
}

interface AlpacaAccount {
  cash: string;
  equity: string;
  buying_power: string;
  unrealized_pl: string;
  last_equity: string;
  position_market_value: string;
}

interface AlpacaPosition {
  symbol: string;
  qty: string;
  avg_entry_price: string;
  current_price: string;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
}

export class WebSocketManager {
  private io: Server;
  private config: Config;
  private alpacaClient: AlpacaClient;
  private alpacaWebSocket: WebSocket | null = null;
  private subscribedSymbols: Set<string> = new Set();
  private reconnectAttempts: number = 0;
  private logger: Logger;

  constructor(io: Server, config: Config) {
    this.io = io;
    this.config = config;
    this.logger = new Logger('WebSocketManager');
    this.alpacaClient = new AlpacaClient({
      keyId: this.config.alpaca.trading.key,
      secretKey: this.config.alpaca.trading.secret,
      paper: !this.config.isProduction,
      baseUrl: this.config.alpaca.trading.url
    });

    this.setupSocketHandlers();
  }

  private logEvent(direction: string, event: string, data: any): void {
    this.logger.info(`${direction} ${event}`, data);
  }

  private notifySubscribers(event: string, data: any): void {
    this.io.emit(event, data);
  }

  private connectWebSocket(): void {
    if (this.alpacaWebSocket) {
      this.alpacaWebSocket.close();
    }

    this.alpacaWebSocket = new WebSocket(this.config.alpaca.data.wsUrl);

    this.alpacaWebSocket.on('open', () => {
      this.logger.info('Connected to Alpaca WebSocket');
      this.reconnectAttempts = 0;
      this.resubscribeToSymbols();
    });

    this.alpacaWebSocket.on('close', () => {
      this.logger.info('Disconnected from Alpaca WebSocket');
      this.handleReconnect();
    });

    this.alpacaWebSocket.on('error', (error) => {
      this.logger.error('WebSocket error:', error);
      this.handleReconnect();
    });

    this.alpacaWebSocket.on('message', (data: string) => {
      try {
        const marketData = JSON.parse(data) as AlpacaMessage;
        if (marketData.T === 't' && 'S' in marketData && this.subscribedSymbols.has(marketData.S)) {
          const transformedData: MarketData = {
            symbol: marketData.S,
            bidPrice: 0,
            askPrice: 0,
            timestamp: marketData.t,
            midPrice: marketData.p,
            spread: 0
          };
          this.io.emit('marketData', transformedData);
        }
      } catch (error) {
        this.logger.error('Error processing market data:', error);
      }
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.config.websocket.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(
        this.config.websocket.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
        this.config.websocket.maxReconnectDelay
      );
      this.logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connectWebSocket(), delay);
    } else {
      this.logger.error('Max reconnection attempts reached');
    }
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.logger.info('Client connected');

      socket.on('subscribe', (symbol: string) => {
        this.subscribeToSymbol(symbol);
      });

      socket.on('unsubscribe', (symbol: string) => {
        this.unsubscribeFromSymbol(symbol);
      });

      socket.on('disconnect', () => {
        this.logger.info('Client disconnected');
      });
    });
  }

  public subscribeToSymbol(symbol: string): void {
    if (!this.subscribedSymbols.has(symbol)) {
      this.subscribedSymbols.add(symbol);
      if (this.alpacaWebSocket && this.alpacaWebSocket.readyState === WebSocket.OPEN) {
        this.alpacaWebSocket.send(JSON.stringify({
          action: 'subscribe',
          trades: [symbol]
        }));
      }
    }
  }

  public unsubscribeFromSymbol(symbol: string): void {
    if (this.subscribedSymbols.has(symbol)) {
      this.subscribedSymbols.delete(symbol);
      if (this.alpacaWebSocket && this.alpacaWebSocket.readyState === WebSocket.OPEN) {
        this.alpacaWebSocket.send(JSON.stringify({
          action: 'unsubscribe',
          trades: [symbol]
        }));
      }
    }
  }

  private resubscribeToSymbols(): void {
    if (this.alpacaWebSocket && this.alpacaWebSocket.readyState === WebSocket.OPEN) {
      const symbols = Array.from(this.subscribedSymbols);
      if (symbols.length > 0) {
        this.alpacaWebSocket.send(JSON.stringify({
          action: 'subscribe',
          trades: symbols
        }));
      }
    }
  }

  public async getAccountInfo(): Promise<AccountInfo> {
    try {
      const account = await this.alpacaClient.getAccount() as unknown as AlpacaAccount;
      const positions = await this.alpacaClient.getPositions() as unknown as AlpacaPosition[];

      return {
        cash: parseFloat(account.cash),
        equity: parseFloat(account.equity),
        buying_power: parseFloat(account.buying_power),
        positions: positions.map((pos) => ({
          symbol: pos.symbol,
          qty: parseFloat(pos.qty),
          avg_entry_price: parseFloat(pos.avg_entry_price),
          current_price: parseFloat(pos.current_price),
          market_value: parseFloat(pos.market_value),
          unrealized_pl: parseFloat(pos.unrealized_pl),
          unrealized_plpc: parseFloat(pos.unrealized_plpc)
        }))
      };
    } catch (error) {
      this.logger.error('Error fetching account info:', error);
      throw error;
    }
  }
}