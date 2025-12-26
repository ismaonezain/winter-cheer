/**
 * Supabase Client Configuration
 * For Winter Cheer NFT Collection Database
 */

import { createClient } from '@supabase/supabase-js';

// Hardcoded Supabase credentials for Winter Cheer NFT Collection
const supabaseUrl = 'https://ztnkuomgjfkyhroaeduo.supabase.co';
const supabaseAnonKey = '..';

// Create Supabase client
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: false,
    },
  }
);

export const isSupabaseConfigured = true;

// Database Types
export interface MintedNFT {
  id: number;
  fid: number;
  username: string | null;
  token_id: number | null;
  image_ipfs_uri: string | null;
  image_gateway_url: string | null; // Added gateway URL for display
  metadata_ipfs_uri: string | null;
  metadata_gateway_url: string | null; // Added gateway URL for metadata
  traits: Record<string, string | number>;
  tx_hash: string | null;
  minted_at: string;
}

export interface NFTMetadataCache {
  id: number;
  fid: number;
  gender: string;
  dominant_color: string;
  traits: Record<string, string | number>;
  image_url: string | null;
  created_at: string;
}

export interface MintStats {
  id: number;
  total_minted: number;
  max_supply: number;
  updated_at: string;
}

export interface NotificationToken {
  id: number;
  fid: number;
  username: string | null;
  token: string;
  notification_url: string;
  is_active: boolean;
  added_at: string;
  updated_at: string;
}
