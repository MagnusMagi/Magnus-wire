import type { Metadata } from "next";
import "./globals.css";

const TITLE = "MagiWire — Teknolojinin canlı tel servisi";
const DESC = "MagiWire — TR/EN/ET teknoloji ve bölge haberleri; canlı dispatch akışı.";

export const metadata: Metadata = {
  metadataBase: new URL("https://news.magnusmagi.com"),
  title: { default: TITLE, template: "%s — MagiWire" },
  description: DESC,
  applicationName: "MagiWire",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
