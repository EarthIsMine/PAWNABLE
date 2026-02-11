import express from 'express';
import { env } from './config/env';
import { corsMiddleware } from './middlewares/cors';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import prisma from './config/database';

// Routes
import intentRoutes from './routes/intentRoutes';
import loanRoutes from './routes/loanRoutes';
import tokenRoutes from './routes/tokenRoutes';

const app = express();

// Middlewares
app.use(express.json());
app.use(corsMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/intents', intentRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/tokens', tokenRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`🚀 PAWNABLE Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 Chain ID: ${env.BASE_CHAIN_ID}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});
