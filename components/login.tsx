"use client";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { Logo } from "./enterprise/shared";
import { useApp } from "./enterprise/context";
import { projects } from "@/lib/enterprise";

// Tek giriş: CEYCON Yönetim Merkezi → şirket genel bakışı. Proje seçimi içeride yapılır.
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
          <span className="eyebrow">CEYCON İNŞAAT · YÖNETİM MERKEZİ</span>
          <h1>
            Her projenin ardında,
            <br />
            güçlü bir yönetim.
          </h1>
          <p>
            Satıştan tahsilata, sözleşmeden barter’a, hakedişten rapora;
            şirketin bütün projeleri tek merkezde.
          </p>
          <ul className="lv-facts">
            <li>
              <b>1998</b>
              <span>Kuruluş</span>
            </li>
            <li>
              <b>50+</b>
              <span>Tamamlanan proje</span>
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
              <i className={p.id === "corner" ? "bronze" : ""} />
              {p.name} {p.location && <small>{p.location}</small>}
            </li>
          ))}
          {active.length > 4 && <li>+{active.length - 4} proje</li>}
        </ol>
      </section>

      <section className="lv-form">
        <div className="lv-form-inner">
          <div className="product-logo">
            YAPI<span>360</span>
          </div>
          <h2>CEYCON Yönetim Merkezi</h2>
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
              <dd>CEYCON İnşaat</dd>
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
              Kişi ve firma adları kurgusal, tutarlar temsilidir; kayıtlar
              yalnızca bu tarayıcıda saklanır. Güvenli kurumsal giriş ayrı bir
              aşamada kurulacaktır.
            </span>
          </p>
        </div>
        <footer>CEYCON İnşaat için hazırlanmış yönetim platformu · YAPI360</footer>
      </section>
    </main>
  );
}
