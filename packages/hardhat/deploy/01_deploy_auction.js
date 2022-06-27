const {ethers} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments, getChainId}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  const chainId = await getChainId();
  const verifierContract = await ethers.getContract(
    "LessThanWinnerVerifier",
    deployer
  );

  await deploy("Auction", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    log: true,
    waitConfirmations: 5,
  });
};
module.exports.tags = ["Auction"];
