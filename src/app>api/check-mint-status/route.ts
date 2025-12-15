/**
 * API Route: Check Mint Status
 * Checks if a FID has already minted an NFT
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkFIDMinted, getMintStats, getNFTByFID } from '@/lib/db-operations';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const fidParam = searchParams.get('fid');

    if (!fidParam) {
      return NextResponse.json({ error: 'Missing FID parameter' }, { status: 400 });
    }

    const fid = parseInt(fidParam, 10);
    if (isNaN(fid)) {
      return NextResponse.json({ error: 'Invalid FID' }, { status: 400 });
    }

    // Check if FID has minted
    const hasMinted = await checkFIDMinted(fid);

    // Get mint stats
    const stats = await getMintStats();

    // If already minted, get NFT details
    let nft = null;
    if (hasMinted) {
      nft = await getNFTByFID(fid);
    }

    return NextResponse.json({
      success: true,
      fid,
      hasMinted,
      nft,
      stats: {
        totalMinted: stats?.total_minted || 0,
        maxSupply: stats?.max_supply || 10000,
        remaining: (stats?.max_supply || 10000) - (stats?.total_minted || 0),
      },
    });
  } catch (error) {
    console.error('Error checking mint status:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to check mint status: ${message}` }, { status: 500 });
  }
}
