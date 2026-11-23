"use client";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { Logo } from "./enterprise/shared";
import { useApp } from "./enterprise/context";
import { projects } from "@/lib/enterprise";

// Tek giriş: BŞ Falcon Yönetim Merkezi → şirket genel bakışı. Proje seçimi içeride yapılır.
// Demo ortamında kimlik doğrulama yoktur; kullanıcı adı/şifre alanı veya sahte oturum gösterilmez.
// Proje listesi katalogdan gelir: yeni projeler burada da otomatik görünür.
export default function Login() {
  useApp(); // katalog bu tarayıcıdaki kayıtlarla eşitlenir
  const active = projects.filter((p) => p.status === "Aktif");
  return (
    <main className="login-v3">
      <section className="lv-visual">
        <div className="lv-brand">
          <Logo />
        </div>
        <div className="lv-story">
          <span className="eyebrow">BŞ FALCON GROUP · YÖNETİM MERKEZİ</span>
          <h1>
            Güçlü temeller, yüksek yapılar;
            <br />
            her projenin finansı tek merkezde.
          </h1>
          <p>
            Satış ve tahsilattan kat karşılığı paylaşımına, şantiye giderinden
            hakediş ve rapora; BŞ Falcon Group projeleri tek merkezde.
          </p>
          <ul className="lv-facts">
            <li>
              <b>2010</b>
              <span>İstanbul'da sektör deneyimi</span>
            </li>
            <li>
              <b>300+</b>
              <span>İmza atılan daire</span>
            </li>
            <li>
              <b>{active.length}</b>
              <span>Devam eden proje</span>
            </li>
          </ul>
        </div>
        <ol className="lv-projects" aria-label="Devam eden projeler">
          {active.slice(0, 4).map((p) => (
            <li key={p.id}>
              <i className={p.id === "cengilli" ? "bronze" : ""} />
              {p.name} {p.location && <small>{p.location}</small>}
            </li>
          ))}
          {active.length > 4 && <li>+{active.length - 4} proje</li>}
        </ol>
      </section>

      <section className="lv-form">
        <div className="lv-form-inner">
          <div className="product-logo">
            BŞ Falcon<span>·</span>Yönetim Merkezi
          </div>
          <h2>BŞ Falcon Yönetim Merkezi</h2>
          <p className="lv-lead">
            Şirket genel bakışıyla başlayın; projelere içeriden, çalışma
            kapsamı seçicisiyle geçin.
          </p>
          <Link href="/genel-bakis" className="lv-enter">
            Yönetim merkezine gir <ArrowRight size={18} />
          </Link>
          <dl className="lv-scope">
            <div>
              <dt>Şirket</dt>
              <dd>BŞ Falcon Group</dd>
            </div>
            <div>
              <dt>Projeler</dt>
              <dd>
                {active.length} aktif
                {projects.length > active.length
                  ? ` · ${projects.length - active.length} tamamlanan / arşiv`
                  : ""}
              </dd>
            </div>
          </dl>
          <p className="lv-disclaimer">
            <Info size={15} />
            <span>
              Bu platform, BŞ Falcon Group için örnek verilerle hazırlanmış özel bir yazılım demosudur. Kullanıcı girişi ve yetkilendirme bu sürümde yoktur;
              kişi ve firma adları örnektir; satış, tahsilat, kat karşılığı paylaşımı ve finans tutarları TEMSİLİ DEMO
              VERİSİDİR. Kayıtlar yalnızca bu tarayıcıda saklanır.
            </span>
          </p>
        </div>
        <footer>BŞ Falcon Group için hazırlanmış özel yazılım demosu · Kartal / İstanbul</footer>
      </section>
    </main>
  );
}
