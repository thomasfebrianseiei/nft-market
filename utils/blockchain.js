import { Contract } from 'ethers'
import NFTMarketABI from '../abis/NFTMarket.json'
import NFTABI from '../abis/NFT.json'
import NFTAuctionABI from '../abis/NFTAuction.json'

export const NFT_MARKET_ADDRESS = process.env.NEXT_PUBLIC_NFT_MARKET_ADDRESS
export const NFT_ADDRESS = process.env.NEXT_PUBLIC_NFT_ADDRESS
export const AUCTION_ADDRESS = process.env.NEXT_PUBLIC_AUCTION_ADDRESS

export function getMarketContract(signerOrProvider) {
  return new Contract(NFT_MARKET_ADDRESS, NFTMarketABI, signerOrProvider)
}

export function getNFTContract(signerOrProvider) {
  return new Contract(NFT_ADDRESS, NFTABI, signerOrProvider)
}

export function getAuctionContract(signerOrProvider) {
  return new Contract(AUCTION_ADDRESS, NFTAuctionABI, signerOrProvider)
}

export async function fetchTokenMetadata(tokenURI) {
  const url = tokenURI.startsWith('ipfs://')
    ? tokenURI.replace('ipfs://', `${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/`)
    : tokenURI
  const res = await fetch(url)
  return res.json()
}
