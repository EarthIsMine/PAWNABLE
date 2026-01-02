// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PawnableLoan
 * @dev P2P 담보 대출 플랫폼의 핵심 컨트랙트
 * @notice NFT를 담보로 ERC20 토큰(USDT 등)을 빌리고 빌려주는 시스템
 *
 * 핵심 특징:
 * 1. 차입자가 원하는 금리를 직접 제시
 * 2. 대출자와 1:1 P2P 매칭
 * 3. 기한 내 상환 시 담보 반환, 미상환 시 대출자가 담보 획득
 * 4. 가격 하락으로 인한 자동 청산 없음 (기한 기반)
 */
contract PawnableLoan is Ownable, ReentrancyGuard {

    // ==================== 상태 변수 ====================

    /**
     * @dev 대출 상태를 나타내는 열거형
     * PENDING: 대출 요청 대기 중 (매칭 전)
     * ACTIVE: 대출 활성화됨 (매칭 완료, 상환 대기 중)
     * REPAID: 상환 완료
     * LIQUIDATED: 청산됨 (기한 초과로 담보 넘어감)
     * CANCELLED: 취소됨
     */
    enum LoanStatus {
        PENDING,
        ACTIVE,
        REPAID,
        LIQUIDATED,
        CANCELLED
    }

    /**
     * @dev 대출 정보 구조체
     */
    struct Loan {
        string loanId;              // 오프체인 DB와 매칭되는 대출 ID
        address borrower;           // 차입자 주소
        address lender;             // 대출자 주소 (매칭 전에는 address(0))
        address loanToken;          // 대출 토큰 주소 (예: USDT)
        uint256 loanAmount;         // 대출 금액
        uint256 repayAmount;        // 상환 금액 (원금 + 이자)
        address collateralNFT;      // 담보 NFT 컨트랙트 주소
        uint256[] collateralTokenIds; // 담보 NFT 토큰 ID 배열
        uint256 dueTimestamp;       // 상환 기한 (Unix timestamp)
        LoanStatus status;          // 대출 상태
        uint256 createdAt;          // 생성 시각
        uint256 matchedAt;          // 매칭 시각
        uint256 closedAt;           // 종료 시각 (상환 또는 청산)
    }

    // 대출 ID => 대출 정보 매핑
    mapping(string => Loan) public loans;

    // 사용자 주소 => 사용자가 생성한 대출 ID 배열
    mapping(address => string[]) public userLoans;

    // 플랫폼 수수료율 (basis points, 10 = 0.1%)
    uint256 public platformFeeBps = 10; // 0.1%

    // 플랫폼이 수집한 수수료 (토큰 주소 => 금액)
    mapping(address => uint256) public collectedFees;

    // 최소 대출 금액 (1 USDT, 6 decimals 가정)
    uint256 public constant MIN_LOAN_AMOUNT = 1e6;

    // 최소 대출 기간 (1일)
    uint256 public constant MIN_LOAN_DURATION = 1 days;

    // ==================== 이벤트 ====================

    /**
     * @dev 대출 요청이 생성되었을 때 발생
     */
    event LoanRequested(
        string indexed loanId,
        address indexed borrower,
        address loanToken,
        uint256 loanAmount,
        uint256 repayAmount,
        uint256 dueTimestamp
    );

    /**
     * @dev 대출이 매칭되어 활성화되었을 때 발생
     */
    event LoanMatched(
        string indexed loanId,
        address indexed borrower,
        address indexed lender,
        uint256 loanAmount
    );

    /**
     * @dev 대출이 상환되었을 때 발생
     */
    event LoanRepaid(
        string indexed loanId,
        address indexed borrower,
        uint256 repayAmount
    );

    /**
     * @dev 대출이 청산되었을 때 발생
     */
    event LoanLiquidated(
        string indexed loanId,
        address indexed lender,
        uint256 collateralCount
    );

    /**
     * @dev 대출 요청이 취소되었을 때 발생
     */
    event LoanCancelled(
        string indexed loanId,
        address indexed borrower
    );

    /**
     * @dev 플랫폼 수수료가 수집되었을 때 발생
     */
    event FeeCollected(
        address indexed token,
        uint256 amount
    );

    // ==================== 생성자 ====================

    constructor() Ownable(msg.sender) {}

    // ==================== 수정자 ====================

    /**
     * @dev 대출 상태가 특정 상태인지 확인
     */
    modifier onlyStatus(string memory loanId, LoanStatus expectedStatus) {
        require(
            loans[loanId].status == expectedStatus,
            "Invalid loan status"
        );
        _;
    }

    /**
     * @dev 호출자가 차입자인지 확인
     */
    modifier onlyBorrower(string memory loanId) {
        require(
            loans[loanId].borrower == msg.sender,
            "Only borrower can call this"
        );
        _;
    }

    // ==================== 외부 함수 ====================

    /**
     * @notice 새로운 대출 요청을 생성합니다
     * @dev 차입자가 담보 NFT를 이 컨트랙트에 approve 해야 함
     * @param loanId 오프체인 DB의 대출 ID
     * @param loanToken 빌리고자 하는 토큰 주소 (USDT 등)
     * @param loanAmount 빌리고자 하는 금액
     * @param repayAmount 상환할 금액 (원금 + 이자)
     * @param collateralNFT 담보로 제공할 NFT 컨트랙트 주소
     * @param collateralTokenIds 담보로 제공할 NFT 토큰 ID 배열
     * @param dueTimestamp 상환 기한 (Unix timestamp)
     */
    function requestLoan(
        string memory loanId,
        address loanToken,
        uint256 loanAmount,
        uint256 repayAmount,
        address collateralNFT,
        uint256[] memory collateralTokenIds,
        uint256 dueTimestamp
    ) external nonReentrant {
        // 유효성 검증
        require(bytes(loanId).length > 0, "Invalid loan ID");
        require(loans[loanId].borrower == address(0), "Loan ID already exists");
        require(loanAmount >= MIN_LOAN_AMOUNT, "Loan amount too small");
        require(repayAmount > loanAmount, "Repay amount must be greater than loan amount");
        require(collateralTokenIds.length > 0, "No collateral provided");
        require(dueTimestamp > block.timestamp + MIN_LOAN_DURATION, "Due timestamp too soon");

        // 담보 NFT를 컨트랙트로 전송
        IERC721 nftContract = IERC721(collateralNFT);
        for (uint256 i = 0; i < collateralTokenIds.length; i++) {
            require(
                nftContract.ownerOf(collateralTokenIds[i]) == msg.sender,
                "Not owner of NFT"
            );
            nftContract.transferFrom(msg.sender, address(this), collateralTokenIds[i]);
        }

        // 대출 정보 저장
        loans[loanId] = Loan({
            loanId: loanId,
            borrower: msg.sender,
            lender: address(0),
            loanToken: loanToken,
            loanAmount: loanAmount,
            repayAmount: repayAmount,
            collateralNFT: collateralNFT,
            collateralTokenIds: collateralTokenIds,
            dueTimestamp: dueTimestamp,
            status: LoanStatus.PENDING,
            createdAt: block.timestamp,
            matchedAt: 0,
            closedAt: 0
        });

        userLoans[msg.sender].push(loanId);

        emit LoanRequested(
            loanId,
            msg.sender,
            loanToken,
            loanAmount,
            repayAmount,
            dueTimestamp
        );
    }

    /**
     * @notice 대출 요청을 취소하고 담보를 반환받습니다
     * @dev 매칭 전(PENDING 상태)에만 취소 가능
     * @param loanId 취소할 대출 ID
     */
    function cancelLoan(string memory loanId)
        external
        nonReentrant
        onlyBorrower(loanId)
        onlyStatus(loanId, LoanStatus.PENDING)
    {
        Loan storage loan = loans[loanId];
        loan.status = LoanStatus.CANCELLED;
        loan.closedAt = block.timestamp;

        // 담보 NFT 반환
        IERC721 nftContract = IERC721(loan.collateralNFT);
        for (uint256 i = 0; i < loan.collateralTokenIds.length; i++) {
            nftContract.transferFrom(
                address(this),
                loan.borrower,
                loan.collateralTokenIds[i]
            );
        }

        emit LoanCancelled(loanId, msg.sender);
    }

    /**
     * @notice 대출 요청에 매칭하여 대출을 실행합니다
     * @dev 대출자가 대출 토큰을 이 컨트랙트에 approve 해야 함
     * @param loanId 매칭할 대출 ID
     */
    function matchLoan(string memory loanId)
        external
        nonReentrant
        onlyStatus(loanId, LoanStatus.PENDING)
    {
        Loan storage loan = loans[loanId];

        // 대출 토큰 전송 (대출자 → 차입자)
        IERC20 token = IERC20(loan.loanToken);

        // 플랫폼 수수료 계산 (선 수수료)
        uint256 fee = (loan.loanAmount * platformFeeBps) / 10000;
        uint256 amountAfterFee = loan.loanAmount - fee;

        // 대출자로부터 토큰 받기
        require(
            token.transferFrom(msg.sender, address(this), loan.loanAmount),
            "Token transfer failed"
        );

        // 수수료 저장
        if (fee > 0) {
            collectedFees[loan.loanToken] += fee;
            emit FeeCollected(loan.loanToken, fee);
        }

        // 차입자에게 대출금 전송
        require(
            token.transfer(loan.borrower, amountAfterFee),
            "Token transfer to borrower failed"
        );

        // 대출 상태 업데이트
        loan.lender = msg.sender;
        loan.status = LoanStatus.ACTIVE;
        loan.matchedAt = block.timestamp;

        userLoans[msg.sender].push(loanId);

        emit LoanMatched(loanId, loan.borrower, msg.sender, loan.loanAmount);
    }

    /**
     * @notice 대출을 상환하고 담보를 돌려받습니다
     * @dev 차입자가 상환 토큰을 이 컨트랙트에 approve 해야 함
     * @param loanId 상환할 대출 ID
     */
    function repayLoan(string memory loanId)
        external
        nonReentrant
        onlyBorrower(loanId)
        onlyStatus(loanId, LoanStatus.ACTIVE)
    {
        Loan storage loan = loans[loanId];

        // 상환 토큰 전송 (차입자 → 대출자)
        IERC20 token = IERC20(loan.loanToken);

        // 플랫폼 수수료 계산 (후 수수료)
        uint256 fee = (loan.repayAmount * platformFeeBps) / 10000;
        uint256 amountToLender = loan.repayAmount - fee;

        // 차입자로부터 상환금 받기
        require(
            token.transferFrom(msg.sender, address(this), loan.repayAmount),
            "Repayment failed"
        );

        // 수수료 저장
        if (fee > 0) {
            collectedFees[loan.loanToken] += fee;
            emit FeeCollected(loan.loanToken, fee);
        }

        // 대출자에게 상환금 전송
        require(
            token.transfer(loan.lender, amountToLender),
            "Transfer to lender failed"
        );

        // 담보 NFT 반환
        IERC721 nftContract = IERC721(loan.collateralNFT);
        for (uint256 i = 0; i < loan.collateralTokenIds.length; i++) {
            nftContract.transferFrom(
                address(this),
                loan.borrower,
                loan.collateralTokenIds[i]
            );
        }

        // 대출 상태 업데이트
        loan.status = LoanStatus.REPAID;
        loan.closedAt = block.timestamp;

        emit LoanRepaid(loanId, msg.sender, loan.repayAmount);
    }

    /**
     * @notice 기한이 지난 대출을 청산하고 담보를 가져갑니다
     * @dev 누구나 호출 가능하지만, 담보는 대출자에게 전송됨
     * @param loanId 청산할 대출 ID
     */
    function liquidateLoan(string memory loanId)
        external
        nonReentrant
        onlyStatus(loanId, LoanStatus.ACTIVE)
    {
        Loan storage loan = loans[loanId];

        // 기한이 지났는지 확인
        require(block.timestamp > loan.dueTimestamp, "Loan not overdue yet");

        // 담보 NFT를 대출자에게 전송
        IERC721 nftContract = IERC721(loan.collateralNFT);
        for (uint256 i = 0; i < loan.collateralTokenIds.length; i++) {
            nftContract.transferFrom(
                address(this),
                loan.lender,
                loan.collateralTokenIds[i]
            );
        }

        // 대출 상태 업데이트
        loan.status = LoanStatus.LIQUIDATED;
        loan.closedAt = block.timestamp;

        emit LoanLiquidated(loanId, loan.lender, loan.collateralTokenIds.length);
    }

    // ==================== 뷰 함수 ====================

    /**
     * @notice 특정 대출의 상세 정보를 조회합니다
     * @param loanId 조회할 대출 ID
     * @return 대출 정보
     */
    function getLoan(string memory loanId) external view returns (Loan memory) {
        return loans[loanId];
    }

    /**
     * @notice 특정 사용자가 관련된 모든 대출 ID를 조회합니다
     * @param user 사용자 주소
     * @return 대출 ID 배열
     */
    function getUserLoans(address user) external view returns (string[] memory) {
        return userLoans[user];
    }

    /**
     * @notice 대출이 청산 가능한 상태인지 확인합니다
     * @param loanId 확인할 대출 ID
     * @return 청산 가능 여부
     */
    function isLiquidatable(string memory loanId) external view returns (bool) {
        Loan memory loan = loans[loanId];
        return loan.status == LoanStatus.ACTIVE && block.timestamp > loan.dueTimestamp;
    }

    // ==================== 관리자 함수 ====================

    /**
     * @notice 플랫폼 수수료율을 변경합니다
     * @dev 소유자만 호출 가능
     * @param newFeeBps 새로운 수수료율 (basis points)
     */
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 100, "Fee too high"); // 최대 1%
        platformFeeBps = newFeeBps;
    }

    /**
     * @notice 수집된 수수료를 인출합니다
     * @dev 소유자만 호출 가능
     * @param token 인출할 토큰 주소
     */
    function withdrawFees(address token) external onlyOwner {
        uint256 amount = collectedFees[token];
        require(amount > 0, "No fees to withdraw");

        collectedFees[token] = 0;
        IERC20(token).transfer(owner(), amount);
    }
}
