import { ethers } from "hardhat";
import * as readline from "readline";

// Utility to prompt for input




async function main() {
  console.log("⏳ Deploying UniswapV2SwapWithPermit contract...");
  const SwapFactory = await ethers.getContractFactory("UniswapV2SwapWithPermit");
  const swapContract = await SwapFactory.deploy();
  await swapContract.waitForDeployment();
  const swapAddress = await swapContract.getAddress();
  console.log(`✅ Contract deployed at: ${swapAddress}`);

  

  // Token and swap details
  const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const amountIn = ethers.parseUnits("100", 6); // 100 USDC
  const amountOutMin = ethers.parseUnits("80", 18); // Minimum 80 DAI expected
  const path = [USDC, DAI];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
  const permitDeadline = deadline;

  // Impersonate a rich USDC holder to fund our wallet on fork
  // You can replace this with your preferred holder address
  const HOLDER = "0x5069A64BC6616dEC1584eE0500B7813A9B680F7E";
  await ethers.provider.send("hardhat_impersonateAccount", [HOLDER]);
  const holderSigner = await ethers.getSigner(HOLDER);

  // Transfer 200 USDC to wallet so it can approve and swap
  const usdc = await ethers.getContractAt("IERC20Permit", USDC);
  const transferTx = await usdc.connect(holderSigner).transfer(wallet.address, ethers.parseUnits("200", 6));
  await transferTx.wait();
  console.log(`✅ Transferred 200 USDC from holder ${HOLDER} to your wallet`);

  // Fund your wallet with ETH for gas from the first signer (hardhat default)
  const [funder] = await ethers.getSigners();
  await funder.sendTransaction({ to: wallet.address, value: ethers.parseEther("2") });
  console.log("✅ Sent 2 ETH to wallet for gas");

  // Get USDC nonce for permit
  const nonce = await usdc.nonces(wallet.address);

  // EIP-712 domain for USDC permit
  const domain = {
    name: "USD Coin",
    version: "2",
    chainId: (await ethers.provider.getNetwork()).chainId,
    verifyingContract: USDC,
  };

  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const values = {owner: wallet.address,spender: swapAddress,value: amountIn,nonce,
deadline: permitDeadline,};

  console.log("\n✍️ Signing permit (off-chain)...");
  const signature = await wallet.signTypedData(domain, types, values);
  const { v, r, s } = ethers.Signature.from(signature);
  console.log("✅ Permit signed!");

  // Call swapWithPermit in a single transaction
  console.log("🚀 Sending swapWithPermit transaction...");

  const tx = await swapContract.connect(wallet).swapWithPermit(USDC,amountIn,amountOutMin,path,wallet.address,deadline,permitDeadline,v,r,s);


  console.log(`✅ Swap completed in tx: ${tx.hash}`);
  const receipt = await tx.wait();
    console.log(`⏱️ Transaction confirmed in block ${receipt?.blockNumber}`);
  // Check final DAI balance
  const dai = await ethers.getContractAt("IERC20Permit", DAI);
  const daiBalance = await dai.balanceOf(wallet.address);
  console.log(`🎉 Wallet DAI balance after swap: ${ethers.formatUnits(daiBalance, 18)} DAI`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});