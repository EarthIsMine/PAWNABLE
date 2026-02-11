import dotenv from 'dotenv';

dotenv.config();

export const env = {
  // Server
  PORT: parseInt(process.env.PORT || '8080', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  DATABASE_URL: process.env.DATABASE_URL!,

  // Blockchain
  BASE_CHAIN_ID: parseInt(process.env.BASE_CHAIN_ID || '84532', 10),
  BASE_RPC_URL: process.env.BASE_RPC_URL!,
  LOAN_CONTRACT_ADDRESS: process.env.LOAN_CONTRACT_ADDRESS || '',

  // Features
  ENABLE_INDEXER: process.env.ENABLE_INDEXER === 'true',
};

// Validate required env vars
const requiredEnvVars = ['DATABASE_URL', 'BASE_RPC_URL'];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}
