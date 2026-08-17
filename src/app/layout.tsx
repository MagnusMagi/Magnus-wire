import type { Metadata, Viewport } from "next";
import "./globals.css";

const TITLE = "MagiWire — Teknolojinin canlı tel servisi";
const DESC = "MagiWire — TR/EN/ET teknoloji ve bölge haberleri; canlı dispatch akışı.";

export const metadata: Metadata = {
  metadataBase: new URL("https://news.magnusmagi.com"),
  title: { default: TITLE, template: "%s — MagiWire" },
  description: DESC,
  applicationName: "MagiWire",
  // iOS "Ana Ekrana Ekle" için. Bunlar OLMADAN uygulama tam ekran değil,
  // tarayıcı çubuğuyla açılıyordu — manifest'teki display:"standalone" iOS'ta
  // TEK BAŞINA yeterli değil, Safari bu meta etiketlerine bakıyor.
  appleWebApp: {
    capable: true,
    title: "WIRE",
    // ⚠️ "black-translucent" DENENDİ ve GERİ ALINDI. viewport-fit=cover ile
    // birlikte düzeni durum çubuğunun altına uzatıyor; body'ye güvenli alan
    // dolgusu vermek YETMİYOR çünkü `sticky`/`fixed` öğeler body dolgusundan
    // etkilenmez, viewport'a göre konumlanır → detay sayfasındaki sticky
    // CatNav ve fixed ReadingProgress çentiğin altında kalıyordu, sayfa da
    // yukarı kaydığı için "zoomlu" görünüyordu.
    // "default" ile iOS durum çubuğu alanını ayırır, içerik altından başlar.
    statusBarStyle: "default",
  },
  // Next `capable: true` için yalnız modern `mobile-web-app-capable` basıyor.
  // iOS'un tarihsel olarak beklediği `apple-mobile-web-app-capable` eski Safari
  // sürümlerinde hâlâ tam ekran anahtarı — ikisi birden bulunsun.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // ⚠️ viewportFit:"cover" KULLANILMIYOR — statusBarStyle:"default" ile
  // iOS zaten güvenli alanı ayırıyor. "cover" düzeni çentiğin altına uzatır ve
  // sticky/fixed öğeler oraya düşer (bkz appleWebApp notu).
  // Tarayıcı/uygulama krom rengi. Next 14'ten beri metadata'da DEĞİL,
  // viewport export'unda tanımlanıyor — eskiden hiç basılmıyordu.
  themeColor: "#1a1916",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
