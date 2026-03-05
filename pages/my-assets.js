import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatEther, parseUnits, parseEther } from 'ethers'
import { useAccount } from 'wagmi'
import { useConnectModal, openImage } from '../utils/connectModal'
import { getMarketContract, getNFTContract, getAuctionContract, fetchTokenMetadata, NFT_ADDRESS, AUCTION_ADDRESS } from '../utils/blockchain'
import { useEthersSigner } from '../utils/hooks'

export default function MyAssets() {
  const [nfts, setNfts] = useState([])
  const [loadingState, setLoadingState] = useState('not-loaded')
  const [error, setError] = useState('')
  const [reselling, setReselling] = useState(null)
  const [resellPrice, setResellPrice] = useState({})
  const [showResellModal, setShowResellModal] = useState(null)
  const [showAuctionModal, setShowAuctionModal] = useState(null)
  const [auctionForm, setAuctionForm] = useState({ startingPrice: '', durationHours: '24' })
  const [creatingAuction, setCreatingAuction] = useState(null)

  const signer = useEthersSigner()
  const { isConnected } = useAccount()
  const { open } = useConnectModal()

  useEffect(() => {
    if (isConnected && signer) loadMyNFTs()
    else if (!isConnected) setLoadingState('loaded')
  }, [signer, isConnected])

  async function loadMyNFTs() {
    try {
      setLoadingState('not-loaded')
      const marketContract = getMarketContract(signer)
      const nftContract = getNFTContract(signer)
      const items = await marketContract.fetchMyNFTs()

      const nftsData = await Promise.all(items.map(async (item) => {
        const tokenURI = await nftContract.tokenURI(item.tokenId)
        const meta = await fetchTokenMetadata(tokenURI)
        return {
          itemId: Number(item.itemId),
          tokenId: Number(item.tokenId),
          seller: item.seller,
          price: formatEther(item.price),
          name: meta.name,
          description: meta.description,
          image: meta.image,
        }
      }))

      setNfts(nftsData)
    } catch (err) {
      setError('Gagal memuat koleksi.')
      console.error(err)
    } finally {
      setLoadingState('loaded')
    }
  }

  async function resellNFT(nft) {
    const price = resellPrice[nft.itemId]
    if (!price || parseFloat(price) <= 0) return
    try {
      setReselling(nft.itemId)
      setError('')
      const marketContract = getMarketContract(signer)
      const nftContract = getNFTContract(signer)
      const listingPrice = await marketContract.getListingPrice()

      const approveTx = await nftContract.approve(process.env.NEXT_PUBLIC_NFT_MARKET_ADDRESS, nft.tokenId)
      await approveTx.wait()

      const priceInWei = parseUnits(price, 'ether')
      const tx = await marketContract.resellToken(NFT_ADDRESS, nft.itemId, priceInWei, { value: listingPrice })
      await tx.wait()
      setShowResellModal(null)
      await loadMyNFTs()
    } catch (err) {
      console.error(err)
      setError(err.reason || err.message || 'Gagal relist NFT')
    } finally {
      setReselling(null)
    }
  }

  async function startAuction(nft) {
    const { startingPrice, durationHours } = auctionForm
    if (!startingPrice || parseFloat(startingPrice) <= 0) return
    if (!durationHours || parseInt(durationHours) <= 0) return
    try {
      setCreatingAuction(nft.tokenId)
      setError('')
      const nftContract = getNFTContract(signer)
      const auctionContract = getAuctionContract(signer)
      const listingFee = await auctionContract.getListingFee()

      const approveTx = await nftContract.approve(AUCTION_ADDRESS, nft.tokenId)
      await approveTx.wait()

      const startingPriceWei = parseEther(startingPrice.toString())
      const durationSeconds = parseInt(durationHours) * 3600

      const tx = await auctionContract.createAuction(
        NFT_ADDRESS,
        nft.tokenId,
        startingPriceWei,
        durationSeconds,
        { value: listingFee }
      )
      await tx.wait()
      setShowAuctionModal(null)
      setAuctionForm({ startingPrice: '', durationHours: '24' })
      await loadMyNFTs()
    } catch (err) {
      console.error(err)
      setError(err.reason || err.message || 'Gagal membuat auction')
    } finally {
      setCreatingAuction(null)
    }
  }

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="page-header">
          <h1>My Collection</h1>
          <p>View and manage your NFT portfolio</p>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon"><span>◇</span></div>
          <h3>Connect Your Wallet</h3>
          <p className="mb-6">Connect wallet to view your NFT collection</p>
          <button onClick={() => open()} className="btn-cyber inline-block">Connect Wallet</button>
        </div>
      </div>
    )
  }

  if (loadingState === 'not-loaded') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="page-header">
          <h1>My Collection</h1>
          <p>Loading your digital assets...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="nft-card">
              <div className="h-64 bg-dark-100 loading-skeleton" />
              <div className="p-5 space-y-3">
                <div className="h-6 bg-dark-100 rounded loading-skeleton" />
                <div className="h-4 w-2/3 bg-dark-100 rounded loading-skeleton" />
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
        <h1>My Collection</h1>
        <p>View and manage your NFT portfolio</p>
      </div>

      {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      {!nfts.length ? (
        <div className="empty-state">
          <div className="empty-state-icon"><span>◇</span></div>
          <h3>No NFTs Yet</h3>
          <p className="mb-6">Start building your collection by purchasing NFTs from the marketplace</p>
          <Link href="/" className="btn-cyber inline-block">Explore Marketplace</Link>
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
              <p className="text-white/50 text-sm mt-1">Portfolio Value (BNB)</p>
            </div>
            <div className="stat-box">
              <p className="text-2xl lg:text-3xl font-cyber font-bold text-gradient">
                {new Set(nfts.map(n => n.seller)).size}
              </p>
              <p className="text-white/50 text-sm mt-1">From Artists</p>
            </div>
            <div className="stat-box">
              <p className="text-2xl lg:text-3xl font-cyber font-bold text-gradient">
                {(nfts.reduce((acc, n) => acc + parseFloat(n.price), 0) / nfts.length).toFixed(2)}
              </p>
              <p className="text-white/50 text-sm mt-1">Avg. Price (BNB)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {nfts.map((nft) => (
              <div key={nft.itemId} className="nft-card group">
                <div className="nft-card-image">
                  <img src={nft.image} alt={nft.name} onClick={() => openImage(nft.image, nft.name)} className="cursor-zoom-in" />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-cyber-neon/20 border border-cyber-neon/40 rounded-full text-cyber-neon text-xs font-semibold uppercase tracking-wider">Owned</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-400 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-lg text-white mb-2 truncate">{nft.name}</h3>
                  <p className="text-white/50 text-sm line-clamp-2 h-10 mb-4">{nft.description}</p>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyber-purple to-cyber-pink" />
                    <div>
                      <p className="text-white/30 text-[10px] uppercase tracking-wider">Purchased from</p>
                      <p className="text-white/50 text-xs truncate">{nft.seller.slice(0, 6)}...{nft.seller.slice(-4)}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white/40 text-xs mb-1">Purchase Price</p>
                        <p className="font-cyber font-bold text-cyber-cyan">{nft.price} BNB</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowResellModal(nft)}
                        className="flex-1 px-3 py-2 border border-cyber-purple/50 text-cyber-purple text-xs font-semibold rounded-lg hover:bg-cyber-purple/10 transition-colors"
                      >
                        List for Sale
                      </button>
                      <button
                        onClick={() => { setShowAuctionModal(nft); setAuctionForm({ startingPrice: '', durationHours: '24' }) }}
                        className="flex-1 px-3 py-2 border border-cyber-neon/50 text-cyber-neon text-xs font-semibold rounded-lg hover:bg-cyber-neon/10 transition-colors"
                      >
                        Start Auction
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Resell Modal */}
      {showResellModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-dark-200 border border-cyber-purple/30 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-cyber text-xl text-white">List for Sale</h3>
              <button onClick={() => setShowResellModal(null)} className="text-white/50 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-4 mb-6 p-3 bg-dark-300/50 rounded-lg">
              <img src={showResellModal.image} alt={showResellModal.name} className="w-16 h-16 rounded-lg object-cover" />
              <div>
                <h4 className="text-white font-semibold">{showResellModal.name}</h4>
                <p className="text-white/50 text-sm">Listing fee: 0.025 BNB</p>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-white/60 text-sm mb-2">Set New Price (BNB)</label>
              <div className="relative">
                <input type="number" placeholder="0.00" step="0.01" min="0" className="input-cyber pr-16"
                  onChange={e => setResellPrice({ ...resellPrice, [showResellModal.itemId]: e.target.value })} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-cyber-cyan font-semibold">BNB</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowResellModal(null)} className="flex-1 py-3 px-4 border border-white/20 rounded-lg text-white/70 hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={() => resellNFT(showResellModal)} disabled={reselling === showResellModal.itemId} className="flex-1 btn-cyber py-3 disabled:opacity-50">
                {reselling === showResellModal.itemId ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : 'Confirm Listing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Auction Modal */}
      {showAuctionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-dark-200 border border-cyber-neon/30 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-cyber text-xl text-white">Start Auction</h3>
              <button onClick={() => setShowAuctionModal(null)} className="text-white/50 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6 p-3 bg-dark-300/50 rounded-lg">
              <img src={showAuctionModal.image} alt={showAuctionModal.name} className="w-16 h-16 rounded-lg object-cover" />
              <div>
                <h4 className="text-white font-semibold">{showAuctionModal.name}</h4>
                <p className="text-white/50 text-sm">Token #{showAuctionModal.tokenId}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-white/60 text-sm mb-2">Starting Price (BNB)</label>
                <div className="relative">
                  <input
                    type="number" placeholder="0.00" step="0.01" min="0"
                    value={auctionForm.startingPrice}
                    onChange={e => setAuctionForm(f => ({ ...f, startingPrice: e.target.value }))}
                    className="input-cyber pr-16"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-cyber-neon font-semibold">BNB</span>
                </div>
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-2">Duration</label>
                <select
                  value={auctionForm.durationHours}
                  onChange={e => setAuctionForm(f => ({ ...f, durationHours: e.target.value }))}
                  className="w-full bg-dark-300/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyber-neon/50 focus:outline-none cursor-pointer"
                >
                  <option value="1">1 hour</option>
                  <option value="6">6 hours</option>
                  <option value="12">12 hours</option>
                  <option value="24">1 day</option>
                  <option value="72">3 days</option>
                  <option value="168">7 days</option>
                </select>
              </div>
            </div>

            <p className="text-white/30 text-xs mb-4">A listing fee will be charged. The NFT will be locked until the auction ends or is canceled.</p>

            <div className="flex gap-3">
              <button onClick={() => setShowAuctionModal(null)} className="flex-1 py-3 px-4 border border-white/20 rounded-lg text-white/70 hover:bg-white/5 transition-colors">Cancel</button>
              <button
                onClick={() => startAuction(showAuctionModal)}
                disabled={creatingAuction === showAuctionModal.tokenId || !auctionForm.startingPrice}
                className="flex-1 btn-cyber btn-auction py-3 disabled:opacity-50"
              >
                {creatingAuction === showAuctionModal.tokenId ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : 'Start Auction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
