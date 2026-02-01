const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const { authenticateAgent, optionalAuth } = require('../middleware/auth');
const db = require('../db');

// Contract ABI (minimal for minting)
const MOODMINT_ABI = [
  'function mintDaily(address to, string memory metadataUri) external returns (uint256)',
  'function timeUntilNextMint(address agent) external view returns (uint256)',
  'function getAgentTimeline(address agent) external view returns (uint256[])',
  'function getAgentMintCount(address agent) external view returns (uint256)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'event DailyMint(address indexed agent, uint256 indexed tokenId, string metadataUri, uint256 timestamp)'
];

// Get provider and contract based on network
function getContract(useMainnet = false) {
  const rpcUrl = useMainnet 
    ? process.env.BASE_MAINNET_RPC 
    : process.env.BASE_SEPOLIA_RPC;
  const contractAddress = useMainnet
    ? process.env.MOODMINT_CONTRACT_MAINNET
    : process.env.MOODMINT_CONTRACT_TESTNET;

  if (!contractAddress) {
    throw new Error(`Contract not deployed on ${useMainnet ? 'mainnet' : 'testnet'}`);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return new ethers.Contract(contractAddress, MOODMINT_ABI, provider);
}

// Get signer for relayer
function getRelayerSigner(useMainnet = false) {
  const rpcUrl = useMainnet 
    ? process.env.BASE_MAINNET_RPC 
    : process.env.BASE_SEPOLIA_RPC;
  
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
}

/**
 * POST /api/nft/mint
 * Mint a new daily PFP NFT
 */
router.post('/mint', authenticateAgent, async (req, res) => {
  try {
    const { metadataUri, mood, imageUri, useMainnet } = req.body;
    const agentId = req.agent.id;

    if (!metadataUri) {
      return res.status(400).json({ error: 'metadataUri is required' });
    }

    // Get agent's wallet address
    const agentResult = await db.query(
      'SELECT wallet_address, last_mint_at, total_mints FROM agents WHERE id = $1',
      [agentId]
    );
    const agent = agentResult.rows[0];

    // Double-check cooldown
    if (agent.last_mint_at) {
      const lastMint = new Date(agent.last_mint_at);
      const now = new Date();
      const hoursSinceMint = (now - lastMint) / (1000 * 60 * 60);
      
      if (hoursSinceMint < 24) {
        return res.status(429).json({ 
          error: 'Must wait 24 hours between mints',
          hoursRemaining: Math.ceil(24 - hoursSinceMint)
        });
      }
    }

    // Get contract with relayer signer
    const network = useMainnet === true;
    const contractAddress = network
      ? process.env.MOODMINT_CONTRACT_MAINNET
      : process.env.MOODMINT_CONTRACT_TESTNET;

    if (!contractAddress) {
      return res.status(503).json({ 
        error: `Contract not deployed on ${network ? 'mainnet' : 'testnet'}`
      });
    }

    const signer = getRelayerSigner(network);
    const contract = new ethers.Contract(contractAddress, MOODMINT_ABI, signer);

    // Mint NFT via relayer
    console.log(`Minting for ${agent.wallet_address} on ${network ? 'mainnet' : 'testnet'}...`);
    
    const tx = await contract.mintDaily(agent.wallet_address, metadataUri);
    const receipt = await tx.wait();

    // Parse the DailyMint event to get tokenId
    const mintEvent = receipt.logs.find(log => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === 'DailyMint';
      } catch {
        return false;
      }
    });

    let tokenId = null;
    if (mintEvent) {
      const parsed = contract.interface.parseLog(mintEvent);
      tokenId = Number(parsed.args.tokenId);
    }

    // Store NFT in database
    const nftResult = await db.query(
      `INSERT INTO nfts (agent_id, token_id, ipfs_hash, metadata_uri, image_uri, tx_hash, mood_description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, token_id, metadata_uri, tx_hash, minted_at`,
      [
        agentId,
        tokenId,
        metadataUri.replace('ipfs://', ''),
        metadataUri,
        imageUri || '',
        receipt.hash,
        mood || null
      ]
    );

    // Update agent's mint stats
    await db.query(
      'UPDATE agents SET last_mint_at = NOW(), total_mints = total_mints + 1 WHERE id = $1',
      [agentId]
    );

    const nft = nftResult.rows[0];

    res.json({
      success: true,
      nft: {
        id: nft.id,
        tokenId: tokenId,
        metadataUri: metadataUri,
        txHash: receipt.hash,
        mintedAt: nft.minted_at
      },
      explorer: `https://${network ? '' : 'sepolia.'}basescan.org/tx/${receipt.hash}`,
      opensea: network 
        ? `https://opensea.io/assets/base/${contractAddress}/${tokenId}`
        : `https://testnets.opensea.io/assets/base-sepolia/${contractAddress}/${tokenId}`
    });

  } catch (error) {
    console.error('Mint error:', error);
    
    if (error.message?.includes('Must wait 24 hours')) {
      return res.status(429).json({ error: 'Must wait 24 hours between mints' });
    }
    
    res.status(500).json({ error: 'Failed to mint NFT' });
  }
});

/**
 * GET /api/nft/:agentId
 * Get all NFTs for an agent
 */
router.get('/:agentId', optionalAuth, async (req, res) => {
  try {
    const { agentId } = req.params;

    const result = await db.query(
      `SELECT n.*, a.display_name, a.openclaw_id, a.wallet_address
       FROM nfts n
       JOIN agents a ON n.agent_id = a.id
       WHERE a.id = $1 OR a.openclaw_id = $1
       ORDER BY n.minted_at DESC`,
      [agentId]
    );

    res.json({
      agent: result.rows[0] ? {
        displayName: result.rows[0].display_name,
        openclawId: result.rows[0].openclaw_id,
        walletAddress: result.rows[0].wallet_address
      } : null,
      nfts: result.rows.map(row => ({
        id: row.id,
        tokenId: row.token_id,
        imageUri: row.image_uri,
        metadataUri: row.metadata_uri,
        mood: row.mood_description,
        txHash: row.tx_hash,
        mintedAt: row.minted_at
      })),
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get NFTs error:', error);
    res.status(500).json({ error: 'Failed to get NFTs' });
  }
});

/**
 * GET /api/nft/status/:agentId
 * Check mint status/cooldown for an agent
 */
router.get('/status/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;

    const result = await db.query(
      'SELECT wallet_address, last_mint_at, total_mints FROM agents WHERE id = $1 OR openclaw_id = $1',
      [agentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = result.rows[0];
    let canMint = true;
    let hoursRemaining = 0;
    let nextMintAt = null;

    if (agent.last_mint_at) {
      const lastMint = new Date(agent.last_mint_at);
      const now = new Date();
      const hoursSinceMint = (now - lastMint) / (1000 * 60 * 60);
      
      if (hoursSinceMint < 24) {
        canMint = false;
        hoursRemaining = Math.ceil(24 - hoursSinceMint);
        nextMintAt = new Date(lastMint.getTime() + 24 * 60 * 60 * 1000);
      }
    }

    res.json({
      canMint,
      hoursRemaining,
      nextMintAt,
      totalMints: agent.total_mints,
      lastMintAt: agent.last_mint_at
    });

  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

module.exports = router;
