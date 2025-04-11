import { Server, Socket } from 'socket.io'
import { NextApiRequest } from 'next'
import { NextApiResponseServerIO } from '@/types/next'
import AlpacaClient from '@alpacahq/alpaca-trade-api'

interface Position {
  symbol: string
  side: string
  qty: string
  avg_entry_price: string
  current_price: string
  unrealized_pl: string
}

interface Order {
  symbol: string
  side: string
  qty: string
  limit_price?: string
  stop_price?: string
  filled_avg_price?: string
}

const client = new AlpacaClient({
  key: process.env.ALPACA_API_KEY || '',
  secret: process.env.ALPACA_API_SECRET || '',
  paper: true
})

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    console.log('Setting up WebSocket server...')
    const io = new Server(res.socket.server)
    res.socket.server.io = io

    io.on('connection', (socket: Socket) => {
      console.log('Client connected')

      // Set up account updates
      const accountUpdateInterval = setInterval(async () => {
        try {
          const account = await client.getAccount()
          const positions = await client.getPositions()
          const orders = await client.getOrders()

          socket.emit('account_data', {
            type: 'account_data',
            data: {
              id: account.id,
              account_number: account.account_number,
              status: account.status,
              currency: account.currency,
              cash: account.cash,
              equity: account.equity,
              last_equity: account.last_equity,
              portfolio_value: account.portfolio_value,
              buying_power: account.buying_power,
              regt_buying_power: account.regt_buying_power,
              daytrading_buying_power: account.daytrading_buying_power,
              effective_buying_power: account.effective_buying_power,
              non_marginable_buying_power: account.non_marginable_buying_power,
              options_buying_power: account.options_buying_power,
              initial_margin: account.initial_margin,
              maintenance_margin: account.maintenance_margin,
              last_maintenance_margin: account.last_maintenance_margin,
              long_market_value: account.long_market_value,
              short_market_value: account.short_market_value,
              position_market_value: account.position_market_value,
              pattern_day_trader: account.pattern_day_trader,
              trading_blocked: account.trading_blocked,
              transfers_blocked: account.transfers_blocked,
              account_blocked: account.account_blocked,
              created_at: account.created_at,
              trade_suspended_by_user: account.trade_suspended_by_user,
              multiplier: account.multiplier,
              shorting_enabled: account.shorting_enabled,
              daytrade_count: account.daytrade_count,
              crypto_status: account.crypto_status,
              options_approved_level: account.options_approved_level,
              options_trading_level: account.options_trading_level,
              sma: account.sma,
              balance_asof: account.balance_asof,
              crypto_tier: account.crypto_tier,
              unrealized_pl: account.unrealized_pl,
              unrealized_plpc: account.unrealized_plpc,
              positions: positions.map((position: Position) => ({
                symbol: position.symbol,
                type: position.side,
                volume: position.qty,
                openPrice: position.avg_entry_price,
                currentPrice: position.current_price,
                profit: position.unrealized_pl,
                swap: 0
              })),
              orders: orders.map((order: Order) => ({
                symbol: order.symbol,
                type: order.side,
                volume: order.qty,
                price: order.limit_price || order.stop_price || order.filled_avg_price || '0'
              }))
            }
          })
        } catch (error) {
          console.error('Error sending account update:', error)
        }
      }, 1000) // Update every second

      socket.on('disconnect', () => {
        console.log('Client disconnected')
        clearInterval(accountUpdateInterval)
      })
    })
  }

  res.end()
} 