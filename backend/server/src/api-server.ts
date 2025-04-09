import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Create express app
const app = express();

// Add middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5004'],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());

// Configuration from environment
const config = {
  alpaca: {
    trading: {
      url: process.env.ALPACA_TRADING_URL || 'https://paper-api.alpaca.markets',
      key: process.env.ALPACA_API_KEY || '',
      secret: process.env.ALPACA_API_SECRET || ''
    }
  }
};

// Account endpoint
app.get('/api/account', async (req, res) => {
  try {
    console.log('Fetching account data...');
    const response = await axios.get(`${config.alpaca.trading.url}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': config.alpaca.trading.key,
        'APCA-API-SECRET-KEY': config.alpaca.trading.secret
      }
    });
    
    console.log('Account data fetched successfully');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching account data:', error);
    res.status(500).json({ error: 'Failed to fetch account data' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
const PORT = process.env.API_PORT || 5005;
app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
}); 