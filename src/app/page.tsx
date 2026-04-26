'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start audit');
      router.push(`/audit/${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="white" stroke="white" strokeWidth="0.5"/></svg>
          </div>
          <span className="font-semibold text-white">VibeSEO</span>
        </div>
        <a href="https://github.com/crazylunatic007/vibe-seo-tool" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-white transition-colors">GitHub ↗</a>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-24">
        <div className="text-center max-w-2xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 mb-8">
            <div className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
            <span className="text-brand-400 text-sm font-medium">Built for Lovable, Bolt, v0, Replit, Cursor</span>
          </div>

          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight leading-tight">
            Can Google actually<br />
            <span className="text-brand-400">see your website?</span>
          </h1>
          <p className="text-gray-400 text-lg mb-10 max-w-lg mx-auto">
            Free SEO audit for AI-built sites. Crawls your site, finds what&apos;s broken, and generates a one-line fix script — no developer needed.
          </p>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://your-site.com"
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-colors whitespace-nowrap"
            >
              {loading ? 'Starting...' : 'Audit my site →'}
            </button>
          </form>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          <p className="text-gray-600 text-sm mt-4">Free · Up to 100 pages · Results in ~2 minutes</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mt-20 w-full">
          {[
            { icon: '🔍', title: 'JS Rendering Check', desc: 'Detects if Google can see your content or just a blank page' },
            { icon: '🔧', title: 'Auto Fix Script', desc: 'One JavaScript snippet fixes titles, descriptions, canonicals & schema' },
            { icon: '📊', title: 'Health Score', desc: 'Crawlability, indexability, on-page & links scored out of 100' },
          ].map(f => (
            <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="text-white font-semibold mb-1">{f.title}</h3>
              <p className="text-gray-500 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
