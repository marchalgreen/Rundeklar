import type { NextRequest } from 'next/server';

import { handlePreviewApply } from '../preview/handler';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  context?: { params: { slug?: string } | Promise<{ slug?: string }> },
) {
  return handlePreviewApply(req, context, { dryRun: false });
}

