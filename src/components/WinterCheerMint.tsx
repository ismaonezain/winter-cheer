/**
 * Winter Cheer NFT Mint Component
 * Main minting interface with Farcaster integration
 */

'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { analyzePFPClient } from '@/lib/pfp-analyzer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Gift, AlertCircle, Heart, Star, Zap } from 'lucide-react';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { useAutoConnectWallet } from '@/hooks/useAutoConnectWallet';
import { prepareMintTransaction, getTotalMinted } from '@/lib/nft-contract';
import type { WinterCheerTraits } from '@/lib/trait-generator';

type MintStatus = 'idle' | 'checking' | 'analyzing' | 'generating' | 'uploading' | 'minting' | 'success' | 'error';

interface NFTData {
  imageUrl: string;
  traits: WinterCheerTraits;
  attributes: Array<{ trait_type: string; value: string | number }>;
  imageIpfsUri?: string;
  imageGatewayUrl?: string;
  metadataIpfsUri?: string;
  metadataGatewayUrl?: string;
}

export function WinterCheerMint() {
  const { address, isConnected, status: walletStatus } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  useAutoConnectWallet(); // Auto-connect Farcaster wallet

  const [fid, setFid] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [pfpUrl, setPfpUrl] = useState<string | null>(null);
  const [dominantColor, setDominantColor] = useState<string | null>(null);
  const [gender, setGender] = useState<'Male' | 'Female'>('Female');

  const [mintStatus, setMintStatus] = useState<MintStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [hasMinted, setHasMinted] = useState<boolean>(false);
  const [totalMinted, setTotalMinted] = useState<number>(0);
  const [maxSupply] = useState<number>(10000);

  const [nftData, setNftData] = useState<NFTData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize Farcaster SDK
  useEffect(() => {
    let cancelled = false;

    async function initFarcaster() {
      try {
        await sdk.actions.ready();
        const context = await sdk.context;

        if (!cancelled && context?.user) {
          setFid(context.user.fid);
          setUsername(context.user.username || `User ${context.user.fid}`);
          setPfpUrl(context.user.pfpUrl || null);
        }
      } catch (err) {
        console.error('Failed to initialize Farcaster SDK:', err);
      }
    }

    initFarcaster();

    return () => {
      cancelled = true;
    };
  }, []);

  // Check mint status and fetch real totalMinted from blockchain
  useEffect(() => {
    if (!fid) return;

    async function checkStatus() {
      try {
        setMintStatus('checking');
        const res = await fetch(`/api/check-mint-status?fid=${fid}`);
        const data = await res.json();

        if (data.success) {
          setHasMinted(data.hasMinted);
          // Don't use database count, we'll fetch from blockchain below

          if (data.hasMinted && data.nft) {
            // Load existing NFT - use gateway URLs for display
            setNftData({
              imageUrl: data.nft.image_gateway_url || data.nft.image_ipfs_uri, // Use gateway URL first
              traits: data.nft.traits,
              attributes: [],
              imageIpfsUri: data.nft.image_ipfs_uri,
              imageGatewayUrl: data.nft.image_gateway_url,
              metadataIpfsUri: data.nft.metadata_ipfs_uri,
              metadataGatewayUrl: data.nft.metadata_gateway_url,
            });
            setMintStatus('success');
          } else {
            setMintStatus('idle');
          }
        }
      } catch (err) {
        console.error('Error checking mint status:', err);
        setMintStatus('idle');
      }
    }

    checkStatus();
  }, [fid]);

  // Fetch real totalMinted count from blockchain
  useEffect(() => {
    if (!publicClient) return;

    async function fetchTotalMinted() {
      try {
        const total = await getTotalMinted(publicClient);
        setTotalMinted(total);
      } catch (err) {
        console.error('Error fetching total minted:', err);
      }
    }

    fetchTotalMinted();

    // Refresh every 30 seconds
    const interval = setInterval(fetchTotalMinted, 30000);
    return () => clearInterval(interval);
  }, [publicClient]);

  // Analyze PFP when user arrives
  useEffect(() => {
    if (!pfpUrl || dominantColor) return;

    async function analyzePFP() {
      try {
        const color = await analyzePFPClient(pfpUrl);
        setDominantColor(color);
      } catch (err) {
        console.error('Error analyzing PFP:', err);
        setDominantColor('#DC2626'); // Fallback
      }
    }

    analyzePFP();
  }, [pfpUrl, dominantColor]);

  const handleGenerate = async () => {
    if (!fid || !dominantColor) return;

    try {
      setError(null);
      setMintStatus('generating');
      setStatusMessage('Creating your magical Winter Cheer character... ✨');

      // Generate NFT
      const genRes = await fetch('/api/generate-nft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, gender, dominantColor }),
      });

      const genData = await genRes.json();
      if (!genData.success) {
        throw new Error(genData.error || 'Failed to generate NFT');
      }

      setStatusMessage('Compressing and uploading to IPFS... 📦');
      setMintStatus('uploading');

      // Compress and upload to IPFS
      const uploadRes = await fetch('/api/compress-and-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: genData.imageUrl,
          fid,
          traits: genData.traits,
          attributes: genData.attributes,
        }),
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Failed to upload');
      }

      setNftData({
        imageUrl: uploadData.imageGatewayUrl,
        traits: genData.traits,
        attributes: genData.attributes,
        imageIpfsUri: uploadData.imageIpfsUri,
        imageGatewayUrl: uploadData.imageGatewayUrl,
        metadataIpfsUri: uploadData.metadataIpfsUri,
        metadataGatewayUrl: uploadData.metadataGatewayUrl,
      });

      setMintStatus('idle');
      setStatusMessage('Ready to mint your Winter Cheer! 🎄');
    } catch (err) {
      console.error('Error generating NFT:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setMintStatus('error');
    }
  };

  const handleMint = async () => {
    if (!nftData || !fid || !address || !walletClient) return;

    try {
      setError(null);
      setMintStatus('minting');
      setStatusMessage('Preparing mint transaction... 🎁');

      // Prepare mint transaction with metadata URI
      if (!nftData.metadataIpfsUri) {
        throw new Error('Metadata IPFS URI is missing');
      }
      
      const mintTx = prepareMintTransaction(address, fid, nftData.metadataIpfsUri);

      setStatusMessage('Please confirm transaction in your wallet... 💰');

      // Send transaction to smart contract
      const hash = await walletClient.sendTransaction({
        to: mintTx.to,
        data: mintTx.data,
        value: mintTx.value,
        chain: mintTx.chain,
      });

      setStatusMessage('Transaction submitted! Waiting for confirmation... ⏳');

      // Wait for transaction to be mined
      const receipt = await publicClient?.waitForTransactionReceipt({ hash });

      if (!receipt || receipt.status !== 'success') {
        throw new Error('Transaction failed on-chain');
      }

      // Extract token ID from transaction logs
      // The TokenMinted event emits (address indexed to, uint256 indexed tokenId, uint256 indexed fid)
      let tokenId = fid; // Fallback to FID if we can't parse logs
      
      if (receipt.logs && receipt.logs.length > 0) {
        // Find the Transfer event (last one is usually the mint)
        const transferLog = receipt.logs.find(log => 
          log.topics.length === 4 && // Transfer has 3 indexed params + event signature
          log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event signature
        );
        
        if (transferLog && transferLog.topics[3]) {
          // tokenId is the 3rd indexed parameter (topics[3])
          tokenId = Number(transferLog.topics[3]);
        }
      }

      setStatusMessage('NFT Minted! Recording to database... 📝');

      // Record mint to database with actual token ID from blockchain
      await fetch('/api/record-mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid,
          username: username || `User ${fid}`,
          token_id: tokenId, // Real token ID from blockchain
          image_ipfs_uri: nftData.imageIpfsUri,
          image_gateway_url: nftData.imageGatewayUrl,
          metadata_ipfs_uri: nftData.metadataIpfsUri,
          metadata_gateway_url: nftData.metadataGatewayUrl,
          traits: nftData.traits,
          tx_hash: hash,
        }),
      });

      setMintStatus('success');
      setStatusMessage('Minted successfully! 🎉');
      setHasMinted(true);
      setTotalMinted((prev) => prev + 1);

      // Send success notification to user
      try {
        await fetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fids: [fid],
            notificationId: `mint-success-${fid}-${Date.now()}`,
            title: '🎉 Winter Cheer Minted!',
            body: `Congratulations! Winter Cheer #${totalMinted + 1} is yours!`,
            targetUrl: window.location.href,
          }),
        });
      } catch (notifErr) {
        console.error('Failed to send notification:', notifErr);
        // Don't fail the mint if notification fails
      }
    } catch (err) {
      console.error('Error minting NFT:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setMintStatus('error');
    }
  };

  if (!isConnected || walletStatus !== 'connected') {
    return (
      <div className="nft-card p-8 max-w-2xl mx-auto">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-green-500 rounded-full mx-auto flex items-center justify-center glow-pulse">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">Connect Your Wallet</h3>
          <p className="text-gray-600 mb-6">Please connect your wallet to mint your unique Christmas character</p>
          
          <div className="flex justify-center">
            <WalletConnectButton />
          </div>

          <p className="text-sm text-gray-500 mt-4">
            Supports Farcaster, MetaMask, Coinbase, and more
          </p>
        </div>
      </div>
    );
  }

  if (!fid) {
    return (
      <div className="nft-card p-8 max-w-2xl mx-auto">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-red-500" />
          <p className="text-gray-600">Loading your Farcaster profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nft-card max-w-4xl mx-auto overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-lg">
              {pfpUrl ? (
                <img src={pfpUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-pink-500" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white drop-shadow-lg flex items-center gap-2">
                <Sparkles className="w-6 h-6" />
                Winter Cheer #{fid}
              </h2>
              <p className="text-white/90">@{username || `fid:${fid}`}</p>
            </div>
          </div>
          <Badge className="bg-white text-gray-800 font-bold text-lg px-4 py-2">
            {totalMinted} / {maxSupply}
          </Badge>
        </div>
      </div>

      <CardContent className="p-8 space-y-8">
        {/* Gender Selection */}
        {!nftData && !hasMinted && mintStatus !== 'checking' && (
          <div className="space-y-4">
            <label className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Choose Your Character Gender
            </label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={gender === 'Female' ? 'default' : 'outline'}
                onClick={() => setGender('Female')}
                className="h-20 text-lg kawaii-button relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center gap-2">
                  🎄 Female
                  {gender === 'Female' && <Star className="w-5 h-5 text-yellow-300" />}
                </span>
              </Button>
              <Button
                variant={gender === 'Male' ? 'default' : 'outline'}
                onClick={() => setGender('Male')}
                className="h-20 text-lg kawaii-button relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center gap-2">
                  🎅 Male
                  {gender === 'Male' && <Star className="w-5 h-5 text-yellow-300" />}
                </span>
              </Button>
            </div>
          </div>
        )}

        {/* Color Preview */}
        {dominantColor && !nftData && !hasMinted && mintStatus !== 'checking' && (
          <div className="festive-card p-6 rounded-xl">
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg glow-pulse"
                style={{ backgroundColor: dominantColor, animation: 'glow-pulse 2s ease-in-out infinite' }}
              />
              <div>
                <p className="font-bold text-gray-800 text-lg">Your Personal Color 🎨</p>
                <p className="text-gray-600">Extracted from your profile picture</p>
                <p className="text-sm text-gray-500 font-mono mt-1">{dominantColor}</p>
              </div>
            </div>
          </div>
        )}

        {/* NFT Preview */}
        {nftData && (
          <div className="space-y-6">
            <div className="relative aspect-square rounded-2xl overflow-hidden border-4 border-transparent christmas-lights">
              <img src={nftData.imageUrl} alt="Winter Cheer NFT" className="w-full h-full object-cover" />
              {mintStatus === 'success' && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-green-500 text-white text-lg px-4 py-2 shadow-lg">
                    <Sparkles className="w-4 h-4 mr-1" />
                    Minted!
                  </Badge>
                </div>
              )}
            </div>

            {/* Traits */}
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Character Traits
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(nftData.traits).map(([key, value]) => (
                  <div key={key} className="trait-badge text-center">
                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-sm font-bold text-gray-800 mt-1">{String(value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-100 border-2 border-red-300 rounded-xl">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-800">Oops! Something went wrong</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Status Message */}
        {statusMessage && !error && (
          <div className="text-center p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl border-2 border-blue-200">
            <p className="text-lg font-semibold text-gray-800">{statusMessage}</p>
          </div>
        )}

        {/* Action Buttons */}
        {!hasMinted && mintStatus !== 'checking' && (
          <div className="space-y-3">
            {!nftData ? (
              <Button
                onClick={handleGenerate}
                disabled={mintStatus === 'generating' || mintStatus === 'uploading' || !dominantColor}
                className="w-full h-16 text-xl font-bold glow-button kawaii-button bg-gradient-to-r from-red-500 to-green-500 hover:from-red-600 hover:to-green-600"
              >
                {mintStatus === 'generating' || mintStatus === 'uploading' ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    {mintStatus === 'generating' ? 'Creating Magic...' : 'Uploading...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 mr-3" />
                    Generate My Winter Cheer NFT
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleMint}
                disabled={mintStatus === 'minting'}
                className="w-full h-16 text-xl font-bold glow-button kawaii-button bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              >
                {mintStatus === 'minting' ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    Minting...
                  </>
                ) : (
                  <>
                    <Gift className="w-6 h-6 mr-3" />
                    Mint NFT • 0.00001 ETH
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Minted State */}
        {hasMinted && nftData && (
          <div className="space-y-3">
            <div className="p-6 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl border-2 border-green-300 text-center">
              <p className="text-2xl font-bold text-green-800 mb-2">🎉 Congratulations! 🎉</p>
              <p className="text-green-700">You own Winter Cheer #{fid}</p>
            </div>
            <Button
              onClick={async () => {
                // Get token_id from database
                const res = await fetch(`/api/check-mint-status?fid=${fid}`);
                const data = await res.json();
                const tokenId = data.nft?.token_id || fid;
                
                window.open(`https://opensea.io/assets/base/0x64647089b1BE9c11be87f74546883eC0D1D3c232/${tokenId}`, '_blank');
              }}
              variant="outline"
              className="w-full h-14 text-lg kawaii-button border-2"
            >
              View on OpenSea 🌊
            </Button>
            <Button
              onClick={async () => {
                try {
                  const nftUrl = `${window.location.origin}/nft/${fid}`;
                  // Share with NFT image + detail page link
                  await sdk.actions.composeCast({
                    text: `Just minted my Winter Cheer #${fid}! 🎄✨\n\nAI-generated Christmas NFT with personalized colors from my Farcaster PFP!\n\nCheck it out and mint yours! 👇`,
                    embeds: [
                      nftData.imageGatewayUrl || nftData.imageUrl, // NFT image as first embed
                      nftUrl // Detail page as second embed
                    ],
                  });
                } catch (err) {
                  console.error('Failed to share:', err);
                  // Fallback: copy link to clipboard
                  const nftUrl = `${window.location.origin}/nft/${fid}`;
                  await navigator.clipboard.writeText(nftUrl);
                  alert('NFT link copied to clipboard!');
                }
              }}
              className="w-full h-14 text-lg kawaii-button bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              Share on Warpcast 🚀
            </Button>
          </div>
        )}
      </CardContent>
    </div>
  );
}
