# Winter Cheer NFT - Supabase Database Setup

This document contains the SQL schema needed to set up the Supabase database for the Winter Cheer NFT Collection.

## Database Tables

### 1. minted_nfts
Tracks all minted NFTs by FID.

```sql
CREATE TABLE minted_nfts (
  id BIGSERIAL PRIMARY KEY,
  fid BIGINT UNIQUE NOT NULL,
  username TEXT,
  token_id BIGINT,
  image_ipfs_uri TEXT,
  metadata_ipfs_uri TEXT,
  traits JSONB NOT NULL,
  tx_hash TEXT,
  minted_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast FID lookup
CREATE INDEX idx_minted_nfts_fid ON minted_nfts(fid);

-- Index for token_id
CREATE INDEX idx_minted_nfts_token_id ON minted_nfts(token_id);
```

### 2. nft_metadata_cache
Caches generated metadata before minting (optional).

```sql
CREATE TABLE nft_metadata_cache (
  id BIGSERIAL PRIMARY KEY,
  fid BIGINT NOT NULL,
  gender TEXT NOT NULL,
  dominant_color TEXT NOT NULL,
  traits JSONB NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for FID lookup
CREATE INDEX idx_nft_metadata_cache_fid ON nft_metadata_cache(fid);
```

### 3. mint_stats
Tracks overall collection statistics.

```sql
CREATE TABLE mint_stats (
  id INTEGER PRIMARY KEY DEFAULT 1,
  total_minted INTEGER DEFAULT 0,
  max_supply INTEGER DEFAULT 10000,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial stats row
INSERT INTO mint_stats (id, total_minted, max_supply) 
VALUES (1, 0, 10000)
ON CONFLICT (id) DO NOTHING;

-- Ensure only one row exists
CREATE UNIQUE INDEX idx_mint_stats_singleton ON mint_stats(id);
```

## Database Functions

### increment_minted_count
Atomically increments the total minted count.

```sql
CREATE OR REPLACE FUNCTION increment_minted_count()
RETURNS void AS $$
BEGIN
  UPDATE mint_stats 
  SET 
    total_minted = total_minted + 1,
    updated_at = NOW()
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql;
```

## Row Level Security (RLS)

Enable RLS for all tables and allow public read access:

```sql
-- Enable RLS
ALTER TABLE minted_nfts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nft_metadata_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE mint_stats ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read on minted_nfts" 
  ON minted_nfts FOR SELECT 
  USING (true);

CREATE POLICY "Allow public read on nft_metadata_cache" 
  ON nft_metadata_cache FOR SELECT 
  USING (true);

CREATE POLICY "Allow public read on mint_stats" 
  ON mint_stats FOR SELECT 
  USING (true);

-- Allow insert from API (service role)
CREATE POLICY "Allow service role insert on minted_nfts"
  ON minted_nfts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow service role insert on nft_metadata_cache"
  ON nft_metadata_cache FOR INSERT
  WITH CHECK (true);
```

## Setup Instructions

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor in your Supabase dashboard
3. Run all the SQL commands above in order
4. Copy your project URL and anon key to your `.env.local` file:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

## Verification

To verify your setup, run these queries:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check mint stats
SELECT * FROM mint_stats;

-- Test increment function
SELECT increment_minted_count();
SELECT * FROM mint_stats;
```

## Notes

- The `minted_nfts` table enforces one mint per FID via the UNIQUE constraint
- The `mint_stats` table is a singleton (only one row)
- All timestamps are stored in UTC
- JSONB is used for flexible trait storage
