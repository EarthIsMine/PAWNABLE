# PAWNABLE - P2P 담보 기반 대출 플랫폼

> **완전히 새로운 방식의 DeFi 대출 플랫폼**
>
> 기존 디파이(AAVE 등)와는 다르게, 금리를 차입자가 직접 제시하고 P2P로 매칭되는 혁신적인 구조

---

## 🎯 프로젝트 특징

### AAVE vs PAWNABLE

| 구분 | AAVE (기존 디파이) | PAWNABLE |
|------|-------------------|----------|
| 금리 결정 | 알고리즘(수요·공급) | **차입자가 직접 제시** |
| 구조 | 유동성 풀 기반 | **1:1 P2P 매칭** |
| 상환 구조 | 기한 없음 | **명확한 상환 기한** |
| 청산 방식 | 담보 가치 하락 시 | **기한 만료 시** |
| 이자율 | 평균 시장 금리 | **협상 가능한 금리** |

---

## 📁 프로젝트 구조

```
PAWNABLE/
├── config/
│   └── database.ts          # TypeORM 데이터베이스 설정
├── models/
│   ├── userModel.ts         # User 엔티티
│   ├── assetModel.ts        # Asset 엔티티
│   ├── loanModel.ts         # Loan 엔티티
│   ├── collaterals.ts       # Collateral 엔티티
│   └── onchain_tx_log.ts    # 온체인 트랜잭션 로그
├── types/
│   └── index.ts             # TypeScript 타입 정의
├── utils/
│   ├── response.ts          # API 응답 유틸리티
│   ├── crypto.ts            # 암호화 및 서명 검증
│   └── jwt.ts               # JWT 토큰 관리
├── middlewares/
│   ├── auth.ts              # 인증 미들웨어
│   ├── cors.ts              # CORS 설정
│   └── errorHandler.ts      # 에러 핸들링
├── services/
│   ├── authService.ts       # 인증 비즈니스 로직
│   ├── userService.ts       # 사용자 비즈니스 로직
│   ├── assetService.ts      # 자산 비즈니스 로직
│   └── loanService.ts       # 대출 비즈니스 로직
├── controllers/
│   ├── authController.ts    # 인증 컨트롤러
│   ├── userController.ts    # 사용자 컨트롤러
│   ├── assetController.ts   # 자산 컨트롤러
│   └── loanController.ts    # 대출 컨트롤러
├── routes/
│   ├── authRoutes.ts        # 인증 라우트
│   ├── userRoutes.ts        # 사용자 라우트
│   ├── assetRoutes.ts       # 자산 라우트
│   └── loanRoutes.ts        # 대출 라우트
├── index.ts                 # 메인 서버 파일
├── seed.ts                  # 데이터베이스 시드
├── .env                     # 환경 변수
└── package.json
```

---

## 🚀 시작하기

### 1. 환경 설정

```bash
# PostgreSQL 설치 및 설정
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# 데이터베이스 생성
sudo -u postgres psql
CREATE DATABASE pawnable_db;
CREATE USER pawnable WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE pawnable_db TO pawnable;
\q
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env` 파일이 이미 설정되어 있습니다:

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

### 4. 초기 데이터 생성

```bash
npm run seed
```

### 5. 서버 실행

```bash
# 개발 모드 (hot reload)
npm run dev

# 프로덕션 모드
npm start
```

---

## 📡 API 엔드포인트

### 기본 정보
- **베이스 URL**: `http://localhost:8085/api`
- **서버 상태**: `http://localhost:8085/health`

### 인증 API (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/message` | 인증 메시지 생성 |
| POST | `/api/auth/login` | 지갑 로그인 |
| POST | `/api/auth/verify` | 토큰 검증 |

### 사용자 API (`/api/users`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | ✅ | 모든 사용자 조회 |
| GET | `/api/users/me` | ✅ | 내 정보 조회 |
| GET | `/api/users/:user_id` | ✅ | 특정 사용자 조회 |
| POST | `/api/users` | ❌ | 사용자 생성 |
| PUT | `/api/users/:user_id` | ✅ | 사용자 정보 수정 |
| DELETE | `/api/users/:user_id` | ✅ | 사용자 삭제 |

### 자산 API (`/api/assets`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/assets` | ❌ | 모든 자산 조회 |
| GET | `/api/assets/:asset_id` | ❌ | 특정 자산 조회 |
| GET | `/api/assets/blockchain/:blockchain` | ❌ | 블록체인별 자산 조회 |

### 대출 API (`/api/loans`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/loans/marketplace` | ❌ | 마켓플레이스 |
| GET | `/api/loans` | ✅ | 모든 대출 조회 |
| GET | `/api/loans/:loan_id` | ✅ | 대출 상세 조회 |
| POST | `/api/loans` | ✅ | 대출 생성 |
| POST | `/api/loans/:loan_id/match` | ✅ | 대출 매칭 |
| POST | `/api/loans/:loan_id/activate` | ✅ | 대출 활성화 |
| POST | `/api/loans/:loan_id/repay` | ✅ | 대출 상환 |
| POST | `/api/loans/:loan_id/liquidate` | ✅ | 대출 청산 |

자세한 API 문서는 [API_GUIDE.md](./API_GUIDE.md)를 참고하세요.

---

## 🔐 인증 플로우

### 1. 메시지 생성
```bash
POST /api/auth/message
{
  "wallet_address": "0x..."
}
```

### 2. 프론트엔드에서 서명
```javascript
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const signature = await signer.signMessage(message);
```

### 3. 로그인
```bash
POST /api/auth/login
{
  "wallet_address": "0x...",
  "message": "...",
  "signature": "0x...",
  "timestamp": 1703001234567
}
```

### 4. 이후 요청 시 헤더 추가
```
Authorization: Bearer <jwt_token>
```

---

## 💡 사용 예시

### 대출 생성
```bash
POST /api/loans
Authorization: Bearer <token>

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
      "amount": 1
    }
  ]
}
```

### 마켓플레이스 조회
```bash
GET /api/loans/marketplace

Response:
{
  "success": true,
  "data": [
    {
      "loan_id": "uuid",
      "loan_amount": 3000,
      "interest_rate_pct": 6.67,
      "total_repay_amount": 3200,
      "status": "pending",
      ...
    }
  ]
}
```

---

## 🗄️ 데이터베이스 스키마

### 주요 테이블

1. **users**: 사용자 정보
2. **assets**: 지원하는 자산 (ETH, USDT, SOL, USDC 등)
3. **loans**: 대출 정보
4. **collaterals**: 담보 정보
5. **onchain_tx_logs**: 온체인 트랜잭션 로그

ERD는 프로젝트 설명서를 참고하세요.

---

## 📊 대출 상태 전환

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

## 🛠️ 기술 스택

### Backend
- **Framework**: Express.js (TypeScript)
- **ORM**: TypeORM
- **Database**: PostgreSQL
- **Authentication**: JWT + Wallet Signature (ethers.js)

### 보안
- CORS 설정
- JWT 토큰 기반 인증
- 지갑 서명 검증
- 에러 핸들링 미들웨어

---

## 📝 다음 단계

- [ ] 스마트 컨트랙트 개발 (Solidity)
- [ ] 프론트엔드 개발 (React + Web3)
- [ ] 온체인 로그 시스템 구현
- [ ] 테스트넷 배포
- [ ] 거버넌스 토큰 설계
- [ ] 실서버 배포

---

## 📄 라이선스

MIT

---

## 👥 기여

프로젝트에 기여하고 싶으시다면 Pull Request를 보내주세요!

---

## 📞 문의

문제가 발생하거나 질문이 있으시면 Issue를 생성해주세요.
