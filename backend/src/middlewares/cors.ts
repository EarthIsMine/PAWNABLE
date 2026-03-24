import cors from 'cors';

export const corsMiddleware = cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://pawnable.site', 'https://www.pawnable.site']
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3005'],
  credentials: true,
});
