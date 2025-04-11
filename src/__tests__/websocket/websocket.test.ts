import { WebSocketManager } from '../../utils/websocket-manager'
import { logger } from '../../lib/logger'

describe('WebSocket Manager', () => {
  let wsManager: WebSocketManager

  beforeEach(() => {
    wsManager = WebSocketManager.getInstance()
  })

  afterEach(() => {
    wsManager.disconnect()
  })

  test('should connect to WebSocket successfully', async () => {
    const connectPromise = new Promise<void>((resolve) => {
      wsManager.on('data:connected', () => {
        logger.info('Data stream connected')
        resolve()
      })
    })

    try {
      await wsManager.connect()
      await connectPromise
      expect(wsManager.isConnected()).toBe(true)
    } catch (error) {
      logger.error('Connection failed:', error)
      throw error
    }
  })

  test('should handle market data subscription', async () => {
    const testSymbol = 'AM.AAPL'
    const dataPromise = new Promise<any>((resolve) => {
      wsManager.subscribe(testSymbol, (data) => {
        logger.info('Received market data:', data)
        resolve(data)
      })
    })

    try {
      await wsManager.connect()
      const data = await dataPromise
      expect(data).toBeDefined()
    } catch (error) {
      logger.error('Market data test failed:', error)
      throw error
    }
  })

  test('should handle trade updates', async () => {
    const tradePromise = new Promise<any>((resolve) => {
      wsManager.subscribe('trade_updates', (data) => {
        logger.info('Received trade update:', data)
        resolve(data)
      })
    })

    try {
      await wsManager.connect()
      const tradeData = await tradePromise
      expect(tradeData).toBeDefined()
    } catch (error) {
      logger.error('Trade updates test failed:', error)
      throw error
    }
  })
}) 