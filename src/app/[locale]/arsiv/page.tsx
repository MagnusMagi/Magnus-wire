import Link from "next/link";
import type { Metadata } from "next";
import { CatNav } from "@/components/CatNav";
import { SourceLink } from "@/components/SourceLink";
import { getDispatches, type Dispatch } from "@/lib/dispatches";
import { sectionLabel, NEWS_TOPICS, REGIONS } from "@/lib/site";
import { LOCALES, t, isLocale, type Locale } from "@/lib/i18n";

export const revalidate = 3600;
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

// Filtreler URL'de tutuluyor (?bolum=, ?bolge=): bağlantı paylaşılabilir,
// geri tuşu çalışır ve sayfa sunucuda süzülür — istemci tarafı state yok.
const ARCHIVE_LIMIT = 400;

const chipCls = (on: boolean) =>
  `flex-none font-mono text-[11px] uppercase tracking-wide px-2.5 py-1 border transition-colors ${
    on ? "bg-ink text-paper border-ink" : "border-line text-ink-2 hover:border-wire hover:text-wire"
  }`;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  return { title: t(locale, "archiveTitle") };
}

export default async function ArchivePage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ bolum?: string; bolge?: string }>;
}) {
  const { locale: raw } = await params;
  const { bolum, bolge } = await searchParams;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;

  // ⚠️ Eski sürüm 120'de kesiyordu ve arşivde 357 tel vardı — yani "arşiv"
  // aslında son birkaç günü gösteriyordu. Budama zaten toplamı sınırlıyor
  // (bkz INGEST_KEEP), burada ayrıca kısmanın anlamı yok.
  const all = await getDispatches(locale, ARCHIVE_LIMIT);
  const secOk = bolum && NEWS_TOPICS.some((x) => x.slug === bolum) ? bolum : null;
  const regOk = bolge && REGIONS.some((x) => x.slug === bolge) ? bolge : null;
  const list = all.filter((d) => (!secOk || d.section === secOk) && (!regOk || d.region === regOk));
  const href = (patch: { bolum?: string | null; bolge?: string | null }) => {
    const q = new URLSearchParams();
    const b = patch.bolum === undefined ? secOk : patch.bolum;
    const r = patch.bolge === undefined ? regOk : patch.bolge;
    if (b) q.set("bolum", b);
    if (r) q.set("bolge", r);
    const qs = q.toString();
    return `/${locale}/arsiv${qs ? `?${qs}` : ""}`;
  };

  // Tarihe göre grupla (akış zaten en yeni → eski sıralı)
  const groups: { date: string; items: Dispatch[] }[] = [];
  for (const d of list) {
    const g = groups.find((x) => x.date === d.date);
    if (g) g.items.push(d);
    else groups.push({ date: d.date, items: [d] });
  }

  return (
    <>
      <CatNav locale={locale} active="arsiv" />
      {/* ⚠️ `w-full min-w-0` ŞART. body `flex flex-col`, yani <main> bir flex
          öğesi ve flex öğelerinin varsayılan `min-width: auto` değeri onların
          içeriklerinden KÜÇÜLMESİNİ engelliyor: filtre şeridi genişleyince
          main de esniyor, sayfanın TAMAMI viewport'tan taşıyordu (320px'de
          belge 872px çıktı). Kaydırıcıya `min-w-0` vermek yetmiyor, çünkü
          ata zinciri içerik-boyutlu kaldıkça kaydırıcı da kesin bir genişlik
          alamıyor. */}
      <main className="mx-auto w-full min-w-0 max-w-[920px] px-6 pt-9 pb-20">
        <header className="border-b-2 border-ink pb-4 mb-1">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-signal">{t(locale, "feed")}</span>
          <h1 className="font-serif font-black tracking-tight text-[clamp(34px,2rem+2vw,56px)] leading-[0.95] mt-1">{t(locale, "archiveTitle")}</h1>
          <p className="font-mono text-[12.5px] text-ink-3 mt-2.5">{list.length} {t(locale, "archiveSub")}</p>
        </header>

        {/* Filtre çubuğu. Yatay kaydırılabilir: 16 bölüm + 9 bölge mobilde
            sığmıyor ve sarmalamak başlığı ekrandan itiyordu. Kaydırıcının İÇİ
            responsive testinde taşma sayılmaz (bkz e2e/responsive.spec.ts). */}
        <div className="mt-5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-3 shrink-0 w-[52px]">
              {t(locale, "sectionWord")}
            </span>
            {/* ⚠️ `min-w-0 flex-1` ŞART: flex çocuğunun varsayılan min-width'i
                `auto`, yani içeriğinin tam genişliğini talep ediyor ve
                `overflow-x-auto` hiç devreye girmeden satırı dışarı itiyor.
                E2E bu taşmayı 320/375/414'te yakaladı. */}
            <div className="min-w-0 flex-1 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Link href={href({ bolum: null })} className={chipCls(!secOk)}>{t(locale, "filterAll")}</Link>
              {NEWS_TOPICS.map((x) => (
                <Link key={x.slug} href={href({ bolum: x.slug })} className={chipCls(secOk === x.slug)}>{x.label[locale]}</Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-3 shrink-0 w-[52px]">
              {t(locale, "regionWord")}
            </span>
            {/* ⚠️ `min-w-0 flex-1` ŞART: flex çocuğunun varsayılan min-width'i
                `auto`, yani içeriğinin tam genişliğini talep ediyor ve
                `overflow-x-auto` hiç devreye girmeden satırı dışarı itiyor.
                E2E bu taşmayı 320/375/414'te yakaladı. */}
            <div className="min-w-0 flex-1 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Link href={href({ bolge: null })} className={chipCls(!regOk)}>{t(locale, "filterAll")}</Link>
              {REGIONS.map((x) => (
                <Link key={x.slug} href={href({ bolge: x.slug })} className={chipCls(regOk === x.slug)}>{x.label[locale]}</Link>
              ))}
            </div>
          </div>
          {(secOk || regOk) && (
            <Link href={`/${locale}/arsiv`} className="self-start font-mono text-[11px] text-wire hover:text-ink underline-offset-2 hover:underline mt-0.5">
              {t(locale, "filterClear")}
            </Link>
          )}
        </div>

        {list.length === 0 ? (
          <p className="font-mono text-ink-2 py-16">{t(locale, "emptyFeed")}</p>
        ) : (
          <div className="mt-8 flex flex-col gap-9">
            {groups.map((g) => (
              <section key={g.date}>
                <h2 className="font-mono text-[12px] font-bold uppercase tracking-widest text-ink-2 py-1.5 border-b border-line mb-1">
                  <span className="text-wire mr-2">▸</span>{g.date}
                </h2>
                <ul className="m-0 p-0 list-none">
                  {g.items.map((d) => (
                    <li key={d.slug} className="flex items-baseline gap-3 sm:gap-5 py-3 border-b border-line/70">
                      <span className="font-mono text-[12px] text-ink-3 shrink-0 w-[42px] tabular-nums pt-[3px]">{d.time.slice(0, 5)}</span>
                      <span className="hidden sm:block font-mono text-[10px] font-bold uppercase tracking-widest text-wire shrink-0 w-[84px] truncate pt-[5px]">{sectionLabel(d.section, locale)}</span>
                      <div className="min-w-0 flex-1">
                        {/* break-words: kırılamayan uzun token (paket adı, URL) sütunu taşırır
                            — aynı hata Rail ve Dispatch'te de yaşandı. */}
                        <h3 className="font-serif text-[18px] sm:text-[20px] leading-snug font-semibold tracking-tight m-0 break-words">
                          <Link href={`/${locale}/dispatch/${d.slug}`} className="hover:text-signal transition-colors">{d.title}</Link>
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                          <span className="sm:hidden font-mono text-[10px] font-bold uppercase tracking-widest text-wire">{sectionLabel(d.section, locale)}</span>
                          <SourceLink url={d.sourceUrl} name={d.sourceName} locale={locale} compact />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
