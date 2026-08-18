// Çatışma tanımları ve ETİKET GÜVENLİĞİ.
//
// Anahtarlar src/lib/site.ts CONFLICTS ile BİREBİR aynı olmalı — sayfa
// rotaları o slug'lardan üretiliyor.
export const CONFLICTS = {
  "rusya-ukrayna": "Rusya'nın Ukrayna'ya karşı savaşı: cephe, saldırılar, barış görüşmeleri, yaptırımlar, askerî/insani yardım, savaşın doğrudan siyasi ve ekonomik sonuçları.",
  "usa-iran": "ABD ile İran arasındaki askerî/siyasi çatışma: doğrudan saldırılar, nükleer program müzakereleri, yaptırımlar, vekil güçler üzerinden çatışmalar, tehdit ve misilleme açıklamaları.",
};

// Çatışmanın ayırt edici tarafı. Türkçe ve İngilizce yazımlar birlikte:
// başlık çevrilmiş olsa da kaynak adı geçebiliyor.
const TERMS = {
  // Desenler NORMALİZE metne uygulanır (bkz norm) → aksansız yazmak yeterli.
  "rusya-ukrayna": /(ukrayn|ukrain|rusya|russia|russian|putin|zelensk|kremlin|moskova|moscow|kiev|kyiv|donetsk|luhansk|herson|kherson|zaporij|zaporizh|kirim|crimea)/,
  "usa-iran": /(iran|tahran|tehran|hurmuz|hormuz|devrim muhafiz|revolutionary guard|ayetullah|hamaney|khamenei)/,
};

/**
 * Etiket YALNIZ başlık veya spotta ülke/taraf geçiyorsa geçerli.
 *
 * ⚠️ Gövdeye BAKILMAZ, bilerek. Ölçülen vaka (2026-08-19): "Küçük işletmeler
 * işe alımları azaltırken iş ilanları beş yılın en düşük seviyesinde" başlıklı
 * İNGİLTERE İŞGÜCÜ haberi `usa-iran` etiketi almıştı, çünkü gövdesinde tek bir
 * cümle geçiyordu — "İran savaşının başlamasıyla enerji maliyetlerinin
 * yükselmesi de şirketlerin işe alım kararlarını etkiledi". Yani ülke adı
 * gövdede GEÇİYORDU; ayırt edici olan yeri.
 *
 * Kural: çatışma haberin KONUSUYSA başlıkta ya da spotta görünür. Gövdeye
 * gömülü tek anma, savaşın uzak bir yan etkisidir ve savaş panosuna girmemeli.
 * Prompt bunu zaten söylüyordu ama model uymadı; bu yüzden kod tarafında
 * deterministik bir emniyet var.
 */
// ⚠️ TÜRKÇE İ TUZAĞI. JavaScript'te /iran/i deseni "İran" ile EŞLEŞMEZ:
// büyük noktalı `İ` küçültülünce `i` değil, `i` + birleşen nokta (U+0307)
// oluyor. Ölçüldü 2026-08-19: "Trump, İran ile görüşme olmadığını belirtti"
// başlığı emniyete takılıp etiketi kaybediyordu. NFD ile ayrıştırıp birleşen
// işaretleri atmak `İ`yi `I`ya indiriyor; ayrıca ı/ş/ğ/ç/ö/ü de sadeleşiyor,
// bu da desenleri sadeleştiriyor.
function norm(x) {
  return String(x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function conflictAllowed(conflict, { title = "", summary = "" } = {}) {
  const re = TERMS[conflict];
  if (!re) return false;
  return re.test(norm(`${title} ${summary}`));
}
