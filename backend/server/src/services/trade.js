const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const config = require('../types/config.js');

class TradeService {
  constructor(io) {
    this.tradeHistory = [];
    this.openOrders = [];
    this.io = io;
    this.initializeData();
  }

  async initializeData() {
    try {
      // Fetch account history (trades)
      const historyResponse = await axios.get(`${config.alpaca.trading.url}/v2/account/activities`, {
        headers: {
          'APCA-API-KEY-ID': config.alpaca.trading.key,
          'APCA-API-SECRET-KEY': config.alpaca.trading.secret
        },
        params: {
          activity_type: 'FILL',
          direction: 'desc',
          limit: 100
        }
      });

      this.tradeHistory = historyResponse.data.map(activity => {
        // Log the activity to see its structure
        console.log('Activity:', activity);
        
        return {
          id: activity.id || uuidv4(),
          date: activity.created_at || new Date().toISOString(),
          symbol: activity.symbol || 'UNKNOWN',
          companyName: activity.symbol || 'Unknown Company',
          action: activity.side ? activity.side.toUpperCase() : 'UNKNOWN',
          quantity: parseFloat(activity.qty || 0),
          price: parseFloat(activity.price || 0),
          total: parseFloat(activity.qty || 0) * parseFloat(activity.price || 0),
          pl: activity.pl ? parseFloat(activity.pl) : undefined,
          plPercent: activity.pl_percent ? parseFloat(activity.pl_percent) : undefined
        };
      });

      // Fetch open orders
      const ordersResponse = await axios.get(`${config.alpaca.trading.url}/v2/orders`, {
        headers: {
          'APCA-API-KEY-ID': config.alpaca.trading.key,
          'APCA-API-SECRET-KEY': config.alpaca.trading.secret
        },
        params: {
          status: 'open'
        }
      });

      this.openOrders = ordersResponse.data.map(order => {
        // Log the order to see its structure
        console.log('Order:', order);
        
        return {
          id: order.id || uuidv4(),
          date: order.created_at || new Date().toISOString(),
          symbol: order.symbol || 'UNKNOWN',
          companyName: order.symbol || 'Unknown Company',
          type: order.type || 'UNKNOWN',
          side: order.side ? order.side.toUpperCase() : 'UNKNOWN',
          quantity: parseFloat(order.qty || 0),
          price: parseFloat(order.limit_price || order.stop_price || 0),
          timeInForce: order.time_in_force || 'GTC',
          status: order.status || 'UNKNOWN'
        };
      });
    } catch (error) {
      console.error('Error initializing trade data:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
    }
  }

  async getTradeHistory() {
    try {
      // Fetch fresh trade history
      const historyResponse = await axios.get(`${config.alpaca.trading.url}/v2/account/activities`, {
        headers: {
          'APCA-API-KEY-ID': config.alpaca.trading.key,
          'APCA-API-SECRET-KEY': config.alpaca.trading.secret
        },
        params: {
          activity_type: 'FILL',
          direction: 'desc',
          limit: 100
        }
      });

      this.tradeHistory = historyResponse.data.map(activity => {
        return {
          id: activity.id || uuidv4(),
          date: activity.created_at || new Date().toISOString(),
          symbol: activity.symbol || 'UNKNOWN',
          companyName: activity.symbol || 'Unknown Company',
          action: activity.side ? activity.side.toUpperCase() : 'UNKNOWN',
          quantity: parseFloat(activity.qty || 0),
          price: parseFloat(activity.price || 0),
          total: parseFloat(activity.qty || 0) * parseFloat(activity.price || 0),
          pl: activity.pl ? parseFloat(activity.pl) : undefined,
          plPercent: activity.pl_percent ? parseFloat(activity.pl_percent) : undefined
        };
      });

      return this.tradeHistory;
    } catch (error) {
      console.error('Error fetching trade history:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      return [];
    }
  }

  getOpenOrders() {
    return this.openOrders;
  }

  async placeOrder(order) {
    try {
      const response = await axios.post(`${config.alpaca.trading.url}/v2/orders`, {
        symbol: order.symbol,
        qty: order.quantity,
        side: order.side.toLowerCase(),
        type: order.type.toLowerCase(),
        time_in_force: order.timeInForce,
        limit_price: order.price,
        stop_price: order.stopPrice
      }, {
        headers: {
          'APCA-API-KEY-ID': config.alpaca.trading.key,
          'APCA-API-SECRET-KEY': config.alpaca.trading.secret
        }
      });

      const newOrder = {
        id: response.data.id,
        date: response.data.created_at,
        symbol: response.data.symbol,
        companyName: response.data.symbol,
        type: response.data.type,
        side: response.data.side.toUpperCase(),
        quantity: parseFloat(response.data.qty),
        price: parseFloat(response.data.limit_price || response.data.stop_price || 0),
        timeInForce: response.data.time_in_force,
        status: response.data.status
      };

      this.openOrders.push(newOrder);
      this.notifyClients();
      return newOrder;
    } catch (error) {
      console.error('Error placing order:', error);
      throw error;
    }
  }

  async cancelOrder(orderId) {
    try {
      await axios.delete(`${config.alpaca.trading.url}/v2/orders/${orderId}`, {
        headers: {
          'APCA-API-KEY-ID': config.alpaca.trading.key,
          'APCA-API-SECRET-KEY': config.alpaca.trading.secret
        }
      });

      const orderIndex = this.openOrders.findIndex(order => order.id === orderId);
      if (orderIndex !== -1) {
        this.openOrders[orderIndex].status = 'Cancelled';
        this.notifyClients();
      }

      return true;
    } catch (error) {
      console.error('Error cancelling order:', error);
      return false;
    }
  }

  async modifyOrder(orderId, updates) {
    try {
      const response = await axios.patch(`${config.alpaca.trading.url}/v2/orders/${orderId}`, {
        qty: updates.quantity,
        limit_price: updates.price,
        stop_price: updates.stopPrice
      }, {
        headers: {
          'APCA-API-KEY-ID': config.alpaca.trading.key,
          'APCA-API-SECRET-KEY': config.alpaca.trading.secret
        }
      });

      const orderIndex = this.openOrders.findIndex(order => order.id === orderId);
      if (orderIndex !== -1) {
        this.openOrders[orderIndex] = {
          ...this.openOrders[orderIndex],
          quantity: parseFloat(response.data.qty),
          price: parseFloat(response.data.limit_price || response.data.stop_price || 0),
          status: response.data.status
        };
        this.notifyClients();
        return this.openOrders[orderIndex];
      }

      return null;
    } catch (error) {
      console.error('Error modifying order:', error);
      return null;
    }
  }

  notifyClients() {
    if (this.io) {
      this.io.emit('trade_update', {
        trades: this.tradeHistory,
        orders: this.openOrders
      });
    }
  }
}

module.exports = { TradeService }; 