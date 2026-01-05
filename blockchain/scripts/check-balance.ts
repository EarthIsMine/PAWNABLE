import { ethers } from "hardhat";

async function main() {
  const USDT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const USDC_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  console.log("🔍 토큰 정보 확인 중...\n");

  try {
    const usdt = await ethers.getContractAt("MockUSDT", USDT_ADDRESS);
    const usdc = await ethers.getContractAt("MockUSDT", USDC_ADDRESS);

    const usdtBalance = await usdt.balanceOf(userAddress);
    const usdcBalance = await usdc.balanceOf(userAddress);

    const usdtName = await usdt.name();
    const usdtSymbol = await usdt.symbol();
    const usdtDecimals = await usdt.decimals();

    const usdcName = await usdc.name();
    const usdcSymbol = await usdc.symbol();
    const usdcDecimals = await usdc.decimals();

    console.log("=".repeat(60));
    console.log("USDT 토큰 정보:");
    console.log("=".repeat(60));
    console.log("컨트랙트 주소:", USDT_ADDRESS);
    console.log("이름:", usdtName);
    console.log("심볼:", usdtSymbol);
    console.log("Decimals:", usdtDecimals);
    console.log("잔액:", ethers.formatUnits(usdtBalance, usdtDecimals));

    console.log("\n" + "=".repeat(60));
    console.log("USDC 토큰 정보:");
    console.log("=".repeat(60));
    console.log("컨트랙트 주소:", USDC_ADDRESS);
    console.log("이름:", usdcName);
    console.log("심볼:", usdcSymbol);
    console.log("Decimals:", usdcDecimals);
    console.log("잔액:", ethers.formatUnits(usdcBalance, usdcDecimals));

    console.log("\n" + "=".repeat(60));
    console.log("✅ 토큰이 정상적으로 배포되어 있습니다!");
    console.log("=".repeat(60));

  } catch (error: any) {
    console.error("❌ 에러 발생:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
