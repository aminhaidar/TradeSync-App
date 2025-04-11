import express from 'express'
import { Server } from 'socket.io'
import { createServer } from 'http'
import { AlpacaClient } from '@alpacahq/alpaca-trade-api'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

// Initialize Alpaca client
const alpaca = new AlpacaClient({
  key: process.env.ALPACA_API_KEY!,
  secret: process.env.ALPACA_API_SECRET!,
  paper: true
})

// Store connected clients
const connectedClients = new Set()

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected')
  connectedClients.add(socket)

  // Send initial account data
  sendAccountData(socket)

  // Set up periodic updates
  const updateInterval = setInterval(() => {
    sendAccountData(socket)
  }, 5000) // Update every 5 seconds

  socket.on('disconnect', () => {
    console.log('Client disconnected')
    connectedClients.delete(socket)
    clearInterval(updateInterval)
  })
})

// Function to fetch and send account data
async function sendAccountData(socket: any) {
  try {
    const account = await alpaca.getAccount()
    const positions = await alpaca.getPositions()
    
    // Calculate P/L metrics
    const dayPL = parseFloat(account.daytrade_count) * parseFloat(account.daytrade_buying_power)
    const totalPL = parseFloat(account.equity) - parseFloat(account.last_equity)
    const openEquity = positions.reduce((sum, pos) => sum + parseFloat(pos.market_value), 0)

    const accountData = {
      balance: parseFloat(account.equity),
      buyingPower: parseFloat(account.buying_power),
      openEquity,
      dayPL,
      dayPLPercent: (dayPL / parseFloat(account.equity)) * 100,
      weekPL: parseFloat(account.equity) - parseFloat(account.last_equity),
      weekPLPercent: ((parseFloat(account.equity) - parseFloat(account.last_equity)) / parseFloat(account.last_equity)) * 100,
      monthPL: parseFloat(account.equity) - parseFloat(account.last_equity),
      monthPLPercent: ((parseFloat(account.equity) - parseFloat(account.last_equity)) / parseFloat(account.last_equity)) * 100,
      totalPL,
      totalPLPercent: (totalPL / parseFloat(account.last_equity)) * 100
    }

    socket.emit('account', accountData)
  } catch (error) {
    console.error('Error fetching account data:', error)
    socket.emit('error', { message: 'Failed to fetch account data' })
  }
}

// REST API endpoints
app.get('/api/account', async (req, res) => {
  try {
    const account = await alpaca.getAccount()
    const positions = await alpaca.getPositions()
    
    const dayPL = parseFloat(account.daytrade_count) * parseFloat(account.daytrade_buying_power)
    const totalPL = parseFloat(account.equity) - parseFloat(account.last_equity)
    const openEquity = positions.reduce((sum, pos) => sum + parseFloat(pos.market_value), 0)

    res.json({
      balance: parseFloat(account.equity),
      buyingPower: parseFloat(account.buying_power),
      openEquity,
      dayPL,
      dayPLPercent: (dayPL / parseFloat(account.equity)) * 100,
      weekPL: parseFloat(account.equity) - parseFloat(account.last_equity),
      weekPLPercent: ((parseFloat(account.equity) - parseFloat(account.last_equity)) / parseFloat(account.last_equity)) * 100,
      monthPL: parseFloat(account.equity) - parseFloat(account.last_equity),
      monthPLPercent: ((parseFloat(account.equity) - parseFloat(account.last_equity)) / parseFloat(account.last_equity)) * 100,
      totalPL,
      totalPLPercent: (totalPL / parseFloat(account.last_equity)) * 100
    })
  } catch (error) {
    console.error('Error fetching account data:', error)
    res.status(500).json({ error: 'Failed to fetch account data' })
  }
})

// Start server
const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
}) 