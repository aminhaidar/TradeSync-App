export interface AlpacaConfig {
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
}

export interface WebSocketConfig {
  maxReconnectAttempts: number;
  reconnectDelay: number;
  maxReconnectDelay: number;
  batchInterval: number;
  healthCheckInterval: number;
  batchSize: number;
  maxQueueSize: number;
}

export interface DataConfig {
  maxTrades: number;
  cleanupInterval: number;
  maxPrice: number;
  maxVolume: number;
  maxSpread: number;
  minPrice: number;
  minVolume: number;
}

export interface Config {
  isProduction: boolean;
  port: number;
  alpaca: AlpacaConfig;
  websocket: WebSocketConfig;
  data: DataConfig;
}

declare const config: Config;
export { config }; 