import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Configuration object with default values
const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    isVercel: process.env.VERCEL === '1'
  },

  // UFSA API configuration
  ufsa: {
    baseUrl: process.env.UFSA_BASE_URL || 'https://www.ufsa.gov.mz'
  },

  // Persistence API configuration
  persistence: {
    apiUrl: process.env.PERSISTENCE_API_URL || 'https://ejitech.co.mz/data-api.php'
  },

  // Cache configuration
  cache: {
    interval: parseInt(process.env.CACHE_INTERVAL, 10) || 8 * 60 * 60 * 1000, // 8 hours
    maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS, 10) || 2,
    retryDelay: parseInt(process.env.RETRY_DELAY, 10) || 5 * 60 * 1000 // 5 minutes
  },

  // Request configuration
  request: {
    minDelay: parseInt(process.env.REQUEST_MIN_DELAY, 10) || 2000, // 2 seconds
    maxDelay: parseInt(process.env.REQUEST_MAX_DELAY, 10) || 5000, // 5 seconds
    maxAttempts: parseInt(process.env.REQUEST_MAX_ATTEMPTS, 10) || 5
  }
};

export default config;
