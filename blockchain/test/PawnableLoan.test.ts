import { expect } from "chai";
import { ethers } from "hardhat";
import { PawnableLoan, MockUSDT, PawnableNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * @title PawnableLoan 컨트랙트 테스트
 * @notice 핵심 대출 기능을 테스트합니다
 */
describe("PawnableLoan", function () {
  // 컨트랙트 인스턴스
  let loanContract: PawnableLoan;
  let usdtContract: MockUSDT;
  let nftContract: PawnableNFT;

  // 테스트 계정
  let owner: SignerWithAddress;
  let borrower: SignerWithAddress;
  let lender: SignerWithAddress;
  let other: SignerWithAddress;

  // 테스트 상수
  const LOAN_AMOUNT = ethers.parseUnits("1000", 6); // 1,000 USDT
  const REPAY_AMOUNT = ethers.parseUnits("1100", 6); // 1,100 USDT (10% 이자)
  const ONE_DAY = 24 * 60 * 60;
  const LOAN_ID = "test-loan-001";

  /**
   * @dev 각 테스트 전에 컨트랙트를 새로 배포합니다
   */
  beforeEach(async function () {
    // 계정 가져오기
    [owner, borrower, lender, other] = await ethers.getSigners();

    // MockUSDT 배포
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    usdtContract = await MockUSDT.deploy();

    // PawnableNFT 배포
    const PawnableNFT = await ethers.getContractFactory("PawnableNFT");
    nftContract = await PawnableNFT.deploy();

    // PawnableLoan 배포
    const PawnableLoan = await ethers.getContractFactory("PawnableLoan");
    loanContract = await PawnableLoan.deploy();

    // 초기 자금 분배
    // borrower에게 USDT 전송 (상환용)
    await usdtContract.transfer(borrower.address, REPAY_AMOUNT);

    // lender에게 USDT 전송 (대출용)
    await usdtContract.transfer(lender.address, LOAN_AMOUNT * 2n);

    // borrower에게 NFT 발행
    await nftContract.mint(borrower.address, "ipfs://test-nft-1");
    await nftContract.mint(borrower.address, "ipfs://test-nft-2");
  });

  describe("배포 테스트", function () {
    it("컨트랙트가 올바르게 배포되어야 함", async function () {
      expect(await loanContract.platformFeeBps()).to.equal(10); // 0.1%
      expect(await loanContract.owner()).to.equal(owner.address);
    });

    it("MockUSDT가 올바르게 배포되어야 함", async function () {
      expect(await usdtContract.decimals()).to.equal(6);
      expect(await usdtContract.symbol()).to.equal("USDT");
    });

    it("NFT가 올바르게 발행되어야 함", async function () {
      expect(await nftContract.ownerOf(0)).to.equal(borrower.address);
      expect(await nftContract.ownerOf(1)).to.equal(borrower.address);
    });
  });

  describe("대출 요청 생성", function () {
    it("정상적인 대출 요청이 생성되어야 함", async function () {
      const dueTimestamp = Math.floor(Date.now() / 1000) + 30 * ONE_DAY; // 30일 후

      // NFT approve
      await nftContract.connect(borrower).approve(await loanContract.getAddress(), 0);

      // 대출 요청
      await expect(
        loanContract.connect(borrower).requestLoan(
          LOAN_ID,
          await usdtContract.getAddress(),
          LOAN_AMOUNT,
          REPAY_AMOUNT,
          await nftContract.getAddress(),
          [0],
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
          dueTimestamp
        );

      // 대출 정보 확인
      const loan = await loanContract.getLoan(LOAN_ID);
      expect(loan.borrower).to.equal(borrower.address);
      expect(loan.loanAmount).to.equal(LOAN_AMOUNT);
      expect(loan.status).to.equal(0); // PENDING
    });

    it("담보 NFT가 컨트랙트로 전송되어야 함", async function () {
      const dueTimestamp = Math.floor(Date.now() / 1000) + 30 * ONE_DAY;

      await nftContract.connect(borrower).approve(await loanContract.getAddress(), 0);

      await loanContract.connect(borrower).requestLoan(
        LOAN_ID,
        await usdtContract.getAddress(),
        LOAN_AMOUNT,
        REPAY_AMOUNT,
        await nftContract.getAddress(),
        [0],
        dueTimestamp
      );

      // NFT 소유권이 컨트랙트로 이전되었는지 확인
      expect(await nftContract.ownerOf(0)).to.equal(await loanContract.getAddress());
    });

    it("최소 대출 금액보다 작으면 실패해야 함", async function () {
      const dueTimestamp = Math.floor(Date.now() / 1000) + 30 * ONE_DAY;
      const tooSmallAmount = ethers.parseUnits("0.5", 6); // 0.5 USDT

      await nftContract.connect(borrower).approve(await loanContract.getAddress(), 0);

      await expect(
        loanContract.connect(borrower).requestLoan(
          LOAN_ID,
          await usdtContract.getAddress(),
          tooSmallAmount,
          tooSmallAmount + 1000n,
          await nftContract.getAddress(),
          [0],
          dueTimestamp
        )
      ).to.be.revertedWith("Loan amount too small");
    });

    it("상환 금액이 대출 금액보다 작거나 같으면 실패해야 함", async function () {
      const dueTimestamp = Math.floor(Date.now() / 1000) + 30 * ONE_DAY;

      await nftContract.connect(borrower).approve(await loanContract.getAddress(), 0);

      await expect(
        loanContract.connect(borrower).requestLoan(
          LOAN_ID,
          await usdtContract.getAddress(),
          LOAN_AMOUNT,
          LOAN_AMOUNT, // 같은 금액
          await nftContract.getAddress(),
          [0],
          dueTimestamp
        )
      ).to.be.revertedWith("Repay amount must be greater than loan amount");
    });
  });

  describe("대출 취소", function () {
    beforeEach(async function () {
      const dueTimestamp = Math.floor(Date.now() / 1000) + 30 * ONE_DAY;
      await nftContract.connect(borrower).approve(await loanContract.getAddress(), 0);
      await loanContract.connect(borrower).requestLoan(
        LOAN_ID,
        await usdtContract.getAddress(),
        LOAN_AMOUNT,
        REPAY_AMOUNT,
        await nftContract.getAddress(),
        [0],
        dueTimestamp
      );
    });

    it("차입자가 대출 요청을 취소할 수 있어야 함", async function () {
      await expect(loanContract.connect(borrower).cancelLoan(LOAN_ID))
        .to.emit(loanContract, "LoanCancelled")
        .withArgs(LOAN_ID, borrower.address);

      // 대출 상태 확인
      const loan = await loanContract.getLoan(LOAN_ID);
      expect(loan.status).to.equal(4); // CANCELLED
    });

    it("취소 시 담보가 반환되어야 함", async function () {
      await loanContract.connect(borrower).cancelLoan(LOAN_ID);

      // NFT 소유권이 borrower로 복구되었는지 확인
      expect(await nftContract.ownerOf(0)).to.equal(borrower.address);
    });

    it("차입자가 아닌 사람은 취소할 수 없어야 함", async function () {
      await expect(
        loanContract.connect(other).cancelLoan(LOAN_ID)
      ).to.be.revertedWith("Only borrower can call this");
    });
  });

  describe("대출 매칭", function () {
    beforeEach(async function () {
      const dueTimestamp = Math.floor(Date.now() / 1000) + 30 * ONE_DAY;
      await nftContract.connect(borrower).approve(await loanContract.getAddress(), 0);
      await loanContract.connect(borrower).requestLoan(
        LOAN_ID,
        await usdtContract.getAddress(),
        LOAN_AMOUNT,
        REPAY_AMOUNT,
        await nftContract.getAddress(),
        [0],
        dueTimestamp
      );
    });

    it("대출자가 대출을 매칭할 수 있어야 함", async function () {
      // USDT approve
      await usdtContract.connect(lender).approve(await loanContract.getAddress(), LOAN_AMOUNT);

      await expect(loanContract.connect(lender).matchLoan(LOAN_ID))
        .to.emit(loanContract, "LoanMatched")
        .withArgs(LOAN_ID, borrower.address, lender.address, LOAN_AMOUNT);

      // 대출 상태 확인
      const loan = await loanContract.getLoan(LOAN_ID);
      expect(loan.lender).to.equal(lender.address);
      expect(loan.status).to.equal(1); // ACTIVE
    });

    it("대출금이 차입자에게 전송되어야 함", async function () {
      const borrowerBalanceBefore = await usdtContract.balanceOf(borrower.address);

      await usdtContract.connect(lender).approve(await loanContract.getAddress(), LOAN_AMOUNT);
      await loanContract.connect(lender).matchLoan(LOAN_ID);

      const borrowerBalanceAfter = await usdtContract.balanceOf(borrower.address);

      // 수수료 0.1% 차감된 금액이 전송되어야 함
      const expectedAmount = LOAN_AMOUNT - (LOAN_AMOUNT * 10n) / 10000n;
      expect(borrowerBalanceAfter - borrowerBalanceBefore).to.equal(expectedAmount);
    });

    it("플랫폼 수수료가 수집되어야 함", async function () {
      await usdtContract.connect(lender).approve(await loanContract.getAddress(), LOAN_AMOUNT);
      await loanContract.connect(lender).matchLoan(LOAN_ID);

      const expectedFee = (LOAN_AMOUNT * 10n) / 10000n; // 0.1%
      const collectedFee = await loanContract.collectedFees(await usdtContract.getAddress());
      expect(collectedFee).to.equal(expectedFee);
    });
  });

  describe("대출 상환", function () {
    beforeEach(async function () {
      const dueTimestamp = Math.floor(Date.now() / 1000) + 30 * ONE_DAY;

      // 대출 요청
      await nftContract.connect(borrower).approve(await loanContract.getAddress(), 0);
      await loanContract.connect(borrower).requestLoan(
        LOAN_ID,
        await usdtContract.getAddress(),
        LOAN_AMOUNT,
        REPAY_AMOUNT,
        await nftContract.getAddress(),
        [0],
        dueTimestamp
      );

      // 대출 매칭
      await usdtContract.connect(lender).approve(await loanContract.getAddress(), LOAN_AMOUNT);
      await loanContract.connect(lender).matchLoan(LOAN_ID);
    });

    it("차입자가 대출을 상환할 수 있어야 함", async function () {
      // USDT approve
      await usdtContract.connect(borrower).approve(await loanContract.getAddress(), REPAY_AMOUNT);

      await expect(loanContract.connect(borrower).repayLoan(LOAN_ID))
        .to.emit(loanContract, "LoanRepaid")
        .withArgs(LOAN_ID, borrower.address, REPAY_AMOUNT);

      // 대출 상태 확인
      const loan = await loanContract.getLoan(LOAN_ID);
      expect(loan.status).to.equal(2); // REPAID
    });

    it("상환 시 담보가 반환되어야 함", async function () {
      await usdtContract.connect(borrower).approve(await loanContract.getAddress(), REPAY_AMOUNT);
      await loanContract.connect(borrower).repayLoan(LOAN_ID);

      // NFT 소유권이 borrower로 복구되었는지 확인
      expect(await nftContract.ownerOf(0)).to.equal(borrower.address);
    });

    it("대출자가 상환금을 받아야 함", async function () {
      const lenderBalanceBefore = await usdtContract.balanceOf(lender.address);

      await usdtContract.connect(borrower).approve(await loanContract.getAddress(), REPAY_AMOUNT);
      await loanContract.connect(borrower).repayLoan(LOAN_ID);

      const lenderBalanceAfter = await usdtContract.balanceOf(lender.address);

      // 수수료 0.1% 차감된 상환금을 받아야 함
      const expectedAmount = REPAY_AMOUNT - (REPAY_AMOUNT * 10n) / 10000n;
      expect(lenderBalanceAfter - lenderBalanceBefore).to.equal(expectedAmount);
    });
  });

  describe("대출 청산", function () {
    beforeEach(async function () {
      const dueTimestamp = Math.floor(Date.now() / 1000) + 2; // 2초 후 만료

      // 대출 요청
      await nftContract.connect(borrower).approve(await loanContract.getAddress(), 0);
      await loanContract.connect(borrower).requestLoan(
        LOAN_ID,
        await usdtContract.getAddress(),
        LOAN_AMOUNT,
        REPAY_AMOUNT,
        await nftContract.getAddress(),
        [0],
        dueTimestamp
      );

      // 대출 매칭
      await usdtContract.connect(lender).approve(await loanContract.getAddress(), LOAN_AMOUNT);
      await loanContract.connect(lender).matchLoan(LOAN_ID);
    });

    it("기한이 지난 대출을 청산할 수 있어야 함", async function () {
      // 기한이 지날 때까지 대기
      await ethers.provider.send("evm_increaseTime", [3]);
      await ethers.provider.send("evm_mine", []);

      await expect(loanContract.connect(other).liquidateLoan(LOAN_ID))
        .to.emit(loanContract, "LoanLiquidated")
        .withArgs(LOAN_ID, lender.address, 1);

      // 대출 상태 확인
      const loan = await loanContract.getLoan(LOAN_ID);
      expect(loan.status).to.equal(3); // LIQUIDATED
    });

    it("청산 시 담보가 대출자에게 전송되어야 함", async function () {
      // 기한이 지날 때까지 대기
      await ethers.provider.send("evm_increaseTime", [3]);
      await ethers.provider.send("evm_mine", []);

      await loanContract.connect(other).liquidateLoan(LOAN_ID);

      // NFT 소유권이 lender로 이전되었는지 확인
      expect(await nftContract.ownerOf(0)).to.equal(lender.address);
    });

    it("기한이 지나지 않았으면 청산할 수 없어야 함", async function () {
      await expect(
        loanContract.connect(other).liquidateLoan(LOAN_ID)
      ).to.be.revertedWith("Loan not overdue yet");
    });
  });

  describe("관리자 기능", function () {
    it("소유자가 플랫폼 수수료를 변경할 수 있어야 함", async function () {
      await loanContract.connect(owner).setPlatformFee(20); // 0.2%
      expect(await loanContract.platformFeeBps()).to.equal(20);
    });

    it("수수료는 1%를 초과할 수 없어야 함", async function () {
      await expect(
        loanContract.connect(owner).setPlatformFee(101)
      ).to.be.revertedWith("Fee too high");
    });

    it("소유자가 수집된 수수료를 인출할 수 있어야 함", async function () {
      // 대출 매칭하여 수수료 발생
      const dueTimestamp = Math.floor(Date.now() / 1000) + 30 * ONE_DAY;
      await nftContract.connect(borrower).approve(await loanContract.getAddress(), 0);
      await loanContract.connect(borrower).requestLoan(
        LOAN_ID,
        await usdtContract.getAddress(),
        LOAN_AMOUNT,
        REPAY_AMOUNT,
        await nftContract.getAddress(),
        [0],
        dueTimestamp
      );
      await usdtContract.connect(lender).approve(await loanContract.getAddress(), LOAN_AMOUNT);
      await loanContract.connect(lender).matchLoan(LOAN_ID);

      const ownerBalanceBefore = await usdtContract.balanceOf(owner.address);
      const expectedFee = (LOAN_AMOUNT * 10n) / 10000n;

      await loanContract.connect(owner).withdrawFees(await usdtContract.getAddress());

      const ownerBalanceAfter = await usdtContract.balanceOf(owner.address);
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(expectedFee);
    });
  });
});
