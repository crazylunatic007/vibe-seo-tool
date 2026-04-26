import { CrawledPage, InternalLinksResult } from '@/types/audit';
import * as cheerio from 'cheerio';

export function auditInternalLinks(pages: CrawledPage[], siteUrl: string): InternalLinksResult {
  const pageUrls = new Set(pages.map(p => p.url));
  const inbound: Record<string, number> = {};
  for (const url of pageUrls) inbound[url] = 0;

  for (const page of pages) {
    if (page.statusCode !== 200) continue;
    const $ = cheerio.load(page.rawHtml);
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      try {
        const abs = new URL(href, page.url).href.split('#')[0].replace(/\/$/, '');
        if (pageUrls.has(abs)) inbound[abs] = (inbound[abs] || 0) + 1;
      } catch { /* skip */ }
    });
  }

  const base = new URL(siteUrl).origin + '/';
  const orphanPages = Object.entries(inbound)
    .filter(([url, count]) => count === 0 && url !== siteUrl && url !== base)
    .map(([url]) => url).slice(0, 20);

  const lowLinkPages = Object.entries(inbound)
    .filter(([url, count]) => count > 0 && count < 2 && url !== siteUrl && url !== base)
    .map(([url, inboundCount]) => ({ url, inboundCount })).slice(0, 20);

  return { orphanPages, lowLinkPages, navigationConsistency: { consistent: true, missingFromNav: [] } };
}

export function getLinkScore(result: InternalLinksResult, total: number): number {
  if (!total) return 100;
  let score = 100;
  score -= Math.min(30, (result.orphanPages.length / total) * 60);
  score -= Math.min(20, (result.lowLinkPages.length / total) * 40);
  return Math.max(0, Math.round(score));
}
