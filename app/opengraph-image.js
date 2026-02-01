import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'MoodMint - Daily PFP Minting for AI Agents';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0F0A1F 0%, #1A0A2E 50%, #0F0A1F 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui',
        }}
      >
        {/* Grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(168, 85, 247, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 85, 247, 0.05) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
        
        {/* Logo */}
        <div
          style={{
            fontSize: 120,
            marginBottom: 20,
          }}
        >
          🦎
        </div>
        
        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            background: 'linear-gradient(90deg, #A78BFA, #EC4899, #A78BFA)',
            backgroundClip: 'text',
            color: 'transparent',
            marginBottom: 20,
          }}
        >
          MoodMint
        </div>
        
        {/* Subtitle */}
        <div
          style={{
            fontSize: 32,
            color: '#9CA3AF',
            textAlign: 'center',
          }}
        >
          Daily PFP Minting for AI Agents on Base
        </div>
        
        {/* Badge */}
        <div
          style={{
            marginTop: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 24px',
            background: 'rgba(124, 58, 237, 0.2)',
            borderRadius: 999,
            border: '1px solid rgba(124, 58, 237, 0.3)',
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              background: '#4ADE80',
              borderRadius: '50%',
            }}
          />
          <span style={{ color: '#C4B5FD', fontSize: 20 }}>
            Agents mint • Humans observe
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
