# TradeSync

A real-time trading analytics platform that integrates with Alpaca Markets API to provide live market data, trading capabilities, and portfolio analytics.

## Features

- Real-time market data streaming
- Live trading capabilities through Alpaca Markets
- Portfolio tracking and analytics
- WebSocket-based real-time updates
- RESTful API endpoints for data access
- Automatic reconnection handling
- Configurable market data subscriptions

## System Architecture

### Backend Components

- **Express Server**: Handles HTTP requests and serves the REST API
- **Socket.IO Server**: Manages real-time WebSocket connections with clients
- **WebSocket Manager**: Handles connections to Alpaca's WebSocket streams
- **Configuration Manager**: Manages environment variables and system settings

### Data Streams

- **Market Data Stream**: Real-time quotes, trades, and bars from Alpaca
- **Trading Stream**: Order updates and execution reports
- **Client Stream**: Real-time updates to connected clients

## API Endpoints

### REST API

- `GET /api/status`: Server status and WebSocket connection health
- `GET /api/account`: Current account information from Alpaca
- `GET /api/market-data`: Latest market data for subscribed symbols
- `GET /api/trades`: Recent trades for subscribed symbols
- `GET /api/symbols`: Currently subscribed symbols
- `POST /api/symbols`: Subscribe to a new symbol

### WebSocket Events

#### Client to Server
- `subscribe`: Subscribe to a symbol's market data
- `unsubscribe`: Unsubscribe from a symbol's market data

#### Server to Client
- `initialData`: Initial market data and trades on connection
- `accountInfo`: Account information updates
- `connectionHealth`: WebSocket connection status updates
- `marketUpdates`: Real-time market data updates
- `tradeUpdate`: Order and execution updates

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Alpaca Markets account and API credentials

### Environment Variables

Create a `.env` file in the `backend/server` directory:

```env
PORT=5004
ALPACA_API_KEY=your_api_key
ALPACA_API_SECRET=your_api_secret
ALPACA_TRADING_URL=https://paper-api.alpaca.markets
ALPACA_TRADING_WS_URL=wss://paper-api.alpaca.markets/stream
ALPACA_DATA_WS_URL=wss://stream.data.alpaca.markets/v2/test
ALPACA_API_URL=https://paper-api.alpaca.markets
```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/tradesync.git
   cd tradesync
   ```

2. Install backend dependencies:
   ```bash
   cd backend/server
   npm install
   ```

### Running the Server

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Testing

### Running API Tests

```bash
cd backend/server
node test-api.js
```

### Testing WebSocket Connection

```bash
cd backend/server
node test-client.js
```

The test client will:
1. Connect to the server
2. Receive initial data
3. Subscribe to TSLA market data
4. Unsubscribe after 15 seconds

## Configuration

### Server Configuration

The server can be configured through environment variables and the `config.js` file:

- Port number
- API endpoints
- WebSocket URLs
- Reconnection settings
- Data management settings

### Nodemon Configuration

Development auto-reload settings in `nodemon.json`:

```json
{
  "ignore": ["test-*.js", "*.test.js", "logs/*", "node_modules/*"],
  "delay": "2500"
}
```

## WebSocket Client Configuration

The Socket.IO client is configured with the following options:

```javascript
{
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
}
```

## Error Handling

- Automatic WebSocket reconnection
- Error logging and reporting
- Graceful connection termination
- API error responses with appropriate status codes

## Security

- CORS enabled for WebSocket and HTTP connections
- API key authentication for Alpaca API
- Environment variable protection
- Rate limiting (TODO)

## Logging

- WebSocket connection events
- Market data updates
- Trade executions
- Error conditions
- Server status changes

## Future Enhancements

- [ ] Add rate limiting
- [ ] Implement user authentication
- [ ] Add historical data analysis
- [ ] Create advanced order types
- [ ] Implement portfolio optimization
- [ ] Add technical indicators
- [ ] Create trading algorithms
- [ ] Add data persistence
- [ ] Implement backtesting capabilities

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.

## Acknowledgments

- [Alpaca Markets](https://alpaca.markets/) for providing the trading API
- [Socket.IO](https://socket.io/) for real-time WebSocket functionality
- [Express](https://expressjs.com/) for the HTTP server framework 