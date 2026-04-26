import { v4 as uuidv4 } from 'uuid';
import { AuditJob, AuditResult } from '@/types/audit';
import { crawlSite, fetchRobotsTxt, fetchSitemap } from '@/lib/crawler';
import { auditCrawlability, getCrawlabilityScore } from '@/lib/auditors/crawlability';
import { auditIndexability, getIndexabilityScore } from '@/lib/auditors/indexability';
import { auditOnPage, getOnPageScore } from '@/lib/auditors/on-page';
import { auditInternalLinks, getLinkScore } from '@/lib/auditors/links';
import { generateIssues } from '@/lib/auditors/issues';
import { generateAIMetaContent, generateFAQSchema } from '@/lib/ai/meta-generator';
import { buildFixScript } from '@/lib/ai/fix-script';

// In-memory store — replace with Redis/DB for production
const jobs = new Map<string, AuditJob>();

export function createJob(url: string): AuditJob {
  const job: AuditJob = { id: uuidv4(), url, status: 'queued', progress: 0, message: 'Queued...', createdAt: Date.now() };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): AuditJob | undefined {
  return jobs.get(id);
}

function update(id: string, patch: Partial<AuditJob>) {
  const job = jobs.get(id);
  if (job) jobs.set(id, { ...job, ...patch });
}

export async function runAudit(jobId: string, url: string): Promise<void> {
  try {
    update(jobId, { status: 'crawling', progress: 5, message: 'Crawling your website...' });

    const robotsTxt = await fetchRobotsTxt(url);
    const [pages, sitemapXml] = await Promise.all([
      crawlSite(url),
      fetchSitemap(url, robotsTxt || undefined),
    ]);

    update(jobId, { progress: 35, message: `Found ${pages.length} pages. Running SEO checks...` });
    update(jobId, { status: 'auditing', progress: 45 });

    const [crawlability, indexability, onPage, internalLinks] = await Promise.all([
      auditCrawlability(pages, robotsTxt, sitemapXml, url),
      Promise.resolve(auditIndexability(pages)),
      Promise.resolve(auditOnPage(pages)),
      Promise.resolve(auditInternalLinks(pages, url)),
    ]);

    update(jobId, { status: 'generating', progress: 65, message: 'Generating AI-powered fixes...' });

    const [aiFixItems, faqFixItems] = await Promise.all([
      generateAIMetaContent(pages).catch(() => []),
      generateFAQSchema(pages).catch(() => []),
    ]);

    update(jobId, { progress: 85, message: 'Building fix script...' });

    const fixScript = buildFixScript(pages, onPage, indexability, aiFixItems, faqFixItems);
    const issues = generateIssues(crawlability, indexability, onPage, internalLinks);

    const crawlScore = getCrawlabilityScore(crawlability);
    const indexScore = getIndexabilityScore(indexability);
    const onPageScore = getOnPageScore(onPage);
    const linkScore = getLinkScore(internalLinks, pages.length);
    const overall = Math.round((crawlScore + indexScore + onPageScore + linkScore) / 4);

    const result: AuditResult = {
      jobId, url, crawledAt: Date.now(), pagesCrawled: pages.length,
      scores: { overall, crawlability: crawlScore, indexability: indexScore, onPage: onPageScore, linkStructure: linkScore },
      issues, crawlability, indexability, onPage, internalLinks, fixScript,
    };

    update(jobId, { status: 'complete', progress: 100, message: 'Audit complete!', completedAt: Date.now(), result });
  } catch (err) {
    console.error('Audit failed:', err);
    update(jobId, { status: 'error', progress: 0, message: 'Audit failed', error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
