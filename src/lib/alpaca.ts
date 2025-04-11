import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5004';

export const apiClient = axios.create({
  baseURL: API_URL,
});

export async function getAccount() {
  try {
    const response = await apiClient.get('/api/account');
    return response.data;
  } catch (error) {
    console.error('Error fetching account data:', error);
    throw error;
  }
}

export async function getPositions() {
  try {
    const response = await apiClient.get('/api/positions');
    return response.data;
  } catch (error) {
    console.error('Error fetching positions:', error);
    throw error;
  }
} 