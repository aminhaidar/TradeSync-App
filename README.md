<<<<<<< HEAD
# TradeSync Frontend

TradeSync Frontend is a modern, responsive trading platform built with Next.js, TypeScript, and Tailwind CSS. It provides a comprehensive interface for trading, portfolio management, market data visualization, and more.

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Components](#components)
- [Pages](#pages)
- [State Management](#state-management)
- [WebSocket Integration](#websocket-integration)
- [Setup](#setup)
- [Development](#development)
- [Styling](#styling)
- [Testing](#testing)

## Features

- Real-time market data visualization
- Interactive trading interface
- Portfolio management
- Performance analytics
- Trade journal
- Market insights
- Alert management
- Responsive design
- Dark/Light theme support
- Error boundary implementation
- Mobile responsiveness

## Architecture

### Tech Stack
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **WebSocket**: Custom WebSocket Manager
- **UI Components**: Custom components with shadcn/ui
- **Routing**: Next.js App Router
- **API Integration**: REST and WebSocket

### Project Structure
```
frontend/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Utilities and services
├── public/              # Static assets
└── package.json         # Dependencies and scripts
```

## Components

### Layout Components
- **Layout**: Main application layout
- **AppSidebar**: Navigation sidebar
- **SiteHeader**: Top navigation bar
- **NavMain**: Main navigation
- **NavSecondary**: Secondary navigation
- **NavUser**: User profile navigation
- **NavDocuments**: Document management navigation
- **ThemeProvider**: Theme management

### UI Components
- **ErrorBoundary**: Error handling component
- Custom UI components from shadcn/ui

### Account Components
- Account management components
- Profile settings
- User preferences

## Pages

### Dashboard
- Overview of trading performance
- Quick access to key features
- Real-time market updates

### Portfolio
- Position management
- Asset allocation
- Performance tracking
- Risk analysis

### Trades
- Trade execution
- Order management
- Trade history
- Position tracking

### Market Data
- Real-time market data
- Price charts
- Volume analysis
- Market depth

### Performance
- Performance metrics
- P/L analysis
- Risk metrics
- Historical performance

### Insights
- Market analysis
- Trading patterns
- Technical indicators
- Market sentiment

### Journal
- Trade journal
- Notes and analysis
- Performance tracking
- Strategy documentation

### Alerts
- Price alerts
- Technical alerts
- Custom alerts
- Alert management

### Settings
- User preferences
- Account settings
- Notification settings
- API configuration

### Help
- Documentation
- FAQs
- Support
- Tutorials

## State Management

### Custom Hooks
- **useMobile**: Mobile device detection
- Custom hooks for data fetching
- State management hooks
- WebSocket integration hooks

### WebSocket Integration
- Real-time market data
- Order updates
- Position updates
- Account updates

## WebSocket Integration

### WebSocket Manager
- Real-time data streaming
- Connection management
- Error handling
- Reconnection logic
- Data processing
- Event handling

### WebSocket Events
- Market data updates
- Order updates
- Position updates
- Account updates
- System notifications

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env.local` file with required environment variables:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5004
   NEXT_PUBLIC_WS_URL=ws://localhost:5004
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Development

### Scripts
```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start

# Lint
npm run lint

# Type checking
npm run type-check
```

### Code Style
- ESLint configuration
- Prettier formatting
- TypeScript strict mode
- Component-based architecture
- Responsive design principles

## Styling

### Tailwind CSS
- Custom theme configuration
- Responsive design
- Dark mode support
- Component styling
- Utility classes

### Custom Components
- Reusable UI components
- Consistent design system
- Accessibility support
- Responsive layouts

## Testing

### Unit Testing
```bash
npm run test
```

### Component Testing
- React Testing Library
- Jest
- Component snapshots
- Integration tests

### E2E Testing
- Cypress
- Playwright
- User flow testing
- Performance testing

## Deployment

### Production Build
```bash
npm run build
```

### Deployment Options
- Vercel
- AWS Amplify
- Docker
- Custom server
=======
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
>>>>>>> origin/main

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

<<<<<<< HEAD
MIT License
=======
MIT License - see LICENSE file for details

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.

## Acknowledgments

- [Alpaca Markets](https://alpaca.markets/) for providing the trading API
- [Socket.IO](https://socket.io/) for real-time WebSocket functionality
- [Express](https://expressjs.com/) for the HTTP server framework

## Adding Components to the Dashboard

### Component Structure Guidelines

When adding new components to the dashboard, follow these guidelines to maintain consistency and proper theming:

#### 1. Basic Component Structure
```tsx
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export function YourComponent() {
  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1 text-center sm:text-left">
            <CardTitle>Component Title</CardTitle>
            <CardDescription>Component description</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Component content */}
        </CardContent>
      </Card>
    </div>
  )
}
```

#### 2. Theme Integration
- Use Shadcn's theme variables for colors:
  ```tsx
  // Correct way to use theme colors
  stroke="hsl(var(--border))"
  className="bg-muted"
  color="hsl(var(--chart-1))"
  ```
- Available theme variables:
  - `--background`
  - `--foreground`
  - `--card`
  - `--card-foreground`
  - `--popover`
  - `--muted`
  - `--muted-foreground`
  - `--border`
  - `--input`
  - `--chart-1` through `--chart-5` (for data visualizations)

#### 3. Chart Components
When creating chart components:
```tsx
const chartConfig = {
  dataKey1: {
    label: "Label 1",
    color: "hsl(221.2 83.2% 53.3%)", // Primary chart color
  },
  dataKey2: {
    label: "Label 2",
    color: "hsl(212 95% 68%)",  // Secondary chart color
  },
} satisfies ChartConfig

// Use ChartContainer for consistent chart styling
<ChartContainer
  config={chartConfig}
  className="aspect-auto h-[250px] w-full"
>
  <YourChart>
    {/* Chart configuration */}
  </YourChart>
</ChartContainer>
```

#### 4. Loading States
Include loading states for better UX:
```tsx
const [mounted, setMounted] = React.useState(false)

React.useEffect(() => {
  setMounted(true)
}, [])

if (!mounted) {
  return (
    <div className="h-[250px] w-full animate-pulse rounded-lg bg-muted" />
  )
}
```

#### 5. Responsive Design
- Use the following padding classes for consistent spacing:
  ```tsx
  className="px-4 lg:px-6" // Outer container
  className="p-6" // Card content
  ```
- Use responsive class modifiers:
  ```tsx
  className="text-center sm:text-left"
  className="flex-col sm:flex-row"
  ```

#### 6. Common UI Components
Import and use Shadcn UI components:
```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
```

### Integration with Dashboard

1. Create your component in `src/components/`
2. Import and add to the dashboard layout in `src/app/dashboard/page.tsx`:
```tsx
import { YourComponent } from "@/components/your-component"

export default function DashboardPage() {
  return (
    <div className="grid gap-4 md:gap-8">
      <AccountSummary />
      <YourComponent />
      {/* Other components */}
    </div>
  )
}
```

### Best Practices

1. **Client Components**: Use "use client" directive for interactive components
2. **Type Safety**: Use TypeScript interfaces for props and data
3. **Error Handling**: Include error states and fallbacks
4. **Accessibility**: Include proper ARIA labels and keyboard navigation
5. **Performance**: Implement proper loading states and data fetching
6. **Theming**: Always use theme variables for colors and styling
7. **Responsiveness**: Test and ensure proper display on all screen sizes

### Example Components
- See `src/components/performance-chart.tsx` for a complete example of a chart component
- See `src/components/account-summary.tsx` for a data display component
- See `src/components/open-positions.tsx` for a table component

### Component Structure

#### 1. Dashboard Components
All components in the dashboard should follow this structure:
```tsx
export function YourComponent() {
  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1 text-center sm:text-left">
            <CardTitle>Component Title</CardTitle>
            <CardDescription>Component description</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Component content */}
        </CardContent>
      </Card>
    </div>
  )
}
```

Key points:
- Outer wrapper with responsive padding: `className="px-4 lg:px-6"`
- Consistent card header structure with border and padding
- Card content with uniform padding: `className="p-6"`
- Responsive text alignment: `text-center sm:text-left`

#### 2. Theme Integration
- Use Shadcn's theme variables for colors:
  ```tsx
  // Correct way to use theme colors
  stroke="hsl(var(--border))"
  className="bg-muted"
  color="hsl(var(--chart-1))"
  ```
- Available theme variables:
  - `--background`
  - `--foreground`
  - `--card`
  - `--card-foreground`
  - `--popover`
  - `--muted`
  - `--muted-foreground`
  - `--border`
  - `--input`
  - `--chart-1` through `--chart-5` (for data visualizations)

#### 3. Chart Components
When creating chart components:
```tsx
const chartConfig = {
  dataKey1: {
    label: "Label 1",
    color: "hsl(221.2 83.2% 53.3%)", // Primary chart color
  },
  dataKey2: {
    label: "Label 2",
    color: "hsl(212 95% 68%)",  // Secondary chart color
  },
} satisfies ChartConfig

// Use ChartContainer for consistent chart styling
<ChartContainer
  config={chartConfig}
  className="aspect-auto h-[250px] w-full"
>
  <YourChart>
    {/* Chart configuration */}
  </YourChart>
</ChartContainer>
```

#### 4. Loading States
Include loading states for better UX:
```tsx
const [mounted, setMounted] = React.useState(false)

React.useEffect(() => {
  setMounted(true)
}, [])

if (!mounted) {
  return (
    <div className="h-[250px] w-full animate-pulse rounded-lg bg-muted" />
  )
}
```

#### 5. Responsive Design
- Use the following padding classes for consistent spacing:
  ```tsx
  className="px-4 lg:px-6" // Outer container
  className="p-6" // Card content
  ```
- Use responsive class modifiers:
  ```tsx
  className="text-center sm:text-left"
  className="flex-col sm:flex-row"
  ```

#### 6. Common UI Components
Import and use Shadcn UI components:
```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
```

### Integration with Dashboard

1. Create your component in `src/components/`
2. Import and add to the dashboard layout in `src/app/dashboard/page.tsx`:
```tsx
import { YourComponent } from "@/components/your-component"

export default function DashboardPage() {
  return (
    <div className="grid gap-4 md:gap-8">
      <AccountSummary />
      <YourComponent />
      {/* Other components */}
    </div>
  )
}
```

### Best Practices

1. **Client Components**: Use "use client" directive for interactive components
2. **Type Safety**: Use TypeScript interfaces for props and data
3. **Error Handling**: Include error states and fallbacks
4. **Accessibility**: Include proper ARIA labels and keyboard navigation
5. **Performance**: Implement proper loading states and data fetching
6. **Theming**: Always use theme variables for colors and styling
7. **Responsiveness**: Test and ensure proper display on all screen sizes

### Example Components
- See `src/components/performance-chart.tsx` for a complete example of a chart component
- See `src/components/account-summary.tsx` for a data display component
- See `src/components/open-positions.tsx` for a table component 
>>>>>>> origin/main
