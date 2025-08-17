I'll provide a complete solution for a Loot Box smart contract using Solidity, including testing and interaction setup with Hardhat. The contract will use Chainlink VRF for randomness, support multiple reward types, and include a weighted chance system. I'll break this down into the smart contract code, deployment script, and test suite, followed by instructions to interact with it.

---

### Smart Contract: LootBox.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

contract LootBox is VRFConsumerBaseV2 {
    VRFCoordinatorV2Interface COORDINATOR;

    // Chainlink VRF variables
    uint64 subscriptionId;
    address vrfCoordinator = 0x271682DEB8C4E0901D1a1550aD2e64D568E69909; // Example: Sepolia
    bytes32 keyHash = 0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef;
    uint32 callbackGasLimit = 100000;
    uint16 requestConfirmations = 3;
    uint32 numWords = 1;

    // Loot box variables
    uint256 public boxPrice = 0.01 ether;
    address public owner;
    bool public paused;

    // Reward types
    enum RewardType { ERC20, ERC721, ERC1155, NONE }
    struct Reward {
        RewardType rewardType;
        address tokenContract;
        uint256 tokenId; // For ERC721/ERC1155
        uint256 amount; // For ERC20/ERC1155
        uint256 weight; // Probability weight
    }

    Reward[] public rewards;
    uint256 public totalWeight;

    // Request tracking
    struct Request {
        address user;
        uint256 randomWord;
        bool fulfilled;
    }
    mapping(uint256 => Request) public requests;
    uint256 public requestCounter;

    // Events
    event BoxOpened(address indexed user, uint256 requestId);
    event RewardAssigned(address indexed user, uint256 requestId, RewardType rewardType, address tokenContract, uint256 tokenId, uint256 amount);
    event RewardAdded(RewardType rewardType, address tokenContract, uint256 tokenId, uint256 amount, uint256 weight);
    event Paused(bool paused);
    event BoxPriceUpdated(uint256 newPrice);
    event FundsWithdrawn(address indexed owner, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }

    constructor(uint64 _subscriptionId) VRFConsumerBaseV2(vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        subscriptionId = _subscriptionId;
        owner = msg.sender;
        paused = false;
    }

    // Add a reward to the loot box
    function addReward(
        RewardType _rewardType,
        address _tokenContract,
        uint256 _tokenId,
        uint256 _amount,
        uint256 _weight
    ) external onlyOwner {
        require(_weight > 0, "Weight must be positive");
        rewards.push(Reward({
            rewardType: _rewardType,
            tokenContract: _tokenContract,
            tokenId: _tokenId,
            amount: _amount,
            weight: _weight
        }));
        totalWeight += _weight;
        emit RewardAdded(_rewardType, _tokenContract, _tokenId, _amount, _weight);
    }

    // Open a loot box
    function openBox() external payable whenNotPaused {
        require(msg.value >= boxPrice, "Insufficient payment");
        require(totalWeight > 0, "No rewards configured");

        uint256 requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );

        requests[requestId] = Request({
            user: msg.sender,
            randomWord: 0,
            fulfilled: false
        });
        requestCounter++;
        emit BoxOpened(msg.sender, requestId);
    }

    // Chainlink VRF callback
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        require(!requests[_requestId].fulfilled, "Request already fulfilled");
        requests[_requestId].randomWord = _randomWords[0];
        requests[_requestId].fulfilled = true;

        address user = requests[_requestId].user;
        Reward memory reward = _selectReward(_randomWords[0]);

        if (reward.rewardType != RewardType.NONE) {
            _distributeReward(user, reward);
        }

        emit RewardAssigned(user, _requestId, reward.rewardType, reward.tokenContract, reward.tokenId, reward.amount);
    }

    // Select reward based on weighted random
    function _selectReward(uint256 _randomWord) private view returns (Reward memory) {
        if (rewards.length == 0) {
            return Reward(RewardType.NONE, address(0), 0, 0, 0);
        }

        uint256 random = _randomWord % totalWeight;
        uint256 currentWeight = 0;

        for (uint256 i = 0; i < rewards.length; i++) {
            currentWeight += rewards[i].weight;
            if (random < currentWeight) {
                return rewards[i];
            }
        }

        return Reward(RewardType.NONE, address(0), 0, 0, 0);
    }

    // Distribute the reward to the user
    function _distributeReward(address _user, Reward memory _reward) private {
        if (_reward.rewardType == RewardType.ERC20) {
            IERC20(_reward.tokenContract).transfer(_user, _reward.amount);
        } else if (_reward.rewardType == RewardType.ERC721) {
            IERC721(_reward.tokenContract).safeTransferFrom(address(this), _user, _reward.tokenId);
        } else if (_reward.rewardType == RewardType.ERC1155) {
            IERC1155(_reward.tokenContract).safeTransferFrom(address(this), _user, _reward.tokenId, _reward.amount, "");
        }
    }

    // Owner functions
    function setBoxPrice(uint256 _newPrice) external onlyOwner {
        boxPrice = _newPrice;
        emit BoxPriceUpdated(_newPrice);
    }

    function pause(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner).transfer(balance);
        emit FundsWithdrawn(owner, balance);
    }

    // View function to check request status
    function getRequestStatus(uint256 _requestId) external view returns (bool fulfilled, uint256 randomWord, address user) {
        Request memory request = requests[_requestId];
        return (request.fulfilled, request.randomWord, request.user);
    }
}
```

---

### Hardhat Setup

1. **Initialize Hardhat Project**:
   ```bash
   npx hardhat init
   ```
   Choose "Create a JavaScript project" and install dependencies.

2. **Install Dependencies**:
   ```bash
   npm install @openzeppelin/contracts @chainlink/contracts hardhat @nomiclabs/hardhat-ethers ethers
   ```

3. **Hardhat Configuration** (`hardhat.config.js`):
   ```javascript
   require("@nomiclabs/hardhat-ethers");

   module.exports = {
     solidity: "0.8.20",
     networks: {
       sepolia: {
         url: "YOUR_SEPOLIA_RPC_URL", // e.g., Infura or Alchemy
         accounts: ["YOUR_PRIVATE_KEY"]
       }
     }
   };
   ```

4. **Deployment Script** (`scripts/deploy.js`):
   ```javascript
   const { ethers } = require("hardhat");

   async function main() {
     const [deployer] = await ethers.getSigners();
     console.log("Deploying contracts with:", deployer.address);

     const subscriptionId = YOUR_CHAINLINK_SUBSCRIPTION_ID; // Create via Chainlink VRF dashboard
     const LootBox = await ethers.getContractFactory("LootBox");
     const lootBox = await LootBox.deploy(subscriptionId);
     await lootBox.deployed();

     console.log("LootBox deployed to:", lootBox.address);
   }

   main().catch((error) => {
     console.error(error);
     process.exitCode = 1;
   });
   ```

5. **Test Suite** (`test/LootBox.test.js`):
   ```javascript
   const { expect } = require("chai");
   const { ethers } = require("hardhat");

   describe("LootBox", function () {
     let lootBox, owner, user1, user2, mockERC20, mockERC721, mockERC1155;
     const boxPrice = ethers.utils.parseEther("0.01");

     beforeEach(async function () {
       [owner, user1, user2] = await ethers.getSigners();

       // Deploy mock tokens
       const MockERC20 = await ethers.getContractFactory("MockERC20");
       mockERC20 = await MockERC20.deploy("Mock Token", "MTK", ethers.utils.parseEther("1000"));
       await mockERC20.deployed();

       const MockERC721 = await ethers.getContractFactory("MockERC721");
       mockERC721 = await MockERC721.deploy("Mock NFT", "MNFT");
       await mockERC721.deployed();

       const MockERC1155 = await ethers.getContractFactory("MockERC1155");
       mockERC1155 = await MockERC1155.deploy();
       await mockERC1155.deployed();

       // Deploy LootBox
       const LootBox = await ethers.getContractFactory("LootBox");
       lootBox = await LootBox.deploy(1); // Mock subscriptionId
       await lootBox.deployed();

       // Fund contract with tokens
       await mockERC20.transfer(lootBox.address, ethers.utils.parseEther("100"));
       await mockERC721.mint(lootBox.address, 1);
       await mockERC1155.mint(lootBox.address, 1, 10, "0x");

       // Add rewards
       await lootBox.addReward(0, mockERC20.address, 0, ethers.utils.parseEther("10"), 50); // ERC20
       await lootBox.addReward(1, mockERC721.address, 1, 1, 30); // ERC721
       await lootBox.addReward(2, mockERC1155.address, 1, 5, 20); // ERC1155
     });

     it("should allow user to open a box", async function () {
       await expect(lootBox.connect(user1).openBox({ value: boxPrice }))
         .to.emit(lootBox, "BoxOpened")
         .withArgs(user1.address, 1);
     });

     it("should revert if payment is insufficient", async function () {
       await expect(lootBox.connect(user1).openBox({ value: ethers.utils.parseEther("0.005") }))
         .to.be.revertedWith("Insufficient payment");
     });

     it("should assign a reward after VRF fulfillment", async function () {
       // Mock VRF fulfillment
       await lootBox.connect(user1).openBox({ value: boxPrice });
       await lootBox.fulfillRandomWords(1, [12345]); // Mock random word

       const { fulfilled } = await lootBox.getRequestStatus(1);
       expect(fulfilled).to.be.true;
     });

     it("should distribute ERC20 reward", async function () {
       await lootBox.connect(user1).openBox({ value: boxPrice });
       await lootBox.fulfillRandomWords(1, [10]); // Random word hits ERC20 (weight 50)

       const balance = await mockERC20.balanceOf(user1.address);
       expect(balance).to.equal(ethers.utils.parseEther("10"));
     });

     it("should pause and unpause contract", async function () {
       await lootBox.pause(true);
       await expect(lootBox.connect(user1).openBox({ value: boxPrice }))
         .to.be.revertedWith("Contract paused");

       await lootBox.pause(false);
       await expect(lootBox.connect(user1).openBox({ value: boxPrice }))
         .to.not.be.reverted;
     });

     it("should allow owner to withdraw funds", async function () {
       await lootBox.connect(user1).openBox({ value: boxPrice });
       const initialBalance = await ethers.provider.getBalance(owner.address);

       await lootBox.withdraw();
       const finalBalance = await ethers.provider.getBalance(owner.address);
       expect(finalBalance).to.be.above(initialBalance);
     });
   });

   // Mock token contracts for testing
   const MockERC20 = `
     // SPDX-License-Identifier: MIT
     pragma solidity ^0.8.20;
     import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
     contract MockERC20 is ERC20 {
       constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
         _mint(msg.sender, initialSupply);
       }
     }
   `;

   const MockERC721 = `
     // SPDX-License-Identifier: MIT
     pragma solidity ^0.8.20;
     import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
     contract MockERC721 is ERC721 {
       constructor(string memory name, string memory symbol) ERC721(name, symbol) {}
       function mint(address to, uint256 tokenId) public {
         _mint(to, tokenId);
       }
     }
   `;

   const MockERC1155 = `
     // SPDX-License-Identifier: MIT
     pragma solidity ^0.8.20;
     import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
     contract MockERC1155 is ERC1155 {
       constructor() ERC1155("") {}
       function mint(address to, uint256 id, uint256 amount, bytes memory data) public {
         _mint(to, id, amount, data);
       }
     }
   `;
   ```

6. **Run Tests**:
   ```bash
   npx hardhat test
   ```

---

### Interacting with the Contract

1. **Deploy the Contract**:
   - Replace `YOUR_SEPOLIA_RPC_URL`, `YOUR_PRIVATE_KEY`, and `YOUR_CHAINLINK_SUBSCRIPTION_ID` in `hardhat.config.js` and `deploy.js`.
   - Fund your Chainlink VRF subscription with LINK tokens.
   - Run:
     ```bash
     npx hardhat run scripts/deploy.js --network sepolia
     ```

2. **Interact Using Hardhat Console**:
   ```bash
   npx hardhat console --network sepolia
   ```
   ```javascript
   const LootBox = await ethers.getContractFactory("LootBox");
   const lootBox = await LootBox.attach("DEPLOYED_CONTRACT_ADDRESS");

   // Add a reward
   await lootBox.addReward(0, "ERC20_ADDRESS", 0, ethers.utils.parseEther("10"), 50);

   // Open a box
   await lootBox.openBox({ value: ethers.utils.parseEther("0.01") });

   // Check request status
   const status = await lootBox.getRequestStatus(1);
   console.log(status);

   // Owner: Update box price
   await lootBox.setBoxPrice(ethers.utils.parseEther("0.02"));

   // Owner: Withdraw funds
   await lootBox.withdraw();
   ```

3. **Using Etherscan** (on Sepolia):
   - Verify the contract on Etherscan to interact via the web interface.
   - Use the "Write Contract" tab to call functions like `openBox`, `addReward`, etc.

4. **Mock VRF for Local Testing**:
   - Since Chainlink VRF requires a live network, use a mock VRFCoordinator for local testing:
     ```solidity
     // Mock VRFCoordinator contract
     contract MockVRFCoordinator {
       function requestRandomWords(
         bytes32, uint64, uint16, uint32, uint32
       ) external returns (uint256) {
         return 1;
       }
       function fulfillRandomWords(uint256 requestId, address consumer, uint256[] memory randomWords) external {
         LootBox(consumer).fulfillRandomWords(requestId, randomWords);
       }
     }
     ```
   - Deploy the mock VRFCoordinator and update the `vrfCoordinator` address in the contract for local testing.

---

### Notes
- **Chainlink VRF**: Ensure the subscription is funded with LINK and the contract is added as a consumer in the Chainlink VRF dashboard.
- **Weighted Randomness**: The contract uses a cumulative weight system for reward selection, ensuring fair probability distribution.
- **Security**: The contract includes pause functionality and access control (`onlyOwner`).
- **Testing**: The test suite covers key functionalities, but you may need to mock VRF responses locally since Hardhat doesn't natively support Chainlink VRF.
- **Real-World Deployment**: Use a testnet like Sepolia for deployment and interaction, as mainnet requires real ETH and LINK.

If you need further clarification or additional features (e.g., batch reward distribution, gas optimization), let me know!


keyhash