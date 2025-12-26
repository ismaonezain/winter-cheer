import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

const chainId = process.env.NEXT_PUBLIC_SDK_CHAIN_ID
  ? Number(process.env.NEXT_PUBLIC_SDK_CHAIN_ID)
  : baseSepolia.id;

export const activeChain = chainId === 84532 ? baseSepolia : base;

export const config = createConfig({
  chains: [activeChain],
  connectors: [
    // 1. Farcaster Connector - untuk Farcaster Mini App
    farcasterMiniApp(),
    
    // 2. Injected Connector - untuk browser wallets
    //    (MetaMask, Coinbase, Brave, Rainbow, dll)
    injected(),
    
    // 3. WalletConnect - untuk mobile wallets
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
      showQrModal: true,
      metadata: {
        name: 'Winter Cheer NFT',
        description: 'Mint Your Magical Winter NFT',
        url: 'https://table-only-559.app.ohara.ai',
        icons: ['https://usdozf7pplhxfvrl.public.blob.vercel-storage.com/2f76f78c-22ae-4885-b44e-f3ab6c9a9365_cmj3sv8s60aad0bpq1g9ph020-UUwP2ZwoNopez1sECWRVEpmw6aLvg8.jpg?download=1'],
      },
    }),
  ],
  transports: {
    [activeChain.id]: http(),
  },
});
