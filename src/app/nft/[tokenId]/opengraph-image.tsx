import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Winter Cheer NFT';
export const size = {
  width: 1200,
  height: 800,
};
export const contentType = 'image/png';

export default async function OGImage({ params }: { params: { tokenId: string } }) {
  try {
    const tokenId = params.tokenId;
    
    // Fetch NFT data
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://winter-cheer.vercel.app';
    const res = await fetch(`${baseUrl}/api/nft/${tokenId}`);
    const data = await res.json();

    if (!data.success || !data.nft) {
      throw new Error('NFT not found');
    }

    const { nft } = data;

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            padding: '40px',
          }}
        >
          {/* NFT Image */}
          <div
            style={{
              width: '600px',
              height: '600px',
              borderRadius: '24px',
              overflow: 'hidden',
              border: '8px solid white',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              display: 'flex',
            }}
          >
            <img
              src={nft.imageUrl}
              alt={`Winter Cheer #${nft.fid}`}
              width={600}
              height={600}
              style={{
                objectFit: 'cover',
              }}
            />
          </div>

          {/* Title Badge */}
          <div
            style={{
              marginTop: '40px',
              background: 'white',
              padding: '20px 40px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ fontSize: '48px' }}>🎄</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(90deg, #dc2626, #16a34a)',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                Winter Cheer #{nft.fid}
              </div>
              <div style={{ fontSize: '24px', color: '#6b7280' }}>
                @{nft.username}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        ...size,
      }
    );
  } catch (error) {
    // Fallback image
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          <div
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center',
            }}
          >
            🎄 Winter Cheer NFT 🎁
          </div>
        </div>
      ),
      {
        ...size,
      }
    );
  }
}
