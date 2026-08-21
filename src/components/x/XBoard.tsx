"use client";
import { useEffect, useMemo, useState } from "react";
import type { Tweet, SortKey } from "@/lib/tweets";
import { sortTweets, langCounts, langName } from "@/lib/tweets";
import { t, type Locale } from "@/lib/i18n";
import { TweetCard } from "./TweetCard";

const ALL = "all";

/**
 * X telleri panosu — dil filtresi + sıralama.
 *
 * Filtre SUNUCUDA değil istemcide: havuz penceresi küçük (≤200 tweet, ISR ile
 * önbelleklenmiş tek yükleme) ve dil değiştirmek ağ turu beklemeden anında
 * olmalı. Sunucu tarafı filtre her sekme için ayrı bir dinamik istek demekti.
 */
const POLL_MS = 90_000;
// Bu eşiğin ALTINDA kullanıcı listenin başında sayılır ve yeni teller sessizce
// yerleşir. Aşağıdayken araya satır sokmak okuduğu yeri kaydırırdı — o yüzden
// bekletilip düğmeyle uygulanıyor.
const TOP_THRESHOLD_PX = 200;

export function XBoard({ tweets: initial, locale }: { tweets: Tweet[]; locale: Locale }) {
  const [lang, setLang] = useState<string>(ALL);
  // ⚠️ Varsayılan YENİ. Popüler sıralamada sönüm katsayısı yüzünden yeni ama
  // az etkileşimli bir tel listenin çok altına düşüyor: 24 dakikalık 5
  // beğenili telin skoru ~1,6 iken 8 saatlik 3.000 beğenili telinki ~136.
  // Sonuç, akış çalıştığı halde sayfanın "güncellenmiyor" görünmesiydi.
  // Popüler bir tık uzakta duruyor.
  const [sort, setSort] = useState<SortKey>("recent");
  // ⚠️ Onaylı filtresi bir SIRALAMA ayarı değil, kapsam ayarı: havuzun %80'i
  // zaten onaylı olduğu için "onaylıyı üste al" gibi bir puanlama anlamsız
  // olurdu; ayırt edici olan onaysızları TAMAMEN dışarıda bırakabilmek.
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [tweets, setTweets] = useState<Tweet[]>(initial);
  // Kullanıcı listede aşağıdayken gelen yeni teller burada bekler.
  const [pending, setPending] = useState<Tweet[] | null>(null);
  const [asOf, setAsOf] = useState<number | null>(null);

  // Sunucu yeni bir ISR sürümü ürettiyse (cron revalidate ediyor) prop değişir.
  useEffect(() => setTweets(initial), [initial]);

  // Canlı yoklama: açık sekme yenilenmeden yeni telleri ve güncel beğeni
  // sayılarını alsın. Havuz cron'la 10 dakikada bir değişiyor; 90 sn yoklama
  // gecikmeyi fark edilmez kılıyor, ucun önbelleği de yükü tutuyor.
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      if (document.hidden) return; // arka plan sekmesi boşuna sorgulamasın
      try {
        const r = await fetch("/api/x", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (!alive || !Array.isArray(j?.tweets)) return;
        setAsOf(j.asOf ?? Date.now());
        setTweets((prev) => {
          const seen = new Set(prev.map((x) => x.id));
          const incoming: Tweet[] = j.tweets;
          const hasNew = incoming.some((x) => !seen.has(x.id));
          // Yeni tel yoksa değişiklik yalnız metriklerdedir → sessizce uygula.
          if (!hasNew || window.scrollY < TOP_THRESHOLD_PX) return incoming;
          setPending(incoming);
          return prev;
        });
      } catch {
        /* geçici ağ hatası: bir sonraki turda yeniden denenir */
      }
    };
    const id = setInterval(pull, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const applyPending = () => {
    if (!pending) return;
    setTweets(pending);
    setPending(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pendingCount = useMemo(() => {
    if (!pending) return 0;
    const seen = new Set(tweets.map((x) => x.id));
    return pending.filter((x) => !seen.has(x.id)).length;
  }, [pending, tweets]);

  // ⚠️ Onaylı elemesi dil çetelesinden ÖNCE uygulanır. Sonra uygulansaydı
  // çetele "Türkçe 15" derken tıklayınca 14 kart çıkardı — sayaç, tıklandığında
  // görülecek sayıyı göstermeli.
  const scoped = useMemo(
    () => (onlyVerified ? tweets.filter((x) => x.verified) : tweets),
    [tweets, onlyVerified],
  );
  const counts = useMemo(() => langCounts(scoped), [scoped]);
  const verifiedCount = useMemo(() => tweets.filter((x) => x.verified).length, [tweets]);

  // Durumu URL'de tut: filtrelenmiş görünüm paylaşılabilir/yer imlenebilir olsun.
  // ⚠️ İlk render sunucuyla AYNI olmalı (hidrasyon), o yüzden URL okuması
  // effect'te — state'i doğrudan window'dan ilklemek uyuşmazlık üretirdi.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const l = p.get("dil");
    const s = p.get("sirala");
    if (l && (l === ALL || counts.some((c) => c.code === l))) setLang(l);
    if (s === "populer") setSort("popular");
    if (p.get("onayli") === "1") setOnlyVerified(true);
    // counts yalnız veri değişince değişir; ilk mount'ta çalışması yeterli.
  }, [counts]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (lang === ALL) p.delete("dil");
    else p.set("dil", lang);
    if (sort === "recent") p.delete("sirala");
    else p.set("sirala", "populer");
    if (onlyVerified) p.set("onayli", "1");
    else p.delete("onayli");
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [lang, sort, onlyVerified]);

  const list = useMemo(() => {
    const filtered = lang === ALL ? scoped : scoped.filter((x) => x.lang === lang);
    return sortTweets(filtered, sort);
  }, [scoped, lang, sort]);

  // Sinyal çubuğunun ölçeği: GÖRÜNEN listenin en yükseği. Havuzun geneline
  // göre ölçeklemek, tek bir viral tweet yüzünden diğer tüm çubukları
  // görünmez kılardı.
  const peak = useMemo(() => Math.max(1, ...list.map((x) => x.likes + 3 * x.replies)), [list]);
  const maxCount = Math.max(1, ...counts.map((c) => c.count));

  // ⚠️ Tek dil varsa çetele GİZLENİR: "Tümü / Türkçe" diye iki satırlık bir
  // filtre kullanıcıya seçenek değil gürültü sunar ve sütun genişliğini boşuna
  // yer. Kod genel kalıyor — ikinci dil geri açılırsa ray kendiliğinden döner.
  const showRail = counts.length > 1;

  const tabCls = (on: boolean) =>
    `font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-1 border transition-colors ${
      on ? "border-signal text-signal" : "border-line text-ink-3 hover:border-ink hover:text-ink"
    }`;

  // Dil satırı: kod + ad + adet + minik oran çubuğu. Filtre listesi aynı anda
  // havuzun dil dağılımını gösteren bir çetele — ayrı bir grafik gerekmiyor.
  // ⚠️ `share` AYRI parametre: "Tümü" satırının adedi (havuzun tamamı) dil
  // başına en yüksek adede bölününce oran 1'i aşıyordu — ölçüldü, çubuk %160
  // genişlikle sütunun dışına taşıyordu. Toplam satırı tanım gereği doludur.
  const langRow = (code: string, label: string, count: number, share: number) => {
    const on = lang === code;
    return (
      <li key={code}>
        <button
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={on}
          // ⚠️ Odak halkası İÇERİ çiziliyor (negatif offset). Global kural
          // `outline: 2px solid; outline-offset: 2px` halkayı DIŞARI koyuyor;
          // bu buton sütunun tam genişliği (212px) olduğu için halka sağa ve
          // sola 4'er px taşıyor, "DİL" başlığının 212px'lik alt çizgisiyle
          // hizasız görünüyordu. Tam-genişlik butonlarda halka içeride durmalı.
          className={`w-full text-left px-2 py-1.5 border-l-2 transition-colors focus-visible:[outline-offset:-2px] ${
            on ? "border-signal bg-panel" : "border-transparent hover:bg-panel/60"
          }`}
        >
          <span className="flex items-baseline gap-2">
            <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${on ? "text-signal" : "text-ink-3"}`}>
              {code === ALL ? "◼" : code}
            </span>
            <span className={`text-[12.5px] truncate ${on ? "text-ink font-bold" : "text-ink-2"}`}>{label}</span>
            <span className="ml-auto font-mono text-[11px] tabular-nums text-ink-3">{count}</span>
          </span>
          {/* ⚠️ İz GERÇEK yüksekliğinde (3px). Önce 1px iz + negatif top'lu dolgu
              vardı; taşmayı önlemek için overflow-hidden eklenince dolgunun
              2px'i kırpılıyordu. Yükseklik izin kendisinde olunca ikisi de çözülür. */}
          <span aria-hidden className="mt-1 block h-[3px] bg-line relative overflow-hidden">
            <span
              className={`absolute inset-y-0 left-0 ${on ? "bg-signal" : "bg-wire/45"}`}
              style={{ width: `${Math.min(100, Math.max(3, Math.round(share * 100)))}%` }}
            />
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className={`grid grid-cols-1 gap-6 lg:gap-9 ${showRail ? "lg:grid-cols-[212px_minmax(0,1fr)]" : ""}`}>
      {/* Dil çetelesi. Masaüstünde yapışkan sütun, mobilde yatay şerit. */}
      {/* aria-label: sayfada birden çok aside var (yan ray da öyle); ekran
          okuyucu ve testler için bu bölgenin ne olduğu adlandırılıyor. */}
      {showRail && (
      <aside aria-label={t(locale, "xLangFilter")} className="lg:sticky lg:top-[104px] self-start min-w-0">
        <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-wire border-b border-line pb-1.5 mb-1">
          {t(locale, "xLangFilter")}
        </h2>
        <ul className="hidden lg:block m-0 p-0 list-none">
          {langRow(ALL, t(locale, "filterAll"), scoped.length, 1)}
          {counts.map((c) => langRow(c.code, langName(c.code, locale), c.count, c.count / maxCount))}
        </ul>
        {/* Mobil: aynı veri, yatay çip şeridi.
            ⚠️ `overflow-x:auto` diğer ekseni de `auto` yapıyor ve odak halkasını
            KIRPIYOR (ölçüldü: overflow `auto/auto`) — yani mobilde klavye odağı
            kısmen görünmez oluyordu (WCAG 2.4.7). Kaba içeriden pay verilip
            negatif kenar boşluğuyla hiza korunuyor: halka payın içinde kalır. */}
        <ul className="lg:hidden flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden m-0 list-none p-1 -mx-1 mt-1">
          {[{ code: ALL, count: scoped.length }, ...counts].map((c) => (
            <li key={c.code} className="flex-none">
              <button type="button" onClick={() => setLang(c.code)} aria-pressed={lang === c.code} className={tabCls(lang === c.code)}>
                {c.code === ALL ? t(locale, "filterAll") : langName(c.code, locale)} <span className="tabular-nums opacity-70">{c.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      )}

      <div className="min-w-0">
        {/* Yeni tel bildirimi: listeyi kullanıcının altından çekmeden haber verir. */}
        {pendingCount > 0 && (
          <button
            type="button"
            onClick={applyPending}
            // Tam genişlik buton → odak halkası içeride (çetele satırıyla aynı gerekçe).
            className="w-full mb-3 py-2 border border-signal text-signal font-mono text-[11px] font-bold uppercase tracking-wider hover:bg-signal hover:text-paper transition-colors focus-visible:[outline-offset:-2px]"
          >
            ↑ {pendingCount} {t(locale, "xNew")}
          </button>
        )}

        <div className="flex items-center justify-between gap-3 border-b border-line pb-2 mb-4">
          <span className="font-mono text-[11px] text-ink-3 tabular-nums flex items-center gap-2">
            {asOf !== null && (
              <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full bg-signal wire-pulse" title={t(locale, "live")} />
            )}
            {list.length} {t(locale, "xCount")}
            {showRail && lang !== ALL && <span className="text-ink-2"> · {langName(lang, locale)}</span>}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setOnlyVerified((v) => !v)}
              aria-pressed={onlyVerified}
              title={`${verifiedCount} / ${tweets.length}`}
              className={tabCls(onlyVerified)}
            >
              ✓ {t(locale, "xVerifiedOnly")}
            </button>
            <span aria-hidden className="w-px bg-line mx-0.5" />
            <button type="button" onClick={() => setSort("popular")} aria-pressed={sort === "popular"} className={tabCls(sort === "popular")}>
              {t(locale, "xSortPopular")}
            </button>
            <button type="button" onClick={() => setSort("recent")} aria-pressed={sort === "recent"} className={tabCls(sort === "recent")}>
              {t(locale, "xSortRecent")}
            </button>
          </div>
        </div>

        {list.length === 0 ? (
          <p className="font-mono text-ink-3 py-10 text-[13px]">
            {tweets.length === 0
              ? t(locale, "xEmpty")
              : onlyVerified
                ? t(locale, "xEmptyVerified")
                : t(locale, "xEmptyLang")}
          </p>
        ) : (
          // ⚠️ Genişlik ray'e bağlı: ray varken 720px'lik okuma sütunu doğru,
          // ray gizliyken o sınır sayfanın sağını boş bırakıyordu — teller
          // tam genişlik kullanır. (JSX yorumu ternary'nin İÇİNE konamaz:
          // parantezli ifade tek bir eleman bekler, iki komşu ifade sözdizimi
          // hatası verir.)
          <div className={showRail ? "max-w-[720px]" : ""}>
            {list.map((tw, i) => (
              <TweetCard
                key={tw.id}
                tweet={tw}
                rank={i + 1}
                share={(tw.likes + 3 * tw.replies) / peak}
                locale={locale}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
