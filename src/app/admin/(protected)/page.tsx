import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function sourceCounts() {
  const sb = supabaseAdmin();
  const [all, active, failing] = await Promise.all([
    sb.from("sources").select("*", { count: "exact", head: true }),
    sb.from("sources").select("*", { count: "exact", head: true }).eq("active", true),
    sb.from("sources").select("*", { count: "exact", head: true }).gt("fail_count", 0),
  ]);
  return { total: all.count ?? 0, active: active.count ?? 0, failing: failing.count ?? 0 };
}

export default async function AdminHomePage() {
  const { total, active, failing } = await sourceCounts();
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
      <Link
        href="/admin/kaynaklar"
        className="inline-block font-mono text-[10px] uppercase tracking-wide px-3 py-2 border border-ink text-ink hover:bg-ink hover:text-paper transition-colors"
      >
        Kaynakları yönet →
      </Link>
    </div>
  );
}
