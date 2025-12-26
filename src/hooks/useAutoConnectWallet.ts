/**
 * Auto-connect wallet hook for Farcaster Mini App
 * Automatically connects Farcaster wallet when in Farcaster context
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { useIsInFarcaster } from './useIsInFarcaster';

export function useAutoConnectWallet() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const isInFarcaster = useIsInFarcaster();
  const hasTriedConnect = useRef<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);

  // Wait for everything to be ready before attempting connection
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 800); // Wait 800ms for SDK and connectors to initialize

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Don't auto-connect if:
    // - Not ready yet
    // - Already connected
    // - Already tried to connect
    // - Not in Farcaster context
    if (!isReady || isConnected || hasTriedConnect.current || !isInFarcaster) {
      return;
    }

    // Check if Farcaster connector is available
    const farcasterConnector = connectors.find(
      (connector) => connector.id === 'farcasterMiniApp'
    );

    if (!farcasterConnector) {
      console.warn('Farcaster connector not found, retrying...');
      
      // Retry after a delay if connector not found
      const retryTimer = setTimeout(() => {
        const retryConnector = connectors.find(
          (connector) => connector.id === 'farcasterMiniApp'
        );
        
        if (retryConnector && !isConnected && !hasTriedConnect.current) {
          console.log('Retrying Farcaster wallet connection...');
          hasTriedConnect.current = true;
          
          try {
            connect({ connector: retryConnector });
          } catch (error) {
            console.error('Failed to connect Farcaster wallet:', error);
          }
        }
      }, 1000);

      return () => clearTimeout(retryTimer);
    }

    // Mark as tried and attempt connection
    hasTriedConnect.current = true;
    
    console.log('Auto-connecting Farcaster wallet...');
    
    try {
      connect({ connector: farcasterConnector });
    } catch (error) {
      console.error('Failed to connect Farcaster wallet:', error);
    }
  }, [isReady, isConnected, isInFarcaster, connect, connectors]);
}
