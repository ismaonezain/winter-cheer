import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dxevkizzvxitlshvihhy.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4ZXZraXp6dnhpdGxzaHZpaGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYwNjk5NTQsImV4cCI6MjA1MTY0NTk1NH0.VCN4hFqQ8VL_tIr6Z8w0HdY6gG02vN5HGOD5Uf8zcTM';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
): Promise<NextResponse> {
  try {
    const tokenId = params.tokenId;

    if (!tokenId) {
      return NextResponse.json(
        { success: false, error: 'Token ID is required' },
        { status: 400 }
      );
    }

    // Query the NFT from Supabase
    const { data, error } = await supabase
      .from('minted_nfts')
      .select('*')
      .eq('token_id', tokenId)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'NFT not found' },
        { status: 404 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'NFT not found' },
        { status: 404 }
      );
    }

    // Format the response
    const nft = {
      tokenId: data.token_id,
      fid: data.fid,
      username: data.username || `User ${data.fid}`,
      imageUrl: data.image_ipfs_uri,
      traits: data.traits,
      imageIpfsUri: data.image_ipfs_uri,
      metadataIpfsUri: data.metadata_ipfs_uri,
      mintedAt: data.created_at,
    };

    return NextResponse.json({
      success: true,
      nft,
    });

  } catch (error) {
    console.error('Error fetching NFT:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
