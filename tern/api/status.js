// Tells the app whether the server holds a Gemini key, so it knows when to ask for one.
export function GET() {
  const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.TERN_MOCK === '1');
  return new Response(JSON.stringify({ hasKey }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
