import { ethers } from "hardhat";

/**
 * Setup test wallet with USDT and NFTs for testing
 */
async function main() {
  console.log("🔧 Setting up test wallet...\n");

  // Get contract addresses from environment or use deployed addresses
  const USDT_ADDRESS = process.env.USDT_CONTRACT_ADDRESS || "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1";
  const NFT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS || "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE";

  // Get signers (Hardhat provides 20 test accounts)
  const [deployer, testUser1, testUser2] = await ethers.getSigners();

  console.log("📍 Deployer:", deployer.address);
  console.log("👤 Test User 1:", testUser1.address);
  console.log("👤 Test User 2:", testUser2.address, "\n");

  // Connect to contracts
  const usdt = await ethers.getContractAt("MockUSDT", USDT_ADDRESS);
  const nft = await ethers.getContractAt("PawnableNFT", NFT_ADDRESS);

  // 1. Mint USDT to test users (1,000 USDT each)
  console.log("💵 Minting USDT...");
  const usdtAmount = ethers.parseUnits("1000", 6); // 1000 USDT (6 decimals)
  
  await usdt.transfer(testUser1.address, usdtAmount);
  console.log(`✅ Sent 1,000 USDT to ${testUser1.address}`);
  
  await usdt.transfer(testUser2.address, usdtAmount);
  console.log(`✅ Sent 1,000 USDT to ${testUser2.address}\n`);

  // 2. Mint NFTs to test user 1 (borrower)
  console.log("🎨 Minting NFTs to Test User 1...");

  for (let i = 0; i < 3; i++) {
    const uri = `https://pawnable.io/nft/${i}`;
    const tx = await nft.mint(testUser1.address, uri);
    const receipt = await tx.wait();

    // Get token ID from event
    const event = receipt?.logs.find((log: any) => {
      try {
        const parsed = nft.interface.parseLog(log);
        return parsed?.name === "NFTMinted";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = nft.interface.parseLog(event);
      const tokenId = parsed?.args[1];
      console.log(`✅ Minted NFT #${tokenId} to ${testUser1.address}`);
    }
  }

  // 3. Check balances
  console.log("\n📊 Final Balances:");
  console.log("==========================================");
  
  const user1USDT = await usdt.balanceOf(testUser1.address);
  const user2USDT = await usdt.balanceOf(testUser2.address);
  const user1NFTBalance = await nft.balanceOf(testUser1.address);
  
  console.log(`User 1 USDT: ${ethers.formatUnits(user1USDT, 6)} USDT`);
  console.log(`User 2 USDT: ${ethers.formatUnits(user2USDT, 6)} USDT`);
  console.log(`User 1 NFTs: ${user1NFTBalance} NFTs`);
  console.log("==========================================\n");

  console.log("🎉 Test wallet setup complete!");
  console.log("\n💡 Use these addresses to test:");
  console.log("Borrower (has NFTs):", testUser1.address);
  console.log("Lender (has USDT):  ", testUser2.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Setup failed:");
    console.error(error);
    process.exit(1);
  });
