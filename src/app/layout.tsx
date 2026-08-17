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
    statusBarStyle: "black-translucent",
  },
  // Next `capable: true` için yalnız modern `mobile-web-app-capable` basıyor.
  // iOS'un tarihsel olarak beklediği `apple-mobile-web-app-capable` eski Safari
  // sürümlerinde hâlâ tam ekran anahtarı — ikisi birden bulunsun.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Çentikli iPhone'larda içerik güvenli alana yaslansın; black-translucent
  // durum çubuğuyla birlikte bu olmazsa üst şerit çentiğin altında kalır.
  viewportFit: "cover",
  // Tarayıcı/uygulama krom rengi. Next 14'ten beri metadata'da DEĞİL,
  // viewport export'unda tanımlanıyor — eskiden hiç basılmıyordu.
  themeColor: "#1a1916",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
