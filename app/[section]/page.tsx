import Workspace from "@/components/workspace";
import { notFound } from "next/navigation";
const sections = [
  "resumen",
  "lofty-city-hub",
  "alion-residence",
  "v-tower-del-lago",
  "caja",
  "satinalma",
  "taseronlar",
  "proyectos",
  "satis-tahsilat",
  "santiye",
  "operasyon",
  "evrak",
  "barter",
  "documentos",
  "agenda",
  "unidades",
  "clientes",
  "cobros",
  "contratos",
  "informes",
  "configuracion",
  "proyecto",
  "kat-karsiligi",
  "surec",
  "butce",
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
