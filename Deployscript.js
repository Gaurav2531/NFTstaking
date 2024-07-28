const { ethers } = require("hardhat");

async function main() {
    // Define the addresses and parameters
    const ownerAddress = "0xD733B8fDcFaFf240c602203D574c05De12ae358C";
    const nftAddress = "0x20eE7B720f4E4c4FFcB00C4065cdae55271aECCa";
    const rewardTokenAddress = "0x58730ae0FAA10d73b0cDdb5e7b87C3594f7a20CB";
    const rewardRate = ethers.utils.parseUnits("1", 18); // 1 token per block
    const unbondingPeriod = 10; // Unbonding period in blocks
    const rewardDelayPeriod = 5; // Reward delay period in blocks

    // Deploy the NFTStaking contract
    const NFTStaking = await ethers.getContractFactory("NFTStaking");
    const stakingContract = await NFTStaking.deploy(
        ownerAddress,
        nftAddress,
        rewardTokenAddress,
        rewardRate,
        unbondingPeriod,
        rewardDelayPeriod
    );

    await stakingContract.deployed();

    console.log("NFTStaking contract deployed to:", stakingContract.address);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
