import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/inter";
import "@fontsource/newsreader/400.css";
import "./theme.css";
import "./globals.css";
import "./enterprise.css";
import "./components.css";
import "./command-center.css";
import "./print.css";
import "./simple.css";
import "./platform.css";
import "./polish.css";
import "./falcon.css";
export const metadata: Metadata = {
  title: "BŞ Falcon Group | Yönetim Merkezi",
  description:
    "BŞ Falcon Group için hazırlanmış interaktif proje, satış ve operasyon yönetimi demosu.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
