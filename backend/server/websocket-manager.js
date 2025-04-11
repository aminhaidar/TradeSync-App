const WebSocket = require('ws');
const config = require('./config');

class WebSocketManager {
  constructor(io) {
    this.io = io;
    this.dataWS = null;
    this.tradingWS = null;
    this.reconnectAttempts = 0;
    this.subscriptions = new Set();
    this.messageQueue = [];
    this.latestData = {};
    this.latestTrades = [];
    this.updateInterval = null;
    this.heartbeatInterval = null;
    
    // Initialize data cleanup
    this.startDataCleanup();
    
    // Initialize message batching
    this.startMessageBatching();
    
    // Initialize health monitoring
    this.startHealthMonitoring();

    // Initialize frequent updates
    this.startFrequentUpdates();
  }
  
  // WebSocket Connection Methods
  connectDataWebSocket() {
    console.log('Connecting to Alpaca Data WebSocket...');
    
    this.dataWS = new WebSocket(config.alpaca.data.wsUrl);
    
    this.dataWS.on('open', () => {
      console.log('Connected to Alpaca Data WebSocket');
      this.reconnectAttempts = 0;
      this.authenticateDataStream();
    });
    
    this.dataWS.on('message', (data) => this.handleDataMessage(data));
    this.dataWS.on('error', (error) => this.handleError(error, 'data'));
    this.dataWS.on('close', () => this.handleClose('data'));
  }
  
  connectTradingWebSocket() {
    console.log('Connecting to Alpaca Trading WebSocket...');
    
    this.tradingWS = new WebSocket(config.alpaca.trading.wsUrl);
    
    this.tradingWS.on('open', () => {
      console.log('Connected to Alpaca Trading WebSocket');
      this.reconnectAttempts = 0;
      this.authenticateTradingStream();
    });
    
    this.tradingWS.on('message', (data) => this.handleTradingMessage(data));
    this.tradingWS.on('error', (error) => this.handleError(error, 'trading'));
    this.tradingWS.on('close', () => this.handleClose('trading'));
  }
  
  // Authentication Methods
  authenticateDataStream() {
    const authMsg = {
      action: 'auth',
      key: config.alpaca.data.key,
      secret: config.alpaca.data.secret
    };
    
    console.log('Sending data stream authentication...');
    this.dataWS.send(JSON.stringify(authMsg));
  }
  
  authenticateTradingStream() {
    const authMsg = {
      action: 'authenticate',
      data: {
        key_id: config.alpaca.trading.key,
        secret_key: config.alpaca.trading.secret
      }
    };
    
    console.log('Sending trading stream authentication...');
    this.tradingWS.send(JSON.stringify(authMsg));
  }
  
  // Message Handling Methods
  handleDataMessage(data) {
    try {
      const messages = JSON.parse(data);
      
      if (!Array.isArray(messages)) {
        console.log('Received non-array message:', messages);
        return;
      }
      
      messages.forEach(msg => {
        switch (msg.T) {
          case 'success':
            if (msg.msg === 'authenticated') {
              console.log('Authentication successful for data stream');
              this.subscribeToSymbols();
              this.startHeartbeat();
            }
            break;
            
          case 'subscription':
            console.log('Subscription successful:', msg);
            break;
            
          case 'error':
            this.handleAlpacaError(msg);
            break;
            
          case 'q':
            this.handleQuote(msg);
            break;
            
          case 't':
            this.handleTrade(msg);
            break;
            
          case 'b':
            this.handleBar(msg);
            break;
            
          default:
            console.log('Unhandled message type:', msg.T);
        }
      });
    } catch (error) {
      console.error('Error handling data message:', error);
    }
  }
  
  handleTradingMessage(data) {
    try {
      const msg = JSON.parse(data);
      
      if (msg.stream === 'authorization' && msg.data?.status === 'authorized') {
        console.log('Authentication successful for trading stream');
        this.subscribeToTradingUpdates();
      } else if (msg.stream === 'trade_updates') {
        this.io.emit('tradeUpdate', msg.data);
      }
    } catch (error) {
      console.error('Error processing Trading WebSocket message:', error);
    }
  }
  
  // Data Processing Methods
  handleQuote(msg) {
    const { S: symbol, bp: bidPrice, ap: askPrice, t: timestamp } = msg;
    
    if (!this.subscriptions.has(symbol)) return;
    
    const quoteData = {
      symbol,
      bidPrice,
      askPrice,
      timestamp,
      midPrice: (bidPrice + askPrice) / 2,
      spread: askPrice - bidPrice
    };
    
    this.latestData[symbol] = quoteData;
    this.messageQueue.push({ type: 'quote', data: quoteData });
  }
  
  handleTrade(msg) {
    const { S: symbol, p: price, s: size, t: timestamp } = msg;
    
    if (!this.subscriptions.has(symbol)) return;
    
    const trade = { symbol, price, size, timestamp };
    this.latestTrades = [trade, ...this.latestTrades.slice(0, config.data.maxTrades - 1)];
    this.messageQueue.push({ type: 'trade', data: trade });
  }
  
  handleBar(msg) {
    const { S: symbol, o: open, h: high, l: low, c: close, v: volume, t: timestamp } = msg;
    
    if (!this.subscriptions.has(symbol)) return;
    
    const barData = { symbol, open, high, low, close, volume, timestamp };
    this.messageQueue.push({ type: 'bar', data: barData });
  }
  
  // Subscription Management
  subscribeToSymbols() {
    if (this.subscriptions.size === 0) return;
    
    const subscribeMsg = {
      action: 'subscribe',
      quotes: Array.from(this.subscriptions),
      trades: Array.from(this.subscriptions),
      bars: Array.from(this.subscriptions)
    };
    
    this.dataWS.send(JSON.stringify(subscribeMsg));
  }
  
  subscribeToTradingUpdates() {
    const listenMsg = {
      action: 'listen',
      data: {
        streams: ['trade_updates']
      }
    };
    
    this.tradingWS.send(JSON.stringify(listenMsg));
  }
  
  subscribeToSymbol(symbol) {
    if (this.subscriptions.has(symbol)) return;
    
    this.subscriptions.add(symbol);
    const subscribeMsg = {
      action: 'subscribe',
      quotes: [symbol],
      trades: [symbol],
      bars: [symbol]
    };
    
    this.dataWS.send(JSON.stringify(subscribeMsg));
  }
  
  unsubscribeFromSymbol(symbol) {
    if (!this.subscriptions.has(symbol)) return;
    
    this.subscriptions.delete(symbol);
    const unsubscribeMsg = {
      action: 'unsubscribe',
      quotes: [symbol],
      trades: [symbol],
      bars: [symbol]
    };
    
    this.dataWS.send(JSON.stringify(unsubscribeMsg));
  }
  
  // Error Handling
  handleError(error, stream) {
    console.error(`${stream} WebSocket error:`, error);
  }
  
  handleAlpacaError(error) {
    switch (error.code) {
      case 400:
        console.error('Invalid syntax in message');
        break;
      case 401:
        console.error('Not authenticated');
        break;
      case 402:
        console.error('Authentication failed');
        break;
      case 405:
        console.error('Symbol limit exceeded');
        break;
      case 406:
        console.error('Connection limit exceeded');
        break;
      default:
        console.error('Unknown error:', error);
    }
  }
  
  handleClose(stream) {
    console.log(`${stream} WebSocket closed`);
    
    // Clear intervals
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Attempt to reconnect after a delay
    setTimeout(() => {
      if (this.reconnectAttempts < 5) {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect ${stream} WebSocket (attempt ${this.reconnectAttempts})`);
        if (stream === 'data') {
          this.connectDataWebSocket();
        } else {
          this.connectTradingWebSocket();
        }
      } else {
        console.error(`Failed to reconnect ${stream} WebSocket after ${this.reconnectAttempts} attempts`);
        this.io.emit('connectionHealth', { 
          status: 'error', 
          message: `Failed to reconnect ${stream} WebSocket`,
          timestamp: Date.now()
        });
      }
    }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000));
  }
  
  // Data Management
  startDataCleanup() {
    setInterval(() => {
      if (this.latestTrades.length > config.data.maxTrades) {
        this.latestTrades = this.latestTrades.slice(-config.data.maxTrades);
      }
    }, config.data.cleanupInterval);
  }
  
  startMessageBatching() {
    setInterval(() => {
      if (this.messageQueue.length > 0) {
        const batch = this.messageQueue.splice(0, this.messageQueue.length);
        this.io.emit('marketUpdates', batch);
      }
    }, config.websocket.batchInterval);
  }
  
  startHealthMonitoring() {
    setInterval(() => {
      const isHealthy = this.dataWS?.readyState === WebSocket.OPEN && 
                       this.tradingWS?.readyState === WebSocket.OPEN;
      
      this.io.emit('connectionHealth', {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date(),
        dataStream: this.dataWS?.readyState === WebSocket.OPEN,
        tradingStream: this.tradingWS?.readyState === WebSocket.OPEN
      });
    }, config.websocket.healthCheckInterval);
  }
  
  startFrequentUpdates() {
    // Clear any existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Send updates every 500ms
    this.updateInterval = setInterval(() => {
      if (Object.keys(this.latestData).length > 0) {
        this.io.emit('accountInfo', this.latestData);
      }
    }, 500);
  }
  
  startHeartbeat() {
    // Clear any existing interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.io.emit('connectionHealth', { status: 'healthy', timestamp: Date.now() });
    }, 30000);
  }
  
  // Public Methods
  getLatestData() {
    return this.latestData;
  }
  
  getLatestTrades() {
    return this.latestTrades;
  }
  
  getSubscriptions() {
    return Array.from(this.subscriptions);
  }
  
  isConnected() {
    return this.dataWS?.readyState === WebSocket.OPEN && 
           this.tradingWS?.readyState === WebSocket.OPEN;
  }
}

module.exports = WebSocketManager; 