# PAWNABLE API 가이드

## 목차
1. [환경 설정](#환경-설정)
2. [서버 실행](#서버-실행)
3. [API 엔드포인트](#api-엔드포인트)
4. [인증 플로우](#인증-플로우)
5. [사용 예시](#사용-예시)

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
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=pawnable
DB_PASSWORD=ghwo336pw1988
DB_DATABASE=pawnable_db

NODE_ENV=development
PORT=8085

JWT_SECRET=pawnable_dev_secret_key_2024_change_in_production
JWT_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:3001
```

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

### 1️⃣ 인증 메시지 생성

**Request:**
```bash
POST /api/auth/message
Content-Type: application/json

{
  "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Auth message generated",
  "data": {
    "message": "Welcome to PAWNABLE!\n\nSign this message to authenticate.\n\nWallet: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb\nTimestamp: 1703001234567",
    "timestamp": 1703001234567
  }
}
```

### 2️⃣ 메시지 서명 (프론트엔드)

```javascript
// ethers.js 사용 예시
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const signature = await signer.signMessage(message);
```

### 3️⃣ 로그인

**Request:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "message": "Welcome to PAWNABLE!...",
  "signature": "0x...",
  "timestamp": 1703001234567
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user_id": "uuid-here"
  }
}
```

### 4️⃣ 인증된 요청

이후 모든 요청에 헤더 추가:
```
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

## 다음 단계

1. ✅ 백엔드 API 완성
2. ⬜ 스마트 컨트랙트 개발 (Solidity)
3. ⬜ 프론트엔드 개발 (React + Web3)
4. ⬜ 온체인 로그 시스템
5. ⬜ 테스트넷 배포
6. ⬜ 실서버 배포
