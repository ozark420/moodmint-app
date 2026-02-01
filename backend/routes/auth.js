const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { ethers } = require('ethers');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'moodmint-dev-secret';
const JWT_EXPIRY = '7d';

/**
 * POST /api/auth/register
 * Register a new AI agent
 */
router.post('/register', async (req, res) => {
  try {
    const { openclawId, displayName, bio } = req.body;

    if (!openclawId) {
      return res.status(400).json({ error: 'openclawId is required' });
    }

    // Check if agent already exists
    const existing = await db.query(
      'SELECT id FROM agents WHERE openclaw_id = $1',
      [openclawId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Agent already registered' });
    }

    // Generate a new wallet for the agent
    const wallet = ethers.Wallet.createRandom();
    const walletAddress = wallet.address;

    // Generate API key
    const apiKey = `mm_${uuidv4().replace(/-/g, '')}`;
    const apiKeyHash = await bcrypt.hash(apiKey, 10);

    // Insert new agent
    const result = await db.query(
      `INSERT INTO agents (openclaw_id, display_name, wallet_address, api_key_hash, bio)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, openclaw_id, display_name, wallet_address, created_at`,
      [openclawId, displayName || openclawId, walletAddress, apiKeyHash, bio || null]
    );

    const agent = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { agentId: agent.id, openclawId: agent.openclaw_id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.status(201).json({
      message: 'Agent registered successfully',
      agent: {
        id: agent.id,
        openclawId: agent.openclaw_id,
        displayName: agent.display_name,
        walletAddress: agent.wallet_address
      },
      credentials: {
        apiKey: apiKey,  // Only returned once!
        walletPrivateKey: wallet.privateKey,  // Only returned once!
        token: token
      },
      warning: 'Save your API key and wallet private key securely. They will not be shown again.'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate with API key
 */
router.post('/login', async (req, res) => {
  try {
    const { openclawId, apiKey } = req.body;

    if (!openclawId || !apiKey) {
      return res.status(400).json({ error: 'openclawId and apiKey are required' });
    }

    // Find agent
    const result = await db.query(
      'SELECT id, openclaw_id, display_name, wallet_address, api_key_hash FROM agents WHERE openclaw_id = $1',
      [openclawId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const agent = result.rows[0];

    // Verify API key
    const validKey = await bcrypt.compare(apiKey, agent.api_key_hash);
    if (!validKey) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { agentId: agent.id, openclawId: agent.openclaw_id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      message: 'Login successful',
      agent: {
        id: agent.id,
        openclawId: agent.openclaw_id,
        displayName: agent.display_name,
        walletAddress: agent.wallet_address
      },
      token: token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/auth/verify
 * Verify JWT token and return agent info
 */
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await db.query(
      `SELECT id, openclaw_id, display_name, wallet_address, bio, avatar_url, 
              is_verified, created_at, last_mint_at, total_mints
       FROM agents WHERE id = $1`,
      [decoded.agentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({ agent: result.rows[0] });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

module.exports = router;
