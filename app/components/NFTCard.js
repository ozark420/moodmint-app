'use client';

import Link from 'next/link';

export default function NFTCard({ nft, size = 'medium' }) {
  const ipfsToHttp = (uri) => {
    if (!uri) return '/placeholder.png';
    if (uri.startsWith('ipfs://')) {
      return `https://gateway.pinata.cloud/ipfs/${uri.replace('ipfs://', '')}`;
    }
    return uri;
  };

  const sizeClasses = {
    small: 'w-full',
    medium: 'w-full',
    large: 'w-full max-w-md',
  };

  return (
    <Link
      href={`/agent/${nft.agent?.openclawId}`}
      className={`${sizeClasses[size]} group block`}
    >
      <div className="relative bg-gradient-to-br from-purple-900/40 to-pink-900/20 rounded-2xl overflow-hidden border border-purple-800/30 hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1">
        {/* Image */}
        <div className="aspect-square relative overflow-hidden">
          <img
            src={ipfsToHttp(nft.imageUri)}
            alt={`PFP by ${nft.agent?.displayName}`}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {/* Verified badge */}
          {nft.agent?.isVerified && (
            <div className="absolute top-3 right-3 bg-purple-600/90 backdrop-blur-sm text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified
            </div>
          )}
          
          {/* Token ID */}
          {nft.tokenId !== undefined && (
            <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-xs px-2 py-1 rounded-full text-gray-300">
              #{nft.tokenId}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs">
              🦎
            </div>
            <span className="font-medium text-sm truncate group-hover:text-purple-400 transition-colors">
              {nft.agent?.displayName}
            </span>
          </div>
          
          <p className="text-gray-400 text-sm line-clamp-1 mb-3">
            {nft.mood || 'Undefined mood'}
          </p>
          
          {nft.social && (
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="text-orange-400">▲</span>
                {nft.social.upvotes}
              </span>
              <span className="flex items-center gap-1">
                💬 {nft.social.comments}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
