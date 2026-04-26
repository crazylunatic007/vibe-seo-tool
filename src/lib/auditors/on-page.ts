import * as cheerio from 'cheerio';
import { CrawledPage, OnPageResult, PageSEOData } from '@/types/audit';

export function auditOnPage(pages: CrawledPage[]): OnPageResult {
  const allTitles: Record<string, string[]> = {};
  const allDescs: Record<string, string[]> = {};

  for (const page of pages) {
    if (page.statusCode !== 200) continue;
    const $ = cheerio.load(page.rawHtml);
    const title = $('title').text().trim();
    const desc = $('meta[name="description"]').attr('content')?.trim() || '';
    if (title) { if (!allTitles[title]) allTitles[title] = []; allTitles[title].push(page.url); }
    if (desc) { if (!allDescs[desc]) allDescs[desc] = []; allDescs[desc].push(page.url); }
  }

  const dupTitles = new Set(Object.entries(allTitles).filter(([, u]) => u.length > 1).map(([t]) => t));
  const dupDescs = new Set(Object.entries(allDescs).filter(([, u]) => u.length > 1).map(([d]) => d));

  const pageData: PageSEOData[] = [];
  for (const page of pages) {
    if (page.statusCode !== 200) continue;
    const $ = cheerio.load(page.rawHtml);

    const titleVal = $('title').text().trim() || null;
    const titleLen = titleVal?.length || 0;
    const titleIssues: PageSEOData['title']['issues'] = [];
    if (!titleVal) titleIssues.push('missing');
    else if (titleLen < 30) titleIssues.push('too_short');
    else if (titleLen > 60) titleIssues.push('too_long');
    if (titleVal && dupTitles.has(titleVal)) titleIssues.push('duplicate');

    const descVal = $('meta[name="description"]').attr('content')?.trim() || null;
    const descLen = descVal?.length || 0;
    const descIssues: PageSEOData['metaDescription']['issues'] = [];
    if (!descVal) descIssues.push('missing');
    else if (descLen < 70) descIssues.push('too_short');
    else if (descLen > 160) descIssues.push('too_long');
    if (descVal && dupDescs.has(descVal)) descIssues.push('duplicate');

    const h1Vals = $('h1').map((_, el) => $(el).text().trim()).get();
    const h1Issues: PageSEOData['h1']['issues'] = [];
    if (h1Vals.length === 0) h1Issues.push('missing');
    else if (h1Vals.length > 1) h1Issues.push('multiple');

    const headings = $('h1,h2,h3,h4,h5,h6').map((_, el) => parseInt(el.tagName.replace('h', ''), 10)).get();
    const hierIssues: string[] = [];
    for (let i = 1; i < headings.length; i++) if (headings[i] - headings[i-1] > 1) hierIssues.push(`H${headings[i-1]}→H${headings[i]}`);

    const allImgs = $('img');
    const missingAlt = allImgs.filter((_, el) => !$(el).attr('alt')).length;

    const bodyText = $('body').text().toLowerCase();
    const faqDetected = bodyText.includes('frequently asked') || bodyText.includes('faq') || $('details').length > 2;

    $('script,style,nav,header,footer').remove();
    const wordCount = $('body').text().replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;

    pageData.push({
      url: page.url,
      title: { value: titleVal, length: titleLen, issues: titleIssues },
      metaDescription: { value: descVal, length: descLen, issues: descIssues },
      h1: { values: h1Vals, count: h1Vals.length, issues: h1Issues },
      headingHierarchy: { valid: hierIssues.length === 0, issues: hierIssues },
      images: { total: allImgs.length, missingAlt, urls: [] },
      faqDetected,
      wordCount,
    });
  }

  return { pages: pageData };
}

export function getOnPageScore(result: OnPageResult): number {
  if (!result.pages.length) return 0;
  const scores = result.pages.map(p => {
    let s = 100;
    if (p.title.issues.includes('missing')) s -= 25;
    else if (p.title.issues.some(i => i === 'too_short' || i === 'too_long')) s -= 10;
    if (p.title.issues.includes('duplicate')) s -= 10;
    if (p.metaDescription.issues.includes('missing')) s -= 20;
    else if (p.metaDescription.issues.some(i => i === 'too_short' || i === 'too_long')) s -= 8;
    if (p.h1.issues.includes('missing')) s -= 20;
    if (p.h1.issues.includes('multiple')) s -= 10;
    if (p.images.missingAlt > 0) s -= Math.min(15, p.images.missingAlt * 3);
    return Math.max(0, s);
  });
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}
