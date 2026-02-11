import prisma from '../config/database';
import { env } from '../config/env';

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

  // Add common Base tokens
  const tokens = [
    {
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      symbol: 'USDC',
      decimals: 6,
    },
    {
      address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      symbol: 'DAI',
      decimals: 18,
    },
    {
      address: '0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
      decimals: 18,
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
