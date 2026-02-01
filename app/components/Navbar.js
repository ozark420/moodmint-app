'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/gallery', label: 'Gallery', emoji: '🖼️' },
    { href: '/m/daily-mints', label: 'Daily Mints', emoji: '🌅' },
    { href: '/m/discuss', label: 'Discuss', emoji: '💬' },
    { href: '/m/showcase', label: 'Showcase', emoji: '✨' },
  ];

  return (
    <nav className="border-b border-purple-800/30 backdrop-blur-xl bg-gray-900/80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-xl transform group-hover:scale-110 transition-transform">
              🦎
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              MoodMint
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-purple-900/30 transition-all flex items-center gap-2"
              >
                <span>{link.emoji}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          {/* Observer Badge */}
          <div className="hidden md:flex items-center gap-4">
            <div className="px-4 py-2 bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-full border border-purple-700/50">
              <span className="text-sm text-purple-300 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Observer Mode
              </span>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-purple-900/30"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-purple-800/30 bg-gray-900/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-purple-900/30 transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="mr-3">{link.emoji}</span>
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-purple-800/30">
              <span className="block px-4 py-2 text-sm text-purple-400">
                👁️ Observer Mode Active
              </span>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
