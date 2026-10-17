import Link from "next/link";
import { db } from "@/lib/db";
import { ALL_SECTIONS } from "@/lib/site";
import { SourceToggle } from "./SourceToggle";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface SourceRow {
  id: number;
  url: string;
  name: string;
  section: string | null;
  region: string | null;
  lang: string | null;
  active: boolean;
  last_fetched_at: string | null;
  last_status: string | null;
  fail_count: number;
  item_count: number;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toISOString().slice(0, 16).replace("T", " ");
}

export default async function AdminSourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; section?: string; durum?: string; s?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q || "").slice(0, 80);
  const section = sp.section || "";
  const durum = sp.durum || "";
  const skip = Math.max(0, Number(sp.s) || 0);

  const sql = db();
  // Parametreli sorgu: enjeksiyon yok; yalnız LIKE jokerleri kaçırılıyor.
  const pat = q ? `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : "";
  const cleanSection = section.replace(/[^a-z-]/g, "");
  const where = [
    pat ? sql`(name ilike ${pat} or url ilike ${pat})` : sql`true`,
    section === "yok" ? sql`section is null` : cleanSection ? sql`section = ${cleanSection}` : sql`true`,
    durum === "aktif" ? sql`active` :
    durum === "kapali" ? sql`not active` :
    durum === "hatali" ? sql`fail_count > 0` : sql`true`,
  ];
  const rows = await sql<(SourceRow & { total: number })[]>`
    select id, url, name, section, region, lang, active, last_fetched_at, last_status, fail_count, item_count,
           count(*) over () as total
      from sources
     where ${where[0]} and ${where[1]} and ${where[2]}
     order by fail_count desc, id asc
     limit ${PAGE_SIZE} offset ${skip}`;
  // Sayfa boşsa (taşan offset) toplamı ayrıca say; pencere fonksiyonu satırsız döner.
  const total = rows[0]?.total ?? (skip > 0
    ? (await sql<{ n: number }[]>`select count(*) as n from sources where ${where[0]} and ${where[1]} and ${where[2]}`)[0].n
    : 0);
  const linkTo = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(section && { section }), ...(durum && { durum }), ...patch });
    return `/admin/kaynaklar?${p.toString()}`;
  };
  const filterCls = (on: boolean) =>
    `font-mono text-[10px] uppercase tracking-wide px-2 py-1 border ${on ? "border-ink text-ink" : "border-line text-ink-3 hover:text-ink"}`;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h1 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-ink">
          Kaynaklar <span className="text-ink-3">({total})</span>
        </h1>
        <Link href="/admin" className="font-mono text-[10px] uppercase tracking-wide text-wire hover:text-signal">
          ← panel
        </Link>
      </div>

      <form method="get" action="/admin/kaynaklar" className="flex flex-wrap gap-2 mb-3">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="ad veya URL ara"
          className="font-mono text-xs px-2 py-1 border border-line bg-paper text-ink min-w-0 flex-1"
        />
        <select name="section" defaultValue={section} className="font-mono text-[11px] px-2 py-1 border border-line bg-paper text-ink">
          <option value="">tüm bölümler</option>
          <option value="yok">(AI sınıflar)</option>
          {ALL_SECTIONS.map((s) => (
            <option key={s.slug} value={s.slug}>{s.label.tr}</option>
          ))}
        </select>
        <button type="submit" className="font-mono text-[10px] uppercase tracking-wide px-3 py-1 border border-ink text-ink hover:bg-ink hover:text-paper">
          filtrele
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <Link href={linkTo({ durum: "", s: "0" })} className={filterCls(!durum)}>hepsi</Link>
        <Link href={linkTo({ durum: "aktif", s: "0" })} className={filterCls(durum === "aktif")}>aktif</Link>
        <Link href={linkTo({ durum: "kapali", s: "0" })} className={filterCls(durum === "kapali")}>kapalı</Link>
        <Link href={linkTo({ durum: "hatali", s: "0" })} className={filterCls(durum === "hatali")}>hatalı</Link>
      </div>

      <div className="overflow-x-auto border border-line">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-ink text-paper font-mono text-[10px] uppercase tracking-wide">
              <th className="text-left px-2 py-1.5 font-bold">Kaynak</th>
              <th className="text-left px-2 py-1.5 font-bold whitespace-nowrap">Bölüm</th>
              <th className="text-left px-2 py-1.5 font-bold whitespace-nowrap">Bölge</th>
              <th className="text-right px-2 py-1.5 font-bold whitespace-nowrap">Öğe</th>
              <th className="text-right px-2 py-1.5 font-bold whitespace-nowrap">Hata</th>
              <th className="text-left px-2 py-1.5 font-bold whitespace-nowrap">Son çekim</th>
              <th className="text-right px-2 py-1.5 font-bold">Durum</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line align-top">
                <td className="px-2 py-1.5 max-w-[280px]">
                  <span className="block font-bold text-ink break-words">{r.name}</span>
                  <a href={r.url} target="_blank" rel="noreferrer noopener" className="block font-mono text-[10px] text-ink-3 break-all hover:text-wire">
                    {r.url}
                  </a>
                  {r.last_status && r.last_status !== "ok" && (
                    <span className="block font-mono text-[10px] text-signal break-words mt-0.5">{r.last_status}</span>
                  )}
                </td>
                <td className="px-2 py-1.5 font-mono text-[11px] text-ink-2 whitespace-nowrap">{r.section || "—"}</td>
                <td className="px-2 py-1.5 font-mono text-[11px] text-ink-2 whitespace-nowrap">{r.region || "—"}</td>
                <td className="px-2 py-1.5 font-mono text-[11px] text-ink-2 text-right">{r.item_count}</td>
                <td className={`px-2 py-1.5 font-mono text-[11px] text-right ${r.fail_count > 0 ? "text-signal font-bold" : "text-ink-3"}`}>
                  {r.fail_count}
                </td>
                <td className="px-2 py-1.5 font-mono text-[10px] text-ink-3 whitespace-nowrap">{fmtDate(r.last_fetched_at)}</td>
                <td className="px-2 py-1.5 text-right"><SourceToggle id={r.id} active={r.active} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-2 py-6 text-center text-ink-3 font-mono text-[11px]">Kayıt yok.</td></tr>
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
