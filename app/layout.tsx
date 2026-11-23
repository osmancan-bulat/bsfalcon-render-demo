import type { Metadata } from "next";
import "./theme.css";
import "./globals.css";
import "./enterprise.css";
import "./components.css";
import "./command-center.css";
import "./print.css";
import "./simple.css";
import "./platform.css";
import "./polish.css";
import "./layer.css";
import "./edifica.css";
export const metadata: Metadata = {
  title: "EDIFICA | Centro de Gestión",
  description:
    "Demostración del Centro de Gestión de EDIFICA: contratos, cuotas, cobranza y facturación.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PY">
      <body>{children}</body>
    </html>
  );
}
