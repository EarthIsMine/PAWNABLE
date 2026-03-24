import prisma from '../config/database.js';
import { env } from '../config/env.js';

const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

async function seed() {
  console.log('🌱 Seeding database...');

  // Add Native WLC (WorldLand)
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
      symbol: 'WLC',
      decimals: 18,
      isNative: true,
      isAllowed: true,
    },
    update: { symbol: 'WLC', decimals: 18, isNative: true, isAllowed: true },
  });

  // Add USDT (WorldLand)
  await prisma.token.upsert({
    where: {
      chainId_address: {
        chainId: env.BASE_CHAIN_ID,
        address: '0x4046bd9ec8223c2a9354dc517b2d2d67b75cebfb',
      },
    },
    create: {
      chainId: env.BASE_CHAIN_ID,
      address: '0x4046bd9ec8223c2a9354dc517b2d2d67b75cebfb',
      symbol: 'USDT',
      decimals: 6,
      isNative: false,
      isAllowed: true,
    },
    update: { symbol: 'USDT', decimals: 6, isNative: false, isAllowed: true },
  });

  console.log('✅ Seeding complete!');
  console.log('Added 2 tokens (WLC, USDT)');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
