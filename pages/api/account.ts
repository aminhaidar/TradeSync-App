import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5004'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const response = await axios.get(`${backendUrl}/api/account`, {
      headers: {
        'Content-Type': 'application/json'
      }
    })

    return res.status(200).json(response.data)
  } catch (error: any) {
    console.error('Error fetching account data:', error)
    
    if (error.response?.status === 403) {
      return res.status(403).json({ 
        error: 'Authentication failed',
        details: error.response.data
      })
    }
    
    return res.status(500).json({ 
      error: 'Failed to fetch account data',
      details: error.message
    })
  }
} 