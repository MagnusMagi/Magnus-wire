import Link from "next/link";
import type { Tweet } from "@/lib/tweets";
import { langName } from "@/lib/tweets";
import { t, type Locale } from "@/lib/i18n";
import { XMark } from "./XMark";
import { TweetPhotos } from "./TweetPhotos";

// ⚠️ Görseller KENDİ vekilimizden geçiyor (/api/x/img). Doğrudan pbs.twimg.com
// çekmek her ziyaretçinin IP'sini X'e sızdırırdı; site zaten bilinçli olarak
// hiçbir 3. parti isteği yapmıyor (gömme widget'ı da bu yüzden kullanılmadı).
const proxy = (u: string) => `/api/x/img?u=${encodeURIComponent(u)}`;

function localeTag(l: Locale): string {
  return l === "tr" ? "tr-TR" : l === "et" ? "et-EE" : "en-GB";
}

function ago(ms: number, l: Locale): string {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return t(l, "agoNow");
  if (m < 60) return `${m} ${t(l, "agoMin")}`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ${t(l, "agoHour")}`;
  return `${Math.round(h / 24)} ${t(l, "agoDay")}`;
}

const compact = (n: number, l: Locale): string => {
  try {
    return new Intl.NumberFormat(localeTag(l), { notation: "compact", maximumFractionDigits: 1 }).format(n);
  } catch {
    return String(n);
  }
};

/**
 * Tek tel kartı.
 *
 * `share` = bu tweet'in etkileşiminin, listedeki en yükseğe oranı (0-1).
 * Kartın altındaki sinyal çubuğunun genişliği bu — sayıyı okumadan sıralamanın
 * neye dayandığı görülebilsin diye. Veri görselleştirme burada süs değil,
 * sıralamanın gerekçesi.
 */
export function TweetCard({
  tweet,
  rank,
  share,
  locale,
}: {
  tweet: Tweet;
  rank: number;
  share: number;
  locale: Locale;
}) {
  const url = `https://x.com/${tweet.screenName}/status/${tweet.id}`;
  const posted = new Date(tweet.postedAt);

  return (
    <article className="group relative border-b border-line py-5 first:pt-0">
      <div className="flex gap-3 sm:gap-4">
        {/* Sıra numarası — editoryal marj. Fraunces ağırlığı, sayfanın "sıralama"
            iddiasını tipografiyle kuruyor. */}
        <span
          aria-hidden
          className="hidden sm:block flex-none w-9 pt-0.5 font-serif font-black tabular-nums leading-none text-[26px] text-line group-hover:text-signal transition-colors"
        >
          {String(rank).padStart(2, "0")}
        </span>

        <div className="min-w-0 flex-1">
          {/* Yazar satırı */}
          <div className="flex items-center gap-2 flex-wrap">
            {tweet.avatar && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={proxy(tweet.avatar)}
                alt=""
                width={28}
                height={28}
                loading="lazy"
                decoding="async"
                className="flex-none w-7 h-7 rounded-full border border-line bg-panel"
              />
            )}
            <span className="font-bold text-[13.5px] text-ink truncate max-w-[45vw] sm:max-w-none">
              {tweet.authorName}
            </span>
            {tweet.verified && (
              <span aria-label="doğrulanmış" title="doğrulanmış" className="flex-none text-wire">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden>
                  <path d="M12 1.5 14.4 4l3.4-.5.9 3.3 3 1.6-1.4 3.1 1.4 3.1-3 1.6-.9 3.3-3.4-.5L12 22.5 9.6 20l-3.4.5-.9-3.3-3-1.6L3.7 12.5 2.3 9.4l3-1.6.9-3.3 3.4.5zm-1.3 13.9 5.6-5.6-1.4-1.4-4.2 4.2-2-2-1.4 1.4z" />
                </svg>
              </span>
            )}
            <a
              href={`https://x.com/${tweet.screenName}`}
              target="_blank"
              rel="noreferrer noopener"
              className="font-mono text-[11.5px] text-ink-3 hover:text-wire truncate"
            >
              @{tweet.screenName}
            </a>
            <span aria-hidden className="text-line">·</span>
            <time
              dateTime={posted.toISOString()}
              title={posted.toLocaleString(localeTag(locale))}
              className="font-mono text-[11.5px] text-ink-3 whitespace-nowrap"
            >
              {ago(tweet.postedAt, locale)}
            </time>
            <span className="ml-auto flex-none font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-px border border-line text-ink-3">
              {langName(tweet.lang, locale)}
            </span>
          </div>

          {/* Gövde. ⚠️ Uzun gönderilerde X'in kendisi metni ~280 karakterde
              kesiyor ve tam metni HİÇBİR ücretsiz uçtan vermiyor (syndication
              da oEmbed de aynı yerde bitiyor, resmî widget bile "Show more"
              gösteriyor). Sessizce cümlenin ortasında bitmek hata gibi
              okunuyordu; kesilme artık açıkça söylenip özgün gönderiye
              yönlendiriliyor. */}
          <p className="mt-2 text-[15px] leading-[1.5] text-ink whitespace-pre-wrap break-words">
            {tweet.text || <span className="text-ink-3 italic">—</span>}
            {tweet.truncated && <span aria-hidden className="text-ink-3">…</span>}
          </p>
          {tweet.truncated && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-[11px] text-wire hover:text-signal border-b border-dotted border-line hover:border-signal transition-colors"
            >
              <XMark className="w-3 h-3 flex-none" />
              {t(locale, "xTruncated")} →
            </a>
          )}

          {/* Medya — tıklanınca tam ekran açılır (TweetPhotos istemci parçası) */}
          <TweetPhotos photos={tweet.photos} locale={locale} alt={`${tweet.authorName} — görsel`} />

          {/* Metrik + sinyal çubuğu */}
          <div className="mt-3 flex items-center gap-4 font-mono text-[11.5px] text-ink-3">
            <span className="tabular-nums" title={t(locale, "xLikes")}>
              ♥ {compact(tweet.likes, locale)}
            </span>
            <span className="tabular-nums" title={t(locale, "xReplies")}>
              ↩ {compact(tweet.replies, locale)}
            </span>
            {/* Sinyal çubuğu: bu telin etkileşiminin listedeki zirveye oranı.
                İz gerçek yüksekliğinde tutuluyor ki dolgu kırpılmasın. */}
            <span aria-hidden className="flex-1 h-[3px] bg-line relative overflow-hidden">
              <span
                className="absolute inset-y-0 left-0 bg-signal"
                style={{ width: `${Math.min(100, Math.max(2, Math.round(share * 100)))}%` }}
              />
            </span>
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="flex-none inline-flex items-center gap-1 text-ink-3 hover:text-ink transition-colors"
              aria-label={t(locale, "xOpenOnX")}
            >
              <XMark />
              <span className="uppercase tracking-wider text-[10px] font-bold">{t(locale, "xOpen")}</span>
            </a>
          </div>

          {/* Kaynak izi — bu tweet havuza NASIL girdi. Sayfayı sitenin kendi
              haber grafiğine bağlayan satır; X panosunu bağımsız bir widget
              olmaktan çıkarıp yayının parçası yapıyor. */}
          {tweet.dispatchSlug && (
            <p className="mt-1.5 font-mono text-[10.5px] text-ink-3">
              {t(locale, "xQuotedIn")}{" "}
              <Link href={`/${locale}/dispatch/${tweet.dispatchSlug}`} className="text-wire hover:text-signal">
                {tweet.sourceName || t(locale, "dispatchWord")}
              </Link>
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
