'use client'
/**
 * Winter Cheer NFT Collection
 * Homepage with mint interface
 */

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sdk } from '@farcaster/miniapp-sdk';
import { Loader2, Sparkles, Gift, Snowflake, Settings } from 'lucide-react';
import { useAddMiniApp } from '@/hooks/useAddMiniApp';
import { useQuickAuth } from '@/hooks/useQuickAuth';
import { useIsInFarcaster } from '@/hooks/useIsInFarcaster';
import { Snowfall } from '@/components/Snowfall';

const WinterCheerMint = dynamic(
  () => import('@/components/WinterCheerMint').then((mod) => ({ default: mod.WinterCheerMint })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    ),
  }
);

export default function HomePage() {
  const { addMiniApp } = useAddMiniApp();
  const isInFarcaster = useIsInFarcaster();
  useQuickAuth(isInFarcaster);
  
  const [userFid, setUserFid] = useState<number | null>(null);
  const ADMIN_FID = 235940;

  useEffect(() => {
    const tryAddMiniApp = async () => {
      try {
        await addMiniApp();
      } catch (error) {
        console.error('Failed to add mini app:', error);
      }
    };

    tryAddMiniApp();
  }, [addMiniApp]);

  useEffect(() => {
    const initializeFarcaster = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (document.readyState !== 'complete') {
          await new Promise<void>((resolve) => {
            if (document.readyState === 'complete') {
              resolve();
            } else {
              window.addEventListener('load', () => resolve(), { once: true });
            }
          });
        }

        await sdk.actions.ready();
        console.log('Farcaster SDK initialized successfully - app fully loaded');
        
        // Get user FID for admin check
        const context = await sdk.context;
        if (context?.user?.fid) {
          setUserFid(context.user.fid);
        }
      } catch (error) {
        console.error('Failed to initialize Farcaster SDK:', error);

        setTimeout(async () => {
          try {
            await sdk.actions.ready();
            console.log('Farcaster SDK initialized on retry');
            
            // Try to get user FID on retry
            const context = await sdk.context;
            if (context?.user?.fid) {
              setUserFid(context.user.fid);
            }
          } catch (retryError) {
            console.error('Farcaster SDK retry failed:', retryError);
          }
        }, 1000);
      }
    };

    initializeFarcaster();
  }, []);

  return (
    <main className="relative min-h-screen winter-gradient overflow-hidden">
      {/* Admin Link - Top Right - Only visible to admin (FID 235940) */}
      {userFid === ADMIN_FID && (
        <Link href="/admin">
          <button className="fixed top-4 right-4 z-50 bg-white/90 hover:bg-white text-blue-700 font-bold py-2 px-4 rounded-full border-2 border-blue-300 hover:border-blue-400 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 group">
            <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        </Link>
      )}

      {/* Snowfall Effect */}
      <Snowfall />

      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 opacity-20 float-animation">
        <Snowflake className="w-16 h-16 text-white" />
      </div>
      <div className="absolute top-32 right-20 opacity-15 float-animation" style={{ animationDelay: '1s' }}>
        <Gift className="w-20 h-20 text-white" />
      </div>
      <div className="absolute bottom-20 left-1/4 opacity-10 float-animation" style={{ animationDelay: '2s' }}>
        <Sparkles className="w-24 h-24 text-white" />
      </div>

      <div className="relative z-20 container mx-auto py-12 px-4 pt-20">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-6">
          {/* Title with Christmas Theme */}
          <div className="relative inline-block">
            <h1 className="hero-title bg-gradient-to-r from-red-600 via-yellow-500 to-green-600 bg-clip-text text-transparent mb-2 sparkle-text">
              Winter Cheer NFT
            </h1>
            <div className="absolute -top-4 -right-4 text-4xl animate-bounce">❄️</div>
            <div className="absolute -bottom-4 -left-4 text-4xl animate-bounce" style={{ animationDelay: '0.5s' }}>
              🎄
            </div>
          </div>

          {/* Subtitle */}
          <div className="max-w-3xl mx-auto space-y-4">
            <p className="text-xl md:text-2xl font-bold text-white drop-shadow-lg">
              🎅 Mint Your Unique Anime Christmas Character! 🎁
            </p>
            <p className="text-base md:text-lg text-blue-100 drop-shadow-md leading-relaxed">
              Each NFT is AI-generated and personalized with colors from your{' '}
              <span className="font-bold text-yellow-300">Farcaster profile picture</span>
              <br />
              <span className="text-sm text-blue-200">
                10,000 supply collection • Unlimited trait combinations • Exclusive Base Network
              </span>
            </p>
          </div>

          {/* Stats Badge */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <div className="glass-card px-6 py-3 rounded-full">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                <span className="font-bold text-red-600">10,000</span>
                <span className="text-sm text-gray-700">Unique NFTs</span>
              </div>
            </div>
            <div className="glass-card px-6 py-3 rounded-full">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-green-600" />
                <span className="font-bold text-green-600">0.00001 ETH</span>
                <span className="text-sm text-gray-700">Mint Price</span>
              </div>
            </div>
            <div className="glass-card px-6 py-3 rounded-full">
              <div className="flex items-center gap-2">
                <Snowflake className="w-5 h-5 text-blue-500" />
                <span className="font-bold text-blue-600">1 Per FID</span>
                <span className="text-sm text-gray-700">Mint Limit</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Mint Component */}
        <div className="max-w-4xl mx-auto">
          <WinterCheerMint />
        </div>

        {/* Features Section */}
        <div className="mt-20 max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white drop-shadow-lg mb-10">
            ✨ Collection Features ✨
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon="🎨"
              title="AI-Generated Art"
              description="Powered by Flux Pro 1.1 for stunning anime-style characters with Christmas themes"
            />
            <FeatureCard
              icon="🌈"
              title="Personalized Colors"
              description="Your NFT features colors extracted from your unique Farcaster profile picture"
            />
            <FeatureCard
              icon="🎯"
              title="Rare Traits"
              description="12 trait categories with hundreds of combinations - Santa suits, ski outfits & more!"
            />
            <FeatureCard
              icon="⛓️"
              title="Base Network"
              description="Minted on Base blockchain for fast, cheap transactions with OnchainKit integration"
            />
            <FeatureCard
              icon="📦"
              title="IPFS Storage"
              description="Permanently stored on IPFS via Pinata for true decentralization"
            />
            <FeatureCard
              icon="🎭"
              title="OpenSea Ready"
              description="Full metadata support with traits visible on OpenSea and all major marketplaces"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 text-center">
          <div className="glass-card inline-block px-8 py-4 rounded-2xl">
            <p className="text-sm text-gray-700">
              Built with ❤️ on Base by{' '}
              <button
                onClick={async () => {
                  try {
                    await sdk.actions.viewProfile({ fid: 235940 });
                  } catch (err) {
                    window.open('https://warpcast.com/ismaone', '_blank');
                  }
                }}
                className="font-bold text-red-600 hover:text-red-700 underline transition-colors"
              >
                ismaone
              </button>{' '}
              • Powered by OnchainKit, Flux AI & Pinata
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="festive-card p-6 rounded-2xl hover:scale-105 transition-all duration-300">
      <div className="text-5xl mb-4 text-center">{icon}</div>
      <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">{title}</h3>
      <p className="text-sm text-gray-600 text-center leading-relaxed">{description}</p>
    </div>
  );
}
