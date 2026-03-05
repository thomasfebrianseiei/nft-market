import { WagmiProvider, createConfig } from 'wagmi'
import { bscTestnet } from 'wagmi/chains'
import { http } from 'viem'
import { injected, walletConnect } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

const wagmiConfig = createConfig({
  chains: [bscTestnet],
  transports: {
    [bscTestnet.id]: http('https://data-seed-prebsc-1-s1.bnbchain.org:8545'),
  },
  connectors: [
    injected(),
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
})

const queryClient = new QueryClient()

export default function Web3ModalProvider({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
