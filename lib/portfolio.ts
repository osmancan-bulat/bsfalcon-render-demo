// By Güzel Construction & Real Estate · resmî kaynaklardan derlenen portföy (28 Kasım 2026).
// Kaynaklar: byguzel.com (Projelerimiz, Hakkımızda, proje sayfaları) ve guzelinvest.com/en/projeler.
// Yalnızca yayımlanan bilgiler kullanılır. "Projelerimiz" altında listelenen projeler ile yalnızca satış ilanı
// olarak görünen mülkler ayrılır; geliştirici rolü sayfada ayrıca belirtilmemişse bu açıkça yazılır.
export type PortfolioItem = {
  id: string;
  name: string;
  kind: string;
  location: string;
  /** Sitede yayımlanan bilgi. */
  facts: string;
  /** Yayımlanan başlangıç fiyatı (EUR). */
  price?: number;
  status: "Hazır" | "Yapım yılı 2025" | "Bilgi yok";
  image?: string;
  source: string;
  /** Demoda operasyonel kayıtlarıyla yönetilen proje kimliği (varsa). */
  demoProject?: string;
};

export const PORTFOLIO: PortfolioItem[] = [
  { id: "glp", name: "Guzel Life Premium", kind: "Konut kompleksi", location: "Oba · Alanya", facts: "5 blok · 90 daire · 2+1, 3+1, 4+1 bahçe dubleks, 5+1 dubleks penthouse · 125–230 m² · 2024", price: 215000, status: "Hazır", image: "/images/byguzel/glp-0-4.jpg", source: "byguzel.com · guzelinvest.com", demoProject: "nergis" },
  { id: "gn", name: "Guzel Nature", kind: "Konut · tek blok", location: "Alanya", facts: "Tek blok, 6 kat · ilk kat sosyal alanlar · 1+1'den · 50–180 m² · 2025", price: 105000, status: "Yapım yılı 2025", image: "/images/byguzel/gn-4-6.jpg", source: "byguzel.com", demoProject: "cengilli" },
  { id: "cp", name: "City Prime", kind: "Konut", location: "Alanya", facts: "2+1 · 65–122 m² · havuz, sauna, çocuk parkı · 2025", price: 185000, status: "Hazır", image: "/images/byguzel/cp-0-9.jpg", source: "byguzel.com", demoProject: "agva" },
  { id: "bg2000", name: "By Güzel 2000", kind: "Konut", location: "Alanya", facts: "1+1'den · 50–220 m² · açık/kapalı havuz, buhar odası · 2024", price: 115000, status: "Hazır", image: "/images/byguzel/bg2000-1-7.jpg", source: "byguzel.com" },
  { id: "medicalanya", name: "Medicalanya", kind: "Konut", location: "Alanya", facts: "1+1 · 64–104 m² · 2023", price: 280000, status: "Hazır", image: "/images/byguzel/ma-1-5.jpg", source: "byguzel.com" },
  { id: "mahall", name: "Mahall Oba", kind: "Büyük metrekareli birimler (yatak odası belirtilmemiş)", location: "Oba · Alanya", facts: "440–595 m² · 2024", price: 550000, status: "Hazır", image: "/images/byguzel/mo-1-6.jpg", source: "byguzel.com" },
  { id: "meva", name: "Meva City Alanya", kind: "Konut kompleksi", location: "Alanya", facts: "10 blok, 8 katlı · 2.000 m² açık havuz, aquapark, kapalı havuz, hamam, sinema, bowling", status: "Bilgi yok", source: "byguzel.com · Projelerimiz açıklaması (fiyat ve ilan sayfası yok)" },
];

/** byguzel.com'da yalnızca "Satılık" ilanı olarak görünen mülkler: geliştirici bilgisi yok, demoda yönetilmez. */
export const LISTINGS = ["Avsallar Jasmine Boutique Life", "Oba Portakal Sities", "Mahmutlar Heaven Hills", "Olimpcity Kargıcak"];

/** Kurumsal bilgiler (byguzel.com/hakkimizda). Rakamlar şirketin kendi beyanıdır. */
export const COMPANY = {
  name: "By Güzel",
  legal: "By Güzel Construction & Real Estate",
  since: 2001,
  construction: 2003,
  claims: "20 yılı aşkın deneyim · 30'dan fazla büyük proje · 2.500'den fazla mülk satışı (şirket beyanı)",
  office: "Alanya / Antalya",
  services: ["Yatırım danışmanlığı", "Satış ve satın alma süreci", "Oturum izni ve vatandaşlık başvurularında rehberlik", "Kiralama", "Yeniden satış", "Yenileme"],
};
