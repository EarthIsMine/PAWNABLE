# 🔗 PAWNABLE 지갑 연결 가이드

PAWNABLE이 실제 블록체인과 연결되어 동작하는 완전한 P2P NFT 담보 대출 서비스가 되었습니다!

## 📋 목차

1. [시스템 아키텍처](#-시스템-아키텍처)
2. [로컬 환경 설정](#-로컬-환경-설정)
3. [지갑 연결 방법](#-지갑-연결-방법)
4. [테스트 방법](#-테스트-방법)
5. [실제 서비스 배포](#-실제-서비스-배포)

---

## 🏗 시스템 아키텍처

```
┌──────────────────────────────────────────────────────────┐
│                   PAWNABLE Platform                      │
└──────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   프론트엔드    │    │   백엔드 API    │    │   스마트 컨트랙트  │
│   (Next.js)     │◄──►│   (Express)     │    │   (Solidity)      │
│                 │    │                 │    │                   │
│  • MetaMask     │    │  • 지갑 인증    │    │  • PawnableLoan   │
│  • ethers.js    │    │  • JWT 토큰     │    │  • MockUSDT       │
│  • 컨트랙트     │    │  • 데이터 CRUD  │    │  • PawnableNFT    │
│    호출         │    │  • TX 로그      │    │                   │
└─────────────────┘    └─────────────────┘    └──────────────────┘
         │                      │                        ▲
         │                      │                        │
         └──────────────────────┼────────────────────────┘
                                │
                    ┌───────────▼──────────┐
                    │   PostgreSQL DB      │
                    │                      │
                    │  • users             │
                    │  • loans             │
                    │  • collaterals       │
                    │  • onchain_tx_logs   │
                    └──────────────────────┘
```

---

## 🚀 로컬 환경 설정

### 1. Hardhat 로컬 노드 실행

Hardhat은 로컬 이더리움 네트워크를 제공합니다.

```bash
cd blockchain
pnpm hardhat node
```

실행되면 20개의 테스트 계정과 각각 10,000 ETH가 제공됩니다:

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH) - Deployer
Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH) - Test User 1
Account #2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (10000 ETH) - Test User 2
...
```

### 2. 스마트 컨트랙트 배포

새 터미널을 열고:

```bash
cd blockchain
pnpm hardhat run scripts/deploy.ts --network localhost
```

배포 후 출력되는 주소들:

```
MockUSDT       : 0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1
PawnableNFT    : 0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE
PawnableLoan   : 0x68B1D87F95878fE05B998F19b66F4baba5De1aed
```

**✅ 이미 완료됨** - 환경 변수 파일에 자동 저장되었습니다!

### 3. 테스트 자산 준비

```bash
cd blockchain
pnpm hardhat run scripts/setup-test-wallet.ts --network localhost
```

결과:
- Test User 1: NFT 3개 + USDT 1,000개 (Borrower)
- Test User 2: USDT 1,000개 (Lender)

### 4. 백엔드 서버 실행

```bash
cd backend
pnpm dev
```

서버: `http://localhost:8085`

### 5. 프론트엔드 실행

```bash
cd frontend
pnpm dev
```

앱: `http://localhost:3000`

---

## 🔐 지갑 연결 방법

### MetaMask 설정

#### 1. MetaMask 설치

- [Chrome Extension](https://metamask.io/download/)
- 브라우저에 MetaMask 확장 프로그램 설치

#### 2. Hardhat 로컬 네트워크 추가

MetaMask 설정 > 네트워크 > 네트워크 추가:

```
네트워크 이름: Hardhat Local
RPC URL: http://127.0.0.1:8545
체인 ID: 1337
통화 기호: ETH
```

#### 3. 테스트 계정 가져오기

Hardhat 노드 시작 시 표시된 Private Key를 사용:

**Test User 1 (Borrower - NFT 소유자):**
```
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
주소: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

**Test User 2 (Lender - USDT 소유자):**
```
Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
주소: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
```

MetaMask에서:
1. 계정 아이콘 클릭
2. "계정 가져오기" 선택
3. Private Key 입력
4. 가져오기 완료

---

## 🧪 테스트 방법

### 시나리오 1: 대출 요청 (Borrower)

1. **MetaMask에서 Test User 1로 전환**
2. **PAWNABLE 앱에서 "지갑 연결" 클릭**
   - MetaMask 팝업에서 승인
   - 서명 요청 승인 (가스비 0)
   - 자동으로 로그인됨

3. **"대출 생성" 페이지로 이동**
4. **대출 정보 입력:**
   - NFT 컨트랙트: `0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE`
   - Token ID: `0` (또는 `1`, `2`)
   - 대출 금액: `100` USDT
   - 이자율: `500` (5%)
   - 대출 기간: `7` days

5. **"NFT 승인" 클릭**
   - MetaMask 트랜잭션 승인
   - NFT가 컨트랙트에 담보로 예치됨

6. **"대출 요청" 클릭**
   - MetaMask 트랜잭션 승인
   - 대출이 마켓플레이스에 등록됨

### 시나리오 2: 대출 매칭 (Lender)

1. **MetaMask에서 Test User 2로 전환**
2. **PAWNABLE 앱 새로고침 후 "지갑 연결"**
3. **"마켓플레이스" 페이지로 이동**
4. **등록된 대출 확인**
5. **"USDT 승인" 클릭**
   - 대출 금액만큼 USDT 지출 승인
6. **"대출 매칭" 클릭**
   - USDT가 Borrower에게 전송됨
   - NFT가 Escrow로 이동됨
   - 대출 상태: ACTIVE

### 시나리오 3: 대출 상환 (Borrower)

1. **MetaMask에서 Test User 1로 전환**
2. **"내 대출" 페이지에서 ACTIVE 대출 확인**
3. **"상환" 클릭**
   - 원금 + 이자 + 플랫폼 수수료 지불
   - NFT가 Borrower에게 반환됨
   - 대출 상태: REPAID

### 시나리오 4: 대출 청산 (Lender)

1. **기한이 지난 대출이 있을 경우**
2. **MetaMask에서 Lender로 전환**
3. **"청산" 클릭**
   - NFT가 Lender에게 이전됨
   - 대출 상태: LIQUIDATED

---

## 📊 주요 기능

### 프론트엔드 컨트랙트 서비스

파일: `frontend/src/lib/contracts.ts`

```typescript
import { contractService } from "@/lib/contracts"

// 초기화 (지갑 연결 시 자동)
await contractService.initialize()

// USDT 잔액 확인
const balance = await contractService.getUSDTBalance(address)

// USDT 승인
await contractService.approveUSDT("100")

// NFT 승인
await contractService.approveNFT(tokenId)

// 대출 요청
const { txHash, loanId } = await contractService.requestLoan(
  nftContract,
  tokenId,
  "100", // USDT
  500,   // 5%
  7 * 24 * 3600 // 7 days
)

// 대출 매칭
await contractService.matchLoan(loanId)

// 대출 상환
await contractService.repayLoan(loanId)

// 대출 청산
await contractService.liquidateLoan(loanId)
```

### React Hook 사용

파일: `frontend/src/hooks/use-contract.ts`

```typescript
import { useContract } from "@/hooks/use-contract"

function MyComponent() {
  const {
    isInitialized,
    isLoading,
    requestLoan,
    matchLoan,
    repayLoan,
    getAllLoans,
  } = useContract()

  // 사용 예시
  const handleRequestLoan = async () => {
    try {
      const result = await requestLoan(
        nftContract,
        tokenId,
        amount,
        interestRate,
        duration
      )
      console.log("Loan created:", result.loanId)
    } catch (error) {
      console.error(error)
    }
  }
}
```

---

## 🌐 실제 서비스 배포

### 테스트넷 배포 (Sepolia)

#### 1. 환경 설정

`blockchain/.env` 파일 생성:

```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_deployer_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

#### 2. Hardhat 설정 업데이트

`blockchain/hardhat.config.ts`:

```typescript
import * as dotenv from "dotenv"
dotenv.config()

const config: HardhatUserConfig = {
  // ... 기존 설정
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
}
```

#### 3. 배포

```bash
cd blockchain
pnpm hardhat run scripts/deploy.ts --network sepolia
```

#### 4. 검증

```bash
pnpm hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS
```

#### 5. 환경 변수 업데이트

배포된 주소로 `.env` 파일 업데이트:

```env
# backend/.env
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
LOAN_CONTRACT_ADDRESS=0x...
USDT_CONTRACT_ADDRESS=0x...
NFT_CONTRACT_ADDRESS=0x...

# frontend/.env.local
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
NEXT_PUBLIC_LOAN_CONTRACT=0x...
NEXT_PUBLIC_USDT_CONTRACT=0x...
NEXT_PUBLIC_NFT_CONTRACT=0x...
```

---

## 🔧 트러블슈팅

### MetaMask 연결 안됨

**문제:** "MetaMask is not installed" 에러

**해결:**
1. MetaMask 확장 프로그램 설치 확인
2. 브라우저 새로고침
3. MetaMask 잠금 해제 확인

### 트랜잭션 실패

**문제:** "Transaction reverted" 에러

**해결:**
1. USDT/NFT 승인 먼저 완료했는지 확인
2. 충분한 잔액이 있는지 확인
3. 올바른 네트워크에 연결되어 있는지 확인 (chainId: 1337)

### 네트워크 불일치

**문제:** "Please switch to network with chainId 1337"

**해결:**
1. MetaMask에서 "Hardhat Local" 네트워크 선택
2. 또는 자동 네트워크 전환 승인

### Hardhat 노드 재시작 후 주소 변경

**문제:** 컨트랙트 주소가 변경됨

**해결:**
```bash
# 1. 컨트랙트 재배포
cd blockchain
pnpm hardhat run scripts/deploy.ts --network localhost

# 2. 테스트 자산 재설정
pnpm hardhat run scripts/setup-test-wallet.ts --network localhost

# 3. 프론트엔드/백엔드 재시작
```

---

## 📈 다음 단계

### 추가 기능 구현

1. **토큰 가격 오라클 통합**
   - Chainlink Price Feeds
   - 실시간 담보 가치 평가

2. **부분 상환 기능**
   - 원금의 일부만 상환 가능

3. **자동 청산 봇**
   - 기한 만료 시 자동 청산

4. **알림 시스템**
   - 상환 기한 알림
   - 청산 위험 알림

### 보안 강화

1. **스마트 컨트랙트 감사**
   - OpenZeppelin Defender
   - 전문 감사 업체 의뢰

2. **Rate Limiting**
   - API 요청 제한
   - DDoS 방어

3. **Multi-sig 지갑**
   - 플랫폼 수수료 관리
   - 긴급 중단 기능

---

## 🎉 완료!

이제 PAWNABLE은 실제 블록체인과 연동된 완전한 P2P NFT 담보 대출 플랫폼입니다!

- ✅ MetaMask 지갑 연결
- ✅ 스마트 컨트랙트 상호작용
- ✅ NFT 담보 예치
- ✅ USDT 대출/상환
- ✅ 완전 탈중앙화 대출 프로세스

**질문이나 문제가 있으면 GitHub Issues를 통해 문의해주세요!**
