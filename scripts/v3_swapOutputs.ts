import { ethers } from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

async function v3_swapOut() {
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

  const Router = await ethers.getContractAt("ISwapRouter", UNISWAP_V3_ROUTER);

  const Approve_Amount = ethers.parseUnits("5000", 6);
  const Approve_out = ethers.parseUnits("2000", 18);

  const APPROVE_AMOUNT = await USDT.connect(impersonatedSigner).approve(
    UNISWAP_V3_ROUTER,
    Approve_Amount
  );

  await APPROVE_AMOUNT.wait();

  console.log("Approved amount receipt:", APPROVE_AMOUNT);

  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

  //   struct ExactOutputParams {
  //         bytes path;
  //         address recipient;
  //         uint256 deadline;
  //         uint256 amountOut;
  //         uint256 amountInMaximum;
  //     }

  function encodePath(tokens: string[], fees: number[]): string {
    if (tokens.length !== fees.length + 1) {
      throw new Error("path/fee lengths do not match");
    }

    let encoded = "0x";
    for (let i = 0; i < fees.length; i++) {
      encoded += tokens[i].slice(2); // strip 0x
      encoded += fees[i].toString(16).padStart(6, "0"); // 3-byte fee
    }
    encoded += tokens[tokens.length - 1].slice(2);
    return encoded.toLowerCase();
  }

  const path = encodePath([USDTAddress, UNISWAPAddress], [3000]); // fee = 0.3%

  const params = {
    path,
    recipient: AssetHolder, // ✅ correct field name
    deadline: deadline, // 10 mins
    amountOut: ethers.parseUnits("100", 18), // want 10 WETH
    amountInMaximum: ethers.parseUnits("5000", 6), // willing to spend max 5000 USDT
  };

  const swapTokens = await Router.connect(impersonatedSigner).exactOutput(
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

v3_swapOut().catch((error) => {
  console.log(error);
  process.exitCode = 1;
});
