import { fechaEnMs } from './modelos';

/*
 * LOS NORMALIZADORES DE `opsAdmin` y `accountsAdmin`. Como los de `modelos.ts`: toleran cualquier cosa sin romper ni
 * inventar datos. Lo que el servidor no manda se queda en `undefined` y la vista dice «—».
 */
type Registro = Record<string, unknown>;
const esRegistro = (v: unknown): v is Registro => typeof v === 'object' && v !== null && !Array.isArray(v);
const texto = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined);
const numero = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export interface PaginaVista<T> {
  items: T[];
  fuente?: string;
  examinados?: number;
  truncado: boolean;
  cursor?: string;
  correlationId?: string;
}

const pagina = <T>(crudo: unknown, fila: (r: Registro) => T): PaginaVista<T> => {
  const raiz = esRegistro(crudo) ? crudo : {};
  return {
    items: lista(raiz.items).filter(esRegistro).map(fila),
    fuente: texto(raiz.fuente),
    examinados: numero(raiz.examinados),
    truncado: raiz.truncado === true,
    cursor: texto(raiz.cursor),
    correlationId: texto(raiz.correlationId),
  };
};

export const leerIdentidad = (crudo: unknown): { rol?: string; permisos: string[]; entorno?: string } => {
  const raiz = esRegistro(crudo) ? crudo : {};
  return { rol: texto(raiz.rol), permisos: lista(raiz.permisos).filter((p): p is string => typeof p === 'string'), entorno: texto(raiz.entorno) };
};

export const leerTrabajos = (crudo: unknown) => pagina(crudo, (r) => ({
  id: texto(r.jobId) ?? '?',
  estado: texto(r.estado),
  cuenta: texto(r.cuenta),
  capacidad: texto(r.capacidad),
  proveedor: texto(r.proveedor),
  modelo: texto(r.modelo),
  actualizado: numero(r.actualizado),
  limite: numero(r.limite),
  intentos: numero(r.intentos),
}));
export type TrabajoVista = ReturnType<typeof leerTrabajos>['items'][number];

export const leerCreaciones = (crudo: unknown) => pagina(crudo, (r) => ({
  id: texto(r.id) ?? '?',
  cuenta: texto(r.cuenta),
  experiencia: texto(r.experiencia),
  estado: texto(r.estado),
  creado: numero(r.creado) ?? fechaEnMs(r.creado),
  abandonado: r.abandonado === true,
  demo: r.demo === true,
  creditsEstimados: numero(r.creditsEstimados),
  creditsCobrados: numero(r.creditsCobrados),
  pasos: numero(r.pasos),
  pasosFallidos: numero(r.pasosFallidos),
}));

export const leerProducciones = (crudo: unknown) => pagina(crudo, (r) => ({
  id: texto(r.id) ?? '?',
  cuenta: texto(r.cuenta),
  estado: texto(r.estado),
  actualizada: numero(r.actualizada),
}));

export const leerGeneraciones = (crudo: unknown) => pagina(crudo, (r) => ({
  id: texto(r.id) ?? '?',
  experiencia: texto(r.experiencia),
  capacidad: texto(r.capacidad),
  proveedor: texto(r.proveedor),
  modelo: texto(r.modelo),
  estado: texto(r.estado),
  duracionMs: numero(r.duracionMs),
  creado: numero(r.creado),
  creditsCobrados: numero(r.creditsCobrados),
  /** Solo llega con el permiso de finanzas. */
  costeUsd: numero(r.costeProveedorUsd),
}));

export const leerUsoIa = (crudo: unknown) => {
  const raiz = esRegistro(crudo) ? crudo : {};
  return {
    ...pagina(crudo, (r) => ({
      capacidad: texto(r.capacidad) ?? '?',
      proveedor: texto(r.proveedor) ?? '?',
      llamadas: numero(r.llamadas),
      fallos: numero(r.fallos),
      credits: numero(r.credits),
      usd: numero(r.usd),
    })),
    dia: texto(raiz.dia),
    existe: raiz.existe === true,
  };
};

export const leerReservas = (crudo: unknown) => pagina(crudo, (r) => ({
  id: texto(r.id) ?? '?',
  cuenta: texto(r.cuenta),
  servicio: texto(r.servicio),
  importe: numero(r.importe),
  creada: numero(r.creada),
}));

export const leerAuditoria = (crudo: unknown) => pagina(crudo, (r) => {
  const recurso = esRegistro(r.recurso) ? r.recurso : {};
  return {
    en: numero(r.en),
    actor: texto(r.actorUid),
    rol: texto(r.actorRol),
    accion: texto(r.accion),
    recurso: [texto(recurso.tipo), texto(recurso.id)].filter(Boolean).join(' · ') || undefined,
    resultado: texto(r.resultado),
    correlacion: texto(r.correlationId),
    entorno: texto(r.entorno),
  };
});

export const leerNoDisponibles = (crudo: unknown): { id: string; dependencia?: string }[] =>
  lista(esRegistro(crudo) ? crudo.noDisponibles : undefined).filter(esRegistro).map((r) => ({ id: texto(r.id) ?? '?', dependencia: texto(r.dependencia) }));

export type CuentaVista =
  | { encontrada: false }
  | {
    encontrada: true;
    uid?: string;
    perfiles: { id: string; tipo?: string; creado?: number }[];
    cuenta?: { numero?: string; estado?: string; creada?: number };
    acceso?: { deshabilitado?: boolean; correoVerificado?: boolean; tieneCorreo?: boolean; proveedores: string[]; creado?: number; ultimoAcceso?: number };
    correlationId?: string;
  };

const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined);

export const leerCuenta = (crudo: unknown): CuentaVista => {
  const r = esRegistro(crudo) ? crudo : {};
  if (r.encontrada !== true) return { encontrada: false };
  const c = esRegistro(r.cuenta) ? r.cuenta : undefined;
  const a = esRegistro(r.acceso) ? r.acceso : undefined;
  return {
    encontrada: true,
    uid: texto(r.uid),
    perfiles: lista(r.perfiles).filter(esRegistro).map((p) => ({ id: texto(p.id) ?? '?', tipo: texto(p.tipo), creado: numero(p.creado) })),
    cuenta: c && { numero: texto(c.numero), estado: texto(c.estado), creada: numero(c.creada) },
    acceso: a && {
      deshabilitado: bool(a.deshabilitado),
      correoVerificado: bool(a.correoVerificado),
      tieneCorreo: bool(a.tieneCorreo),
      proveedores: lista(a.proveedores).filter((x): x is string => typeof x === 'string'),
      creado: fechaEnMs(a.creado),
      ultimoAcceso: fechaEnMs(a.ultimoAcceso),
    },
    correlationId: texto(r.correlationId),
  };
};
