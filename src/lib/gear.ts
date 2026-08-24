import type { Locale } from "./i18n";

/**
 * "Senin ekipmanın" şeridi — fotoğraf bölümünün içinden Magnus'un GERÇEKTEN
 * sahip olduğu gövde, lens ve aksesuarlara değen haberleri ayırır.
 *
 * Neden ayrı bir şerit ve neden bölümün tamamı değil: 2026-08-24'te ölçüldü —
 * aday 14 beslemenin 7 günlük penceresinde 208 öğe vardı ama bunların yalnız
 * 5'i a6700/E-mount ile ilgiliydi. Yani "sadece senin ekipmanın" filtresi
 * haftada 1-5 haberlik boş bir sayfa üretirdi. Bölüm geniş akar, şerit
 * kişiselleştirir.
 *
 * ⚠️ Yalnız BAŞLIK ve SPOT'a bakılır, gövdeye bakılmaz. Savaş etiketlemesinde
 * öğrenilen ders: gövdeye gömülü tek anma konuyu belirlemez — bir telefon
 * incelemesi "a6700 kadar iyi değil" diye geçerken ekipman haberi olmaz.
 * Konu gerçekten oysa başlıkta ya da spotta görünür.
 */
export interface GearItem {
  /** Şeritte rozet olarak basılır. */
  key: string;
  label: string;
  /** ⚠️ Desenler AKSANSIZ ve küçük harf yazılır — `normalize()` metni öyle verir. */
  pattern: RegExp;
}

/**
 * Magnus'un çantası. Sıra önemli: daha spesifik olan önce gelir, çünkü
 * `matchGear` İLK eşleşmeyi döndürür — "sigma 18-50" ile "sigma" ikisi de
 * eşleşiyorsa rozet lensin adını taşımalı, markanınkini değil.
 *
 * Gövde/lens satırları [[magnusphotography-deploy]]'daki gerçek donanım
 * listesinden geliyor; sistem satırları (E-mount, APS-C) kasıtlı olarak DAHİL:
 * kullanıcının isteği "a6700 VE aksesuarları VE lensleri" idi, ve yeni bir
 * E-mount lens duyurusu tam olarak budur.
 */
export const GEAR: GearItem[] = [
  // ── gövdeler ──
  // ⚠️ İKİ ayrı tuzak, ikisi de testte yakalandı:
  //  1. Sony ürünü markasında YUNAN alfa'sıyla yazıyor (α6700); NFD bunu latin
  //     `a`ya çevirmez, iki biçim de aranmalı.
  //  2. `α` ASCII kelime karakteri DEĞİL, dolayısıyla boşluk ile `α` arasında
  //     `\b` YOKTUR — `/\bα6700/` hiçbir zaman eşleşmez. Alfa alternatifi bu
  //     yüzden baştaki sınır olmadan yazılır.
  { key: "a6700", label: "α6700", pattern: /\ba6700\b|α6700\b|\balpha 6700\b|\bilce-6700\b/ },
  { key: "x-m5", label: "X-M5", pattern: /\bx-?m5\b/ },
  // ── lensler ──
  // ⚠️ Odak uzunluğundan sonra `\b` KOYMA: "18-50mm"de `0` ile `m` arasında
  //    kelime sınırı yoktur, desen sessizce hiç eşleşmez. Bunun yerine rakam
  //    devamını engelle (`(?!\d)`) ki "18-500" yakalanmasın.
  { key: "sigma-18-50", label: "Sigma 18-50", pattern: /\bsigma[^.]{0,24}18-50(?!\d)/ },
  { key: "sigma-30", label: "Sigma 30mm", pattern: /\bsigma[^.]{0,24}\b30\s?mm(?!\d)|\bsigma[^.]{0,24}30 ?f1\.4\b/ },
  { key: "sony-70-200", label: "FE 70-200 GM", pattern: /\b70-200(?!\d)(\s?mm)?[^.]{0,24}\bgm\b|\bfe 70-200(?!\d)/ },
  { key: "sony-16-50", label: "E PZ 16-50", pattern: /\b(e ?pz )?16-50\s?mm(?!\d)/ },
  { key: "xf-18-55", label: "XF 18-55", pattern: /\bxf ?18-55(?!\d)/ },
  // ── sistem: yeni bir E-mount lensi ya da APS-C gövdesi doğrudan seni ilgilendirir ──
  { key: "e-mount", label: "E-mount", pattern: /\be-?mount\b/ },
  { key: "x-mount", label: "X-mount", pattern: /\bx-?mount\b/ },
  { key: "aps-c", label: "APS-C", pattern: /\baps-?c\b/ },
  // ── aksesuar ──
  { key: "filtre", label: "Filtre", pattern: /\b(cpl|circular polari[sz]er|nd filter|polarizer)\b/ },
];

/**
 * Aksan ve Türkçe büyük-İ tuzağını temizler.
 *
 * ⚠️ `/iran/i` deseni "İran" ile EŞLEŞMEZ: büyük noktalı `İ` küçültülünce `i`
 * değil, `i` + birleşen nokta (U+0307) olur. Aynı sınıf hata savaş etiketlemesinde
 * haberlerin etiketini kaybettirmişti. NFD + birleşen işaretleri atmak `İ`→`i`
 * yapar ve ı/ş/ğ/ç/ö/ü'yü de sadeleştirir, böylece desenler aksansız yazılabilir.
 */
export function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Bir telin başlığı+spotu Magnus'un ekipmanına değiyor mu?
 * Değiyorsa hangi parçaya değdiğini döndürür (şerit rozeti onu basar).
 */
export function matchGear(title: string, summary: string): GearItem | null {
  const text = normalize(`${title} ${summary}`);
  return GEAR.find((g) => g.pattern.test(text)) ?? null;
}

/** Şerit başlığı — bölüm sayfası dışında kullanılmıyor, o yüzden burada. */
export const gearStripTitle: Record<Locale, string> = {
  tr: "Senin Ekipmanın",
  en: "Your Kit",
  et: "Sinu varustus",
};
export const gearStripNote: Record<Locale, string> = {
  tr: "α6700, X-M5 ve sahip olduğun lenslere değen haberler.",
  en: "Stories touching the α6700, X-M5 and the lenses you own.",
  et: "Lood, mis puudutavad α6700, X-M5 ja sinu objektiive.",
};
