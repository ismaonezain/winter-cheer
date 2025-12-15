'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { sdk } from '@farcaster/miniapp-sdk';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Share2, Loader2, ArrowLeft, Zap, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { WinterCheerTraits } from '@/lib/trait-generator';

interface NFTData {
  tokenId: string;
  fid: number;
  username: string;
  imageUrl: string;
  traits: WinterCheerTraits;
  imageIpfsUri: string;
  metadataIpfsUri: string;
  mintedAt: string;
}

export default function NFTDetailPage() {
  const params = useParams();
  const tokenId = params.tokenId as string;

  const [nftData, setNftData] = useState<NFTData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    async function loadNFT() {
      try {
        setLoading(true);
        
        // Fetch NFT data from API
        const res = await fetch(`/api/nft/${tokenId}`);
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to load NFT');
        }

        setNftData(data.nft);
      } catch (err) {
        console.error('Error loading NFT:', err);
        setError(err instanceof Error ? err.message : 'Failed to load NFT');
      } finally {
        setLoading(false);
      }
    }

    if (tokenId) {
      loadNFT();
    }
  }, [tokenId]);

  const handleShare = async () => {
    if (!nftData) return;

    setSharing(true);
    try {
      const shareUrl = window.location.href;
      const shareText = `Check out my Winter Cheer #${nftData.fid}! 🎄✨\n\nAI-generated Christmas NFT with personalized colors from my Farcaster PFP!\n\nMint yours now! 👇`;

      await sdk.actions.composeCast({
        text: shareText,
        embeds: [shareUrl],
      });
    } catch (err) {
      console.error('Failed to share:', err);
      
      // Fallback to web share
      const shareUrl = window.location.href;
      const shareText = `Check out my Winter Cheer #${nftData.fid}! 🎄✨`;
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Winter Cheer #${nftData.fid}`,
            text: shareText,
            url: shareUrl,
          });
        } catch (shareErr) {
          console.log('Web share cancelled or failed');
        }
      } else {
        // Copy to clipboard
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        alert('Link copied to clipboard!');
      }
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen winter-gradient flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-12 flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-red-500" />
            <p className="text-gray-600 text-center">Loading NFT...</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (error || !nftData) {
    return (
      <main className="min-h-screen winter-gradient flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center">
              <span className="text-3xl">😢</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">NFT Not Found</h2>
            <p className="text-gray-600">{error || 'This NFT does not exist'}</p>
            <Link href="/">
              <Button className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Mint
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen winter-gradient p-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Link href="/">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Collection
          </Button>
        </Link>

        {/* NFT Card */}
        <Card className="nft-card overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white drop-shadow-lg flex items-center gap-2">
                  <Sparkles className="w-8 h-8" />
                  Winter Cheer #{nftData.fid}
                </h1>
                <p className="text-white/90 text-lg mt-1">@{nftData.username}</p>
              </div>
              <Badge className="bg-white text-gray-800 font-bold text-lg px-4 py-2">
                #{tokenId}
              </Badge>
            </div>
          </div>

          <CardContent className="p-8 space-y-6">
            {/* NFT Image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden border-4 border-transparent christmas-lights">
              <img 
                src={nftData.imageUrl} 
                alt={`Winter Cheer #${nftData.fid}`} 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4">
                <Badge className="bg-green-500 text-white text-lg px-4 py-2 shadow-lg">
                  <Sparkles className="w-4 h-4 mr-1" />
                  Minted!
                </Badge>
              </div>
            </div>

            {/* Traits */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Zap className="w-6 h-6 text-yellow-500" />
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

            {/* Metadata Links */}
            <div className="space-y-3 pt-4 border-t-2 border-gray-200">
              <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide">On-Chain Info</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <a 
                  href={nftData.imageIpfsUri.replace('ipfs://', 'https://amber-neighbouring-crayfish-334.mypinata.cloud/ipfs/')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700">View Image on IPFS</span>
                  <ExternalLink className="w-4 h-4 text-gray-500" />
                </a>
                <a 
                  href={nftData.metadataIpfsUri.replace('ipfs://', 'https://amber-neighbouring-crayfish-334.mypinata.cloud/ipfs/')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700">View Metadata</span>
                  <ExternalLink className="w-4 h-4 text-gray-500" />
                </a>
              </div>
            </div>

            {/* Share Button */}
            <div className="pt-6 space-y-3">
              <Button
                onClick={handleShare}
                disabled={sharing}
                className="w-full h-16 text-xl font-bold glow-button kawaii-button bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {sharing ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <Share2 className="w-6 h-6 mr-3" />
                    Share on Warpcast 🚀
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-gray-500">
                Share your unique Winter Cheer NFT with your friends!
              </p>
            </div>

            {/* Minted Date */}
            <div className="text-center pt-4 border-t-2 border-gray-200">
              <p className="text-sm text-gray-500">
                Minted on {new Date(nftData.mintedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mint Your Own CTA */}
        <Card className="festive-card">
          <CardContent className="p-6 text-center space-y-4">
            <h3 className="text-xl font-bold text-gray-800">Want Your Own Winter Cheer NFT?</h3>
            <p className="text-gray-600">Create your unique AI-generated Christmas character!</p>
            <Link href="/">
              <Button className="kawaii-button bg-gradient-to-r from-red-500 to-green-500 hover:from-red-600 hover:to-green-600">
                <Sparkles className="w-5 h-5 mr-2" />
                Mint Now • 0.00001 ETH
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
