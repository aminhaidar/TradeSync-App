import { WebSocket } from 'ws'
import { Server } from 'socket.io'
import { WebSocketManager } from '../websocket-manager'
import { ErrorHandler } from '../utils/error-handler'
import { DataProcessor } from '../utils/data-processor'
import { AlpacaConfig } from '../types/alpaca'
import { Config } from '../types/config'

jest.mock('ws')
jest.mock('socket.io')
jest.mock('../utils/error-handler')
jest.mock('../utils/data-processor')

type WebSocketEventType = string | symbol
type WebSocketListener = (this: WebSocket, ...args: any[]) => void
type WebSocketMockCall = [event: WebSocketEventType, listener: WebSocketListener]

describe('WebSocketManager', () => {
  let mockDataWs: jest.Mocked<WebSocket>
  let mockServer: jest.Mocked<Server>
  let wsManager: WebSocketManager
  let mockDataProcessor: jest.Mocked<DataProcessor>
  let mockErrorHandler: jest.Mocked<ErrorHandler>
  let mockConfig: Config

  beforeEach(() => {
    jest.useFakeTimers()
    mockDataWs = {
      on: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      readyState: 1, // WebSocket.OPEN
      removeAllListeners: jest.fn(),
      removeListener: jest.fn()
    } as unknown as jest.Mocked<WebSocket>
    ;((WebSocket as unknown) as jest.Mock).mockImplementation(() => mockDataWs)

    mockServer = {
      on: jest.fn(),
      emit: jest.fn(),
    } as unknown as jest.Mocked<Server>
    ;((Server as unknown) as jest.Mock).mockImplementation(() => mockServer)

    mockDataProcessor = {
      addMessage: jest.fn(),
      processMessages: jest.fn(),
      cleanup: jest.fn(),
      hasMessages: jest.fn(),
      getQueueSize: jest.fn(),
      getLastBatchTime: jest.fn()
    } as unknown as jest.Mocked<DataProcessor>

    mockErrorHandler = {
      handleError: jest.fn(),
      resetReconnectAttempts: jest.fn(),
      cleanup: jest.fn(),
      on: jest.fn(),
      emit: jest.fn()
    } as unknown as jest.Mocked<ErrorHandler>

    ;((DataProcessor as unknown) as jest.Mock).mockImplementation(() => mockDataProcessor)
    ;((ErrorHandler as unknown) as jest.Mock).mockImplementation(() => mockErrorHandler)

    mockConfig = {
      isProduction: false,
      port: 5004,
      alpaca: {
        trading: {
          url: 'https://paper-api.alpaca.markets',
          wsUrl: 'wss://paper-api.alpaca.markets/stream',
          key: 'test-key',
          secret: 'test-secret'
        },
        data: {
          url: 'https://data.alpaca.markets/v2',
          wsUrl: 'wss://stream.data.alpaca.markets/v2',
          key: 'test-key',
          secret: 'test-secret'
        }
      },
      websocket: {
        maxReconnectAttempts: 5,
        reconnectDelay: 1000,
        maxReconnectDelay: 30000,
        batchInterval: 100,
        healthCheckInterval: 30000,
        healthCheckTimeout: 5000,
        batchSize: 100,
        maxQueueSize: 1000
      },
      data: {
        maxPositions: 100,
        maxOrders: 100,
        maxTrades: 1000,
        cleanupInterval: 60000,
        maxAge: 3600000,
        maxPrice: 1000000,
        maxVolume: 1000000,
        maxSpread: 100,
        minPrice: 0.01,
        minVolume: 1
      }
    }

    wsManager = new WebSocketManager(mockServer, mockConfig)
    wsManager.connectDataWebSocket()
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  describe('Connection Management', () => {
    it('should initialize with disconnected state', () => {
      expect(wsManager['dataState']).toBe('disconnected')
      expect(wsManager['tradingState']).toBe('disconnected')
    })

    it('should attempt to connect to WebSocket', () => {
      wsManager.connectDataWebSocket()
      expect(wsManager['dataState']).toBe('connecting')
      expect(WebSocket).toHaveBeenCalledWith(mockConfig.alpaca.data.wsUrl)
    })

    it('should handle health check timeouts', () => {
      // Set up conditions for timeout
      wsManager['dataState'] = 'connected'
      wsManager['dataMetrics'].lastMessageTime = new Date(Date.now() - mockConfig.websocket.healthCheckTimeout - 1000)
      
      jest.advanceTimersByTime(mockConfig.websocket.healthCheckInterval)
      expect(wsManager['dataState']).toBe('error')
    })

    it('should cleanup old data', () => {
      jest.advanceTimersByTime(mockConfig.data.cleanupInterval)
      expect(wsManager['latestData']).toEqual({})
    })
  })

  describe('Message Handling', () => {
    beforeEach(() => {
      // Initialize WebSocket connection and authenticate
      const openHandler = mockDataWs.on.mock.calls.find(
        (call: WebSocketMockCall) => call[0] === 'open'
      )?.[1]
      expect(openHandler).toBeDefined()
      openHandler?.call(mockDataWs)

      // Simulate successful authentication
      const messageHandler = mockDataWs.on.mock.calls.find(
        (call: WebSocketMockCall) => call[0] === 'message'
      )?.[1]
      expect(messageHandler).toBeDefined()
      messageHandler?.call(mockDataWs, Buffer.from(JSON.stringify({
        T: 'success',
        message: 'authenticated'
      })))
    })

    it('should process quote messages', () => {
      const mockQuote = {
        T: 'q',
        S: 'AAPL',
        bp: 150.5,
        bs: 100,
        ap: 150.6,
        as: 200,
        t: '2024-03-28T12:00:00Z',
        c: [],
        z: 'A'
      }

      const messageHandler = mockDataWs.on.mock.calls.find(
        (call: WebSocketMockCall) => call[0] === 'message'
      )?.[1]
      expect(messageHandler).toBeDefined()

      messageHandler?.call(mockDataWs, Buffer.from(JSON.stringify(mockQuote)))

      expect(mockDataProcessor.addMessage).toHaveBeenCalledWith('quote', {
        symbol: 'AAPL',
        bidPrice: 150.5,
        askPrice: 150.6,
        timestamp: '2024-03-28T12:00:00Z',
        midPrice: (150.5 + 150.6) / 2,
        spread: 150.6 - 150.5
      })
    })

    it('should process trade messages', () => {
      const mockTrade = {
        T: 't',
        S: 'AAPL',
        p: 150.55,
        s: 100,
        t: '2024-03-28T12:00:00Z',
        c: [],
        z: 'A'
      }

      const messageHandler = mockDataWs.on.mock.calls.find(
        (call: WebSocketMockCall) => call[0] === 'message'
      )?.[1]
      expect(messageHandler).toBeDefined()

      messageHandler?.call(mockDataWs, Buffer.from(JSON.stringify(mockTrade)))

      expect(mockDataProcessor.addMessage).toHaveBeenCalledWith('trade', expect.objectContaining({
        symbol: 'AAPL',
        price: 150.55,
        size: 100,
        timestamp: '2024-03-28T12:00:00Z'
      }))
    })

    it('should process bar messages', () => {
      const mockBar = {
        T: 'b',
        S: 'AAPL',
        o: 150.0,
        h: 151.0,
        l: 149.0,
        c: 150.5,
        v: 1000,
        t: '2024-03-28T12:00:00Z',
        n: 100,
        vw: 150.25
      }

      const messageHandler = mockDataWs.on.mock.calls.find(
        (call: WebSocketMockCall) => call[0] === 'message'
      )?.[1]
      expect(messageHandler).toBeDefined()

      messageHandler?.call(mockDataWs, Buffer.from(JSON.stringify(mockBar)))

      expect(mockDataProcessor.addMessage).toHaveBeenCalledWith('bar', expect.objectContaining({
        symbol: 'AAPL',
        open: 150.0,
        high: 151.0,
        low: 149.0,
        close: 150.5,
        volume: 1000,
        timestamp: '2024-03-28T12:00:00Z'
      }))
    })

    it('should handle error messages', () => {
      const mockError = {
        T: 'error',
        code: 401,
        message: 'Authentication failed'
      }

      const messageHandler = mockDataWs.on.mock.calls.find(
        (call: WebSocketMockCall) => call[0] === 'message'
      )?.[1]
      expect(messageHandler).toBeDefined()

      messageHandler?.call(mockDataWs, Buffer.from(JSON.stringify(mockError)))

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(mockError)
    })

    it('should handle subscription messages', () => {
      const mockSubscription = {
        T: 'subscription',
        trades: ['AAPL'],
        quotes: ['AAPL'],
        bars: ['AAPL']
      }

      const messageHandler = mockDataWs.on.mock.calls.find(
        (call: WebSocketMockCall) => call[0] === 'message'
      )?.[1]
      expect(messageHandler).toBeDefined()

      messageHandler?.call(mockDataWs, Buffer.from(JSON.stringify(mockSubscription)))

      expect(mockServer.emit).toHaveBeenCalledWith('connectionState', expect.any(Object))
    })

    it('should handle invalid messages', () => {
      const messageHandler = mockDataWs.on.mock.calls.find(
        (call: WebSocketMockCall) => call[0] === 'message'
      )?.[1]
      expect(messageHandler).toBeDefined()

      messageHandler?.call(mockDataWs, Buffer.from('invalid json'))

      expect(mockErrorHandler.handleError).toHaveBeenCalled()
    })
  })

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      wsManager.destroy()
      expect(mockDataWs.close).toHaveBeenCalled()
      expect(mockDataWs.removeAllListeners).toHaveBeenCalled()
      expect(mockDataProcessor.cleanup).toHaveBeenCalled()
      expect(mockErrorHandler.cleanup).toHaveBeenCalled()
    })
  })
}) 