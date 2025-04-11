import axios from 'axios'
import { logger } from './logger'

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5004'

// Create axios instance with default config
const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add request interceptor for API keys
api.interceptors.request.use((config) => {
  logger.debug('Making API request:', {
    url: config.url,
    method: config.method,
    headers: config.headers,
    timestamp: new Date().toISOString()
  });

  // Only add API keys for Alpaca API requests
  if (config.url?.includes('alpaca.markets')) {
    config.headers['APCA-API-KEY-ID'] = process.env.ALPACA_API_KEY || ''
    config.headers['APCA-API-SECRET-KEY'] = process.env.ALPACA_API_SECRET || ''
  }
  return config
})

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    logger.debug('API response received:', {
      url: response.config.url,
      status: response.status,
      data: response.data,
      timestamp: new Date().toISOString()
    });
    return response;
  },
  (error) => {
    logger.error('API error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      timestamp: new Date().toISOString()
    });
    if (error.response?.status === 403) {
      console.error('Authentication error:', error.response.data)
      // You might want to redirect to login or show an error message
    }
    return Promise.reject(error)
  }
)

// Account API
export const accountApi = {
  getSummary: () => api.get('/api/account'),
  getPositions: () => api.get('/api/positions')
}

// Trade API
export const tradeApi = {
  getHistory: () => api.get('/api/trades/history'),
  getOrders: () => api.get('/api/trades/orders'),
  placeOrder: (order: any) => api.post('/api/trades/orders', order),
  modifyOrder: (orderId: string, updates: any) => api.put(`/api/trades/orders/${orderId}`, updates),
  cancelOrder: (orderId: string) => api.delete(`/api/trades/orders/${orderId}`)
} 