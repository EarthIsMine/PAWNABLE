# PAWNABLE API 가이드

## 목차
1. [환경 설정](#환경-설정)
2. [서버 실행](#서버-실행)
3. [API 엔드포인트](#api-엔드포인트)
4. [인증 플로우](#인증-플로우)
5. [사용 예시](#사용-예시)
6. [대출 상태 전환](#대출-상태-전환)
7. [오류 응답 형식](#오류-응답-형식)
8. [문제 해결](#문제-해결-troubleshooting)
9. [다음 단계](#다음-단계)

---

## 환경 설정

### 1. PostgreSQL 설정

먼저 PostgreSQL이 설치되어 있어야 합니다.

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# PostgreSQL 시작
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 데이터베이스 생성
sudo -u postgres psql
CREATE DATABASE pawnable_db;
CREATE USER pawnable WITH PASSWORD 'ghwo336pw1988';
GRANT ALL PRIVILEGES ON DATABASE pawnable_db TO pawnable;
\q
```

### 2. 환경 변수 설정

`.env` 파일이 이미 설정되어 있습니다.

```env
# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=pawnable
DB_PASSWORD=ghwo336pw1988
DB_DATABASE=pawnable_db

# Application Configuration
NODE_ENV=development
PORT=8085

# JWT Configuration
JWT_SECRET=pawnable_dev_secret_key_2024_change_in_production
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:3001,http://localhost:3000,http://yt4307.mooo.com:3000

# Blockchain Configuration
BLOCKCHAIN_RPC_URL=http://localhost:8545
LOAN_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
NFT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
SERVER_PRIVATE_KEY=0x3ed290d41ddc94a45b2ca33ba3271cfe02338c545922ed60ff4957432625316e
```

### 3. 테스트 사용자 및 데이터 시드

개발 환경에서 편리한 테스트를 위해 Hardhat 테스트 계정으로 사용자와 대출 데이터를 생성할 수 있습니다.

```bash
# 테스트 사용자 생성 (사전 서명된 인증 정보 포함)
npm run seed:test-users

# 테스트 대출 데이터 생성
npm run seed:test-loans
```

생성되는 테스트 사용자 (Hardhat Account #0, #1):
- Account #0: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Account #1: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`

> **참고:** 테스트 사용자는 60분 유효한 사전 서명된 인증 정보로 생성되어 Insomnia 등에서 바로 사용할 수 있습니다.

---

## 서버 실행

```bash
# 개발 모드 (hot reload)
npm run dev

# 프로덕션 모드
npm start
```

서버가 정상적으로 시작되면:
```
=================================
🚀 PAWNABLE Server Started
=================================
📡 Server: http://localhost:8085
🔗 API Base: http://localhost:8085/api
🏥 Health: http://localhost:8085/health
=================================
```

---

## API 엔드포인트

### 🏠 기본 엔드포인트

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API 정보 |
| GET | `/health` | 서버 상태 확인 |

---

### 🔐 인증 API (`/api/auth`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/message` | ❌ | 인증 메시지 생성 |
| POST | `/api/auth/login` | ❌ | 지갑 로그인 |
| POST | `/api/auth/verify` | ✅ | 토큰 검증 |

---

### 👤 사용자 API (`/api/users`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/users` | ✅ | 모든 사용자 조회 |
| GET | `/api/users/me` | ✅ | 내 정보 조회 |
| GET | `/api/users/:user_id` | ✅ | 특정 사용자 조회 |
| GET | `/api/users/wallet/:wallet_address` | ❌ | 지갑으로 사용자 조회 |
| POST | `/api/users` | ❌ | 사용자 생성 |
| PUT | `/api/users/:user_id` | ✅ | 사용자 정보 수정 |
| DELETE | `/api/users/:user_id` | ✅ | 사용자 삭제 |

---

### 💎 자산 API (`/api/assets`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/assets` | ❌ | 모든 자산 조회 |
| GET | `/api/assets/:asset_id` | ❌ | 특정 자산 조회 |
| GET | `/api/assets/blockchain/:blockchain` | ❌ | 블록체인별 자산 조회 |
| POST | `/api/assets` | ✅ | 자산 생성 (관리자) |
| DELETE | `/api/assets/:asset_id` | ✅ | 자산 삭제 (관리자) |

---

### 💰 대출 API (`/api/loans`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/loans` | ✅ | 모든 대출 조회 |
| GET | `/api/loans/marketplace` | ❌ | 마켓플레이스 (매칭 대기) |
| GET | `/api/loans/:loan_id` | ✅ | 대출 상세 조회 |
| GET | `/api/loans/borrower/:borrower_id` | ✅ | 차입자의 대출 목록 |
| GET | `/api/loans/lender/:lender_id` | ✅ | 대출자의 대출 목록 |
| POST | `/api/loans` | ✅ | 대출 생성 |
| POST | `/api/loans/:loan_id/match` | ✅ | 대출 매칭 |
| POST | `/api/loans/:loan_id/activate` | ✅ | 대출 활성화 |
| POST | `/api/loans/:loan_id/repay` | ✅ | 대출 상환 |
| POST | `/api/loans/:loan_id/liquidate` | ✅ | 대출 청산 |
| DELETE | `/api/loans/:loan_id` | ✅ | 대출 취소 |

---

## 인증 플로우

PAWNABLE은 지갑 서명 기반 인증을 사용합니다. 전체 플로우는 다음과 같습니다:

### ⚠️ 중요한 변경 사항

**최신 API 업데이트 (2024-12-30):**

1. **서버 응답에서 message 제거:** `/api/auth/message` 엔드포인트가 `timestamp`만 반환합니다
   - 서버: `{ timestamp }` 반환
   - 클라이언트: `timestamp`를 받아 메시지를 직접 생성하여 서명
   - 로그인 시: 서버가 동일한 방식으로 메시지를 재생성하여 서명 검증

2. **로그인 요청에서 message 제거:** `/api/auth/login` 요청에서 `message` 필드 제거
   - 이전: `{ wallet_address, message, signature, timestamp }`
   - 현재: `{ wallet_address, signature, timestamp }`
   - 서버가 `wallet_address`와 `timestamp`로 메시지를 자동 재생성합니다

3. **메시지 형식 간소화:** 개행 문자가 제거되어 단일 라인 형식으로 변경
   - 이전: `"PAWNABLE Login\nWallet: {address}\nTimestamp: {timestamp}"`
   - 현재: `"PAWNABLE Auth - Wallet: {address} Timestamp: {timestamp}"`

4. **타임스탬프 유효 기간 연장:** 5분 → 60분으로 변경
   - 개발 편의성을 위해 유효 기간이 연장되었습니다
   - 프로덕션 환경에서는 보안을 위해 5-10분으로 단축 권장

5. **JWT 토큰 유효 기간:** 7일
   - 로그인 후 7일간 인증 유지
   - 만료 시 재로그인 필요

### 🔄 인증 플로우 다이어그램

```
Client (Frontend)          Backend Server
      |                          |
      |   1. POST /auth/message  |
      |------------------------->|
      |   (wallet_address)       |
      |                          |
      |   2. Generate timestamp  |
      |<-------------------------|
      |   (timestamp)            |
      |                          |
   3. Create message             |
      (wallet + timestamp)       |
      |                          |
   4. Sign message               |
      with MetaMask              |
      |                          |
      |   5. POST /auth/login    |
      |------------------------->|
      |   (wallet_address,       |
      |    signature,            |
      |    timestamp)            |
      |                          |
      |   6. Recreate message    |
      |      & verify signature  |
      |      & generate JWT      |
      |<-------------------------|
      |   (token, user_id)       |
      |                          |
      |   7. API calls with      |
      |      Bearer token        |
      |------------------------->|
```

### 1️⃣ 타임스탬프 발급

서버에서 서명용 타임스탬프를 발급받습니다.

**Request:**
```bash
POST /api/auth/message
Content-Type: application/json

{
  "wallet_address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Auth message generated",
  "data": {
    "timestamp": 1735567890123
  }
}
```

> **참고:** 이제 서버는 `timestamp`만 반환합니다. 클라이언트가 메시지를 직접 생성합니다.

### 2️⃣ 메시지 생성 및 서명 (프론트엔드)

클라이언트에서 메시지를 생성하고 MetaMask로 서명합니다.

```javascript
// ethers.js v6 사용 예시
import { BrowserProvider } from 'ethers';

const provider = new BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// 1. 서버에서 받은 타임스탬프로 메시지 생성
const message = `PAWNABLE Auth - Wallet: ${walletAddress} Timestamp: ${timestamp}`;

// 2. 메시지 서명
const signature = await signer.signMessage(message);
```

**메시지 형식:**
```
PAWNABLE Auth - Wallet: {wallet_address} Timestamp: {timestamp}
```

> **중요:** 메시지 형식은 정확히 위와 같아야 합니다. 공백, 대소문자 모두 일치해야 합니다.

### 3️⃣ 로그인

서명된 메시지로 로그인합니다.

**Request:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "wallet_address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "signature": "0x1234567890abcdef...",
  "timestamp": 1735567890123
}
```

> **중요:**
> - `message` 필드는 **전송하지 않습니다**
> - 서버가 `wallet_address`와 `timestamp`로 메시지를 재생성하여 서명을 검증합니다
> - 타임스탬프는 **60분 이내**만 유효합니다 (재생 공격 방지)

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWJjZC0xMjM0IiwiaWF0IjoxNzM1NTY3ODkwLCJleHAiOjE3MzYxNzI2OTB9.xyz123...",
    "user_id": "abcd-1234-5678-efgh"
  }
}
```

JWT 토큰은 **7일간** 유효합니다.

### 4️⃣ 토큰 검증 (옵션)

로그인 후 토큰이 유효한지 확인할 수 있습니다.

**Request:**
```bash
POST /api/auth/verify
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "valid": true,
    "user_id": "abcd-1234-5678-efgh"
  }
}
```

### 5️⃣ 인증된 API 요청

이후 모든 인증이 필요한 요청에 JWT 토큰을 헤더에 포함합니다:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**예시:**
```bash
GET /api/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 사용 예시

### 대출 생성

```bash
POST /api/loans
Authorization: Bearer <token>
Content-Type: application/json

{
  "borrower_id": "user-uuid",
  "loan_asset_id": "usdt-asset-uuid",
  "loan_amount": 3000,
  "interest_rate_pct": 6.67,
  "total_repay_amount": 3200,
  "repay_due_at": "2024-02-01T00:00:00Z",
  "collaterals": [
    {
      "asset_id": "eth-asset-uuid",
      "amount": 1,
      "token_id": null
    }
  ]
}
```

### 마켓플레이스 조회

```bash
GET /api/loans/marketplace
```

**Response:**
```json
{
  "success": true,
  "message": "Marketplace loans retrieved successfully",
  "data": [
    {
      "loan_id": "uuid",
      "borrower_id": "user-uuid",
      "loan_amount": 3000,
      "interest_rate_pct": 6.67,
      "total_repay_amount": 3200,
      "repay_due_at": "2024-02-01T00:00:00Z",
      "status": "pending",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 대출 매칭

```bash
POST /api/loans/:loan_id/match
Authorization: Bearer <token>
Content-Type: application/json

{
  "lender_id": "lender-user-uuid"
}
```

---

## 대출 상태 전환

```
PENDING (생성됨)
    ↓
MATCHED (매칭됨)
    ↓
ACTIVE (활성화)
    ↓
REPAID (상환 완료) 또는 LIQUIDATED (청산됨)
```

---

## 오류 응답 형식

```json
{
  "success": false,
  "error": "Error message here"
}
```

**HTTP 상태 코드:**
- 200: 성공
- 201: 생성 성공
- 400: 잘못된 요청
- 401: 인증 실패
- 404: 리소스 없음
- 500: 서버 오류

---

## 🔧 문제 해결 (Troubleshooting)

### 인증 관련 오류

#### ❌ "Authentication request expired"

**원인:** 타임스탬프가 60분 이상 경과했습니다.

**해결방법:**
1. `/api/auth/message`를 다시 호출하여 새로운 메시지와 타임스탬프를 받습니다
2. 새 메시지에 서명하여 로그인합니다

> **참고:** 테스트 사용자 시드 스크립트는 60분 유효한 서명을 생성합니다. 시드 후 60분이 지나면 재시드가 필요합니다.

#### ❌ "Invalid signature"

**원인:** 서명 검증에 실패했습니다.

**가능한 이유:**
1. 잘못된 메시지에 서명 (서버에서 받은 메시지 그대로 사용해야 함)
2. 다른 지갑으로 서명
3. 메시지 형식이 다름 (개행 문자, 공백 등)

**해결방법:**
1. 서버에서 받은 `message` 문자열을 **정확히 그대로** 서명
2. `wallet_address`와 서명에 사용한 지갑이 일치하는지 확인
3. 메시지 형식 확인: `PAWNABLE Auth - Wallet: {address} Timestamp: {timestamp}`

#### ❌ "User not found"

**원인:** 해당 지갑 주소로 등록된 사용자가 없습니다.

**해결방법:**
```bash
POST /api/users
Content-Type: application/json

{
  "wallet_address": "0xYourWalletAddress",
  "nickname": "YourNickname"  # 선택사항
}
```

### CORS 관련 오류

#### ❌ "Not allowed by CORS" 또는 403 Forbidden

**원인:** 요청한 Origin이 허용된 CORS 목록에 없습니다.

**현재 허용된 Origins:**
- `http://localhost:3000` (Next.js 기본 포트)
- `http://localhost:3001`
- `http://yt4307.mooo.com:3000`

**해결방법:**

1. `.env` 파일에서 `CORS_ORIGIN`에 프론트엔드 URL을 추가:
   ```env
   CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://your-frontend-url:port
   ```

2. 서버 재시작:
   ```bash
   npm run dev
   ```

3. 개발 중 모든 Origin 허용 (비권장, 개발용만):
   ```env
   CORS_ORIGIN=*
   ```

### JWT 토큰 관련 오류

#### ❌ "Unauthorized" 또는 "Invalid token"

**원인:** JWT 토큰이 유효하지 않거나 만료되었습니다.

**해결방법:**
1. 토큰이 7일 내에 발급되었는지 확인
2. `Authorization` 헤더 형식 확인: `Bearer {token}`
3. 토큰이 만료되었다면 다시 로그인

#### ❌ "No token provided"

**원인:** Authorization 헤더가 없습니다.

**해결방법:**
모든 인증이 필요한 요청에 헤더 포함:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 데이터베이스 관련 오류

#### ❌ "ECONNREFUSED" 또는 "database connection failed"

**원인:** PostgreSQL 서버에 연결할 수 없습니다.

**해결방법:**
1. PostgreSQL 실행 여부 확인:
   ```bash
   sudo systemctl status postgresql
   ```

2. PostgreSQL 시작:
   ```bash
   sudo systemctl start postgresql
   ```

3. `.env` 파일의 DB 설정 확인:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=pawnable
   DB_PASSWORD=ghwo336pw1988
   DB_DATABASE=pawnable_db
   ```

### API 테스트 관련

#### 💡 Insomnia에서 빠른 테스트

1. 테스트 사용자 시드:
   ```bash
   npm run seed:test-users
   ```

2. `backend/insomnia-env.json` 파일을 Insomnia에 import

3. Environment에 설정된 변수 사용:
   - `test_wallet_1`: Hardhat Account #0 지갑 주소
   - `test_signature_1`: 사전 서명된 서명 (60분 유효)
   - `test_timestamp_1`: 타임스탬프

4. 로그인 후 자동으로 `auth_token` 변수에 JWT 저장됨

#### 💡 curl로 빠른 테스트

```bash
# 1. 인증 메시지 생성
curl -X POST http://localhost:8085/api/auth/message \
  -H "Content-Type: application/json" \
  -d '{"wallet_address":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"}'

# 2. 로그인 (테스트 사용자)
curl -X POST http://localhost:8085/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "signature":"0x...",
    "timestamp":1735567890123
  }'

# 3. 내 정보 조회
curl -X GET http://localhost:8085/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 다음 단계

1. ✅ 백엔드 API 완성
2. ⬜ 스마트 컨트랙트 개발 (Solidity)
3. ⬜ 프론트엔드 개발 (React + Web3)
4. ⬜ 온체인 로그 시스템
5. ⬜ 테스트넷 배포
6. ⬜ 실서버 배포
