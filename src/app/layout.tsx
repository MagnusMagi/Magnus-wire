import type { Metadata } from "next";
import "./globals.css";

const TITLE = "Magnus Wire — Teknolojinin canlı tel servisi";
const DESC = "Magnus Wire — TR/EN/ET teknoloji ve bölge haberleri; canlı dispatch akışı.";

export const metadata: Metadata = {
  metadataBase: new URL("https://news.magnusmagi.com"),
  title: { default: TITLE, template: "%s — Magnus Wire" },
  description: DESC,
  applicationName: "Magnus Wire",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
