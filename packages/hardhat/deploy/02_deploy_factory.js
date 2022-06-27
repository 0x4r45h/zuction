const {ethers} = require("hardhat");

const localChainId = "31337";
module.exports = async ({getNamedAccounts, deployments, getChainId}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  const chainId = await getChainId();
  const verifierContract = await ethers.getContract(
    "LessThanWinnerVerifier",
    deployer
  );
  const auctionContract = await ethers.getContract("Auction", deployer);

  await deploy("AuctionFactory", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    args: [
      auctionContract.address,
      verifierContract.address,
    ],
    log: true,
    waitConfirmations: 5,
  });

};
module.exports.tags = ["AuctionFactory"];
