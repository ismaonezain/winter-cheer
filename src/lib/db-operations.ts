/**
 * Database Operations for Winter Cheer NFT Collection
 * Handles all Supabase queries for mint tracking
 */

import { supabase, isSupabaseConfigured, type MintedNFT, type NFTMetadataCache, type MintStats } from './supabase';

/**
 * Check if a Farcaster FID has already minted
 * @param fid - Farcaster ID
 * @returns boolean - true if already minted
 */
export async function checkFIDMinted(fid: number): Promise<boolean> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured');
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('minted_nfts')
      .select('fid')
      .eq('fid', fid)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking FID:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Exception checking FID:', error);
    return false;
  }
}

/**
 * Record a new NFT mint
 * @param mintData - Mint details
 */
export async function recordMint(mintData: {
  fid: number;
  username: string;
  token_id: number;
  image_ipfs_uri: string;
  image_gateway_url: string;
  metadata_ipfs_uri: string;
  metadata_gateway_url: string;
  traits: Record<string, string | number>;
  tx_hash: string;
}): Promise<void> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured, skipping mint record');
    return;
  }

  const { error: mintError } = await supabase
    .from('minted_nfts')
    .insert([mintData]);

  if (mintError) {
    console.error('Error recording mint:', mintError);
    throw new Error(`Failed to record mint: ${mintError.message}`);
  }

  // Increment total minted count
  const { error: statsError } = await supabase.rpc('increment_minted_count');

  if (statsError) {
    console.error('Error updating mint stats:', statsError);
  }
}

/**
 * Get current mint statistics
 */
export async function getMintStats(): Promise<MintStats | null> {
  if (!isSupabaseConfigured) {
    return { id: 1, total_minted: 0, max_supply: 10000, updated_at: new Date().toISOString() };
  }

  try {
    const { data, error } = await supabase
      .from('mint_stats')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Error fetching mint stats:', error);
      return null;
    }

    return data as MintStats;
  } catch (error) {
    console.error('Exception fetching mint stats:', error);
    return null;
  }
}

/**
 * Save metadata cache for preview
 */
export async function saveMetadataCache(cacheData: {
  fid: number;
  gender: string;
  dominant_color: string;
  traits: Record<string, string | number>;
  image_url: string;
}): Promise<void> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured, skipping metadata cache');
    return;
  }

  const { error } = await supabase
    .from('nft_metadata_cache')
    .insert([cacheData]);

  if (error) {
    console.error('Error saving metadata cache:', error);
    throw new Error(`Failed to save cache: ${error.message}`);
  }
}

/**
 * Get all minted NFTs (for gallery/leaderboard)
 */
export async function getAllMintedNFTs(
  limit: number = 100,
  offset: number = 0
): Promise<MintedNFT[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('minted_nfts')
      .select('*')
      .order('minted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching minted NFTs:', error);
      return [];
    }

    return (data as MintedNFT[]) || [];
  } catch (error) {
    console.error('Exception fetching minted NFTs:', error);
    return [];
  }
}

/**
 * Get NFT by FID
 */
export async function getNFTByFID(fid: number): Promise<MintedNFT | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('minted_nfts')
      .select('*')
      .eq('fid', fid)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching NFT by FID:', error);
      return null;
    }

    return data as MintedNFT;
  } catch (error) {
    console.error('Exception fetching NFT by FID:', error);
    return null;
  }
}
