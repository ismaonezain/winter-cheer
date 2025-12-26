/**
 * PFP Color Analysis
 * Extracts dominant color from Farcaster profile picture
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Make color more saturated and festive for Christmas theme
 */
function enhanceColorForChristmas(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  // Increase saturation
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const delta = max - min;

  if (delta === 0) {
    // Grayscale - convert to festive red
    return '#DC2626';
  }

  // Boost saturation by 30%
  const boost = 1.3;
  const newR = Math.min(255, Math.round(rgb.r + (rgb.r - min) * boost));
  const newG = Math.min(255, Math.round(rgb.g + (rgb.g - min) * boost));
  const newB = Math.min(255, Math.round(rgb.b + (rgb.b - min) * boost));

  return rgbToHex(newR, newG, newB);
}

/**
 * Analyze image and extract dominant color
 * Uses canvas-based color sampling
 */
export async function analyzePFP(imageUrl: string): Promise<string> {
  try {
    // Fetch image as blob
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.warn('Failed to fetch PFP, using default color');
      return '#DC2626'; // Default festive red
    }

    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);

    // Create offscreen canvas
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return '#DC2626';
    }

    ctx.drawImage(imageBitmap, 0, 0);

    // Sample pixels from center area (avoid edges/background)
    const imageData = ctx.getImageData(
      imageBitmap.width * 0.25,
      imageBitmap.height * 0.25,
      imageBitmap.width * 0.5,
      imageBitmap.height * 0.5
    );

    const pixels = imageData.data;
    const colorMap: { [key: string]: number } = {};

    // Count color occurrences (simplified color buckets)
    for (let i = 0; i < pixels.length; i += 4) {
      const r = Math.floor(pixels[i] / 32) * 32;
      const g = Math.floor(pixels[i + 1] / 32) * 32;
      const b = Math.floor(pixels[i + 2] / 32) * 32;
      const alpha = pixels[i + 3];

      // Skip transparent/semi-transparent pixels
      if (alpha < 128) continue;

      const colorKey = `${r},${g},${b}`;
      colorMap[colorKey] = (colorMap[colorKey] || 0) + 1;
    }

    // Find most common color
    let dominantColor = '220,38,38'; // Default red
    let maxCount = 0;

    for (const [color, count] of Object.entries(colorMap)) {
      if (count > maxCount) {
        maxCount = count;
        dominantColor = color;
      }
    }

    const [r, g, b] = dominantColor.split(',').map(Number);
    const hexColor = rgbToHex(r, g, b);

    // Enhance for festive theme
    return enhanceColorForChristmas(hexColor);
  } catch (error) {
    console.error('Error analyzing PFP:', error);
    return '#DC2626'; // Fallback to festive red
  }
}

/**
 * Client-side PFP analysis using HTML canvas
 * (for use in browser environment)
 */
export async function analyzePFPClient(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('#DC2626');
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Sample from center
        const imageData = ctx.getImageData(
          img.width * 0.25,
          img.height * 0.25,
          img.width * 0.5,
          img.height * 0.5
        );

        const pixels = imageData.data;
        let r = 0,
          g = 0,
          b = 0,
          count = 0;

        for (let i = 0; i < pixels.length; i += 4) {
          const alpha = pixels[i + 3];
          if (alpha >= 128) {
            r += pixels[i];
            g += pixels[i + 1];
            b += pixels[i + 2];
            count++;
          }
        }

        if (count === 0) {
          resolve('#DC2626');
          return;
        }

        const avgR = Math.round(r / count);
        const avgG = Math.round(g / count);
        const avgB = Math.round(b / count);
        const hexColor = rgbToHex(avgR, avgG, avgB);

        resolve(enhanceColorForChristmas(hexColor));
      } catch (error) {
        console.error('Error in client-side PFP analysis:', error);
        resolve('#DC2626');
      }
    };

    img.onerror = () => {
      console.warn('Failed to load PFP image');
      resolve('#DC2626');
    };

    img.src = imageUrl;
  });
}
