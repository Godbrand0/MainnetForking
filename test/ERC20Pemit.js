import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers.js";

import { expect } from "chai";
import hre from "hardhat";



async function getPermitSignature(wallet, token, spender, value, deadline) {
  const [nonce, name, version, chainId] = await Promise.all([
    token.nonces(wallet.address),
    token.name(),
    "1",
    wallet.getChainId(),
  ]);

  return hre.ethers.utils.splitSignature(
    await wallet._signTypedData(
      {
        name,
        version,
        chainId,
        verifyingContract: token.address,
      },
      {
        Permit: [
          {
            name: "owner",
            type: "address",
          },
          {
            name: "spender",
            type: "address",
          },
          {
            name: "value",
            type: "uint256",
          },
          {
            name: "nonce",
            type: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
          },
        ],
      },
      {
        owner: wallet.address,
        spender,
        value,
        nonce,
        deadline,
      }
    )
  );
}

describe("ERC20Permit", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployERC20Permit() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.ethers.getSigners();

    // const Permit = await hre.ethers.getContractAt("IERC20Permit");
    // const permit = await Permit.deploy();
    const Token = await hre.ethers.getContractFactory("Token");
    const token = await Token.deploy("token", "TOK");
    await token.waitForDeployment();
    await token._mint(owner.address, hre.ethers.parseUnits("100000", 8));

    const Vault = await hre.ethers.getContractFactory("Vault");
    const vault = await Vault.deploy(await token.getAddress());
    await vault.waitForDeployment();

    return { vault, token, owner, otherAccount };
  }

  describe("permit2", function () {
    it("should mint token and permit transfer", async function () {
      const { owner, vault, token } = await loadFixture(deployERC20Permit);

      const amount = 1000;
      //   await token.mint(owner.address, amount)

      const deadline = ethers.constants.MaxUint256;

      const { v, r, s } = await getPermitSignature(
        owner,
        token,
        vault.address,
        amount,
        deadline
      );

      await vault.depositWithPermit(amount, deadline, v, r, s);

      expect(await token.balanceOf(vault.address)).to.equal(amount);
    });
  });
});
