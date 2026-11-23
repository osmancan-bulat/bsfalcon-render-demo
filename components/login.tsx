"use client";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { Logo } from "./enterprise/shared";
import { useApp } from "./enterprise/context";
import { projects } from "@/lib/enterprise";

// Tek giriş: SANE Yönetim Merkezi → şirket genel bakışı. Proje seçimi içeride yapılır.
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
          <span className="eyebrow">SANE İNŞAAT · YÖNETİM MERKEZİ</span>
          <h1>
            Yaşam alanlarını inşa ederken,
            <br />
            her kuruşu tek merkezden yönetin.
          </h1>
          <p>
            Satıştan tahsilata, sözleşmeden barter’a, hakedişten rapora;
            İstanbul ve Bursa’daki bütün projeler tek merkezde.
          </p>
          <ul className="lv-facts">
            <li>
              <b>1981</b>
              <span>Sektör deneyiminin başlangıcı</span>
            </li>
            <li>
              <b>2013</b>
              <span>SANE İnşaat kuruluşu</span>
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
              <i className={p.id === "verdora" ? "bronze" : ""} />
              {p.name} {p.location && <small>{p.location}</small>}
            </li>
          ))}
          {active.length > 4 && <li>+{active.length - 4} proje</li>}
        </ol>
      </section>

      <section className="lv-form">
        <div className="lv-form-inner">
          <div className="product-logo">
            SANE<span>·</span>Yönetim Merkezi
          </div>
          <h2>SANE Yönetim Merkezi</h2>
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
              <dd>SANE İnşaat</dd>
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
              Demo ortamı: kullanıcı girişi ve yetkilendirme bu sürümde yoktur.
              Kişi ve firma adları kurgusal; satış adetleri, fiyatlar ve finansal tutarlar TEMSİLİDİR, SANE İnşaat’ın gerçek verisi değildir; kayıtlar
              yalnızca bu tarayıcıda saklanır. Güvenli kurumsal giriş ayrı bir
              aşamada kurulacaktır.
            </span>
          </p>
        </div>
        <footer>SANE İnşaat için hazırlanmış tanıtım demosu · İstanbul · Bursa</footer>
      </section>
    </main>
  );
}
