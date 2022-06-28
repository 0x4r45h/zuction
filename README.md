# Zuction - Zero-Knowledge Auction

Check the [Documentation](DOC.md) for detailed info about project structure.

The project is currently on [Harmony Devnet](https://explorer.ps.hmny.io) and the frontend is hosted on [Surge](https://zuction-dev2.surge.sh).

### Run Project Locally
1. Install the required node modules by running:
```shell
yarn install
```
2. compile circuits, this step will also copy necessary files to hardhat and react-app folders:
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

### Devnet / Production deployment
Step 1 and 2 are same as [Run Locally](#run-project-locally), but instead of spinning your local blockchain do as follows:
#### Deploy contracts: 
in `packages/hardhat` directory:
1. go to hardhat directory `packages/hardhat`
2. modify [Hardhat's config file](packages/hardhat/hardhat.config.js) to add your desired EVM based chain in networks section.
3. run `yarn generate` to create a new **deployer** account. the `mnemonic.txt` is now created in the hardhat directory.
4. run `yarn account` to get address of that account and then send some native funds to that address
5. deploy to desired network with `yarn deploy --network=NETWORK_NAME_HERE`

#### Deploy Front-End:
in `packages/react-app` directory:

1. `.sample.env` to `.env` and set network to desired network (e.g `localhost` or `devnetHarmony`) also add the public address of front-end domain with its protocol (e.g `REACT_APP_PUBLIC_URL=https://example.surge.sh`)
2. run `yarn build`
3. you can deploy the `packages/react-app/build` folder on any webserver. an easy way it to use surge by running `yarn surge`
