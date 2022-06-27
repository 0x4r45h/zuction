module.exports = async ({getNamedAccounts, deployments, getChainId}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  const chainId = await getChainId();
  const verifierContract =  await deploy("LessThanWinnerVerifier", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    log: true,
    waitConfirmations: 1,
  });
};
module.exports.tags = ["LessThanWinnerVerifier"];
