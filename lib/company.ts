// EDIFICA Desarrollos Inmobiliarios — información pública verificada (consulta: 23 nov 2026).
// Solo se registran datos publicados en las fuentes indicadas. Lo que no está publicado se muestra como
// "No publicado" y, cuando la demo necesita un valor para funcionar, se marca como dato de ejemplo.

export const COMPANY = {
  name: "EDIFICA",
  tagline: "Desarrollos Inmobiliarios",
  slogan: "Levantamos la ciudad que queremos habitar.",
  city: "Ciudad del Este · Paraguay",
  since: 2024,
  projects: 4,
  focus: "Residencial y corporativo",
  web: "edifica.com.py",
};

export type Fact = [label: string, value: string];
export type ProjectProfile = {
  id: string;
  name: string;
  status: string;
  kind: string;
  hero: string;
  gallery: string[];
  /** Datos verificados en fuentes públicas. */
  facts: Fact[];
  /** Participantes tal como figuran en la fuente (sin interpretar roles no publicados). */
  partners: string;
  amenities: string[];
  sources: string[];
  /** Qué datos de la demo son de ejemplo en este proyecto. */
  sample: string;
};

export const PROFILES: Record<string, ProjectProfile> = {
  lofty: {
    id: "lofty",
    name: "Lofty City Hub",
    status: "En ejecución",
    kind: "Uso mixto · unidades amobladas, plaza comercial y centro de convenciones",
    hero: "/images/edifica/lofty-torre.jpg",
    gallery: ["/images/edifica/lofty-rooftop.jpg", "/images/edifica/lofty-paseo.jpg"],
    facts: [
      ["Ubicación", "Ciudad del Este (dirección no publicada)"],
      ["Tipologías", "ONE 23 · 23 m² · DUO 35 m² · SHARE 35 m² · SUITE 1D 40 m² · SUITE 2D 60 m² · SUITE 2D L 60 m²"],
      ["Equipamiento de unidades", "Full amoblado, cocina, baño completo, cerradura inteligente y A/A inverter"],
      ["Niveles destacados", "Amenities en el nivel 8 · centro de convenciones en la planta 15 · rooftop gastronómico en el nivel 23"],
      ["Comercial", "Plaza comercial de triple altura con seis locales"],
      ["Entrega", "No publicada"],
      ["Precios", "No publicados"],
    ],
    partners:
      "Figura en el portafolio de EDIFICA (edifica.com.py) y en el sitio de Métrika (metrika.com.py). Las fuentes consultadas no detallan el rol de cada empresa.",
    amenities: ["Recording studio", "Podcast room", "Coworking", "Study center", "Chill room", "Sala de juegos", "Livings al aire libre"],
    sources: ["edifica.com.py", "metrika.com.py/lofty-city-hub", "invertienlofty.com.py"],
    sample:
      "Cantidad de unidades no publicada: la demo carga una muestra de 48 unidades (pisos 9–14) con las tipologías publicadas. Precios, clientes, contratos y cobros son de ejemplo.",
  },
  alion: {
    id: "alion",
    name: "ALION Residence",
    status: "En ejecución · entrega octubre 2027",
    kind: "Residencial · monoambientes y 2 dormitorios",
    hero: "/images/edifica/alion-torre.jpg",
    gallery: ["/images/edifica/alion-esquina.jpg", "/images/edifica/alion-rooftop.jpg", "/images/edifica/alion-lounge.jpg"],
    facts: [
      ["Ubicación", "Boquerón I, Ciudad del Este · a dos cuadras del lago"],
      ["Altura", "14 plantas"],
      ["Tipologías", "Monoambientes de 24,92 a 32,30 m² (T1–T5) · 2 dormitorios de 72,20 m² (T6)"],
      ["Distribución", "8 unidades por piso, al frente o contrafrente (planilla pública de disponibilidad)"],
      ["Precio publicado", "Desde USD 65.955 (imacro.com.py)"],
      ["Entrega", "Octubre 2027"],
    ],
    partners: "Desarrollador: EDIFICA. Comercialización publicada en Macro Inmobiliaria (imacro.com.py).",
    amenities: ["Vistas panorámicas", "Unidades al frente y contrafrente", "Espacios comunes"],
    sources: ["edifica.com.py", "imacro.com.py/proyectos/alion-residence", "Planilla pública “Departamentos disponibles”"],
    sample:
      "La estructura de unidades (pisos 3–10) proviene de la planilla pública. Precios de lista, estados de venta, clientes, contratos y cobros de la demo son de ejemplo y no reflejan la planilla real.",
  },
  vtower: {
    id: "vtower",
    name: "V Tower del Lago",
    status: "En ejecución · entrega abril 2029",
    kind: "Residencial · tres torres frente al Lago de la República",
    hero: "/images/edifica/v-tower-aereo.jpg",
    gallery: ["/images/edifica/v-tower-rooftop.jpg", "/images/edifica/v-tower-paseo.jpg"],
    facts: [
      ["Ubicación", "Costanera del Lago de la República · entre Fortín Pirizal y Mcal. José F. Estigarribia"],
      ["Escala", "3 torres · 265 unidades"],
      ["Plan de pago publicado", "20 % de entrega · 60 % en cuotas fijas · 20 % con las llaves (abril 2029) · en dólares, sin intereses"],
      ["Cocheras y bauleras", "Cochera US$ 17.000 · doble US$ 30.000 · moto US$ 5.000 · baulera US$ 4.000"],
      ["Planta baja", "Restaurantes, cafeterías y locales"],
      ["Tipologías y superficies", "No publicadas en el texto del sitio"],
    ],
    partners: "Desarrolla Vierci Development y EDIFICA · Proyecta Path Urban · Construye Grupo AGH (vtowerdellago.com).",
    amenities: ["Piscinas infinitas en azoteas", "Golf", "Cine", "Lounges", "Amenities propios en cada torre"],
    sources: ["edifica.com.py", "vtowerdellago.com", "viercidevelopment.com/proyectos"],
    sample:
      "La demo carga una muestra de 24 unidades de ejemplo en la Torre I: tipologías, superficies, precios, clientes y cobros son de ejemplo. El plan 20/60/20 sí es el publicado.",
  },
  business: {
    id: "business",
    name: "Business One",
    status: "En desarrollo · disponibilidad próximamente",
    kind: "Corporativo · oficinas privadas, coworking y auditorio",
    hero: "/images/edifica/business-one-torre.jpg",
    gallery: ["/images/edifica/business-one-patio.jpg", "/images/edifica/business-one-terraza.jpg"],
    facts: [
      ["Ubicación", "Calle Capitán Bado, Área 01 · Ciudad del Este"],
      ["Escala", "2 torres corporativas de 7 pisos articuladas por un patio central"],
      ["Oficinas", "Desde 57 m² · Torre 01: 4 oficinas por piso (1º–6º) y 2 oficinas terraza (7º) · Torre 02: 4 por piso (1º–5º) y 2 terraza (7º)"],
      ["Servicios comunes", "Recepción por torre · coworking · salas de reunión · auditorio para 100 personas · cafetería"],
      ["Equipamiento", "Generador 100 % · fotovoltaico en áreas comunes · cerraduras electrónicas · cargadores eléctricos · seguridad 24 h"],
      ["Precios y entrega", "No publicados"],
    ],
    partners: "Un desarrollo de EDIFICA (brochure oficial).",
    amenities: ["Coworking", "Auditorio 100 personas", "Patio central con cafetería", "Salas de reunión", "Seguridad 24 h"],
    sources: ["edifica.com.py", "Brochure Business One (edifica.com.py)"],
    sample:
      "Se cargan 48 oficinas según las plantas del brochure (superficies sujetas a verificación final; el piso 6 de la Torre 02 no está detallado). Precios, reservas, contratos y cobros son de ejemplo.",
  },
};
