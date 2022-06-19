const fs = require("fs");
const solidityRegex = /pragma solidity \^\d+\.\d+\.\d+/

const verifierRegex = /contract Verifier/

let content = fs.readFileSync("./circuits/LessThanWinner/build/LessThanWinner.sol", { encoding: 'utf-8' });
let bumped = content.replace(solidityRegex, 'pragma solidity ^0.8.0');
bumped = bumped.replace(verifierRegex, 'contract LessThanWinnerVerifier');

fs.writeFileSync("./circuits/LessThanWinner/build/LessThanWinner.sol", bumped);