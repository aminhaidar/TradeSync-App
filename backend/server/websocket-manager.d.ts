import { Server as SocketIOServer } from 'socket.io';
import { Socket } from 'socket.io';

export default class WebSocketManager {
  constructor(io: SocketIOServer);
  connectDataWebSocket(): void;
  connectTradingWebSocket(): void;
  authenticateDataStream(): void;
  authenticateTradingStream(): void;
  handleDataMessage(data: any): void;
  handleTradingMessage(data: any): void;
  handleQuote(msg: any): void;
  handleTrade(msg: any): void;
  handleBar(msg: any): void;
  subscribeToSymbols(): void;
  subscribeToTradingUpdates(): void;
  subscribeToSymbol(symbol: string): void;
  unsubscribeFromSymbol(symbol: string): void;
  handleError(error: Error, stream: string): void;
  handleAlpacaError(error: any): void;
  handleClose(stream: string): void;
  startDataCleanup(): void;
  startMessageBatching(): void;
  startHealthMonitoring(): void;
  startFrequentUpdates(): void;
  getLatestData(): Record<string, any>;
  getLatestTrades(): any[];
  getSubscriptions(): string[];
  isConnected(): boolean;
} 