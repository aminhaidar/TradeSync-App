export interface AlpacaConfig {
  isProduction: boolean;
  port: number;
  alpaca: {
    trading: {
      url: string;
      wsUrl: string;
      key: string;
      secret: string;
    };
    data: {
      wsUrl: string;
      key: string;
      secret: string;
    };
  };
  websocket: {
    maxReconnectAttempts: number;
    reconnectDelay: number;
    maxReconnectDelay: number;
    batchInterval: number;
    healthCheckInterval: number;
    healthCheckTimeout: number;
    batchSize: number;
    maxQueueSize: number;
  };
  data: {
    maxTrades: number;
    cleanupInterval: number;
    maxAge: number;
    maxPrice: number;
    maxVolume: number;
    maxSpread: number;
    minPrice: number;
    minVolume: number;
  };
}

export interface AlpacaQuote {
  T: 'q';
  S: string;  // Symbol
  bp: number; // Bid Price
  bs: number; // Bid Size
  ap: number; // Ask Price
  as: number; // Ask Size
  t: string;  // Timestamp
  c: string[]; // Condition
  z: string;  // Tape
}

export interface AlpacaTrade {
  T: 't';
  S: string;  // Symbol
  p: number;  // Price
  s: number;  // Size
  t: string;  // Timestamp
  c: string[]; // Condition
  z: string;  // Tape
}

export interface AlpacaBar {
  T: 'b';
  S: string;  // Symbol
  o: number;  // Open
  h: number;  // High
  l: number;  // Low
  c: number;  // Close
  v: number;  // Volume
  t: string;  // Timestamp
  n: number;  // Number of trades
  vw: number; // Volume weighted average price
}

export interface BaseError {
  message: string;
  code: number;
  name?: string;
}

export interface AlpacaErrorMessage extends BaseError {
  T: 'error';
  name: string;
}

export interface AlpacaSuccess {
  T: 'success';
  message: string;
}

export interface AlpacaSubscription {
  T: 'subscription';
  trades: string[];
  quotes: string[];
  bars: string[];
  updatedBars: string[];
  dailyBars: string[];
  statuses: string[];
  lulds: string[];
  corrections: string[];
  cancelErrors: string[];
}

export type AlpacaMessage = 
  | AlpacaQuote 
  | AlpacaTrade 
  | AlpacaBar 
  | AlpacaErrorMessage 
  | AlpacaSuccess 
  | AlpacaSubscription;

export interface MarketData {
  symbol: string;
  bidPrice: number;
  askPrice: number;
  timestamp: string;
  midPrice: number;
  spread: number;
}

export interface Trade {
  symbol: string;
  price: number;
  size: number;
  timestamp: string;
}

export interface Bar {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: string;
}

export interface MarketUpdate {
  type: 'quote' | 'trade' | 'bar';
  data: MarketData | Trade | Bar;
}

export interface ConnectionHealth {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  dataStream: boolean;
  tradingStream: boolean;
} 