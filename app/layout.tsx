import type { Metadata } from "next";
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
export const metadata: Metadata = {
  title: "CEYCON | YAPI360 Yönetim Merkezi",
  description:
    "CEYCON İnşaat için hazırlanmış interaktif proje, satış ve operasyon yönetimi demosu.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
