'use client';

/**
 * Winter Cheer NFT Mint Interface
 * Main UI component for the minting experience
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Snowflake, Gift, Sparkles } from 'lucide-react';
import { useWinterCheerMint } from '@/hooks/useWinterCheerMint';

export function MintInterface() {
  const {
    fid,
    username,
    pfpUrl,
    address,
    isConnected,
    mintState,
    hasAlreadyMinted,
    selectedGender,
    setSelectedGender,
    mintNFT,
    spaceConnected,
  } = useWinterCheerMint();

  const isLoading = ['analyzing', 'generating', 'uploading', 'minting'].includes(mintState.step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-green-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-red-600 flex items-center justify-center gap-3">
            <Snowflake className="w-12 h-12" />
            Winter Cheer
            <Gift className="w-12 h-12" />
          </h1>
          <p className="text-xl text-gray-700">
            Mint your unique anime-style Christmas NFT on Base
          </p>
          <div className="flex items-center justify-center gap-2">
            <Badge variant={spaceConnected ? 'default' : 'secondary'}>
              {spaceConnected ? '✓ Database Connected' : '○ Connecting...'}
            </Badge>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? '✓ Wallet Connected' : '○ Wallet Not Connected'}
            </Badge>
          </div>
        </div>

        {/* User Info Card */}
        {fid && (
          <Card className="border-2 border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={pfpUrl || undefined} />
                  <AvatarFallback>{username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-lg">@{username || 'Anonymous'}</div>
                  <div className="text-sm text-gray-500">FID: {fid}</div>
                </div>
              </CardTitle>
              {address && (
                <CardDescription className="text-xs">
                  Wallet: {address.slice(0, 6)}...{address.slice(-4)}
                </CardDescription>
              )}
            </CardHeader>
          </Card>
        )}

        {/* Already Minted Warning */}
        {hasAlreadyMinted && (
          <Card className="border-2 border-yellow-400 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-yellow-800">
                <Sparkles className="w-6 h-6" />
                <div>
                  <p className="font-semibold">You've already minted your Winter Cheer NFT!</p>
                  <p className="text-sm">Each FID can only mint once.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gender Selection */}
        {!hasAlreadyMinted && mintState.step === 'idle' && (
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Character</CardTitle>
              <CardDescription>Select the gender for your NFT character</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={selectedGender === 'Male' ? 'default' : 'outline'}
                  className="h-24 text-lg"
                  onClick={() => setSelectedGender('Male')}
                >
                  🎅 Male Character
                </Button>
                <Button
                  variant={selectedGender === 'Female' ? 'default' : 'outline'}
                  className="h-24 text-lg"
                  onClick={() => setSelectedGender('Female')}
                >
                  🎄 Female Character
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mint Progress */}
        {isLoading && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-red-600" />
                  <div className="flex-1">
                    <p className="font-semibold">{mintState.message}</p>
                    <p className="text-sm text-gray-500">Step {mintState.step}</p>
                  </div>
                </div>
                <Progress value={mintState.progress} className="h-3" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview & Traits */}
        {mintState.previewImageUrl && mintState.traits && (
          <Card>
            <CardHeader>
              <CardTitle>Your Winter Cheer NFT</CardTitle>
              <CardDescription>Winter Cheer #{fid}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Image Preview */}
                <div className="aspect-square relative rounded-lg overflow-hidden border-2 border-gray-200">
                  <img
                    src={mintState.previewImageUrl}
                    alt="NFT Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Traits */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Traits</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <TraitBadge label="Gender" value={mintState.traits.gender} />
                    <TraitBadge label="Skin" value={mintState.traits.skinTone} />
                    <TraitBadge label="Hair Style" value={mintState.traits.hairStyle} />
                    <TraitBadge label="Hair Color" value={mintState.traits.hairColor} />
                    <TraitBadge label="Eyes" value={mintState.traits.eyeStyle} />
                    <TraitBadge label="Outfit" value={mintState.traits.outfit} />
                    <TraitBadge label="Accessory" value={mintState.traits.accessory} />
                    <TraitBadge label="Head" value={mintState.traits.headAccessory} />
                    <TraitBadge label="Background" value={mintState.traits.background} />
                    <TraitBadge label="Effect" value={mintState.traits.specialEffect} />
                    <TraitBadge label="Rarity" value={mintState.traits.rarity} rarity />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success */}
        {mintState.step === 'success' && mintState.txHash && (
          <Card className="border-2 border-green-400 bg-green-50">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Sparkles className="w-16 h-16 mx-auto text-green-600" />
                <h2 className="text-2xl font-bold text-green-800">Mint Successful! 🎉</h2>
                <p className="text-green-700">Token ID: {mintState.tokenId?.toString()}</p>
                <a
                  href={`https://basescan.org/tx/${mintState.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View on BaseScan →
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {mintState.error && (
          <Card className="border-2 border-red-400 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800 font-semibold">Error: {mintState.error}</p>
            </CardContent>
          </Card>
        )}

        {/* Mint Button */}
        {!hasAlreadyMinted && mintState.step !== 'success' && (
          <Button
            onClick={mintNFT}
            disabled={!isConnected || !fid || isLoading || !spaceConnected}
            className="w-full h-16 text-xl font-bold bg-gradient-to-r from-red-600 to-green-600 hover:from-red-700 hover:to-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                {mintState.message}
              </>
            ) : (
              <>
                <Gift className="w-6 h-6 mr-2" />
                Mint Winter Cheer NFT (0.00001 ETH)
              </>
            )}
          </Button>
        )}

        {/* Collection Info */}
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-sm">Collection Details</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <InfoRow label="Supply" value="10,000 unique NFTs" />
            <InfoRow label="Price" value="0.00001 ETH per mint" />
            <InfoRow label="Blockchain" value="Base Network" />
            <InfoRow label="Traits" value="12 categories with hundreds of variations" />
            <InfoRow label="Mint Limit" value="1 NFT per Farcaster FID" />
            <InfoRow label="Image Size" value="1200x1200px PNG" />
            <InfoRow label="Storage" value="IPFS (Pinata)" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TraitBadge({ label, value, rarity }: { label: string; value: string; rarity?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-gray-500 text-xs">{label}</span>
      <Badge variant={rarity ? 'default' : 'secondary'} className="text-xs">
        {value}
      </Badge>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
