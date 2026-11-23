"use client";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { Logo } from "./enterprise/shared";
import { useApp } from "./enterprise/context";
import { projects } from "@/lib/enterprise";
import { COMPANY } from "@/lib/company";

// Entrada única: Centro de Gestión EDIFICA → resumen ejecutivo. El proyecto se elige adentro.
// La demo no tiene autenticación: no se muestran campos de usuario/contraseña ni sesiones simuladas.
export default function Login() {
  useApp(); // sincroniza el catálogo con los registros de este navegador
  const active = projects.filter((p) => p.status === "Activo");
  return (
    <main className="login-v3">
      <section className="lv-visual">
        <div className="lv-brand">
          <Logo />
        </div>
        <div className="lv-story">
          <span className="eyebrow">EDIFICA · CENTRO DE GESTIÓN</span>
          <h1>
            Contratos, cuotas y cobranza
            <br />
            de cada proyecto, en un solo lugar.
          </h1>
          <p>
            Gestión posventa para desarrolladoras: planes de pago, cobros mensuales, saldos pendientes, facturación e
            informes financieros de {COMPANY.name}, {COMPANY.city}.
          </p>
          <ul className="lv-facts">
            <li>
              <b>{COMPANY.projects}</b>
              <span>Proyectos en desarrollo</span>
            </li>
            <li>
              <b>{COMPANY.since}</b>
              <span>Inicio de operaciones</span>
            </li>
            <li>
              <b>US$ · ₲</b>
              <span>Dólares y guaraníes</span>
            </li>
          </ul>
        </div>
        <ol className="lv-projects" aria-label="Proyectos">
          {active.slice(0, 4).map((p) => (
            <li key={p.id}>
              <i className={p.id === "alion" ? "bronze" : ""} />
              {p.name} {p.location && <small>{p.location}</small>}
            </li>
          ))}
          {active.length > 4 && <li>+{active.length - 4} proyectos</li>}
        </ol>
      </section>

      <section className="lv-form">
        <div className="lv-form-inner">
          <div className="product-logo">
            EDIFICA<span>·</span>Centro de Gestión
          </div>
          <h2>Centro de Gestión EDIFICA</h2>
          <p className="lv-lead">
            Comience por el resumen ejecutivo y cambie de proyecto con el selector de alcance.
          </p>
          <Link href="/resumen" className="lv-enter">
            Ingresar al Centro de Gestión <ArrowRight size={18} />
          </Link>
          <dl className="lv-scope">
            <div>
              <dt>Empresa</dt>
              <dd>EDIFICA Desarrollos Inmobiliarios</dd>
            </div>
            <div>
              <dt>Proyectos</dt>
              <dd>{projects.map((p) => p.name).join(" · ")}</dd>
            </div>
          </dl>
          <p className="lv-disclaimer">
            <Info size={15} />
            <span>
              Demostración de software preparada para EDIFICA con <b>datos de demostración</b>. No hay inicio de sesión ni
              permisos de usuario en esta versión. Clientes, precios, contratos, cobros y facturas son ejemplos; los
              registros se guardan solo en este navegador. No reemplaza al CRM de ventas: se enfoca en la gestión posterior a la venta.
            </span>
          </p>
        </div>
        <footer>Demostración preparada para EDIFICA · Ciudad del Este, Paraguay</footer>
      </section>
    </main>
  );
}
