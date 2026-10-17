import Link from "next/link";
import { db } from "@/lib/db";
import { AddTweet, TweetActions } from "./TweetActions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface Row {
  id: string;
  screen_name: string;
  author_name: string;
  text: string;
  lang: string;
  favorite_count: number;
  reply_count: number;
  posted_at: string;
  found_via: string;
  source_name: string | null;
  active: boolean;
  pinned: boolean;
  fail_count: number;
}

const fmt = (iso: string) => new Date(iso).toISOString().slice(0, 16).replace("T", " ");

export default async function AdminTweetsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dil?: string; durum?: string; s?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q || "").slice(0, 80);
  const dil = (sp.dil || "").replace(/[^a-z-]/g, "").slice(0, 8);
  const durum = sp.durum || "";
  const skip = Math.max(0, Number(sp.s) || 0);

  const sql = db();
  // Parametreli sorgu: enjeksiyon yok; yalnız LIKE jokerleri kaçırılıyor.
  const pat = q ? `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : "";
  const where = [
    pat ? sql`(screen_name ilike ${pat} or author_name ilike ${pat} or text ilike ${pat})` : sql`true`,
    dil ? sql`lang = ${dil}` : sql`true`,
    durum === "acik" ? sql`active` :
    durum === "gizli" ? sql`not active` :
    durum === "elle" ? sql`found_via = 'manual'` :
    durum === "sabit" ? sql`pinned` : sql`true`,
  ];
  const rows = await sql<(Row & { total: number })[]>`
    select id, screen_name, author_name, text, lang, favorite_count, reply_count, posted_at,
           found_via, source_name, active, pinned, fail_count, count(*) over () as total
      from tweets
     where ${where[0]} and ${where[1]} and ${where[2]}
     order by posted_at desc
     limit ${PAGE_SIZE} offset ${skip}`;
  // Sayfa boşsa (taşan offset) toplamı ayrıca say; pencere fonksiyonu satırsız döner.
  const total = rows[0]?.total ?? (skip > 0
    ? (await sql<{ n: number }[]>`select count(*) as n from tweets where ${where[0]} and ${where[1]} and ${where[2]}`)[0].n
    : 0);
  const linkTo = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(dil && { dil }), ...(durum && { durum }), ...patch });
    return `/admin/x?${p.toString()}`;
  };
  const filterCls = (on: boolean) =>
    `font-mono text-[10px] uppercase tracking-wide px-2 py-1 border ${on ? "border-ink text-ink" : "border-line text-ink-3 hover:text-ink"}`;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h1 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-ink">
          X telleri <span className="text-ink-3">({total})</span>
        </h1>
        <Link href="/admin" className="font-mono text-[10px] uppercase tracking-wide text-wire hover:text-signal">
          ← panel
        </Link>
      </div>

      <AddTweet />

      <form method="get" action="/admin/x" className="flex flex-wrap gap-2 mb-3">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="hesap veya metin ara"
          className="font-mono text-xs px-2 py-1 border border-line bg-paper text-ink min-w-0 flex-1"
        />
        <input
          type="text"
          name="dil"
          defaultValue={dil}
          placeholder="dil (tr/en…)"
          size={9}
          className="font-mono text-xs px-2 py-1 border border-line bg-paper text-ink"
        />
        <button type="submit" className="font-mono text-[10px] uppercase tracking-wide px-3 py-1 border border-ink text-ink hover:bg-ink hover:text-paper">
          filtrele
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <Link href={linkTo({ durum: "", s: "0" })} className={filterCls(!durum)}>hepsi</Link>
        <Link href={linkTo({ durum: "acik", s: "0" })} className={filterCls(durum === "acik")}>açık</Link>
        <Link href={linkTo({ durum: "gizli", s: "0" })} className={filterCls(durum === "gizli")}>gizli</Link>
        <Link href={linkTo({ durum: "sabit", s: "0" })} className={filterCls(durum === "sabit")}>sabit</Link>
        <Link href={linkTo({ durum: "elle", s: "0" })} className={filterCls(durum === "elle")}>elle eklenen</Link>
      </div>

      <div className="overflow-x-auto border border-line">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-ink text-paper font-mono text-[10px] uppercase tracking-wide">
              <th className="text-left px-2 py-1.5 font-bold">Tweet</th>
              <th className="text-left px-2 py-1.5 font-bold whitespace-nowrap">Dil</th>
              <th className="text-right px-2 py-1.5 font-bold whitespace-nowrap">♥ / ↩</th>
              <th className="text-left px-2 py-1.5 font-bold whitespace-nowrap">Kaynak</th>
              <th className="text-left px-2 py-1.5 font-bold whitespace-nowrap">Tarih</th>
              <th className="text-right px-2 py-1.5 font-bold">Eylem</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line align-top">
                <td className="px-2 py-1.5 max-w-[420px]">
                  <a
                    href={`https://x.com/${r.screen_name}/status/${r.id}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block font-bold text-ink hover:text-wire"
                  >
                    @{r.screen_name}
                  </a>
                  <span className="block text-ink-2 break-words">{r.text.slice(0, 160) || "—"}</span>
                  {r.fail_count > 0 && (
                    <span className="block font-mono text-[10px] text-signal mt-0.5">çekilemedi ×{r.fail_count}</span>
                  )}
                </td>
                <td className="px-2 py-1.5 font-mono text-[11px] text-ink-2 whitespace-nowrap">{r.lang}</td>
                <td className="px-2 py-1.5 font-mono text-[11px] text-ink-2 text-right whitespace-nowrap tabular-nums">
                  {r.favorite_count} / {r.reply_count}
                </td>
                <td className="px-2 py-1.5 font-mono text-[10px] text-ink-3 max-w-[160px] break-words">
                  {r.found_via === "manual" ? "elle" : r.source_name || "—"}
                </td>
                <td className="px-2 py-1.5 font-mono text-[10px] text-ink-3 whitespace-nowrap">{fmt(r.posted_at)}</td>
                <td className="px-2 py-1.5 text-right whitespace-nowrap">
                  <TweetActions id={r.id} active={r.active} pinned={r.pinned} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-2 py-6 text-center text-ink-3 font-mono text-[11px]">Kayıt yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 font-mono text-[10px] uppercase tracking-wide">
        {skip > 0 ? (
          <Link href={linkTo({ s: String(Math.max(0, skip - PAGE_SIZE)) })} className="text-wire hover:text-signal">← önceki</Link>
        ) : <span />}
        <span className="text-ink-3">{total ? `${skip + 1}–${Math.min(skip + PAGE_SIZE, total)} / ${total}` : ""}</span>
        {skip + PAGE_SIZE < total ? (
          <Link href={linkTo({ s: String(skip + PAGE_SIZE) })} className="text-wire hover:text-signal">sonraki →</Link>
        ) : <span />}
      </div>
    </div>
  );
}
