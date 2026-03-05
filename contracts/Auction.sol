// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "hardhat/console.sol";

contract NFTAuction is ReentrancyGuard {
  using Counters for Counters.Counter;
  Counters.Counter private _auctionIds;

  address payable owner;
  uint256 public listingFee = 0.025 ether;
  uint256 public minBidIncrement = 0.1 ether;

  constructor() {
    owner = payable(msg.sender);
  }

  struct Auction {
    uint256 auctionId;
    address nftContract;
    uint256 tokenId;
    address payable seller;
    uint256 startingPrice;
    uint256 currentBid;
    address payable highestBidder;
    uint256 endTime;
    uint256 totalBids;
    bool ended;
    bool cancelled;
  }

  mapping(uint256 => Auction) public idToAuction;

  /* pendingReturns: stores outbid funds so bidders can withdraw safely */
  mapping(uint256 => mapping(address => uint256)) public pendingReturns;

  event AuctionCreated(
    uint256 indexed auctionId,
    address indexed nftContract,
    uint256 indexed tokenId,
    address seller,
    uint256 startingPrice,
    uint256 endTime
  );

  event BidPlaced(
    uint256 indexed auctionId,
    address indexed bidder,
    uint256 amount
  );

  event AuctionEnded(
    uint256 indexed auctionId,
    address indexed winner,
    uint256 amount
  );

  event AuctionCancelled(uint256 indexed auctionId);

  /* Returns the listing fee */
  function getListingFee() public view returns (uint256) {
    return listingFee;
  }

  /* Creates a new auction — seller sends NFT to contract and pays listing fee */
  function createAuction(
    address nftContract,
    uint256 tokenId,
    uint256 startingPrice,
    uint256 durationInSeconds
  ) public payable nonReentrant {
    require(startingPrice > 0, "Starting price must be at least 1 wei");
    require(msg.value == listingFee, "Must pay listing fee");
    require(durationInSeconds >= 60, "Duration must be at least 60 seconds");

    _auctionIds.increment();
    uint256 auctionId = _auctionIds.current();

    idToAuction[auctionId] = Auction(
      auctionId,
      nftContract,
      tokenId,
      payable(msg.sender),
      startingPrice,
      0,
      payable(address(0)),
      block.timestamp + durationInSeconds,
      0,
      false,
      false
    );

    IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

    /* Listing fee goes to marketplace owner */
    payable(owner).transfer(listingFee);

    emit AuctionCreated(
      auctionId,
      nftContract,
      tokenId,
      msg.sender,
      startingPrice,
      block.timestamp + durationInSeconds
    );
  }

  /* Places a bid on an active auction */
  function placeBid(uint256 auctionId) public payable nonReentrant {
    Auction storage auction = idToAuction[auctionId];
    require(block.timestamp < auction.endTime, "Auction has ended");
    require(!auction.ended && !auction.cancelled, "Auction is not active");
    require(msg.sender != auction.seller, "Seller cannot bid on own auction");

    /* First bid must be >= startingPrice; subsequent bids must beat current by minBidIncrement */
    uint256 minBid = auction.currentBid > 0
      ? auction.currentBid + minBidIncrement
      : auction.startingPrice;
    require(msg.value >= minBid, "Bid amount is too low");

    /* Return previous highest bidder's funds via pendingReturns (pull pattern) */
    if (auction.highestBidder != address(0)) {
      pendingReturns[auctionId][auction.highestBidder] += auction.currentBid;
    }

    auction.currentBid = msg.value;
    auction.highestBidder = payable(msg.sender);
    auction.totalBids++;

    emit BidPlaced(auctionId, msg.sender, msg.value);
  }

  /* Outbid bidders withdraw their returned funds */
  function withdrawBid(uint256 auctionId) public nonReentrant {
    uint256 amount = pendingReturns[auctionId][msg.sender];
    require(amount > 0, "No funds to withdraw");

    pendingReturns[auctionId][msg.sender] = 0;
    payable(msg.sender).transfer(amount);
  }

  /* Ends an auction after the time has passed — can be called by anyone */
  function endAuction(uint256 auctionId) public nonReentrant {
    Auction storage auction = idToAuction[auctionId];
    require(block.timestamp >= auction.endTime, "Auction has not ended yet");
    require(!auction.ended, "Auction already ended");
    require(!auction.cancelled, "Auction was cancelled");

    auction.ended = true;

    if (auction.highestBidder != address(0)) {
      /* Transfer NFT to winner and funds to seller */
      IERC721(auction.nftContract).transferFrom(
        address(this),
        auction.highestBidder,
        auction.tokenId
      );
      auction.seller.transfer(auction.currentBid);
    } else {
      /* No bids — return NFT to seller */
      IERC721(auction.nftContract).transferFrom(
        address(this),
        auction.seller,
        auction.tokenId
      );
    }

    emit AuctionEnded(auctionId, auction.highestBidder, auction.currentBid);
  }

  /* Seller can cancel an auction only if no bids have been placed */
  function cancelAuction(uint256 auctionId) public nonReentrant {
    Auction storage auction = idToAuction[auctionId];
    require(auction.seller == msg.sender, "Only seller can cancel auction");
    require(!auction.ended, "Auction already ended");
    require(!auction.cancelled, "Auction already cancelled");
    require(auction.highestBidder == address(0), "Cannot cancel auction with bids");

    auction.cancelled = true;

    IERC721(auction.nftContract).transferFrom(
      address(this),
      auction.seller,
      auction.tokenId
    );

    emit AuctionCancelled(auctionId);
  }

  /* Returns all active (not ended, not cancelled) auctions */
  function fetchActiveAuctions() public view returns (Auction[] memory) {
    uint256 total = _auctionIds.current();
    uint256 activeCount = 0;

    for (uint256 i = 0; i < total; i++) {
      Auction storage a = idToAuction[i + 1];
      if (!a.ended && !a.cancelled) {
        activeCount++;
      }
    }

    Auction[] memory auctions = new Auction[](activeCount);
    uint256 currentIndex = 0;
    for (uint256 i = 0; i < total; i++) {
      Auction storage a = idToAuction[i + 1];
      if (!a.ended && !a.cancelled) {
        auctions[currentIndex] = a;
        currentIndex++;
      }
    }
    return auctions;
  }

  /* Returns auctions created by the caller */
  function fetchMyAuctions() public view returns (Auction[] memory) {
    uint256 total = _auctionIds.current();
    uint256 myCount = 0;

    for (uint256 i = 0; i < total; i++) {
      if (idToAuction[i + 1].seller == msg.sender) {
        myCount++;
      }
    }

    Auction[] memory auctions = new Auction[](myCount);
    uint256 currentIndex = 0;
    for (uint256 i = 0; i < total; i++) {
      if (idToAuction[i + 1].seller == msg.sender) {
        auctions[currentIndex] = idToAuction[i + 1];
        currentIndex++;
      }
    }
    return auctions;
  }

  /* Returns ended auctions that the caller won */
  function fetchAuctionsWon() public view returns (Auction[] memory) {
    uint256 total = _auctionIds.current();
    uint256 wonCount = 0;

    for (uint256 i = 0; i < total; i++) {
      Auction storage a = idToAuction[i + 1];
      if (a.highestBidder == msg.sender && a.ended) {
        wonCount++;
      }
    }

    Auction[] memory auctions = new Auction[](wonCount);
    uint256 currentIndex = 0;
    for (uint256 i = 0; i < total; i++) {
      Auction storage a = idToAuction[i + 1];
      if (a.highestBidder == msg.sender && a.ended) {
        auctions[currentIndex] = a;
        currentIndex++;
      }
    }
    return auctions;
  }
}
