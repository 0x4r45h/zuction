# Zuction <!-- omit in toc -->

Zuction is a Zero Knowledge based auction house. it works like [MACI](https://github.com/privacy-scaling-explorations/maci), which help participant keep their bids secret from each other. but the bids are known to the auctioneer. so the auctioneer should be trusted in terms of keeping participant's privacy.   
The current implementation can be called **Optimistic Auction**, which means the auctioneer is considered as honest by default unless someone become suspicious and raise a challenge against the result of auction.


The project is currently on [Harmony Devnet](https://explorer.ps.hmny.io) and the frontend is hosted on [Surge](https://zuction-dev2.surge.sh).

Zuction Devnet link :    

https://zuction-dev2.surge.sh

Zuction Youtube Demo:   

https://youtu.be/GQYInMAj53c

## Table of Contents <!-- omit in toc -->

- [How it Works](#how-it-works)
- [Project Structure](#project-structure)
    - [circom](#circom)
    - [hardhat](#hardhat)
    - [react-app](#react-app)
- [Known Limitations](#known-limitations)

## How It Works
When an auctioneer creates an auction by setting the biding duration and challenge duration. a set of Public-Private Keypair is generated automatically which should be kept safe and in secret. the public key is stored publicly on the contract, available to bidders. in order to someone places a bid, a new keypair should be generated per bidder. an ECDH shared key is created using Auctioneer's Public key and Bidder's Private key. bidder encrypts bid value using this shared key and also sign it with his private key.    
Then a bid **commitment** is created which includes **Bidder's Public Key, Encrypted Bid and Bid's Signature** . this commitment is stored on blockchain in a **Map** as `bidder's_address => commitment`.   

On the other side, the auctioneer can produce the same Shared key using his own private key and bidder's public key. so he can Decrypt bids and find the winning one.

Here is when **Zero-Knowledge** comes into play. when bidding phase ends the auctioneer will announce the winner to blockchain and creates a losingProof for all losing participants, upload it somewhere to be accessible publicly. any interested party can verify proofs.

To prevent auctioneer's announces a wrong person as winner accidentally or intentionally, there is a **Challenge Phase** which starts when the winner is announced. in this phase anyone who can bring a proof that proves the "announced winner" is losing against another address, is able to invalidate the credibility of the auction.   

Also check [Know Limitations](#known-limitations) for more info.

---
## Project Structure

The project is created using [Scaffold-eth](https://github.com/scaffold-eth/scaffold-eth). that's why it has so many components. there are three main folders in `packages` directory:

- circom
- hardhat
- react-app

### circom

The [circom folder](packages/circom) contains all the circuits used in Zuction.   
>The most important here is `circuits/LessThanWinner.circom` which is main circuit of zuciton. also there is an `input.json` file which is an example dataset to test the circuit


### hardhat

The [hardhat folder](packages/hardhat) contains all the smart contracts used in Zuction.
> This is a trivial hardhat project to manage smart contracts. the `LessThanWinner.sol` is automatically generated when circuits compile through `run.sh` script.

### react-app

The [react-app folder](packages/react-app) contains the Zuction frontend.
> Almost all logic is implemented in `src/views` directory. the rest are Scaffold-eth boilerplate code.    
> The `src/contracts` automatically updates on compiling contracts in hardhat using `yarn deploy`
> Also in `public` folder we have `circuit_final.zkey` and `LessThanWinner.wasm` files which again are automatically replaced when circuits compile through `run.sh` script.
---
## Known Limitations:
- The current Implementation is more likely a Proof of Concept. there aren't any token or NFTs involved in auctions. just pure claims by bidders and auctioneer. I believe the core mechanism should be kept as generic as possible and features like NFT function must be added over it.
- Auctioneer can ruin the auction by not releasing all proofs for losing participants. this can be mitigated by forcing an auctioneer to put some collateral during auction creation and then should be able to release it by proving all the generated proofs on chain. but this can cost the auctioneer a lot of gas fees.
- bid commitments all must be valid. we can't just simply skip invalid commitments, because this will give the auctioneer a way to cheat the auction. it can be prevented by generating the bid commitment with help of a circuit on bidders side and verify the commitment on chain before store it.
- There are no strategy for dealing with Equal bids. it should be customizable per auction . for example one auction can have multiple winners. another one would do another round between winners until only one of them win the auction

## TODO
- perform a secure contribution to the circuits