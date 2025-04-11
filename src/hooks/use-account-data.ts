import { useState, useCallback, useEffect, useRef } from 'react'
import { WebSocketManager } from '../utils/websocket-manager'
import { AccountData, Activity, Fee } from '../types/account'
import { logger } from '../lib/logger'
import { accountApi } from '../lib/api'
import { transformAccountData } from '../utils/transformers'

// Helper functions for data transformation
function safeParseFloat(value: string | number | undefined | null): number {
  if (typeof value === 'number') return value
  if (!value) return 0
  const parsed = parseFloat(value)
  return isNaN(parsed) ? 0 : parsed
}

export const useAccountData = (wsUrl: string) => {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [accountData, setAccountData] = useState<AccountData | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [fees, setFees] = useState<Fee[]>([])
  const wsManagerRef = useRef<WebSocketManager | null>(null)
  const wsUrlRef = useRef(wsUrl)
  const isMountedRef = useRef(true)
  const retryCountRef = useRef(0)
  const maxRetries = 3
  const retryTimeoutRef = useRef<NodeJS.Timeout>()

  // Fetch initial account data
  const fetchAccountData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await accountApi.getSummary()
      const transformedData = transformAccountData(response.data)
      if (transformedData) {
        setAccountData(transformedData)
      }
    } catch (err) {
      logger.error('Failed to fetch account data:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleConnect = useCallback(() => {
    if (!isMountedRef.current) return
    logger.info('WebSocket connected')
    setIsConnected(true)
    setError(null)
    retryCountRef.current = 0
    fetchAccountData() // Fetch initial data on connection
  }, [fetchAccountData])

  const handleDisconnect = useCallback(() => {
    if (!isMountedRef.current) return
    logger.info('WebSocket disconnected')
    setIsConnected(false)
  }, [])

  const handleError = useCallback((err: Error) => {
    if (!isMountedRef.current) return
    logger.error('WebSocket error:', err)
    setError(err)
    setIsConnected(false)

    if (retryCountRef.current < maxRetries) {
      retryCountRef.current += 1
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000)
      logger.info(`Retrying connection in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`)
      
      retryTimeoutRef.current = setTimeout(() => {
        if (wsManagerRef.current && isMountedRef.current) {
          wsManagerRef.current.connect()
        }
      }, delay)
    }
  }, [])

  const handleAccountUpdate = useCallback((data: AccountData) => {
    if (!isMountedRef.current) return
    logger.debug('Updating account data:', data)
    setAccountData(prev => {
      logger.debug('Previous account data:', prev)
      return data
    })
  }, [])

  const handleActivity = useCallback((activity: Activity) => {
    if (!isMountedRef.current) return
    logger.debug('Adding new activity:', activity)
    setActivities(prev => {
      logger.debug('Previous activities:', prev)
      return [activity, ...prev]
    })
  }, [])

  const handleFee = useCallback((fee: Fee) => {
    if (!isMountedRef.current) return
    logger.debug('Adding new fee:', fee)
    setFees(prev => {
      logger.debug('Previous fees:', prev)
      return [fee, ...prev]
    })
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    setIsLoading(true)
    logger.info('Setting up WebSocket connection')

    if (!wsUrl) {
      const err = new Error('WebSocket URL is required')
      logger.error('WebSocket URL is missing')
      setError(err)
      setIsLoading(false)
      return
    }

    if (wsUrlRef.current !== wsUrl) {
      logger.info('WebSocket URL changed, recreating manager')
      wsUrlRef.current = wsUrl
      if (wsManagerRef.current) {
        wsManagerRef.current.destroy()
      }
    }

    if (!wsManagerRef.current) {
      logger.info('Creating new WebSocket manager')
      try {
        const manager = new WebSocketManager(wsUrl)
        wsManagerRef.current = manager

        manager.on('connect', handleConnect)
        manager.on('disconnect', handleDisconnect)
        manager.on('error', handleError)
        manager.on('accountUpdate', handleAccountUpdate)
        manager.on('activity', handleActivity)
        manager.on('fee', handleFee)

        manager.connect()
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create WebSocket manager')
        logger.error('Failed to create WebSocket manager:', error)
        setError(error)
        setIsLoading(false)
      }
    }

    return () => {
      logger.info('Cleaning up WebSocket manager')
      isMountedRef.current = false
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (wsManagerRef.current) {
        wsManagerRef.current.off('connect', handleConnect)
        wsManagerRef.current.off('disconnect', handleDisconnect)
        wsManagerRef.current.off('error', handleError)
        wsManagerRef.current.off('accountUpdate', handleAccountUpdate)
        wsManagerRef.current.off('activity', handleActivity)
        wsManagerRef.current.off('fee', handleFee)
        wsManagerRef.current.destroy()
        wsManagerRef.current = null
      }
    }
  }, [wsUrl, handleConnect, handleDisconnect, handleError, handleAccountUpdate, handleActivity, handleFee])

  const reconnect = useCallback(() => {
    if (wsManagerRef.current && isMountedRef.current) {
      logger.info('Attempting to reconnect...')
      setIsLoading(true)
      retryCountRef.current = 0
      wsManagerRef.current.connect()
    }
  }, [])

  useEffect(() => {
    if (accountData) {
      console.log('Received account data:', accountData);
    }
  }, [accountData]);

  return {
    isConnected,
    isLoading,
    accountData,
    activities,
    fees,
    error,
    reconnect,
  }
} 