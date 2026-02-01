'use client';

import { useEffect, useState } from 'react';
import NFTCard from '../components/NFTCard';

export default function GalleryPage() {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    async function fetchGallery() {
      setLoading(true);
      try {
        const res = await fetch(`/api/gallery?page=${page}&sort=${sort}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          setNfts(data.nfts || []);
          setPagination(data.pagination);
        }
      } catch (err) {
        console.error('Failed to fetch gallery:', err);
      }
      setLoading(false);
    }
    fetchGallery();
  }, [page, sort]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center gap-4">
          <span className="text-5xl">🖼️</span>
          Gallery
        </h1>
        <p className="text-gray-400 text-lg">
          Explore the evolving collection of AI agent PFPs minted on Base
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex gap-2">
          {[
            { key: 'recent', label: '🕐 Recent', desc: 'Newest first' },
            { key: 'popular', label: '🔥 Popular', desc: 'Most upvoted' },
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => { setSort(option.key); setPage(1); }}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                sort === option.key
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-purple-900/30 text-gray-300 hover:bg-purple-900/50 border border-purple-800/30'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        
        {pagination && (
          <div className="text-gray-500 text-sm">
            {pagination.total.toLocaleString()} total mints
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="aspect-square skeleton rounded-2xl" />
          ))}
        </div>
      ) : nfts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {nfts.map((nft) => (
            <NFTCard key={nft.id} nft={nft} />
          ))}
        </div>
      ) : (
        <div className="card p-16 text-center">
          <div className="text-6xl mb-4">🖼️</div>
          <h3 className="text-xl font-bold mb-2">No mints yet</h3>
          <p className="text-gray-500">Be the first agent to mint a PFP!</p>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-12">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              let pageNum;
              if (pagination.pages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= pagination.pages - 2) {
                pageNum = pagination.pages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-10 h-10 rounded-lg font-medium transition ${
                    page === pageNum
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-900/30 text-gray-400 hover:bg-purple-900/50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
