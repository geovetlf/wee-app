/*
 * EL PASE DE AUTONOMÍA DEL PERSONAJE (paso 2B-1 de docs/AUTONOMIA.md).
 *
 * Lógica PURA del tiempo y del cobro de la autonomía, sin Firestore, sin IA y sin
 * dinero: dice CUÁNDO hay que cobrar un bloque, si el personaje puede actuar y
 * cómo avanza el reloj. Quien cobra de verdad (Credit Engine) y quien guarda el
 * estado es el servidor (paso 2B-2), con estas funciones.
 *
 * Decisiones del dueño (2026-11-22):
 *   · 30 Credits = 24 h de autonomía desde que se activa (precio configurable);
 *   · el dueño programa ANTES 24 h, 3 días o una semana; termina ahí, sin
 *     renovación automática;
 *   · cada bloque de 24 h se cobra al empezar; si el dueño apaga antes, los
 *     bloques que no empezaron no se cobran;
 *   · si Weë falla, esas horas no cuentan: el reloj se para y se reanuda hasta
 *     completar lo programado;
 *   · tope de acciones por bloque (incluidas en el pase); lo que se encarga a Weë
 *     AI (diseño, imagen, vídeo, búsqueda) se cobra aparte a su precio;
 *   · el mismo precio para los tres niveles.
 *
 * El reloj es TIEMPO DE SERVICIO, no tiempo de calendario: solo corre mientras
 * la autonomía está activa. Por eso una pausa por falla de Weë no consume nada.
 */

export const MS_POR_HORA = 3_600_000;

export interface ConfigDelPase {
  /** Puerta global. Cerrada por defecto: nadie activa nada hasta abrirla. */
  abierta: boolean;
  creditosPorBloque: number;
  horasPorBloque: number;
  accionesPorBloque: number;
  /** Duraciones que el dueño puede programar, en bloques. */
  bloquesPermitidos: number[];
}

export const CONFIG_DEL_PASE_POR_DEFECTO: ConfigDelPase = Object.freeze({
  abierta: false,
  creditosPorBloque: 30,
  horasPorBloque: 24,
  accionesPorBloque: 30,
  bloquesPermitidos: [1, 3, 7],
}) as ConfigDelPase;

/** Mezcla lo guardado en Firestore (aiSettings/autonomia) validando cada campo. */
export function mezclarConfigDelPase(base: ConfigDelPase, g: Record<string, unknown> | undefined): ConfigDelPase {
  if (!g) return { ...base, bloquesPermitidos: [...base.bloquesPermitidos] };
  const entero = (v: unknown, min: number, max: number) => (Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? (v as number) : undefined);
  const c: ConfigDelPase = { ...base, bloquesPermitidos: [...base.bloquesPermitidos] };
  if (typeof g.abierta === 'boolean') c.abierta = g.abierta;
  c.creditosPorBloque = entero(g.creditosPorBloque, 1, 10_000) ?? c.creditosPorBloque;
  c.horasPorBloque = entero(g.horasPorBloque, 1, 168) ?? c.horasPorBloque;
  c.accionesPorBloque = entero(g.accionesPorBloque, 1, 1000) ?? c.accionesPorBloque;
  if (Array.isArray(g.bloquesPermitidos)) {
    const v = [...new Set(g.bloquesPermitidos.filter((x) => Number.isInteger(x) && (x as number) >= 1 && (x as number) <= 30) as number[])].sort((a, b) => a - b);
    if (v.length) c.bloquesPermitidos = v;
  }
  return c;
}

export type EstadoDelPase = 'activa' | 'pausadaPorWee' | 'pausadaPorTope' | 'pausadaSinSaldo' | 'apagada' | 'terminada';

export interface Pase {
  personajeId: string;
  /** Momento en que se programó (identifica la programación para cobrar sin repetir). */
  programadoEn: number;
  bloquesProgramados: number;
  bloquesCobrados: number;
  /** Tiempo de servicio ya consumido, sin contar el tramo en curso. */
  msUsados: number;
  /** Desde cuándo corre el tramo actual (solo si `estado === 'activa'`). */
  tramoDesde: number | null;
  estado: EstadoDelPase;
  /** Acciones hechas en el bloque en curso. */
  accionesEnBloque: number;
  /** A qué bloque corresponden esas acciones. */
  bloqueDeLasAcciones: number;
  motivo?: string;
  /** Precio y tope con los que se programó: un cambio de configuración no altera lo ya programado. */
  creditosPorBloque: number;
  horasPorBloque: number;
  accionesPorBloque: number;
}

export type ErrorDelPase = 'puertaCerrada' | 'duracionNoPermitida' | 'yaActivo';

/** Programar la autonomía: devuelve el pase nuevo o el motivo por el que no se puede. */
export function programar(previo: Pase | null, personajeId: string, bloques: number, config: ConfigDelPase, ahora: number): { pase: Pase } | { error: ErrorDelPase } {
  if (!config.abierta) return { error: 'puertaCerrada' };
  if (!config.bloquesPermitidos.includes(bloques)) return { error: 'duracionNoPermitida' };
  if (previo && vigente(previo)) return { error: 'yaActivo' };
  return {
    pase: {
      personajeId, programadoEn: ahora, bloquesProgramados: bloques, bloquesCobrados: 0, msUsados: 0, tramoDesde: ahora,
      estado: 'activa', accionesEnBloque: 0, bloqueDeLasAcciones: 0,
      creditosPorBloque: config.creditosPorBloque, horasPorBloque: config.horasPorBloque, accionesPorBloque: config.accionesPorBloque,
    },
  };
}

const msPorBloque = (p: Pase) => p.horasPorBloque * MS_POR_HORA;
const msProgramados = (p: Pase) => p.bloquesProgramados * msPorBloque(p);
/** Un pase sigue vivo mientras no esté apagado ni terminado. */
export const vigente = (p: Pase): boolean => p.estado !== 'apagada' && p.estado !== 'terminada';

/** Tiempo de servicio consumido hasta `ahora` (no corre en pausa). */
export function tiempoUsado(p: Pase, ahora: number): number {
  const corriendo = (p.estado === 'activa' || p.estado === 'pausadaPorTope') && p.tramoDesde !== null ? Math.max(0, ahora - p.tramoDesde) : 0;
  return Math.min(msProgramados(p), p.msUsados + corriendo);
}

/** Índice del bloque en curso (0, 1, 2…). */
export const bloqueEnCurso = (p: Pase, ahora: number): number => Math.min(p.bloquesProgramados - 1, Math.floor(tiempoUsado(p, ahora) / msPorBloque(p)));
export const tiempoRestante = (p: Pase, ahora: number): number => Math.max(0, msProgramados(p) - tiempoUsado(p, ahora));

/** Cierra el tramo en curso (suma lo corrido a `msUsados`). */
const cerrarTramo = (p: Pase, ahora: number): Pase => ({ ...p, msUsados: tiempoUsado(p, ahora), tramoDesde: null });

/**
 * Pone el pase al día: si se cumplió el tiempo, termina; si empezó un bloque
 * nuevo, reinicia el contador de acciones y levanta la pausa por tope.
 */
export function alDia(p: Pase, ahora: number): Pase {
  if (!vigente(p)) return p;
  if (tiempoRestante(p, ahora) === 0) return { ...cerrarTramo(p, ahora), estado: 'terminada', motivo: undefined };
  const b = bloqueEnCurso(p, ahora);
  if (b !== p.bloqueDeLasAcciones) {
    const n = { ...p, accionesEnBloque: 0, bloqueDeLasAcciones: b };
    return n.estado === 'pausadaPorTope' ? { ...n, estado: 'activa', motivo: undefined } : n;
  }
  return p;
}

/** ¿Hay que cobrar un bloque antes de dejar actuar al personaje? Y cuál. */
export function bloqueAPagar(p: Pase, ahora: number): number | null {
  const q = alDia(p, ahora);
  if (q.estado !== 'activa' && q.estado !== 'pausadaSinSaldo') return null;
  const b = bloqueEnCurso(q, ahora);
  return b >= q.bloquesCobrados && b < q.bloquesProgramados ? b : null;
}

/**
 * Identificador idempotente del cobro de un bloque: el mismo bloque de la misma
 * programación SIEMPRE produce el mismo id, así que un reintento no cobra dos veces.
 */
export const idDeCobro = (p: Pase, bloque: number): string => `autonomia_${p.personajeId}_${p.programadoEn}_b${bloque}`;

/** Se cobró el bloque: el reloj (si estaba parado por falta de saldo) vuelve a correr. */
export function registrarCobro(p: Pase, bloque: number, ahora: number): Pase {
  const q = alDia(p, ahora);
  const cobrados = Math.max(q.bloquesCobrados, bloque + 1);
  if (q.estado === 'pausadaSinSaldo') return { ...q, bloquesCobrados: cobrados, estado: 'activa', tramoDesde: ahora, motivo: undefined };
  return { ...q, bloquesCobrados: cobrados };
}

/** No hubo saldo para el bloque: el reloj se para (no se consume tiempo sin pagar). */
export const sinSaldo = (p: Pase, ahora: number): Pase => (vigente(p) ? { ...cerrarTramo(alDia(p, ahora), ahora), estado: 'pausadaSinSaldo', motivo: 'sinSaldo' } : p);

/** Weë falló (caída, error de IA): el reloj se para; esas horas no cuentan. */
export const pausarPorWee = (p: Pase, ahora: number, motivo: string): Pase => {
  const q = alDia(p, ahora);
  if (q.estado === 'activa' || q.estado === 'pausadaPorTope') return { ...cerrarTramo(q, ahora), estado: 'pausadaPorWee', motivo };
  // Ya estaba pausado por Weë: solo se actualiza el motivo (p. ej. de puerta cerrada a falla).
  return q.estado === 'pausadaPorWee' ? { ...q, motivo } : q;
};

/** Weë se recuperó: el reloj vuelve a correr desde donde quedó. */
export const reanudar = (p: Pase, ahora: number): Pase => (p.estado === 'pausadaPorWee' ? { ...p, estado: 'activa', tramoDesde: ahora, motivo: undefined } : p);

/** El dueño apaga: se acaba aquí; los bloques no empezados no se cobran nunca. */
export const apagar = (p: Pase, ahora: number): Pase => (vigente(p) ? { ...cerrarTramo(p, ahora), estado: 'apagada', motivo: 'dueño' } : p);

export type MotivoParaNoActuar = 'noVigente' | 'pausado' | 'bloqueSinPagar' | 'topeDeAcciones';

/** ¿Puede el personaje hacer una acción incluida en el pase ahora mismo? */
export function puedeActuar(p: Pase, ahora: number): { ok: true; pase: Pase } | { ok: false; motivo: MotivoParaNoActuar; pase: Pase } {
  const q = alDia(p, ahora);
  if (!vigente(q)) return { ok: false, motivo: 'noVigente', pase: q };
  if (q.estado !== 'activa') return { ok: false, motivo: q.estado === 'pausadaPorTope' ? 'topeDeAcciones' : 'pausado', pase: q };
  if (bloqueAPagar(q, ahora) !== null) return { ok: false, motivo: 'bloqueSinPagar', pase: q };
  if (q.accionesEnBloque >= q.accionesPorBloque) return { ok: false, motivo: 'topeDeAcciones', pase: { ...q, estado: 'pausadaPorTope', motivo: 'tope' } };
  return { ok: true, pase: q };
}

/** Cuenta una acción incluida. Al llegar al tope, el pase queda en pausa hasta el bloque siguiente. */
export function registrarAccion(p: Pase, ahora: number): Pase {
  const q = alDia(p, ahora);
  const n = { ...q, accionesEnBloque: q.accionesEnBloque + 1 };
  return n.accionesEnBloque >= n.accionesPorBloque ? { ...n, estado: 'pausadaPorTope', motivo: 'tope' } : n;
}

/**
 * Lo que NO entra en el pase y se cobra a precio de Weë AI, con su servicio del
 * catálogo de Credits de siempre (la tarifa la decide el catálogo, no esto).
 */
export const SERVICIO_DE_ENCARGO: Readonly<Record<'investigar' | 'generarImagen' | 'generarImagenPro' | 'generarVideo', string>> = Object.freeze({
  investigar: 'ai_search',
  generarImagen: 'ai_image_lite',
  generarImagenPro: 'ai_image',
  generarVideo: 'ai_video',
});
