# PAWNABLE Blockchain Module

P2P 담보 대출 플랫폼의 스마트 컨트랙트 모듈입니다.

## 📋 개요

PAWNABLE은 **NFT를 담보로 ERC20 토큰(USDT 등)을 대출하는 P2P 플랫폼**입니다.

### 핵심 특징

- 🤝 **P2P 매칭**: 차입자와 대출자가 1:1로 직접 매칭
- 💰 **자유로운 금리**: 차입자가 원하는 이자율 제시
- ⏰ **기한 기반 청산**: 가격 하락이 아닌 기한 만료 시 청산
- 🎨 **NFT 담보**: NFT를 담보로 사용
- 🔒 **안전한 에스크로**: 스마트 컨트랙트가 담보와 자금을 안전하게 관리

### 기존 DeFi와의 차이점

| 구분 | 기존 DeFi (AAVE 등) | PAWNABLE |
|------|-------------------|----------|
| 금리 결정 | 알고리즘 (수요·공급) | 차입자가 직접 제시 |
| 구조 | 유동성 풀 기반 | 1:1 P2P 매칭 |
| 청산 방식 | 담보 가치 하락 시 | 기한 만료 시 |
| 상환 구조 | 기한 없음 | 명확한 상환 기한 |

---

## 📁 컨트랙트 구조

### 1. **PawnableLoan.sol** (핵심 컨트랙트)

P2P 대출의 모든 로직을 담당합니다.

```solidity
// 주요 함수들
requestLoan()    // 대출 요청 생성
cancelLoan()     // 대출 요청 취소
matchLoan()      // 대출자가 매칭
repayLoan()      // 차입자가 상환
liquidateLoan()  // 기한 초과 시 청산
```

**대출 상태 흐름:**
```
PENDING → ACTIVE → REPAID (정상 상환)
                 → LIQUIDATED (기한 초과)
PENDING → CANCELLED (매칭 전 취소)
```

### 2. **PawnableNFT.sol**

테스트용 NFT 컨트랙트입니다.

```solidity
mint()        // NFT 발행
tokenURI()    // 메타데이터 조회
```

### 3. **MockUSDT.sol**

테스트용 USDT 토큰입니다.

```solidity
mint()        // 테스트 토큰 발행
decimals()    // 6 (실제 USDT와 동일)
```

---

## 🚀 시작하기

### 1. 의존성 설치

```bash
cd blockchain
pnpm install
```

### 2. 컴파일

```bash
pnpm compile
```

### 3. 테스트

```bash
pnpm test
```

### 4. 로컬 노드 실행

```bash
pnpm node
```

새 터미널에서:

```bash
pnpm deploy
```

---

## 📖 사용 예시

### 시나리오: Alice가 NFT를 담보로 1,000 USDT 빌리기

#### 1️⃣ Alice가 대출 요청 생성

```typescript
// NFT를 컨트랙트에 approve
await nftContract.connect(alice).approve(loanContractAddress, nftTokenId);

// 대출 요청
await loanContract.connect(alice).requestLoan(
  "loan-001",                    // 대출 ID
  usdtAddress,                   // USDT 주소
  ethers.parseUnits("1000", 6),  // 1,000 USDT
  ethers.parseUnits("1100", 6),  // 1,100 USDT 상환 (10% 이자)
  nftAddress,                    // NFT 주소
  [nftTokenId],                  // NFT 토큰 ID
  dueTimestamp                   // 30일 후
);
```

**결과:**
- Alice의 NFT가 컨트랙트로 전송됨
- 대출 상태: `PENDING`

#### 2️⃣ Bob이 대출 매칭

```typescript
// USDT를 컨트랙트에 approve
await usdtContract.connect(bob).approve(loanContractAddress, 1000 * 1e6);

// 대출 매칭
await loanContract.connect(bob).matchLoan("loan-001");
```

**결과:**
- Bob의 1,000 USDT → Alice에게 전송 (수수료 0.1% 차감)
- 대출 상태: `ACTIVE`

#### 3️⃣ Alice가 상환 (기한 내)

```typescript
// USDT를 컨트랙트에 approve
await usdtContract.connect(alice).approve(loanContractAddress, 1100 * 1e6);

// 상환
await loanContract.connect(alice).repayLoan("loan-001");
```

**결과:**
- Alice의 1,100 USDT → Bob에게 전송 (수수료 0.1% 차감)
- Alice의 NFT 반환
- 대출 상태: `REPAID`

#### 4️⃣ 또는 청산 (기한 초과 시)

```typescript
// 누구나 청산 가능
await loanContract.connect(anyone).liquidateLoan("loan-001");
```

**결과:**
- Alice의 NFT → Bob에게 전송
- 대출 상태: `LIQUIDATED`

---

## 💡 주요 개념

### 1. 수수료 구조

- **선 수수료**: 대출 매칭 시 대출 금액의 0.1%
- **후 수수료**: 상환 시 상환 금액의 0.1%

```typescript
// 예시: 1,000 USDT 대출
대출 시: Bob 1,000 USDT 지불 → Alice 999 USDT 수령
상환 시: Alice 1,100 USDT 지불 → Bob 1,098.9 USDT 수령
플랫폼 수수료: 1 + 1.1 = 2.1 USDT
```

### 2. 청산 조건

- **기한 만료**: `block.timestamp > dueTimestamp`
- **가격 무관**: 담보 가치 하락과 상관없이 기한만 체크
- **누구나 실행 가능**: 청산은 누구나 호출 가능하지만 담보는 대출자에게 전송

### 3. 담보 관리

```solidity
// 담보는 항상 컨트랙트가 보관
requestLoan()  → NFT 잠김 (컨트랙트로 전송)
cancelLoan()   → NFT 반환 (차입자에게)
repayLoan()    → NFT 반환 (차입자에게)
liquidateLoan() → NFT 이전 (대출자에게)
```

---

## 🧪 테스트

테스트는 다음 시나리오를 커버합니다:

- ✅ 컨트랙트 배포
- ✅ 대출 요청 생성
- ✅ 대출 취소
- ✅ 대출 매칭
- ✅ 대출 상환
- ✅ 대출 청산
- ✅ 수수료 수집
- ✅ 관리자 기능

```bash
# 모든 테스트 실행
pnpm test

# 특정 테스트만 실행
pnpm test --grep "대출 요청"

# 가스 리포트 확인
REPORT_GAS=true pnpm test
```

---

## 🔐 보안 고려사항

### 구현된 보안 기능

1. **ReentrancyGuard**: 재진입 공격 방지
2. **Ownable**: 관리자 권한 제한
3. **상태 검증**: modifier를 통한 엄격한 상태 체크
4. **OpenZeppelin 라이브러리**: 검증된 표준 사용

### 주의사항

- ⚠️ **테스트넷 전용**: 현재 코드는 교육/테스트 목적
- ⚠️ **감사 필요**: 메인넷 배포 전 전문 감사 필수
- ⚠️ **가격 오라클**: 실제 서비스는 담보 가치 평가 시스템 필요
- ⚠️ **거버넌스**: 수수료율 변경 등 거버넌스 메커니즘 고려

---

## 🔧 설정

### Hardhat 설정

[hardhat.config.ts](hardhat.config.ts) 참조

```typescript
{
  solidity: "0.8.27",
  networks: {
    hardhat: { chainId: 1337 },
    localhost: { url: "http://127.0.0.1:8545" }
  }
}
```

### 환경 변수

배포 후 `.env` 파일에 주소 저장:

```env
USDT_CONTRACT_ADDRESS=0x...
NFT_CONTRACT_ADDRESS=0x...
LOAN_CONTRACT_ADDRESS=0x...
```

---

## 📚 학습 자료

### Solidity 기초

- [Solidity 공식 문서](https://docs.soliditylang.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

### Hardhat

- [Hardhat 공식 문서](https://hardhat.org/docs)
- [Hardhat Tutorial](https://hardhat.org/tutorial)

### 스마트 컨트랙트 보안

- [Consensys Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [SWC Registry](https://swcregistry.io/)

---

## 🛠️ 기술 스택

- **Solidity** `^0.8.27` - 스마트 컨트랙트 언어
- **Hardhat** `^2.22.18` - 개발 환경
- **ethers.js** `^6.x` - 이더리움 라이브러리
- **TypeScript** `^5.7.2` - 타입 안전성
- **OpenZeppelin** `^5.x` - 표준 컨트랙트 라이브러리

---

## 📝 라이선스

MIT License

---

## 🤝 기여

이슈 및 PR은 환영합니다!

---

## 📞 문의

프로젝트 관련 문의사항이 있으시면 이슈를 등록해주세요.
