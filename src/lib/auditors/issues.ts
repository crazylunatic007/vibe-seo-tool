import { AuditIssue, CrawlabilityResult, IndexabilityResult, OnPageResult, InternalLinksResult } from '@/types/audit';

export function generateIssues(
  crawlability: CrawlabilityResult,
  indexability: IndexabilityResult,
  onPage: OnPageResult,
  links: InternalLinksResult
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  if (crawlability.robotsTxt.blockingGooglebot) {
    issues.push({ id: 'robots-blocking', severity: 'critical', category: 'crawlability', title: 'Your robots.txt is blocking Google', description: 'Your robots.txt file prevents Googlebot from crawling any page. Your entire site is invisible to Google.', affectedUrls: ['/robots.txt'], fixedByScript: false, manualSteps: 'Upload the corrected robots.txt file (generated below) to your site root.' });
  }
  if (!crawlability.robotsTxt.exists) {
    issues.push({ id: 'robots-missing', severity: 'warning', category: 'crawlability', title: 'No robots.txt file found', description: 'A robots.txt file helps Google understand which pages to crawl. Without it, Google may waste crawl budget on unimportant pages.', affectedUrls: [], fixedByScript: false, manualSteps: 'Upload the generated robots.txt file (below) to your site root.' });
  }
  if (!crawlability.sitemapXml.exists) {
    issues.push({ id: 'sitemap-missing', severity: 'critical', category: 'crawlability', title: 'No XML sitemap found', description: 'A sitemap tells Google exactly which pages exist. Without one, Google may miss pages — especially common on AI-built sites.', affectedUrls: [], fixedByScript: false, manualSteps: 'Upload the generated sitemap.xml file (below) to your site root.' });
  }
  if (crawlability.jsRenderingIssue) {
    issues.push({ id: 'js-rendering', severity: 'critical', category: 'crawlability', title: 'Google may not see your content (JS rendering issue)', description: `${crawlability.jsRenderingPages.length} page(s) appear nearly empty in raw HTML. Your site loads content via JavaScript, which Google may not execute. This is the #1 issue with AI-built sites.`, affectedUrls: crawlability.jsRenderingPages.slice(0, 5), fixedByScript: false, manualSteps: 'Enable SSR or prerendering on your hosting platform. See platform-specific guide below.' });
  }
  if (crawlability.slowPages.length > 0) {
    issues.push({ id: 'slow-pages', severity: 'warning', category: 'crawlability', title: `${crawlability.slowPages.length} page(s) respond too slowly`, description: 'Pages slower than 3 seconds may be skipped by Google\'s crawler.', affectedUrls: crawlability.slowPages.map(p => p.url).slice(0, 5), fixedByScript: false, manualSteps: 'Upgrade hosting, enable a CDN, or reduce page size.' });
  }
  if (indexability.noindexPages.length > 0) {
    issues.push({ id: 'noindex-tags', severity: 'critical', category: 'indexability', title: `${indexability.noindexPages.length} page(s) blocked from Google's index`, description: 'These pages have a noindex tag — often accidentally left in by AI-built templates. The fix script removes them.', affectedUrls: indexability.noindexPages.map(p => p.url).slice(0, 5), fixedByScript: true });
  }
  const badCanonicals = indexability.canonicalIssues.filter(c => c.type === 'points_to_homepage');
  if (badCanonicals.length > 0) {
    issues.push({ id: 'canonical-homepage', severity: 'critical', category: 'indexability', title: `${badCanonicals.length} page(s) have canonicals pointing to homepage`, description: 'This tells Google all these pages are duplicates of your homepage — only the homepage gets indexed.', affectedUrls: badCanonicals.map(c => c.url).slice(0, 5), fixedByScript: true });
  }
  const missingCanonicals = indexability.canonicalIssues.filter(c => c.type === 'missing');
  if (missingCanonicals.length > 0) {
    issues.push({ id: 'canonical-missing', severity: 'warning', category: 'indexability', title: `${missingCanonicals.length} page(s) missing canonical tags`, description: 'Without canonicals, Google may choose the wrong URL version to index.', affectedUrls: missingCanonicals.map(c => c.url).slice(0, 5), fixedByScript: true });
  }
  if (indexability.duplicateTitles.length > 0) {
    issues.push({ id: 'duplicate-titles', severity: 'warning', category: 'indexability', title: `${indexability.duplicateTitles.length} duplicate title tag(s) found`, description: 'Multiple pages share the same title. Google may treat them as duplicates.', affectedUrls: indexability.duplicateTitles.flatMap(d => d.pages).slice(0, 5), fixedByScript: true });
  }
  const missingTitles = onPage.pages.filter(p => p.title.issues.includes('missing'));
  if (missingTitles.length > 0) {
    issues.push({ id: 'missing-titles', severity: 'critical', category: 'on_page', title: `${missingTitles.length} page(s) have no title tag`, description: 'Title tags are the most important on-page SEO element. The fix script adds AI-generated titles.', affectedUrls: missingTitles.map(p => p.url).slice(0, 5), fixedByScript: true });
  }
  const missingDescs = onPage.pages.filter(p => p.metaDescription.issues.includes('missing'));
  if (missingDescs.length > 0) {
    issues.push({ id: 'missing-descriptions', severity: 'warning', category: 'on_page', title: `${missingDescs.length} page(s) missing meta descriptions`, description: 'Without meta descriptions, Google picks random text as your search result preview.', affectedUrls: missingDescs.map(p => p.url).slice(0, 5), fixedByScript: true });
  }
  const missingH1 = onPage.pages.filter(p => p.h1.issues.includes('missing'));
  if (missingH1.length > 0) {
    issues.push({ id: 'missing-h1', severity: 'warning', category: 'on_page', title: `${missingH1.length} page(s) missing an H1 heading`, description: 'The H1 tag tells Google the main topic of a page. Every page needs exactly one.', affectedUrls: missingH1.map(p => p.url).slice(0, 5), fixedByScript: false, manualSteps: 'Add an H1 heading to each page that clearly describes its main topic.' });
  }
  const missingAltPages = onPage.pages.filter(p => p.images.missingAlt > 0);
  if (missingAltPages.length > 0) {
    issues.push({ id: 'missing-alt', severity: 'info', category: 'on_page', title: `Images missing alt text on ${missingAltPages.length} page(s)`, description: 'Alt text helps Google understand images and is required for accessibility.', affectedUrls: missingAltPages.map(p => p.url).slice(0, 5), fixedByScript: false, manualSteps: 'Add descriptive alt="" attributes to all image tags.' });
  }
  const faqPages = onPage.pages.filter(p => p.faqDetected);
  if (faqPages.length > 0) {
    issues.push({ id: 'faq-schema', severity: 'info', category: 'on_page', title: `${faqPages.length} page(s) have FAQs without schema markup`, description: 'FAQ schema enables rich results in Google showing answers directly in search. The fix script adds it automatically.', affectedUrls: faqPages.map(p => p.url).slice(0, 5), fixedByScript: true });
  }
  if (links.orphanPages.length > 0) {
    issues.push({ id: 'orphan-pages', severity: 'critical', category: 'links', title: `${links.orphanPages.length} orphan page(s) with no internal links`, description: "No other page links to these pages. Google's crawler cannot reliably find them.", affectedUrls: links.orphanPages.slice(0, 5), fixedByScript: false, manualSteps: 'Link to these pages from your navigation, homepage, or related content.' });
  }

  const order: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  return issues.sort((a, b) => order[a.severity] - order[b.severity]);
}
