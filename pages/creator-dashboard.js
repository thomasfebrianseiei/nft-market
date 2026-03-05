import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatEther } from 'ethers'
import { useAccount } from 'wagmi'
import { useConnectModal, openImage } from '../utils/connectModal'
import { getMarketContract, getNFTContract, fetchTokenMetadata } from '../utils/blockchain'
import { useEthersSigner } from '../utils/hooks'

export default function CreatorDashboard() {
  const [nfts, setNfts] = useState([])
  const [sold, setSold] = useState([])
  const [loadingState, setLoadingState] = useState('not-loaded')
  const [activeTab, setActiveTab] = useState('created')
  const [error, setError] = useState('')
  const [delisting, setDelisting] = useState(null)

  const signer = useEthersSigner()
  const { isConnected } = useAccount()
  const { open } = useConnectModal()

  useEffect(() => {
    if (isConnected && signer) loadCreatedNFTs()
    else if (!isConnected) setLoadingState('loaded')
  }, [signer, isConnected])

  async function loadCreatedNFTs() {
    try {
      setLoadingState('not-loaded')
      const marketContract = getMarketContract(signer)
      const nftContract = getNFTContract(signer)
      const items = await marketContract.fetchItemsCreated()

      const nftsData = await Promise.all(items.map(async (item) => {
        const tokenURI = await nftContract.tokenURI(item.tokenId)
        const meta = await fetchTokenMetadata(tokenURI)
        return {
          itemId: Number(item.itemId),
          tokenId: Number(item.tokenId),
          price: formatEther(item.price),
          sold: item.sold,
          cancelled: item.cancelled,
          owner: item.owner,
          name: meta.name,
          description: meta.description,
          image: meta.image,
        }
      }))

      setSold(nftsData.filter(i => i.sold && !i.cancelled))
      setNfts(nftsData)
    } catch (err) {
      setError('Gagal memuat data.')
      console.error(err)
    } finally {
      setLoadingState('loaded')
    }
  }

  async function delistNFT(itemId) {
    try {
      setDelisting(itemId)
      setError('')
      const marketContract = getMarketContract(signer)
      const tx = await marketContract.cancelMarketItem(itemId)
      await tx.wait()
      await loadCreatedNFTs()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Gagal delist NFT')
    } finally {
      setDelisting(null)
    }
  }

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="page-header">
          <h1>Creator Dashboard</h1>
          <p>Track your creations, sales, and earnings</p>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon"><span>✧</span></div>
          <h3>Connect Your Wallet</h3>
          <p className="mb-6">Connect wallet to view your creator dashboard</p>
          <button onClick={() => open()} className="btn-cyber inline-block">Connect Wallet</button>
        </div>
      </div>
    )
  }

  if (loadingState === 'not-loaded') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="page-header">
          <h1>Creator Dashboard</h1>
          <p>Loading your creations...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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

  const listedNfts = nfts.filter(i => !i.sold && !i.cancelled)
  const cancelledNfts = nfts.filter(i => i.cancelled)
  const totalEarnings = sold.reduce((acc, n) => acc + parseFloat(n.price), 0)
  const totalValue = nfts.reduce((acc, n) => acc + parseFloat(n.price), 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div className="page-header">
        <h1>Creator Dashboard</h1>
        <p>Track your creations, sales, and earnings</p>
      </div>

      {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      {!nfts.length ? (
        <div className="empty-state">
          <div className="empty-state-icon"><span>✧</span></div>
          <h3>No Creations Yet</h3>
          <p className="mb-6">Start your creator journey by minting your first NFT</p>
          <Link href="/create-item" className="btn-cyber inline-block">Create NFT</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <div className="stat-box">
              <p className="text-2xl lg:text-3xl font-cyber font-bold text-gradient">{nfts.length}</p>
              <p className="text-white/50 text-sm mt-1">Total Created</p>
            </div>
            <div className="stat-box">
              <p className="text-2xl lg:text-3xl font-cyber font-bold text-gradient">{sold.length}</p>
              <p className="text-white/50 text-sm mt-1">Items Sold</p>
            </div>
            <div className="stat-box">
              <p className="text-2xl lg:text-3xl font-cyber font-bold text-gradient">{totalEarnings.toFixed(2)}</p>
              <p className="text-white/50 text-sm mt-1">Earnings (BNB)</p>
            </div>
            <div className="stat-box">
              <p className="text-2xl lg:text-3xl font-cyber font-bold text-gradient">{totalValue.toFixed(2)}</p>
              <p className="text-white/50 text-sm mt-1">Total Value (BNB)</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 p-1 bg-dark-200/50 rounded-lg border border-white/5 mb-8 w-fit">
            {[
              { key: 'created', label: `All (${nfts.length})` },
              { key: 'listed', label: `Listed (${listedNfts.length})` },
              { key: 'sold', label: `Sold (${sold.length})` },
              { key: 'cancelled', label: `Cancelled (${cancelledNfts.length})` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-md text-xs sm:text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30' : 'text-white/60 hover:text-white'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'created' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {nfts.map(nft => <NFTCard key={nft.itemId} nft={nft} onDelist={delistNFT} delisting={delisting} />)}
            </div>
          )}
          {activeTab === 'listed' && (
            listedNfts.length > 0
              ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{listedNfts.map(nft => <NFTCard key={nft.itemId} nft={nft} onDelist={delistNFT} delisting={delisting} />)}</div>
              : <div className="text-center py-16"><p className="text-white/50">All your NFTs have been sold!</p></div>
          )}
          {activeTab === 'sold' && (
            sold.length > 0
              ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{sold.map(nft => <NFTCard key={nft.itemId} nft={nft} onDelist={delistNFT} delisting={delisting} />)}</div>
              : <div className="text-center py-16"><p className="text-white/50">No sales yet. Keep creating!</p></div>
          )}
          {activeTab === 'cancelled' && (
            cancelledNfts.length > 0
              ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{cancelledNfts.map(nft => <NFTCard key={nft.itemId} nft={nft} onDelist={delistNFT} delisting={delisting} />)}</div>
              : <div className="text-center py-16"><p className="text-white/50">No cancelled listings.</p></div>
          )}
        </>
      )}

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-cyber-cyan/20 bg-gradient-to-br from-cyber-cyan/5 to-transparent">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyber-cyan/20 flex items-center justify-center flex-shrink-0">
              <span className="text-cyber-cyan text-xl">✧</span>
            </div>
            <div>
              <h3 className="font-cyber text-lg text-white mb-2">Create New NFT</h3>
              <p className="text-white/50 text-sm mb-4">Mint a new digital asset and list it on the marketplace</p>
              <Link href="/create-item" className="btn-cyber text-xs px-6 py-2 inline-block">Create NFT</Link>
            </div>
          </div>
        </div>
        <div className="p-6 rounded-2xl border border-cyber-purple/20 bg-gradient-to-br from-cyber-purple/5 to-transparent">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyber-purple/20 flex items-center justify-center flex-shrink-0">
              <span className="text-cyber-purple text-xl">⟐</span>
            </div>
            <div>
              <h3 className="font-cyber text-lg text-white mb-2">Start an Auction</h3>
              <p className="text-white/50 text-sm mb-4">Let collectors compete for your digital masterpiece</p>
              <Link href="/auctions" className="btn-cyber btn-auction text-xs px-6 py-2 inline-block">View Auctions</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function NFTCard({ nft, onDelist, delisting }) {
  const isListed = !nft.sold && !nft.cancelled
  return (
    <div className="nft-card group">
      <div className="nft-card-image">
        <img src={nft.image} alt={nft.name} onClick={() => openImage(nft.image, nft.name)} className="cursor-zoom-in" />
        <div className="absolute top-4 left-4">
          {nft.cancelled
            ? <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-white/50 text-xs font-semibold uppercase tracking-wider">Cancelled</span>
            : nft.sold
              ? <span className="px-3 py-1 bg-cyber-neon/20 border border-cyber-neon/40 rounded-full text-cyber-neon text-xs font-semibold uppercase tracking-wider">Sold</span>
              : <span className="px-3 py-1 bg-cyber-cyan/20 border border-cyber-cyan/40 rounded-full text-cyber-cyan text-xs font-semibold uppercase tracking-wider">Listed</span>
          }
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-dark-400 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-lg text-white mb-2 truncate">{nft.name}</h3>
        <p className="text-white/50 text-sm line-clamp-2 h-10 mb-4">{nft.description}</p>
        {nft.sold && !nft.cancelled && (
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyber-neon to-cyber-cyan"></div>
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-wider">Sold to</p>
              <p className="text-white/50 text-xs truncate">{nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}</p>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div>
            <p className="text-white/40 text-xs mb-1">{nft.sold ? 'Sold for' : 'List Price'}</p>
            <p className={`font-cyber font-bold ${nft.sold ? 'text-cyber-neon' : 'text-cyber-cyan'}`}>{nft.price} BNB</p>
          </div>
          {isListed && (
            <button onClick={() => onDelist(nft.itemId)} disabled={delisting === nft.itemId}
              className="px-4 py-2 border border-red-500/50 text-red-400 text-xs font-semibold rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50">
              {delisting === nft.itemId ? (
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin"></div>
                  Delisting...
                </span>
              ) : 'Delist'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
