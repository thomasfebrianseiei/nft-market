// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "hardhat/console.sol";

contract NFTMarket is ReentrancyGuard {
  using Counters for Counters.Counter;
  Counters.Counter private _itemIds;
  Counters.Counter private _itemsSold;

  address payable owner;
  uint256 listingPrice = 0.025 ether;

  constructor() {
    owner = payable(msg.sender);
  }

  struct MarketItem {
    uint itemId;
    address nftContract;
    uint256 tokenId;
    address payable seller;
    address payable owner;
    uint256 price;
    bool sold;
    bool cancelled;
  }

  mapping(uint256 => MarketItem) private idToMarketItem;

  event MarketItemCreated (
    uint indexed itemId,
    address indexed nftContract,
    uint256 indexed tokenId,
    address seller,
    address owner,
    uint256 price,
    bool sold
  );

  event MarketItemCancelled(uint256 indexed itemId);

  event MarketItemResold(
    uint256 indexed itemId,
    address indexed seller,
    uint256 price
  );

  /* Returns the listing price of the contract */
  function getListingPrice() public view returns (uint256) {
    return listingPrice;
  }

  /* Places an item for sale on the marketplace */
  function createMarketItem(
    address nftContract,
    uint256 tokenId,
    uint256 price
  ) public payable nonReentrant {
    require(price > 0, "Price must be at least 1 wei");
    require(msg.value == listingPrice, "Price must be equal to listing price");

    _itemIds.increment();
    uint256 itemId = _itemIds.current();

    idToMarketItem[itemId] = MarketItem(
      itemId,
      nftContract,
      tokenId,
      payable(msg.sender),
      payable(address(0)),
      price,
      false,
      false
    );

    IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

    emit MarketItemCreated(
      itemId,
      nftContract,
      tokenId,
      msg.sender,
      address(0),
      price,
      false
    );
  }

  /* Creates the sale of a marketplace item */
  /* Transfers ownership of the item, as well as funds between parties */
  function createMarketSale(
    address nftContract,
    uint256 itemId
  ) public payable nonReentrant {
    MarketItem storage item = idToMarketItem[itemId];
    require(!item.sold, "Item already sold");
    require(!item.cancelled, "Item has been cancelled");
    require(msg.value == item.price, "Please submit the asking price in order to complete the purchase");

    item.seller.transfer(msg.value);
    IERC721(nftContract).transferFrom(address(this), msg.sender, item.tokenId);
    item.owner = payable(msg.sender);
    item.sold = true;
    _itemsSold.increment();
    payable(owner).transfer(listingPrice);
  }

  /* Cancels a market listing and returns the NFT back to the seller */
  function cancelMarketItem(uint256 itemId) public nonReentrant {
    MarketItem storage item = idToMarketItem[itemId];
    require(item.seller == msg.sender, "Only seller can cancel listing");
    require(!item.sold, "Item already sold");
    require(!item.cancelled, "Item already cancelled");

    item.cancelled = true;

    IERC721(item.nftContract).transferFrom(
      address(this),
      msg.sender,
      item.tokenId
    );

    emit MarketItemCancelled(itemId);
  }

  /* Allows the owner of a purchased NFT to relist it on the marketplace */
  function resellToken(
    address nftContract,
    uint256 itemId,
    uint256 price
  ) public payable nonReentrant {
    MarketItem storage item = idToMarketItem[itemId];
    require(item.owner == msg.sender, "Only item owner can resell");
    require(msg.value == listingPrice, "Price must be equal to listing price");
    require(price > 0, "Price must be at least 1 wei");

    item.sold = false;
    item.cancelled = false;
    item.price = price;
    item.seller = payable(msg.sender);
    item.owner = payable(address(0));
    _itemsSold.decrement();

    IERC721(nftContract).transferFrom(msg.sender, address(this), item.tokenId);

    emit MarketItemResold(itemId, msg.sender, price);
  }

  /* Returns all unsold and not-cancelled market items */
  function fetchMarketItems() public view returns (MarketItem[] memory) {
    uint itemCount = _itemIds.current();
    uint activeCount = 0;

    for (uint i = 0; i < itemCount; i++) {
      MarketItem storage item = idToMarketItem[i + 1];
      if (item.owner == address(0) && !item.cancelled) {
        activeCount++;
      }
    }

    uint currentIndex = 0;
    MarketItem[] memory items = new MarketItem[](activeCount);
    for (uint i = 0; i < itemCount; i++) {
      MarketItem storage item = idToMarketItem[i + 1];
      if (item.owner == address(0) && !item.cancelled) {
        items[currentIndex] = item;
        currentIndex++;
      }
    }
    return items;
  }

  /* Returns only items that a user has purchased (and not relisted) */
  function fetchMyNFTs() public view returns (MarketItem[] memory) {
    uint totalItemCount = _itemIds.current();
    uint itemCount = 0;
    uint currentIndex = 0;

    for (uint i = 0; i < totalItemCount; i++) {
      if (idToMarketItem[i + 1].owner == msg.sender) {
        itemCount++;
      }
    }

    MarketItem[] memory items = new MarketItem[](itemCount);
    for (uint i = 0; i < totalItemCount; i++) {
      if (idToMarketItem[i + 1].owner == msg.sender) {
        items[currentIndex] = idToMarketItem[i + 1];
        currentIndex++;
      }
    }
    return items;
  }

  /* Returns only items a user has created/listed */
  function fetchItemsCreated() public view returns (MarketItem[] memory) {
    uint totalItemCount = _itemIds.current();
    uint itemCount = 0;
    uint currentIndex = 0;

    for (uint i = 0; i < totalItemCount; i++) {
      if (idToMarketItem[i + 1].seller == msg.sender) {
        itemCount++;
      }
    }

    MarketItem[] memory items = new MarketItem[](itemCount);
    for (uint i = 0; i < totalItemCount; i++) {
      if (idToMarketItem[i + 1].seller == msg.sender) {
        items[currentIndex] = idToMarketItem[i + 1];
        currentIndex++;
      }
    }
    return items;
  }
}
