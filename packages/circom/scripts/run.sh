#!/bin/bash
# pass the circuit name as argument without .circom extension
set -e
if [ -z "$1" ]
  then
    echo "No argument supplied";
    exit
fi
tau_size=${2:-10}
powersOfTau="powersOfTau28_hez_final_${tau_size}"
if [ ! -f ./circuits/$powersOfTau.ptau ]; then
    echo "Downloading ${powersOfTau}.ptau"
    wget https://hermez.s3-eu-west-1.amazonaws.com/$powersOfTau.ptau -O ./circuits/$powersOfTau.ptau
fi
#circuit_name="LessThan10"
circuit_name=$1
circuit_name_js="${circuit_name}_js"
cd circuits/$circuit_name
mkdir -p build

echo "Compiling ${circuit_name}.circom..."

# compile circuit

circom $circuit_name.circom --r1cs --wasm --sym -o build
snarkjs r1cs info build/$circuit_name.r1cs

# Start a new zkey and make a contribution

snarkjs groth16 setup build/$circuit_name.r1cs ../$powersOfTau.ptau build/circuit_0000.zkey
snarkjs zkey contribute build/circuit_0000.zkey build/circuit_final.zkey --name="1st Contributor Name" -v -e="my random"
snarkjs zkey export verificationkey build/circuit_final.zkey build/verification_key.json

##### add these to notes :
### generate witness by providing input:
node build/$circuit_name_js/generate_witness.js build/$circuit_name_js/$circuit_name.wasm input.json build/witness.wtns
### export witness to json
snarkjs wtns export json build/witness.wtns build/witness.json
### generate proof
snarkjs groth16 prove build/circuit_final.zkey  build/witness.wtns build/proof.json build/public.json
### or by using fullprove command  create witness and prove in same command
#snarkjs groth16 fullprove input.json circuit.wasm circuit_final.zkey proof.json public.json

### verify proof
snarkjs groth16 verify build/verification_key.json build/public.json build/proof.json

# generate solidity contract
snarkjs zkey export solidityverifier build/circuit_final.zkey build/$circuit_name.sol
snarkjs zkey export soliditycalldata build/public.json build/proof.json
cd ../..
node ./scripts/bump-solidity-$circuit_name.js
cp circuits/"$circuit_name"/build/$circuit_name.sol ../hardhat/contracts
cp circuits/"$circuit_name"/build/circuit_final.zkey ../react-app/public
cp circuits/"$circuit_name"/build/$circuit_name_js/$circuit_name.wasm  ../react-app/public
