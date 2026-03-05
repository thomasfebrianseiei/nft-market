import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'

const WalletContext = createContext(null)

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null)
  const [signer, setSigner] = useState(null)
  const [connecting, setConnecting] = useState(false)

  const getSigner = () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum, 'any')
    return provider.getSigner()
  }

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('Wallet tidak ditemukan. Install MetaMask atau wallet browser lainnya.')
      return
    }
    try {
      setConnecting(true)
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      const s = getSigner()
      const addr = await s.getAddress()
      setSigner(s)
      setAddress(addr)
      localStorage.setItem('walletConnected', '1')
    } catch (err) {
      console.error('Connect error:', err)
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setSigner(null)
    setAddress(null)
    localStorage.removeItem('walletConnected')
  }, [])

  // Auto reconnect jika sebelumnya sudah connect
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return
    if (!localStorage.getItem('walletConnected')) return
    window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
      if (accounts.length > 0) {
        setSigner(getSigner())
        setAddress(accounts[0])
      }
    }).catch(() => {})
  }, [])

  // Handle perubahan akun / disconnect dari wallet
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return
    const onAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnect()
      } else {
        setSigner(getSigner())
        setAddress(accounts[0])
      }
    }
    window.ethereum.on('accountsChanged', onAccountsChanged)
    return () => window.ethereum.removeListener('accountsChanged', onAccountsChanged)
  }, [disconnect])

  return (
    <WalletContext.Provider value={{ address, signer, connecting, connect, disconnect, isConnected: !!address }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}
