import { Pool } from 'pg';
import Logger from '../utils/logger';

const logger = new Logger('Database');

// Parse the connection string
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a new pool instance
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Render PostgreSQL
  }
});

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    logger.error('Error connecting to the database:', err);
    return;
  }
  logger.info('Successfully connected to PostgreSQL database');
  release();
});

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool; 