import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';
import { CrawledPage, FixItem } from '@/types/audit';

const client = new Anthropic();

export async function generateAIMetaContent(pages: CrawledPage[]): Promise<FixItem[]> {
  if (process.env.SKIP_AI_GENERATION === 'true') return [];
  const fixes: FixItem[] = [];
  const needsMeta = pages.filter(p => {
    if (p.statusCode !== 200) return false;
    const $ = cheerio.load(p.rawHtml);
    return !$('title').text().trim() || !$('meta[name="description"]').attr('content')?.trim();
  }).slice(0, 20);

  for (const page of needsMeta) {
    const $ = cheerio.load(page.rawHtml);
    $('script,style,nav,header,footer,aside').remove();
    const existingTitle = $('title').text().trim();
    const existingDesc = $('meta[name="description"]').attr('content')?.trim();
    const h1 = $('h1').first().text().trim();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 1500);

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: `SEO expert task: Generate missing meta tags for this page.
URL: ${page.url}
H1: ${h1 || 'None'}
Content: ${bodyText}
Need title: ${!existingTitle}
Need description: ${!existingDesc}

Return ONLY valid JSON (no markdown):
{"title": "50-60 char title or null if not needed", "description": "140-160 char description or null if not needed"}`,
        }],
      });
      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      if (!existingTitle && parsed.title) fixes.push({ type: 'meta_title', url: page.url, value: parsed.title });
      if (!existingDesc && parsed.description) fixes.push({ type: 'meta_description', url: page.url, value: parsed.description });
    } catch (err) {
      console.error(`AI meta gen failed for ${page.url}:`, err);
    }
  }
  return fixes;
}

export async function generateFAQSchema(pages: CrawledPage[]): Promise<FixItem[]> {
  if (process.env.SKIP_AI_GENERATION === 'true') return [];
  const fixes: FixItem[] = [];
  const faqPages = pages.filter(p => {
    if (p.statusCode !== 200) return false;
    const $ = cheerio.load(p.rawHtml);
    if ($('script[type="application/ld+json"]').length > 0) return false;
    const text = $('body').text().toLowerCase();
    return text.includes('faq') || text.includes('frequently asked') || $('details').length > 2;
  }).slice(0, 5);

  for (const page of faqPages) {
    const $ = cheerio.load(page.rawHtml);
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 3000);
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Extract FAQ Q&A pairs from this page and return JSON-LD structured data.
Content: ${bodyText}

Return ONLY the JSON object (no script tags, no markdown). If fewer than 3 genuine Q&A pairs exist, return null.
Format: {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Q?","acceptedAnswer":{"@type":"Answer","text":"A."}}]}`,
        }],
      });
      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const clean = text.replace(/```json|```/g, '').trim();
      if (clean && clean !== 'null') {
        JSON.parse(clean);
        fixes.push({ type: 'faq_schema', url: page.url, value: clean });
      }
    } catch (err) {
      console.error(`FAQ schema gen failed for ${page.url}:`, err);
    }
  }
  return fixes;
}
