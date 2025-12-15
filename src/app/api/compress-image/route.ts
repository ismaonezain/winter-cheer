/**
 * Server-side API route for image compression using Sharp
 * Accepts image URL, compresses to 1200px, returns data URL
 */

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { imageUrl } = await request.json();
    
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'Invalid image URL' },
        { status: 400 }
      );
    }

    console.log('Compressing image:', imageUrl);

    // Fetch image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Compress with Sharp
    const compressed = await sharp(buffer)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png({ quality: 90, compressionLevel: 9 })
      .toBuffer();

    // Convert to data URL
    const base64 = compressed.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    console.log(`Image compressed: ${buffer.length} bytes -> ${compressed.length} bytes`);

    return NextResponse.json({
      success: true,
      dataUrl,
      originalSize: buffer.length,
      compressedSize: compressed.length,
    });
  } catch (error) {
    console.error('Error compressing image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compress image' },
      { status: 500 }
    );
  }
}
