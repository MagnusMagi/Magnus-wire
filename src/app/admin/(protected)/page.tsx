import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function sourceCounts() {
  const sql = db();
  const [r] = await sql<{ total: number; active: number; failing: number }[]>`
    select count(*) as total, count(*) filter (where active) as active, count(*) filter (where fail_count > 0) as failing
      from sources`;
  return r;
}

async function tweetCounts() {
  const sql = db();
  const [r] = await sql<{ total: number; shown: number }[]>`
    select count(*) as total, count(*) filter (where active) as shown from tweets`;
  return r;
}

export default async function AdminHomePage() {
  const [{ total, active, failing }, tweets] = await Promise.all([sourceCounts(), tweetCounts()]);
  const stat = (label: string, value: number, tone = "text-ink") => (
    <div className="border border-line px-3 py-2">
      <span className="block font-mono text-[10px] uppercase tracking-wide text-ink-3">{label}</span>
      <span className={`block text-xl font-bold ${tone}`}>{value}</span>
    </div>
  );

  return (
    <div className="text-sm text-ink-2">
      <div className="grid grid-cols-3 gap-2 mb-5">
        {stat("kaynak", total)}
        {stat("aktif", active, "text-wire")}
        {stat("hatalı", failing, failing > 0 ? "text-signal" : "text-ink")}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-5">
        {stat("x teli", tweets.total)}
        {stat("sitede", tweets.shown, "text-wire")}
        {stat("gizli", tweets.total - tweets.shown)}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/kaynaklar"
          className="inline-block font-mono text-[10px] uppercase tracking-wide px-3 py-2 border border-ink text-ink hover:bg-ink hover:text-paper transition-colors"
        >
          Kaynakları yönet →
        </Link>
        <Link
          href="/admin/x"
          className="inline-block font-mono text-[10px] uppercase tracking-wide px-3 py-2 border border-ink text-ink hover:bg-ink hover:text-paper transition-colors"
        >
          X tellerini yönet →
        </Link>
      </div>
    </div>
  );
}
