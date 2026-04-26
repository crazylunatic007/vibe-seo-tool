import * as cheerio from 'cheerio';
import { CrawledPage, IndexabilityResult, CanonicalIssue } from '@/types/audit';

export function auditIndexability(pages: CrawledPage[]): IndexabilityResult {
  const noindexPages: IndexabilityResult['noindexPages'] = [];
  const canonicalIssues: CanonicalIssue[] = [];
  const titleCounts: Record<string, string[]> = {};
  const thinContentPages: IndexabilityResult['thinContentPages'] = [];

  for (const page of pages) {
    if (page.statusCode !== 200) continue;
    const $ = cheerio.load(page.rawHtml);
    const robotsMeta = $('meta[name="robots"]').attr('content') || '';
    if (robotsMeta.toLowerCase().includes('noindex')) noindexPages.push({ url: page.url, source: 'meta' });

    const canonical = $('link[rel="canonical"]').attr('href');
    if (!canonical) {
      canonicalIssues.push({ url: page.url, type: 'missing' });
    } else {
      try {
        const canonUrl = new URL(canonical, page.url).href;
        const siteRoot = new URL(page.url).origin + '/';
        if (canonUrl === siteRoot && page.url !== siteRoot) {
          canonicalIssues.push({ url: page.url, type: 'points_to_homepage', canonicalValue: canonical });
        }
      } catch { /* skip */ }
    }

    const title = $('title').text().trim();
    if (title) { if (!titleCounts[title]) titleCounts[title] = []; titleCounts[title].push(page.url); }

    $('script, style, nav, header, footer').remove();
    const wordCount = $('body').text().replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
    if (wordCount < 300) thinContentPages.push({ url: page.url, wordCount });
  }

  return {
    noindexPages,
    canonicalIssues,
    duplicateTitles: Object.entries(titleCounts).filter(([, u]) => u.length > 1).map(([title, pages]) => ({ title, pages })),
    thinContentPages,
  };
}

export function getIndexabilityScore(result: IndexabilityResult): number {
  let score = 100;
  score -= Math.min(40, result.noindexPages.length * 20);
  score -= Math.min(20, result.canonicalIssues.filter(c => c.type === 'points_to_homepage').length * 10);
  score -= Math.min(15, result.canonicalIssues.filter(c => c.type === 'missing').length * 2);
  score -= Math.min(15, result.duplicateTitles.length * 5);
  score -= Math.min(10, result.thinContentPages.length * 3);
  return Math.max(0, score);
}
