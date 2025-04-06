const io = require('socket.io-client');
const socket = io('http://localhost:5004', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
});

console.log('Connecting to TradeSync server...');

// Listen for initial data
socket.on('initialData', (data) => {
  console.log('\nReceived initial data:');
  console.log('Market Data:', data.marketData);
  console.log('Recent Trades:', data.trades);
});

// Listen for account information
socket.on('accountInfo', (accountInfo) => {
  console.log('\nReceived account information:');
  console.log(accountInfo);
});

// Listen for connection health updates
socket.on('connectionHealth', (health) => {
  console.log('\nConnection Health:');
  console.log('Status:', health.status);
  console.log('Data Stream:', health.dataStream ? 'Connected' : 'Disconnected');
  console.log('Trading Stream:', health.tradingStream ? 'Connected' : 'Disconnected');
  console.log('Timestamp:', new Date(health.timestamp).toLocaleTimeString());
});

// Listen for batched market updates
socket.on('marketUpdates', (updates) => {
  console.log('\nReceived market updates batch:');
  updates.forEach(update => {
    switch (update.type) {
      case 'quote':
        console.log(`Quote for ${update.data.symbol}:`);
        console.log(`  Bid: ${update.data.bidPrice}`);
        console.log(`  Ask: ${update.data.askPrice}`);
        console.log(`  Mid: ${update.data.midPrice}`);
        console.log(`  Spread: ${update.data.spread}`);
        console.log(`  Time: ${new Date(update.data.timestamp).toLocaleTimeString()}`);
        break;
        
      case 'trade':
        console.log(`Trade for ${update.data.symbol}:`);
        console.log(`  Price: ${update.data.price}`);
        console.log(`  Size: ${update.data.size}`);
        console.log(`  Time: ${new Date(update.data.timestamp).toLocaleTimeString()}`);
        break;
        
      case 'bar':
        console.log(`Bar for ${update.data.symbol}:`);
        console.log(`  Open: ${update.data.open}`);
        console.log(`  High: ${update.data.high}`);
        console.log(`  Low: ${update.data.low}`);
        console.log(`  Close: ${update.data.close}`);
        console.log(`  Volume: ${update.data.volume}`);
        console.log(`  Time: ${new Date(update.data.timestamp).toLocaleTimeString()}`);
        break;
    }
  });
});

// Listen for trade updates (orders, fills)
socket.on('tradeUpdate', (update) => {
  console.log('\nTrade Update:');
  console.log(update);
});

// Handle connection events
socket.on('connect', () => {
  console.log('Connected to server!');
  
  // Test subscribing to a new symbol
  setTimeout(() => {
    console.log('\nTesting symbol subscription...');
    socket.emit('subscribe', 'TSLA');
  }, 5000);
  
  // Test unsubscribing from a symbol
  setTimeout(() => {
    console.log('\nTesting symbol unsubscription...');
    socket.emit('unsubscribe', 'TSLA');
  }, 15000);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`Attempting to reconnect... (attempt ${attemptNumber})`);
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`Reconnected after ${attemptNumber} attempts`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nClosing connection...');
  socket.close();
  process.exit(0);
}); 