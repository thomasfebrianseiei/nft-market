import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatEther } from 'ethers'
import { useConnectModal, openImage } from '../utils/connectModal'
import { getMarketContract, getNFTContract, fetchTokenMetadata, NFT_ADDRESS } from '../utils/blockchain'
import { getPublicProvider, useEthersSigner } from '../utils/hooks'

export default function Home() {
  const [nfts, setNfts] = useState([])
  const [loadingState, setLoadingState] = useState('not-loaded')
  const [buying, setBuying] = useState(null)
  const [error, setError] = useState('')

  const signer = useEthersSigner()
  const { open } = useConnectModal()

  useEffect(() => { loadNFTs() }, [])

  async function loadNFTs() {
    try {
      const provider = getPublicProvider()
      const marketContract = getMarketContract(provider)
      const nftContract = getNFTContract(provider)
      const items = await marketContract.fetchMarketItems()

      const nftsData = await Promise.all(items.map(async (item) => {
        const tokenURI = await nftContract.tokenURI(item.tokenId)
        const meta = await fetchTokenMetadata(tokenURI)
        return {
          itemId: Number(item.itemId),
          tokenId: Number(item.tokenId),
          seller: item.seller,
          price: formatEther(item.price),
          priceRaw: item.price,
          name: meta.name,
          description: meta.description,
          image: meta.image,
        }
      }))

      setNfts(nftsData)
    } catch (err) {
      setError('Gagal memuat NFT.')
      console.error(err)
    } finally {
      setLoadingState('loaded')
    }
  }

  async function buyNft(nft) {
    if (!signer) { open(); return }
    try {
      setBuying(nft.itemId)
      setError('')
      const marketContract = getMarketContract(signer)
      const tx = await marketContract.createMarketSale(NFT_ADDRESS, nft.itemId, { value: nft.priceRaw })
      await tx.wait()
      await loadNFTs()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Transaksi gagal')
    } finally {
      setBuying(null)
    }
  }

  if (loadingState === 'not-loaded') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="page-header">
          <h1>Discover NFTs</h1>
          <p>Explore the most extraordinary digital collectibles in the metaverse</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="nft-card">
              <div className="h-64 bg-dark-100 loading-skeleton"></div>
              <div className="p-5 space-y-3">
                <div className="h-6 bg-dark-100 rounded loading-skeleton"></div>
                <div className="h-4 w-2/3 bg-dark-100 rounded loading-skeleton"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div className="page-header">
        <h1>Discover NFTs</h1>
        <p>Explore the most extraordinary digital collectibles in the metaverse</p>
      </div>

      {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      {!nfts.length ? (
        <div className="empty-state">
          <div className="empty-state-icon"><span>◇</span></div>
          <h3>No NFTs Available</h3>
          <p className="mb-6">Be the first to create and list an NFT on the marketplace</p>
          <Link href="/create-item" className="btn-cyber inline-block">Create NFT</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <div className="stat-box">
              <p className="text-2xl lg:text-3xl font-cyber font-bold text-gradient">{nfts.length}</p>
              <p className="text-white/50 text-sm mt-1">Total NFTs</p>
            </div>
            <div className="stat-box">
              <p className="text-2xl lg:text-3xl font-cyber font-bold text-gradient">
                {nfts.reduce((acc, n) => acc + parseFloat(n.price), 0).toFixed(2)}
              </p>
              <p className="text-white/50 text-sm mt-1">Total Volume (BNB)</p>
            </div>
            <div className="stat-box">
              <p className="text-2xl lg:text-3xl font-cyber font-bold text-gradient">
                {new Set(nfts.map(n => n.seller)).size}
              </p>
              <p className="text-white/50 text-sm mt-1">Artists</p>
            </div>
            <div className="stat-box">
              <p className="text-2xl lg:text-3xl font-cyber font-bold text-gradient">24/7</p>
              <p className="text-white/50 text-sm mt-1">Trading</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {nfts.map((nft) => (
              <div key={nft.itemId} className="nft-card group">
                <div className="nft-card-image">
                  <img src={nft.image} alt={nft.name} onClick={() => openImage(nft.image, nft.name)} className="cursor-zoom-in" />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-400 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-lg text-white mb-2 truncate">{nft.name}</h3>
                  <p className="text-white/50 text-sm line-clamp-2 h-10 mb-4">{nft.description}</p>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyber-neon to-cyber-cyan"></div>
                    <p className="text-white/40 text-xs truncate">{nft.seller.slice(0, 6)}...{nft.seller.slice(-4)}</p>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div>
                      <p className="text-white/40 text-xs mb-1">Current Price</p>
                      <p className="font-cyber font-bold text-cyber-neon">{nft.price} BNB</p>
                    </div>
                    <button
                      onClick={() => buyNft(nft)}
                      disabled={buying === nft.itemId}
                      className="btn-cyber btn-neon text-xs px-4 py-2 disabled:opacity-50"
                    >
                      {buying === nft.itemId ? (
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                          Buying...
                        </span>
                      ) : 'Buy Now'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
