import { TradeService } from '../services/trade'
import { Order } from '../types/trade'

describe('TradeService', () => {
  let tradeService: TradeService

  beforeEach(() => {
    tradeService = new TradeService()
  })

  describe('getTradeHistory', () => {
    it('should return trade history', () => {
      const trades = tradeService.getTradeHistory()
      expect(Array.isArray(trades)).toBe(true)
      expect(trades.length).toBeGreaterThan(0)
      expect(trades[0]).toHaveProperty('id')
      expect(trades[0]).toHaveProperty('symbol')
      expect(trades[0]).toHaveProperty('action')
    })
  })

  describe('getOpenOrders', () => {
    it('should return open orders', () => {
      const orders = tradeService.getOpenOrders()
      expect(Array.isArray(orders)).toBe(true)
      expect(orders.length).toBeGreaterThan(0)
      expect(orders[0]).toHaveProperty('id')
      expect(orders[0]).toHaveProperty('symbol')
      expect(orders[0]).toHaveProperty('status')
    })
  })

  describe('placeOrder', () => {
    it('should create a new order', async () => {
      const newOrder = {
        symbol: 'TSLA',
        companyName: 'Tesla, Inc.',
        type: 'Limit' as const,
        side: 'Buy' as const,
        quantity: 10,
        price: 185.50,
        timeInForce: 'GTC' as const,
      }

      const order = await tradeService.placeOrder(newOrder)
      expect(order).toHaveProperty('id')
      expect(order.symbol).toBe(newOrder.symbol)
      expect(order.status).toBe('Working')
    })
  })

  describe('cancelOrder', () => {
    it('should cancel an existing order', async () => {
      const orders = tradeService.getOpenOrders()
      const orderId = orders[0].id

      const success = await tradeService.cancelOrder(orderId)
      expect(success).toBe(true)

      const updatedOrders = tradeService.getOpenOrders()
      const cancelledOrder = updatedOrders.find(o => o.id === orderId)
      expect(cancelledOrder?.status).toBe('Cancelled')
    })

    it('should return false for non-existent order', async () => {
      const success = await tradeService.cancelOrder('non-existent-id')
      expect(success).toBe(false)
    })
  })

  describe('modifyOrder', () => {
    it('should modify an existing order', async () => {
      const orders = tradeService.getOpenOrders()
      const orderId = orders[0].id
      const updates = {
        quantity: 15,
        price: 190.50
      }

      const modifiedOrder = await tradeService.modifyOrder(orderId, updates)
      expect(modifiedOrder).not.toBeNull()
      expect(modifiedOrder?.quantity).toBe(updates.quantity)
      expect(modifiedOrder?.price).toBe(updates.price)
    })

    it('should return null for non-existent order', async () => {
      const modifiedOrder = await tradeService.modifyOrder('non-existent-id', { quantity: 10 })
      expect(modifiedOrder).toBeNull()
    })
  })
}) 