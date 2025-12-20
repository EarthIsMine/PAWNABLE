import 'reflect-metadata';
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import connectDatabase from './config/database';

// Middlewares
import { corsMiddleware } from './middlewares/cors';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

// Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import assetRoutes from './routes/assetRoutes';
import loanRoutes from './routes/loanRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8085;

// ===== MIDDLEWARES =====
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== ROUTES =====
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Welcome to PAWNABLE API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      assets: '/api/assets',
      loans: '/api/loans',
    },
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/loans', loanRoutes);

// ===== ERROR HANDLERS =====
app.use(notFoundHandler);
app.use(errorHandler);

// ===== DATABASE CONNECTION & SERVER START =====
connectDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log('\n=================================');
      console.log('🚀 PAWNABLE Server Started');
      console.log('=================================');
      console.log(`📡 Server: http://localhost:${PORT}`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log('=================================\n');
    });
  })
  .catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
