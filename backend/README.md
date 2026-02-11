# PAWNABLE Backend

P2P 담보 기반 대출 플랫폼 백엔드 서버

## 기술 스택

- **Runtime**: Node.js + TypeScript (ESM)
- **Framework**: Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Blockchain**: ethers.js v6 (Base Chain)
- **Validation**: Zod

---

## 설치 및 실행

### 1. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일 수정:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/pawnable"
BASE_RPC_URL=https://mainnet.base.org
LOAN_CONTRACT_ADDRESS=0x...
```

### 2. 의존성 설치

```bash
pnpm install
```

### 3. 데이터베이스 설정

```bash
# PostgreSQL (Docker)
docker run --name pawnable-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=pawnable \
  -p 5432:5432 \
  -d postgres:16

# 스키마 동기화
pnpm prisma:push

# 초기 토큰 시드 (ETH, USDC, DAI, WETH)
pnpm seed
```

### 4. 실행

```bash
pnpm dev          # 개발 서버 (hot reload)
pnpm build        # 빌드
pnpm start        # 프로덕션
pnpm prisma:studio # DB GUI
```

서버: `http://localhost:8080`

---

## 프로젝트 구조

```
src/
├── config/          # env, database
├── controllers/     # 요청/응답 처리
├── services/        # 비즈니스 로직
├── routes/          # 라우터
├── validators/      # Zod 입력값 검증 스키마
├── middlewares/      # CORS, 에러 핸들러
├── types/           # TypeScript 타입/enum
├── utils/           # 응답 헬퍼
├── scripts/         # seed 등
└── index.ts         # 진입점
```

---

## API Reference

Base URL: `http://localhost:8080`

모든 응답 형식:
```json
{
  "success": true,
  "data": { },
  "message": "optional message"
}
```

에러 응답:
```json
{
  "success": false,
  "error": "에러 메시지"
}
```

---

### Health Check

#### `GET /health`

서버 상태 확인.

**Response**
```json
{ "status": "ok", "timestamp": "2025-01-01T00:00:00.000Z" }
```

---

### Intents (대출 요청 의사)

EIP-712 서명 기반 오프체인 대출 의향. 자산 이동 없이 서명만으로 등록됨.

---

#### `POST /api/intents`

Intent 생성. EIP-712 서명 검증, 토큰 화이트리스트, chainId, nonce 중복 체크를 수행.

**Request Body**
```json
{
  "chainId": 8453,
  "verifyingContract": "0x1234...abcd",
  "borrower": "0xaaaa...bbbb",
  "collateralToken": "0x0000000000000000000000000000000000000000",
  "collateralAmount": "1000000000000000000",
  "principalToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "principalAmount": "1000000000",
  "interestBps": 500,
  "durationSeconds": 604800,
  "nonce": "0",
  "deadline": "1735689600",
  "intentHash": "0xabcd...1234",
  "signature": "0x1234...5678"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `chainId` | `number` | 체인 ID (8453 = Base) |
| `verifyingContract` | `address` | 대출 컨트랙트 주소 |
| `borrower` | `address` | 차입자 지갑 주소 |
| `collateralToken` | `address` | 담보 토큰 주소 (`0x0` = ETH) |
| `collateralAmount` | `string` | 담보 수량 (raw uint256) |
| `principalToken` | `address` | 원금 토큰 주소 |
| `principalAmount` | `string` | 원금 수량 (raw uint256) |
| `interestBps` | `number` | 고정 이자 (bps, 500 = 5%) |
| `durationSeconds` | `number` | 대출 기간 (초) |
| `nonce` | `string` | 컨트랙트 레벨 nonce (uint256) |
| `deadline` | `string` | 서명 만료 시각 (unix timestamp) |
| `intentHash` | `string` | EIP-712 struct hash (`0x` + 64hex) |
| `signature` | `string` | EIP-712 서명 (`0x` + hex) |

**검증 항목**
- `chainId`가 서버의 `BASE_CHAIN_ID`와 일치해야 함
- `verifyingContract`가 서버의 `LOAN_CONTRACT_ADDRESS`와 일치해야 함
- `deadline`이 현재 시각보다 미래여야 함
- EIP-712 서명에서 복원한 주소가 `borrower`와 일치해야 함
- `collateralToken`, `principalToken`이 화이트리스트에 등록되고 허용 상태여야 함
- 동일 `borrower` + `nonce`로 ACTIVE/UNAVAILABLE인 intent가 없어야 함

**Response** `201`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "chainId": 8453,
    "borrowerAddress": "0xaaaa...bbbb",
    "status": "ACTIVE",
    "borrower": { "address": "0x..." },
    "collateralToken": { "symbol": "ETH", "decimals": 18 },
    "principalToken": { "symbol": "USDC", "decimals": 6 }
  },
  "message": "Intent created successfully"
}
```

---

#### `GET /api/intents`

Intent 목록 조회. 조회 시 만료된 intent는 자동으로 `EXPIRED` 처리됨.

**Query Parameters**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `status` | `string` | - | `ACTIVE` `UNAVAILABLE` `EXPIRED` `CANCELLED` `EXECUTED` |
| `borrower` | `address` | - | 차입자 주소로 필터 |
| `collateralToken` | `address` | - | 담보 토큰 주소로 필터 |
| `principalToken` | `address` | - | 원금 토큰 주소로 필터 |
| `limit` | `number` | - | 페이지 크기 (기본 50, 최대 100) |
| `offset` | `number` | - | 오프셋 (기본 0) |

**Response**
```json
{
  "success": true,
  "data": {
    "intents": [ ],
    "total": 42,
    "limit": 50,
    "offset": 0
  }
}
```

---

#### `GET /api/intents/:id`

Intent 상세 조회. 최신 스냅샷 1개 포함.

**Response**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "ACTIVE",
    "borrower": { "address": "0x..." },
    "collateralToken": { "symbol": "ETH", "decimals": 18 },
    "principalToken": { "symbol": "USDC", "decimals": 6 },
    "snapshots": [
      {
        "collateralBalance": "1000000000000000000",
        "collateralAllowance": "0",
        "derivedStatus": "ACTIVE",
        "reason": null,
        "checkedAt": "2025-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

#### `POST /api/intents/:id/cancel`

Intent 취소. borrower 본인만 취소 가능 (서명 검증).

프론트에서 `"Cancel intent: {id}"` 메시지에 대해 `personal_sign`으로 서명하여 전달.

**Request Body**
```json
{
  "borrowerAddress": "0xaaaa...bbbb",
  "signature": "0x1234...5678"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `borrowerAddress` | `address` | 차입자 주소 |
| `signature` | `string` | `"Cancel intent: {id}"` 메시지의 personal_sign 서명 |

**프론트 서명 예시**
```typescript
const message = `Cancel intent: ${intentId}`;
const signature = await signer.signMessage(message);
```

**Response**
```json
{
  "success": true,
  "data": { "id": "uuid", "status": "CANCELLED" },
  "message": "Intent cancelled successfully"
}
```

---

#### `POST /api/intents/:id/execute`

Intent 실행 완료 처리. 온체인에서 `executeLoan()` 트랜잭션 성공 후 호출.

**Request Body**
```json
{
  "txHash": "0xabcd...1234",
  "loanId": "1"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `txHash` | `string` | 실행 트랜잭션 해시 (`0x` + 64hex) |
| `loanId` | `string` | 온체인 loanId (uint256) |

---

#### `GET /api/intents/:id/state`

Intent의 온체인 담보 상태 체크. RPC로 잔액/승인량 조회 후 스냅샷 저장.

EXPIRED/CANCELLED/EXECUTED 상태의 intent는 체크 불가 (400 에러).

**Response**
```json
{
  "success": true,
  "data": {
    "balance": "1000000000000000000",
    "allowance": "0",
    "required": "500000000000000000",
    "status": "ACTIVE",
    "reason": null,
    "blockNumber": 12345678
  }
}
```

| 필드 | 설명 |
|------|------|
| `balance` | 담보 토큰 잔액 (raw) |
| `allowance` | 담보 토큰 승인량 (native이면 `"0"`) |
| `required` | 필요한 담보 수량 (raw) |
| `status` | `ACTIVE` / `UNAVAILABLE` / `EXPIRED` |
| `reason` | `INSUFFICIENT_BALANCE` / `INSUFFICIENT_ALLOWANCE` / `null` |
| `blockNumber` | 조회 기준 블록 번호 |

---

### Loans (온체인 대출)

온체인에서 실행된 대출의 인덱싱 데이터.

---

#### `GET /api/loans`

Loan 목록 조회.

**Query Parameters**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `status` | `string` | - | `ONGOING` `REPAID` `CLAIMED` |
| `borrower` | `address` | - | 차입자 주소 |
| `lender` | `address` | - | 대출자 주소 |
| `limit` | `number` | - | 기본 50, 최대 100 |
| `offset` | `number` | - | 기본 0 |

**Response**
```json
{
  "success": true,
  "data": {
    "loans": [
      {
        "id": "uuid",
        "loanId": "1",
        "status": "ONGOING",
        "borrower": { "address": "0x..." },
        "lender": { "address": "0x..." },
        "intent": {
          "collateralToken": { "symbol": "ETH", "decimals": 18 },
          "principalToken": { "symbol": "USDC", "decimals": 6 }
        },
        "startTimestamp": "1735689600",
        "dueTimestamp": "1736294400"
      }
    ],
    "total": 5,
    "limit": 50,
    "offset": 0
  }
}
```

---

#### `GET /api/loans/:id`

Loan 상세 조회. Intent 정보(담보/원금 토큰) 포함.

---

#### `POST /api/loans`

Loan 생성 (인덱서/봇용). `intentId`가 있으면 해당 Intent를 `EXECUTED`로 원자적 업데이트.

**Request Body**
```json
{
  "chainId": 8453,
  "verifyingContract": "0x1234...abcd",
  "loanId": "1",
  "intentId": "uuid (optional)",
  "borrower": "0xaaaa...bbbb",
  "lender": "0xcccc...dddd",
  "startTimestamp": "1735689600",
  "dueTimestamp": "1736294400",
  "startTxHash": "0xabcd...1234"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `chainId` | `number` | O | 체인 ID |
| `verifyingContract` | `address` | O | 컨트랙트 주소 |
| `loanId` | `string` | O | 온체인 loanId (uint256) |
| `intentId` | `uuid` | - | 연결할 Intent ID |
| `borrower` | `address` | O | 차입자 |
| `lender` | `address` | O | 대출자 |
| `startTimestamp` | `string` | O | 시작 시각 (unix) |
| `dueTimestamp` | `string` | O | 만기 시각 (unix) |
| `startTxHash` | `string` | O | 생성 트랜잭션 해시 |

---

#### `PATCH /api/loans/:id/status`

Loan 상태 변경. `ONGOING`에서만 전환 가능.

**Request Body**
```json
{
  "status": "REPAID",
  "txHash": "0xabcd...1234"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `status` | `string` | O | `REPAID` 또는 `CLAIMED` |
| `txHash` | `string` | - | 상환/청산 트랜잭션 해시 |

---

### Tokens (토큰 레지스트리)

플랫폼에서 사용 가능한 토큰 목록 관리.

---

#### `GET /api/tokens`

토큰 목록 조회.

**Query Parameters**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `isAllowed` | `"true"` / `"false"` | 허용 상태 필터 |

**Response**
```json
{
  "success": true,
  "data": [
    { "chainId": 8453, "address": "0x0000...0000", "symbol": "ETH", "decimals": 18, "isNative": true, "isAllowed": true },
    { "chainId": 8453, "address": "0x8335...2913", "symbol": "USDC", "decimals": 6, "isNative": false, "isAllowed": true }
  ]
}
```

---

#### `GET /api/tokens/:address`

토큰 상세 조회.

**Query Parameters**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `chainId` | `number` | 체인 ID (기본 8453) |

---

#### `POST /api/tokens` (관리자)

토큰 등록.

**Request Body**
```json
{
  "chainId": 8453,
  "address": "0x1234...abcd",
  "symbol": "USDC",
  "decimals": 6,
  "isNative": false,
  "isAllowed": true
}
```

---

#### `PATCH /api/tokens/:address/allowance` (관리자)

토큰 허용 상태 변경.

**Request Body**
```json
{
  "chainId": 8453,
  "isAllowed": false
}
```

---

## 상태 머신

### Intent Status

```
ACTIVE ──────┬──> EXECUTED    (대출 성립)
             ├──> CANCELLED   (차입자 취소)
             ├──> EXPIRED     (deadline 초과)
             └──> UNAVAILABLE (담보 부족)
                    │
UNAVAILABLE ─┬──> ACTIVE      (담보 충족)
             ├──> CANCELLED
             └──> EXPIRED
```

### Loan Status

```
ONGOING ──┬──> REPAID   (기한 내 상환)
          └──> CLAIMED  (기한 초과, 담보 청산)
```

---

## 금액 표시 규칙

모든 금액은 **raw uint256 정수(string)** 로 전달됨.

프론트에서 표시할 때:

```typescript
// raw -> 표시값
const displayAmount = Number(rawAmount) / 10 ** token.decimals;

// 예시
// ETH: "1000000000000000000" -> 1.0 ETH (decimals=18)
// USDC: "1000000" -> 1.0 USDC (decimals=6)
```

이자 계산:
```typescript
// interest = principal * interestBps / 10000
// 예: 1000 USDC * 500bps = 50 USDC (5%)
const interest = principalAmount * BigInt(interestBps) / 10000n;
const repayTotal = principalAmount + interest;
```

---

## 환경 변수

| 변수 | 필수 | 설명 | 기본값 |
|------|------|------|--------|
| `DATABASE_URL` | O | PostgreSQL 연결 URL | - |
| `BASE_RPC_URL` | O | Base 체인 RPC URL | - |
| `LOAN_CONTRACT_ADDRESS` | - | 대출 컨트랙트 주소 | `""` |
| `PORT` | - | 서버 포트 | `8080` |
| `NODE_ENV` | - | 환경 | `development` |
| `BASE_CHAIN_ID` | - | 체인 ID | `8453` |

---

## 시드 토큰

`pnpm seed` 실행 시 등록되는 토큰:

| 심볼 | 주소 | Decimals | Native |
|------|------|----------|--------|
| ETH | `0x0000...0000` | 18 | O |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | 6 | - |
| DAI | `0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb` | 18 | - |
| WETH | `0x4200000000000000000000000000000000000006` | 18 | - |
