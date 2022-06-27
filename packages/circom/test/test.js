const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const { groth16, plonk } = require("snarkjs");

function unstringifyBigInts(o) {
    if ((typeof(o) == "string") && (/^[0-9]+$/.test(o) ))  {
        return BigInt(o);
    } else if ((typeof(o) == "string") && (/^0x[0-9a-fA-F]+$/.test(o) ))  {
        return BigInt(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyBigInts);
    } else if (typeof o == "object") {
        if (o===null) return null;
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = unstringifyBigInts(o[k]);
        });
        return res;
    } else {
        return o;
    }
}


describe("LessThanWinner with Groth16", function () {

    beforeEach(async function () {
        Verifier = await ethers.getContractFactory("LessThanWinnerVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });


    it.only("Should return true for correct proof", async function () {
        const read_file = await fs.readFileSync('circuits/LessThanWinner/input.json').toString();
        const inp = JSON.parse(read_file);
        // console.log(JSON.parse(read_file));
        // return;
        const { proof, publicSignals } = await groth16.fullProve(inp, "circuits/LessThanWinner/build/LessThanWinner_js/LessThanWinner.wasm","circuits/LessThanWinner/build/circuit_final.zkey");
        // print the only public signal of the contract which is output
        // console.log('1x2x3 =',publicSignals[0]);

        const editedPublicSignals = unstringifyBigInts(publicSignals);
        const editedProof = unstringifyBigInts(proof);
        const calldata = await groth16.exportSolidityCallData(editedProof, editedPublicSignals);
        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());
        console.log(calldata);
        console.log(argv);
        const a = [argv[0], argv[1]];
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        const c = [argv[6], argv[7]];
        const Input = argv.slice(8);

        expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
    });
});
