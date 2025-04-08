const axios = require('axios');
const config = require('../../config.js');

class PerformanceService {
  constructor(io) {
    this.io = io;
  }

  async getPerformanceData(timeRange) {
    try {
      // Calculate start date based on time range
      const endDate = new Date();
      const startDate = new Date();
      
      // Set time to start of day
      endDate.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      
      // Calculate days to subtract
      let daysToSubtract;
      switch (timeRange) {
        case '7d':
          daysToSubtract = 7;
          break;
        case '30d':
          daysToSubtract = 30;
          break;
        case '90d':
          daysToSubtract = 90;
          break;
        default:
          daysToSubtract = 7; // Default to 7 days
      }

      // Set start date by subtracting days
      startDate.setTime(endDate.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000));

      console.log('Date calculations:', {
        currentDate: new Date().toISOString(),
        endDate: endDate.toISOString(),
        startDate: startDate.toISOString(),
        daysToSubtract
      });

      // Fetch portfolio history from Alpaca
      console.log('Fetching portfolio history from Alpaca:', {
        url: `${config.alpaca.trading.url}/v2/account/portfolio/history`,
        params: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          timeframe: '1D',
          extended_hours: true
        }
      });

      const response = await axios.get(`${config.alpaca.trading.url}/v2/account/portfolio/history`, {
        headers: {
          'APCA-API-KEY-ID': config.alpaca.trading.key,
          'APCA-API-SECRET-KEY': config.alpaca.trading.secret
        },
        params: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          timeframe: '1D',
          extended_hours: true
        }
      });

      console.log('Alpaca API Response:', JSON.stringify(response.data, null, 2));

      // Transform the data for the chart
      const { timestamp, equity, profit_loss } = response.data;
      
      if (!timestamp || !equity || !profit_loss) {
        console.error('Missing required data from Alpaca API response:', {
          hasTimestamp: !!timestamp,
          hasEquity: !!equity,
          hasProfitLoss: !!profit_loss
        });
        throw new Error('Missing required data from Alpaca API response');
      }

      // Calculate realized and unrealized P/L
      const performanceData = timestamp.map((time, index) => {
        // Get the base equity from the first day
        const baseEquity = equity[0];
        
        // Calculate realized P/L (cumulative profit/loss)
        const realized = profit_loss[index] || 0;
        
        // Calculate unrealized P/L (current equity minus base equity and realized P/L)
        const currentEquity = equity[index];
        const unrealized = currentEquity - (baseEquity + realized);
        
        console.log('Calculating P/L for day:', {
          date: new Date(time * 1000).toISOString(),
          baseEquity,
          currentEquity,
          realized,
          unrealized
        });
        
        return {
          date: new Date(time * 1000).toISOString(),
          realized: parseFloat(realized.toFixed(2)),
          unrealized: parseFloat(unrealized.toFixed(2))
        };
      });

      console.log('Transformed performance data:', JSON.stringify(performanceData, null, 2));
      return performanceData;
    } catch (error) {
      console.error('Error fetching performance data:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }
}

module.exports = { PerformanceService }; 