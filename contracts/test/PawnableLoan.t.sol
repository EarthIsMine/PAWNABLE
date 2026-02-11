// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/PawnableLoan.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev 테스트 전용 ERC20
contract TestToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract PawnableLoanTest is Test {
    PawnableLoan public pawn;
    TestToken public usdc;
    TestToken public weth;

    address borrower = makeAddr("borrower");
    address lender = makeAddr("lender");

    function setUp() public {
        pawn = new PawnableLoan();
        usdc = new TestToken("USD Coin", "USDC");
        weth = new TestToken("Wrapped ETH", "WETH");

        // 토큰 발행
        weth.mint(borrower, 10e18);
        usdc.mint(lender, 10_000e6);

        // borrower: weth approve (담보)
        vm.prank(borrower);
        weth.approve(address(pawn), type(uint256).max);

        // lender: usdc approve (원금)
        vm.prank(lender);
        usdc.approve(address(pawn), type(uint256).max);
    }

    // ========================
    // 헬퍼: 기본 대출 요청 생성
    // ========================

    function _createDefaultRequest() internal returns (uint256 requestId) {
        vm.prank(borrower);
        requestId = pawn.createLoanRequest(
            address(weth), 1e18, address(usdc), 1000e6, 500, 7 days
        );
    }

    function _createAndFund() internal returns (uint256 requestId, uint256 loanId) {
        requestId = _createDefaultRequest();
        vm.prank(lender);
        loanId = pawn.fundLoan(requestId);
    }

    // ========================
    // createLoanRequest 테스트
    // ========================

    function test_createLoanRequest_ERC20Collateral() public {
        vm.prank(borrower);
        uint256 requestId = pawn.createLoanRequest(
            address(weth), 1e18, address(usdc), 1000e6, 500, 7 days
        );

        assertEq(requestId, 0);
        assertEq(weth.balanceOf(address(pawn)), 1e18); // 담보 lock
        assertEq(weth.balanceOf(borrower), 9e18); // 10 - 1

        PawnableLoan.LoanRequest memory req = pawn.getLoanRequest(0);
        assertEq(req.borrower, borrower);
        assertEq(req.collateralToken, address(weth));
        assertEq(req.collateralAmount, 1e18);
        assertEq(req.principalToken, address(usdc));
        assertEq(req.principalAmount, 1000e6);
        assertEq(req.interestBps, 500);
        assertEq(req.duration, 7 days);
        assertEq(uint8(req.status), uint8(PawnableLoan.RequestStatus.OPEN));
    }

    function test_createLoanRequest_NativeCollateral() public {
        vm.deal(borrower, 2 ether);
        vm.prank(borrower);
        uint256 requestId = pawn.createLoanRequest{value: 1 ether}(
            address(0), 1 ether, address(usdc), 1000e6, 500, 7 days
        );

        assertEq(requestId, 0);
        assertEq(address(pawn).balance, 1 ether);
        assertEq(borrower.balance, 1 ether);
    }

    function testRevert_createLoanRequest_ZeroCollateral() public {
        vm.prank(borrower);
        vm.expectRevert("Zero collateral");
        pawn.createLoanRequest(address(weth), 0, address(usdc), 1000e6, 500, 7 days);
    }

    function testRevert_createLoanRequest_IncorrectETH() public {
        vm.deal(borrower, 2 ether);
        vm.prank(borrower);
        vm.expectRevert("Incorrect ETH amount");
        pawn.createLoanRequest{value: 0.5 ether}(
            address(0), 1 ether, address(usdc), 1000e6, 500, 7 days
        );
    }

    function testRevert_createLoanRequest_ETHSentForERC20() public {
        vm.deal(borrower, 1 ether);
        vm.prank(borrower);
        vm.expectRevert("ETH sent for ERC20 collateral");
        pawn.createLoanRequest{value: 1 ether}(
            address(weth), 1e18, address(usdc), 1000e6, 500, 7 days
        );
    }

    // ========================
    // cancelLoanRequest 테스트
    // ========================

    function test_cancelLoanRequest() public {
        uint256 requestId = _createDefaultRequest();

        uint256 balBefore = weth.balanceOf(borrower);
        vm.prank(borrower);
        pawn.cancelLoanRequest(requestId);

        PawnableLoan.LoanRequest memory req = pawn.getLoanRequest(requestId);
        assertEq(uint8(req.status), uint8(PawnableLoan.RequestStatus.CANCELLED));
        assertEq(weth.balanceOf(borrower), balBefore + 1e18); // 담보 반환
    }

    function test_cancelLoanRequest_NativeCollateral() public {
        vm.deal(borrower, 2 ether);
        vm.prank(borrower);
        uint256 requestId = pawn.createLoanRequest{value: 1 ether}(
            address(0), 1 ether, address(usdc), 1000e6, 500, 7 days
        );

        uint256 balBefore = borrower.balance;
        vm.prank(borrower);
        pawn.cancelLoanRequest(requestId);

        assertEq(borrower.balance, balBefore + 1 ether);
    }

    function testRevert_cancelLoanRequest_NotBorrower() public {
        uint256 requestId = _createDefaultRequest();

        vm.prank(lender);
        vm.expectRevert("Not borrower");
        pawn.cancelLoanRequest(requestId);
    }

    function testRevert_cancelLoanRequest_AlreadyFunded() public {
        (uint256 requestId,) = _createAndFund();

        vm.prank(borrower);
        vm.expectRevert("Not open");
        pawn.cancelLoanRequest(requestId);
    }

    // ========================
    // fundLoan 테스트
    // ========================

    function test_fundLoan_ERC20Principal() public {
        uint256 requestId = _createDefaultRequest();

        vm.prank(lender);
        uint256 loanId = pawn.fundLoan(requestId);

        assertEq(loanId, 0);
        assertEq(usdc.balanceOf(borrower), 1000e6); // borrower에게 원금 전달

        PawnableLoan.LoanRequest memory req = pawn.getLoanRequest(requestId);
        assertEq(uint8(req.status), uint8(PawnableLoan.RequestStatus.FUNDED));

        PawnableLoan.Loan memory l = pawn.getLoan(loanId);
        assertEq(l.borrower, borrower);
        assertEq(l.lender, lender);
        assertEq(l.requestId, requestId);
        assertEq(uint8(l.status), uint8(PawnableLoan.LoanStatus.ONGOING));
    }

    function test_fundLoan_NativePrincipal() public {
        vm.prank(borrower);
        uint256 requestId = pawn.createLoanRequest(
            address(weth), 1e18, address(0), 0.5 ether, 500, 7 days
        );

        vm.deal(lender, 1 ether);
        vm.prank(lender);
        uint256 loanId = pawn.fundLoan{value: 0.5 ether}(requestId);

        assertEq(borrower.balance, 0.5 ether);
        assertEq(loanId, 0);
    }

    function testRevert_fundLoan_SelfFund() public {
        uint256 requestId = _createDefaultRequest();

        usdc.mint(borrower, 1000e6);
        vm.prank(borrower);
        usdc.approve(address(pawn), type(uint256).max);

        vm.prank(borrower);
        vm.expectRevert("Cannot self-fund");
        pawn.fundLoan(requestId);
    }

    function testRevert_fundLoan_NotOpen() public {
        uint256 requestId = _createDefaultRequest();

        vm.prank(borrower);
        pawn.cancelLoanRequest(requestId);

        vm.prank(lender);
        vm.expectRevert("Not open");
        pawn.fundLoan(requestId);
    }

    function testRevert_fundLoan_IncorrectETH() public {
        vm.prank(borrower);
        uint256 requestId = pawn.createLoanRequest(
            address(weth), 1e18, address(0), 1 ether, 500, 7 days
        );

        vm.deal(lender, 2 ether);
        vm.prank(lender);
        vm.expectRevert("Incorrect ETH amount");
        pawn.fundLoan{value: 0.5 ether}(requestId);
    }

    // ========================
    // repayLoan 테스트
    // ========================

    function test_repayLoan() public {
        (, uint256 loanId) = _createAndFund();

        uint256 repayAmount = pawn.getRepayAmount(loanId);
        assertEq(repayAmount, 1050e6); // 1000 + 5%

        usdc.mint(borrower, 1050e6);
        vm.prank(borrower);
        usdc.approve(address(pawn), type(uint256).max);

        vm.prank(borrower);
        pawn.repayLoan(loanId);

        PawnableLoan.Loan memory l = pawn.getLoan(loanId);
        assertEq(uint8(l.status), uint8(PawnableLoan.LoanStatus.REPAID));
        assertEq(weth.balanceOf(borrower), 10e18); // 담보 반환
    }

    function testRevert_repayAfterDue() public {
        (, uint256 loanId) = _createAndFund();

        vm.warp(block.timestamp + 7 days + 1);

        usdc.mint(borrower, 1050e6);
        vm.prank(borrower);
        usdc.approve(address(pawn), type(uint256).max);

        vm.prank(borrower);
        vm.expectRevert("Loan overdue");
        pawn.repayLoan(loanId);
    }

    // ========================
    // claimCollateral 테스트
    // ========================

    function test_claimCollateral() public {
        (, uint256 loanId) = _createAndFund();

        vm.warp(block.timestamp + 7 days + 1);

        // 누구나 호출 가능
        address bot = makeAddr("bot");
        vm.prank(bot);
        pawn.claimCollateral(loanId);

        PawnableLoan.Loan memory l = pawn.getLoan(loanId);
        assertEq(uint8(l.status), uint8(PawnableLoan.LoanStatus.CLAIMED));
        assertEq(weth.balanceOf(lender), 1e18); // lender에게 담보 전달
    }

    function testRevert_claimBeforeDue() public {
        (, uint256 loanId) = _createAndFund();

        vm.expectRevert("Loan not overdue");
        pawn.claimCollateral(loanId);
    }

    // ========================
    // 전체 라이프사이클 테스트
    // ========================

    function test_fullLifecycle_createFundRepay() public {
        // 1. 대출 요청 생성
        uint256 requestId = _createDefaultRequest();
        assertEq(weth.balanceOf(address(pawn)), 1e18);

        // 2. 자금 제공
        vm.prank(lender);
        uint256 loanId = pawn.fundLoan(requestId);
        assertEq(usdc.balanceOf(borrower), 1000e6);

        // 3. 상환
        usdc.mint(borrower, 1050e6);
        vm.prank(borrower);
        usdc.approve(address(pawn), type(uint256).max);
        vm.prank(borrower);
        pawn.repayLoan(loanId);

        // 최종 상태 확인
        assertEq(uint8(pawn.getLoanRequest(requestId).status), uint8(PawnableLoan.RequestStatus.FUNDED));
        assertEq(uint8(pawn.getLoan(loanId).status), uint8(PawnableLoan.LoanStatus.REPAID));
        assertEq(weth.balanceOf(borrower), 10e18); // 담보 전부 돌아옴
    }

    function test_fullLifecycle_createFundClaim() public {
        // 1. 대출 요청 생성
        uint256 requestId = _createDefaultRequest();

        // 2. 자금 제공
        vm.prank(lender);
        uint256 loanId = pawn.fundLoan(requestId);

        // 3. 기한 경과 → 담보 청산
        vm.warp(block.timestamp + 7 days + 1);
        pawn.claimCollateral(loanId);

        assertEq(uint8(pawn.getLoan(loanId).status), uint8(PawnableLoan.LoanStatus.CLAIMED));
        assertEq(weth.balanceOf(lender), 1e18); // lender가 담보 획득
    }

    function test_fullLifecycle_createCancel() public {
        // 1. 대출 요청 생성
        uint256 requestId = _createDefaultRequest();
        assertEq(weth.balanceOf(borrower), 9e18);

        // 2. 취소
        vm.prank(borrower);
        pawn.cancelLoanRequest(requestId);

        assertEq(uint8(pawn.getLoanRequest(requestId).status), uint8(PawnableLoan.RequestStatus.CANCELLED));
        assertEq(weth.balanceOf(borrower), 10e18); // 담보 전부 돌아옴
    }

    // ========================
    // nextRequestId / nextLoanId 테스트
    // ========================

    function test_multipleRequests() public {
        weth.mint(borrower, 10e18);
        vm.prank(borrower);
        weth.approve(address(pawn), type(uint256).max);

        vm.prank(borrower);
        uint256 id0 = pawn.createLoanRequest(address(weth), 1e18, address(usdc), 1000e6, 500, 7 days);
        vm.prank(borrower);
        uint256 id1 = pawn.createLoanRequest(address(weth), 2e18, address(usdc), 2000e6, 300, 14 days);

        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(pawn.nextRequestId(), 2);
    }
}
