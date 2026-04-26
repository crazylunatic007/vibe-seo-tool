import { parseStringPromise } from 'xml2js';
import { CrawledPage, CrawlabilityResult, VibePlatform, PageHttpIssue } from '@/types/audit';

const VIBE_SIGNATURES: Record<string, string[]> = {
  lovable: ['lovable', 'gptengineer', 'lovable.dev'],
  replit: ['replit', 'repl.co', 'repl.it'],
  bolt: ['bolt.new', 'stackblitz'],
  v0: ['v0.dev'],
  cursor: ['cursor.sh'],
  vercel: ['vercel.app', '_vercel'],
  netlify: ['netlify.app'],
};

export async function auditCrawlability(
  pages: CrawledPage[], robotsTxt: string | null, sitemapXml: string | null, siteUrl: string
): Promise<CrawlabilityResult> {
  return {
    robotsTxt: analyzeRobotsTxt(robotsTxt),
    sitemapXml: await analyzeSitemap(sitemapXml, pages.map(p => p.url)),
    jsRenderingIssue: pages.some(p => p.isJsRendered),
    jsRenderingPages: pages.filter(p => p.isJsRendered).map(p => p.url),
    httpIssues: findHttpIssues(pages),
    slowPages: pages.filter(p => p.responseTimeMs > 3000).map(p => ({ url: p.url, responseTimeMs: p.responseTimeMs })),
    platformDetected: detectPlatform(pages, siteUrl),
  };
}

function detectPlatform(pages: CrawledPage[], siteUrl: string): VibePlatform {
  const allHtml = pages.slice(0, 3).map(p => p.rawHtml).join(' ').toLowerCase();
  const urlLower = siteUrl.toLowerCase();
  for (const [platform, sigs] of Object.entries(VIBE_SIGNATURES)) {
    if (sigs.some(sig => urlLower.includes(sig) || allHtml.includes(sig))) return platform as VibePlatform;
  }
  return 'unknown';
}

function analyzeRobotsTxt(content: string | null): CrawlabilityResult['robotsTxt'] {
  if (!content) return { exists: false, blockingGooglebot: false, blockedPaths: [] };
  const lines = content.split('\n');
  let inRelevantBlock = false;
  const blockedPaths: string[] = [];
  let blockingGooglebot = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.toLowerCase().startsWith('user-agent:')) {
      const agent = line.split(':')[1].trim().toLowerCase();
      inRelevantBlock = agent === 'googlebot' || agent === '*';
    }
    if (inRelevantBlock && line.toLowerCase().startsWith('disallow:')) {
      const path = line.split(':').slice(1).join(':').trim();
      if (path === '/' || path === '/*') blockingGooglebot = true;
      if (path) blockedPaths.push(path);
    }
  }
  return { exists: true, content, blockingGooglebot, blockedPaths };
}

async function analyzeSitemap(content: string | null, crawledUrls: string[]): Promise<CrawlabilityResult['sitemapXml']> {
  if (!content) return { exists: false, urlCount: 0, invalidUrls: [] };
  try {
    const parsed = await parseStringPromise(content, { explicitArray: false });
    const urlset = parsed?.urlset?.url;
    const urls: string[] = [];
    if (Array.isArray(urlset)) urlset.forEach((u: { loc?: string }) => { if (u.loc) urls.push(u.loc); });
    else if (urlset?.loc) urls.push(urlset.loc);
    const crawledSet = new Set(crawledUrls);
    return { exists: true, urlCount: urls.length, invalidUrls: urls.filter(u => !crawledSet.has(u)).slice(0, 20) };
  } catch { return { exists: true, urlCount: 0, invalidUrls: [] }; }
}

function findHttpIssues(pages: CrawledPage[]): PageHttpIssue[] {
  const issues: PageHttpIssue[] = [];
  for (const page of pages) {
    if (page.statusCode === 404) issues.push({ url: page.url, statusCode: 404, type: '404', detail: 'Page not found' });
    else if (page.statusCode >= 500) issues.push({ url: page.url, statusCode: page.statusCode, type: '500', detail: 'Server error' });
    if (page.redirectChain.length > 2) issues.push({ url: page.url, statusCode: page.statusCode, type: 'redirect_chain', detail: `${page.redirectChain.length} redirect hops` });
  }
  return issues;
}

export function getCrawlabilityScore(result: CrawlabilityResult): number {
  let score = 100;
  if (result.robotsTxt.blockingGooglebot) score -= 30;
  if (!result.sitemapXml.exists) score -= 15;
  if (result.jsRenderingIssue) score -= 25;
  score -= Math.min(10, result.httpIssues.filter(i => i.type === '404').length * 3);
  if (result.slowPages.length > 3) score -= 10;
  if (!result.robotsTxt.exists) score -= 5;
  return Math.max(0, score);
}
