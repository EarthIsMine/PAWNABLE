# PAWNABLE - P2P Collateralized Lending Platform

> **Pawnable eliminates price-based liquidations entirely.**
>
> Collateral is locked on-chain, and liquidation is determined purely by time.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Deploy (EC2)](https://github.com/EarthIsMine/PAWNABLE/actions/workflows/deploy-ec2.yml/badge.svg)

---

## Overview

PAWNABLE is a decentralized P2P lending platform built on Base blockchain. Borrowers create on-chain loan requests with locked collateral, and lenders fund them directly. No price oracle, no LTV liquidation — only **time-based liquidation**.

### Key Differentiators

| Feature | Traditional DeFi (AAVE) | PAWNABLE |
|---------|-------------------------|----------|
| **Interest Rate** | Algorithm-based | **Borrower-defined** |
| **Structure** | Liquidity Pool | **1:1 P2P Matching** |
| **Liquidation** | Price-based (oracle) | **Time-based (deadline)** |
| **Collateral** | Stays in pool | **Locked per request** |
| **MEV Risk** | Liquidation MEV | **None** |
| **Oracle Dependency** | Required | **None** |

---

## Architecture

### On-Chain Order Book

```
┌─────────────┐                         ┌──────────────┐
│  BORROWER   │                         │   LENDER     │
└──────┬──────┘                         └──────┬───────┘
       │                                       │
       │ 1. createLoanRequest()                │
       │    Collateral locked on-chain         │
       │    (status: OPEN)                     │
       │                                       │
       │                                       │ 2. Browse requests
       │                                       │    via API
       │                                       │
       │                                       │ 3. fundLoan()
       │                                       │    Principal → Borrower
       ├───────────────────────────────────────┤
       │                                       │
       │ 4. Loan created (ONGOING)             │
       │    dueTimestamp set                   │
       │                                       │
       │ 5a. repayLoan() before deadline       │
       │     → Collateral returned             │
       │                                       │
       │                            5b. claimCollateral()
       │                                after deadline
       │                                → Collateral to Lender
```

### System Components

```
┌────────────────────────────────────────────────────────┐
│                  Frontend (Next.js)                     │
│  - createLoanRequest / cancelLoanRequest               │
│  - fundLoan / repayLoan                                │
│  - Marketplace & Dashboard                             │
└──────────────────┬─────────────────────────────────────┘
                   │ REST API (read)
                   │
┌──────────────────▼─────────────────────────────────────┐
│              Backend (Express + Prisma)                  │
│  - Pure indexer (no judgment, no validation)            │
│  - Loan request & loan listing API                     │
│  - Token registry                                      │
└──────────────────┬─────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌──────────────┐   ┌─────────────────────┐
│  PostgreSQL  │   │  Smart Contract     │
│  (cache)     │   │  (source of truth)  │
└──────────────┘   └─────────────────────┘
                          ▲
                          │ events
                   ┌──────┴───────┐
                   │  Indexer/Bot │
                   └──────────────┘
```

---

## Database Schema

### Entity Relationship

```
USERS (wallet addresses)
  │
  ├──► LOAN_REQUESTS (on-chain collateral-locked orders)
  │      │
  │      ├──► TOKENS (collateral & principal assets)
  │      │
  │      └──► LOANS (funded on-chain loans)
  │
  └──► LOANS (as borrower or lender)
```

### Core Tables

| Table | Description |
|-------|-------------|
| **USERS** | Wallet address-based user identification |
| **TOKENS** | ERC20 tokens + native ETH, whitelist management |
| **LOAN_REQUESTS** | On-chain loan requests (OPEN / FUNDED / CANCELLED) |
| **LOANS** | Active/completed loans (ONGOING / REPAID / CLAIMED) |

---

## Tech Stack

### Backend
- **Framework**: Express.js (TypeScript)
- **ORM**: Prisma (PostgreSQL)
- **Validation**: Zod

### Frontend
- **Framework**: Next.js (React 19)
- **Styling**: Tailwind CSS
- **State**: React Query

### Blockchain
- **Network**: Base Sepolia (Chain ID: 84532)
- **Contracts**: Solidity 0.8.24 (Foundry)
- **Libraries**: OpenZeppelin (ReentrancyGuard, SafeERC20)

---

## Project Structure

```
PAWNABLE/
├── backend/               # Express + Prisma backend
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   └── src/
│       ├── config/        # Environment & DB config
│       ├── controllers/   # Request handlers
│       ├── services/      # Indexer logic
│       ├── routes/        # API routes
│       ├── middlewares/   # CORS, error handler
│       ├── types/         # TypeScript types
│       ├── validators/    # Zod schemas
│       └── utils/         # Response helpers
│
├── contracts/             # Foundry smart contracts
│   ├── src/
│   │   └── PawnableLoan.sol
│   ├── test/
│   │   └── PawnableLoan.t.sol
│   └── script/
│       └── Deploy.s.sol
│
├── frontend/              # Next.js frontend
│   └── src/
│       ├── app/           # Next.js app router
│       ├── components/    # React components
│       └── hooks/         # Custom hooks
│
└── README.md
```

---

## Installation & Setup

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL 16+
- Foundry (for contracts)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/pawnable.git
cd pawnable
pnpm install
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env: DATABASE_URL, LOAN_CONTRACT_ADDRESS

pnpm prisma:push    # Schema sync
pnpm seed           # Seed tokens (ETH, USDC)
pnpm dev            # http://localhost:8080
```

### 3. Contract Setup

```bash
cd contracts
cp .env.example .env
# Edit .env: PRIVATE_KEY, BASE_SEPOLIA_RPC_URL

forge build          # Compile
forge test           # Run tests (22 tests)
```

### 4. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Edit .env: NEXT_PUBLIC_API_URL=http://localhost:8080

pnpm dev             # http://localhost:3000
```

---

## Smart Contract

### Functions

| Function | Caller | Description |
|----------|--------|-------------|
| `createLoanRequest()` | Borrower | Lock collateral, create request (OPEN) |
| `cancelLoanRequest()` | Borrower | Cancel request, return collateral |
| `fundLoan()` | Lender | Send principal to borrower, create loan |
| `repayLoan()` | Borrower | Repay principal+interest, get collateral back |
| `claimCollateral()` | Anyone | After deadline, collateral goes to lender |
| `getLoanRequest()` | View | Get request details |
| `getLoan()` | View | Get loan details |
| `getRepayAmount()` | View | Calculate repayment amount |

### State Transitions

```
LoanRequest:  OPEN ──→ FUNDED      (lender funded)
                │
                └────→ CANCELLED   (borrower cancelled)

Loan:         ONGOING ──→ REPAID   (repaid before deadline)
                │
                └──────→ CLAIMED   (collateral claimed after deadline)
```

---

## API Endpoints

See [Backend README](backend/README.md) for full API documentation.

### Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/loan-requests` | List loan requests |
| GET | `/api/loan-requests/:id` | Get request details |
| POST | `/api/loan-requests` | Index new request (indexer) |
| PATCH | `/api/loan-requests/:id/cancel` | Index cancellation (indexer) |
| GET | `/api/loans` | List loans |
| GET | `/api/loans/:id` | Get loan details |
| POST | `/api/loans` | Index new loan (indexer) |
| PATCH | `/api/loans/:id/status` | Update loan status (indexer) |
| GET | `/api/tokens` | List supported tokens |

---

## Security

- **ReentrancyGuard** on all state-changing functions
- **SafeERC20** for safe token transfers
- **Self-fund prevention** (borrower cannot fund own request)
- **Time-based liquidation only** (no price oracle attack surface)
- **No MEV** (no liquidation races)
- **No admin keys** (fully permissionless)

---

## License

This project is licensed under the MIT License.

---

**Built on Base**
