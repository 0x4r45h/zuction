// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract Auction is Initializable {
    // contract address of our circuit verifier
    address public verifierContractAddress;

    enum AuctionState {
        Live,
        Challenge,
        Complete,
        Invalid
    }
    AuctionState public state;

    struct PubKey {
        uint256 x;
        uint256 y;
    }

    address public auctioneer;

    PubKey public auctioneerPubkey;

    uint256 public biddingEnd;
    uint256 public challengeDuration;
    uint256 public challengeEnd;
    //TODO : address is saved in three different places, improve this
    struct Commitment {
        address addr;
        PubKey pubKey;
        uint256[2] encrypted;
        uint256[3] signature;
    }

    struct LoserProof {
        address addr;
        uint[2]  a;
        uint[2][2]  b;
        uint[2]  c;
        uint[14] input;
    }
    struct UniqueCounter {
        uint count;
        mapping (address => bool) is_seen;
    }
    UniqueCounter looserSet;

    uint public bidsCount;
    address[] public keys;
    mapping(address => Commitment) public commitments;

    address public winner;

    function initialize(
        address _auctioneer,
        uint256 _pubKeyX,
        uint256 _pubKeyY,
        uint256 _biddingPeriod,
        uint256 _challengeDuration,
        address _verifierContract
    //white listed address
    ) public initializer {
        auctioneer = _auctioneer;
        biddingEnd = block.timestamp + _biddingPeriod;
        auctioneerPubkey.x = _pubKeyX;
        auctioneerPubkey.y = _pubKeyY;
        challengeDuration = _challengeDuration;
        verifierContractAddress = _verifierContract;
    }

    function bid(uint256 pubKeyX, uint256 pubKeyY, uint256[2] memory commitment, uint256[3] memory signature) public onlyState(AuctionState.Live) {
        address _address = msg.sender;

        require(block.timestamp < biddingEnd, "Biding time is finished");
        // check not voted before
        require(commitments[_address].addr != _address, "already voted with this address");
        keys.push(_address);
        commitments[_address] = Commitment(_address, PubKey(pubKeyX, pubKeyY), commitment, signature);
        bidsCount++;
    }

    function getBids() public view returns (Commitment[] memory) {
        Commitment[] memory _bids = new Commitment[](bidsCount);
        for (uint i = 0; i < bidsCount; i++) {
            address _a = keys[i];
            Commitment storage _c = commitments[_a];
            _bids[i] = _c;
        }
        return _bids;
    }

    function announceWinner(address _winner) public onlyAuctioneer onlyState(AuctionState.Live) {
        // after bid time ends
        require(block.timestamp > biddingEnd, "Biding is not finished yet");
        state = AuctionState.Challenge;
        challengeEnd = block.timestamp + challengeDuration;
        winner = _winner;
    }
    function setWinner(address _winnerAddr, LoserProof[] calldata _proofs) public onlyAuctioneer onlyState(AuctionState.Live) {
        // after bid time ends
        require(block.timestamp > biddingEnd, "Biding is not finished yet");

        Commitment storage _winner = commitments[_winnerAddr];
        for (uint i = 0; i < _proofs.length; i++) {
            require(verifyProof(_proofs[i].a, _proofs[i].b, _proofs[i].c, _proofs[i].input), "Invalid Proof provided");
            Commitment storage _loser = commitments[_proofs[i].addr];

            //check loser proof data belongs to challenger address in our mapping
            // check winner proof data belongs to winner address
            require(_proofs[i].input[0] == _winner.pubKey.x, "Input mismatch 1");
            require(_proofs[i].input[1] == _winner.pubKey.y, "Input mismatch 2");
            require(_proofs[i].input[4] == _winner.encrypted[0], "Input mismatch 3");
            require(_proofs[i].input[5] == _winner.encrypted[1], "Input mismatch 4");
            require(_proofs[i].input[8] == _winner.signature[0], "Input mismatch 5");
            require(_proofs[i].input[9] == _winner.signature[1], "Input mismatch 6");
            require(_proofs[i].input[10] == _winner.signature[2], "Input mismatch 7");

            require(_proofs[i].input[2] == _loser.pubKey.x, "Input mismatch 8");
            require(_proofs[i].input[3] == _loser.pubKey.y, "Input mismatch 9");
            require(_proofs[i].input[6] == _loser.encrypted[0], "Input mismatch 10");
            require(_proofs[i].input[7] == _loser.encrypted[1], "Input mismatch 11");
            require(_proofs[i].input[11] == _loser.signature[0], "Input mismatch 12");
            require(_proofs[i].input[12] == _loser.signature[1], "Input mismatch 13");
            require(_proofs[i].input[13] == _loser.signature[2], "Input mismatch 14");
            if (! looserSet.is_seen[_loser.addr]) {
                looserSet.is_seen[_loser.addr] = true;
                looserSet.count++;
            }
        }
        // make sure all losers have their proofs validated
        if (looserSet.count == bidsCount - 1) {
            winner = _winnerAddr;
            state = AuctionState.Complete;
        }
    }

    // if someone can bring a proof that announced winner is losing against someone else in our records, then auction will be invalidated
    function challengeWinner(
        address _greaterThanWinner,
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[14] memory input
    ) public onlyState(AuctionState.Challenge) {
        require(winner != address(0));
        require(verifyProof(a, b, c, input), "Invalid Proof provided");

        Commitment storage _winner = commitments[_greaterThanWinner];
        Commitment storage _loser = commitments[winner];

        //check loser proof data belongs to challenger address in our mapping
        // check winner proof data belongs to winner address
        require(input[0] == _winner.pubKey.x, "Input mismatch 1");
        require(input[1] == _winner.pubKey.y, "Input mismatch 2");
        require(input[4] == _winner.encrypted[0], "Input mismatch 3");
        require(input[5] == _winner.encrypted[1], "Input mismatch 4");
        require(input[8] == _winner.signature[0], "Input mismatch 5");
        require(input[9] == _winner.signature[1], "Input mismatch 6");
        require(input[10] == _winner.signature[2], "Input mismatch 7");

        require(input[2] == _loser.pubKey.x, "Input mismatch 8");
        require(input[3] == _loser.pubKey.y, "Input mismatch 9");
        require(input[6] == _loser.encrypted[0], "Input mismatch 10");
        require(input[7] == _loser.encrypted[1], "Input mismatch 11");
        require(input[11] == _loser.signature[0], "Input mismatch 12");
        require(input[12] == _loser.signature[1], "Input mismatch 13");
        require(input[13] == _loser.signature[2], "Input mismatch 14");
        // auctioneer was dishonest, invalidate the whole auction
        state = AuctionState.Invalid;

    }

    function finalizeAuction() public onlyState(AuctionState.Challenge) {
        // can be called by anyone
        // check challenge time is passed
        require(block.timestamp > challengeEnd, "Challenge period is not over yet");
        // check contract is not invalidated
        // set contract state to finilized
        state = AuctionState.Complete;
    }

    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[14] memory input
    ) public view returns (bool) {
        return IVerifier(verifierContractAddress).verifyProof(a, b, c, input);
    }

    error OnlyAuctioneer();
    error WrongState(AuctionState _s);

    modifier onlyAuctioneer() {
        if (msg.sender != auctioneer) revert OnlyAuctioneer();
        _;
    }
    modifier onlyState(AuctionState _s) {
        if (state != _s) revert WrongState(_s);
        _;
    }


}

interface IVerifier {
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[14] memory input
    ) external view returns (bool);
}