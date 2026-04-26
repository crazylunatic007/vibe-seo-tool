# VibeSEO — SEO Audit Tool for AI-Built Sites

Free SEO audit tool built specifically for sites made with **Lovable, Bolt, v0, Replit, Cursor**, or any AI-assisted builder.

## What it does

1. **Crawls your site** — discovers all pages (up to 100 on free tier)
2. **Audits 4 categories** — crawlability, indexability, on-page SEO, internal links
3. **Detects JS rendering issues** — the #1 problem with AI-built sites
4. **Generates a fix script** — one JavaScript snippet that auto-fixes meta tags, canonicals, noindex tags, and FAQ schema
5. **Provides downloadable files** — corrected sitemap.xml and robots.txt

## Tech stack

- **Next.js 14** (App Router + TypeScript)
- **Claude API** (Sonnet) — AI-generated meta descriptions and FAQ schema
- **Cheerio** — HTML parsing
- **Axios** — HTTP crawling
- **Tailwind CSS** — UI

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/crazylunatic007/vibe-seo-tool.git
cd vibe-seo-tool
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Get a key at [console.anthropic.com](https://console.anthropic.com)

> **No API key?** Set `SKIP_AI_GENERATION=true` to skip AI meta generation and still run the full audit.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel (free)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/crazylunatic007/vibe-seo-tool)

1. Click the button above
2. Add `ANTHROPIC_API_KEY` as an environment variable in Vercel
3. Deploy!

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── audit/[id]/page.tsx   # Results page
│   └── api/
│       └── audit/
│           ├── route.ts      # POST — start audit
│           └── [id]/route.ts # GET — poll status
├── lib/
│   ├── crawler/              # Page crawler
│   ├── auditors/             # Audit modules
│   │   ├── crawlability.ts
│   │   ├── indexability.ts
│   │   ├── on-page.ts
│   │   ├── links.ts
│   │   └── issues.ts
│   ├── ai/
│   │   ├── meta-generator.ts # Claude API integration
│   │   └── fix-script.ts     # Fix script builder
│   └── audit-runner.ts       # Job orchestrator
└── types/
    └── audit.ts              # TypeScript types
```

## Roadmap

- [ ] V2: Puppeteer-based JS rendering diff (visual side-by-side)
- [ ] V2: Google Search Console OAuth integration
- [ ] V2: Platform-specific prerender config files (vercel.json, netlify.toml)
- [ ] V2: Historical comparison (before/after re-scan)
- [ ] V3: Agency white-label PDF reports
- [ ] V3: Fix-it marketplace

## License

MIT
