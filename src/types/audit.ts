export type AuditStatus = 'queued' | 'crawling' | 'auditing' | 'generating' | 'complete' | 'error';

export interface AuditJob {
  id: string;
  url: string;
  status: AuditStatus;
  progress: number;
  message: string;
  createdAt: number;
  completedAt?: number;
  result?: AuditResult;
  error?: string;
}

export interface CrawledPage {
  url: string;
  statusCode: number;
  responseTimeMs: number;
  rawHtml: string;
  isJsRendered: boolean;
  finalUrl: string;
  redirectChain: string[];
  contentType: string;
}

export interface CrawlabilityResult {
  robotsTxt: { exists: boolean; content?: string; blockingGooglebot: boolean; blockedPaths: string[] };
  sitemapXml: { exists: boolean; url?: string; urlCount: number; invalidUrls: string[] };
  jsRenderingIssue: boolean;
  jsRenderingPages: string[];
  httpIssues: PageHttpIssue[];
  slowPages: { url: string; responseTimeMs: number }[];
  platformDetected?: VibePlatform;
}

export interface PageHttpIssue {
  url: string;
  statusCode: number;
  type: '404' | '500' | 'redirect_chain' | 'redirect_loop';
  detail: string;
}

export type VibePlatform = 'lovable' | 'replit' | 'bolt' | 'v0' | 'cursor' | 'vercel' | 'netlify' | 'unknown';

export interface IndexabilityResult {
  noindexPages: { url: string; source: 'meta' | 'header' }[];
  canonicalIssues: CanonicalIssue[];
  duplicateTitles: { title: string; pages: string[] }[];
  thinContentPages: { url: string; wordCount: number }[];
}

export interface CanonicalIssue {
  url: string;
  type: 'missing' | 'self_canonical_wrong' | 'points_to_homepage' | 'chain';
  canonicalValue?: string;
}

export interface OnPageResult {
  pages: PageSEOData[];
}

export interface PageSEOData {
  url: string;
  title: { value: string | null; length: number; issues: TitleIssue[] };
  metaDescription: { value: string | null; length: number; issues: MetaDescIssue[] };
  h1: { values: string[]; count: number; issues: H1Issue[] };
  headingHierarchy: { valid: boolean; issues: string[] };
  images: { total: number; missingAlt: number; urls: string[] };
  faqDetected: boolean;
  wordCount: number;
}

export type TitleIssue = 'missing' | 'too_short' | 'too_long' | 'duplicate';
export type MetaDescIssue = 'missing' | 'too_short' | 'too_long' | 'duplicate';
export type H1Issue = 'missing' | 'multiple';

export interface InternalLinksResult {
  orphanPages: string[];
  lowLinkPages: { url: string; inboundCount: number }[];
  navigationConsistency: { consistent: boolean; missingFromNav: string[] };
}

export interface AuditScores {
  overall: number;
  crawlability: number;
  indexability: number;
  onPage: number;
  linkStructure: number;
}

export type IssueSeverity = 'critical' | 'warning' | 'info';

export interface AuditIssue {
  id: string;
  severity: IssueSeverity;
  category: 'crawlability' | 'indexability' | 'on_page' | 'links';
  title: string;
  description: string;
  affectedUrls: string[];
  fixedByScript: boolean;
  manualSteps?: string;
}

export interface FixScriptData {
  script: string;
  fixes: FixItem[];
  sitemapXml?: string;
  robotsTxt?: string;
}

export interface FixItem {
  type: 'meta_title' | 'meta_description' | 'canonical' | 'noindex_removal' | 'faq_schema';
  url: string;
  value: string;
}

export interface AuditResult {
  jobId: string;
  url: string;
  crawledAt: number;
  pagesCrawled: number;
  scores: AuditScores;
  issues: AuditIssue[];
  crawlability: CrawlabilityResult;
  indexability: IndexabilityResult;
  onPage: OnPageResult;
  internalLinks: InternalLinksResult;
  fixScript: FixScriptData;
}
