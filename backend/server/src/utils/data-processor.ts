import { MarketData, Trade, Bar } from '../types/alpaca';
import Logger from './logger';

interface BatchConfig {
  maxBatchSize: number;
  maxBatchDelay: number;
  maxQueueSize: number;
}

interface ValidationConfig {
  maxPrice: number;
  maxVolume: number;
  maxSpread: number;
  minPrice: number;
  minVolume: number;
}

export class DataProcessor {
  private readonly logger: Logger;
  private messageQueue: Array<{ type: 'quote' | 'trade' | 'bar'; data: MarketData | Trade | Bar }> = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private lastBatchTime: Date = new Date();

  constructor(
    private readonly config: BatchConfig,
    private readonly validation: ValidationConfig,
    private readonly onBatch: (batch: Array<{ type: 'quote' | 'trade' | 'bar'; data: MarketData | Trade | Bar }>) => void
  ) {
    this.logger = new Logger('DataProcessor');
    this.initializeBatchTimer();
  }

  private initializeBatchTimer(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    this.batchTimer = setInterval(() => {
      this.processBatch();
    }, this.config.maxBatchDelay);
  }

  public addMessage(type: 'quote' | 'trade' | 'bar', data: MarketData | Trade | Bar): void {
    if (this.messageQueue.length >= this.config.maxQueueSize) {
      this.logger.warn('Message queue full, dropping oldest messages');
      this.messageQueue = this.messageQueue.slice(-this.config.maxQueueSize);
    }

    if (this.validateMessage(type, data)) {
      this.messageQueue.push({ type, data });
      this.lastBatchTime = new Date();
    }
  }

  public hasMessages(): boolean {
    return this.messageQueue.length > 0;
  }

  public processMessages(): Array<{ type: 'quote' | 'trade' | 'bar'; data: MarketData | Trade | Bar }> {
    if (this.messageQueue.length === 0) {
      return [];
    }

    const batchSize = Math.min(this.messageQueue.length, this.config.maxBatchSize);
    const batch = this.messageQueue.splice(0, batchSize);

    try {
      this.onBatch(batch);
      return batch;
    } catch (error) {
      this.logger.error('Error processing batch:', error as Error);
      // Put failed messages back in the queue
      this.messageQueue.unshift(...batch);
      return [];
    }
  }

  private validateMessage(type: 'quote' | 'trade' | 'bar', data: MarketData | Trade | Bar): boolean {
    try {
      switch (type) {
        case 'quote':
          return this.validateQuote(data as MarketData);
        case 'trade':
          return this.validateTrade(data as Trade);
        case 'bar':
          return this.validateBar(data as Bar);
        default:
          return false;
      }
    } catch (error) {
      this.logger.error(`Validation error for ${type}:`, error as Error);
      return false;
    }
  }

  private validateQuote(quote: MarketData): boolean {
    if (!quote.symbol || !quote.timestamp) {
      return false;
    }

    if (quote.bidPrice < this.validation.minPrice || quote.bidPrice > this.validation.maxPrice) {
      return false;
    }

    if (quote.askPrice < this.validation.minPrice || quote.askPrice > this.validation.maxPrice) {
      return false;
    }

    if (quote.spread > this.validation.maxSpread) {
      return false;
    }

    return true;
  }

  private validateTrade(trade: Trade): boolean {
    if (!trade.symbol || !trade.timestamp) {
      return false;
    }

    if (trade.price < this.validation.minPrice || trade.price > this.validation.maxPrice) {
      return false;
    }

    if (trade.size < this.validation.minVolume || trade.size > this.validation.maxVolume) {
      return false;
    }

    return true;
  }

  private validateBar(bar: Bar): boolean {
    if (!bar.symbol || !bar.timestamp) {
      return false;
    }

    if (bar.open < this.validation.minPrice || bar.open > this.validation.maxPrice) {
      return false;
    }

    if (bar.high < this.validation.minPrice || bar.high > this.validation.maxPrice) {
      return false;
    }

    if (bar.low < this.validation.minPrice || bar.low > this.validation.maxPrice) {
      return false;
    }

    if (bar.close < this.validation.minPrice || bar.close > this.validation.maxPrice) {
      return false;
    }

    if (bar.volume < this.validation.minVolume || bar.volume > this.validation.maxVolume) {
      return false;
    }

    return true;
  }

  private processBatch(): void {
    if (this.messageQueue.length === 0) {
      return;
    }

    const batchSize = Math.min(this.messageQueue.length, this.config.maxBatchSize);
    const batch = this.messageQueue.splice(0, batchSize);

    try {
      this.onBatch(batch);
    } catch (error) {
      this.logger.error('Error processing batch:', error as Error);
      // Put failed messages back in the queue
      this.messageQueue.unshift(...batch);
    }
  }

  public getQueueSize(): number {
    return this.messageQueue.length;
  }

  public getLastBatchTime(): Date {
    return this.lastBatchTime;
  }

  public cleanup(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    this.messageQueue = [];
  }
} 