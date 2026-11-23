# EDIFICA · Centro de Gestión (demostración)

Demostración de software para EDIFICA Desarrollos Inmobiliarios (Ciudad del Este, Paraguay): gestión
posventa de departamentos y oficinas — contratos, planes de pago, cobros mensuales, cuentas por cobrar,
registro de facturación, caja e informes financieros, en español y con montos en USD (vista en ₲ con
tipo de cambio de referencia definido por el usuario).

- Next.js (App Router) con exportación estática; los registros se guardan solo en el navegador
  (`localStorage`, clave `edifica-enterprise-v1`). No hay base de datos, inicio de sesión ni permisos.
- Proyectos: Lofty City Hub, ALION Residence, V Tower del Lago y Business One. Los datos publicados y sus
  fuentes están en `lib/company.ts`; clientes, precios, contratos, cobros y facturas son datos de ejemplo.
- La facturación es un registro interno de estado: no emite facturas electrónicas ni se conecta con SIFEN.

```bash
npm ci
npm test        # regresión + escenarios EDIFICA
npm run build   # genera out/
```

Publicación: sitio estático gratuito en Render (`render.yaml`, carpeta `out`).
