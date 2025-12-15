/**
 * API Route: Record Mint
 * Records a successful NFT mint to database
 */

import { NextRequest, NextResponse } from 'next/server';
import { recordMint } from '@/lib/db-operations';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      fid,
      username,
      token_id,
      image_ipfs_uri,
      image_gateway_url,
      metadata_ipfs_uri,
      metadata_gateway_url,
      traits,
      tx_hash,
    } = body;

    if (
      !fid ||
      !username ||
      token_id === undefined ||
      !image_ipfs_uri ||
      !image_gateway_url ||
      !metadata_ipfs_uri ||
      !metadata_gateway_url ||
      !traits ||
      !tx_hash
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Record mint
    await recordMint({
      fid,
      username,
      token_id,
      image_ipfs_uri,
      image_gateway_url,
      metadata_ipfs_uri,
      metadata_gateway_url,
      traits,
      tx_hash,
    });

    return NextResponse.json({
      success: true,
      message: 'Mint recorded successfully',
    });
  } catch (error) {
    console.error('Error recording mint:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to record mint: ${message}` }, { status: 500 });
  }
}
