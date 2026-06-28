// Basit, süreç-içi (in-memory) IP rate-limiter. Tek PM2 worker için yeterli;
// çok-worker/ölçek için Redis'e taşınmalı. Aynı pattern api/contact'tan türetildi.
const buckets = new Map<string, { n: number; t: number }>();

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "0";
}

/** key başına windowMs içinde limit aşılırsa true döner. */
export function rateLimited(key: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  if (buckets.size > 5000) buckets.clear();
  const cur = buckets.get(key);
  if (!cur || now - cur.t > windowMs) {
    buckets.set(key, { n: 1, t: now });
    return false;
  }
  cur.n += 1;
  return cur.n > limit;
}
