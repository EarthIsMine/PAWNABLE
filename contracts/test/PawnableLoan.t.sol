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
    PawnableLoan public loan;
    TestToken public usdc;
    TestToken public weth;

    // 테스트 계정
    uint256 borrowerPk = 0xA11CE;
    uint256 lenderPk = 0xB0B;
    address borrower = vm.addr(borrowerPk);
    address lender = vm.addr(lenderPk);

    function setUp() public {
        loan = new PawnableLoan();
        usdc = new TestToken("USD Coin", "USDC");
        weth = new TestToken("Wrapped ETH", "WETH");

        // 토큰 발행
        usdc.mint(lender, 10_000e6);
        weth.mint(borrower, 10e18);

        // borrower: weth approve (담보)
        vm.prank(borrower);
        weth.approve(address(loan), type(uint256).max);

        // lender: usdc approve (원금)
        vm.prank(lender);
        usdc.approve(address(loan), type(uint256).max);
    }

    // ========================
    // 헬퍼
    // ========================

    function _signIntent(
        uint256 pk,
        address _borrower,
        address collateralToken,
        uint256 collateralAmount,
        address principalToken,
        uint256 principalAmount,
        uint256 interestBps,
        uint256 durationSeconds,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(
                loan.LOAN_INTENT_TYPEHASH(),
                _borrower,
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
        bytes32 digest = loan.getIntentHash(
            _borrower,
            collateralToken,
            collateralAmount,
            principalToken,
            principalAmount,
            interestBps,
            durationSeconds,
            nonce,
            deadline
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    // ========================
    // executeLoan 테스트
    // ========================

    function test_executeLoan_ERC20() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signIntent(
            borrowerPk, borrower, address(weth), 1e18, address(usdc), 1000e6, 500, 7 days, 0, deadline
        );

        vm.prank(lender);
        uint256 loanId = loan.executeLoan(
            borrower, address(weth), 1e18, address(usdc), 1000e6, 500, 7 days, 0, deadline, sig
        );

        assertEq(loanId, 0);
        assertEq(usdc.balanceOf(borrower), 1000e6); // borrower에게 원금 전달
        assertEq(weth.balanceOf(address(loan)), 1e18); // 담보 lock
        assertEq(loan.nonces(borrower), 1); // nonce 증가

        PawnableLoan.Loan memory l = loan.getLoan(0);
        assertEq(l.borrower, borrower);
        assertEq(l.lender, lender);
        assertEq(uint8(l.status), uint8(PawnableLoan.LoanStatus.ONGOING));
    }

    function test_executeLoan_NativeCollateral() public {
        // borrower가 ETH 예치
        vm.deal(borrower, 2 ether);
        vm.prank(borrower);
        loan.depositEth{value: 1 ether}();

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signIntent(
            borrowerPk, borrower, address(0), 1 ether, address(usdc), 1000e6, 500, 7 days, 0, deadline
        );

        vm.prank(lender);
        loan.executeLoan(borrower, address(0), 1 ether, address(usdc), 1000e6, 500, 7 days, 0, deadline, sig);

        assertEq(loan.ethDeposits(borrower), 0); // 예치금 차감됨
        assertEq(usdc.balanceOf(borrower), 1000e6);
    }

    function test_executeLoan_NativePrincipal() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signIntent(
            borrowerPk, borrower, address(weth), 1e18, address(0), 0.5 ether, 500, 7 days, 0, deadline
        );

        vm.deal(lender, 1 ether);
        vm.prank(lender);
        loan.executeLoan{value: 0.5 ether}(
            borrower, address(weth), 1e18, address(0), 0.5 ether, 500, 7 days, 0, deadline, sig
        );

        assertEq(borrower.balance, 0.5 ether); // borrower에게 ETH 전달
        assertEq(weth.balanceOf(address(loan)), 1e18); // 담보 lock
    }

    function testRevert_expiredDeadline() public {
        uint256 deadline = block.timestamp - 1; // 이미 만료
        bytes memory sig = _signIntent(
            borrowerPk, borrower, address(weth), 1e18, address(usdc), 1000e6, 500, 7 days, 0, deadline
        );

        vm.prank(lender);
        vm.expectRevert("Intent expired");
        loan.executeLoan(borrower, address(weth), 1e18, address(usdc), 1000e6, 500, 7 days, 0, deadline, sig);
    }

    function testRevert_invalidNonce() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signIntent(
            borrowerPk, borrower, address(weth), 1e18, address(usdc), 1000e6, 500, 7 days, 999, deadline
        );

        vm.prank(lender);
        vm.expectRevert("Invalid nonce");
        loan.executeLoan(borrower, address(weth), 1e18, address(usdc), 1000e6, 500, 7 days, 999, deadline, sig);
    }

    function testRevert_invalidSignature() public {
        uint256 deadline = block.timestamp + 1 hours;
        // lender의 키로 서명 (borrower가 아님)
        bytes memory sig = _signIntent(
            lenderPk, borrower, address(weth), 1e18, address(usdc), 1000e6, 500, 7 days, 0, deadline
        );

        vm.prank(lender);
        vm.expectRevert("Invalid signature");
        loan.executeLoan(borrower, address(weth), 1e18, address(usdc), 1000e6, 500, 7 days, 0, deadline, sig);
    }

    function testRevert_replayAttack() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signIntent(
            borrowerPk, borrower, address(weth), 1e18, address(usdc), 1000e6, 500, 7 days, 0, deadline
        );

        vm.prank(lender);
        loan.executeLoan(borrower, address(weth), 1e18, address(usdc), 1000e6, 500, 7 days, 0, deadline, sig);

        // 같은 서명으로 재실행 시도
        weth.mint(borrower, 1e18);
        vm.prank(borrower);
        weth.approve(address(loan), type(uint256).max);

        vm.prank(lender);
        vm.expectRevert("Invalid nonce"); // nonce가 이미 증가됨
        loan.executeLoan(borrower, address(weth), 1e18, address(usdc), 1000e6, 500, 7 days, 0, deadline, sig);
    }

    // ========================
    // repayLoan 테스트
    // ========================

    function test_repayLoan() public {
        // 대출 실행
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signIntent(
            borrowerPk, borrower, address(weth), 1e18, address(usdc), 1000e6, 500, 7 days, 0, deadline
        );
        vm.prank(lender);
        loan.executeLoan(borrower, address(weth), 1e18, address(usdc), 1000e6, 500, 7 days, 0, deadline, sig);

        // 상환 (원금 1000 + 이자 50 = 1050 USDC)
        uint256 repayAmount = loan.getRepayAmount(0);
        assertEq(repayAmount, 1050e6);

        usdc.mint(borrower, 1050e6); // 상환금 마련
        vm.prank(borrower);
        usdc.approve(address(loan), type(uint256).max);

        vm.prank(borrower);
        loan.repayLoan(0);

        PawnableLoan.Loan memory l = loan.getLoan(0);
        assertEq(uint8(l.status), uint8(PawnableLoan.LoanStatus.REPAID));
        assertEq(weth.balanceOf(borrower), 10e18); // 담보 반환 (원래 10 - 1 lock + 1 반환)
    }

    function testRevert_repayAfterDue() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signIntent(
            borrowerPk, borrower, address(weth), 1e18, address(usdc), 1000e6, 500, 7 days, 0, deadline
        );
        vm.prank(lender);
        loan.executeLoan(borrower, address(weth), 1e18, address(usdc), 1000e6, 500, 7 days, 0, deadline, sig);

        // 7일 + 1초 경과
        vm.warp(block.timestamp + 7 days + 1);

        usdc.mint(borrower, 1050e6);
        vm.prank(borrower);
        usdc.approve(address(loan), type(uint256).max);

        vm.prank(borrower);
        vm.expectRevert("Loan overdue");
        loan.repayLoan(0);
    }

    // ========================
    // claimCollateral 테스트
    // ========================

    function test_claimCollateral() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signIntent(
            borrowerPk, borrower, address(weth), 1e18, address(usdc), 1000e6, 500, 7 days, 0, deadline
        );
        vm.prank(lender);
        loan.executeLoan(borrower, address(weth), 1e18, address(usdc), 1000e6, 500, 7 days, 0, deadline, sig);

        // 기한 경과
        vm.warp(block.timestamp + 7 days + 1);

        // 누구나 호출 가능
        address bot = makeAddr("bot");
        vm.prank(bot);
        loan.claimCollateral(0);

        PawnableLoan.Loan memory l = loan.getLoan(0);
        assertEq(uint8(l.status), uint8(PawnableLoan.LoanStatus.CLAIMED));
        assertEq(weth.balanceOf(lender), 1e18); // lender에게 담보 전달
    }

    function testRevert_claimBeforeDue() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signIntent(
            borrowerPk, borrower, address(weth), 1e18, address(usdc), 1000e6, 500, 7 days, 0, deadline
        );
        vm.prank(lender);
        loan.executeLoan(borrower, address(weth), 1e18, address(usdc), 1000e6, 500, 7 days, 0, deadline, sig);

        vm.expectRevert("Loan not overdue");
        loan.claimCollateral(0);
    }

    // ========================
    // incrementNonce 테스트
    // ========================

    function test_incrementNonce() public {
        assertEq(loan.nonces(borrower), 0);

        vm.prank(borrower);
        loan.incrementNonce();

        assertEq(loan.nonces(borrower), 1);

        // 이전 nonce로 만든 intent는 실행 불가
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signIntent(
            borrowerPk, borrower, address(weth), 1e18, address(usdc), 1000e6, 500, 7 days, 0, deadline
        );

        vm.prank(lender);
        vm.expectRevert("Invalid nonce");
        loan.executeLoan(borrower, address(weth), 1e18, address(usdc), 1000e6, 500, 7 days, 0, deadline, sig);
    }

    // ========================
    // ETH 예치/인출 테스트
    // ========================

    function test_ethDeposit() public {
        vm.deal(borrower, 5 ether);

        vm.prank(borrower);
        loan.depositEth{value: 2 ether}();
        assertEq(loan.ethDeposits(borrower), 2 ether);

        vm.prank(borrower);
        loan.withdrawEth(1 ether);
        assertEq(loan.ethDeposits(borrower), 1 ether);
        assertEq(borrower.balance, 4 ether);
    }

    function test_receiveEth() public {
        vm.deal(borrower, 1 ether);
        vm.prank(borrower);
        (bool success,) = address(loan).call{value: 1 ether}("");
        assertTrue(success);
        assertEq(loan.ethDeposits(borrower), 1 ether);
    }
}
