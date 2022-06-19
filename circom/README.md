# Zuction - Zero-Knowledge Auction

Install the required node modules by running:
```shell
npm install
```
There are two different approach to find the winner and i have created two separate circuit for each:
1. find the winner off chain and generate one proof per losing bid. if we go this way we should use `LessThanWinner`circuit.
to test this circuit with pre-generated sample data run :
```shell
./scripts/run.sh LessThanWinner 14
```
2. another way is to pass all bids to a circuit. this will generate a single proof that winners address is publicly available on its output signal.
to test this circuit with pre-generated sample (10 bids) data run :

```shell
./scripts/run.sh SelectWinner 17
```

***Know limitations***
- all signatures must be valid or proof cannot be generated, if it is possible , we should verify signature somehow in contract before inserting it into smart contract
OR patch the "verify signature circuit" in a way, so it publishes a boolean output whether signature is valid or not
- very inefficient. for 10 bid commitments the `SelectWinner` generates ~57k constraints
