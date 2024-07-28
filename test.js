const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTStaking", function () {
  let NFT, nft, RewardToken, rewardToken, NFTStaking, staking, owner, addr1, addr2;

  beforeEach(async function () {
    // Get the ContractFactories and Signers here.
    [owner, addr1, addr2, _] = await ethers.getSigners();

    NFT = await ethers.getContractFactory("ERC721Mock");
    RewardToken = await ethers.getContractFactory("ERC20Mock");
    NFTStaking = await ethers.getContractFactory("NFTStaking");

    // Deploy the mock NFT and RewardToken contracts
    nft = await NFT.deploy("MockNFT", "MNFT");
    rewardToken = await RewardToken.deploy("RewardToken", "RWT", ethers.utils.parseUnits("1000000", 18));

    await nft.deployed();
    await rewardToken.deployed();

    // Mint some NFTs and reward tokens for testing
    await nft.mint(addr1.address, 1);
    await nft.mint(addr1.address, 2);
    await rewardToken.mint(staking.address, ethers.utils.parseUnits("100000", 18));

    // Deploy the NFTStaking contract
    staking = await NFTStaking.deploy(
      owner.address,
      nft.address,
      rewardToken.address,
      ethers.utils.parseUnits("1", 18), // 1 token per block
      10, // unbondingPeriod in blocks
      5 // rewardDelayPeriod in blocks
    );

    await staking.deployed();
  });

  describe("Staking", function () {
    it("should allow users to stake NFTs", async function () {
      await nft.connect(addr1).approve(staking.address, 1);
      await staking.connect(addr1).stake(1);

      const stakeInfo = await staking.stakes(addr1.address, 0);
      expect(stakeInfo.tokenId).to.equal(1);
      expect(stakeInfo.stakedAt).to.be.a("number");
    });

    it("should not allow staking without approval", async function () {
      await expect(staking.connect(addr1).stake(2)).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
    });
  });

  describe("Unstaking", function () {
    beforeEach(async function () {
      await nft.connect(addr1).approve(staking.address, 1);
      await staking.connect(addr1).stake(1);
    });

    it("should allow users to unstake NFTs after unbonding period", async function () {
      // Simulate time passing
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine", []);

      await staking.connect(addr1).unstake(1);

      expect(await nft.ownerOf(1)).to.equal(addr1.address);
    });

    it("should not allow unstaking before the unbonding period is over", async function () {
      await expect(staking.connect(addr1).unstake(1)).to.be.revertedWith("NFTStaking: Unbonding period not over");
    });
  });

  describe("Claiming Rewards", function () {
    beforeEach(async function () {
      await nft.connect(addr1).approve(staking.address, 1);
      await staking.connect(addr1).stake(1);
    });

    it("should allow users to claim rewards after reward delay period", async function () {
      // Simulate time passing
      await ethers.provider.send("evm_increaseTime", [5]);
      await ethers.provider.send("evm_mine", []);

      await staking.connect(addr1).claimRewards();
      const balance = await rewardToken.balanceOf(addr1.address);
      expect(balance).to.equal(ethers.utils.parseUnits("5", 18)); // 1 token per block
    });

    it("should not allow claiming rewards before the delay period", async function () {
      await expect(staking.connect(addr1).claimRewards()).to.be.reverted;
    });
  });

  describe("Admin Functions", function () {
    it("should allow owner to set reward rate", async function () {
      await staking.setRewardRate(ethers.utils.parseUnits("2", 18));
      expect(await staking.rewardRate()).to.equal(ethers.utils.parseUnits("2", 18));
    });

    it("should not allow non-owner to set reward rate", async function () {
      await expect(staking.connect(addr1).setRewardRate(ethers.utils.parseUnits("2", 18))).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should allow owner to pause and unpause staking", async function () {
      await staking.pauseStaking();
      expect(await staking.paused()).to.be.true;

      await staking.unpauseStaking();
      expect(await staking.paused()).to.be.false;
    });

    it("should not allow non-owner to pause and unpause staking", async function () {
      await expect(staking.connect(addr1).pauseStaking()).to.be.revertedWith("Ownable: caller is not the owner");
      await staking.pauseStaking();
      await expect(staking.connect(addr1).unpauseStaking()).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
