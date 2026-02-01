# 🦎 MoodMint Setup Guide

Follow these steps to deploy MoodMint.

## Prerequisites

- Node.js 18+
- Git
- A wallet with ETH on Base Sepolia (for testnet deployment)

## Step 1: Environment Setup

```bash
cd moodmint-app
npm install
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Required for backend
DATABASE_URL=postgresql://...       # Get from Supabase (free)
JWT_SECRET=your-random-secret       # Generate: openssl rand -hex 32

# Required for contract deployment
BASE_SEPOLIA_RPC=https://sepolia.base.org
DEPLOYER_PRIVATE_KEY=0x...          # Your wallet private key

# Required for IPFS
PINATA_API_KEY=...                  # Get from pinata.cloud (free)
PINATA_SECRET_KEY=...

# Required for image generation (pick one)
OPENAI_API_KEY=...                  # For DALL-E
# OR
REPLICATE_API_KEY=...               # For Stable Diffusion
```

## Step 2: Database Setup

1. Create a free PostgreSQL database at [Supabase](https://supabase.com)
2. Get the connection string from Settings → Database
3. Run the schema:

```bash
# Using Supabase SQL editor, paste contents of:
# backend/db/schema.sql
```

## Step 3: Deploy Smart Contract

```bash
# Compile
npm run compile

# Deploy to Base Sepolia testnet
npm run deploy:testnet
```

Copy the deployed contract address and add to `.env`:
```env
MOODMINT_CONTRACT_TESTNET=0x...
```

## Step 4: Test Locally

```bash
# Terminal 1: Start backend
npm run server:dev

# Terminal 2: Start frontend
npm run dev
```

Visit http://localhost:3000

## Step 5: Deploy to Production

### Frontend (Vercel)

1. Push to GitHub:
```bash
git remote add origin https://github.com/yourusername/moodmint-app.git
git push -u origin main
```

2. Import to [Vercel](https://vercel.com):
   - Connect GitHub repo
   - Set environment variables (NEXT_PUBLIC_API_URL)
   - Deploy

### Backend (Railway/Render)

1. Create new project on [Railway](https://railway.app) or [Render](https://render.com)
2. Connect GitHub repo
3. Set environment variables from `.env`
4. Deploy

## Step 6: Domain Setup

1. Purchase domain (moodmint.xyz recommended, ~$10/year)
2. Configure DNS in Vercel
3. Update API URL in frontend config

## Free Tier Costs

| Service | Cost |
|---------|------|
| Supabase | Free (500MB) |
| Vercel | Free |
| Railway | Free ($5 credit/mo) |
| Pinata | Free (1GB) |
| Alchemy | Free (300M compute/mo) |
| Domain | ~$10-15/year |

**Total: ~$10-15/year**

## Mainnet Deployment

When ready for mainnet:

1. Get ETH on Base mainnet
2. Update `.env`:
```env
BASE_MAINNET_RPC=https://mainnet.base.org
```

3. Deploy:
```bash
npm run deploy:mainnet
```

4. Add contract address:
```env
MOODMINT_CONTRACT_MAINNET=0x...
```

## Troubleshooting

### Contract deployment fails
- Ensure wallet has ETH for gas (~0.001 ETH)
- Check RPC URL is correct
- Verify private key format (with 0x prefix)

### IPFS upload fails
- Verify Pinata API keys
- Check file size (under 100MB)

### Image generation fails
- Verify API key for OpenAI/Replicate
- Check rate limits

## Support

- GitHub Issues: [repo]/issues
- Discord: [coming soon]

---

Built with 🦎 by MoodMolt
