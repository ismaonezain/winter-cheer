'use client';

/**
 * Main hook for Winter Cheer NFT minting process
 * Orchestrates: PFP analysis, trait generation, image generation, IPFS upload, minting
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { DbConnection, tables } from '@/spacetime_module_bindings';
import type { Infer } from 'spacetimedb';
import { analyzePfpColor, adjustColorForWinter } from '@/lib/pfp-analyzer';
import { generateTraits, buildAIPrompt, generateMetadata, type NFTTraits } from '@/lib/trait-generator';
import { generateNFTImage, dataUrlToBlob } from '@/lib/image-generator';
import { pinataUploadImageWithMetadata, type PinataImageWithMetadataResult } from '@/pinata-media-api';
import { prepareMintTransaction, generateTokenId, MINT_PRICE, type Address } from '@/lib/nft-contract';
import { Timestamp } from 'spacetimedb';

type DbConnectionType = Infer<typeof DbConnection>;

export interface MintState {
  step: 'idle' | 'analyzing' | 'generating' | 'uploading' | 'minting' | 'success' | 'error';
  message: string;
  progress: number;
  traits: NFTTraits | null;
  previewImageUrl: string | null;
  txHash: string | null;
  tokenId: bigint | null;
  error: string | null;
}

export function useWinterCheerMint() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  const [fid, setFid] = useState<number | null>(null);
  const [pfpUrl, setPfpUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [hasAlreadyMinted, setHasAlreadyMinted] = useState(false);
  const [selectedGender, setSelectedGender] = useState<'Male' | 'Female'>('Male');
  
  const [mintState, setMintState] = useState<MintState>({
    step: 'idle',
    message: '',
    progress: 0,
    traits: null,
    previewImageUrl: null,
    txHash: null,
    tokenId: null,
    error: null,
  });
  
  const connectionRef = useRef<DbConnectionType | null>(null);
  const [spaceConnected, setSpaceConnected] = useState(false);

  // Initialize Farcaster context
  useEffect(() => {
    async function loadFarcasterContext() {
      try {
        await sdk.actions.ready();
        const context = await sdk.context;
        
        if (context?.user) {
          setFid(context.user.fid);
          setPfpUrl(context.user.pfpUrl || null);
          setUsername(context.user.username || null);
        }
      } catch (error) {
        console.error('Error loading Farcaster context:', error);
      }
    }
    
    loadFarcasterContext();
  }, []);

  // Initialize SpacetimeDB connection
  useEffect(() => {
    if (connectionRef.current) return;

    const dbHost = 'wss://maincloud.spacetimedb.com';
    const dbName = process.env.NEXT_PUBLIC_SPACETIME_MODULE_NAME || 'wintercheer';

    const onConnect = (connection: DbConnectionType) => {
      console.log('Connected to SpacetimeDB');
      connectionRef.current = connection;
      setSpaceConnected(true);
      
      // Subscribe to mint check status
      connection.subscriptionBuilder().subscribe([
        'SELECT * FROM mint_check_status',
        'SELECT * FROM minted_fid',
      ]);
    };

    const onDisconnect = () => {
      console.log('Disconnected from SpacetimeDB');
      connectionRef.current = null;
      setSpaceConnected(false);
    };

    DbConnection.builder()
      .withUri(dbHost)
      .withModuleName(dbName)
      .onConnect(onConnect)
      .onDisconnect(onDisconnect)
      .build();
  }, []);

  // Check if FID has already minted
  useEffect(() => {
    if (!spaceConnected || !fid || !connectionRef.current) return;

    const connection = connectionRef.current;
    
    // Call reducer to check mint status
    connection.reducers.checkFidMinted({ fid: BigInt(fid) });
    
    // Subscribe to mint check result
    const checkResult = () => {
      const status = connection.db.mintCheckStatus.fid.find(BigInt(fid));
      if (status) {
        setHasAlreadyMinted(status.alreadyMinted);
      }
    };
    
    checkResult();
    
    connection.db.mintCheckStatus.onInsert(checkResult);
    connection.db.mintCheckStatus.onUpdate(checkResult);
  }, [spaceConnected, fid]);

  /**
   * Main mint function
   */
  const mintNFT = useCallback(async () => {
    if (!isConnected || !address || !walletClient || !fid || !pfpUrl) {
      setMintState(prev => ({
        ...prev,
        error: 'Please connect wallet and ensure Farcaster context is loaded',
      }));
      return;
    }

    if (hasAlreadyMinted) {
      setMintState(prev => ({
        ...prev,
        error: `FID ${fid} has already minted a Winter Cheer NFT`,
      }));
      return;
    }

    try {
      // Step 1: Analyze PFP
      setMintState({
        step: 'analyzing',
        message: 'Analyzing your profile picture...',
        progress: 10,
        traits: null,
        previewImageUrl: null,
        txHash: null,
        tokenId: null,
        error: null,
      });

      const colorAnalysis = await analyzePfpColor(pfpUrl);
      const adjustedColor = adjustColorForWinter(colorAnalysis.hexColor);
      
      // Step 2: Generate traits
      setMintState(prev => ({
        ...prev,
        message: 'Generating unique traits...',
        progress: 20,
      }));

      const traits = generateTraits(selectedGender, colorAnalysis.dominantColor, fid);
      traits.outfitColor = adjustedColor;
      
      setMintState(prev => ({
        ...prev,
        traits,
        progress: 30,
      }));

      // Step 3: Generate image with AI
      setMintState(prev => ({
        ...prev,
        step: 'generating',
        message: 'Creating your unique character with AI...',
        progress: 40,
      }));

      const aiPrompt = buildAIPrompt(traits);
      const generatedImage = await generateNFTImage(aiPrompt);
      
      setMintState(prev => ({
        ...prev,
        previewImageUrl: generatedImage.compressedDataUrl,
        progress: 60,
      }));

      // Step 4: Upload to IPFS
      setMintState(prev => ({
        ...prev,
        step: 'uploading',
        message: 'Uploading to IPFS...',
        progress: 70,
      }));

      const tokenId = generateTokenId(fid);
      const imageBlob = dataUrlToBlob(generatedImage.compressedDataUrl);
      
      const metadata = generateMetadata(Number(tokenId), fid, traits, '');
      
      const ipfsResult: PinataImageWithMetadataResult = await pinataUploadImageWithMetadata({
        image: imageBlob,
        filename: `winter-cheer-${fid}.png`,
        metadata: {
          name: metadata.name as string,
          description: metadata.description as string,
          attributes: metadata.attributes as Array<{ trait_type: string; value: string }>,
        },
      });

      const metadataUri = ipfsResult.metadata.pin.ipfsUri;
      
      setMintState(prev => ({
        ...prev,
        progress: 80,
      }));

      // Step 5: Mint NFT
      setMintState(prev => ({
        ...prev,
        step: 'minting',
        message: 'Minting your NFT on Base...',
        progress: 85,
      }));

      const mintTx = prepareMintTransaction(address, fid);
      
      const hash = await walletClient.sendTransaction({
        to: mintTx.to,
        data: mintTx.data,
        value: mintTx.value,
        chain: mintTx.chain,
      });

      setMintState(prev => ({
        ...prev,
        message: 'Waiting for confirmation...',
        progress: 90,
      }));

      // Wait for transaction confirmation
      await publicClient?.waitForTransactionReceipt({ hash });

      // Step 6: Record in SpacetimeDB
      if (connectionRef.current) {
        connectionRef.current.reducers.recordNewMint({
          fid: BigInt(fid),
          nftTokenId: tokenId,
          walletAddress: address,
          mintTimestamp: Timestamp.now(),
        });
        
        connectionRef.current.reducers.saveNftMetadata({
          tokenId,
          fid: BigInt(fid),
          metadataJson: JSON.stringify(metadata),
          imageUrl: ipfsResult.image.pin.gatewayUrl,
          ipfsMetadataUri: metadataUri,
        });
      }

      // Success!
      setMintState({
        step: 'success',
        message: 'NFT minted successfully!',
        progress: 100,
        traits,
        previewImageUrl: generatedImage.compressedDataUrl,
        txHash: hash,
        tokenId,
        error: null,
      });
      
    } catch (error) {
      console.error('Mint error:', error);
      setMintState(prev => ({
        ...prev,
        step: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }, [isConnected, address, walletClient, publicClient, fid, pfpUrl, selectedGender, hasAlreadyMinted]);

  return {
    // User data
    fid,
    username,
    pfpUrl,
    address,
    isConnected,
    
    // Mint state
    mintState,
    hasAlreadyMinted,
    selectedGender,
    setSelectedGender,
    
    // Actions
    mintNFT,
    
    // Connection status
    spaceConnected,
  };
}
