import type { Metadata } from "next";
import { Provider } from "@/components/enterprise/context";
import { AuthProvider } from "@/components/security/auth";
import DocumentGate from "@/components/security/document-gate";

export const metadata: Metadata = {
  title: "BŞ Falcon Group | Belge önizleme",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <AuthProvider>
      <Provider>
        <DocumentGate />
      </Provider>
    </AuthProvider>
  );
}
