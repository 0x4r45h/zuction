// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./Auction.sol";

contract AuctionFactory {
    // blind auction contract
    address public implementation;
    address public verifierContract;
    address[] public auctionProxies;
    using Clones for address;

    constructor(address _implementation, address _verifier) {
        implementation = _implementation;
        verifierContract = _verifier;
    }

    function createAuctionProxy(
        uint256 _pubKeyX,
        uint256 _pubKeyY,
        uint256 _biddingPeriod,
        uint256 _challengeDuration
    ) external returns (address auctionProxyContract) {
        auctionProxyContract = Clones.clone(implementation);
        Auction(auctionProxyContract).initialize(
            msg.sender,
            _pubKeyX,
            _pubKeyY,
            _biddingPeriod,
            _challengeDuration,
            verifierContract
        );
        auctionProxies.push(auctionProxyContract);
        emit AuctionCloneCreated(
            auctionProxyContract,
            auctionProxies.length,
            auctionProxies
        );
    }

    function getAllAuctions() public view returns (address[] memory) {
        return auctionProxies;
    }

    function getAuctionById(uint8 id) public view returns (address) {
        return auctionProxies[id];
    }

    event AuctionCloneCreated(
        address auctionContract,
        uint256 numAuctions,
        address[] auctionProxies
    );
}