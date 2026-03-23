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
    update: {},
  });

  console.log('✅ Seeding complete!');
  console.log('Added 1 token (WLC)');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
