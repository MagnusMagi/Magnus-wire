import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — MagiWire",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex items-center justify-center bg-paper text-ink font-[family-name:var(--font-mono)]">
        {children}
      </body>
    </html>
  );
}
