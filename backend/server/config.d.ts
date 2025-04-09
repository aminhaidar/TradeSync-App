interface Config {
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
  };
  data: {
    maxTrades: number;
    cleanupInterval: number;
  };
}

declare const config: Config;
export default config; 