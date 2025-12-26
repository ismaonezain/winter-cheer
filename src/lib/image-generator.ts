/**
 * AI Image Generation & Compression for Winter Cheer NFTs
 * Uses Flux for generation and server-side API for compression to 1200px
 */

import { fluxproSubmit, fluxproPollStatus, fluxproFetchImages } from '@/fluxpro-api';

export interface GeneratedImage {
  url: string;
  compressedDataUrl: string;
  width: number;
  height: number;
}

/**
 * Generate and compress NFT character image
 */
export async function generateNFTImage(prompt: string): Promise<GeneratedImage> {
  console.log('Generating NFT image with Flux...');
  
  // Submit generation request
  const requestId = await fluxproSubmit({
    prompt,
    aspect_ratio: '1:1',
    num_images: 1,
    output_format: 'png',
    safety_tolerance: '3',
  });
  
  console.log('Flux request ID:', requestId);
  
  // Poll for completion
  await fluxproPollStatus(requestId);
  
  // Fetch result
  const images = await fluxproFetchImages(requestId);
  
  if (!images || images.length === 0) {
    throw new Error('No images generated');
  }
  
  const imageUrl = images[0].url;
  console.log('Generated image URL:', imageUrl);
  
  // Compress image to 1200px max dimension using server-side API
  const compressedDataUrl = await compressImage(imageUrl);
  
  return {
    url: imageUrl,
    compressedDataUrl,
    width: 1200,
    height: 1200,
  };
}

/**
 * Compress image to 1200px max dimension via server-side API
 */
async function compressImage(imageUrl: string): Promise<string> {
  try {
    console.log('Compressing image to 1200px...');
    
    const response = await fetch('/api/compress-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
      throw new Error(`Compression failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.dataUrl) {
      throw new Error('Invalid compression response');
    }

    console.log(`Image compressed: ${data.originalSize} -> ${data.compressedSize} bytes`);
    
    return data.dataUrl;
  } catch (error) {
    console.error('Error compressing image:', error);
    // If compression fails, return original URL
    return imageUrl;
  }
}

/**
 * Convert data URL to Blob for IPFS upload
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const contentType = parts[0].split(':')[1].split(';')[0];
  const byteString = atob(parts[1]);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([arrayBuffer], { type: contentType });
}
