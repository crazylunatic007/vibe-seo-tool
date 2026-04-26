'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { AuditJob, AuditResult, AuditIssue } from '@/types/audit';

export default function AuditPage() {
  const params = useParams();
  const jobId = params.id as string;
  const [job, setJob] = useState<AuditJob | null>(null);
  const [activeTab, setActiveTab] = useState<'issues' | 'script' | 'files'>('issues');
  const [copied, setCopied] = useState(false);

  const poll = useCallback(async () => {
    const res = await fetch(`/api/audit/${jobId}`);
    if (res.ok) {
      const data: AuditJob = await res.json();
      setJob(data);
      return data.status;
    }
    return 'error';
  }, [jobId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const start = async () => {
      const status = await poll();
      if (status !== 'complete' && status !== 'error') {
        interval = setInterval(async () => {
          const s = await poll();
          if (s === 'complete' || s === 'error') clearInterval(interval);
        }, 2000);
      }
    };
    start();
    return () => clearInterval(interval);
  }, [poll]);

  function copyScript() {
    if (!job?.result?.fixScript.script) return;
    navigator.clipboard.writeText(job.result.fixScript.script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  if (!job) return <LoadingScreen message="Loading..." progress={0} />;
  if (job.status !== 'complete' && job.status !== 'error') {
    return <LoadingScreen message={job.message} progress={job.progress} />;
  }
  if (job.status === 'error') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-white text-xl font-semibold mb-2">Audit failed</h2>
          <p className="text-gray-400 mb-6">{job.error || 'Something went wrong'}</p>
          <a href="/" className="bg-brand-500 text-white px-6 py-3 rounded-xl font-semibold">Try again</a>
        </div>
      </div>
    );
  }

  const result = job.result!;

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 bg-gray-950 z-10">
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="white" stroke="white" strokeWidth="0.5"/></svg>
          </div>
          <span className="font-semibold text-white">VibeSEO</span>
        </a>
        <div className="text-sm text-gray-400 truncate max-w-xs">{result.url}</div>
        <button onClick={copyScript} className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          {copied ? '✓ Copied!' : 'Copy fix script'}
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Score header */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          <ScoreCard label="Overall" score={result.scores.overall} large />
          <ScoreCard label="Crawlability" score={result.scores.crawlability} />
          <ScoreCard label="Indexability" score={result.scores.indexability} />
          <ScoreCard label="On-Page" score={result.scores.onPage} />
          <ScoreCard label="Links" score={result.scores.linkStructure} />
        </div>

        {/* Summary bar */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6 flex flex-wrap gap-6">
          <Stat label="Pages crawled" value={result.pagesCrawled} />
          <Stat label="Issues found" value={result.issues.length} />
          <Stat label="Fixed by script" value={result.issues.filter(i => i.fixedByScript).length} />
          <Stat label="Needs manual fix" value={result.issues.filter(i => !i.fixedByScript).length} />
          {result.crawlability.platformDetected && result.crawlability.platformDetected !== 'unknown' && (
            <Stat label="Platform detected" value={result.crawlability.platformDetected} />
          )}
        </div>

        {/* JS Rendering warning */}
        {result.crawlability.jsRenderingIssue && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-red-400 text-xl">⚠️</span>
              <div>
                <h3 className="text-red-400 font-semibold mb-1">JavaScript Rendering Issue Detected</h3>
                <p className="text-gray-400 text-sm">Your site appears nearly empty to Google in its raw HTML state. Content only appears after JavaScript runs — and Google may not wait for it. This is the #1 SEO killer for AI-built sites.</p>
                <p className="text-gray-500 text-sm mt-2">The fix script cannot solve this — it requires enabling SSR or prerendering on your hosting platform.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 w-fit">
          {(['issues', 'script', 'files'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${activeTab === tab ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {tab === 'script' ? 'Fix Script' : tab === 'files' ? 'Downloads' : 'Issues'}
              {tab === 'issues' && ` (${result.issues.length})`}
            </button>
          ))}
        </div>

        {/* Tab: Issues */}
        {activeTab === 'issues' && (
          <div className="space-y-3">
            {result.issues.map(issue => <IssueCard key={issue.id} issue={issue} />)}
            {result.issues.length === 0 && (
              <div className="text-center py-16 text-gray-500">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-lg font-medium text-white mb-1">No issues found!</p>
                <p>Your site looks great from an SEO perspective.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Fix Script */}
        {activeTab === 'script' && (
          <div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold mb-1">Your fix script</h3>
                  <p className="text-gray-400 text-sm">Paste this into the <code className="text-brand-400">&lt;head&gt;</code> tag of your site. It fixes {result.fixScript.fixes.length} issue(s) automatically.</p>
                </div>
                <button onClick={copyScript} className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shrink-0">
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="bg-gray-950 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto leading-relaxed">
                {result.fixScript.script}
              </pre>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-sm text-yellow-300">
              <strong>Note:</strong> This script fixes on-page issues (meta tags, canonicals, schema). It cannot fix JavaScript rendering problems — those require server-side changes.
            </div>
          </div>
        )}

        {/* Tab: Downloads */}
        {activeTab === 'files' && (
          <div className="space-y-4">
            {result.fixScript.sitemapXml && (
              <DownloadCard
                icon="🗺️"
                title="sitemap.xml"
                desc="A complete XML sitemap of all crawled pages. Upload to your site root and submit to Google Search Console."
                onClick={() => downloadFile(result.fixScript.sitemapXml!, 'sitemap.xml')}
              />
            )}
            {result.fixScript.robotsTxt && (
              <DownloadCard
                icon="🤖"
                title="robots.txt"
                desc="A corrected robots.txt file that allows Google to crawl your site properly. Upload to your site root."
                onClick={() => downloadFile(result.fixScript.robotsTxt!, 'robots.txt')}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function LoadingScreen({ message, progress }: { message: string; progress: number }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-gray-800 border-t-brand-500 rounded-full animate-spin mb-6" />
      <h2 className="text-white font-semibold text-lg mb-2">{message}</h2>
      <div className="w-64 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-gray-600 text-sm mt-3">{progress}% complete</p>
    </div>
  );
}

function ScoreCard({ label, score, large }: { label: string; score: number; large?: boolean }) {
  const color = score >= 80 ? 'text-brand-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';
  const bg = score >= 80 ? 'border-brand-500/20' : score >= 50 ? 'border-yellow-500/20' : 'border-red-500/20';
  return (
    <div className={`bg-gray-900 border ${bg} rounded-xl p-4 ${large ? 'col-span-2 sm:col-span-1' : ''}`}>
      <div className={`font-bold ${large ? 'text-4xl' : 'text-2xl'} ${color}`}>{score}</div>
      <div className="text-gray-500 text-xs mt-1">{label}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-white font-semibold">{value}</div>
      <div className="text-gray-500 text-xs">{label}</div>
    </div>
  );
}

function IssueCard({ issue }: { issue: AuditIssue }) {
  const [open, setOpen] = useState(false);
  const colors: Record<string, string> = {
    critical: 'border-red-500/30 bg-red-500/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    info: 'border-blue-500/30 bg-blue-500/5',
  };
  const badges: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400',
    warning: 'bg-yellow-500/20 text-yellow-400',
    info: 'bg-blue-500/20 text-blue-400',
  };
  return (
    <div className={`border rounded-xl overflow-hidden ${colors[issue.severity]}`}>
      <button onClick={() => setOpen(!open)} className="w-full text-left p-4 flex items-center gap-3">
        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${badges[issue.severity]}`}>{issue.severity}</span>
        <span className="text-white font-medium flex-1">{issue.title}</span>
        <span className="text-gray-500 text-sm">{issue.fixedByScript ? '✓ Auto-fixed' : '⚡ Manual'}</span>
        <span className="text-gray-500 ml-2">{open ? '↑' : '↓'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-3">
          <p className="text-gray-400 text-sm">{issue.description}</p>
          {issue.affectedUrls.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs mb-1">Affected pages:</p>
              {issue.affectedUrls.map(url => (
                <div key={url} className="text-xs text-brand-400 bg-gray-900 rounded px-2 py-1 mt-1 truncate">{url}</div>
              ))}
            </div>
          )}
          {issue.fixedByScript ? (
            <div className="text-xs text-brand-400 bg-brand-500/10 rounded-lg px-3 py-2">✓ This issue is fixed automatically by the script above. Paste it into your site head.</div>
          ) : issue.manualSteps && (
            <div className="text-xs text-gray-300 bg-gray-900 rounded-lg px-3 py-2"><strong className="text-white">How to fix:</strong> {issue.manualSteps}</div>
          )}
        </div>
      )}
    </div>
  );
}

function DownloadCard({ icon, title, desc, onClick }: { icon: string; title: string; desc: string; onClick: () => void }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
      <span className="text-3xl">{icon}</span>
      <div className="flex-1">
        <h3 className="text-white font-semibold">{title}</h3>
        <p className="text-gray-500 text-sm">{desc}</p>
      </div>
      <button onClick={onClick} className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0">
        Download
      </button>
    </div>
  );
}
