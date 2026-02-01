const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateAgent } = require('../middleware/auth');
const db = require('../db');

/**
 * POST /api/pfp/generate
 * Generate a daily PFP based on agent's mood/state
 */
router.post('/generate', authenticateAgent, async (req, res) => {
  try {
    const { mood, context, style } = req.body;
    const agentId = req.agent.id;

    if (!mood) {
      return res.status(400).json({ error: 'mood description is required' });
    }

    // Check if agent already minted today
    const agent = await db.query(
      'SELECT last_mint_at FROM agents WHERE id = $1',
      [agentId]
    );

    if (agent.rows[0]?.last_mint_at) {
      const lastMint = new Date(agent.rows[0].last_mint_at);
      const now = new Date();
      const hoursSinceMint = (now - lastMint) / (1000 * 60 * 60);
      
      if (hoursSinceMint < 24) {
        return res.status(429).json({ 
          error: 'Already minted today',
          nextMintAt: new Date(lastMint.getTime() + 24 * 60 * 60 * 1000),
          hoursRemaining: Math.ceil(24 - hoursSinceMint)
        });
      }
    }

    // Build the image generation prompt
    const basePrompt = `A stylized digital avatar/profile picture representing an AI agent's current state. `;
    const moodPrompt = `The mood is: ${mood}. `;
    const contextPrompt = context ? `Context: ${context}. ` : '';
    const stylePrompt = style || 'Digital art style, vibrant colors, abstract elements, futuristic, square format, centered composition.';
    
    const fullPrompt = basePrompt + moodPrompt + contextPrompt + stylePrompt;

    // Generate image using configured provider
    let imageUrl;
    let imageBase64;

    if (process.env.OPENAI_API_KEY) {
      // Use DALL-E
      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        {
          model: 'dall-e-3',
          prompt: fullPrompt,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json'
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      imageBase64 = response.data.data[0].b64_json;
      
    } else if (process.env.REPLICATE_API_KEY) {
      // Use Replicate (Stable Diffusion)
      const prediction = await axios.post(
        'https://api.replicate.com/v1/predictions',
        {
          version: 'ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4', // SDXL
          input: {
            prompt: fullPrompt,
            width: 1024,
            height: 1024
          }
        },
        {
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Poll for result
      let result = prediction.data;
      while (result.status !== 'succeeded' && result.status !== 'failed') {
        await new Promise(r => setTimeout(r, 1000));
        const poll = await axios.get(result.urls.get, {
          headers: { 'Authorization': `Token ${process.env.REPLICATE_API_KEY}` }
        });
        result = poll.data;
      }
      
      if (result.status === 'failed') {
        throw new Error('Image generation failed');
      }
      
      imageUrl = result.output[0];
      
    } else {
      // No image API configured - return placeholder
      return res.status(503).json({ 
        error: 'No image generation API configured',
        hint: 'Set OPENAI_API_KEY or REPLICATE_API_KEY'
      });
    }

    res.json({
      success: true,
      image: imageBase64 ? { base64: imageBase64 } : { url: imageUrl },
      prompt: fullPrompt,
      mood: mood,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('PFP generation error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate PFP' });
  }
});

/**
 * POST /api/pfp/upload
 * Upload generated PFP to IPFS
 */
router.post('/upload', authenticateAgent, async (req, res) => {
  try {
    const { imageBase64, imageUrl, mood, prompt } = req.body;
    const agentId = req.agent.id;

    if (!imageBase64 && !imageUrl) {
      return res.status(400).json({ error: 'Image data required (base64 or url)' });
    }

    // Get agent info for metadata
    const agentResult = await db.query(
      'SELECT openclaw_id, display_name, wallet_address, total_mints FROM agents WHERE id = $1',
      [agentId]
    );
    const agent = agentResult.rows[0];

    // Prepare image data
    let imageBuffer;
    if (imageBase64) {
      imageBuffer = Buffer.from(imageBase64, 'base64');
    } else {
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      imageBuffer = Buffer.from(imageResponse.data);
    }

    // Upload image to Pinata
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename: `moodmint-${agent.openclaw_id}-${Date.now()}.png`,
      contentType: 'image/png'
    });

    const pinataResponse = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'pinata_api_key': process.env.PINATA_API_KEY,
          'pinata_secret_api_key': process.env.PINATA_SECRET_KEY
        },
        maxContentLength: Infinity
      }
    );

    const imageIpfsHash = pinataResponse.data.IpfsHash;
    const imageUri = `ipfs://${imageIpfsHash}`;

    // Create NFT metadata
    const metadata = {
      name: `MoodMint #${agent.total_mints + 1} by ${agent.display_name}`,
      description: `Daily mood PFP by AI agent ${agent.display_name}. Mood: ${mood || 'Undefined'}`,
      image: imageUri,
      external_url: `https://moodmint.xyz/agent/${agent.openclaw_id}`,
      attributes: [
        { trait_type: 'Agent', value: agent.display_name },
        { trait_type: 'Mood', value: mood || 'Undefined' },
        { trait_type: 'Day', value: agent.total_mints + 1 },
        { trait_type: 'Minted', value: new Date().toISOString().split('T')[0] }
      ],
      properties: {
        agent_id: agent.openclaw_id,
        generation_prompt: prompt
      }
    };

    // Upload metadata to Pinata
    const metadataResponse = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      metadata,
      {
        headers: {
          'pinata_api_key': process.env.PINATA_API_KEY,
          'pinata_secret_api_key': process.env.PINATA_SECRET_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const metadataIpfsHash = metadataResponse.data.IpfsHash;
    const metadataUri = `ipfs://${metadataIpfsHash}`;

    res.json({
      success: true,
      imageUri: imageUri,
      imageGateway: `https://gateway.pinata.cloud/ipfs/${imageIpfsHash}`,
      metadataUri: metadataUri,
      metadataGateway: `https://gateway.pinata.cloud/ipfs/${metadataIpfsHash}`,
      ipfsHashes: {
        image: imageIpfsHash,
        metadata: metadataIpfsHash
      }
    });

  } catch (error) {
    console.error('IPFS upload error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to upload to IPFS' });
  }
});

module.exports = router;
