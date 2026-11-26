/*
 * MEMORIA DE LOS PERSONAJES CON IA (paso 2A de docs/AUTONOMIA.md).
 *
 * Lo que permite que un personaje recuerde quién le escribió, de qué hablaron y
 * su propia historia, para contestar con coherencia. No decide nada ni cobra
 * nada: guarda y encuentra recuerdos. Quien la usa (el servidor de la autonomía,
 * paso 2B) es quien cobra la acción en su puerta.
 *
 * ORIGEN. La lógica está ADAPTADA de AI Town (a16z-infra/ai-town,
 * `convex/agent/memory.ts`, licencia MIT, Copyright (c) 2023 a16z-infra), que
 * implementa «Generative Agents» (Park et al., 2023):
 *   · cada recuerdo tiene una importancia de 0 a 9 que puntúa el modelo;
 *   · para recordar se buscan candidatos por significado (10 veces los pedidos) y
 *     se ordenan sumando relevancia + importancia + recencia, normalizadas;
 *   · la recencia decae un 1 % por hora desde el último acceso;
 *   · al usarse, un recuerdo se «toca» (no más de una vez cada 5 minutos);
 *   · cuando lo importante acumulado desde la última reflexión pasa de 500, el
 *     personaje reflexiona y guarda hasta tres ideas de alto nivel.
 * Cambios respecto al original: la normalización no divide por cero cuando todos
 * los valores son iguales (en AI Town daba NaN); la reflexión se valida antes de
 * guardarse (en el original un JSON raro se intentaba guardar igual); y nunca se
 * compara un vector con otro de distinta huella (modelo distinto).
 *
 * El modelo de texto y los vectores llegan como dependencias: así se prueba sin
 * red y el servidor decide por dónde llamar (motor de IA, nunca directo).
 */
import { promptDeImportancia, promptDeReflexion } from '../creator/prompts';

export type TipoDeRecuerdo = 'conversacion' | 'reflexion' | 'publicacion' | 'ficha';

export interface Recuerdo {
  id: string;
  /** Id del Perfil Weë dueño del recuerdo. */
  personajeId: string;
  tipo: TipoDeRecuerdo;
  texto: string;
  /** 0 (rutina) … 9 (muy significativo). */
  importancia: number;
  /** proveedor:modelo:dimensiones del vector. */
  huella: string;
  vector: number[];
  creadoEn: number;
  ultimoAccesoEn: number;
  /** Con quién fue (otro perfil), si aplica. */
  conQuien?: string;
  /** Recuerdos en los que se apoya una reflexión. */
  relacionados?: string[];
  /**
   * De una conversación PRIVADA (WeeTalk): solo se recupera al hablar con esa misma
   * persona (`conQuien`), nunca en público ni con otra persona, y no entra en las
   * reflexiones (que mezclan recuerdos). Auditoría 2026-11-22, C1.
   */
  privado?: boolean;
}

export interface Candidato { recuerdo: Recuerdo; relevancia: number }

/** Dónde viven los recuerdos. Hay una versión en memoria (pruebas) y otra en Firestore. */
export interface AlmacenDeRecuerdos {
  guardar(r: Omit<Recuerdo, 'id'>): Promise<Recuerdo>;
  /** Los `limite` recuerdos más parecidos al vector, SOLO de esa huella. */
  buscarParecidos(personajeId: string, huella: string, vector: number[], limite: number): Promise<Candidato[]>;
  tocar(ids: string[], ahora: number): Promise<void>;
  /** Los últimos `limite` recuerdos del personaje, del más nuevo al más viejo. */
  ultimos(personajeId: string, limite: number): Promise<Recuerdo[]>;
}

export const SOBREPEDIDO = 10;
export const MIN_ENTRE_TOQUES_MS = 300_000;
export const UMBRAL_DE_REFLEXION = 500;
export const RECUERDOS_PARA_REFLEXIONAR = 100;
export const MAX_IDEAS_POR_REFLEXION = 3;
export const MAX_CARACTERES_DE_RECUERDO = 1200;

// ── Importancia ──────────────────────────────────────────────────────────────

/** Lee la importancia de la respuesta del modelo; si no se entiende, 5 (como en AI Town). */
export function importanciaDesde(respuesta: string): number {
  let n = parseFloat(String(respuesta ?? '').trim());
  if (Number.isNaN(n)) n = Number(String(respuesta ?? '').match(/\d+/)?.[0] ?? NaN);
  if (Number.isNaN(n)) return 5;
  return Math.max(0, Math.min(9, Math.round(n)));
}

// ── Ordenar recuerdos ────────────────────────────────────────────────────────

const rango = (v: number[]): [number, number] => [Math.min(...v), Math.max(...v)];
/** Normaliza a [0, 1]; si todos son iguales, 1 (todos igual de buenos), no NaN. */
const normalizar = (x: number, [min, max]: [number, number]): number => (max > min ? (x - min) / (max - min) : 1);

export const recencia = (ultimoAccesoEn: number, ahora: number): number => 0.99 ** Math.floor(Math.max(0, ahora - ultimoAccesoEn) / 3_600_000);

/**
 * Ordena los candidatos por relevancia + importancia + recencia (cada una
 * normalizada) y devuelve los `n` mejores y cuáles hay que «tocar».
 */
export function ordenarRecuerdos(candidatos: Candidato[], ahora: number, n: number): { elegidos: Candidato[]; aTocar: string[] } {
  if (!candidatos.length || n <= 0) return { elegidos: [], aTocar: [] };
  const rec = candidatos.map((c) => recencia(c.recuerdo.ultimoAccesoEn, ahora));
  const rRel = rango(candidatos.map((c) => c.relevancia)), rImp = rango(candidatos.map((c) => c.recuerdo.importancia)), rRec = rango(rec);
  const puntuados = candidatos.map((c, i) => ({ c, p: normalizar(c.relevancia, rRel) + normalizar(c.recuerdo.importancia, rImp) + normalizar(rec[i], rRec) }));
  puntuados.sort((a, b) => b.p - a.p || b.c.recuerdo.creadoEn - a.c.recuerdo.creadoEn);
  const elegidos = puntuados.slice(0, n).map((x) => x.c);
  const aTocar = elegidos.filter((c) => c.recuerdo.ultimoAccesoEn < ahora - MIN_ENTRE_TOQUES_MS).map((c) => c.recuerdo.id);
  return { elegidos, aTocar };
}

// ── Reflexión ────────────────────────────────────────────────────────────────

/** Reflexiona si lo importante acumulado desde la última reflexión pasa del umbral. */
export function debeReflexionar(ultimos: Recuerdo[], umbral = UMBRAL_DE_REFLEXION): boolean {
  const ultima = ultimos.find((r) => r.tipo === 'reflexion');
  const desde = ultima ? ultima.creadoEn : -Infinity;
  const suma = ultimos.filter((r) => r.creadoEn > desde && r.tipo !== 'reflexion').reduce((s, r) => s + r.importancia, 0);
  return suma > umbral;
}

/** Interpreta la respuesta JSON de la reflexión, con desconfianza: nada raro se guarda. */
export function interpretarReflexion(respuesta: string, cuantos: number): { idea: string; afirmaciones: number[] }[] {
  const texto = String(respuesta ?? '');
  const ini = texto.indexOf('['), fin = texto.lastIndexOf(']');
  if (ini < 0 || fin <= ini) return [];
  let datos: unknown;
  try { datos = JSON.parse(texto.slice(ini, fin + 1)); } catch { return []; }
  if (!Array.isArray(datos)) return [];
  const ideas: { idea: string; afirmaciones: number[] }[] = [];
  for (const d of datos) {
    if (!d || typeof d !== 'object') continue;
    const o = d as Record<string, unknown>;
    const idea = typeof o.idea === 'string' ? o.idea.replace(/\s+/g, ' ').trim().slice(0, MAX_CARACTERES_DE_RECUERDO) : '';
    const af = Array.isArray(o.afirmaciones) ? o.afirmaciones.filter((x): x is number => Number.isInteger(x) && (x as number) >= 0 && (x as number) < cuantos) : [];
    if (idea) ideas.push({ idea, afirmaciones: [...new Set(af)] });
    if (ideas.length >= MAX_IDEAS_POR_REFLEXION) break;
  }
  return ideas;
}

// ── La memoria completa ──────────────────────────────────────────────────────

export interface DependenciasDeMemoria {
  almacen: AlmacenDeRecuerdos;
  /** Pide un texto al modelo (por el motor de IA). */
  generarTexto: (prompt: string) => Promise<string>;
  /** Convierte textos en vectores (engine/embeddings.vectorizar). */
  vectorizar: (textos: string[], rol: 'consulta' | 'documento') => Promise<{ vectores: number[][]; huella: string }>;
  ahora?: () => number;
}

const limpiar = (t: string): string => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_CARACTERES_DE_RECUERDO);

export function crearMemoria(deps: DependenciasDeMemoria) {
  const ahora = deps.ahora || (() => Date.now());

  async function recordar(personajeId: string, texto: string, tipo: TipoDeRecuerdo, extra: { conQuien?: string; relacionados?: string[]; importancia?: number; privado?: boolean } = {}): Promise<Recuerdo> {
    const t = limpiar(texto);
    if (!t) throw new Error('recordar: texto vacío');
    const importancia = extra.importancia ?? importanciaDesde(await deps.generarTexto(promptDeImportancia(t)));
    const { vectores, huella } = await deps.vectorizar([t], 'documento');
    const momento = ahora();
    return deps.almacen.guardar({ personajeId, tipo, texto: t, importancia, huella, vector: vectores[0], creadoEn: momento, ultimoAccesoEn: momento, ...(extra.conQuien ? { conQuien: extra.conQuien } : {}), ...(extra.relacionados?.length ? { relacionados: extra.relacionados } : {}), ...(extra.privado ? { privado: true } : {}) });
  }

  /** `admite` decide qué recuerdos se pueden usar aquí (aislamiento por persona y canal). */
  async function buscar(personajeId: string, consulta: string, n = 3, admite: (r: Recuerdo) => boolean = (r) => !r.privado): Promise<Recuerdo[]> {
    const q = limpiar(consulta);
    if (!q) return [];
    const { vectores, huella } = await deps.vectorizar([q], 'consulta');
    const candidatos = await deps.almacen.buscarParecidos(personajeId, huella, vectores[0], n * SOBREPEDIDO);
    const momento = ahora();
    // Defensa en profundidad: aunque el almacén filtre, nunca se usa un recuerdo de otra huella.
    const validos = candidatos.filter((c) => c.recuerdo.huella === huella && c.recuerdo.personajeId === personajeId && admite(c.recuerdo));
    const { elegidos, aTocar } = ordenarRecuerdos(validos, momento, n);
    if (aTocar.length) await deps.almacen.tocar(aTocar, momento);
    return elegidos.map((c) => c.recuerdo);
  }

  async function reflexionar(personajeId: string, nombre: string): Promise<Recuerdo[]> {
    // Lo privado no se mezcla en una reflexión: luego podría salir en cualquier canal.
    const ultimos = (await deps.almacen.ultimos(personajeId, RECUERDOS_PARA_REFLEXIONAR)).filter((r) => !r.privado);
    if (!debeReflexionar(ultimos)) return [];
    const ideas = interpretarReflexion(await deps.generarTexto(promptDeReflexion(nombre, ultimos.map((r) => r.texto))), ultimos.length);
    const guardados: Recuerdo[] = [];
    for (const { idea, afirmaciones } of ideas) {
      guardados.push(await recordar(personajeId, idea, 'reflexion', { relacionados: afirmaciones.map((i) => ultimos[i].id) }));
    }
    return guardados;
  }

  return { recordar, buscar, reflexionar };
}

// ── Almacén en memoria (pruebas y emulador) ──────────────────────────────────

export function almacenEnMemoria(similitud: (a: number[], b: number[]) => number): AlmacenDeRecuerdos & { todos: Recuerdo[] } {
  const todos: Recuerdo[] = []; let n = 0;
  return {
    todos,
    async guardar(r) { const x = { ...r, id: `r${++n}` }; todos.push(x); return x; },
    async buscarParecidos(personajeId, huella, vector, limite) {
      return todos.filter((r) => r.personajeId === personajeId && r.huella === huella)
        .map((recuerdo) => ({ recuerdo, relevancia: similitud(recuerdo.vector, vector) }))
        .sort((a, b) => b.relevancia - a.relevancia).slice(0, limite);
    },
    async tocar(ids, ahora) { for (const r of todos) if (ids.includes(r.id)) r.ultimoAccesoEn = ahora; },
    async ultimos(personajeId, limite) { return todos.filter((r) => r.personajeId === personajeId).sort((a, b) => b.creadoEn - a.creadoEn).slice(0, limite); },
  };
}
