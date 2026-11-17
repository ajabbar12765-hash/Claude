import { authConfigured } from './_lib/session.js';
import { storeKind } from './_lib/store.js';

// Tells the app what this server can do, so it knows what to offer.
export function GET() {
  const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.TERN_MOCK === '1');
  const auth = authConfigured() && (storeKind() === 'postgres' || process.env.TERN_MOCK === '1' || !process.env.VERCEL);
  return new Response(JSON.stringify({ hasKey, auth, store: storeKind() }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
