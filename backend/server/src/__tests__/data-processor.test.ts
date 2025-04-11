import { DataProcessor } from '../utils/data-processor';
import { MarketData, Trade, Bar } from '../types/alpaca';
import Logger from '../utils/logger';

// Mock the Logger class
const mockLoggerInstance = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

jest.mock('../utils/logger', () => {
  return jest.fn().mockImplementation(() => mockLoggerInstance);
});

describe('DataProcessor', () => {
  let dataProcessor: DataProcessor;
  let mockOnBatch: jest.Mock;

  const mockConfig = {
    maxBatchSize: 10,
    maxBatchDelay: 1000,
    maxQueueSize: 100
  };

  const mockValidation = {
    maxPrice: 1000,
    maxVolume: 1000000,
    maxSpread: 10,
    minPrice: 0.01,
    minVolume: 1
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockOnBatch = jest.fn();
    jest.clearAllMocks();
    dataProcessor = new DataProcessor(mockConfig, mockValidation, mockOnBatch);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Message Processing', () => {
    it('should add valid quote messages to queue', () => {
      const quote: MarketData = {
        symbol: 'AAPL',
        bidPrice: 150.5,
        askPrice: 150.6,
        timestamp: '2024-03-28T12:00:00Z',
        midPrice: 150.55,
        spread: 0.1
      };

      dataProcessor.addMessage('quote', quote);
      expect(dataProcessor.getQueueSize()).toBe(1);
    });

    it('should add valid trade messages to queue', () => {
      const trade: Trade = {
        symbol: 'AAPL',
        price: 150.5,
        size: 100,
        timestamp: '2024-03-28T12:00:00Z'
      };

      dataProcessor.addMessage('trade', trade);
      expect(dataProcessor.getQueueSize()).toBe(1);
    });

    it('should add valid bar messages to queue', () => {
      const bar: Bar = {
        symbol: 'AAPL',
        open: 150.0,
        high: 151.0,
        low: 149.0,
        close: 150.5,
        volume: 1000,
        timestamp: '2024-03-28T12:00:00Z'
      };

      dataProcessor.addMessage('bar', bar);
      expect(dataProcessor.getQueueSize()).toBe(1);
    });

    it('should reject invalid quote messages', () => {
      const invalidQuote: MarketData = {
        symbol: 'AAPL',
        bidPrice: -1,
        askPrice: 2000,
        timestamp: '2024-03-28T12:00:00Z',
        midPrice: 999.5,
        spread: 0.1
      };

      dataProcessor.addMessage('quote', invalidQuote);
      expect(dataProcessor.getQueueSize()).toBe(0);
    });

    it('should reject invalid trade messages', () => {
      const invalidTrade: Trade = {
        symbol: 'AAPL',
        price: 2000, // Exceeds maxPrice
        size: 100,
        timestamp: '2024-03-28T12:00:00Z'
      };

      dataProcessor.addMessage('trade', invalidTrade);
      expect(dataProcessor.getQueueSize()).toBe(0);
    });

    it('should reject invalid bar messages', () => {
      const invalidBar: Bar = {
        symbol: 'AAPL',
        open: 2000, // Exceeds maxPrice
        high: 2001,
        low: 1999,
        close: 2000.5,
        volume: 1000,
        timestamp: '2024-03-28T12:00:00Z'
      };

      dataProcessor.addMessage('bar', invalidBar);
      expect(dataProcessor.getQueueSize()).toBe(0);
    });
  });

  describe('Validation Logic', () => {
    it('should reject quotes with missing required fields', () => {
      const invalidQuote = {
        bidPrice: 150.5,
        askPrice: 150.6,
        spread: 0.1
      };

      dataProcessor.addMessage('quote', invalidQuote as MarketData);
      expect(dataProcessor.getQueueSize()).toBe(0);
    });

    it('should reject quotes with invalid prices', () => {
      const invalidQuote: MarketData = {
        symbol: 'AAPL',
        bidPrice: -1,
        askPrice: 2000,
        timestamp: '2024-03-28T12:00:00Z',
        midPrice: 999.5,
        spread: 0.1
      };

      dataProcessor.addMessage('quote', invalidQuote);
      expect(dataProcessor.getQueueSize()).toBe(0);
    });

    it('should reject trades with invalid volume', () => {
      const invalidTrade = {
        symbol: 'AAPL',
        price: 150.5,
        size: -1,
        timestamp: '2024-03-28T12:00:00Z'
      };

      dataProcessor.addMessage('trade', invalidTrade as Trade);
      expect(dataProcessor.getQueueSize()).toBe(0);
    });

    it('should reject bars with invalid OHLCV values', () => {
      const invalidBar = {
        symbol: 'AAPL',
        open: 150,
        high: 151,
        low: 149,
        close: 152,
        volume: -1,
        timestamp: '2024-03-28T12:00:00Z'
      };

      dataProcessor.addMessage('bar', invalidBar as Bar);
      expect(dataProcessor.getQueueSize()).toBe(0);
    });
  });

  describe('Batch Processing', () => {
    it('should process messages in batches', () => {
      const quote: MarketData = {
        symbol: 'AAPL',
        bidPrice: 150.5,
        askPrice: 150.6,
        timestamp: '2024-03-28T12:00:00Z',
        midPrice: 150.55,
        spread: 0.1
      };

      dataProcessor.addMessage('quote', quote);
      dataProcessor.processMessages();

      expect(mockOnBatch).toHaveBeenCalledWith([{ type: 'quote', data: quote }]);
      expect(dataProcessor.getQueueSize()).toBe(0);
    });

    it('should respect max batch size', () => {
      const quote: MarketData = {
        symbol: 'AAPL',
        bidPrice: 150.5,
        askPrice: 150.6,
        timestamp: '2024-03-28T12:00:00Z',
        midPrice: 150.55,
        spread: 0.1
      };

      // Add more messages than maxBatchSize
      for (let i = 0; i < mockConfig.maxBatchSize + 5; i++) {
        dataProcessor.addMessage('quote', quote);
      }

      dataProcessor.processMessages();
      expect(mockOnBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'quote', data: quote })
        ])
      );
      expect(mockOnBatch.mock.calls[0][0].length).toBe(mockConfig.maxBatchSize);
    });

    it('should handle batch processing errors', () => {
      const quote: MarketData = {
        symbol: 'AAPL',
        bidPrice: 150.5,
        askPrice: 150.6,
        timestamp: '2024-03-28T12:00:00Z',
        midPrice: 150.55,
        spread: 0.1
      };

      // Add multiple messages
      for (let i = 0; i < 3; i++) {
        dataProcessor.addMessage('quote', quote);
      }

      // Make onBatch throw an error
      mockOnBatch.mockImplementation(() => {
        throw new Error('Batch processing failed');
      });

      // Process messages
      dataProcessor.processMessages();

      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        'Error processing batch:',
        expect.any(Error)
      );
      expect(dataProcessor.getQueueSize()).toBe(3); // Messages should be back in queue
    });

    it('should handle empty queue', () => {
      dataProcessor.processMessages();
      expect(mockOnBatch).not.toHaveBeenCalled();
    });
  });

  describe('Automatic Batching', () => {
    it('should process messages after batch delay', () => {
      const quote: MarketData = {
        symbol: 'AAPL',
        bidPrice: 150.5,
        askPrice: 150.6,
        timestamp: '2024-03-28T12:00:00Z',
        midPrice: 150.55,
        spread: 0.1
      };

      dataProcessor.addMessage('quote', quote);
      jest.advanceTimersByTime(mockConfig.maxBatchDelay);

      expect(mockOnBatch).toHaveBeenCalledWith([{ type: 'quote', data: quote }]);
    });
  });

  describe('Queue Management', () => {
    it('should respect max queue size', () => {
      const quote: MarketData = {
        symbol: 'AAPL',
        bidPrice: 150.5,
        askPrice: 150.6,
        timestamp: '2024-03-28T12:00:00Z',
        midPrice: 150.55,
        spread: 0.1
      };

      // Fill queue to max size
      for (let i = 0; i < mockConfig.maxQueueSize; i++) {
        dataProcessor.addMessage('quote', quote);
      }

      // Add one more to trigger the warning
      dataProcessor.addMessage('quote', quote);

      expect(dataProcessor.getQueueSize()).toBe(mockConfig.maxQueueSize);
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith('Message queue full, dropping oldest messages');
    });

    it('should respect max batch size', () => {
      const quote: MarketData = {
        symbol: 'AAPL',
        bidPrice: 150.5,
        askPrice: 150.6,
        timestamp: '2024-03-28T12:00:00Z',
        midPrice: 150.55,
        spread: 0.1
      };

      // Add more messages than maxBatchSize
      for (let i = 0; i < mockConfig.maxBatchSize + 5; i++) {
        dataProcessor.addMessage('quote', quote);
      }

      dataProcessor.processMessages();
      expect(mockOnBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'quote', data: quote })
        ])
      );
      expect(mockOnBatch.mock.calls[0][0].length).toBe(mockConfig.maxBatchSize);
    });

    it('should track last batch time', () => {
      const quote: MarketData = {
        symbol: 'AAPL',
        bidPrice: 150.5,
        askPrice: 150.6,
        timestamp: '2024-03-28T12:00:00Z',
        midPrice: 150.55,
        spread: 0.1
      };

      const startTime = new Date();
      dataProcessor.addMessage('quote', quote);
      const lastBatchTime = dataProcessor.getLastBatchTime();

      expect(lastBatchTime.getTime()).toBeGreaterThanOrEqual(startTime.getTime());
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown message types', () => {
      const unknownData = {
        symbol: 'AAPL',
        timestamp: '2024-03-28T12:00:00Z',
        foo: 'bar'
      };

      dataProcessor.addMessage('unknown' as any, unknownData as any);
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith('Unknown message type: unknown');
      expect(dataProcessor.getQueueSize()).toBe(0);
    });
  });

  describe('Timer Management', () => {
    it('should initialize batch timer', () => {
      const quote: MarketData = {
        symbol: 'AAPL',
        bidPrice: 150.5,
        askPrice: 150.6,
        timestamp: '2024-03-28T12:00:00Z',
        midPrice: 150.55,
        spread: 0.1
      };

      dataProcessor.addMessage('quote', quote);
      expect(dataProcessor.getQueueSize()).toBe(1);

      jest.advanceTimersByTime(mockConfig.maxBatchDelay);
      expect(mockOnBatch).toHaveBeenCalledWith([{ type: 'quote', data: quote }]);
    });

    it('should cleanup timers', () => {
      const quote: MarketData = {
        symbol: 'AAPL',
        bidPrice: 150.5,
        askPrice: 150.6,
        timestamp: '2024-03-28T12:00:00Z',
        midPrice: 150.55,
        spread: 0.1
      };

      // Add a message and let it be processed
      dataProcessor.addMessage('quote', quote);
      jest.advanceTimersByTime(mockConfig.maxBatchDelay);
      expect(mockOnBatch).toHaveBeenCalledTimes(1);
      expect(dataProcessor.getQueueSize()).toBe(0);

      // Clear the mock and cleanup
      mockOnBatch.mockClear();
      dataProcessor.cleanup();
      
      // Add a new message after cleanup
      dataProcessor.addMessage('quote', quote);
      
      // Advance time to verify no new batches are processed
      jest.advanceTimersByTime(mockConfig.maxBatchDelay);
      expect(mockOnBatch).not.toHaveBeenCalled();
      expect(dataProcessor.getQueueSize()).toBe(1); // Message should still be in queue
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', () => {
      dataProcessor.cleanup();
      expect(mockLoggerInstance.info).toHaveBeenCalledWith('Cleaning up DataProcessor resources');
    });
  });

  describe('Data Type Detection', () => {
    it('should detect quote data type', () => {
      const quote: MarketData = {
        symbol: 'AAPL',
        bidPrice: 150.5,
        askPrice: 150.6,
        timestamp: '2024-03-28T12:00:00Z',
        midPrice: 150.55,
        spread: 0.1
      };

      dataProcessor.addData(quote);
      expect(dataProcessor.getQueueSize()).toBe(1);
    });

    it('should detect trade data type', () => {
      const trade: Trade = {
        symbol: 'AAPL',
        price: 150.5,
        size: 100,
        timestamp: '2024-03-28T12:00:00Z'
      };

      dataProcessor.addData(trade);
      expect(dataProcessor.getQueueSize()).toBe(1);
    });

    it('should detect bar data type', () => {
      const bar: Bar = {
        symbol: 'AAPL',
        open: 150.0,
        high: 151.0,
        low: 149.0,
        close: 150.5,
        volume: 1000,
        timestamp: '2024-03-28T12:00:00Z'
      };

      dataProcessor.addData(bar);
      expect(dataProcessor.getQueueSize()).toBe(1);
    });

    it('should handle unknown data type', () => {
      const unknownData = {
        symbol: 'AAPL',
        timestamp: '2024-03-28T12:00:00Z',
        foo: 'bar'
      };

      dataProcessor.addData(unknownData as any);
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith('Unknown data type:', unknownData);
      expect(dataProcessor.getQueueSize()).toBe(0);
    });
  });

  describe('Validation Edge Cases', () => {
    it('should handle validation errors gracefully', () => {
      const invalidQuote = {
        symbol: 'AAPL',
        bidPrice: 150.5,
        askPrice: 150.6,
        timestamp: '2024-03-28T12:00:00Z',
        midPrice: 150.55,
        spread: 0.1
      };

      // Mock validateQuote to throw an error
      jest.spyOn(dataProcessor as any, 'validateQuote').mockImplementation(() => {
        throw new Error('Validation failed');
      });

      dataProcessor.addMessage('quote', invalidQuote as MarketData);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        'Validation error for quote:',
        expect.any(Error)
      );
      expect(dataProcessor.getQueueSize()).toBe(0);
    });

    it('should validate bar high/low relationship', () => {
      const invalidBar: Bar = {
        symbol: 'AAPL',
        open: 150.0,
        high: 149.0, // High less than low
        low: 151.0,
        close: 150.5,
        volume: 1000,
        timestamp: '2024-03-28T12:00:00Z'
      };

      dataProcessor.addMessage('bar', invalidBar);
      expect(dataProcessor.getQueueSize()).toBe(0);
    });

    it('should validate quote spread calculation', () => {
      const invalidQuote: MarketData = {
        symbol: 'AAPL',
        bidPrice: 150.5,
        askPrice: 150.6,
        timestamp: '2024-03-28T12:00:00Z',
        midPrice: 150.55,
        spread: 20 // Exceeds maxSpread
      };

      dataProcessor.addMessage('quote', invalidQuote);
      expect(dataProcessor.getQueueSize()).toBe(0);
    });
  });
}); 