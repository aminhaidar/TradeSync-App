import { AccountData, Position, Order, Activity, Fee } from '../types/account';
import { logger } from '../lib/logger';

const safeParseFloat = (value: string | number | undefined | null): number => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

export const transformAccountData = (data: any): AccountData | null => {
  if (!data) {
    logger.warn('No data provided to transformAccountData');
    return null;
  }

  logger.debug('Transforming account data:', {
    input: data,
    timestamp: new Date().toISOString()
  });

  console.log('Raw data received:', data);

  // Handle both direct account data and wrapped account data
  const accountData = data.account || data;

  const transformed = {
    balance: safeParseFloat(accountData.equity),
    buyingPower: safeParseFloat(accountData.buying_power),
    equity: safeParseFloat(accountData.equity),
    cash: safeParseFloat(accountData.cash),
    dayPL: safeParseFloat(accountData.equity) - safeParseFloat(accountData.last_equity),
    positions: (accountData.positions || []).map((pos: any) => ({
      symbol: pos.symbol,
      qty: safeParseFloat(pos.qty),
      avgEntryPrice: safeParseFloat(pos.avg_entry_price),
      currentPrice: safeParseFloat(pos.current_price),
      marketValue: safeParseFloat(pos.market_value),
      unrealizedPL: safeParseFloat(pos.unrealized_pl),
      realizedPL: safeParseFloat(pos.realized_pl),
    })),
    orders: (accountData.orders || []).map((order: any) => ({
      id: order.id,
      symbol: order.symbol,
      qty: safeParseFloat(order.qty),
      filledQty: safeParseFloat(order.filled_qty),
      type: order.type,
      side: order.side,
      status: order.status,
      limitPrice: order.limit_price ? safeParseFloat(order.limit_price) : undefined,
      stopPrice: order.stop_price ? safeParseFloat(order.stop_price) : undefined,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    })),
    activities: (accountData.activities || []).map((activity: any) => ({
      id: activity.id,
      account_id: activity.account_id,
      activity_type: activity.activity_type,
    })),
    fees: (accountData.fees || []).map((fee: any) => ({
      id: fee.id,
      account_id: fee.account_id,
      fee_type: fee.fee_type,
      amount: safeParseFloat(fee.amount),
      currency: fee.currency,
      description: fee.description,
      created_at: fee.created_at,
      activity_id: fee.activity_id,
      order_id: fee.order_id,
    })),
  };

  logger.debug('Transformed account data:', {
    output: transformed,
    timestamp: new Date().toISOString()
  });

  return transformed;
}; 