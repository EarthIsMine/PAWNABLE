import prisma from '../config/database.js';
import { env } from '../config/env.js';

const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

async function seed() {
  console.log('🌱 Seeding database...');

  // Add Native ETH
  await prisma.token.upsert({
    where: {
      chainId_address: {
        chainId: env.BASE_CHAIN_ID,
        address: NATIVE_TOKEN_ADDRESS,
      },
    },
    create: {
      chainId: env.BASE_CHAIN_ID,
      address: NATIVE_TOKEN_ADDRESS,
      symbol: 'ETH',
      decimals: 18,
      isNative: true,
      isAllowed: true,
    },
    update: {},
  });

  // Add Base Sepolia tokens
  const tokens = [
    {
      address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      symbol: 'USDC',
      decimals: 6,
    },
  ];

  for (const token of tokens) {
    await prisma.token.upsert({
      where: {
        chainId_address: {
          chainId: env.BASE_CHAIN_ID,
          address: token.address.toLowerCase(),
        },
      },
      create: {
        chainId: env.BASE_CHAIN_ID,
        address: token.address.toLowerCase(),
        symbol: token.symbol,
        decimals: token.decimals,
        isNative: false,
        isAllowed: true,
      },
      update: {},
    });
  }

  console.log('✅ Seeding complete!');
  console.log(`Added ${tokens.length + 1} tokens`);
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
