import Alpaca from '@alpacahq/alpaca-trade-api';
import { config } from '../types/config';
import Logger from '../utils/logger';

const logger = new Logger('AccountService');

export interface AccountData {
  balance: number;
  dayPL: number;
  dayPLPercent: number;
  openPL: number;
  buyingPower: number;
  unsettledCash: number;
}

interface AlpacaPosition {
  unrealized_pl: string;
}

interface AlpacaAccount {
  equity: string;
  last_equity: string;
  buying_power: string;
  non_marginable_buying_power: string;
}

class AccountService {
  private alpaca: Alpaca;

  constructor() {
    this.alpaca = new Alpaca({
      keyId: config.alpaca.trading.key,
      secretKey: config.alpaca.trading.secret,
      paper: true,
      baseUrl: config.alpaca.trading.url
    });
  }

  async getAccountData(): Promise<AccountData> {
    try {
      const account = await this.alpaca.getAccount() as AlpacaAccount;
      const positions = await this.alpaca.getPositions() as AlpacaPosition[];

      // Calculate open P/L from positions
      const openPL = positions.reduce((total: number, position: AlpacaPosition) => {
        return total + parseFloat(position.unrealized_pl);
      }, 0);

      return {
        balance: parseFloat(account.equity),
        dayPL: parseFloat(account.equity) - parseFloat(account.last_equity),
        dayPLPercent: ((parseFloat(account.equity) - parseFloat(account.last_equity)) / parseFloat(account.last_equity)) * 100,
        openPL,
        buyingPower: parseFloat(account.buying_power),
        unsettledCash: parseFloat(account.non_marginable_buying_power)
      };
    } catch (error) {
      logger.error('Error fetching account data:', error);
      throw error;
    }
  }
}

export const accountService = new AccountService(); 