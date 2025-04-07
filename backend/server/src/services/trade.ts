import { Trade, Order } from '../types/trade'
import { Socket, Server } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
import { config } from '../types/config'
import Logger from '../utils/logger'

export class TradeService {
  private tradeHistory: Trade[] = []
  private openOrders: Order[] = []
  private io: Server | null = null
  private readonly logger: Logger
  private readonly isTestMode: boolean

  constructor(io?: Server) {
    this.logger = new Logger('TradeService')
    this.logger.info('Initializing TradeService')
    this.isTestMode = !io
    if (io) {
      this.setIo(io)
    }
    
    // Add test data if no io is provided (test environment)
    if (this.isTestMode) {
      this.addTestData();
    } else {
      this.initializeData().catch(error => {
        this.logger.error('Failed to initialize trade data:', error)
        throw error
      })
    }
  }

  private addTestData() {
    // Add test trade history
    this.tradeHistory = [
      {
        id: 'test-trade-1',
        date: new Date().toISOString(),
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        action: 'Buy',
        quantity: 10,
        price: 150.50,
        total: 1505.00,
        pl: 50.00,
        plPercent: 3.32
      }
    ];

    // Add test open orders
    this.openOrders = [
      {
        id: 'test-order-1',
        date: new Date().toISOString(),
        symbol: 'TSLA',
        companyName: 'Tesla, Inc.',
        type: 'Limit',
        side: 'Buy',
        quantity: 10,
        price: 185.50,
        timeInForce: 'GTC',
        status: 'Working'
      }
    ];
  }

  private async initializeData() {
    try {
      this.logger.info('Fetching initial trade data from Alpaca')
      this.logger.info('Alpaca Trading URL:', { url: config.alpaca.trading.url })
      this.logger.info('Alpaca API Key:', { key: config.alpaca.trading.key })
      
      // Fetch account history (trades)
      this.logger.info('Fetching trade history from Alpaca...')
      const historyResponse = await axios.get(`${config.alpaca.trading.url}/v2/account/activities`, {
        headers: {
          'APCA-API-KEY-ID': config.alpaca.trading.key,
          'APCA-API-SECRET-KEY': config.alpaca.trading.secret
        },
        params: {
          activity_type: 'FILL',
          direction: 'desc',
          limit: 100
        }
      })
      this.logger.info('Alpaca trade history response:', { data: historyResponse.data })

      this.tradeHistory = historyResponse.data.map((activity: any) => {
        this.logger.info('Processing trade activity:', { activity })
        return {
          id: activity.id,
          date: activity.created_at,
          symbol: activity.symbol,
          companyName: activity.symbol,
          action: activity.side.toUpperCase(),
          quantity: parseFloat(activity.qty),
          price: parseFloat(activity.price),
          total: parseFloat(activity.qty) * parseFloat(activity.price),
          pl: activity.pl ? parseFloat(activity.pl) : undefined,
          plPercent: activity.pl_percent ? parseFloat(activity.pl_percent) : undefined
        }
      })
      this.logger.info(`Loaded ${this.tradeHistory.length} historical trades`)

      // Fetch open orders
      this.logger.info('Fetching open orders from Alpaca...')
      const ordersResponse = await axios.get(`${config.alpaca.trading.url}/v2/orders`, {
        headers: {
          'APCA-API-KEY-ID': config.alpaca.trading.key,
          'APCA-API-SECRET-KEY': config.alpaca.trading.secret
        },
        params: {
          status: 'open'
        }
      })
      this.logger.info('Alpaca open orders response:', { data: ordersResponse.data })

      this.openOrders = ordersResponse.data.map((order: any) => {
        this.logger.info('Processing open order:', { order })
        return {
          id: order.id,
          date: order.created_at,
          symbol: order.symbol,
          companyName: order.symbol,
          type: order.type,
          side: order.side.toUpperCase(),
          quantity: parseFloat(order.qty),
          price: parseFloat(order.limit_price || order.stop_price || 0),
          timeInForce: order.time_in_force,
          status: order.status
        }
      })
      this.logger.info(`Loaded ${this.openOrders.length} open orders`)

      // Notify clients of initial data
      this.logger.info('Notifying clients of initial trade data')
      this.notifyClients()
    } catch (error) {
      this.logger.error('Error initializing trade data:', error)
      if (axios.isAxiosError(error)) {
        this.logger.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        })
      }
      throw error
    }
  }

  public getTradeHistory(): Trade[] {
    return this.tradeHistory
  }

  public getOpenOrders(): Order[] {
    return this.openOrders
  }

  public async placeOrder(order: Omit<Order, 'id' | 'date' | 'status'>): Promise<Order> {
    if (this.isTestMode) {
      const newOrder: Order = {
        id: `test-order-${Date.now()}`,
        date: new Date().toISOString(),
        symbol: order.symbol,
        companyName: order.companyName,
        type: order.type,
        side: order.side,
        quantity: order.quantity,
        price: order.price,
        timeInForce: order.timeInForce,
        status: 'Working'
      };
      this.openOrders.push(newOrder);
      this.notifyClients();
      return newOrder;
    }

    try {
      this.logger.info('Placing new order:', { order })
      const response = await axios.post(`${config.alpaca.trading.url}/v2/orders`, {
        symbol: order.symbol,
        qty: order.quantity,
        side: order.side.toLowerCase(),
        type: order.type.toLowerCase(),
        time_in_force: order.timeInForce,
        limit_price: order.price,
        stop_price: order.stopPrice
      }, {
        headers: {
          'APCA-API-KEY-ID': config.alpaca.trading.key,
          'APCA-API-SECRET-KEY': config.alpaca.trading.secret
        }
      })

      const newOrder: Order = {
        id: response.data.id,
        date: response.data.created_at,
        symbol: response.data.symbol,
        companyName: response.data.symbol,
        type: response.data.type,
        side: response.data.side.toUpperCase(),
        quantity: parseFloat(response.data.qty),
        price: parseFloat(response.data.limit_price || response.data.stop_price || 0),
        timeInForce: response.data.time_in_force,
        status: response.data.status
      }

      this.openOrders.push(newOrder)
      this.logger.info('Order placed successfully:', { order: newOrder })
      this.notifyClients()
      return newOrder
    } catch (error) {
      this.logger.error('Error placing order:', { error })
      throw error
    }
  }

  public async cancelOrder(orderId: string): Promise<boolean> {
    if (this.isTestMode) {
      const orderIndex = this.openOrders.findIndex(order => order.id === orderId);
      if (orderIndex !== -1) {
        this.openOrders[orderIndex].status = 'Cancelled';
        this.notifyClients();
        return true;
      }
      return false;
    }

    try {
      this.logger.info('Cancelling order:', { orderId })
      await axios.delete(`${config.alpaca.trading.url}/v2/orders/${orderId}`, {
        headers: {
          'APCA-API-KEY-ID': config.alpaca.trading.key,
          'APCA-API-SECRET-KEY': config.alpaca.trading.secret
        }
      })

      const orderIndex = this.openOrders.findIndex(order => order.id === orderId)
      if (orderIndex !== -1) {
        this.openOrders.splice(orderIndex, 1)
        this.logger.info('Order cancelled successfully:', { orderId })
        this.notifyClients()
        return true
      }
      this.logger.warn('Order not found:', { orderId })
      return false
    } catch (error) {
      this.logger.error('Error cancelling order:', { error })
      throw error
    }
  }

  public async modifyOrder(
    orderId: string, 
    updates: Partial<Pick<Order, 'quantity' | 'price' | 'stopPrice'>>
  ): Promise<Order | null> {
    if (this.isTestMode) {
      const orderIndex = this.openOrders.findIndex(order => order.id === orderId);
      if (orderIndex !== -1) {
        const order = this.openOrders[orderIndex];
        this.openOrders[orderIndex] = {
          ...order,
          ...updates
        };
        this.notifyClients();
        return this.openOrders[orderIndex];
      }
      return null;
    }

    try {
      this.logger.info('Modifying order:', { orderId, updates })
      const response = await axios.patch(`${config.alpaca.trading.url}/v2/orders/${orderId}`, {
        qty: updates.quantity,
        limit_price: updates.price,
        stop_price: updates.stopPrice
      }, {
        headers: {
          'APCA-API-KEY-ID': config.alpaca.trading.key,
          'APCA-API-SECRET-KEY': config.alpaca.trading.secret
        }
      })

      const orderIndex = this.openOrders.findIndex(order => order.id === orderId)
      if (orderIndex !== -1) {
        const updatedOrder: Order = {
          id: response.data.id,
          date: response.data.created_at,
          symbol: response.data.symbol,
          companyName: response.data.symbol,
          type: response.data.type,
          side: response.data.side.toUpperCase(),
          quantity: parseFloat(response.data.qty),
          price: parseFloat(response.data.limit_price || response.data.stop_price || 0),
          timeInForce: response.data.time_in_force,
          status: response.data.status
        }
        this.openOrders[orderIndex] = updatedOrder
        this.logger.info('Order modified successfully:', { order: updatedOrder })
        this.notifyClients()
        return updatedOrder
      }
      this.logger.warn('Order not found:', { orderId })
      return null
    } catch (error) {
      this.logger.error('Error modifying order:', { error })
      throw error
    }
  }

  public setIo(io: Server) {
    this.logger.info('Setting Socket.IO server instance')
    this.io = io
    // Notify clients of current data when a new socket connects
    this.notifyClients()
  }

  private notifyClients() {
    if (this.io) {
      this.logger.info('Emitting trade update to all clients')
      this.io.emit('trade_update', {
        trades: this.tradeHistory,
        orders: this.openOrders
      })
    } else {
      this.logger.warn('Socket.IO server instance not available')
    }
  }
} 