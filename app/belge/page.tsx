import type { Metadata } from "next";
import { Provider } from "@/components/enterprise/context";
import PrintDocument from "@/components/enterprise/print-document";

export const metadata: Metadata = {
  title: "SANE İnşaat | Belge önizleme",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Provider>
      <PrintDocument />
    </Provider>
  );
}
