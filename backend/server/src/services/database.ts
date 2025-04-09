import pool from '../config/database';
import Logger from '../utils/logger';

const logger = new Logger('DatabaseService');

export class DatabaseService {
  // Sources
  async createSource(name: string, platform?: string) {
    const query = `
      INSERT INTO sources (name, platform)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const values = [name, platform];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating source:', error);
      throw error;
    }
  }

  // Trades
  async createTrade(sourceId: number, ticker: string, positionType: string, strikePrice?: number, expirationDate?: Date) {
    const query = `
      INSERT INTO trades (source_id, ticker, position_type, strike_price, expiration_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [sourceId, ticker, positionType, strikePrice, expirationDate];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating trade:', error);
      throw error;
    }
  }

  // Trade Entries
  async createTradeEntry(tradeId: number, entryTime: Date, price: number, quantity: number, alertText: string) {
    const query = `
      INSERT INTO trade_entries (trade_id, entry_time, price, quantity, alert_text)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [tradeId, entryTime, price, quantity, alertText];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating trade entry:', error);
      throw error;
    }
  }

  // Trade Exits
  async createTradeExit(tradeId: number, exitTime: Date, price: number, quantity: number, alertText: string, profitLoss: number) {
    const query = `
      INSERT INTO trade_exits (trade_id, exit_time, price, quantity, alert_text, profit_loss)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [tradeId, exitTime, price, quantity, alertText, profitLoss];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating trade exit:', error);
      throw error;
    }
  }

  // Alerts
  async createAlert(source: string, platform: string, alertText: string, timestamp: Date, parsedData: any) {
    const query = `
      INSERT INTO alerts (source, platform, alert_text, timestamp, parsed_data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [source, platform, alertText, timestamp, parsedData];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating alert:', error);
      throw error;
    }
  }

  // Get all open trades
  async getOpenTrades() {
    const query = `
      SELECT t.*, s.name as source_name, s.platform as source_platform
      FROM trades t
      JOIN sources s ON t.source_id = s.id
      WHERE t.status = 'open';
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting open trades:', error);
      throw error;
    }
  }

  // Get trade history
  async getTradeHistory() {
    const query = `
      SELECT 
        t.*,
        s.name as source_name,
        s.platform as source_platform,
        te.entry_time,
        te.price as entry_price,
        te.quantity as entry_quantity,
        tx.exit_time,
        tx.price as exit_price,
        tx.quantity as exit_quantity,
        tx.profit_loss
      FROM trades t
      JOIN sources s ON t.source_id = s.id
      LEFT JOIN trade_entries te ON t.id = te.trade_id
      LEFT JOIN trade_exits tx ON t.id = tx.trade_id
      WHERE t.status = 'closed'
      ORDER BY t.created_at DESC;
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting trade history:', error);
      throw error;
    }
  }
} 