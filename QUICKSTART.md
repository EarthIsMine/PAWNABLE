# ⚡ PAWNABLE 빠른 시작 가이드

5분 안에 PAWNABLE 플랫폼을 실행하고 첫 대출을 테스트하세요!

## 🚀 1단계: 환경 실행 (5분)

### Terminal 1 - Hardhat 노드 시작

```bash
cd blockchain
pnpm hardhat node
```

✅ 20개의 테스트 계정 생성 완료!

### Terminal 2 - 컨트랙트 배포 & 테스트 자산 준비

```bash
cd blockchain

# 스마트 컨트랙트 배포
pnpm hardhat run scripts/deploy.ts --network localhost

# 테스트 지갑에 NFT와 USDT 발급
pnpm hardhat run scripts/setup-test-wallet.ts --network localhost
```

✅ 배포 완료! 컨트랙트 주소가 자동으로 환경 변수에 저장됨

### Terminal 3 - 백엔드 실행

```bash
cd backend
pnpm dev
```

✅ API 서버: http://localhost:8085

### Terminal 4 - 프론트엔드 실행

```bash
cd frontend
pnpm dev
```

✅ 웹 앱: http://localhost:3000

---

## 🦊 2단계: MetaMask 설정 (2분)

### 1. 네트워크 추가

MetaMask > 설정 > 네트워크 > 네트워크 추가

```
네트워크 이름: Hardhat Local
RPC URL: http://127.0.0.1:8545
체인 ID: 1337
통화 기호: ETH
```

### 2. 테스트 계정 가져오기

**Borrower (NFT 소유자):**
```
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
주소: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

**Lender (USDT 소유자):**
```
Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
주소: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
```

MetaMask에서:
- 계정 아이콘 클릭
- "계정 가져오기"
- Private Key 입력
- 완료!

---

## 🎮 3단계: 첫 대출 테스트 (3분)

### 대출 요청 (Borrower)

1. **MetaMask에서 Borrower 계정으로 전환**
2. **http://localhost:3000 접속**
3. **"지갑 연결" 클릭** → MetaMask 승인
4. **"대출 생성" 페이지로 이동**
5. **대출 정보 입력:**
   ```
   NFT 컨트랙트: 0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE
   Token ID: 0
   대출 금액: 100 USDT
   이자율: 500 (5%)
   대출 기간: 7 (일)
   ```
6. **"NFT 승인" 클릭** → MetaMask 승인
7. **"대출 요청" 클릭** → MetaMask 승인

✅ 대출이 마켓플레이스에 등록됨!

### 대출 매칭 (Lender)

1. **MetaMask에서 Lender 계정으로 전환**
2. **페이지 새로고침 후 "지갑 연결"**
3. **"마켓플레이스" 페이지로 이동**
4. **등록된 대출 확인**
5. **"USDT 승인" 클릭** → MetaMask 승인
6. **"대출 매칭" 클릭** → MetaMask 승인

✅ 대출 매칭 완료! USDT가 Borrower에게 전송되고 NFT가 에스크로됨

### 대출 상환 (Borrower)

1. **MetaMask에서 Borrower 계정으로 전환**
2. **"내 대출" 페이지에서 ACTIVE 대출 확인**
3. **"상환하기" 클릭** → MetaMask 승인

✅ 상환 완료! NFT가 반환되고 원금+이자가 Lender에게 전송됨

---

## 📊 확인 사항

### 터미널에서 잔액 확인

```bash
cd blockchain

# USDT 잔액 확인
pnpm hardhat run scripts/check-balance.ts --network localhost

# NFT 소유 확인
pnpm hardhat console --network localhost
> const nft = await ethers.getContractAt("PawnableNFT", "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE")
> await nft.ownerOf(0)
```

### 트랜잭션 로그

Hardhat 노드 터미널에서 모든 트랜잭션을 실시간으로 볼 수 있습니다:
- Contract call
- Gas used
- Block number
- Transaction hash

---

## 🎉 성공!

축하합니다! 이제 완전히 작동하는 P2P NFT 담보 대출 플랫폼을 실행 중입니다!

### 다음 단계

1. **코드 탐색**
   - [frontend/src/lib/contracts.ts](frontend/src/lib/contracts.ts) - 컨트랙트 서비스
   - [frontend/src/hooks/use-contract.ts](frontend/src/hooks/use-contract.ts) - React Hook
   - [blockchain/contracts/PawnableLoan.sol](blockchain/contracts/PawnableLoan.sol) - 메인 컨트랙트

2. **상세 가이드 읽기**
   - [WALLET_INTEGRATION_GUIDE.md](WALLET_INTEGRATION_GUIDE.md) - 완전한 통합 가이드

3. **테스트넷 배포**
   - Sepolia 테스트넷에 배포하기
   - 실제 사용자와 테스트하기

---

## 🔧 문제 해결

### Hardhat 노드 재시작 시

컨트랙트 주소가 변경되므로:

```bash
cd blockchain
pnpm hardhat run scripts/deploy.ts --network localhost
pnpm hardhat run scripts/setup-test-wallet.ts --network localhost
```

프론트엔드와 백엔드 재시작

### MetaMask 네트워크 오류

MetaMask에서 "Hardhat Local" 네트워크가 선택되어 있는지 확인

### 트랜잭션 실패

1. USDT/NFT 승인 먼저 했는지 확인
2. 충분한 잔액이 있는지 확인
3. 올바른 계정으로 전환했는지 확인

---

**즐거운 개발 되세요! 🚀**
