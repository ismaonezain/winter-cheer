import type { Metadata } from 'next';

type Props = {
  params: { tokenId: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const tokenId = params.tokenId;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://winter-cheer.vercel.app';
    
    // Fetch NFT data for metadata
    const res = await fetch(`${baseUrl}/api/nft/${tokenId}`, {
      next: { revalidate: 60 }, // Cache for 1 minute
    });
    const data = await res.json();

    if (!data.success || !data.nft) {
      return {
        title: 'Winter Cheer NFT - Not Found',
        description: 'This Winter Cheer NFT could not be found.',
      };
    }

    const { nft } = data;
    const pageUrl = `${baseUrl}/nft/${tokenId}`;
    const imageUrl = nft.imageUrl;

    // Build Mini App Embed JSON
    const miniAppEmbed = {
      version: '1',
      imageUrl: imageUrl,
      button: {
        title: '🎄 View NFT',
        action: {
          type: 'launch_frame',
          name: 'Winter Cheer NFT',
          url: pageUrl,
          splashImageUrl: `${baseUrl}/icon.png`,
          splashBackgroundColor: '#667eea',
        },
      },
    };

    return {
      title: `Winter Cheer #${nft.fid} by @${nft.username}`,
      description: `Check out this unique AI-generated Christmas character NFT! Personalized with colors from @${nft.username}'s Farcaster profile picture. Mint your own Winter Cheer NFT now!`,
      openGraph: {
        title: `Winter Cheer #${nft.fid} by @${nft.username}`,
        description: `Unique AI-generated Christmas NFT with personalized colors from @${nft.username}'s PFP`,
        url: pageUrl,
        siteName: 'Winter Cheer NFT Collection',
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 1200,
            alt: `Winter Cheer #${nft.fid}`,
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `Winter Cheer #${nft.fid} by @${nft.username}`,
        description: `AI-generated Christmas NFT on Base blockchain`,
        images: [imageUrl],
      },
      other: {
        // Farcaster Mini App Embed
        'fc:miniapp': JSON.stringify(miniAppEmbed),
        // Legacy frame support
        'fc:frame': JSON.stringify(miniAppEmbed),
        'fc:frame:image': imageUrl,
        'fc:frame:image:aspect_ratio': '1:1',
        'fc:frame:button:1': '🎄 View Full NFT',
        'fc:frame:button:1:action': 'link',
        'fc:frame:button:1:target': pageUrl,
        'fc:frame:button:2': '✨ Mint Your Own',
        'fc:frame:button:2:action': 'link',
        'fc:frame:button:2:target': baseUrl,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    
    return {
      title: 'Winter Cheer NFT Collection',
      description: 'AI-generated Christmas character NFTs on Base blockchain',
    };
  }
}

export default function NFTLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
