import { useState } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import { parseUnits } from 'ethers'
import { useConnectModal } from '../utils/connectModal'
import { getMarketContract, getNFTContract, NFT_ADDRESS } from '../utils/blockchain'
import { useEthersSigner } from '../utils/hooks'

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY

export default function CreateItem() {
  const [fileUrl, setFileUrl] = useState(null)
  const [formInput, updateFormInput] = useState({ price: '', name: '', description: '' })
  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const signer = useEthersSigner()
  const { open } = useConnectModal()

  async function onChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        headers: { Authorization: `Bearer ${PINATA_JWT}`, 'Content-Type': 'multipart/form-data' },
      })
      setFileUrl(`${PINATA_GATEWAY}/${res.data.IpfsHash}`)
    } catch (err) {
      setError('Gagal upload file ke IPFS')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  async function createMarket() {
    if (!signer) { open(); return }
    const { name, description, price } = formInput
    if (!name || !description || !price || !fileUrl) return
    setCreating(true)
    setError('')
    try {
      const metaRes = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        { pinataContent: { name, description, image: fileUrl }, pinataMetadata: { name } },
        { headers: { Authorization: `Bearer ${PINATA_JWT}` } }
      )
      const tokenURI = `${PINATA_GATEWAY}/${metaRes.data.IpfsHash}`

      const nftContract = getNFTContract(signer)
      const marketContract = getMarketContract(signer)

      const mintTx = await nftContract.createToken(tokenURI)
      const mintReceipt = await mintTx.wait()
      const tokenId = Number(mintReceipt.logs[0].topics[3])

      const listingPrice = await marketContract.getListingPrice()
      const priceInWei = parseUnits(price, 'ether')
      const listTx = await marketContract.createMarketItem(NFT_ADDRESS, tokenId, priceInWei, { value: listingPrice })
      await listTx.wait()

      router.push('/')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Gagal membuat NFT')
    } finally {
      setCreating(false)
    }
  }

  const isFormValid = formInput.name && formInput.description && formInput.price && fileUrl

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div className="page-header">
        <h1>Create NFT</h1>
        <p>Mint your digital asset and list it on the marketplace</p>
      </div>

      {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="order-2 lg:order-1 space-y-6">
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">NFT Name <span className="text-cyber-pink">*</span></label>
            <input placeholder="Enter a name for your NFT" className="input-cyber" onChange={e => updateFormInput({ ...formInput, name: e.target.value })} />
          </div>

          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">Description <span className="text-cyber-pink">*</span></label>
            <textarea placeholder="Tell the story behind your creation..." className="input-cyber min-h-[120px] resize-none" rows={4} onChange={e => updateFormInput({ ...formInput, description: e.target.value })} />
          </div>

          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">Price <span className="text-cyber-pink">*</span></label>
            <div className="relative">
              <input type="number" placeholder="0.00" className="input-cyber pr-16" step="0.01" min="0" onChange={e => updateFormInput({ ...formInput, price: e.target.value })} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-cyber-cyan font-cyber font-semibold">BNB</span>
            </div>
            <p className="text-white/40 text-xs mt-2">Listing fee: 0.025 BNB</p>
          </div>

          <div>
            <label className="block text-white/70 text-sm font-medium mb-2">Upload File <span className="text-cyber-pink">*</span></label>
            <div className="relative">
              <input type="file" name="Asset" accept="image/*,video/*,audio/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={onChange} />
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${uploading ? 'border-cyber-cyan/50 bg-cyber-cyan/5' : 'border-white/20 hover:border-cyber-cyan/50 hover:bg-cyber-cyan/5'}`}>
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-white/70">Uploading to IPFS...</p>
                  </div>
                ) : fileUrl ? (
                  <div className="flex flex-col items-center">
                    <span className="text-cyber-neon text-3xl mb-2">✓</span>
                    <p className="text-cyber-neon text-sm">File uploaded to IPFS</p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyber-cyan/20 to-cyber-purple/20 flex items-center justify-center">
                      <svg className="w-8 h-8 text-cyber-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-white/70 mb-2"><span className="text-cyber-cyan">Click to upload</span> or drag and drop</p>
                    <p className="text-white/40 text-sm">PNG, JPG, GIF, SVG, MP4, WEBM, MP3, WAV (Max 100MB)</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={createMarket}
            disabled={!isFormValid || creating}
            className={`w-full btn-cyber py-4 text-base ${!isFormValid || creating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {creating ? (
              <span className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating NFT...
              </span>
            ) : !signer ? 'Connect Wallet to Create' : 'Create Digital Asset'}
          </button>
        </div>

        <div className="order-1 lg:order-2">
          <div className="sticky top-24">
            <h3 className="text-white/70 text-sm font-medium mb-4">Preview</h3>
            <div className="nft-card">
              <div className="nft-card-image bg-dark-200">
                {fileUrl ? (
                  <img src={fileUrl} alt="NFT Preview" className="w-full h-64 object-cover" />
                ) : (
                  <div className="w-full h-64 flex items-center justify-center bg-gradient-to-br from-dark-200 to-dark-300">
                    <div className="text-center">
                      <span className="text-4xl text-white/20">◇</span>
                      <p className="text-white/30 text-sm mt-2">No file uploaded</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-lg text-white mb-2 truncate">{formInput.name || 'Untitled'}</h3>
                <p className="text-white/50 text-sm line-clamp-2 h-10 mb-4">{formInput.description || 'No description yet...'}</p>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyber-cyan to-cyber-purple"></div>
                  <p className="text-white/40 text-xs">You (Creator)</p>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-white/40 text-xs mb-1">List Price</p>
                  <p className="font-cyber font-bold text-cyber-cyan text-xl">{formInput.price || '0.00'} BNB</p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {[
                { label: 'Name added', done: !!formInput.name },
                { label: 'Description added', done: !!formInput.description },
                { label: 'Price set', done: !!formInput.price },
                { label: 'File uploaded to IPFS', done: !!fileUrl },
              ].map(({ label, done }) => (
                <div key={label} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${done ? 'bg-cyber-neon/10 border border-cyber-neon/20' : 'bg-dark-200/50'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${done ? 'bg-cyber-neon text-dark-400' : 'border border-white/20'}`}>
                    {done && <span className="text-xs">✓</span>}
                  </div>
                  <span className={done ? 'text-white' : 'text-white/50'}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
