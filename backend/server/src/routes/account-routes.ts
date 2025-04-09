import { Router } from 'express';
import axios from 'axios';
import config from '../config';
import Logger from '../utils/logger';

const router = Router();
const logger = new Logger('AccountRoutes');

/**
 * Get account information from Alpaca
 * @route GET /api/account
 */
router.get('/account', async (req, res) => {
  try {
    logger.info('Fetching account data...');
    const response = await axios.get(`${config.alpaca.trading.url}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': config.alpaca.trading.key,
        'APCA-API-SECRET-KEY': config.alpaca.trading.secret
      }
    });
    
    logger.info('Account data fetched successfully');
    res.json(response.data);
  } catch (error: unknown) {
    logger.error('Error fetching account data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch account data';
    res.status(500).json({ error: errorMessage });
  }
});

export default router; 