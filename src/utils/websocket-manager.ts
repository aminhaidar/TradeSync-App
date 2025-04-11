import { EventEmitter } from 'events';
import { io, Socket } from 'socket.io-client';
import { AccountData, Activity, Fee } from '../types/account';
import { logger } from '../lib/logger';
import { WS_CONFIG } from '../config/websocket';

export class WebSocketManager extends EventEmitter {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = WS_CONFIG.connection.reconnectionAttempts;
  private reconnectDelay = WS_CONFIG.connection.reconnectionDelay;
  private isConnecting = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isDestroyed = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = WS_CONFIG.connection.pingInterval;
  private subscribedSymbols = new Set<string>();
  private lastError: Error | null = null;

  constructor(private wsUrl: string) {
    super();
    if (!wsUrl) {
      throw new Error('WebSocket URL is required');
    }
  }

  connect() {
    if (this.isDestroyed) {
      logger.info('WebSocket manager is destroyed, cannot connect');
      return;
    }

    if (this.socket?.connected || this.isConnecting) {
      logger.info('Socket already connected or connecting');
      return;
    }

    this.isConnecting = true;
    this.lastError = null;

    try {
      // Clean the URL to ensure it's a valid WebSocket URL
      const cleanUrl = this.wsUrl
        .replace(/^ws/, 'http') // Replace ws with http for Socket.IO
        .replace(/\/ws$/, ''); // Remove /ws suffix
      
      logger.info(`Connecting to Socket.IO server: ${cleanUrl}`);
      logger.debug('Socket.IO connection details:', {
        url: cleanUrl,
        protocol: 'http',
        timestamp: new Date().toISOString()
      });
      
      this.socket = io(cleanUrl, {
        path: '/socket.io',
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 20000,
        autoConnect: true
      });

      this.setupEventListeners();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to create Socket.IO connection');
      logger.error('Failed to create Socket.IO connection:', err);
      this.handleError(err);
      this.isConnecting = false;
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch (error) {
        logger.error('Error while disconnecting Socket.IO:', error);
      }
      this.socket = null;
    }
    this.isConnecting = false;
  }

  destroy() {
    this.isDestroyed = true;
    this.disconnect();
    this.removeAllListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      if (this.isDestroyed) {
        this.socket?.disconnect();
        return;
      }
      logger.info('Socket.IO connection established');
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      this.lastError = null;
      this.emit('connect');
      this.startHeartbeat();
    });

    this.socket.on('disconnect', (reason) => {
      if (this.isDestroyed) return;
      
      logger.info(`Socket.IO connection closed: ${reason}`);
      this.isConnecting = false;
      this.emit('disconnect');
      
      if (reason !== 'io client disconnect') {
        this.handleReconnect();
      }
    });

    this.socket.on('error', (error) => {
      if (this.isDestroyed) return;
      
      const err = error instanceof Error ? error : new Error(`Socket.IO error: ${error}`);
      this.lastError = err;
      logger.error('Socket.IO error:', err);
      this.isConnecting = false;
      this.emit('error', err);
    });

    // Handle account updates
    this.socket.on('accountUpdate', (data: AccountData) => {
      this.emit('accountUpdate', data);
    });

    // Handle activities
    this.socket.on('activity', (activity: Activity) => {
      this.emit('activity', activity);
    });

    // Handle fees
    this.socket.on('fee', (fee: Fee) => {
      this.emit('fee', fee);
    });
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        logger.debug('Sending heartbeat');
        this.socket.emit('heartbeat');
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private handleReconnect() {
    if (this.isDestroyed) return;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(
        this.reconnectDelay * Math.pow(WS_CONFIG.error.backoffFactor, this.reconnectAttempts - 1),
        WS_CONFIG.error.maxRetryDelay
      );
      
      logger.info(`Attempting to reconnect in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }
      
      this.reconnectTimeout = setTimeout(() => {
        if (!this.isDestroyed) {
          this.connect();
        }
      }, delay);
    } else {
      const error = new Error(`Max reconnection attempts reached (${this.maxReconnectAttempts})`);
      this.lastError = error;
      logger.error('Max reconnection attempts reached');
      this.emit('error', error);
    }
  }

  private handleError(error: Error) {
    if (this.isDestroyed) return;
    
    this.lastError = error;
    logger.error('Socket.IO error:', error);
    this.emit('error', error);
    this.handleReconnect();
  }

  subscribeToSymbol(symbol: string) {
    if (!this.socket || !this.socket.connected) {
      logger.warn('Cannot subscribe to symbol - socket not connected');
      return;
    }

    if (this.subscribedSymbols.has(symbol)) {
      logger.info(`Already subscribed to symbol: ${symbol}`);
      return;
    }

    try {
      this.socket.emit('subscribe', symbol);
      this.subscribedSymbols.add(symbol);
      logger.info(`Subscribed to symbol: ${symbol}`);
    } catch (error) {
      logger.error('Failed to subscribe to symbol:', error);
    }
  }

  unsubscribeFromSymbol(symbol: string) {
    if (!this.socket || !this.socket.connected) {
      logger.warn('Cannot unsubscribe from symbol - socket not connected');
      return;
    }

    if (!this.subscribedSymbols.has(symbol)) {
      logger.info(`Not subscribed to symbol: ${symbol}`);
      return;
    }

    try {
      this.socket.emit('unsubscribe', symbol);
      this.subscribedSymbols.delete(symbol);
      logger.info(`Unsubscribed from symbol: ${symbol}`);
    } catch (error) {
      logger.error('Failed to unsubscribe from symbol:', error);
    }
  }

  getLastError(): Error | null {
    return this.lastError;
  }
} 