# PAWNABLE - P2P Collateralized Lending Platform

> **A Revolutionary DeFi Lending Protocol**
>
> Unlike traditional DeFi platforms (like AAVE), PAWNABLE enables borrowers to set their own interest rates and matches them directly with lenders in a peer-to-peer manner.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 Overview

PAWNABLE is a decentralized P2P lending platform built on Base blockchain that revolutionizes DeFi lending by introducing an **intent-based architecture** with EIP-712 off-chain signatures. Borrowers create signed intents expressing their borrowing terms, and lenders can execute these intents to create on-chain loans.

### Key Innovation: Intent-Based Lending

Traditional DeFi protocols require borrowers to execute transactions upfront. PAWNABLE introduces a more efficient model:

1. **Borrowers sign intents off-chain** (no gas costs)
2. **Intents are broadcasted** to potential lenders
3. **Lenders execute intents on-chain** (creating loans)
4. **No wasted gas** for unfunded loan requests

---

## 🔄 AAVE vs PAWNABLE

| Feature | AAVE (Traditional DeFi) | PAWNABLE (P2P) |
|---------|-------------------------|----------------|
| **Interest Rate** | Algorithm-based (supply/demand) | **Borrower-defined** |
| **Structure** | Liquidity Pool | **1:1 P2P Matching** |
| **Loan Duration** | Open-ended | **Fixed term with clear deadline** |
| **Liquidation** | When collateral value drops | **When loan term expires** |
| **Rate Flexibility** | Market average | **Negotiable rates** |
| **Capital Efficiency** | Shared liquidity | **Direct matching** |

---

## 🏗️ Architecture

### Intent-Based Design (EIP-712)

```
┌─────────────┐                    ┌──────────────┐
│  BORROWER   │                    │   LENDER     │
└──────┬──────┘                    └──────┬───────┘
       │                                  │
       │ 1. Sign Intent (EIP-712)         │
       │    Off-chain, no gas             │
       ├──────────────────────────────────┤
       │                                  │
       │ 2. Intent broadcast via API      │
       │    (status: ACTIVE)              │
       │                                  │
       │                                  │ 3. Browse intents
       │                                  │    Check feasibility
       │                                  │
       │                                  │ 4. Execute intent
       │                                  │    (on-chain tx)
       ├──────────────────────────────────┤
       │                                  │
       │ 5. Loan created                  │
       │    Collateral locked             │
       │    Principal received            │
       │                                  │
```

### System Components

```
┌──────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                    │
│  - Wallet connection (RainbowKit)                            │
│  - Intent creation & signature                               │
│  - Marketplace UI                                            │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 │ REST API
                 │
┌────────────────▼─────────────────────────────────────────────┐
│               Backend (Express + Prisma)                      │
│  - Intent storage & validation                               │
│  - State snapshot caching (balance/allowance)                │
│  - Loan indexing                                             │
│  - User management                                           │
└────────────────┬─────────────────────────────────────────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
      ▼                     ▼
┌──────────────┐   ┌────────────────┐
│  PostgreSQL  │   │  Base Blockchain│
│  (Prisma)    │   │  - Smart Contracts
└──────────────┘   │  - Events        │
                   └────────────────┘
```

---

## 📊 Database Schema

### Entity Relationship

```
USERS (wallet addresses)
  │
  ├──► INTENTS (EIP-712 signed loan requests)
  │      │
  │      ├──► TOKENS (collateral & principal assets)
  │      │
  │      ├──► INTENT_STATE_SNAPSHOTS (balance/allowance cache)
  │      │
  │      └──► LOANS (executed on-chain loans)
  │
  └──► LOANS (as borrower or lender)
```

### Core Tables

#### 1. **USERS**
- Wallet address-based user identification
- Created/updated timestamps

#### 2. **TOKENS**
- ERC20 tokens + native ETH (0x0 address)
- Whitelist management (`is_allowed`)
- Metadata: symbol, decimals

#### 3. **INTENTS**
- Off-chain loan requests (EIP-712 signed)
- Status: `ACTIVE` → `EXECUTED` / `EXPIRED` / `CANCELLED`
- Key fields:
  - `collateral_token_address`, `collateral_amount`
  - `principal_token_address`, `principal_amount`
  - `interest_bps` (basis points, e.g., 500 = 5%)
  - `duration_seconds`
  - `intent_hash` (unique per chain/contract)
  - `signature` (EIP-712)

#### 4. **INTENT_STATE_SNAPSHOTS**
- Cached blockchain state for intents
- `collateral_balance`, `collateral_allowance`
- `derived_status`: `ACTIVE` | `UNAVAILABLE`
- Reduces RPC calls for UI

#### 5. **LOANS**
- On-chain loan records (indexed from blockchain)
- Status: `ONGOING` → `REPAID` / `CLAIMED`
- Linked to originating intent (if any)
- Transaction hashes: start, repayment, liquidation

**For detailed ERD, see the project documentation.**

---

## 🚀 Tech Stack

### Backend
- **Framework**: Express.js (TypeScript)
- **ORM**: Prisma (PostgreSQL)
- **Blockchain**: ethers.js v6
- **Validation**: Zod

### Frontend
- **Framework**: Next.js 16 (React 19)
- **Wallet**: RainbowKit + Wagmi
- **Styling**: Tailwind CSS
- **State**: React Query

### Blockchain
- **Network**: Base (Chain ID: 8453)
- **Standard**: EIP-712 (typed structured data signing)
- **Contracts**: Solidity (collateral management, loan lifecycle)

---

## 📦 Project Structure

```
PAWNABLE/
├── backend/               # Express + Prisma backend
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   ├── src/
│   │   ├── config/        # Environment & DB config
│   │   ├── controllers/   # Request handlers
│   │   ├── services/      # Business logic
│   │   ├── routes/        # API routes
│   │   ├── middlewares/   # Express middlewares
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Helpers
│   └── package.json
│
├── frontend/              # Next.js frontend
│   ├── src/
│   │   ├── app/           # Next.js app router
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilities
│   │   └── types/         # TypeScript types
│   └── package.json
│
└── README.md              # This file
```

---

## 🛠️ Installation & Setup

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL 16+

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/pawnable.git
cd pawnable
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your settings:
# - DATABASE_URL (PostgreSQL connection)
# - BASE_RPC_URL (Base RPC endpoint)
# - LOAN_CONTRACT_ADDRESS (deployed contract)

# Run database migrations
pnpm prisma:push

# Seed initial token data
pnpm seed

# Start development server
pnpm dev
```

Backend runs on `http://localhost:8080`

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with:
# - NEXT_PUBLIC_API_URL=http://localhost:8080

# Start development server
pnpm dev
```

Frontend runs on `http://localhost:3000`

---

## 📡 API Endpoints

### Base URL
`http://localhost:8080/api`

### Health Check
- `GET /health` - Server status

### Intents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/intents` | Create new intent |
| GET | `/api/intents` | List intents (with filters) |
| GET | `/api/intents/:id` | Get intent details |
| POST | `/api/intents/:id/cancel` | Cancel intent (borrower only) |
| POST | `/api/intents/:id/execute` | Execute intent (create loan) |
| GET | `/api/intents/:id/state` | Check intent feasibility |

### Loans
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/loans` | List loans |
| GET | `/api/loans/:id` | Get loan details |
| PATCH | `/api/loans/:id/status` | Update loan status (indexer) |

### Tokens
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tokens` | List supported tokens |
| GET | `/api/tokens/:address` | Get token details |
| POST | `/api/tokens` | Add token (admin) |
| PATCH | `/api/tokens/:address/allowance` | Update token allowance |

---

## 💡 Usage Flow

### For Borrowers

1. **Connect Wallet** (MetaMask, Rainbow, etc.)
2. **Create Intent**
   - Select collateral (e.g., 1 ETH)
   - Select principal (e.g., 1000 USDC)
   - Set interest rate (e.g., 5%)
   - Set loan duration (e.g., 30 days)
3. **Sign EIP-712 Message** (no gas)
4. **Intent Broadcast** to marketplace
5. **Wait for Lender** to execute
6. **Loan Activated** - receive principal
7. **Repay Loan** before deadline
   - Pay back: principal + interest
   - Retrieve collateral

### For Lenders

1. **Connect Wallet**
2. **Browse Marketplace**
   - Filter by collateral/principal tokens
   - Sort by interest rate / duration
3. **Check Intent Status**
   - System auto-checks borrower's balance/allowance
   - Shows `ACTIVE` or `UNAVAILABLE`
4. **Execute Intent** (on-chain transaction)
   - Approve principal token (if needed)
   - Execute transaction (pay gas)
5. **Loan Created**
   - Your principal transferred to borrower
   - Borrower's collateral locked
6. **Wait for Repayment** or **Claim Collateral** after deadline

---

## 🔐 Security Features

### EIP-712 Typed Data Signing
- Prevents replay attacks via nonce
- Domain-specific signatures (contract address)
- Deadline enforcement

### Database Constraints
- Unique constraint on `(chainId, verifyingContract, intentHash)`
- Prevents duplicate intent execution
- Foreign key integrity

### Smart Contract Safety
- Reentrancy guards
- Allowance checks before transfers
- Time-based loan expiration
- Role-based access control

---

## 🧪 Development

### Run Tests

```bash
# Backend tests
cd backend
pnpm test

# Frontend tests
cd frontend
pnpm test
```

### Database Management

```bash
# Open Prisma Studio (GUI)
cd backend
pnpm prisma:studio

# Create migration
pnpm prisma:migrate

# Reset database (DEV ONLY)
pnpm prisma migrate reset
```

### Linting & Formatting

```bash
# Backend
cd backend
pnpm lint

# Frontend
cd frontend
pnpm lint
```

---

## 📝 Loan Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                     INTENT LIFECYCLE                         │
└─────────────────────────────────────────────────────────────┘

  ACTIVE                    Intent is valid and executable
    │
    ├──► EXECUTED           Lender executed → Loan created
    │
    ├──► CANCELLED          Borrower cancelled or nonce increased
    │
    ├──► EXPIRED            Deadline passed
    │
    └──► UNAVAILABLE        Insufficient balance/allowance


┌─────────────────────────────────────────────────────────────┐
│                      LOAN LIFECYCLE                          │
└─────────────────────────────────────────────────────────────┘

  ONGOING                   Loan is active
    │
    ├──► REPAID             Borrower repaid principal + interest
    │                       Collateral returned to borrower
    │
    └──► CLAIMED            Deadline passed, lender claimed collateral
```

---

## 🔜 Roadmap

- [ ] Multi-chain support (Optimism, Arbitrum)
- [ ] Partial loan matching (multiple lenders for one intent)
- [ ] Interest rate oracle integration
- [ ] Governance token ($PAWN)
- [ ] NFT collateral support
- [ ] Flash loan protection
- [ ] Credit scoring system
- [ ] Mobile app (React Native)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Contact

- **Issues**: [GitHub Issues](https://github.com/yourusername/pawnable/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/pawnable/discussions)

---

## 🙏 Acknowledgments

- **OpenZeppelin** - Smart contract libraries
- **Ethers.js** - Ethereum interaction
- **Prisma** - Type-safe ORM
- **Base** - L2 blockchain platform
- **RainbowKit** - Wallet connection UI

---

**Built with ❤️ on Base**
