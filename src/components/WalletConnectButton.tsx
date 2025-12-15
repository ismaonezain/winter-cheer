/**
 * Wallet Connect Button Component
 * Smart wallet connection with priority: Farcaster → Injected → WalletConnect
 */

'use client';

import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { activeChain } from '@/lib/wagmi';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

export function WalletConnectButton() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  // Auto-switch to Base network after connection
  useEffect(() => {
    if (isConnected && chain?.id !== activeChain.id) {
      switchChain?.({ chainId: activeChain.id });
    }
  }, [isConnected, chain, switchChain]);

  const handleConnect = () => {
    // Priority: Farcaster → Injected → WalletConnect
    const farcasterConnector = connectors.find((c) => c.id === 'farcasterMiniApp');
    const injectedConnector = connectors.find((c) => c.id === 'injected');
    const walletConnectConnector = connectors.find((c) => c.id === 'walletConnect');

    const connector = farcasterConnector || injectedConnector || walletConnectConnector || connectors[0];

    if (connector) {
      connect({ connector });
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-100 to-green-100 rounded-lg border-2 border-red-200">
          <Wallet className="w-5 h-5 text-gray-700" />
          <span className="font-bold text-gray-800">{formatAddress(address)}</span>
        </div>
        <Button
          onClick={() => disconnect()}
          variant="outline"
          size="icon"
          className="h-10 w-10 border-2 border-red-300 hover:bg-red-100"
          title="Disconnect Wallet"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isPending}
      className="bg-gradient-to-r from-red-500 to-green-500 hover:from-red-600 hover:to-green-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
    >
      {isPending ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Wallet className="w-5 h-5 mr-2" />
          Connect Wallet
        </>
      )}
    </Button>
  );
}
