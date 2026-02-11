// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title PawnableLoan
/// @notice 담보 기반 P2P 대출 컨트랙트 (가격 청산 없음, 시간 기반 청산)
/// @dev EIP-712 서명으로 차입자 의사 표현, 대출자가 executeLoan 호출로 실행
contract PawnableLoan is EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ========================
    // Constants
    // ========================

    address public constant NATIVE_TOKEN = address(0);

    bytes32 public constant LOAN_INTENT_TYPEHASH = keccak256(
        "LoanIntent(address borrower,address collateralToken,uint256 collateralAmount,address principalToken,uint256 principalAmount,uint256 interestBps,uint256 durationSeconds,uint256 nonce,uint256 deadline)"
    );

    // ========================
    // Types
    // ========================

    enum LoanStatus {
        ONGOING,
        REPAID,
        CLAIMED
    }

    struct Loan {
        address borrower;
        address lender;
        address collateralToken;
        uint256 collateralAmount;
        address principalToken;
        uint256 principalAmount;
        uint256 interestBps;
        uint256 startTimestamp;
        uint256 dueTimestamp;
        LoanStatus status;
    }

    // ========================
    // State
    // ========================

    uint256 public nextLoanId;
    mapping(uint256 => Loan) public loans;
    mapping(address => uint256) public nonces;
    mapping(bytes32 => bool) public usedIntentHashes;

    /// @notice ETH 예치금 (native 담보용)
    mapping(address => uint256) public ethDeposits;

    // ========================
    // Events
    // ========================

    event LoanExecuted(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed lender,
        address collateralToken,
        uint256 collateralAmount,
        address principalToken,
        uint256 principalAmount,
        uint256 interestBps,
        uint256 startTimestamp,
        uint256 dueTimestamp
    );

    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 repayAmount);
    event CollateralClaimed(uint256 indexed loanId, address indexed lender, uint256 collateralAmount);
    event NonceIncremented(address indexed borrower, uint256 newNonce);
    event EthDeposited(address indexed user, uint256 amount);
    event EthWithdrawn(address indexed user, uint256 amount);

    // ========================
    // Constructor
    // ========================

    constructor() EIP712("PawnableLoan", "1") {}

    // ========================
    // ETH 예치 (native 담보용)
    // ========================

    /// @notice ETH를 예치하여 native 담보로 사용 가능하게 함
    function depositEth() external payable {
        require(msg.value > 0, "Zero deposit");
        ethDeposits[msg.sender] += msg.value;
        emit EthDeposited(msg.sender, msg.value);
    }

    /// @notice 미사용 ETH 예치금 인출
    function withdrawEth(uint256 amount) external nonReentrant {
        require(ethDeposits[msg.sender] >= amount, "Insufficient deposit");
        ethDeposits[msg.sender] -= amount;
        (bool success,) = msg.sender.call{value: amount}("");
        require(success, "ETH transfer failed");
        emit EthWithdrawn(msg.sender, amount);
    }

    // ========================
    // Nonce 관리
    // ========================

    /// @notice nonce 증가로 기존 미실행 intent 전부 무효화
    function incrementNonce() external {
        nonces[msg.sender]++;
        emit NonceIncremented(msg.sender, nonces[msg.sender]);
    }

    // ========================
    // 대출 실행 (Lender 호출)
    // ========================

    /// @notice EIP-712 서명된 intent를 실행하여 대출 생성
    /// @dev lender가 호출. 담보 lock + 원금 이동 + loan 생성
    function executeLoan(
        address borrower,
        address collateralToken,
        uint256 collateralAmount,
        address principalToken,
        uint256 principalAmount,
        uint256 interestBps,
        uint256 durationSeconds,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external payable nonReentrant returns (uint256 loanId) {
        // 1. deadline 검증
        require(block.timestamp <= deadline, "Intent expired");

        // 2. nonce 검증
        require(nonce == nonces[borrower], "Invalid nonce");

        // 3. EIP-712 서명 검증
        bytes32 structHash = keccak256(
            abi.encode(
                LOAN_INTENT_TYPEHASH,
                borrower,
                collateralToken,
                collateralAmount,
                principalToken,
                principalAmount,
                interestBps,
                durationSeconds,
                nonce,
                deadline
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        require(!usedIntentHashes[hash], "Intent already used");

        address signer = ECDSA.recover(hash, signature);
        require(signer == borrower, "Invalid signature");

        // 4. intent 사용 처리
        usedIntentHashes[hash] = true;
        nonces[borrower]++;

        // 5. 담보 lock
        if (collateralToken == NATIVE_TOKEN) {
            require(ethDeposits[borrower] >= collateralAmount, "Insufficient ETH deposit");
            ethDeposits[borrower] -= collateralAmount;
        } else {
            IERC20(collateralToken).safeTransferFrom(borrower, address(this), collateralAmount);
        }

        // 6. 원금을 borrower에게 전달
        if (principalToken == NATIVE_TOKEN) {
            require(msg.value >= principalAmount, "Insufficient ETH sent");
            (bool success,) = borrower.call{value: principalAmount}("");
            require(success, "ETH transfer to borrower failed");
            // 잔돈 반환
            if (msg.value > principalAmount) {
                (bool refundSuccess,) = msg.sender.call{value: msg.value - principalAmount}("");
                require(refundSuccess, "ETH refund failed");
            }
        } else {
            IERC20(principalToken).safeTransferFrom(msg.sender, borrower, principalAmount);
        }

        // 7. Loan 생성
        loanId = nextLoanId++;
        loans[loanId] = Loan({
            borrower: borrower,
            lender: msg.sender,
            collateralToken: collateralToken,
            collateralAmount: collateralAmount,
            principalToken: principalToken,
            principalAmount: principalAmount,
            interestBps: interestBps,
            startTimestamp: block.timestamp,
            dueTimestamp: block.timestamp + durationSeconds,
            status: LoanStatus.ONGOING
        });

        emit LoanExecuted(
            loanId,
            borrower,
            msg.sender,
            collateralToken,
            collateralAmount,
            principalToken,
            principalAmount,
            interestBps,
            block.timestamp,
            block.timestamp + durationSeconds
        );
    }

    // ========================
    // 상환 (누구나 호출 가능, 보통 Borrower)
    // ========================

    /// @notice 기한 내 상환 → 원금+이자 lender에게, 담보 borrower에게 반환
    function repayLoan(uint256 loanId) external payable nonReentrant {
        Loan storage loan = loans[loanId];
        require(loan.status == LoanStatus.ONGOING, "Loan not ongoing");
        require(block.timestamp <= loan.dueTimestamp, "Loan overdue");

        uint256 interest = loan.principalAmount * loan.interestBps / 10000;
        uint256 repayAmount = loan.principalAmount + interest;

        // 원금+이자 → lender
        if (loan.principalToken == NATIVE_TOKEN) {
            require(msg.value >= repayAmount, "Insufficient ETH");
            (bool success,) = loan.lender.call{value: repayAmount}("");
            require(success, "ETH transfer failed");
            if (msg.value > repayAmount) {
                (bool refundSuccess,) = msg.sender.call{value: msg.value - repayAmount}("");
                require(refundSuccess, "ETH refund failed");
            }
        } else {
            IERC20(loan.principalToken).safeTransferFrom(msg.sender, loan.lender, repayAmount);
        }

        // 담보 → borrower
        if (loan.collateralToken == NATIVE_TOKEN) {
            (bool success,) = loan.borrower.call{value: loan.collateralAmount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(loan.collateralToken).safeTransfer(loan.borrower, loan.collateralAmount);
        }

        loan.status = LoanStatus.REPAID;
        emit LoanRepaid(loanId, loan.borrower, repayAmount);
    }

    // ========================
    // 담보 청산 (누구나 호출 가능, 봇이 대신 호출)
    // ========================

    /// @notice 기한 초과 + 미상환 → 담보를 lender에게 전달
    function claimCollateral(uint256 loanId) external nonReentrant {
        Loan storage loan = loans[loanId];
        require(loan.status == LoanStatus.ONGOING, "Loan not ongoing");
        require(block.timestamp > loan.dueTimestamp, "Loan not overdue");

        // 담보 → lender
        if (loan.collateralToken == NATIVE_TOKEN) {
            (bool success,) = loan.lender.call{value: loan.collateralAmount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(loan.collateralToken).safeTransfer(loan.lender, loan.collateralAmount);
        }

        loan.status = LoanStatus.CLAIMED;
        emit CollateralClaimed(loanId, loan.lender, loan.collateralAmount);
    }

    // ========================
    // View
    // ========================

    function getLoan(uint256 loanId) external view returns (Loan memory) {
        return loans[loanId];
    }

    function getRepayAmount(uint256 loanId) external view returns (uint256) {
        Loan storage loan = loans[loanId];
        return loan.principalAmount + (loan.principalAmount * loan.interestBps / 10000);
    }

    function getIntentHash(
        address borrower,
        address collateralToken,
        uint256 collateralAmount,
        address principalToken,
        uint256 principalAmount,
        uint256 interestBps,
        uint256 durationSeconds,
        uint256 nonce,
        uint256 deadline
    ) external view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    LOAN_INTENT_TYPEHASH,
                    borrower,
                    collateralToken,
                    collateralAmount,
                    principalToken,
                    principalAmount,
                    interestBps,
                    durationSeconds,
                    nonce,
                    deadline
                )
            )
        );
    }

    // ========================
    // Receive
    // ========================

    /// @notice 직접 ETH 전송 시 자동 예치
    receive() external payable {
        ethDeposits[msg.sender] += msg.value;
        emit EthDeposited(msg.sender, msg.value);
    }
}
