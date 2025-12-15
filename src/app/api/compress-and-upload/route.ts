/**
 * API Route: Compress Image and Upload to IPFS
 * Compresses to 1200px max and uploads to Pinata
 */

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { pinataUploadImageWithMetadata } from '@/pinata-media-api';

const MAX_SIZE = 1200;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { imageUrl, fid, traits, attributes } = body;

    if (!imageUrl || !fid || !traits) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, fid, traits' },
        { status: 400 }
      );
    }

    // Fetch image
    console.log(`Fetching image from: ${imageUrl}`);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get original dimensions
    const metadata = await sharp(buffer).metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;

    console.log(`Original size: ${originalWidth}x${originalHeight}`);

    // Calculate new dimensions (max 1200px on longest side)
    let width = originalWidth;
    let height = originalHeight;

    if (width > MAX_SIZE || height > MAX_SIZE) {
      if (width > height) {
        height = Math.round((height * MAX_SIZE) / width);
        width = MAX_SIZE;
      } else {
        width = Math.round((width * MAX_SIZE) / height);
        height = MAX_SIZE;
      }
    }

    console.log(`Compressed size: ${width}x${height}`);

    // Compress image
    const compressedBuffer = await sharp(buffer)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png({ quality: 90, compressionLevel: 9 })
      .toBuffer();

    console.log(`Compressed from ${buffer.length} to ${compressedBuffer.length} bytes`);

    // Upload to Pinata with metadata
    console.log(`Uploading to IPFS via Pinata...`);
    const result = await pinataUploadImageWithMetadata({
      image: compressedBuffer,
      filename: `winter-cheer-${fid}.png`,
      metadata: {
        name: `Winter Cheer #${fid}`,
        description: 'A unique festive character celebrating the holiday season! Each Winter Cheer NFT is a one-of-a-kind anime-style character with personalized traits derived from your Farcaster profile.',
        attributes: attributes || [],
        external_url: 'https://winter-cheer.ohara.ai',
      },
      network: 'public',
      mimeType: 'image/png',
    });

    return NextResponse.json({
      success: true,
      imageIpfsUri: result.image.pin.ipfsUri,
      imageGatewayUrl: result.image.pin.gatewayUrl,
      metadataIpfsUri: result.metadata.pin.ipfsUri,
      metadataGatewayUrl: result.metadata.pin.gatewayUrl,
      metadata: result.metadata.document,
      compressedSize: {
        width,
        height,
        bytes: compressedBuffer.length,
      },
    });
  } catch (error) {
    console.error('Error compressing and uploading:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to compress and upload: ${message}` },
      { status: 500 }
    );
  }
}
