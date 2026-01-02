# PAWNABLE Token Collateral

Native ETH 또는 ERC20 토큰을 담보로 하는 P2P 대출 시스템

---

## 🎯 개요

**PawnableLoanToken** 컨트랙트는 다음 두 가지 담보 방식을 지원합니다:

1. **Native ETH** (이더리움 코인 그 자체)
2. **ERC20 토큰** (WETH, USDC, DAI 등)

---

## 📊 담보 방식 비교

| 항목 | Native ETH | ERC20 토큰 |
|------|-----------|-----------|
| **담보 예시** | ETH | WETH, USDC, DAI |
| **전송 방식** | `msg.value` | `transferFrom()` |
| **함수** | `requestLoanWithETH()` | `requestLoanWithToken()` |
| **approve 필요** | ❌ 불필요 | ✅ 필요 |
| **가스비** | 낮음 | 조금 더 높음 |
| **유연성** | ETH만 가능 | 다양한 토큰 가능 |

---

## 🚀 사용 방법

### 1️⃣ Native ETH 담보 대출

#### **시나리오**
- Alice가 **1 ETH를 담보**로 제공
- **1,000 USDT를 빌림**
- **1,100 USDT 상환** (10% 이자)
- 기한: 30일

#### **코드 예시**

```typescript
// 1. 대출 요청 (ETH 전송과 함께)
const tx = await loanContract.connect(alice).requestLoanWithETH(
  "loan-eth-001",                      // 대출 ID
  usdtAddress,                         // 빌릴 토큰 (USDT)
  ethers.parseUnits("1000", 6),        // 대출 금액
  ethers.parseUnits("1100", 6),        // 상환 금액
  Math.floor(Date.now() / 1000) + 30 * 86400,  // 30일 후
  { value: ethers.parseEther("1") }    // 1 ETH 담보
);
```

**결과:**
- Alice의 1 ETH가 컨트랙트로 전송됨
- 대출 상태: `PENDING`

```typescript
// 2. 대출자 Bob이 매칭
await usdtContract.connect(bob).approve(loanContractAddress, 1000 * 1e6);
await loanContract.connect(bob).matchLoan("loan-eth-001");
```

**결과:**
- Bob의 1,000 USDT → Alice에게 (수수료 0.1% 차감)
- 대출 상태: `ACTIVE`

```typescript
// 3. Alice 상환
await usdtContract.connect(alice).approve(loanContractAddress, 1100 * 1e6);
await loanContract.connect(alice).repayLoan("loan-eth-001");
```

**결과:**
- Alice의 1,100 USDT → Bob에게 (수수료 0.1% 차감)
- **Alice의 1 ETH 반환**
- 대출 상태: `REPAID`

---

### 2️⃣ ERC20 토큰 담보 대출 (예: WETH)

#### **시나리오**
- Alice가 **2 WETH를 담보**로 제공
- **1,000 USDT를 빌림**
- **1,100 USDT 상환**
- 기한: 30일

#### **코드 예시**

```typescript
// 1. WETH approve (필수!)
await wethContract.connect(alice).approve(
  loanContractAddress,
  ethers.parseEther("2")
);

// 2. 대출 요청
await loanContract.connect(alice).requestLoanWithToken(
  "loan-weth-001",                     // 대출 ID
  usdtAddress,                         // 빌릴 토큰 (USDT)
  ethers.parseUnits("1000", 6),        // 대출 금액
  ethers.parseUnits("1100", 6),        // 상환 금액
  wethAddress,                         // 담보 토큰 (WETH)
  ethers.parseEther("2"),              // 담보 수량 (2 WETH)
  Math.floor(Date.now() / 1000) + 30 * 86400
);
```

**결과:**
- Alice의 2 WETH가 컨트랙트로 전송됨
- 대출 상태: `PENDING`

```typescript
// 3. Bob이 매칭
await usdtContract.connect(bob).approve(loanContractAddress, 1000 * 1e6);
await loanContract.connect(bob).matchLoan("loan-weth-001");
```

```typescript
// 4. Alice 상환
await usdtContract.connect(alice).approve(loanContractAddress, 1100 * 1e6);
await loanContract.connect(alice).repayLoan("loan-weth-001");
```

**결과:**
- **Alice의 2 WETH 반환**
- 대출 상태: `REPAID`

---

### 3️⃣ USDC 담보 대출

```typescript
// 2,000 USDC를 담보로 1,000 USDT 빌리기
await usdcContract.connect(alice).approve(
  loanContractAddress,
  ethers.parseUnits("2000", 6)
);

await loanContract.connect(alice).requestLoanWithToken(
  "loan-usdc-001",
  usdtAddress,
  ethers.parseUnits("1000", 6),        // 대출
  ethers.parseUnits("1100", 6),        // 상환
  usdcAddress,                         // 담보: USDC
  ethers.parseUnits("2000", 6),        // 2,000 USDC
  Math.floor(Date.now() / 1000) + 30 * 86400
);
```

---

## 🔄 대출 플로우

### ETH 담보 플로우
```
차입자:
  requestLoanWithETH() + msg.value
  → ETH 전송 → 컨트랙트 보관 (PENDING)

대출자:
  approve(USDT) → matchLoan()
  → USDT 전송 → 차입자 수령 (ACTIVE)

차입자:
  approve(USDT) → repayLoan()
  → USDT 상환 → ETH 반환 (REPAID)

또는:

누구나:
  기한 초과 → liquidateLoan()
  → ETH → 대출자 획득 (LIQUIDATED)
```

### ERC20 담보 플로우
```
차입자:
  approve(WETH) → requestLoanWithToken()
  → WETH 전송 → 컨트랙트 보관 (PENDING)

대출자:
  approve(USDT) → matchLoan()
  → USDT 전송 → 차입자 수령 (ACTIVE)

차입자:
  approve(USDT) → repayLoan()
  → USDT 상환 → WETH 반환 (REPAID)

또는:

누구나:
  기한 초과 → liquidateLoan()
  → WETH → 대출자 획득 (LIQUIDATED)
```

---

## 💰 수수료 시스템

### ERC20 토큰 수수료
- 대출 매칭 시: `collectedTokenFees[tokenAddress]`
- 상환 시: `collectedTokenFees[tokenAddress]`
- 인출: `withdrawTokenFees(tokenAddress)`

### ETH 수수료 (미래 확장)
현재는 대출 토큰이 ERC20(USDT 등)이므로 ETH 수수료는 발생하지 않습니다.
만약 ETH를 대출 토큰으로 사용한다면:
- `collectedETHFees`에 저장
- `withdrawETHFees()`로 인출

---

## 📋 컨트랙트 구조

### Loan 구조체
```solidity
struct Loan {
    string loanId;                  // 대출 ID
    address borrower;               // 차입자
    address lender;                 // 대출자
    address loanToken;              // 대출 토큰 (USDT)
    uint256 loanAmount;             // 대출 금액
    uint256 repayAmount;            // 상환 금액
    CollateralType collateralType;  // ETH or ERC20
    address collateralToken;        // 담보 토큰 주소 (ETH면 address(0))
    uint256 collateralAmount;       // 담보 수량
    uint256 dueTimestamp;           // 상환 기한
    LoanStatus status;              // 상태
    ...
}
```

### 담보 타입
```solidity
enum CollateralType {
    NATIVE_ETH,      // 0: Native 이더리움
    ERC20_TOKEN      // 1: ERC20 토큰
}
```

---

## 🧪 테스트 실행

```bash
cd blockchain

# 컴파일
pnpm compile

# 테스트
pnpm test test/PawnableLoanToken.test.ts

# 배포 (로컬넷)
pnpm node  # 터미널 1
npx hardhat run scripts/deploy-token.ts --network localhost  # 터미널 2
```

---

## 🔍 주요 함수

### 대출 요청
- `requestLoanWithETH()` - ETH 담보 대출 요청 (payable)
- `requestLoanWithToken()` - ERC20 담보 대출 요청

### 대출 관리
- `cancelLoan()` - 대출 취소 (PENDING 상태에서만)
- `matchLoan()` - 대출 매칭 (대출 실행)
- `repayLoan()` - 상환
- `liquidateLoan()` - 청산

### 조회
- `getLoan(loanId)` - 대출 정보 조회
- `getUserLoans(address)` - 사용자의 모든 대출 조회
- `isLiquidatable(loanId)` - 청산 가능 여부
- `getContractETHBalance()` - 컨트랙트 ETH 잔액

### 관리자
- `setPlatformFee(bps)` - 수수료율 설정
- `withdrawTokenFees(token)` - ERC20 수수료 인출
- `withdrawETHFees()` - ETH 수수료 인출

---

## ⚠️ 중요 사항

### 1. Approve 필수
ERC20 담보를 사용할 때는 **반드시 먼저 approve** 해야 합니다:
```typescript
await tokenContract.approve(loanContractAddress, amount);
```

### 2. Native ETH는 address(0)
컨트랙트 내부에서 Native ETH는 `address(0)`으로 표시됩니다.

### 3. 담보 안전성
- ETH 담보: 컨트랙트가 직접 보관
- ERC20 담보: `transferFrom()`으로 안전하게 전송

### 4. 청산 조건
- **오직 기한 만료**만 체크
- 담보 가치 하락은 청산 조건이 아님
- 누구나 청산 실행 가능

---

## 🎨 프론트엔드 통합 예시

```typescript
// 1. ETH 담보 대출 요청
const requestETHLoan = async () => {
  const tx = await loanContract.requestLoanWithETH(
    loanId,
    usdtAddress,
    loanAmount,
    repayAmount,
    dueTimestamp,
    { value: ethers.parseEther("1") }  // 1 ETH 전송
  );
  await tx.wait();
};

// 2. WETH 담보 대출 요청
const requestWETHLoan = async () => {
  // Step 1: Approve
  const approveTx = await wethContract.approve(
    loanContractAddress,
    collateralAmount
  );
  await approveTx.wait();

  // Step 2: Request
  const tx = await loanContract.requestLoanWithToken(
    loanId,
    usdtAddress,
    loanAmount,
    repayAmount,
    wethAddress,
    collateralAmount,
    dueTimestamp
  );
  await tx.wait();
};

// 3. 대출 정보 조회
const loan = await loanContract.getLoan(loanId);
console.log("담보 타입:", loan.collateralType === 0 ? "ETH" : "ERC20");
console.log("담보 수량:", ethers.formatEther(loan.collateralAmount));
```

---

## 📦 배포

```bash
# 로컬 네트워크에 배포
npx hardhat run scripts/deploy-token.ts --network localhost

# 테스트넷 배포 (예: Sepolia)
npx hardhat run scripts/deploy-token.ts --network sepolia
```

배포 후 주소를 `.env`에 저장:
```env
LOAN_TOKEN_CONTRACT_ADDRESS=0x...
USDT_CONTRACT_ADDRESS=0x...
WETH_CONTRACT_ADDRESS=0x...
USDC_CONTRACT_ADDRESS=0x...
```

---

## 🔐 보안

- ✅ ReentrancyGuard 적용
- ✅ Ownable 권한 관리
- ✅ 상태 검증 (modifier)
- ✅ OpenZeppelin 라이브러리 사용
- ⚠️ 메인넷 배포 전 전문 감사 필수

---

## 📚 더 알아보기

- [PawnableLoan.sol](contracts/PawnableLoan.sol) - NFT 담보 버전
- [PawnableLoanToken.sol](contracts/PawnableLoanToken.sol) - 토큰 담보 버전
- [README.md](README.md) - 메인 문서
