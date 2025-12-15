/**
 * API Route: Generate NFT
 * Creates unique Winter Cheer NFT based on FID, gender, and PFP color
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateTraits, buildPromptFromTraits, traitsToAttributes } from '@/lib/trait-generator';
import { fluxproSubmit, fluxproPollStatus, fluxproFetchImages } from '@/fluxpro-api';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { fid, gender, dominantColor } = body;

    if (!fid || !gender || !dominantColor) {
      return NextResponse.json(
        { error: 'Missing required fields: fid, gender, dominantColor' },
        { status: 400 }
      );
    }

    // Generate traits
    const traits = generateTraits(fid, gender, dominantColor);

    // Build AI prompt
    const prompt = buildPromptFromTraits(traits);

    // Generate image with Flux Pro
    console.log(`Generating NFT for FID ${fid} with Flux Pro...`);
    const requestId = await fluxproSubmit({
      prompt,
      aspect_ratio: '1:1',
      num_images: 1,
      output_format: 'png',
      safety_tolerance: '3',
    });

    // Poll for completion
    console.log(`Polling for Flux Pro completion (request ${requestId})...`);
    await fluxproPollStatus(requestId);

    // Fetch generated images
    const images = await fluxproFetchImages(requestId);
    if (!images || images.length === 0) {
      throw new Error('No images generated');
    }

    const imageUrl = images[0].url;

    // Prepare metadata
    const attributes = traitsToAttributes(traits);

    return NextResponse.json({
      success: true,
      imageUrl,
      traits,
      attributes,
    });
  } catch (error) {
    console.error('Error generating NFT:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to generate NFT: ${message}` }, { status: 500 });
  }
}
