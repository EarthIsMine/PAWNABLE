# PAWNABLE Backend

P2P 담보 기반 대출 플랫폼 백엔드 서버 (순수 인덱서)

## 기술 스택

- **Runtime**: Node.js + TypeScript (ESM)
- **Framework**: Express.js
- **Database**: PostgreSQL + Prisma ORM
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

# 초기 토큰 시드 (ETH, USDC)
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
├── services/        # 인덱서 로직
├── routes/          # 라우터
├── validators/      # Zod 입력값 검증 스키마
├── middlewares/     # CORS, 에러 핸들러
├── types/           # TypeScript 타입/enum
├── utils/           # 응답 헬퍼
├── scripts/         # seed 등
└── index.ts         # 진입점
```

---

## 설계 철학

백엔드는 **순수 인덱서**입니다:
- 서명 검증 없음 (컨트랙트가 이미 검증함)
- 잔고 체크 없음 (컨트랙트가 transferFrom으로 처리)
- 판단 없음 (온체인 이벤트를 그대로 DB에 기록)
- 삭제 없음 (append-only 패턴)

**온체인이 진실(Single Source of Truth)**, 백엔드는 읽기 편의를 위한 캐시입니다.

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
{ "status": "ok", "timestamp": "2026-01-01T00:00:00.000Z" }
```

---

### Loan Requests (대출 요청)

온체인에서 생성된 대출 요청의 인덱싱 데이터. 담보가 컨트랙트에 lock된 상태.

---

#### `GET /api/loan-requests`

대출 요청 목록 조회.

**Query Parameters**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `status` | `string` | - | `OPEN` `FUNDED` `CANCELLED` |
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
    "loanRequests": [
      {
        "id": "uuid",
        "chainId": 84532,
        "contractAddress": "0x...",
        "onchainRequestId": "0",
        "borrowerAddress": "0xaaaa...bbbb",
        "collateralTokenAddress": "0x...",
        "collateralAmount": "1000000000000000000",
        "principalTokenAddress": "0x...",
        "principalAmount": "1000000000",
        "interestBps": 500,
        "durationSeconds": 604800,
        "status": "OPEN",
        "createTxHash": "0xabcd...1234",
        "createdAtBlock": "12345678",
        "indexedAt": "2026-01-01T00:00:00.000Z",
        "borrower": { "address": "0x..." },
        "collateralToken": { "symbol": "ETH", "decimals": 18 },
        "principalToken": { "symbol": "USDC", "decimals": 6 }
      }
    ],
    "total": 42,
    "limit": 50,
    "offset": 0
  }
}
```

---

#### `GET /api/loan-requests/:id`

대출 요청 상세 조회. 연결된 Loan 정보 포함.

---

#### `POST /api/loan-requests`

대출 요청 인덱싱 (인덱서 전용). `LoanRequestCreated` 이벤트 수신 시 호출.

**Request Body**
```json
{
  "chainId": 84532,
  "contractAddress": "0x1234...abcd",
  "onchainRequestId": "0",
  "borrower": "0xaaaa...bbbb",
  "collateralToken": "0x0000000000000000000000000000000000000000",
  "collateralAmount": "1000000000000000000",
  "principalToken": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "principalAmount": "1000000000",
  "interestBps": 500,
  "durationSeconds": 604800,
  "createTxHash": "0xabcd...1234",
  "createdAtBlock": "12345678"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `chainId` | `number` | 체인 ID (84532 = Base Sepolia) |
| `contractAddress` | `address` | 대출 컨트랙트 주소 |
| `onchainRequestId` | `string` | 온체인 requestId (uint256) |
| `borrower` | `address` | 차입자 지갑 주소 |
| `collateralToken` | `address` | 담보 토큰 주소 (`0x0` = ETH) |
| `collateralAmount` | `string` | 담보 수량 (raw uint256) |
| `principalToken` | `address` | 원금 토큰 주소 |
| `principalAmount` | `string` | 원금 수량 (raw uint256) |
| `interestBps` | `number` | 고정 이자 (bps, 500 = 5%) |
| `durationSeconds` | `number` | 대출 기간 (초) |
| `createTxHash` | `string` | 생성 트랜잭션 해시 |
| `createdAtBlock` | `string` | 생성 블록 번호 |

**Response** `201`
```json
{
  "success": true,
  "data": { "id": "uuid", "status": "OPEN", "..." : "..." },
  "message": "Loan request indexed successfully"
}
```

---

#### `PATCH /api/loan-requests/:id/cancel`

대출 요청 취소 인덱싱 (인덱서 전용). `LoanRequestCancelled` 이벤트 수신 시 호출.

**Request Body**
```json
{
  "cancelTxHash": "0xabcd...1234"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `cancelTxHash` | `string` | 취소 트랜잭션 해시 (`0x` + 64hex) |

**Response**
```json
{
  "success": true,
  "data": { "id": "uuid", "status": "CANCELLED" },
  "message": "Loan request cancelled"
}
```

---

### Loans (온체인 대출)

온체인에서 생성된 대출의 인덱싱 데이터.

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
        "onchainLoanId": "0",
        "status": "ONGOING",
        "borrower": { "address": "0x..." },
        "lender": { "address": "0x..." },
        "request": {
          "collateralTokenAddress": "0x...",
          "collateralAmount": "1000000000000000000",
          "collateralToken": { "symbol": "ETH", "decimals": 18 },
          "principalToken": { "symbol": "USDC", "decimals": 6 }
        },
        "startTimestamp": "1735689600",
        "dueTimestamp": "1736294400",
        "fundTxHash": "0x..."
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

Loan 상세 조회. LoanRequest 정보(담보/원금 토큰) 포함.

---

#### `POST /api/loans`

Loan 생성 인덱싱 (인덱서 전용). `LoanFunded` 이벤트 수신 시 호출.

연결된 LoanRequest를 자동으로 `FUNDED` 상태로 업데이트 (atomic transaction).

**Request Body**
```json
{
  "chainId": 84532,
  "contractAddress": "0x1234...abcd",
  "onchainLoanId": "0",
  "onchainRequestId": "0",
  "borrower": "0xaaaa...bbbb",
  "lender": "0xcccc...dddd",
  "startTimestamp": "1735689600",
  "dueTimestamp": "1736294400",
  "fundTxHash": "0xabcd...1234"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `chainId` | `number` | 체인 ID |
| `contractAddress` | `address` | 컨트랙트 주소 |
| `onchainLoanId` | `string` | 온체인 loanId (uint256) |
| `onchainRequestId` | `string` | 연결된 requestId (uint256) |
| `borrower` | `address` | 차입자 |
| `lender` | `address` | 대출자 |
| `startTimestamp` | `string` | 시작 시각 (unix) |
| `dueTimestamp` | `string` | 만기 시각 (unix) |
| `fundTxHash` | `string` | 자금 제공 트랜잭션 해시 |

---

#### `PATCH /api/loans/:id/status`

Loan 상태 변경 (인덱서 전용). `ONGOING`에서만 전환 가능.

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
| `txHash` | `string` | O | 상환/청산 트랜잭션 해시 |

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
    { "chainId": 84532, "address": "0x0000...0000", "symbol": "ETH", "decimals": 18, "isNative": true, "isAllowed": true },
    { "chainId": 84532, "address": "0x036C...CF7e", "symbol": "USDC", "decimals": 6, "isNative": false, "isAllowed": true }
  ]
}
```

---

#### `GET /api/tokens/:address`

토큰 상세 조회.

**Query Parameters**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `chainId` | `number` | 체인 ID (기본 84532) |

---

#### `POST /api/tokens` (관리자)

토큰 등록.

**Request Body**
```json
{
  "chainId": 84532,
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
  "chainId": 84532,
  "isAllowed": false
}
```

---

## 상태 머신

### LoanRequest Status

```
OPEN ──────┬──> FUNDED      (대출 성립)
           └──> CANCELLED   (차입자 취소)
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
| `LOAN_CONTRACT_ADDRESS` | - | 대출 컨트랙트 주소 | `""` |
| `PORT` | - | 서버 포트 | `8080` |
| `NODE_ENV` | - | 환경 | `development` |
| `BASE_CHAIN_ID` | - | 체인 ID | `84532` |

---

## 시드 토큰

`pnpm seed` 실행 시 등록되는 토큰 (Base Sepolia):

| 심볼 | 주소 | Decimals | Native |
|------|------|----------|--------|
| ETH | `0x0000...0000` | 18 | O |
| USDC | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | 6 | - |
