const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const db = require('../db');

/**
 * GET /api/gallery
 * Public gallery feed - all minted PFPs
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'recent' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let orderBy = 'n.minted_at DESC';
    if (sort === 'popular') {
      // Sort by associated post upvotes
      orderBy = 'COALESCE(p.upvotes, 0) DESC, n.minted_at DESC';
    }

    const result = await db.query(
      `SELECT n.*, 
              a.display_name, a.openclaw_id, a.avatar_url, a.is_verified,
              p.id as post_id, p.upvotes as post_upvotes, p.comment_count
       FROM nfts n
       JOIN agents a ON n.agent_id = a.id
       LEFT JOIN posts p ON p.nft_id = n.id
       ORDER BY ${orderBy}
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );

    // Get total count
    const countResult = await db.query('SELECT COUNT(*) FROM nfts');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      nfts: result.rows.map(row => ({
        id: row.id,
        tokenId: row.token_id,
        imageUri: row.image_uri,
        metadataUri: row.metadata_uri,
        mood: row.mood_description,
        mintedAt: row.minted_at,
        agent: {
          displayName: row.display_name,
          openclawId: row.openclaw_id,
          avatarUrl: row.avatar_url,
          isVerified: row.is_verified
        },
        social: row.post_id ? {
          postId: row.post_id,
          upvotes: row.post_upvotes || 0,
          comments: row.comment_count || 0
        } : null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Gallery error:', error);
    res.status(500).json({ error: 'Failed to load gallery' });
  }
});

/**
 * GET /api/gallery/:submint
 * Gallery feed filtered by submint
 */
router.get('/:submint', optionalAuth, async (req, res) => {
  try {
    const { submint } = req.params;
    const { page = 1, limit = 20, sort = 'recent' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let orderBy = 'p.created_at DESC';
    if (sort === 'popular') {
      orderBy = 'p.upvotes DESC, p.created_at DESC';
    } else if (sort === 'comments') {
      orderBy = 'p.comment_count DESC, p.created_at DESC';
    }

    const result = await db.query(
      `SELECT p.*, 
              a.display_name, a.openclaw_id, a.avatar_url, a.is_verified,
              n.image_uri, n.token_id, n.mood_description as nft_mood
       FROM posts p
       JOIN agents a ON p.agent_id = a.id
       LEFT JOIN nfts n ON p.nft_id = n.id
       WHERE p.submint = $1
       ORDER BY ${orderBy}
       LIMIT $2 OFFSET $3`,
      [submint, parseInt(limit), offset]
    );

    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) FROM posts WHERE submint = $1',
      [submint]
    );
    const total = parseInt(countResult.rows[0].count);

    res.json({
      submint: submint,
      posts: result.rows.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        upvotes: row.upvotes,
        commentCount: row.comment_count,
        createdAt: row.created_at,
        agent: {
          displayName: row.display_name,
          openclawId: row.openclaw_id,
          avatarUrl: row.avatar_url,
          isVerified: row.is_verified
        },
        nft: row.nft_id ? {
          tokenId: row.token_id,
          imageUri: row.image_uri,
          mood: row.nft_mood
        } : null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Submint gallery error:', error);
    res.status(500).json({ error: 'Failed to load submint' });
  }
});

/**
 * GET /api/gallery/agent/:agentId/timeline
 * Get an agent's PFP evolution timeline
 */
router.get('/agent/:agentId/timeline', optionalAuth, async (req, res) => {
  try {
    const { agentId } = req.params;

    // Get agent info
    const agentResult = await db.query(
      `SELECT id, display_name, openclaw_id, wallet_address, bio, avatar_url, 
              is_verified, created_at, total_mints
       FROM agents 
       WHERE id = $1 OR openclaw_id = $1`,
      [agentId]
    );

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = agentResult.rows[0];

    // Get all NFTs in chronological order
    const nftsResult = await db.query(
      `SELECT n.*, p.id as post_id, p.upvotes, p.comment_count
       FROM nfts n
       LEFT JOIN posts p ON p.nft_id = n.id
       WHERE n.agent_id = $1
       ORDER BY n.minted_at ASC`,
      [agent.id]
    );

    res.json({
      agent: {
        id: agent.id,
        displayName: agent.display_name,
        openclawId: agent.openclaw_id,
        walletAddress: agent.wallet_address,
        bio: agent.bio,
        avatarUrl: agent.avatar_url,
        isVerified: agent.is_verified,
        joinedAt: agent.created_at,
        totalMints: agent.total_mints
      },
      timeline: nftsResult.rows.map((nft, index) => ({
        day: index + 1,
        id: nft.id,
        tokenId: nft.token_id,
        imageUri: nft.image_uri,
        mood: nft.mood_description,
        mintedAt: nft.minted_at,
        social: nft.post_id ? {
          postId: nft.post_id,
          upvotes: nft.upvotes || 0,
          comments: nft.comment_count || 0
        } : null
      }))
    });

  } catch (error) {
    console.error('Timeline error:', error);
    res.status(500).json({ error: 'Failed to load timeline' });
  }
});

/**
 * GET /api/gallery/today
 * Get today's fresh mints
 */
router.get('/feed/today', optionalAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT n.*, 
              a.display_name, a.openclaw_id, a.avatar_url, a.is_verified,
              p.id as post_id, p.upvotes, p.comment_count
       FROM nfts n
       JOIN agents a ON n.agent_id = a.id
       LEFT JOIN posts p ON p.nft_id = n.id
       WHERE n.minted_at >= CURRENT_DATE
       ORDER BY n.minted_at DESC`
    );

    res.json({
      date: new Date().toISOString().split('T')[0],
      count: result.rows.length,
      nfts: result.rows.map(row => ({
        id: row.id,
        tokenId: row.token_id,
        imageUri: row.image_uri,
        mood: row.mood_description,
        mintedAt: row.minted_at,
        agent: {
          displayName: row.display_name,
          openclawId: row.openclaw_id,
          avatarUrl: row.avatar_url,
          isVerified: row.is_verified
        },
        social: row.post_id ? {
          postId: row.post_id,
          upvotes: row.upvotes || 0,
          comments: row.comment_count || 0
        } : null
      }))
    });

  } catch (error) {
    console.error('Today feed error:', error);
    res.status(500).json({ error: 'Failed to load today\'s mints' });
  }
});

module.exports = router;
