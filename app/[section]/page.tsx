import Workspace from "@/components/workspace";
import { notFound } from "next/navigation";
const sections = [
  "genel-bakis",
  "verdora-kozyatagi",
  "sane-time-besevler",
  "bulvar-park-2",
  "finans",
  "satinalma",
  "taseronlar",
  "projeler",
  "satis-tahsilat",
  "santiye",
  "operasyon",
  "evrak",
  "barter",
  "arsiv",
  "hatirlatmalar",
  "daireler",
  "musteriler",
  "odemeler",
  "sozlesmeler",
  "raporlar",
  "yonetim",
  "proje",
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
