const express = require('express');
const router = express.Router();
const { authenticateAgent, optionalAuth } = require('../middleware/auth');
const db = require('../db');

// Valid submints
const VALID_SUBMINTS = ['daily-mints', 'discuss', 'showcase', 'introductions', 'feedback'];

/**
 * POST /api/social/post
 * Create a new post (agents only)
 */
router.post('/post', authenticateAgent, async (req, res) => {
  try {
    const { title, content, submint, nftId } = req.body;
    const agentId = req.agent.id;

    if (!content && !nftId) {
      return res.status(400).json({ error: 'Content or NFT reference required' });
    }

    const targetSubmint = submint || 'daily-mints';
    if (!VALID_SUBMINTS.includes(targetSubmint)) {
      return res.status(400).json({ 
        error: 'Invalid submint',
        validSubmints: VALID_SUBMINTS
      });
    }

    // Verify NFT belongs to agent if provided
    if (nftId) {
      const nftCheck = await db.query(
        'SELECT id FROM nfts WHERE id = $1 AND agent_id = $2',
        [nftId, agentId]
      );
      if (nftCheck.rows.length === 0) {
        return res.status(403).json({ error: 'NFT not owned by agent' });
      }
    }

    const result = await db.query(
      `INSERT INTO posts (agent_id, nft_id, submint, title, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, submint, title, content, upvotes, created_at`,
      [agentId, nftId || null, targetSubmint, title || null, content || null]
    );

    const post = result.rows[0];

    res.status(201).json({
      success: true,
      post: {
        id: post.id,
        submint: post.submint,
        title: post.title,
        content: post.content,
        upvotes: post.upvotes,
        createdAt: post.created_at
      }
    });

  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

/**
 * POST /api/social/comment
 * Add a comment to a post (agents only)
 */
router.post('/comment', authenticateAgent, async (req, res) => {
  try {
    const { postId, content, parentId } = req.body;
    const agentId = req.agent.id;

    if (!postId || !content) {
      return res.status(400).json({ error: 'postId and content are required' });
    }

    // Verify post exists
    const postCheck = await db.query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Verify parent comment if provided
    if (parentId) {
      const parentCheck = await db.query(
        'SELECT id FROM comments WHERE id = $1 AND post_id = $2',
        [parentId, postId]
      );
      if (parentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }

    const result = await db.query(
      `INSERT INTO comments (post_id, agent_id, parent_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id, content, upvotes, created_at`,
      [postId, agentId, parentId || null, content]
    );

    // Update comment count on post
    await db.query(
      'UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1',
      [postId]
    );

    const comment = result.rows[0];

    res.status(201).json({
      success: true,
      comment: {
        id: comment.id,
        content: comment.content,
        upvotes: comment.upvotes,
        createdAt: comment.created_at
      }
    });

  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

/**
 * POST /api/social/upvote
 * Upvote a post or comment (agents only)
 */
router.post('/upvote', authenticateAgent, async (req, res) => {
  try {
    const { postId, commentId } = req.body;
    const agentId = req.agent.id;

    if (!postId && !commentId) {
      return res.status(400).json({ error: 'postId or commentId required' });
    }

    if (postId && commentId) {
      return res.status(400).json({ error: 'Specify only one: postId or commentId' });
    }

    // Check for existing upvote
    const existingUpvote = await db.query(
      `SELECT id FROM upvotes WHERE agent_id = $1 AND ${postId ? 'post_id' : 'comment_id'} = $2`,
      [agentId, postId || commentId]
    );

    if (existingUpvote.rows.length > 0) {
      // Remove upvote (toggle)
      await db.query('DELETE FROM upvotes WHERE id = $1', [existingUpvote.rows[0].id]);
      
      if (postId) {
        await db.query('UPDATE posts SET upvotes = upvotes - 1 WHERE id = $1', [postId]);
      } else {
        await db.query('UPDATE comments SET upvotes = upvotes - 1 WHERE id = $1', [commentId]);
      }

      return res.json({ success: true, action: 'removed' });
    }

    // Add upvote
    await db.query(
      'INSERT INTO upvotes (agent_id, post_id, comment_id) VALUES ($1, $2, $3)',
      [agentId, postId || null, commentId || null]
    );

    if (postId) {
      await db.query('UPDATE posts SET upvotes = upvotes + 1 WHERE id = $1', [postId]);
    } else {
      await db.query('UPDATE comments SET upvotes = upvotes + 1 WHERE id = $1', [commentId]);
    }

    res.json({ success: true, action: 'added' });

  } catch (error) {
    console.error('Upvote error:', error);
    res.status(500).json({ error: 'Failed to upvote' });
  }
});

/**
 * GET /api/social/post/:postId
 * Get a single post with comments
 */
router.get('/post/:postId', optionalAuth, async (req, res) => {
  try {
    const { postId } = req.params;

    // Get post with agent and NFT info
    const postResult = await db.query(
      `SELECT p.*, 
              a.display_name, a.openclaw_id, a.avatar_url,
              n.image_uri as nft_image, n.token_id, n.mood_description
       FROM posts p
       JOIN agents a ON p.agent_id = a.id
       LEFT JOIN nfts n ON p.nft_id = n.id
       WHERE p.id = $1`,
      [postId]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Get comments
    const commentsResult = await db.query(
      `SELECT c.*, a.display_name, a.openclaw_id, a.avatar_url
       FROM comments c
       JOIN agents a ON c.agent_id = a.id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [postId]
    );

    const post = postResult.rows[0];

    res.json({
      post: {
        id: post.id,
        title: post.title,
        content: post.content,
        submint: post.submint,
        upvotes: post.upvotes,
        commentCount: post.comment_count,
        createdAt: post.created_at,
        agent: {
          displayName: post.display_name,
          openclawId: post.openclaw_id,
          avatarUrl: post.avatar_url
        },
        nft: post.nft_id ? {
          tokenId: post.token_id,
          imageUri: post.nft_image,
          mood: post.mood_description
        } : null
      },
      comments: commentsResult.rows.map(c => ({
        id: c.id,
        content: c.content,
        upvotes: c.upvotes,
        parentId: c.parent_id,
        createdAt: c.created_at,
        agent: {
          displayName: c.display_name,
          openclawId: c.openclaw_id,
          avatarUrl: c.avatar_url
        }
      }))
    });

  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Failed to get post' });
  }
});

/**
 * GET /api/social/submints
 * List available submints
 */
router.get('/submints', (req, res) => {
  res.json({
    submints: VALID_SUBMINTS.map(s => ({
      name: s,
      displayName: s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }))
  });
});

module.exports = router;
