import {ethers} from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

async function Swap() {
    const AssetHolder = "0xf584f8728b874a6a5c7a8d4d387c9aae9172d621";

    await helpers.impersonateAccount(AssetHolder);
    const impersonatedSigner = await ethers.getSigner(AssetHolder);

    //USDT contract Address
    const USDTAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

    //UNISWAP contract Address
    const UNISWAPAddress = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";

   

    const UNIRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

     const USDT = await ethers.getContractAt("IERC20", USDTAddress);
    const UNISWAP= await ethers.getContractAt("IERC20", UNISWAPAddress);
    


 

    const usdtBal = await USDT.balanceOf(AssetHolder);
    const uniswapBal = await UNISWAP.balanceOf(AssetHolder);

    console.log("################### initial Balance ################");
    console.log("user initial usdt balance: " , ethers.formatUnits(usdtBal.toString(), 6) );
    console.log("user initial uniswap balance:" , ethers.formatUnits(uniswapBal.toString(), 18));
    
    const Router = await ethers.getContractAt("IUniSwap", UNIRouter);

    //defining args

    const USDTAmount = ethers.parseUnits("50000", 6);
    const MIN_AMOUNT_OUT= ethers.parseUnits("10", 18);

    const approveUSDT = await USDT.connect(impersonatedSigner).approve(UNIRouter,USDTAmount);
   

    const tx = await approveUSDT.wait();
    console.log("USDT approved receipt:", tx);

   
    const deadline = Math.floor(Date.now()/1000) +60 *10;

    const swapTokens = await Router.connect(impersonatedSigner).swapExactTokensForTokens(
        USDTAmount,MIN_AMOUNT_OUT, [USDTAddress,UNISWAPAddress ], impersonatedSigner.address,deadline
    )

    const tx3 = await swapTokens.wait();

    console.log("SWAPPED_TOKENS RECEIPT", tx3);

    const usdtBalAfter = await USDT.balanceOf(AssetHolder);
    const UNISWAPBalAfter = await UNISWAP.balanceOf(AssetHolder);

    console.log("######################## FINAL BALANCE ###################");
    
    
    console.log("user final USDT balance: ", ethers.formatUnits(usdtBalAfter.toString(), 6));
    console.log("user final UNISWAP balance: ", ethers.formatUnits(UNISWAPBalAfter.toString(), 18));
    
    
}

Swap().catch((error) =>{
    console.error(error);
    process.exitCode=1;
    
})