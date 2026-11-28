import Workspace from "@/components/workspace";
import { notFound } from "next/navigation";
const sections = [
  "genel-bakis",
  "guzel-nature",
  "guzel-life-premium",
  "city-prime",
  "finans",
  "satinalma",
  "taseronlar",
  "projeler",
  "satis-tahsilat",
  "santiye",
  "operasyon",
  "evrak",
  "arsiv",
  "hatirlatmalar",
  "daireler",
  "musteriler",
  "odemeler",
  "sozlesmeler",
  "raporlar",
  "yonetim",
  "proje",
  "butce",
  "araclar",
  "satis-sonrasi",
  "guvenlik",
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
