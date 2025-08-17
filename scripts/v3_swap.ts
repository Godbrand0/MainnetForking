import { ethers } from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

async function v3_swap() {
  const AssetHolder = "0xf584f8728b874a6a5c7a8d4d387c9aae9172d621";

  await helpers.impersonateAccount(AssetHolder);
  const impersonatedSigner = await ethers.getSigner(AssetHolder);

  //USDT contract Address
  const USDTAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

  //UNISWAP contract Address
  const UNISWAPAddress = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";

  //UNISWAP_V3_ROUTER address
  const UNISWAP_V3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

  const USDT = await ethers.getContractAt("IERC20", USDTAddress);
  const UNISWAP = await ethers.getContractAt("IERC20", UNISWAPAddress);

  const USDTbal = await USDT.balanceOf(AssetHolder);
  const UNISWAPbal = await UNISWAP.balanceOf(AssetHolder);

  console.log("############### INITIAL BALANCE #############");

  console.log(
    "USDT INITIAL BALANCE:",
    ethers.formatUnits(USDTbal.toString(), 6)
  );
  console.log(
    "UNISWAP INITIAL BALANCE:",
    ethers.formatUnits(UNISWAPbal.toString(), 18)
  );

  const Router = await ethers.getContractAt( "ISwapRouter", UNISWAP_V3_ROUTER);

  // const tokenInContract = await ethers.getContractAt("IERC20", USDTAddress);

  const AmountIn = ethers.parseUnits("1000", 6);
  const AmountSwap = ethers.parseUnits("700", 6);

  const APPROVE_AMOUNT = await USDT.connect(impersonatedSigner).approve(
    UNISWAP_V3_ROUTER,
    AmountIn
  );

  await APPROVE_AMOUNT.wait();
  console.log("approved amount reciept:", APPROVE_AMOUNT);

  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

  const params = {
    tokenIn: USDTAddress,
    tokenOut: UNISWAPAddress,
    fee: 3000, // 0.3% pool
    recipient: AssetHolder,
    deadline,
    amountIn: AmountSwap,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0
  };



  const swapTokens = await Router.connect(impersonatedSigner).exactInputSingle(
params
  );



  const tx3 = await swapTokens.wait();

  console.log("SWAPPED TOKENS:", tx3);

  const usdtBalAfter = await USDT.balanceOf(AssetHolder);
  const UNISWAPBalAfter = await UNISWAP.balanceOf(AssetHolder);

  console.log("######################## FINAL BALANCE ###################");

  console.log(
    "user final USDT balance: ",
    ethers.formatUnits(usdtBalAfter.toString(), 6)
  );
  console.log(
    "user final UNISWAP balance: ",
    ethers.formatUnits(UNISWAPBalAfter.toString(), 18)
  );
}

v3_swap().catch((error) =>{
    console.error(error);
    process.exitCode=1;
    
})
