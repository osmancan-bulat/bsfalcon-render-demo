import Workspace from "@/components/workspace";
import { notFound } from "next/navigation";
const sections = [
  "resumen",
  "lofty-city-hub",
  "alion-residence",
  "v-tower-del-lago",
  "business-one",
  "proyectos",
  "unidades",
  "clientes",
  "contratos",
  "cobros",
  "cuentas-por-cobrar",
  "facturacion",
  "caja",
  "informes",
  "documentos",
  "agenda",
  "configuracion",
  "proyecto",
];
export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!sections.includes(section)) notFound();
  return <Workspace section={section} />;
}
