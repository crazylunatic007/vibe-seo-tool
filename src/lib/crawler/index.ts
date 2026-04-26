import * as cheerio from 'cheerio';
import axios from 'axios';
import { CrawledPage } from '@/types/audit';

const USER_AGENT = 'VibeSEOBot/1.0 (+https://vibeseo.app/bot)';
const MAX_PAGES = 100;
const REQUEST_TIMEOUT = 15000;
const CONCURRENCY = 5;

export async function crawlSite(startUrl: string): Promise<CrawledPage[]> {
  const base = new URL(startUrl);
  const visited = new Set<string>();
  const queue: string[] = [normalizeUrl(startUrl)];
  const results: CrawledPage[] = [];

  while (queue.length > 0 && results.length < MAX_PAGES) {
    const batch = queue.splice(0, CONCURRENCY);
    const batchResults = await Promise.allSettled(batch.map(url => fetchPage(url)));

    for (const settled of batchResults) {
      if (settled.status !== 'fulfilled' || !settled.value) continue;
      const page = settled.value;
      results.push(page);
      visited.add(page.url);

      const $ = cheerio.load(page.rawHtml);
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        try {
          const absolute = new URL(href, page.finalUrl).href;
          const norm = normalizeUrl(absolute);
          if (isSameDomain(norm, base.href) && !visited.has(norm) && !queue.includes(norm) && isHtmlPage(norm)) {
            queue.push(norm);
          }
        } catch { /* skip */ }
      });
    }
  }

  return results;
}

async function fetchPage(url: string): Promise<CrawledPage | null> {
  const start = Date.now();
  try {
    const response = await axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      maxRedirects: 5,
      headers: { 'User-Agent': USER_AGENT },
      validateStatus: () => true,
    });
    const finalUrl = response.request?.res?.responseUrl || url;
    const rawHtml = typeof response.data === 'string' ? response.data : '';
    return {
      url,
      statusCode: response.status,
      responseTimeMs: Date.now() - start,
      rawHtml,
      isJsRendered: detectJsRenderingIssue(rawHtml),
      finalUrl,
      redirectChain: [],
      contentType: String(response.headers['content-type'] || ''),
    };
  } catch {
    return null;
  }
}

function detectJsRenderingIssue(html: string): boolean {
  if (html.length < 2000) return false;
  const $ = cheerio.load(html);
  $('script, style, head, noscript').remove();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  return bodyText.length < 200 && html.length > 5000;
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    const pathname = u.pathname === '/' ? '/' : u.pathname.replace(/\/$/, '');
    return `${u.origin}${pathname}${u.search}`;
  } catch { return url; }
}

function isSameDomain(url: string, base: string): boolean {
  try { return new URL(url).hostname === new URL(base).hostname; }
  catch { return false; }
}

function isHtmlPage(url: string): boolean {
  const lower = url.toLowerCase();
  return !['.pdf','.png','.jpg','.jpeg','.gif','.svg','.webp','.css','.js','.json','.xml','.zip','.mp4','.mp3']
    .some(ext => lower.includes(ext));
}

export async function fetchRobotsTxt(siteUrl: string): Promise<string | null> {
  try {
    const base = new URL(siteUrl);
    const res = await axios.get(`${base.origin}/robots.txt`, {
      timeout: 8000,
      headers: { 'User-Agent': USER_AGENT },
      validateStatus: s => s < 500,
    });
    return res.status === 200 ? res.data : null;
  } catch { return null; }
}

export async function fetchSitemap(siteUrl: string, robotsTxt?: string): Promise<string | null> {
  if (robotsTxt) {
    const match = robotsTxt.match(/^Sitemap:\s*(.+)$/im);
    if (match) {
      try {
        const res = await axios.get(match[1].trim(), { timeout: 8000, headers: { 'User-Agent': USER_AGENT }, validateStatus: s => s < 500 });
        if (res.status === 200) return res.data;
      } catch { /* try default */ }
    }
  }
  try {
    const base = new URL(siteUrl);
    const res = await axios.get(`${base.origin}/sitemap.xml`, { timeout: 8000, headers: { 'User-Agent': USER_AGENT }, validateStatus: s => s < 500 });
    return res.status === 200 ? res.data : null;
  } catch { return null; }
}
