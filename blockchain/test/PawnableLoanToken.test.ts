import { expect } from "chai";
import { ethers } from "hardhat";
import { PawnableLoanToken, MockUSDT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * @title PawnableLoanToken 컨트랙트 테스트
 * @notice Native ETH 및 ERC20 토큰 담보 대출 기능을 테스트합니다
 */
describe("PawnableLoanToken", function () {
  // 컨트랙트 인스턴스
  let loanContract: PawnableLoanToken;
  let usdtContract: MockUSDT;
  let wethContract: MockUSDT; // MockUSDT를 WETH처럼 사용
  let usdcContract: MockUSDT; // MockUSDT를 USDC처럼 사용

  // 테스트 계정
  let owner: SignerWithAddress;
  let borrower: SignerWithAddress;
  let lender: SignerWithAddress;
  let other: SignerWithAddress;

  // 테스트 상수
  const LOAN_AMOUNT = ethers.parseUnits("1000", 6); // 1,000 USDT
  const REPAY_AMOUNT = ethers.parseUnits("1100", 6); // 1,100 USDT (10% 이자)
  const ETH_COLLATERAL = ethers.parseEther("1"); // 1 ETH
  const WETH_COLLATERAL = ethers.parseEther("2"); // 2 WETH
  const ONE_DAY = 24 * 60 * 60;

  /**
   * @dev 각 테스트 전에 컨트랙트를 새로 배포합니다
   */
  beforeEach(async function () {
    // 계정 가져오기
    [owner, borrower, lender, other] = await ethers.getSigners();

    // MockUSDT 배포 (대출 토큰)
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    usdtContract = await MockUSDT.deploy();

    // MockWETH 배포 (담보 토큰)
    wethContract = await MockUSDT.deploy();

    // MockUSDC 배포 (담보 토큰)
    usdcContract = await MockUSDT.deploy();

    // PawnableLoanToken 배포
    const PawnableLoanToken = await ethers.getContractFactory("PawnableLoanToken");
    loanContract = await PawnableLoanToken.deploy();

    // 초기 자금 분배
    // borrower에게 USDT 전송 (상환용)
    await usdtContract.transfer(borrower.address, REPAY_AMOUNT);

    // lender에게 USDT 전송 (대출용)
    await usdtContract.transfer(lender.address, LOAN_AMOUNT * 2n);

    // borrower에게 WETH 전송 (담보용) - WETH는 18 decimals
    await wethContract.mint(borrower.address, WETH_COLLATERAL);

    // borrower에게 USDC 전송 (담보용) - USDC는 6 decimals
    const USDC_COLLATERAL = ethers.parseUnits("2000", 6); // 2000 USDC
    await usdcContract.mint(borrower.address, USDC_COLLATERAL);
  });

  describe("배포 테스트", function () {
    it("컨트랙트가 올바르게 배포되어야 함", async function () {
      expect(await loanContract.platformFeeBps()).to.equal(10); // 0.1%
      expect(await loanContract.owner()).to.equal(owner.address);
    });

    it("Native ETH 주소가 address(0)이어야 함", async function () {
      expect(await loanContract.NATIVE_ETH()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("ETH 담보 대출", function () {
    const LOAN_ID = "eth-loan-001";

    it("ETH를 담보로 대출 요청을 생성할 수 있어야 함", async function () {
      const dueTimestamp = Math.floor(Date.now() / 1000) + 30 * ONE_DAY;

      await expect(
        loanContract.connect(borrower).requestLoanWithETH(
          LOAN_ID,
          await usdtContract.getAddress(),
          LOAN_AMOUNT,
          REPAY_AMOUNT,
          dueTimestamp,
          { value: ETH_COLLATERAL }
        )
      )
        .to.emit(loanContract, "LoanRequested")
        .withArgs(
          LOAN_ID,
          borrower.address,
          await usdtContract.getAddress(),
          LOAN_AMOUNT,
          REPAY_AMOUNT,
          0, // CollateralType.NATIVE_ETH
          ethers.ZeroAddress,
          ETH_COLLATERAL,
          dueTimestamp
        );

      const loan = await loanContract.getLoan(LOAN_ID);
      expect(loan.borrower).to.equal(borrower.address);
      expect(loan.collateralAmount).to.equal(ETH_COLLATERAL);
      expect(loan.collateralType).to.equal(0); // NATIVE_ETH
    });

    it("ETH가 컨트랙트로 전송되어야 함", async function () {
      const dueTimestamp = Math.floor(Date.now() / 1000) + 30 * ONE_DAY;

      const contractBalanceBefore = await ethers.provider.getBalance(
        await loanContract.getAddress()
      );

      await loanContract.connect(borrower).requestLoanWithETH(
        LOAN_ID,
        await usdtContract.getAddress(),
        LOAN_AMOUNT,
        REPAY_AMOUNT,
        dueTimestamp,
        { value: ETH_COLLATERAL }
      );

      const contractBalanceAfter = await ethers.provider.getBalance(
        await loanContract.getAddress()
      );

      expect(contractBalanceAfter - contractBalanceBefore).to.equal(ETH_COLLATERAL);
    });

    it("ETH 담보 대출을 매칭할 수 있어야 함", async function () {
      const dueTimestamp = Math.floor(Date.now() / 1000) + 30 * ONE_DAY;

      // 대출 요청
      await loanContract.connect(borrower).requestLoanWithETH(
        LOAN_ID,
        await usdtContract.getAddress(),
        LOAN_AMOUNT,
        REPAY_AMOUNT,
        dueTimestamp,
        { value: ETH_COLLATERAL }
      );

      // 대출 매칭
      await usdtContract.connect(lender).approve(await loanContract.getAddress(), LOAN_AMOUNT);
      await loanContract.connect(lender).matchLoan(LOAN_ID);

      const loan = await loanContract.getLoan(LOAN_ID);
      expect(loan.lender).to.equal(lender.address);
      expect(loan.status).to.equal(1); // ACTIVE
    });

    it("ETH 담보 대출을 상환하면 ETH가 반환되어야 함", async function () {
      const dueTimestamp = Math.floor(Date.now() / 1000) + 30 * ONE_DAY;

      // 대출 요청
      await loanContract.connect(borrower).requestLoanWithETH(
        LOAN_ID,
        await usdtContract.getAddress(),
        LOAN_AMOUNT,
        REPAY_AMOUNT,
        dueTimestamp,
        { value: ETH_COLLATERAL }
      );

      // 대출 매칭
      await usdtContract.connect(lender).approve(await loanContract.getAddress(), LOAN_AMOUNT);
      await loanContract.connect(lender).matchLoan(LOAN_ID);

      // 상환
      const borrowerBalanceBefore = await ethers.provider.getBalance(borrower.address);
      await usdtContract.connect(borrower).approve(await loanContract.getAddress(), REPAY_AMOUNT);
      const tx = await loanContract.connect(borrower).repayLoan(LOAN_ID);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const borrowerBalanceAfter = await ethers.provider.getBalance(borrower.address);

      // ETH가 반환되었는지 확인 (가스비 제외)
      expect(borrowerBalanceAfter - borrowerBalanceBefore + gasUsed).to.be.closeTo(
        ETH_COLLATERAL,
        ethers.parseEther("0.001") // 가스비 오차 허용
      );
    });

    it("ETH 담보 대출을 취소하면 ETH가 반환되어야 함", async function () {
      const dueTimestamp = Math.floor(Date.now() / 1000) + 30 * ONE_DAY;

      await loanContract.connect(borrower).requestLoanWithETH(
        LOAN_ID,
        await usdtContract.getAddress(),
        LOAN_AMOUNT,
        REPAY_AMOUNT,
        dueTimestamp,
        { value: ETH_COLLATERAL }
      );

      const borrowerBalanceBefore = await ethers.provider.getBalance(borrower.address);
      const tx = await loanContract.connect(borrower).cancelLoan(LOAN_ID);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const borrowerBalanceAfter = await ethers.provider.getBalance(borrower.address);

      expect(borrowerBalanceAfter - borrowerBalanceBefore + gasUsed).to.be.closeTo(
        ETH_COLLATERAL,
        ethers.parseEther("0.001")
      );
    });

    it("ETH 담보 대출 청산 시 대출자에게 ETH가 전송되어야 함", async function () {
      const currentBlock = await ethers.provider.getBlock('latest');
      const dueTimestamp = currentBlock!.timestamp + ONE_DAY + 2; // 1일 + 2초 후 만료

      // 대출 요청
      await loanContract.connect(borrower).requestLoanWithETH(
        LOAN_ID,
        await usdtContract.getAddress(),
        LOAN_AMOUNT,
        REPAY_AMOUNT,
        dueTimestamp,
        { value: ETH_COLLATERAL }
      );

      // 대출 매칭
      await usdtContract.connect(lender).approve(await loanContract.getAddress(), LOAN_AMOUNT);
      await loanContract.connect(lender).matchLoan(LOAN_ID);

      // 기한이 지날 때까지 대기 (1일 + 3초)
      await ethers.provider.send("evm_increaseTime", [ONE_DAY + 3]);
      await ethers.provider.send("evm_mine", []);

      // 청산
      const lenderBalanceBefore = await ethers.provider.getBalance(lender.address);
      await loanContract.connect(other).liquidateLoan(LOAN_ID);
      const lenderBalanceAfter = await ethers.provider.getBalance(lender.address);

      // 대출자가 ETH를 받았는지 확인
      expect(lenderBalanceAfter - lenderBalanceBefore).to.equal(ETH_COLLATERAL);
    });
  });

  describe("ERC20 토큰 담보 대출", function () {
    const LOAN_ID = "token-loan-001";

    it("WETH를 담보로 대출 요청을 생성할 수 있어야 함", async function () {
      const dueTimestamp = Math.floor(Date.now() / 1000) + 30 * ONE_DAY;

      // WETH approve
      await wethContract.connect(borrower).approve(await loanContract.getAddress(), WETH_COLLATERAL);

      await expect(
        loanContract.connect(borrower).requestLoanWithToken(
          LOAN_ID,
          await usdtContract.getAddress(),
          LOAN_AMOUNT,
          REPAY_AMOUNT,
          await wethContract.getAddress(),
          WETH_COLLATERAL,
          dueTimestamp
        )
      )
        .to.emit(loanContract, "LoanRequested")
        .withArgs(
          LOAN_ID,
          borrower.address,
          await usdtContract.getAddress(),
          LOAN_AMOUNT,
          REPAY_AMOUNT,
          1, // CollateralType.ERC20_TOKEN
          await wethContract.getAddress(),
          WETH_COLLATERAL,
          dueTimestamp
        );

      const loan = await loanContract.getLoan(LOAN_ID);
      expect(loan.borrower).to.equal(borrower.address);
      expect(loan.collateralAmount).to.equal(WETH_COLLATERAL);
      expect(loan.collateralType).to.equal(1); // ERC20_TOKEN
      expect(loan.collateralToken).to.equal(await wethContract.getAddress());
    });

    it("WETH가 컨트랙트로 전송되어야 함", async function () {
      const dueTimestamp = Math.floor(Date.now() / 1000) + 30 * ONE_DAY;

      await wethContract.connect(borrower).approve(await loanContract.getAddress(), WETH_COLLATERAL);

      await loanContract.connect(borrower).requestLoanWithToken(
        LOAN_ID,
        await usdtContract.getAddress(),
        LOAN_AMOUNT,
        REPAY_AMOUNT,
        await wethContract.getAddress(),
        WETH_COLLATERAL,
        dueTimestamp
      );

      const contractBalance = await wethContract.balanceOf(await loanContract.getAddress());
      expect(contractBalance).to.equal(WETH_COLLATERAL);
    });

    it("WETH 담보 대출을 상환하면 WETH가 반환되어야 함", async function () {
      const dueTimestamp = Math.floor(Date.now() / 1000) + 30 * ONE_DAY;

      // 대출 요청
      await wethContract.connect(borrower).approve(await loanContract.getAddress(), WETH_COLLATERAL);
      await loanContract.connect(borrower).requestLoanWithToken(
        LOAN_ID,
        await usdtContract.getAddress(),
        LOAN_AMOUNT,
        REPAY_AMOUNT,
        await wethContract.getAddress(),
        WETH_COLLATERAL,
        dueTimestamp
      );

      // 대출 매칭
      await usdtContract.connect(lender).approve(await loanContract.getAddress(), LOAN_AMOUNT);
      await loanContract.connect(lender).matchLoan(LOAN_ID);

      // 상환
      const borrowerWETHBefore = await wethContract.balanceOf(borrower.address);
      await usdtContract.connect(borrower).approve(await loanContract.getAddress(), REPAY_AMOUNT);
      await loanContract.connect(borrower).repayLoan(LOAN_ID);
      const borrowerWETHAfter = await wethContract.balanceOf(borrower.address);

      expect(borrowerWETHAfter - borrowerWETHBefore).to.equal(WETH_COLLATERAL);
    });

    it("USDC를 담보로 대출 요청을 생성할 수 있어야 함", async function () {
      const dueTimestamp = Math.floor(Date.now() / 1000) + 30 * ONE_DAY;
      const USDC_COLLATERAL = ethers.parseUnits("2000", 6); // 2000 USDC

      await usdcContract.connect(borrower).approve(await loanContract.getAddress(), USDC_COLLATERAL);

      await loanContract.connect(borrower).requestLoanWithToken(
        LOAN_ID,
        await usdtContract.getAddress(),
        LOAN_AMOUNT,
        REPAY_AMOUNT,
        await usdcContract.getAddress(),
        USDC_COLLATERAL,
        dueTimestamp
      );

      const loan = await loanContract.getLoan(LOAN_ID);
      expect(loan.collateralToken).to.equal(await usdcContract.getAddress());
      expect(loan.collateralAmount).to.equal(USDC_COLLATERAL);
    });

    it("ERC20 담보 대출 청산 시 대출자에게 토큰이 전송되어야 함", async function () {
      // 대출 요청
      await wethContract.connect(borrower).approve(await loanContract.getAddress(), WETH_COLLATERAL);

      const currentBlock = await ethers.provider.getBlock('latest');
      const dueTimestamp = currentBlock!.timestamp + ONE_DAY + 2;

      await loanContract.connect(borrower).requestLoanWithToken(
        LOAN_ID,
        await usdtContract.getAddress(),
        LOAN_AMOUNT,
        REPAY_AMOUNT,
        await wethContract.getAddress(),
        WETH_COLLATERAL,
        dueTimestamp
      );

      // 대출 매칭
      await usdtContract.connect(lender).approve(await loanContract.getAddress(), LOAN_AMOUNT);
      await loanContract.connect(lender).matchLoan(LOAN_ID);

      // 기한이 지날 때까지 대기 (1일 + 3초)
      await ethers.provider.send("evm_increaseTime", [ONE_DAY + 3]);
      await ethers.provider.send("evm_mine", []);

      // 청산
      const lenderWETHBefore = await wethContract.balanceOf(lender.address);
      await loanContract.connect(other).liquidateLoan(LOAN_ID);
      const lenderWETHAfter = await wethContract.balanceOf(lender.address);

      expect(lenderWETHAfter - lenderWETHBefore).to.equal(WETH_COLLATERAL);
    });
  });

  describe("관리자 기능", function () {
    it("소유자가 플랫폼 수수료를 변경할 수 있어야 함", async function () {
      await loanContract.connect(owner).setPlatformFee(20);
      expect(await loanContract.platformFeeBps()).to.equal(20);
    });

    it("소유자가 ERC20 토큰 수수료를 인출할 수 있어야 함", async function () {
      const dueTimestamp = Math.floor(Date.now() / 1000) + 30 * ONE_DAY;
      const LOAN_ID = "fee-test-loan";

      // 대출 매칭하여 수수료 발생
      await loanContract.connect(borrower).requestLoanWithETH(
        LOAN_ID,
        await usdtContract.getAddress(),
        LOAN_AMOUNT,
        REPAY_AMOUNT,
        dueTimestamp,
        { value: ETH_COLLATERAL }
      );

      await usdtContract.connect(lender).approve(await loanContract.getAddress(), LOAN_AMOUNT);
      await loanContract.connect(lender).matchLoan(LOAN_ID);

      const expectedFee = (LOAN_AMOUNT * 10n) / 10000n;
      const ownerBalanceBefore = await usdtContract.balanceOf(owner.address);

      await loanContract.connect(owner).withdrawTokenFees(await usdtContract.getAddress());

      const ownerBalanceAfter = await usdtContract.balanceOf(owner.address);
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(expectedFee);
    });
  });

  describe("뷰 함수", function () {
    it("컨트랙트 ETH 잔액을 조회할 수 있어야 함", async function () {
      const dueTimestamp = Math.floor(Date.now() / 1000) + 30 * ONE_DAY;
      const LOAN_ID = "balance-test";

      await loanContract.connect(borrower).requestLoanWithETH(
        LOAN_ID,
        await usdtContract.getAddress(),
        LOAN_AMOUNT,
        REPAY_AMOUNT,
        dueTimestamp,
        { value: ETH_COLLATERAL }
      );

      const balance = await loanContract.getContractETHBalance();
      expect(balance).to.equal(ETH_COLLATERAL);
    });

    it("대출이 청산 가능한지 확인할 수 있어야 함", async function () {
      const currentBlock = await ethers.provider.getBlock('latest');
      const dueTimestamp = currentBlock!.timestamp + ONE_DAY + 2;
      const LOAN_ID = "liquidatable-test";

      await loanContract.connect(borrower).requestLoanWithETH(
        LOAN_ID,
        await usdtContract.getAddress(),
        LOAN_AMOUNT,
        REPAY_AMOUNT,
        dueTimestamp,
        { value: ETH_COLLATERAL }
      );

      await usdtContract.connect(lender).approve(await loanContract.getAddress(), LOAN_AMOUNT);
      await loanContract.connect(lender).matchLoan(LOAN_ID);

      // 청산 불가능
      expect(await loanContract.isLiquidatable(LOAN_ID)).to.be.false;

      // 기한이 지남 (1일 + 3초)
      await ethers.provider.send("evm_increaseTime", [ONE_DAY + 3]);
      await ethers.provider.send("evm_mine", []);

      // 청산 가능
      expect(await loanContract.isLiquidatable(LOAN_ID)).to.be.true;
    });
  });
});
