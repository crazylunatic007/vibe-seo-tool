import { NextRequest, NextResponse } from 'next/server';
import { createJob, runAudit } from '@/lib/audit-runner';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const job = createJob(parsedUrl.href);

    // Run audit in background (non-blocking)
    runAudit(job.id, parsedUrl.href).catch(console.error);

    return NextResponse.json({ jobId: job.id });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
