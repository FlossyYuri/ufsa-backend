import express from 'express';
import cors from 'cors';
import { setupRoutes } from './routes.js';
import { initializeCache } from './services/cache.js';
import config from './config.js';

const app = express();
const { port } = config.server;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize cache
await initializeCache();

// Setup routes
setupRoutes(app);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.server.isDevelopment ? err.message : undefined
  });
});

// Export for Vercel
export default app;

// Start server if not in Vercel environment
if (!config.server.isVercel) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port} in ${config.server.nodeEnv} mode`);
  });
}