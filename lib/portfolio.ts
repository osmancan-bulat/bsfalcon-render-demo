// BŞ Falcon Group resmî proje portföyü (bsfalcongroup.com/projeler — 12 proje, 2 bölge).
// Yalnızca sitede yayımlanan bilgiler kullanılır: ad, tür, konum ve (varsa) daire sayısı / yıl.
// Tamamlanan projeler için yıl, sitedeki teslim yılıdır. Durumu sitede belirtilmeyen projeler
// "Durum belirtilmemiş" olarak gösterilir; bu projelere satış veya finans verisi eklenmez.
export type PortfolioItem = {
  id: string;
  name: string;
  kind: string;
  location: string;
  /** Sitede yayımlanan bilgi (daire sayısı, yıl, kat vb.). */
  facts: string;
  status: "Devam ediyor" | "Tamamlandı" | "Durum belirtilmemiş";
  image: string;
  /** Demoda operasyonel kayıtlarıyla yer alan proje kimliği (varsa). */
  demoProject?: string;
  delivered?: number;
};

export const PORTFOLIO: PortfolioItem[] = [
  { id: "agva", name: "Ağva 1111 Triplex Villa", kind: "Villa · Akıllı ev", location: "Şile · Ağva", facts: "Triplex villa · teslim Aralık 2027", status: "Devam ediyor", image: "/images/portfoy/agva-triplex.webp", demoProject: "agva" },
  { id: "cengilli", name: "Çengilli Villa Sitesi", kind: "Villa sitesi · Akıllı ev", location: "Şile · Çengilli", facts: "Müstakil triplex villalar · teslim Kasım 2027", status: "Devam ediyor", image: "/images/portfoy/cengilli-villa.webp", demoProject: "cengilli" },
  { id: "nergis", name: "Nergis Park Evleri", kind: "Konut + ticari", location: "İstanbul", facts: "Zemin + 7 kat · 35 daire + 3 dükkân", status: "Durum belirtilmemiş", image: "/images/portfoy/nergis-park.webp", demoProject: "nergis" },
  { id: "yesilvadi", name: "Yeşilvadi Evleri", kind: "Villa", location: "Şile · Yeşilvadi", facts: "Müstakil villalar", status: "Durum belirtilmemiş", image: "/images/portfoy/yesilvadi-evleri.webp" },
  { id: "sedir", name: "Sedir Evleri", kind: "Konut", location: "İstanbul", facts: "2+1 ve 3+1 daire planları", status: "Durum belirtilmemiş", image: "/images/portfoy/sedir-evleri.webp" },
  { id: "zirve", name: "Zirve İş Kulesi", kind: "Ofis", location: "İstanbul", facts: "Cam cepheli ofis kulesi", status: "Durum belirtilmemiş", image: "/images/portfoy/zirve-is.webp" },
  { id: "camlik", name: "Çamlık Apartmanı", kind: "Konut", location: "Maltepe · İdealtepe", facts: "24 daire · 2023", status: "Tamamlandı", image: "/images/portfoy/camlik-apartmani.webp", delivered: 24 },
  { id: "defne", name: "Defne Apartmanı", kind: "Konut", location: "Maltepe · İdealtepe", facts: "48 daire · 2022", status: "Tamamlandı", image: "/images/portfoy/defne-apartmani.webp", delivered: 48 },
  { id: "yildiz", name: "Yıldız Apartmanı", kind: "Konut + ticari", location: "Maltepe · Bağlarbaşı", facts: "26 daire · 2020", status: "Tamamlandı", image: "/images/portfoy/yildiz-apartmani.webp", delivered: 26 },
  { id: "girne", name: "Girne Evleri", kind: "Konut + ticari", location: "Maltepe · Girne", facts: "52 daire · 2017", status: "Tamamlandı", image: "/images/portfoy/girne-evleri.webp", delivered: 52 },
  { id: "ortulu", name: "Örtülü Apartmanı", kind: "Konut", location: "Maltepe · İdealtepe", facts: "12 daire · 2017", status: "Tamamlandı", image: "/images/portfoy/ortulu-apartmani.webp", delivered: 12 },
  { id: "tunc", name: "Tunç Apartmanı", kind: "Konut", location: "Maltepe · Altayçeşme", facts: "28 daire · 2017", status: "Tamamlandı", image: "/images/portfoy/tunc-apartmani.webp", delivered: 28 },
];

/** Kurumsal bilgiler (bsfalcongroup.com/hakkimizda). */
export const COMPANY = {
  name: "BŞ Falcon Group",
  legal: "BŞ Falcon İnşaat ve Dış Ticaret Limited Şirketi",
  since: 2010,
  founded: 2022,
  delivered: "300'ü aşkın daire",
  slogan: "Güçlü temeller, yüksek yapılar.",
  office: "Kartal / İstanbul",
};
