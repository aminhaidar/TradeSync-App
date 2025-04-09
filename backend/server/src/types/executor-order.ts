import { OrderResponse } from './order';

export interface ExecutorOrderRequest {
  symbol: string;
  qty?: number;
  notional?: number;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
  limit_price?: number;
  stop_price?: number;
  extended_hours?: boolean;
  client_order_id?: string;
  order_class?: 'simple' | 'bracket' | 'oco' | 'oto';
  take_profit?: {
    limit_price: number;
  };
  stop_loss?: {
    stop_price: number;
    limit_price?: number;
  };
  source_id?: string;      // TradeSync specific - source of the trade alert
  confidence?: number;     // TradeSync specific - AI confidence score
  strategy?: string;       // TradeSync specific - trading strategy
  notes?: string;          // TradeSync specific - additional notes
}

export interface ExecutorOrderState {
  id: string;
  client_order_id: string;
  alpaca_order_id?: string;
  request: ExecutorOrderRequest;
  status: OrderExecutionStatus;
  created_at: string;
  updated_at: string;
  execution_attempts: number;
  last_error?: string;
  order_response?: OrderResponse;
}

export type OrderExecutionStatus = 
  | 'pending'      // waiting to be processed
  | 'validating'   // being validated
  | 'submitting'   // being submitted to Alpaca
  | 'submitted'    // successfully submitted to Alpaca
  | 'monitoring'   // monitoring for updates
  | 'completed'    // execution completed (filled or canceled)
  | 'failed'       // execution failed
  | 'retrying';    // being retried after a failure 