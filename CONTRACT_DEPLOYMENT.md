# 🎄 Winter Cheer NFT Smart Contract Deployment Guide

## 📝 Contract Overview

Kontrak Winter Cheer NFT menggunakan **satu fungsi mint** yang langsung menerima metadata URI.

### ✨ Function Mint:
- **Function**: `mint(address to, uint256 fid, string uri)` 
- **Benefit**: Metadata URI langsung ter-set on-chain saat mint
- **Simple**: Hanya 1 fungsi mint, tidak ada duplikasi

---

## 🛠️ Solidity Contract Code

Deploy smart contract berikut ke Base Network:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WinterCheerNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public constant MINT_FEE = 0.00001 ether;
    
    uint256 public totalMinted;
    
    // FID => Token ID mapping
    mapping(uint256 => uint256) public farcasterIdToTokenId;
    mapping(uint256 => uint256) public tokenIdToFarcasterId;
    
    event TokenMinted(address indexed to, uint256 indexed tokenId, uint256 indexed fid);
    event MetadataUpdated(uint256 indexed tokenId, string newURI);
    
    constructor() ERC721("Winter Cheer", "WCHEER") Ownable(msg.sender) {}
    
    // Main mint function with metadata URI
    function mint(
        address to, 
        uint256 fid, 
        string memory uri
    ) external payable {
        require(msg.value >= MINT_FEE, "Insufficient mint fee");
        require(totalMinted < MAX_SUPPLY, "Max supply reached");
        require(farcasterIdToTokenId[fid] == 0, "FID already minted");
        require(bytes(uri).length > 0, "Token URI cannot be empty");
        
        totalMinted++;
        uint256 tokenId = totalMinted;
        
        farcasterIdToTokenId[fid] = tokenId;
        tokenIdToFarcasterId[tokenId] = fid;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        emit TokenMinted(to, tokenId, fid);
        emit MetadataUpdated(tokenId, uri);
    }
    
    // Update token URI (only owner)
    function updateTokenURI(uint256 tokenId, string memory newURI) external onlyOwner {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        _setTokenURI(tokenId, newURI);
        emit MetadataUpdated(tokenId, newURI);
    }
    
    // Batch update token URIs
    function batchUpdateTokenURI(
        uint256[] memory tokenIds, 
        string[] memory newURIs
    ) external onlyOwner {
        require(tokenIds.length == newURIs.length, "Array length mismatch");
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(ownerOf(tokenIds[i]) != address(0), "Token does not exist");
            _setTokenURI(tokenIds[i], newURIs[i]);
            emit MetadataUpdated(tokenIds[i], newURIs[i]);
        }
    }
    
    // Helper functions
    function getTokenIdByFid(uint256 fid) external view returns (uint256) {
        return farcasterIdToTokenId[fid];
    }
    
    function hasFidMinted(uint256 fid) external view returns (bool) {
        return farcasterIdToTokenId[fid] != 0;
    }
    
    // Admin mint (without fee)
    function adminMint(address to, uint256 fid) external onlyOwner {
        require(totalMinted < MAX_SUPPLY, "Max supply reached");
        require(farcasterIdToTokenId[fid] == 0, "FID already minted");
        
        totalMinted++;
        uint256 tokenId = totalMinted;
        
        farcasterIdToTokenId[fid] = tokenId;
        tokenIdToFarcasterId[tokenId] = fid;
        
        _safeMint(to, tokenId);
        emit TokenMinted(to, tokenId, fid);
    }
    
    // Withdraw funds
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    function withdrawAmount(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        payable(owner()).transfer(amount);
    }
    
    // Override functions
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (string memory) 
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

---

## 📋 Deployment Steps

### 1. **Install Dependencies**
```bash
npm install @openzeppelin/contracts
```

### 2. **Compile Contract**
```bash
npx hardhat compile
# or
forge build
```

### 3. **Deploy to Base Network**

Using Hardhat:
```javascript
const { ethers } = require("hardhat");

async function main() {
  const WinterCheerNFT = await ethers.getContractFactory("WinterCheerNFT");
  const contract = await WinterCheerNFT.deploy();
  await contract.deployed();
  
  console.log("✅ Winter Cheer NFT deployed to:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Using Foundry:
```bash
forge create WinterCheerNFT \
  --rpc-url https://mainnet.base.org \
  --private-key YOUR_PRIVATE_KEY \
  --verify \
  --etherscan-api-key YOUR_BASESCAN_API_KEY
```

### 4. **Update Contract Address**

Setelah deploy, update contract address di `src/lib/nft-contract.ts`:

```typescript
export const WINTER_CHEER_CONTRACT_ADDRESS: Address = 'YOUR_NEW_CONTRACT_ADDRESS';
```

### 5. **Verify on BaseScan**

```bash
npx hardhat verify --network base YOUR_CONTRACT_ADDRESS
```

---

## 🔧 Testing

Test mint dengan URI:
```javascript
const tx = await contract.mint(
  recipientAddress,
  farcasterFID,
  "ipfs://QmYourMetadataHash",  // uri parameter
  { value: ethers.utils.parseEther("0.00001") }
);

await tx.wait();
console.log("Minted successfully!");
```

---

## ✅ Verification Checklist

- [ ] Contract compiled without errors
- [ ] Deployed to Base network
- [ ] Contract verified on BaseScan
- [ ] Address updated in `src/lib/nft-contract.ts`
- [ ] Test mint successful
- [ ] Metadata URI set correctly on-chain
- [ ] OpenSea displays metadata correctly

---

## 📚 Resources

- **Base Network RPC**: `https://mainnet.base.org`
- **Base Chain ID**: `8453`
- **BaseScan**: `https://basescan.org`
- **OpenZeppelin Contracts**: `@openzeppelin/contracts@^5.0.0`

---

## 🆘 Troubleshooting

### Issue: "FID already minted"
- Each Farcaster ID can only mint once
- Check `hasFidMinted(fid)` before minting

### Issue: "Insufficient mint fee"
- Ensure you send exactly 0.00001 ETH
- Use `parseEther("0.00001")` for proper formatting

### Issue: "Token URI cannot be empty"
- Metadata IPFS URI must be set
- Format: `ipfs://QmHash` or full gateway URL

### Issue: Metadata not showing on OpenSea
- Wait 5-10 minutes for OpenSea to index
- Force refresh metadata on OpenSea
- Verify tokenURI() returns correct URI

---

## 🎨 Supabase Database Setup

Tambahkan kolom baru untuk gateway URLs:

```sql
-- Add gateway URL columns
ALTER TABLE minted_nfts 
ADD COLUMN image_gateway_url TEXT,
ADD COLUMN metadata_gateway_url TEXT;

-- Update existing records with gateway URLs
UPDATE minted_nfts 
SET 
  image_gateway_url = REPLACE(image_ipfs_uri, 'ipfs://', 'https://amber-neighbouring-crayfish-334.mypinata.cloud/ipfs/'),
  metadata_gateway_url = REPLACE(metadata_ipfs_uri, 'ipfs://', 'https://amber-neighbouring-crayfish-334.mypinata.cloud/ipfs/')
WHERE image_ipfs_uri IS NOT NULL;
```

---

## 🎉 Done!

Contract Anda sekarang hanya punya **1 fungsi mint** yang langsung set metadata URI on-chain! NFT akan muncul di OpenSea dengan semua attributes yang benar. 🚀
