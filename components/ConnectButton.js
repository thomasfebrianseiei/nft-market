import { useState, useEffect } from 'react'
import { useConnect, useAccount, useDisconnect } from 'wagmi'

export default function ConnectButton() {
  const [showModal, setShowModal] = useState(false)
  const { connect, connectors, isPending } = useConnect()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  useEffect(() => {
    const handler = () => setShowModal(true)
    window.addEventListener('thoverse:connect', handler)
    return () => window.removeEventListener('thoverse:connect', handler)
  }, [])

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="btn-cyber btn-neon flex items-center gap-2 text-sm"
      >
        <div className="w-2 h-2 rounded-full bg-cyber-neon animate-pulse" />
        {address.slice(0, 6)}...{address.slice(-4)}
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn-cyber btn-neon text-sm"
      >
        Connect Wallet
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="rounded-2xl p-6 w-80 border border-cyber-neon/30 shadow-2xl"
            style={{ backgroundColor: '#0d0d1a', boxShadow: '0 0 40px rgba(0,255,136,0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-cyber text-lg font-bold text-gradient">Connect Wallet</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/40 hover:text-white transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-white/40 text-sm mb-4">Choose a wallet to connect</p>

            <div className="space-y-2">
              {connectors.map(connector => (
                <button
                  key={connector.id}
                  onClick={() => {
                    connect({ connector })
                    setShowModal(false)
                  }}
                  disabled={isPending}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-cyber-cyan/20 text-white hover:border-cyber-neon/50 hover:bg-cyber-neon/5 transition-all text-left disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyber-neon/20 to-cyber-cyan/20 border border-cyber-neon/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-cyber-neon font-bold text-sm">{connector.name[0]}</span>
                  </div>
                  <div>
                    <div className="font-medium text-sm">{connector.name}</div>
                    <div className="text-white/30 text-xs">
                      {connector.id === 'injected' ? 'Browser wallet' : 'Mobile wallet'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
