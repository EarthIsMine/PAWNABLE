// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PawnableLoan
/// @notice 담보 기반 P2P 대출 컨트랙트 (가격 청산 없음, 시간 기반 청산)
/// @dev 차입자가 온체인에 직접 대출 요청 생성, 대출자가 자금 제공
contract PawnableLoan is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ========================
    // Constants
    // ========================

    address public constant NATIVE_TOKEN = address(0);

    // ========================
    // Types
    // ========================

    enum RequestStatus {
        OPEN,
        FUNDED,
        CANCELLED
    }

    enum LoanStatus {
        ONGOING,
        REPAID,
        CLAIMED
    }

    struct LoanRequest {
        address borrower;
        address collateralToken;
        uint256 collateralAmount;
        address principalToken;
        uint256 principalAmount;
        uint256 interestBps;
        uint256 duration;
        RequestStatus status;
    }

    struct Loan {
        uint256 requestId;
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

    uint256 public nextRequestId;
    uint256 public nextLoanId;
    mapping(uint256 => LoanRequest) public loanRequests;
    mapping(uint256 => Loan) public loans;

    // ========================
    // Events
    // ========================

    event LoanRequestCreated(
        uint256 indexed requestId,
        address indexed borrower,
        address collateralToken,
        uint256 collateralAmount,
        address principalToken,
        uint256 principalAmount,
        uint256 interestBps,
        uint256 duration
    );

    event LoanRequestCancelled(uint256 indexed requestId, address indexed borrower);

    event LoanFunded(
        uint256 indexed loanId,
        uint256 indexed requestId,
        address indexed lender,
        address borrower,
        uint256 startTimestamp,
        uint256 dueTimestamp
    );

    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 repayAmount);
    event CollateralClaimed(uint256 indexed loanId, address indexed lender, uint256 collateralAmount);

    // ========================
    // 대출 요청 생성 (Borrower 호출)
    // ========================

    /// @notice 담보를 lock하고 대출 요청 생성
    function createLoanRequest(
        address collateralToken,
        uint256 collateralAmount,
        address principalToken,
        uint256 principalAmount,
        uint256 interestBps,
        uint256 duration
    ) external payable nonReentrant returns (uint256 requestId) {
        require(collateralAmount > 0, "Zero collateral");
        require(principalAmount > 0, "Zero principal");
        require(duration > 0, "Zero duration");

        // 담보 lock
        if (collateralToken == NATIVE_TOKEN) {
            require(msg.value == collateralAmount, "Incorrect ETH amount");
        } else {
            require(msg.value == 0, "ETH sent for ERC20 collateral");
            IERC20(collateralToken).safeTransferFrom(msg.sender, address(this), collateralAmount);
        }

        requestId = nextRequestId++;
        loanRequests[requestId] = LoanRequest({
            borrower: msg.sender,
            collateralToken: collateralToken,
            collateralAmount: collateralAmount,
            principalToken: principalToken,
            principalAmount: principalAmount,
            interestBps: interestBps,
            duration: duration,
            status: RequestStatus.OPEN
        });

        emit LoanRequestCreated(
            requestId,
            msg.sender,
            collateralToken,
            collateralAmount,
            principalToken,
            principalAmount,
            interestBps,
            duration
        );
    }

    // ========================
    // 대출 요청 취소 (Borrower 호출)
    // ========================

    /// @notice OPEN 상태의 요청 취소, 담보 반환
    function cancelLoanRequest(uint256 requestId) external nonReentrant {
        LoanRequest storage req = loanRequests[requestId];
        require(req.borrower == msg.sender, "Not borrower");
        require(req.status == RequestStatus.OPEN, "Not open");

        req.status = RequestStatus.CANCELLED;

        // 담보 반환
        if (req.collateralToken == NATIVE_TOKEN) {
            (bool success,) = msg.sender.call{value: req.collateralAmount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(req.collateralToken).safeTransfer(msg.sender, req.collateralAmount);
        }

        emit LoanRequestCancelled(requestId, msg.sender);
    }

    // ========================
    // 자금 제공 (Lender 호출)
    // ========================

    /// @notice 원금을 borrower에게 전송하고 대출 생성
    function fundLoan(uint256 requestId) external payable nonReentrant returns (uint256 loanId) {
        LoanRequest storage req = loanRequests[requestId];
        require(req.status == RequestStatus.OPEN, "Not open");
        require(msg.sender != req.borrower, "Cannot self-fund");

        req.status = RequestStatus.FUNDED;

        // 원금 → borrower
        if (req.principalToken == NATIVE_TOKEN) {
            require(msg.value == req.principalAmount, "Incorrect ETH amount");
            (bool success,) = req.borrower.call{value: req.principalAmount}("");
            require(success, "ETH transfer failed");
        } else {
            require(msg.value == 0, "ETH sent for ERC20 principal");
            IERC20(req.principalToken).safeTransferFrom(msg.sender, req.borrower, req.principalAmount);
        }

        // Loan 생성
        loanId = nextLoanId++;
        uint256 dueTimestamp = block.timestamp + req.duration;
        loans[loanId] = Loan({
            requestId: requestId,
            borrower: req.borrower,
            lender: msg.sender,
            collateralToken: req.collateralToken,
            collateralAmount: req.collateralAmount,
            principalToken: req.principalToken,
            principalAmount: req.principalAmount,
            interestBps: req.interestBps,
            startTimestamp: block.timestamp,
            dueTimestamp: dueTimestamp,
            status: LoanStatus.ONGOING
        });

        emit LoanFunded(loanId, requestId, msg.sender, req.borrower, block.timestamp, dueTimestamp);
    }

    // ========================
    // 상환 (기한 내)
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
    // 담보 청산 (기한 초과)
    // ========================

    /// @notice 기한 초과 + 미상환 → 담보를 lender에게 전달 (누구나 호출 가능)
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

    function getLoanRequest(uint256 requestId) external view returns (LoanRequest memory) {
        return loanRequests[requestId];
    }

    function getLoan(uint256 loanId) external view returns (Loan memory) {
        return loans[loanId];
    }

    function getRepayAmount(uint256 loanId) external view returns (uint256) {
        Loan storage loan = loans[loanId];
        return loan.principalAmount + (loan.principalAmount * loan.interestBps / 10000);
    }
}
