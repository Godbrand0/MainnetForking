import helpers = require("@nomicfoundation/hardhat-network-helpers");

import { ethers } from "hardhat";

async function removeLiquidity() {
  const AssetHolder = "0xf584f8728b874a6a5c7a8d4d387c9aae9172d621";

  await helpers.impersonateAccount(AssetHolder);
  const impersonatedSigner = await ethers.getSigner(AssetHolder);

  //USDT contract Address
  const USDTAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

  //UNISWAP contract Address
  const UNISWAPAddress = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";

  const UNIRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

  const USDT = await ethers.getContractAt("IERC20", USDTAddress);
  const UNISWAP = await ethers.getContractAt("IERC20", UNISWAPAddress);

  const usdtBal = await USDT.balanceOf(AssetHolder);
  const uniswapBal = await UNISWAP.balanceOf(AssetHolder);

  console.log("################### initial Balance ################");
  console.log(
    "user initial usdt balance: ",
    ethers.formatUnits(usdtBal.toString(), 6)
  );
  console.log(
    "user initial uniswap balance:",
    ethers.formatUnits(uniswapBal.toString(), 18)
  );

  const Router = await ethers.getContractAt("IUniSwap", UNIRouter);

  // DEFINING ARGS

  const USDTAmount = ethers.parseUnits("30000", 6);
  const UNISWAPAmount = ethers.parseUnits("30000", 18);

  const approvalUSDT = await USDT.connect(impersonatedSigner).approve(
    UNIRouter,
    USDTAmount
  );
  const tx = await approvalUSDT.wait();
  console.log("USDT approval receipt", tx);

  const approvalUNISWAP = await UNISWAP.connect(impersonatedSigner).approve(
    UNIRouter,
    UNISWAPAmount
  );
  const tx2 = await approvalUNISWAP.wait();
  console.log("UNISWAP approval receipt", tx2);

  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

  const provideLiquidity = await Router.connect(
    impersonatedSigner
  ).addLiquidity(
    USDTAddress,
    UNISWAPAddress,
    USDTAmount,
    UNISWAPAmount,
    1,
    1,
    impersonatedSigner.address,
    deadline
  );
  const tx3 = await provideLiquidity.wait();
  const USDTBalAfter = await USDT.balanceOf(AssetHolder);
  const UNISWAPBalAfter = await UNISWAP.balanceOf(AssetHolder);

  console.log("Liquidity receipt:", tx3);

  //DEFINING ARGS

  const PAIR_ADDRESS = "0x5ac13261c181a9c3938BfE1b649E65D10F98566B";

  const LP_ADDRESS = await ethers.getContractAt("IERC20", PAIR_ADDRESS);
  const LP_BALANCE = await LP_ADDRESS.balanceOf(AssetHolder);
  console.log(
    "LIQUIDITY POOL TOKENS:",
    ethers.formatUnits(LP_BALANCE.toString(), 4)
  );
  const approvalLP_BALANCE = await LP_ADDRESS.connect(
    impersonatedSigner
  ).approve(UNIRouter, LP_BALANCE);

  const removeAmount = ethers.parseUnits("30", 4);

  const removeLiquidity = await Router.connect(
    impersonatedSigner
  ).removeLiquidity(
    USDTAddress,
    UNISWAPAddress,
    removeAmount,
    1,
    1,
    AssetHolder,
    deadline
  );

  const tx4 = await removeLiquidity.wait();
  console.log("REMOVE LIQUIDITY RECIEPT:", tx4);
  const LP_BALANCE_AFTER = await LP_ADDRESS.balanceOf(AssetHolder);

  console.log("######################## FINAL BALANCE ###################");

  console.log(
    "user final USDT balance: ",
    ethers.formatUnits(USDTBalAfter.toString(), 6)
  );

  console.log(
    "user final UNISWAP balance: ",
    ethers.formatUnits(UNISWAPBalAfter.toString(), 18)
  );

  console.log(
    "user final LP balance: ",
    ethers.formatUnits(LP_BALANCE_AFTER.toString(), 4)
  );
}

removeLiquidity().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
