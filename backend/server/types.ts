import { Server } from 'socket.io';

export interface MarketData {
  symbol: string;
  price: number;
  timestamp: number;
}

export interface Position {
  symbol: string;
  qty: number;
  avg_entry_price: number;
  current_price: number;
  market_value: number;
  unrealized_pl: number;
  unrealized_plpc: number;
}

export interface AccountInfo {
  cash: number;
  equity: number;
  buying_power: number;
  positions: Position[];
}

export interface AlpacaAccount {
  cash: string;
  equity: string;
  buying_power: string;
}

export interface AlpacaPosition {
  symbol: string;
  qty: string;
  avg_entry_price: string;
  current_price: string;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
}

export interface WebSocketManager {
  getAccountInfo(): Promise<AccountInfo>;
  subscribeToSymbols(symbols: string[]): Promise<void>;
  unsubscribeFromSymbols(symbols: string[]): void;
}

export interface WebSocketManagerConstructor {
  new (io: Server, config: Config): WebSocketManager;
}

export interface Config {
  // Server Configuration
  port: string;
  nodeEnv: string;

  // Database Configuration
  databaseUrl: string;

  // Alpaca API Configuration
  alpacaApiKey: string;
  alpacaApiSecret: string;
  alpacaTradingUrl: string;
  alpacaTradingWsUrl: string;
  alpacaDataUrl: string;
  alpacaDataWsUrl: string;

  // WebSocket Configuration
  wsMaxReconnectAttempts: number;
  wsReconnectDelay: number;
  wsMaxReconnectDelay: number;
  wsBatchInterval: number;
  wsHealthCheckInterval: number;
  wsBatchSize: number;
  wsMaxQueueSize: number;
} 