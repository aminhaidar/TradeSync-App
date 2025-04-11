export interface Trade {
  id: string
  date: string
  symbol: string
  companyName?: string
  expiration?: string
  action: 'Buy' | 'Sell' | 'Close'
  quantity: number
  price: number
  total: number
  pl?: number
  plPercent?: number
}

export interface Order {
  id: string
  date: string
  symbol: string
  companyName?: string
  expiration?: string
  type: 'Market' | 'Limit' | 'Stop' | 'Stop Limit'
  side: 'Buy' | 'Sell'
  quantity: number
  price: number
  stopPrice?: number
  timeInForce: 'Day' | 'GTC'
  status: 'Working' | 'Filled' | 'Cancelled' | 'Rejected'
}

export type TradeHistoryResponse = {
  trades: Trade[]
}

export type OpenOrdersResponse = {
  orders: Order[]
} 