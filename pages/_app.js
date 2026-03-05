import '../styles/globals.css'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import dynamic from 'next/dynamic'

const Web3ModalProvider = dynamic(
  () => import('../components/Web3ModalProvider'),
  { ssr: false }
)

const ConnectButton = dynamic(
  () => import('../components/ConnectButton'),
  { ssr: false }
)

const ImageLightbox = dynamic(
  () => import('../components/ImageLightbox'),
  { ssr: false }
)

const navItems = [
  { href: '/', label: 'Marketplace', icon: '◈' },
  { href: '/auctions', label: 'Live Auctions', icon: '⟐' },
  { href: '/create-item', label: 'Create', icon: '✧' },
  { href: '/my-assets', label: 'My NFTs', icon: '◇' },
  { href: '/creator-dashboard', label: 'Dashboard', icon: '◎' },
]

function Layout({ Component, pageProps }) {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-50 border-b border-cyber-neon/20 shadow-lg shadow-black/30" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-cyber-neon via-cyber-cyan to-cyber-purple flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-cyber-neon/20">
                <span className="text-white font-bold text-lg lg:text-xl">T</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="font-cyber text-xl lg:text-2xl font-bold text-gradient">THOVERSE</h1>
                <p className="text-[10px] lg:text-xs text-white/40 tracking-[0.2em] uppercase">NFT Marketplace</p>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}
                  className={`nav-link flex items-center gap-2 text-sm ${router.pathname === item.href ? 'active' : ''}`}>
                  <span className="text-cyber-cyan">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="hidden lg:block">
              <ConnectButton />
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-dark-100/50 border border-cyber-cyan/20 text-white/70 hover:text-white hover:border-cyber-cyan/40 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        <div className={`lg:hidden transition-all duration-300 ease-in-out overflow-hidden ${mobileMenuOpen ? 'max-h-[600px]' : 'max-h-0'}`}>
          <div className="px-4 py-4 space-y-3 border-t border-cyber-neon/30" style={{ backgroundColor: '#0a0a0f' }}>
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-all ${
                  router.pathname === item.href
                    ? 'text-cyber-neon border border-cyber-neon/50 shadow-lg shadow-cyber-neon/20'
                    : 'text-white hover:text-cyber-neon border border-transparent hover:border-cyber-neon/30'
                }`}
                style={{ backgroundColor: router.pathname === item.href ? '#0d2818' : '#11111b' }}
              >
                <span className="text-cyber-neon text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
            <div className="pt-4 mt-2 border-t border-white/10">
              <ConnectButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="relative">
        <Component {...pageProps} />
      </main>

      <ImageLightbox />

      <footer className="mt-20 border-t border-cyber-cyan/10 bg-dark-400/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyber-neon via-cyber-cyan to-cyber-purple flex items-center justify-center shadow-lg shadow-cyber-neon/20">
                  <span className="text-white font-bold text-lg">T</span>
                </div>
                <h3 className="font-cyber text-xl font-bold text-gradient">THOVERSE</h3>
              </div>
              <p className="text-white/50 text-sm max-w-md">
                The most futuristic NFT marketplace on the blockchain. Discover, collect, and sell extraordinary digital assets.
              </p>
            </div>
            <div>
              <h4 className="font-cyber text-sm font-semibold text-white mb-4 tracking-wider">MARKETPLACE</h4>
              <ul className="space-y-2">
                <li><Link href="/" className="text-white/50 hover:text-cyber-cyan transition-colors text-sm">Explore</Link></li>
                <li><Link href="/auctions" className="text-white/50 hover:text-cyber-cyan transition-colors text-sm">Live Auctions</Link></li>
                <li><Link href="/create-item" className="text-white/50 hover:text-cyber-cyan transition-colors text-sm">Create NFT</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-cyber text-sm font-semibold text-white mb-4 tracking-wider">ACCOUNT</h4>
              <ul className="space-y-2">
                <li><Link href="/my-assets" className="text-white/50 hover:text-cyber-cyan transition-colors text-sm">My NFTs</Link></li>
                <li><Link href="/creator-dashboard" className="text-white/50 hover:text-cyber-cyan transition-colors text-sm">Dashboard</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/30 text-sm">© 2024 Thoverse. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="text-white/30 text-xs">Powered by</span>
              <span className="font-cyber text-xs text-cyber-cyan">BNB Smart Chain</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function App({ Component, pageProps }) {
  return (
    <Web3ModalProvider>
      <Layout Component={Component} pageProps={pageProps} />
    </Web3ModalProvider>
  )
}
