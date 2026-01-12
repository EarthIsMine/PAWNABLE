import { ethers } from 'ethers';

/**
 * 대출 컨트랙트 ABI
 */
export const LOAN_CONTRACT_ABI: ethers.InterfaceAbi = [
  'function requestLoan(string loanId, address loanToken, uint256 loanAmount, uint256 repayAmount, address collateralNFT, uint256[] collateralTokenIds, uint256 dueTimestamp) external',
  'function matchLoan(string loanId) external',
  'function repayLoan(string loanId) external',
  'function liquidateLoan(string loanId) external',
  'function cancelLoan(string loanId) external',
  'function getLoan(string loanId) external view returns (tuple(string loanId, address borrower, address lender, address loanToken, uint256 loanAmount, uint256 repayAmount, address collateralNFT, uint256[] collateralTokenIds, uint256 dueTimestamp, uint8 status, uint256 createdAt, uint256 matchedAt, uint256 closedAt))',
  'event LoanRequested(string indexed loanId, address indexed borrower, address loanToken, uint256 loanAmount, uint256 repayAmount, uint256 dueTimestamp)',
  'event LoanMatched(string indexed loanId, address indexed borrower, address indexed lender, uint256 loanAmount)',
  'event LoanRepaid(string indexed loanId, address indexed borrower, uint256 repayAmount)',
  'event LoanLiquidated(string indexed loanId, address indexed lender, uint256 collateralCount)',
  'event LoanCancelled(string indexed loanId, address indexed borrower)',
];

/**
 * NFT 컨트랙트 ABI (ERC721 표준)
 */
export const NFT_CONTRACT_ABI: ethers.InterfaceAbi = [
  'function transferFrom(address from, address to, uint256 tokenId) external',
  'function approve(address to, uint256 tokenId) external',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];

/**
 * ERC20 토큰 컨트랙트 ABI (USDT 등)
 */
export const TOKEN_CONTRACT_ABI: ethers.InterfaceAbi = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];
