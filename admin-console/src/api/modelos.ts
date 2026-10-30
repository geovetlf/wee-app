/*
 * LO QUE LA CONSOLA ENTIENDE DE LAS RESPUESTAS.
 *
 * El servidor devuelve JSON por un callable: llega como `unknown`. Cada `leer*` lo convierte en un modelo de
 * pantalla, descartando lo que no tenga la forma esperada en vez de romper la vista. Tipos propios, a propósito:
 * `functions/src` mezcla contratos puros con `firebase-admin`, y la consola no importa nada del servidor.
 * Lo que falta se queda como `undefined`; nada se inventa ni se rellena con ceros.
 */
type Registro = Record<string, unknown>;

const esRegistro = (v: unknown): v is Registro => typeof v === 'object' && v !== null && !Array.isArray(v);
const texto = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined);
const numero = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const booleano = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined);
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const textos = (v: unknown): string[] => lista(v).filter((x): x is string => typeof x === 'string');

/** Milisegundos desde cualquier forma en que un callable serializa una fecha (número, Timestamp, ISO). */
export const fechaEnMs = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isNaN(t) ? undefined : t;
  }
  if (esRegistro(v)) {
    const s = numero(v._seconds) ?? numero(v.seconds);
    if (s !== undefined) return s * 1000;
  }
  return undefined;
};

/* ── Resumen: engineAdmin.status ─────────────────────────────────────────── */

export interface ProveedorVista {
  id: string;
  nombre: string;
  modalidades: string[];
  configurado: boolean;
  habilitado: boolean;
  prioridad?: number;
  fallos?: number;
  abiertoHasta?: number;
  modelos: { id: string; coste?: string; verificado?: boolean }[];
}
export interface RutaVista {
  capacidad: string;
  politica?: string;
  cadena: string[];
}
export interface EstadoDelMotor {
  origen?: string;
  precios?: string;
  creditsPorUsd?: number;
  margen?: number;
  politicaPorDefecto?: string;
  permiteMock?: boolean;
  iaDetenida?: boolean;
  maxUsdPorDia?: number;
  proveedores: ProveedorVista[];
  rutas: RutaVista[];
}

export const leerEstadoDelMotor = (crudo: unknown): EstadoDelMotor => {
  const raiz = esRegistro(crudo) ? crudo : {};
  const ajustes = esRegistro(raiz.settings) ? raiz.settings : {};
  return {
    origen: texto(raiz.source),
    precios: texto(ajustes.pricingMode),
    creditsPorUsd: numero(ajustes.creditsPerUsd),
    margen: numero(ajustes.margin),
    politicaPorDefecto: texto(ajustes.defaultPolicy),
    permiteMock: booleano(ajustes.allowMockFallback),
    iaDetenida: booleano(ajustes.iaDetenida),
    maxUsdPorDia: numero(ajustes.maxUsdPerDay),
    proveedores: lista(raiz.providers).filter(esRegistro).map((p) => {
      const salud = esRegistro(p.health) ? p.health : undefined;
      return {
        id: texto(p.id) ?? '?',
        nombre: texto(p.name) ?? texto(p.id) ?? '?',
        modalidades: textos(p.modalities),
        configurado: p.configured === true,
        habilitado: p.enabled === true,
        prioridad: numero(p.priority),
        fallos: salud ? numero(salud.failures) : undefined,
        abiertoHasta: salud ? numero(salud.openUntil) : undefined,
        modelos: lista(p.models).filter(esRegistro).map((m) => ({ id: texto(m.id) ?? '?', coste: texto(m.cost), verificado: booleano(m.verified) })),
      };
    }),
    rutas: lista(raiz.routing).filter(esRegistro).map((r) => ({
      capacidad: texto(r.capability) ?? '?',
      politica: texto(r.policy),
      cadena: lista(r.chain).filter(esRegistro).map((l) => [texto(l.provider) ?? '?', texto(l.model)].filter(Boolean).join('/')),
    })),
  };
};

/* ── Credits ─────────────────────────────────────────────────────────────── */

export interface TotalesDeCredits {
  comprados?: number;
  otorgados?: number;
  gastados?: number;
  reembolsados?: number;
  enCirculacion?: number;
  ingresosUsd?: number;
  fallidas?: number;
}
export interface DiaDeCredits extends TotalesDeCredits {
  id: string;
}
export interface EstadisticasDeCredits {
  global: TotalesDeCredits;
  diario: DiaDeCredits[];
  /** true si el servidor no devolvió ningún dato (colecciones aún vacías). */
  vacio: boolean;
}

const totales = (r: Registro): TotalesDeCredits => ({
  comprados: numero(r.totalPurchased),
  otorgados: numero(r.totalGranted),
  gastados: numero(r.totalSpent),
  reembolsados: numero(r.totalRefunded),
  enCirculacion: numero(r.circulating),
  ingresosUsd: numero(r.revenueUsd),
  fallidas: numero(r.failed),
});

export const leerEstadisticasDeCredits = (crudo: unknown): EstadisticasDeCredits => {
  const raiz = esRegistro(crudo) ? crudo : {};
  const global = esRegistro(raiz.global) ? totales(raiz.global) : {};
  const diario = lista(raiz.daily).filter(esRegistro).map((d) => ({ id: texto(d.id) ?? '?', ...totales(d) }));
  const hayGlobal = Object.values(global).some((v) => v !== undefined);
  return { global, diario, vacio: !hayGlobal && diario.length === 0 };
};

export interface SaldoVista {
  userId: string;
  saldo: number;
  ganadoEnTotal: number;
  gastadoEnTotal: number;
  inicializado: boolean;
}
export const leerSaldo = (crudo: unknown): SaldoVista | null => {
  if (!esRegistro(crudo)) return null;
  const saldo = numero(crudo.balance);
  const userId = texto(crudo.userId);
  if (saldo === undefined || userId === undefined) return null;
  return {
    userId,
    saldo,
    ganadoEnTotal: numero(crudo.lifetimeEarned) ?? 0,
    gastadoEnTotal: numero(crudo.lifetimeSpent) ?? 0,
    inicializado: crudo.initialized === true,
  };
};

export interface TransaccionVista {
  id: string;
  tipo?: string;
  estado?: string;
  importe?: number;
  saldoDespues?: number;
  servicio?: string;
  motivo?: string;
  origen?: string;
  creada?: number;
}
export const leerTransacciones = (crudo: unknown): TransaccionVista[] =>
  lista(esRegistro(crudo) ? crudo.items : undefined).filter(esRegistro).map((t) => ({
    id: texto(t.id) ?? '?',
    tipo: texto(t.type),
    estado: texto(t.status),
    importe: numero(t.amount),
    saldoDespues: numero(t.balanceAfter),
    servicio: texto(t.service),
    motivo: texto(t.reason),
    origen: texto(t.source),
    creada: fechaEnMs(t.createdAt),
  }));

/*
 * Solo el coste en Credits de cada servicio. `creditsAdmin.costs` también devuelve `packages` (el catálogo heredado
 * `CREDIT_PACKAGES` del Credit Engine), pero Weë no tiene planes, niveles ni paquetes comerciales: los Credits son la
 * unidad de consumo y la referencia es US$ 1 = 100 Credits (decisión de producto, 2026-10-29). Por eso ese campo se
 * IGNORA aquí, sin tocar el servidor: la consola no lo lee, no lo guarda y no lo pinta.
 */
export interface CostesVista {
  servicios: { servicio: string; credits: number }[];
}
export const leerCostes = (crudo: unknown): CostesVista => {
  const raiz = esRegistro(crudo) ? crudo : {};
  const costes = esRegistro(raiz.costs) ? raiz.costs : {};
  return {
    servicios: Object.entries(costes).flatMap(([servicio, c]) => (numero(c) !== undefined ? [{ servicio, credits: c as number }] : [])),
  };
};

/** La conversión de referencia de Weë: US$ 1 = 100 Credits. Es también `creditsPerUsd` por defecto del motor (functions/src/engine/registry.ts). */
export const CREDITS_POR_USD_DE_REFERENCIA = 100;

/* ── Moderación ──────────────────────────────────────────────────────────── */

export interface ReporteVista {
  id: string;
  estado?: string;
  motivo?: string;
  tipoDeObjetivo?: string;
  idDeObjetivo?: string;
  cuentaQueDenuncia?: string;
  duenoDelObjetivo?: string;
  detalles?: string;
  superficie?: string;
  entradasDeHistorial?: number;
  creado?: number;
  actualizado?: number;
}
export const leerReportes = (crudo: unknown): ReporteVista[] =>
  lista(esRegistro(crudo) ? crudo.reports : undefined).filter(esRegistro).map((r) => ({
    id: texto(r.reportId) ?? '?',
    estado: texto(r.status),
    motivo: texto(r.reason),
    tipoDeObjetivo: texto(r.targetType),
    idDeObjetivo: texto(r.targetId),
    cuentaQueDenuncia: texto(r.reporterAccountId),
    duenoDelObjetivo: texto(r.targetOwnerAccountId),
    detalles: texto(r.details),
    superficie: texto(r.surface),
    entradasDeHistorial: numero(r.historyCount),
    creado: fechaEnMs(r.createdAt),
    actualizado: fechaEnMs(r.updatedAt),
  }));

export interface EntradaVista {
  seq: number;
  tipo?: string;
  en?: number;
  quien?: string;
  de?: string;
  a?: string;
  resultado?: string;
  accion?: string;
  motivo?: string;
}
export const leerHistorial = (crudo: unknown): EntradaVista[] =>
  lista(esRegistro(crudo) ? crudo.history : undefined).filter(esRegistro).map((e) => {
    const por = esRegistro(e.by) ? e.by : {};
    return {
      seq: numero(e.seq) ?? 0,
      tipo: texto(e.type),
      en: fechaEnMs(e.at),
      quien: [texto(por.kind), texto(por.id)].filter(Boolean).join(' · ') || undefined,
      de: texto(e.from),
      a: texto(e.to),
      resultado: texto(e.outcome),
      accion: texto(e.action),
      motivo: texto(e.reason),
    };
  });
