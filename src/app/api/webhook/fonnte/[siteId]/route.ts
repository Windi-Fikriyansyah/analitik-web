import { NextRequest } from 'next/server';
import { POST as handlePost, GET as handleGet, OPTIONS as handleOptions } from '../route';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(
  req: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const url = new URL(req.url);
  url.searchParams.set('site_id', params.siteId);
  const forwardReq = new NextRequest(url, {
    method: 'GET',
    headers: req.headers,
  });
  return handleGet(forwardReq);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const url = new URL(req.url);
  url.searchParams.set('site_id', params.siteId);
  const forwardReq = new NextRequest(url, {
    method: 'POST',
    headers: req.headers,
    body: req.body,
  });
  return handlePost(forwardReq);
}
