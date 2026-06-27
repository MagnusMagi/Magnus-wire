import { getDispatches, type Dispatch } from "./dispatches";
import type { Locale } from "./i18n";

export interface Story {
  key: string;
  headline: string;
  section: string;
  tags: string[];
  latest: string; // publishedAt of newest member
  items: Dispatch[];
}

function tagSet(d: Dispatch): Set<string> {
  return new Set((d.tags || []).map((t) => t.toLowerCase().trim()).filter(Boolean));
}

function sharedCount(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const x of a) if (b.has(x)) n += 1;
  return n;
}

// Greedy tag-overlap clustering: a dispatch joins a cluster when it shares
// >=2 tags (or all of a tiny tag set) with that cluster's accumulated tags.
export async function getStories(locale: Locale, opts: { pool?: number; max?: number; minSize?: number } = {}): Promise<Story[]> {
  const pool = opts.pool ?? 120;
  const max = opts.max ?? 12;
  const minSize = opts.minSize ?? 2;
  const list = await getDispatches(locale, pool);

  const clusters: { tags: Set<string>; items: Dispatch[] }[] = [];
  for (const d of list) {
    const ts = tagSet(d);
    if (ts.size === 0) continue;
    let best: { c: (typeof clusters)[number]; score: number } | null = null;
    for (const c of clusters) {
      const shared = sharedCount(ts, c.tags);
      const need = Math.min(2, ts.size);
      if (shared >= need && (!best || shared > best.score)) best = { c, score: shared };
    }
    if (best) { best.c.items.push(d); for (const t of ts) best.c.tags.add(t); }
    else clusters.push({ tags: new Set(ts), items: [d] });
  }

  const stories: Story[] = clusters
    .filter((c) => c.items.length >= minSize)
    .map((c) => {
      const items = [...c.items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
      const top = items[0];
      const tagCount = new Map<string, number>();
      for (const it of c.items) for (const t of tagSet(it)) tagCount.set(t, (tagCount.get(t) || 0) + 1);
      const tags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => t);
      return { key: top.slug, headline: top.title, section: top.section, tags, latest: top.publishedAt, items };
    })
    .sort((a, b) => b.latest.localeCompare(a.latest))
    .slice(0, max);

  return stories;
}
