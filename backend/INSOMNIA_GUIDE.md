# 🔥 Insomnia API 테스트 가이드

PAWNABLE API를 Insomnia로 테스트하는 완벽한 가이드입니다.

---

## 📥 1. Insomnia 설치 및 컬렉션 임포트

### Insomnia 설치
- [Insomnia 다운로드](https://insomnia.rest/download)
- 무료 버전 사용 가능

### 컬렉션 임포트
1. Insomnia 실행
2. `Create` → `Import From` → `File` 선택
3. `/srv/PAWNABLE/backend/insomnia-collection.json` 파일 선택
4. "PAWNABLE API" 워크스페이스 생성 완료! 🎉

---

## 🔧 2. 환경 변수 설정

컬렉션 임포트 후 자동으로 환경 변수가 설정됩니다:

### 기본 환경 변수
컬렉션 임포트 후 자동으로 설정되지만, **반드시 확인 및 수정**이 필요합니다.

```json
{
  "base_url": "http://yt4307.mooo.com:8085",
  "api_url": "http://yt4307.mooo.com:8085/api",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidGVzdC11c2VyLTAwMSIsIndhbGxldF9hZGRyZXNzIjoiMHg3NDJkMzVDYzY2MzRDMDUzMjkyNWEzYjg0NEJjOWU3NTk1ZjBiRWIiLCJpYXQiOjE3NjY5OTU1MDIsImV4cCI6MTc2NzYwMDMwMn0.HnetMngYPzo1HXL83LFRGEGG_G803Q9RIexA370ZWh0",
  "user_id": "test-user-001",
  "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "loan_id": "placeholder-loan-id",
  "asset_id": "placeholder-asset-id"
}
```

**⚠️ 중요:**
- `token`: 위 값은 테스트용 토큰입니다 (7일 유효). 만료 시 `pnpm run test:token`으로 재생성
- `user_id`: 토큰의 사용자 ID (`test-user-001`)
- `loan_id`, `asset_id`: 실제 생성 후 값을 업데이트하세요

### 환경 변수 수정 방법
1. 왼쪽 상단 환경 드롭다운 클릭 (Manage Environments)
2. "Base Environment" 선택
3. 값 수정 후 저장

---

## 🚀 3. 단계별 테스트 플로우

### STEP 1: 기본 연결 확인 ✅

#### 1-1. Health Check
- 📁 `Basic` → `Health Check` 실행
- 예상 응답:
```json
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "2025-12-29T..."
}
```

#### 1-2. API Info
- 📁 `Basic` → `API Info` 실행
- 서버가 정상 동작하는지 확인

---

### STEP 2: 테스트 데이터 생성 (자산) 💎

#### 2-1. ETH 자산 생성
- 📁 `Assets` → `Create ETH Asset (Admin)` 실행
- 응답에서 `asset_id` 복사
- 환경 변수의 `asset_id`에 붙여넣기

#### 2-2. USDT 자산 생성
- 📁 `Assets` → `Create Asset (Admin)` 실행
- 두 번째 자산 ID 저장 (대출용)

#### 2-3. 자산 목록 확인
- 📁 `Assets` → `Get All Assets (Public)` 실행
- 생성된 자산들 확인

---

### STEP 3: 사용자 생성 및 인증 🔐

#### 3-1. 토큰 검증 (이미 설정됨!)
- 환경 변수에 이미 테스트 토큰이 설정되어 있습니다
- 📁 `Authentication` → `3. Verify Token` 실행
- 토큰이 정상적으로 작동하는지 확인

**토큰이 만료된 경우:**
```bash
cd /srv/PAWNABLE/backend
pnpm run test:token
```
출력된 새 토큰을 환경 변수의 `token`에 업데이트

#### 3-2. 내 정보 조회
- 📁 `Users` → `Get My Info` 실행
- 현재 로그인된 사용자 정보 확인

#### 3-3. 사용자 생성 (선택사항)
- 새로운 사용자가 필요한 경우
- 📁 `Users` → `Create User` 실행
- 응답에서 `user_id` 복사 후 환경 변수 업데이트 가능

---

### STEP 4: 대출 플로우 테스트 💰

#### 4-1. 마켓플레이스 확인 (비어있음)
- 📁 `Loans` → `Get Marketplace (Public)` 실행
- 빈 배열 `[]` 응답 확인

#### 4-2. 대출 생성
- 📁 `Loans` → `Create Loan` 실행
- 환경 변수 `user_id`, `asset_id` 확인 필수!
- 응답에서 `loan_id` 복사
- 환경 변수의 `loan_id`에 붙여넣기

요청 본문 예시:
```json
{
  "borrower_id": "{{ _.user_id }}",
  "loan_asset_id": "{{ _.asset_id }}",
  "loan_amount": 1000,
  "interest_rate_pct": 5.0,
  "total_repay_amount": 1050,
  "repay_due_at": "2025-12-31T23:59:59Z",
  "collaterals": [
    {
      "asset_id": "{{ _.asset_id }}",
      "amount": 0.5,
      "token_id": null
    }
  ]
}
```

#### 4-3. 마켓플레이스 재확인
- 📁 `Loans` → `Get Marketplace (Public)` 실행
- 방금 생성한 대출이 표시되는지 확인

#### 4-4. 대출 상세 조회
- 📁 `Loans` → `Get Loan by ID` 실행
- 대출 세부 정보 확인

#### 4-5. 대출 매칭 (두 번째 사용자 필요)
- 새로운 사용자 생성 또는 기존 사용자 ID 사용
- 📁 `Loans` → `Match Loan` 실행

```json
{
  "lender_id": "lender-user-uuid-here"
}
```

#### 4-6. 대출 활성화
- 📁 `Loans` → `Activate Loan` 실행
- 상태가 `matched` → `active`로 변경

#### 4-7. 대출 상환
- 📁 `Loans` → `Repay Loan` 실행
- 상태가 `active` → `repaid`로 변경

---

## 💡 4. Insomnia 사용 팁

### 환경 변수 사용하기
- 모든 요청에서 `{{ _.변수명 }}` 형식으로 사용
- 예: `{{ _.token }}`, `{{ _.user_id }}`

### 응답에서 값 자동 추출
1. 요청 실행 후 응답 확인
2. 필요한 값 (예: `loan_id`) 복사
3. 환경 설정에서 해당 변수에 붙여넣기

### 폴더별 구성
```
🏠 Basic           - 헬스체크, API 정보
🔐 Authentication  - 인증 관련
👤 Users          - 사용자 관리
💎 Assets         - 자산 관리
💰 Loans          - 대출 관리
```

### 인증 토큰 자동 사용
- Protected 엔드포인트는 자동으로 `{{ _.token }}` 사용
- Bearer 토큰 인증 방식

---

## 🔄 5. 전체 테스트 시나리오

### 시나리오 A: 빠른 테스트 (환경 변수 이미 설정됨!)
```
1. Health Check
2. Verify Token (토큰이 이미 설정되어 있음!)
3. Get My Info
4. Create ETH Asset
5. Get All Assets
6. Get Marketplace
```

### 시나리오 B: 완전한 대출 플로우
```
1. Health Check
2. Verify Token (환경 변수에 이미 설정됨)
3. Get My Info
4. Create ETH Asset (담보용) → asset_id 복사 → 환경 변수 업데이트
5. Create USDT Asset (대출용)
6. Get All Assets (생성된 자산 확인)
7. Create Loan (환경 변수의 user_id, asset_id 사용) → loan_id 복사 → 환경 변수 업데이트
8. Get Marketplace (대출 확인)
9. Create User (대출자용) - 선택사항
10. Match Loan
11. Activate Loan
12. Repay Loan
```

---

## ⚠️ 주의사항

### 인증 필요 여부
- ✅ = 토큰 필요 (Authorization 헤더)
- ❌ = 토큰 불필요 (Public)

### 실제 지갑 서명이 필요한 경우
`Authentication` → `2. Login (Need Signature)`는 실제 MetaMask 등 지갑 서명이 필요합니다.

**개발/테스트용 대안:**
```bash
# 터미널에서 테스트 토큰 생성
cd /srv/PAWNABLE/backend
pnpm run test:token
```

### 환경 변수 업데이트
**이미 설정된 값:**
- ✅ `token` - 테스트 토큰 설정됨 (7일 유효)
- ✅ `user_id` - `test-user-001` 설정됨
- ✅ `wallet_address` - 설정됨

**업데이트가 필요한 값:**
- ⏳ `asset_id` - 자산 생성 후 실제 ID로 교체
- ⏳ `loan_id` - 대출 생성 후 실제 ID로 교체

---

## 🎯 6. 자주 사용하는 요청

### Public (토큰 없이 테스트 가능)
1. `GET /health` - 서버 상태
2. `GET /api/loans/marketplace` - 마켓플레이스
3. `GET /api/assets` - 자산 목록
4. `POST /api/auth/message` - 인증 메시지 생성

### Protected (토큰 필요)
1. `GET /api/users/me` - 내 정보
2. `POST /api/loans` - 대출 생성
3. `GET /api/loans` - 모든 대출
4. `POST /api/loans/:id/match` - 대출 매칭

---

## 🐛 트러블슈팅

### 401 Unauthorized
- 환경 변수의 `token` 값 확인
- 테스트 토큰 재생성: `pnpm run test:token`

### 404 Not Found
- URL 확인 (base_url이 `http://localhost:8085`인지)
- 서버가 실행 중인지 확인: `pnpm run dev`

### 400 Bad Request
- 요청 본문 JSON 형식 확인
- 필수 필드가 모두 포함되었는지 확인
- 환경 변수 값이 설정되었는지 확인 (`user_id`, `asset_id` 등)

### Connection Refused
- 서버 실행: `cd /srv/PAWNABLE/backend && pnpm run dev`
- 포트 확인: `.env` 파일의 `PORT=8085`

---

## 📚 추가 리소스

- API 가이드: `/srv/PAWNABLE/backend/API_GUIDE.md`
- 라우트 정의: `/srv/PAWNABLE/backend/routes/loanRoutes.ts`
- 환경 설정: `/srv/PAWNABLE/backend/.env`

---

**Happy Testing! 🚀**
