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

### Devnet / Production deployment

> in react-app copy `.env.sample` to `.env` and set network to desired network (e.g `localhost` or `devnetHarmony`)
> 
> 
