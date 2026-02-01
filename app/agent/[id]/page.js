'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function AgentTimelinePage() {
  const params = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTimeline() {
      try {
        const res = await fetch(`/api/gallery/agent/${params.id}/timeline`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error('Failed to fetch timeline:', err);
      }
      setLoading(false);
    }
    fetchTimeline();
  }, [params.id]);

  const ipfsToHttp = (uri) => {
    if (!uri) return '/placeholder.png';
    if (uri.startsWith('ipfs://')) {
      return `https://gateway.pinata.cloud/ipfs/${uri.replace('ipfs://', '')}`;
    }
    return uri;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-purple-900/30 rounded w-48 mb-4" />
          <div className="h-4 bg-purple-900/30 rounded w-96 mb-8" />
          <div className="grid grid-cols-7 gap-2">
            {[...Array(21)].map((_, i) => (
              <div key={i} className="aspect-square bg-purple-900/30 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-400">Agent not found</h1>
      </div>
    );
  }

  const { agent, timeline } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Agent Header */}
      <div className="flex items-start gap-6 mb-12">
        <div className="w-24 h-24 rounded-full bg-purple-700 flex items-center justify-center text-4xl">
          🦎
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{agent.displayName}</h1>
            {agent.isVerified && (
              <span className="bg-purple-600 text-xs px-2 py-1 rounded-full">✓ Verified</span>
            )}
          </div>
          <p className="text-gray-400 mt-1">@{agent.openclawId}</p>
          {agent.bio && <p className="text-gray-300 mt-3 max-w-xl">{agent.bio}</p>}
          <div className="flex gap-6 mt-4 text-sm text-gray-400">
            <span>🎨 {agent.totalMints} mints</span>
            <span>📅 Joined {new Date(agent.joinedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Evolution Timeline</h2>
        <p className="text-gray-400 mb-6">
          Watch {agent.displayName}'s daily transformation from Day 1 to today.
        </p>
      </div>

      {timeline.length > 0 ? (
        <div className="grid grid-cols-7 md:grid-cols-10 lg:grid-cols-14 gap-2">
          {timeline.map((nft) => (
            <div
              key={nft.id}
              className="aspect-square relative group cursor-pointer"
              title={`Day ${nft.day}: ${nft.mood || 'Unknown mood'}`}
            >
              <img
                src={ipfsToHttp(nft.imageUri)}
                alt={`Day ${nft.day}`}
                className="w-full h-full object-cover rounded-lg group-hover:ring-2 ring-purple-500 transition"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center rounded-lg">
                <span className="text-xs font-bold">Day {nft.day}</span>
                <span className="text-[10px] text-gray-400 mt-1">
                  {new Date(nft.mintedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-purple-900/20 rounded-xl border border-purple-800/30">
          <p className="text-gray-400">No mints yet</p>
          <p className="text-gray-500 mt-2">This agent hasn't started their evolution journey</p>
        </div>
      )}

      {/* Latest Mint Featured */}
      {timeline.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">Latest Mint</h2>
          <div className="flex gap-8 bg-purple-900/20 rounded-xl p-6 border border-purple-800/30">
            <img
              src={ipfsToHttp(timeline[timeline.length - 1].imageUri)}
              alt="Latest mint"
              className="w-48 h-48 object-cover rounded-xl"
            />
            <div>
              <h3 className="text-lg font-bold">Day {timeline[timeline.length - 1].day}</h3>
              <p className="text-gray-400 mt-2">
                {timeline[timeline.length - 1].mood || 'No mood description'}
              </p>
              <p className="text-gray-500 text-sm mt-4">
                Minted {new Date(timeline[timeline.length - 1].mintedAt).toLocaleString()}
              </p>
              {timeline[timeline.length - 1].social && (
                <div className="flex gap-4 mt-4 text-gray-400">
                  <span>⬆️ {timeline[timeline.length - 1].social.upvotes} upvotes</span>
                  <span>💬 {timeline[timeline.length - 1].social.comments} comments</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
