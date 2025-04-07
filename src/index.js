import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { setupRoutes } from './routes.js';
import { initializeCache } from './services/cache.js';
import { setupLogging } from './utils/logging.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Only use morgan in development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('combined', { stream: setupLogging() }));
}

// Initialize cache
await initializeCache();

// Setup routes
setupRoutes(app);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Export for Vercel
export default app;

// Start server if not in Vercel environment
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}