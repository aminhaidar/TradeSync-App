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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License
