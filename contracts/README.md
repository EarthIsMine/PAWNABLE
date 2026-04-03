# PAWNABLE Contracts

PAWNABLE의 온체인 담보 대출 로직을 담당하는 Foundry 스마트 컨트랙트 프로젝트입니다.

이 컨트랙트는 **가격 오라클 없이, 만기 시간만 기준으로 청산 여부를 판단하는 P2P 담보 대출**을 제공합니다.

## 기술 스택

- **Language**: Solidity 0.8.24
- **Framework**: Foundry
- **Libraries**: OpenZeppelin `ReentrancyGuard`, `SafeERC20`
- **Network**: WorldLand Mainnet

---

## 설치 및 준비

### 1. Foundry 설치

Foundry가 없다면 먼저 설치합니다.

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. 의존성 확인

컨트랙트 의존성은 `contracts/lib/` 아래에 위치합니다.

```bash
cd contracts
forge install
```

이미 `lib/`가 준비되어 있다면 바로 빌드/테스트를 실행하면 됩니다.

### 3. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 예시:

```env
WORLDLAND_RPC_URL=https://seoul.worldland.foundation
PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=
```

---

## 빌드 / 테스트

```bash
cd contracts
forge build
forge test
```

가스 리포트를 보고 싶다면:

```bash
forge test --gas-report
```

---

## 배포

배포 스크립트는 `script/Deploy.s.sol` 입니다.

```bash
cd contracts
source .env

forge script script/Deploy.s.sol:DeployScript \
  --rpc-url "$WORLDLAND_RPC_URL" \
  --broadcast
```

### 배포 결과

`PawnableLoan` 컨트랙트가 배포되며, 생성자 인자로 들어가는 `feeRecipient`는 배포자 주소로 설정됩니다.

배포 후 출력되는 컨트랙트 주소를 백엔드/프론트엔드 환경 변수에 반영해야 합니다.

- backend: `LOAN_CONTRACT_ADDRESS`
- frontend: `NEXT_PUBLIC_LOAN_CONTRACT_ADDRESS`

---

## 컨트랙트 구조

```text
contracts/
├── src/
│   └── PawnableLoan.sol      # 핵심 대출 컨트랙트
├── script/
│   └── Deploy.s.sol          # 배포 스크립트
├── test/
│   └── PawnableLoan.t.sol    # Foundry 테스트
├── foundry.toml              # Foundry 설정
├── remappings.txt            # import remapping
├── FRONTEND_GUIDE.md         # 프론트엔드 연동 가이드
└── README.md
```

---

## 핵심 컨트랙트: `PawnableLoan`

### 주요 상수/상태

| 항목 | 설명 |
|------|------|
| `NATIVE_TOKEN` | 네이티브 토큰(WLC)을 의미하는 `address(0)` |
| `FEE_BPS` | 상환 시 플랫폼 수수료. 현재 `10` = `0.1%` |
| `feeRecipient` | 수수료 수령 주소. 배포 시 생성자에서 설정 |
| `nextRequestId` | 다음 대출 요청 ID |
| `nextLoanId` | 다음 대출 ID |
| `loanRequests` | `requestId => LoanRequest` 저장소 |
| `loans` | `loanId => Loan` 저장소 |

### 대출 요청 상태

| Status | 의미 |
|--------|------|
| `OPEN` | 차입자가 담보를 예치하고 요청을 올린 상태 |
| `FUNDED` | 대여자가 자금을 제공해서 대출이 성립된 상태 |
| `CANCELLED` | 차입자가 요청을 취소하고 담보를 회수한 상태 |

### 대출 상태

| Status | 의미 |
|--------|------|
| `ONGOING` | 대출 진행 중 |
| `REPAID` | 만기 전 상환 완료 |
| `CLAIMED` | 만기 초과 후 담보 청산 완료 |

---

## 주요 함수

| 함수 | 호출자 | 설명 |
|------|--------|------|
| `createLoanRequest(...)` | Borrower | 담보를 컨트랙트에 예치하고 대출 요청 생성 |
| `cancelLoanRequest(requestId)` | Borrower | `OPEN` 상태 요청 취소 및 담보 반환 |
| `fundLoan(requestId)` | Lender | 원금을 차입자에게 전송하고 Loan 생성 |
| `repayLoan(loanId)` | Borrower | 만기 전 원금+이자 상환, 담보 반환 |
| `claimCollateral(loanId)` | 누구나 | 만기 초과 + 미상환 대출의 담보를 lender에게 이전 |
| `getLoanRequest(requestId)` | 누구나 | 대출 요청 상세 조회 |
| `getLoan(loanId)` | 누구나 | 대출 상세 조회 |
| `getRepayAmount(loanId)` | 누구나 | 원금+이자 총 상환액 조회 |

---

## 동작 흐름

```text
Borrower
  └─ createLoanRequest()
       └─ 담보가 컨트랙트에 lock
       └─ LoanRequest 상태: OPEN

Lender
  └─ fundLoan(requestId)
       └─ 원금이 Borrower에게 전송
       └─ LoanRequest 상태: FUNDED
       └─ Loan 상태: ONGOING
       └─ dueTimestamp = block.timestamp + duration

Borrower
  └─ repayLoan(loanId)  [block.timestamp <= dueTimestamp]
       └─ 원금+이자-수수료가 Lender에게 전송
       └─ 수수료가 feeRecipient에게 전송
       └─ 담보가 Borrower에게 반환
       └─ Loan 상태: REPAID

Anyone
  └─ claimCollateral(loanId)  [block.timestamp > dueTimestamp]
       └─ 담보가 Lender에게 이전
       └─ Loan 상태: CLAIMED
```

---

## 이벤트

| 이벤트 | 설명 |
|--------|------|
| `LoanRequestCreated` | 대출 요청 생성 |
| `LoanRequestCancelled` | 대출 요청 취소 |
| `LoanFunded` | 대출 성립 및 Loan 생성 |
| `LoanRepaid` | 상환 완료 |
| `CollateralClaimed` | 담보 청산 완료 |

백엔드 인덱서는 이 이벤트들을 읽어 DB 캐시를 갱신합니다.

---

## 보안/제약 사항

- `nonReentrant`로 상태 변경 함수의 재진입을 방지합니다.
- ERC20 전송은 `SafeERC20`을 사용합니다.
- 차입자는 자기 요청을 스스로 `fundLoan` 할 수 없습니다.
- `repayLoan`은 `block.timestamp <= dueTimestamp`일 때만 가능합니다.
- `claimCollateral`은 `block.timestamp > dueTimestamp`이고 `ONGOING` 상태일 때만 가능합니다.
- 가격 오라클을 사용하지 않으므로 **담보 가격 변동에 의한 강제 청산은 없습니다.**

---

## 프론트엔드 연동

프론트엔드에서 직접 컨트랙트를 호출할 때 필요한 ABI/호출 예시는 `FRONTEND_GUIDE.md`에 정리되어 있습니다.

대략적인 호출 순서는 다음과 같습니다.

- 차입자: `createLoanRequest` → 필요 시 `cancelLoanRequest`
- 대여자: `fundLoan`
- 차입자: `repayLoan`
- 대여자 또는 제3자: `claimCollateral`

컨트랙트 주소나 네트워크 설정이 바뀌면 프론트엔드와 백엔드의 환경 변수도 함께 갱신해야 합니다.
