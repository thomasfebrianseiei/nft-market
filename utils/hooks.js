import { useState, useEffect } from 'react'
import { useWalletClient } from 'wagmi'
import { BrowserProvider, JsonRpcProvider } from 'ethers'

const RPC_URL = 'https://data-seed-prebsc-1-s1.bnbchain.org:8545'

export function getPublicProvider() {
  return new JsonRpcProvider(RPC_URL)
}

export function useEthersSigner() {
  const { data: walletClient } = useWalletClient()
  const [signer, setSigner] = useState(null)

  useEffect(() => {
    if (!walletClient) { setSigner(null); return }
    const { account, chain, transport } = walletClient
    const provider = new BrowserProvider(transport, { chainId: chain.id, name: chain.name })
    provider.getSigner(account.address).then(setSigner).catch(() => setSigner(null))
  }, [walletClient])

  return signer
}
