import { ethers } from "hardhat";

async function main() {
  const usdtAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  try {
    // 컨트랙트 코드 확인
    const code = await ethers.provider.getCode(usdtAddress);
    console.log("컨트랙트 코드 존재:", code !== "0x");

    if (code === "0x") {
      console.log("❌ 토큰 컨트랙트가 배포되지 않았습니다!");
      return;
    }

    // 토큰 정보 확인
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdt = MockUSDT.attach(usdtAddress);

    const name = await usdt.name();
    const symbol = await usdt.symbol();
    const decimals = await usdt.decimals();
    const totalSupply = await usdt.totalSupply();

    console.log("\n✅ USDT 토큰 정보:");
    console.log("주소:", usdtAddress);
    console.log("이름:", name);
    console.log("심볼:", symbol);
    console.log("Decimals:", decimals);
    console.log("총 공급량:", ethers.formatUnits(totalSupply, decimals));

  } catch (error) {
    console.error("❌ 에러:", error);
  }
}

main().catch(console.error);
