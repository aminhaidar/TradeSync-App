export interface AccountData {
  balance: number;
  buyingPower: number;
  equity: number;
  cash: number;
  dayPL: number;
  positions: Position[];
  orders: Order[];
  activities: Activity[];
  fees: Fee[];
}

export interface Position {
  symbol: string;
  qty: number;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
  realizedPL: number;
}

export interface Order {
  id: string;
  symbol: string;
  qty: number;
  filledQty: number;
  type: string;
  side: string;
  status: string;
  limitPrice?: number;
  stopPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  account_id: string;
  activity_type: string;
  transaction_time: string;
  type: string;
  price?: number;
  qty?: number;
  side?: string;
  symbol?: string;
  leaves_qty?: number;
  order_id?: string;
  cum_qty?: number;
  order_status?: string;
  event: string;
  description: string;
}

export interface Fee {
  id: string;
  account_id: string;
  fee_type: string;
  amount: number;
  currency: string;
  description: string;
  created_at: string;
  activity_id?: string;
  order_id?: string;
}

export interface AccountSummary {
  accountData: AccountData;
  activities: Activity[];
  fees: Fee[];
} 