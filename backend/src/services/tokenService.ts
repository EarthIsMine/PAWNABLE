import prisma from '../config/database';
import {env} from '../config/env';

interface AddTokenData {
  chainId: number;
  address: string;
  symbol: string;
  decimals: number;
  isNative: boolean;
  isAllowed?: boolean;
}

export const getTokens = async (isAllowed?: boolean) => {
  const where: any = {
    chainId: env.BASE_CHAIN_ID,
  };

  if (typeof isAllowed === 'boolean') {
    where.isAllowed = isAllowed;
  }

  return await prisma.token.findMany({
    where,
    orderBy: {symbol: 'asc'},
  });
};

export const getTokenByAddress = async (chainId: number, address: string) => {
  return await prisma.token.findUnique({
    where: {
      chainId_address: {
        chainId,
        address: address.toLowerCase(),
      },
    },
  });
};

export const addToken = async (data: AddTokenData) => {
  return await prisma.token.create({
    data: {
      chainId: data.chainId,

      address: data.address.toLowerCase(),
      symbol: data.symbol,
      decimals: data.decimals,
      isNative: data.isNative,
      isAllowed: data.isAllowed ?? true,
    },
  });
};

export const updateTokenAllowance = async (
  chainId: number,
  address: string,
  isAllowed: boolean,
) => {
  return await prisma.token.update({
    where: {
      chainId_address: {
        chainId,
        address: address.toLowerCase(),
      },
    },
    data: {isAllowed},
  });
};
