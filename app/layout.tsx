import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/inter";
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
import "./security.css";
import "./byguzel.css";
export const metadata: Metadata = {
  title: "By Güzel | Yönetim Merkezi (Demo)",
  description:
    "By Güzel Construction & Real Estate için hazırlanmış proje, satış, tahsilat ve satış sonrası yönetim demosu (temsilî veri).",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
