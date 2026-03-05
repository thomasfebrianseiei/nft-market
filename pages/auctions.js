import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatEther, parseEther, ZeroAddress } from 'ethers'
import { useAccount } from 'wagmi'
import { useConnectModal, openImage } from '../utils/connectModal'
import { getAuctionContract, getNFTContract, fetchTokenMetadata } from '../utils/blockchain'
import { getPublicProvider, useEthersSigner } from '../utils/hooks'

function Countdown({ endTime }) {
  function calculateTimeLeft() {
    const diff = new Date(endTime) - new Date()
    if (diff <= 0) return { h: 0, m: 0, s: 0, ended: true }
    return { h: Math.floor(diff / 3600000), m: Math.floor((diff / 60000) % 60), s: Math.floor((diff / 1000) % 60), ended: false }
  }

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft())

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000)
    return () => clearInterval(t)
  }, [endTime])

  if (timeLeft.ended) return <span className="text-red-400 font-cyber text-sm">ENDED</span>

  return (
    <div className="flex items-center gap-2">
      {[{ v: timeLeft.h, l: 'HRS' }, { v: timeLeft.m, l: 'MIN' }, { v: timeLeft.s, l: 'SEC' }].map(({ v, l }, i) => (
        <span key={l} className="flex items-center gap-2">
          <div className="countdown-box">
            <div className="value">{String(v).padStart(2, '0')}</div>
            <div className="label">{l}</div>
          </div>
          {i < 2 && <span className="text-cyber-neon text-xl font-bold">:</span>}
        </span>
      ))}
    </div>
  )
}

function AuctionCard({ auction, onBid, onEnd, onCancel, bidding, ending, canceling, currentAddress }) {
  const [bidAmount, setBidAmount] = useState('')
  const [showModal, setShowModal] = useState(false)

  const endTime = new Date(auction.endTime * 1000)
  const isEnded = Date.now() >= endTime.getTime()
  const currentBidBn = auction.currentBid || 0n
  const currentBidEth = parseFloat(formatEther(currentBidBn))
  const startingPriceEth = parseFloat(formatEther(auction.startingPrice))
  const minBid = currentBidBn > 0n ? currentBidEth + 0.1 : startingPriceEth

  const isSeller = currentAddress && auction.seller.toLowerCase() === currentAddress.toLowerCase()
  const canCancel = isSeller && !isEnded && auction.totalBids === 0

  return (
    <div className="auction-card">
      <div className="auction-card-inner">
        <div className="relative overflow-hidden h-56">
          <img src={auction.image} alt={auction.name} className="w-full h-full object-cover transition-transform duration-500 hover:scale-110 cursor-zoom-in" onClick={() => openImage(auction.image, auction.name)} />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-400 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-4 left-4">
            {isEnded
              ? <span className="px-3 py-1 bg-red-500/20 border border-red-500/40 rounded-full text-red-400 text-xs font-semibold uppercase">Ended</span>
              : <span className="badge-live">LIVE</span>}
          </div>
          <div className="absolute top-4 right-4 px-3 py-1 bg-dark-400/80 backdrop-blur-sm rounded-full border border-cyber-purple/30">
            <span className="text-white/80 text-xs">{auction.totalBids} bids</span>
          </div>
          {!isEnded && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-dark-400/90 backdrop-blur-sm rounded-xl p-3 border border-cyber-cyan/20">
                <p className="text-white/50 text-xs mb-2 uppercase tracking-wider">Ends in</p>
                <Countdown endTime={endTime} />
              </div>
            </div>
          )}
        </div>

        <div className="p-5">
          <h3 className="font-semibold text-lg text-white mb-2">{auction.name}</h3>
          <p className="text-white/50 text-sm mb-4 line-clamp-2">{auction.description}</p>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyber-cyan to-cyber-purple flex items-center justify-center">
                <span className="text-xs font-bold">S</span>
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase">Seller</p>
                <p className="text-white/70 text-xs">{auction.seller.slice(0, 6)}...{auction.seller.slice(-4)}</p>
              </div>
            </div>
            {auction.highestBidder !== ZeroAddress && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyber-purple to-cyber-pink flex items-center justify-center">
                  <span className="text-xs font-bold">H</span>
                </div>
                <div>
                  <p className="text-white/40 text-[10px] uppercase">Top Bidder</p>
                  <p className="text-white/70 text-xs">{auction.highestBidder.slice(0, 6)}...{auction.highestBidder.slice(-4)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-white/40 text-xs mb-1">{currentBidBn > 0n ? 'Current Bid' : 'Starting Price'}</p>
                <p className="font-cyber font-bold text-2xl text-cyber-neon">
                  {currentBidBn > 0n ? currentBidEth.toFixed(3) : startingPriceEth.toFixed(3)} <span className="text-base">BNB</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/40 text-xs mb-1">Min. Increment</p>
                <p className="text-white/60 text-sm">0.1 BNB</p>
              </div>
            </div>

            {isEnded ? (
              <button onClick={() => onEnd(auction.auctionId)} disabled={ending === auction.auctionId}
                className="w-full btn-cyber py-3 disabled:opacity-50">
                {ending === auction.auctionId ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                    Finalizing...
                  </span>
                ) : 'Finalize Auction'}
              </button>
            ) : canCancel ? (
              <button onClick={() => onCancel(auction.auctionId)} disabled={canceling === auction.auctionId}
                className="w-full py-3 border border-red-500/40 text-red-400 rounded-xl hover:bg-red-500/10 transition-colors disabled:opacity-50 text-sm font-semibold">
                {canceling === auction.auctionId ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border border-red-400 border-t-transparent rounded-full animate-spin" />
                    Canceling...
                  </span>
                ) : 'Cancel Auction'}
              </button>
            ) : !isSeller ? (
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input type="number" placeholder={`Min ${minBid.toFixed(3)}`} value={bidAmount}
                    onChange={e => setBidAmount(e.target.value)} className="input-cyber text-sm pr-12" step="0.1" min={minBid} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 text-sm">BNB</span>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-cyber btn-auction text-xs px-6">Place Bid</button>
              </div>
            ) : (
              <div className="py-3 text-center text-white/40 text-sm border border-white/10 rounded-xl">
                Your auction · {auction.totalBids} bid{auction.totalBids !== 1 ? 's' : ''} so far
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-dark-200 border border-cyber-purple/30 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-cyber text-xl text-white">Place Your Bid</h3>
              <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-4 mb-6 p-3 bg-dark-300/50 rounded-lg">
              <img src={auction.image} alt={auction.name} className="w-16 h-16 rounded-lg object-cover" />
              <div>
                <h4 className="text-white font-semibold">{auction.name}</h4>
                <p className="text-white/50 text-sm">Current: {currentBidBn > 0n ? currentBidEth.toFixed(3) : '—'} BNB</p>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-white/60 text-sm mb-2">Your Bid Amount (BNB)</label>
              <div className="relative">
                <input type="number" placeholder="Enter amount" value={bidAmount}
                  onChange={e => setBidAmount(e.target.value)} className="input-cyber text-lg font-cyber pr-16" step="0.1" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-cyber-cyan font-semibold">BNB</span>
              </div>
              <p className="text-white/40 text-xs mt-2">Minimum: {minBid.toFixed(3)} BNB</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 px-4 border border-white/20 rounded-lg text-white/70 hover:bg-white/5 transition-colors">Cancel</button>
              <button
                onClick={async () => { setShowModal(false); await onBid(auction.auctionId, bidAmount); setBidAmount('') }}
                disabled={bidding === auction.auctionId || !bidAmount || parseFloat(bidAmount) < minBid}
                className="flex-1 btn-cyber btn-auction py-3 disabled:opacity-50"
              >
                {bidding === auction.auctionId ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                    Bidding...
                  </span>
                ) : 'Confirm Bid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Auctions() {
  const [auctions, setAuctions] = useState([])
  const [loadingState, setLoadingState] = useState('not-loaded')
  const [sortBy, setSortBy] = useState('ending-soon')
  const [bidding, setBidding] = useState(null)
  const [ending, setEnding] = useState(null)
  const [canceling, setCanceling] = useState(null)
  const [error, setError] = useState('')

  const signer = useEthersSigner()
  const { address: currentAddress } = useAccount()
  const { open } = useConnectModal()

  useEffect(() => { loadAuctions() }, [])

  async function loadAuctions() {
    try {
      const provider = getPublicProvider()
      const auctionContract = getAuctionContract(provider)
      const nftContract = getNFTContract(provider)
      const items = await auctionContract.fetchActiveAuctions()

      const data = await Promise.all(items.map(async (item) => {
        const tokenURI = await nftContract.tokenURI(item.tokenId)
        const meta = await fetchTokenMetadata(tokenURI)
        return {
          auctionId: Number(item.auctionId),
          tokenId: Number(item.tokenId),
          seller: item.seller,
          startingPrice: item.startingPrice,
          currentBid: item.currentBid,
          highestBidder: item.highestBidder,
          endTime: Number(item.endTime),
          totalBids: Number(item.totalBids),
          name: meta.name,
          description: meta.description,
          image: meta.image,
        }
      }))

      setAuctions(data)
    } catch (err) {
      setError('Gagal memuat auctions.')
      console.error(err)
    } finally {
      setLoadingState('loaded')
    }
  }

  async function placeBid(auctionId, amount) {
    if (!signer) { open(); return }
    try {
      setBidding(auctionId)
      setError('')
      const auctionContract = getAuctionContract(signer)
      const tx = await auctionContract.placeBid(auctionId, { value: parseEther(amount.toString()) })
      await tx.wait()
      await loadAuctions()
    } catch (err) {
      console.error(err)
      setError(err.reason || err.message || 'Gagal place bid')
    } finally {
      setBidding(null)
    }
  }

  async function endAuction(auctionId) {
    if (!signer) { open(); return }
    try {
      setEnding(auctionId)
      setError('')
      const auctionContract = getAuctionContract(signer)
      const tx = await auctionContract.endAuction(auctionId)
      await tx.wait()
      await loadAuctions()
    } catch (err) {
      console.error(err)
      setError(err.reason || err.message || 'Gagal finalize auction')
    } finally {
      setEnding(null)
    }
  }

  async function cancelAuction(auctionId) {
    if (!signer) { open(); return }
    try {
      setCanceling(auctionId)
      setError('')
      const auctionContract = getAuctionContract(signer)
      const tx = await auctionContract.cancelAuction(auctionId)
      await tx.wait()
      await loadAuctions()
    } catch (err) {
      console.error(err)
      setError(err.reason || err.message || 'Gagal cancel auction')
    } finally {
      setCanceling(null)
    }
  }

  const sorted = [...auctions].sort((a, b) => {
    if (sortBy === 'ending-soon') return a.endTime - b.endTime
    if (sortBy === 'highest-bid') return Number(b.currentBid - a.currentBid)
    if (sortBy === 'most-bids') return b.totalBids - a.totalBids
    return 0
  })

  if (loadingState === 'not-loaded') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="page-header"><h1>Live Auctions</h1><p>Loading auctions...</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="nft-card">
              <div className="h-56 bg-dark-100 loading-skeleton" />
              <div className="p-5 space-y-3"><div className="h-6 bg-dark-100 rounded loading-skeleton" /></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div className="page-header">
        <h1>Live Auctions</h1>
        <p>Bid on exclusive NFTs from top creators in real-time</p>
      </div>

      {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-box">
          <p className="text-2xl lg:text-3xl font-cyber font-bold text-gradient">{auctions.length}</p>
          <p className="text-white/50 text-sm mt-1">Active Auctions</p>
        </div>
        <div className="stat-box">
          <p className="text-2xl lg:text-3xl font-cyber font-bold text-gradient">
            {auctions.reduce((acc, a) => acc + parseFloat(formatEther(a.currentBid || 0n)), 0).toFixed(2)}
          </p>
          <p className="text-white/50 text-sm mt-1">Total Value (BNB)</p>
        </div>
        <div className="stat-box">
          <p className="text-2xl lg:text-3xl font-cyber font-bold text-gradient">{auctions.reduce((acc, a) => acc + a.totalBids, 0)}</p>
          <p className="text-white/50 text-sm mt-1">Total Bids</p>
        </div>
        <div className="stat-box">
          <p className="text-2xl lg:text-3xl font-cyber font-bold text-gradient">{new Set(auctions.map(a => a.seller)).size}</p>
          <p className="text-white/50 text-sm mt-1">Sellers</p>
        </div>
      </div>

      <div className="flex justify-end mb-8">
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-sm">Sort by:</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="bg-dark-200/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-cyber-cyan/50 focus:outline-none cursor-pointer">
            <option value="ending-soon">Ending Soon</option>
            <option value="highest-bid">Highest Bid</option>
            <option value="most-bids">Most Bids</option>
          </select>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><span>⟐</span></div>
          <h3>No Active Auctions</h3>
          <p className="mb-6">Be the first to start an auction for your NFT</p>
          <Link href="/my-assets" className="btn-cyber btn-auction inline-block">My NFTs</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map(auction => (
            <AuctionCard
              key={auction.auctionId}
              auction={auction}
              onBid={placeBid}
              onEnd={endAuction}
              onCancel={cancelAuction}
              bidding={bidding}
              ending={ending}
              canceling={canceling}
              currentAddress={currentAddress}
            />
          ))}
        </div>
      )}

      <div className="mt-16 text-center p-8 lg:p-12 rounded-2xl border border-cyber-purple/20 bg-gradient-to-br from-cyber-purple/5 to-cyber-pink/5">
        <h3 className="font-cyber text-2xl lg:text-3xl text-white mb-4">Start Your Own Auction</h3>
        <p className="text-white/60 max-w-xl mx-auto mb-6">List your NFT for auction and let collectors compete for your digital masterpiece.</p>
        <Link href="/my-assets" className="btn-cyber btn-auction inline-block">Go to My NFTs</Link>
      </div>
    </div>
  )
}
