const axios = require('axios');

const BASE_URL = 'http://localhost:5004';

async function testEndpoints() {
  try {
    console.log('Testing REST API endpoints...\n');

    // Test /api/status
    console.log('Testing /api/status...');
    try {
      const statusResponse = await axios.get(`${BASE_URL}/api/status`);
      console.log('Status Response:', statusResponse.data);
      console.log('Status: OK\n');
    } catch (error) {
      console.error('Status Error:', error.message);
      if (error.response) {
        console.error('Response Data:', error.response.data);
        console.error('Response Status:', error.response.status);
      }
    }

    // Test /api/account
    console.log('Testing /api/account...');
    try {
      const accountResponse = await axios.get(`${BASE_URL}/api/account`);
      console.log('Account Response:', accountResponse.data);
      console.log('Account: OK\n');
    } catch (error) {
      console.error('Account Error:', error.message);
      if (error.response) {
        console.error('Response Data:', error.response.data);
        console.error('Response Status:', error.response.status);
      }
    }

    // Test /api/market-data
    console.log('Testing /api/market-data...');
    try {
      const marketDataResponse = await axios.get(`${BASE_URL}/api/market-data`);
      console.log('Market Data Response:', marketDataResponse.data);
      console.log('Market Data: OK\n');
    } catch (error) {
      console.error('Market Data Error:', error.message);
      if (error.response) {
        console.error('Response Data:', error.response.data);
        console.error('Response Status:', error.response.status);
      }
    }

    // Test /api/trades
    console.log('Testing /api/trades...');
    try {
      const tradesResponse = await axios.get(`${BASE_URL}/api/trades`);
      console.log('Trades Response:', tradesResponse.data);
      console.log('Trades: OK\n');
    } catch (error) {
      console.error('Trades Error:', error.message);
      if (error.response) {
        console.error('Response Data:', error.response.data);
        console.error('Response Status:', error.response.status);
      }
    }

    // Test /api/symbols
    console.log('Testing /api/symbols...');
    try {
      const symbolsResponse = await axios.get(`${BASE_URL}/api/symbols`);
      console.log('Symbols Response:', symbolsResponse.data);
      console.log('Symbols: OK\n');
    } catch (error) {
      console.error('Symbols Error:', error.message);
      if (error.response) {
        console.error('Response Data:', error.response.data);
        console.error('Response Status:', error.response.status);
      }
    }

    // Test POST /api/symbols
    console.log('Testing POST /api/symbols...');
    try {
      const subscribeResponse = await axios.post(`${BASE_URL}/api/symbols`, {
        symbol: 'AAPL'
      });
      console.log('Subscribe Response:', subscribeResponse.data);
      console.log('Subscribe: OK\n');
    } catch (error) {
      console.error('Subscribe Error:', error.message);
      if (error.response) {
        console.error('Response Data:', error.response.data);
        console.error('Response Status:', error.response.status);
      }
    }

    console.log('All API tests completed!');
  } catch (error) {
    console.error('Fatal Error:', error.message);
  }
}

testEndpoints(); 