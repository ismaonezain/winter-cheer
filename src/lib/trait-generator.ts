/**
 * Winter Cheer NFT Trait Generation System
 * Generates unique traits based on FID with 6.2B+ possible combinations
 */

export interface WinterCheerTraits {
  gender: 'Male' | 'Female';
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyeStyle: string;
  outfit: string;
  outfitColor: string;
  accessory: string;
  headAccessory: string;
  background: string;
  specialEffect: string;
}

const SKIN_TONES = ['Porcelain', 'Fair', 'Light', 'Medium', 'Tan', 'Deep'];

const HAIR_STYLES = [
  'Short Spiky',
  'Wavy Bob',
  'Long Straight',
  'Twin Tails',
  'Ponytail',
  'Messy Bun',
  'Braided Crown',
  'Side Part',
  'Curly Afro',
  'Pixie Cut',
  'Long Wavy',
  'Straight Bang',
  'Side Swept',
  'High Ponytail',
  'Low Pigtails',
  'Shoulder Length',
  'Wolf Cut',
  'Mullet',
  'Buzz Cut',
  'Dreadlocks',
];

const EYE_STYLES = [
  'Round Sparkle',
  'Sleepy',
  'Cat Eyes',
  'Wide Innocent',
  'Sharp',
  'Determined',
  'Gentle',
  'Mysterious',
  'Happy Crescent',
  'Serious',
  'Cute Dot',
  'Starry',
  'Sad',
  'Closed Smile',
  'Intense',
];

const OUTFITS = [
  'Santa Suit',
  'Ski Outfit',
  'Rudolf Costume',
  'Elf Outfit',
  'Snowman Costume',
  'Gingerbread Costume',
  'Ice Royalty',
  'Candy Cane Striped',
  'Mrs. Claus Dress',
  'Winter Warrior',
];

const ACCESSORIES = [
  'Candy Cane',
  'Teddy Bear',
  'Gift Box',
  'Snowflake Wand',
  'Ornament Ball',
  'Jingle Bells',
  'Mistletoe Branch',
  'Winter Scarf',
  'Snow Globe',
  'Holiday Wreath',
  'Hot Cocoa Mug',
  'Gingerbread Cookie',
  'String Lights',
  'Poinsettia',
  'None',
];

const HEAD_ACCESSORIES = [
  'Santa Hat',
  'Reindeer Antlers',
  'Elf Hat',
  'Winter Beanie',
  'Fuzzy Earmuffs',
  'Holly Crown',
  'Snowflake Tiara',
  'Knit Cap',
  'Aviator Hat',
  'Halo',
  'Festive Headband',
  'None',
];

const BACKGROUNDS = [
  'Snowy Forest',
  'Cozy Fireplace Room',
  'North Pole Workshop',
  'Snow-Covered Village',
  'Starry Winter Night',
  'Aurora Borealis',
  'Candy Cane Land',
  "Santa's Workshop Interior",
  'Ice Castle',
  'Christmas Tree Farm',
];

const SPECIAL_EFFECTS = [
  'Falling Snowflakes',
  'Magic Sparkles',
  'Festive Glow',
  'Frost Particles',
  'Golden Light',
  'Star Dust',
  'Aurora Shimmer',
  'None',
];

/**
 * Generate a deterministic pseudo-random number based on FID and seed
 */
function seededRandom(fid: number, seed: number): number {
  const x = Math.sin(fid * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Pick random item from array using seeded random
 */
function pickRandom<T>(array: T[], fid: number, seed: number): T {
  const index = Math.floor(seededRandom(fid, seed) * array.length);
  return array[index];
}

/**
 * Generate unique traits for a Winter Cheer NFT based on FID
 * @param fid - Farcaster ID
 * @param gender - User-selected gender
 * @param dominantColor - Color extracted from PFP (hex format)
 * @returns WinterCheerTraits
 */
export function generateTraits(
  fid: number,
  gender: 'Male' | 'Female',
  dominantColor: string
): WinterCheerTraits {
  const traits: WinterCheerTraits = {
    gender,
    skinTone: pickRandom(SKIN_TONES, fid, 1),
    hairStyle: pickRandom(HAIR_STYLES, fid, 2),
    hairColor: dominantColor,
    eyeStyle: pickRandom(EYE_STYLES, fid, 3),
    outfit: pickRandom(OUTFITS, fid, 4),
    outfitColor: dominantColor,
    accessory: pickRandom(ACCESSORIES, fid, 5),
    headAccessory: pickRandom(HEAD_ACCESSORIES, fid, 6),
    background: pickRandom(BACKGROUNDS, fid, 7),
    specialEffect: pickRandom(SPECIAL_EFFECTS, fid, 8),
  };

  return traits;
}

/**
 * Convert traits to OpenSea-compatible metadata attributes
 */
export function traitsToAttributes(traits: WinterCheerTraits): Array<{
  trait_type: string;
  value: string | number;
}> {
  return [
    { trait_type: 'Gender', value: traits.gender },
    { trait_type: 'Skin Tone', value: traits.skinTone },
    { trait_type: 'Hair Style', value: traits.hairStyle },
    { trait_type: 'Hair Color', value: traits.hairColor },
    { trait_type: 'Eye Style', value: traits.eyeStyle },
    { trait_type: 'Outfit', value: traits.outfit },
    { trait_type: 'Outfit Color', value: traits.outfitColor },
    { trait_type: 'Accessory', value: traits.accessory },
    { trait_type: 'Head Accessory', value: traits.headAccessory },
    { trait_type: 'Background', value: traits.background },
    { trait_type: 'Special Effect', value: traits.specialEffect },
  ];
}

/**
 * Convert hex color to descriptive color name for AI prompt
 */
function hexToColorName(hex: string): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  // Convert to HSL for better color identification
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;
  
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) / 6;
    } else if (max === gNorm) {
      h = ((bNorm - rNorm) / delta + 2) / 6;
    } else {
      h = ((rNorm - gNorm) / delta + 4) / 6;
    }
  }
  
  // Determine brightness descriptor
  let brightness = '';
  if (l > 0.8) brightness = 'very light';
  else if (l > 0.6) brightness = 'light';
  else if (l > 0.4) brightness = 'medium';
  else if (l > 0.2) brightness = 'deep';
  else brightness = 'very dark';
  
  // Determine saturation descriptor
  let saturation = '';
  if (s > 0.8) saturation = 'vivid';
  else if (s > 0.5) saturation = 'vibrant';
  else if (s > 0.2) saturation = 'muted';
  else saturation = 'pale';
  
  // Determine hue name
  const hue = h * 360;
  let colorFamily = '';
  
  if (s < 0.1) {
    // Grayscale
    if (l > 0.9) return 'pure white';
    if (l > 0.7) return 'light gray';
    if (l > 0.5) return 'medium gray';
    if (l > 0.3) return 'dark gray';
    return 'black';
  }
  
  // Color families based on hue
  if (hue < 15 || hue >= 345) colorFamily = 'red';
  else if (hue < 45) colorFamily = 'orange-red';
  else if (hue < 70) colorFamily = 'orange';
  else if (hue < 90) colorFamily = 'yellow-orange';
  else if (hue < 150) colorFamily = 'yellow-green';
  else if (hue < 170) colorFamily = 'green';
  else if (hue < 200) colorFamily = 'cyan-green';
  else if (hue < 220) colorFamily = 'cyan';
  else if (hue < 250) colorFamily = 'blue';
  else if (hue < 280) colorFamily = 'purple-blue';
  else if (hue < 310) colorFamily = 'purple';
  else if (hue < 330) colorFamily = 'magenta';
  else colorFamily = 'pink-red';
  
  return `${saturation} ${brightness} ${colorFamily}`;
}

/**
 * Build AI generation prompt from traits
 */
export function buildPromptFromTraits(traits: WinterCheerTraits): string {
  // Strengthen gender description with masculine/feminine features
  const genderDesc = traits.gender === 'Male' 
    ? 'masculine anime boy with sharp facial features, defined jawline, broader shoulders, boyish charm'
    : 'feminine anime girl with soft delicate features, gentle expression, graceful appearance, cute demeanor';
  
  const styleDesc = 'cute anime chibi character';

  // Convert hex to descriptive color name for AI understanding
  const descriptiveColor = hexToColorName(traits.hairColor);
  
  // STRONG emphasis on color matching PFP with descriptive color names
  const hairColorEmphasis = `BRIGHT ${descriptiveColor} colored hair, the hair MUST be EXACTLY this ${descriptiveColor} shade`;
  const outfitColorEmphasis = `${traits.outfit.toLowerCase()} outfit that MUST be PRECISELY ${descriptiveColor} color, matching the hair color EXACTLY`;

  return `${styleDesc} ${genderDesc}, ${traits.skinTone.toLowerCase()} skin tone, ${traits.hairStyle.toLowerCase()} hairstyle with ${hairColorEmphasis}, ${traits.eyeStyle.toLowerCase()} eyes, wearing ${outfitColorEmphasis}. CRITICAL: Both the hair AND outfit MUST be ${descriptiveColor} color. Holding ${traits.accessory.toLowerCase()}, wearing ${traits.headAccessory.toLowerCase()}, ${traits.background.toLowerCase()} background, ${traits.specialEffect.toLowerCase()}, kawaii Christmas aesthetic, Seal Online game character style, professional anime illustration, 4k quality, detailed and colorful. THE PRIMARY COLOR SCHEME MUST BE ${descriptiveColor} for both hair and outfit - this is MANDATORY.`;
}
