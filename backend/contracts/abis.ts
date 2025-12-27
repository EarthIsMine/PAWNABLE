import { ethers } from 'ethers';

/**
 * 대출 컨트랙트 ABI
 */
export const LOAN_CONTRACT_ABI: ethers.InterfaceAbi = [
  'function activateLoan(string loanId, address borrower, address lender, uint256 loanAmount, uint256[] collateralTokenIds, uint256 repayAmount, uint256 dueTimestamp) external returns (bool)',
  'function repayLoan(string loanId, address borrower, address lender, uint256 repayAmount) external returns (bool)',
  'function liquidateLoan(string loanId, address borrower, address lender) external returns (bool)',
  'event LoanActivated(string indexed loanId, address indexed borrower, address indexed lender, uint256 amount)',
  'event LoanRepaid(string indexed loanId, address indexed borrower, uint256 amount)',
  'event LoanLiquidated(string indexed loanId, address indexed lender)',
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
