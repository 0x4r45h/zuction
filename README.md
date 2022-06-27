# Zuction - Zero-Knowledge Auction

1. Install the required node modules by running:
```shell
yarn install
```
2. compile circuits, this step will copy necessary files to hardhat and react-app folders:
```shell
cd packages/circom
chmod u+x ./scripts/run.sh
./scripts/run.sh LessThanWinner 14
```
3. install and start your 👷‍ Hardhat chain:

```bash 
yarn chain
```

4. in a second terminal window, start your 📱 frontend:

```bash
yarn start
```

5.  in a third terminal window, 🛰 deploy your contract:

```bash
yarn deploy
```
> everything you need to build on Ethereum! 🚀

🧪 Quickly experiment with Solidity using a frontend that adapts to your smart contract:

![image](https://user-images.githubusercontent.com/2653167/124158108-c14ca380-da56-11eb-967e-69cde37ca8eb.png)


# 🏄‍♂️ Quick Start

Prerequisites: [Node (v16 LTS)](https://nodejs.org/en/download/) plus [Yarn](https://classic.yarnpkg.com/en/docs/install/) and [Git](https://git-scm.com/downloads)

> clone/fork 🏗 scaffold-eth:

```bash
git clone https://github.com/scaffold-eth/scaffold-eth.git
```

> install and start your 👷‍ Hardhat chain:

```bash
cd scaffold-eth
yarn install
yarn chain
```

> in a second terminal window, start your 📱 frontend:

```bash
cd scaffold-eth
yarn start
```

> in a third terminal window, 🛰 deploy your contract:

```bash
cd scaffold-eth
yarn deploy
```

