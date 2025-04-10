import Alpaca from '@alpacahq/alpaca-trade-api';
import config from '../config';
import Logger from '../utils/logger';

const logger = new Logger('PositionsService');

export interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  avg_entry_price: string;
  qty: string;
  side: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
}

class PositionsService {
  private alpaca: Alpaca;

  constructor() {
    this.alpaca = new Alpaca({
      keyId: config.alpaca.trading.key,
      secretKey: config.alpaca.trading.secret,
      paper: true,
      baseUrl: config.alpaca.trading.url
    });
  }

  async getPositions(): Promise<AlpacaPosition[]> {
    try {
      const positions = await this.alpaca.getPositions() as AlpacaPosition[];
      return positions;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Error fetching positions:', errorMessage);
      throw new Error(`Failed to fetch positions: ${errorMessage}`);
    }
  }
}

export const positionsService = new PositionsService(); 