import helper = require("@nomicfoundation/hardhat-network-helpers");
import { ethers } from "hardhat";

async function SwapEth() {
  const AssetHolder = "0xf584f8728b874a6a5c7a8d4d387c9aae9172d621";

  await helper.impersonateAccount(AssetHolder);
  const impersonatedSigner = await ethers.getSigner(AssetHolder);

  //WETH contract address

  const wethAdress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

  //UNISWAP contract Address
  const UNISWAPAddress = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";

  const UNIRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

  const WETH = await ethers.getContractAt("IERC20", wethAdress);
  const UNISWAP = await ethers.getContractAt("IERC20", UNISWAPAddress);

  const WETHbal = await WETH.balanceOf(AssetHolder);
  const UNISWAPbal = await UNISWAP.balanceOf(AssetHolder);

  console.log("################## initial balance ###################");

  console.log(
    "user initial WETH balance",
    ethers.formatUnits(WETHbal.toString(), 18)
  );
  console.log(
    "user initial UNISWAP balance",
    ethers.formatUnits(UNISWAPbal.toString(), 18)
  );

  const Router = await ethers.getContractAt("IUniSwap", UNIRouter);

  const UNISWAPAmount = ethers.parseUnits("200", 18);

  const UNISWAPApprove = await UNISWAP.connect(impersonatedSigner).approve(
    UNIRouter,
    UNISWAPAmount
  );

  const tx = await UNISWAPApprove.wait();

  console.log("Approval receipt", tx);

  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

  const SwapEth = await Router.connect(
    impersonatedSigner
  ).swapETHForExactTokens(
    UNISWAPAmount,
    [wethAdress, UNISWAPAddress],
    AssetHolder,
    deadline,
    { value: ethers.parseEther("1") }
  );

  const tx3 = await SwapEth.wait();
  console.log("swap eth receipt", tx3);

  const WETHBalAfter = await WETH.balanceOf(AssetHolder);
  const UNISWAPBalAfter = await UNISWAP.balanceOf(AssetHolder);

  console.log(
    "############################# FINAL BALANCE ###########################"
  );
  console.log(
    "user final WETH balance",
    ethers.formatUnits(WETHBalAfter.toString(), 18)
  );
  console.log(
    "user final UNISWAP balance",
    ethers.formatUnits(UNISWAPBalAfter.toString(), 18)
  );
}

SwapEth().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
