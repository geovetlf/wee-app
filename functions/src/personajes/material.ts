/*
 * EL MATERIAL DEL PERSONAJE (paso 1b de docs/AUTONOMIA.md) — la parte pura.
 *
 * El dueño del Perfil Weë sube lo que le da personalidad y conocimiento a su
 * personaje: un libro («Jay Reads»), una biografía, las características de su
 * mundo. Decisión del dueño (2026-11-22): **es gratis para la persona y no le
 * cuesta nada a Weë**. Por eso aquí NO hay IA ni APIs de pago:
 *
 *   · el texto se saca con librerías libres (./extraer.ts);
 *   · se trocea en fragmentos y se indexa POR PALABRAS (BM25, la técnica clásica
 *     de los buscadores), en este archivo, sin dependencias;
 *   · cuando el personaje habla —solo con el pase de autonomía activo— se buscan
 *     los fragmentos que vienen al caso y van dentro del prompt que el pase ya
 *     paga. No hay ninguna llamada extra.
 *
 * Lo único con coste es el almacenamiento y el cómputo de Firebase (céntimos):
 * se protege con LÍMITES, nunca con precio.
 */

// ── Límites (los únicos «precios» del material) ──────────────────────────────

export const MAX_ARCHIVOS_DE_MATERIAL = 5; // decisión del dueño, 2026-11-22
export const MAX_BYTES_POR_ARCHIVO = 20 * 1024 * 1024;
/** Texto que se conserva de un archivo (≈ un libro largo). Lo que pase de aquí se recorta y se avisa. */
export const MAX_CARACTERES_POR_ARCHIVO = 2_000_000;
export const CARACTERES_POR_FRAGMENTO = 900;
export const SOLAPE_ENTRE_FRAGMENTOS = 120;
/** Fragmentos que acompañan a una respuesta, y su tope en el prompt. */
export const FRAGMENTOS_POR_RESPUESTA = 3;
export const MAX_CARACTERES_DE_MATERIAL_EN_PROMPT = 2400;

/** Formatos aceptados: extensión → tipo de contenido que se espera. */
export const FORMATOS_DE_MATERIAL = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  epub: 'application/epub+zip',
  txt: 'text/plain',
  md: 'text/markdown',
} as const;
export type FormatoDeMaterial = keyof typeof FORMATOS_DE_MATERIAL;

/** La carpeta del Storage donde el dueño sube (las reglas la abren solo a él). */
export const CARPETA_DE_SUBIDA = 'character-material';
/** Ruta de subida: users/{perfilId}/character-material/{archivoId}.{ext} */
export const RUTA_DE_SUBIDA = /^users\/([A-Za-z0-9_-]{3,128})\/character-material\/([A-Za-z0-9_-]{6,64})\.(pdf|docx|epub|txt|md)$/;
/** Donde el servidor guarda el índice (ninguna regla lo abre a los clientes). */
export const rutaDelIndice = (perfilId: string, archivoId: string): string => `personajes/${perfilId}/material/${archivoId}.json`;
export const prefijoDeIndices = (perfilId: string): string => `personajes/${perfilId}/material/`;

export type MotivoDeMaterial = 'demasiados' | 'muyGrande' | 'formatoNoAdmitido' | 'sinTexto' | 'ilegible';
export type EstadoDeMaterial = 'procesando' | 'listo' | 'error';

/** Lee la ruta de una subida. `null` si no es una subida de material. */
export function leerRutaDeSubida(ruta: string): { perfilId: string; archivoId: string; formato: FormatoDeMaterial } | null {
  const m = RUTA_DE_SUBIDA.exec(String(ruta || ''));
  return m ? { perfilId: m[1], archivoId: m[2], formato: m[3] as FormatoDeMaterial } : null;
}

/** Nombre que se enseña: el que puso el dueño, saneado (sin rutas ni controles). */
export function nombreVisible(crudo: unknown, archivoId: string, formato: FormatoDeMaterial): string {
  const limpio = String(crudo ?? '').replace(/[\\/]/g, ' ').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120);
  return limpio || `${archivoId}.${formato}`;
}

// ── Texto → fragmentos ───────────────────────────────────────────────────────

/** Deja el texto en una forma estable: saltos uniformes, sin espacios repetidos ni controles. */
export function normalizarTexto(texto: string): string {
  return String(texto ?? '')
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Trocea respetando párrafos: junta párrafos hasta ~CARACTERES_POR_FRAGMENTO, corta
 * los muy largos por un espacio, y repite un poco del final del anterior para no
 * partir una idea por la mitad.
 */
export function trocear(texto: string, tam = CARACTERES_POR_FRAGMENTO, solape = SOLAPE_ENTRE_FRAGMENTOS): string[] {
  const limpio = normalizarTexto(texto);
  if (!limpio) return [];
  const fragmentos: string[] = [];
  let actual = '';
  const cerrar = () => { const t = actual.trim(); if (t) fragmentos.push(t); actual = ''; };
  for (const parrafo of limpio.split(/\n\s*\n/)) {
    let p = parrafo.trim();
    while (p.length > tam) {
      if (actual) cerrar();
      let corte = p.lastIndexOf(' ', tam);
      if (corte < tam / 2) corte = tam;
      fragmentos.push(p.slice(0, corte).trim());
      p = p.slice(Math.max(0, corte - solape)).trim();
    }
    if (!p) continue;
    if (actual && actual.length + p.length + 2 > tam) {
      const cola = actual.slice(-solape);
      cerrar();
      const inicio = cola.indexOf(' ');
      actual = inicio >= 0 ? cola.slice(inicio + 1) + '\n\n' : '';
    }
    actual += (actual && !actual.endsWith('\n\n') ? '\n\n' : '') + p;
  }
  cerrar();
  return fragmentos;
}

// ── Palabras (todos los idiomas de Weë) ──────────────────────────────────────

/* `Intl.Segmenter` existe en Node 24, pero la lib de TypeScript de este proyecto (es2017) no lo declara. */
interface Segmentador { segment(t: string): Iterable<{ segment: string; isWordLike?: boolean }> }
const SEGMENTADOR: Segmentador = new (Intl as unknown as { Segmenter: new (l: undefined, o: { granularity: 'word' }) => Segmentador }).Segmenter(undefined, { granularity: 'word' });
const LATINO_O_NUMERO = /^[\p{Script=Latin}\p{N}]+$/u;

/**
 * Las palabras de un texto, para buscar. `Intl.Segmenter` sabe partir también los
 * idiomas sin espacios (chino, japonés, jemer…). Se quitan solo los acentos
 * latinos/griegos/cirílicos (U+0300–U+036F): los signos de vocal del hindi o del
 * jemer forman parte de la palabra y se quedan.
 */
export function terminos(texto: string): string[] {
  const t = String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC').toLowerCase();
  const out: string[] = [];
  for (const s of SEGMENTADOR.segment(t)) {
    if (!s.isWordLike) continue;
    const w = s.segment;
    // Una letra latina suelta («a», «y») no dice nada; un carácter chino, sí.
    if (w.length >= 2 || !LATINO_O_NUMERO.test(w)) out.push(w);
  }
  return out;
}

// ── El índice de un archivo ──────────────────────────────────────────────────

export interface FragmentoIndexado {
  /** El texto del fragmento. */
  t: string;
  /** Frecuencia de cada palabra en el fragmento. */
  tf: Record<string, number>;
  /** Número de palabras. */
  n: number;
}

export interface IndiceDeArchivo {
  v: 1;
  archivoId: string;
  nombre: string;
  fragmentos: FragmentoIndexado[];
}

export interface ResultadoDeIndexar {
  indice: IndiceDeArchivo;
  caracteres: number;
  recortado: boolean;
}

export function indexarArchivo(archivoId: string, nombre: string, texto: string): ResultadoDeIndexar {
  const limpio = normalizarTexto(texto);
  const recortado = limpio.length > MAX_CARACTERES_POR_ARCHIVO;
  const usado = recortado ? limpio.slice(0, MAX_CARACTERES_POR_ARCHIVO) : limpio;
  const fragmentos = trocear(usado).map((t) => {
    const tf: Record<string, number> = Object.create(null);
    const palabras = terminos(t);
    for (const w of palabras) tf[w] = (tf[w] || 0) + 1;
    return { t, tf: { ...tf }, n: palabras.length };
  }).filter((f) => f.n > 0);
  return { indice: { v: 1, archivoId, nombre, fragmentos }, caracteres: usado.length, recortado };
}

/** Lee un índice guardado con desconfianza. `null` si no tiene la forma esperada. */
export function leerIndice(crudo: unknown): IndiceDeArchivo | null {
  const x = crudo as IndiceDeArchivo;
  if (!x || x.v !== 1 || typeof x.archivoId !== 'string' || !Array.isArray(x.fragmentos)) return null;
  const fragmentos = x.fragmentos.filter((f) => f && typeof f.t === 'string' && f.tf && typeof f.tf === 'object' && Number.isFinite(f.n) && f.n > 0);
  return { v: 1, archivoId: x.archivoId, nombre: String(x.nombre ?? ''), fragmentos };
}

// ── Buscar (BM25) ────────────────────────────────────────────────────────────

const K1 = 1.2;
const B = 0.75;

export interface Coincidencia { archivoId: string; nombre: string; texto: string; puntuacion: number }

/**
 * Los fragmentos que mejor responden a la consulta, entre todos los archivos del
 * personaje. BM25: cuenta las palabras de la consulta que aparecen en cada
 * fragmento, premia las palabras raras y no premia los fragmentos largos.
 */
export function buscarEnMaterial(indices: IndiceDeArchivo[], consulta: string, k = FRAGMENTOS_POR_RESPUESTA): Coincidencia[] {
  const palabras = [...new Set(terminos(consulta))];
  if (!palabras.length || k <= 0) return [];
  const todos = indices.flatMap((i) => i.fragmentos.map((f) => ({ i, f })));
  const N = todos.length;
  if (!N) return [];
  const promedio = todos.reduce((s, x) => s + x.f.n, 0) / N;
  const df = new Map<string, number>();
  for (const w of palabras) df.set(w, todos.reduce((s, x) => s + (x.f.tf[w] ? 1 : 0), 0));
  const puntuados: Coincidencia[] = [];
  for (const { i, f } of todos) {
    let p = 0;
    for (const w of palabras) {
      const tf = f.tf[w];
      if (!tf) continue;
      const d = df.get(w) || 0;
      const idf = Math.log(1 + (N - d + 0.5) / (d + 0.5));
      p += idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * f.n) / promedio)));
    }
    if (p > 0) puntuados.push({ archivoId: i.archivoId, nombre: i.nombre, texto: f.t, puntuacion: p });
  }
  return puntuados.sort((a, b) => b.puntuacion - a.puntuacion).slice(0, k);
}

/** Los fragmentos tal como entran al prompt: con tope total de caracteres. */
export function fragmentosParaElPrompt(coincidencias: Coincidencia[], tope = MAX_CARACTERES_DE_MATERIAL_EN_PROMPT): string[] {
  const out: string[] = [];
  let usados = 0;
  for (const c of coincidencias) {
    const resto = tope - usados;
    if (resto < 80) break;
    const t = c.texto.length > resto ? c.texto.slice(0, resto).replace(/\s+\S*$/, '') + '…' : c.texto;
    out.push(t);
    usados += t.length;
  }
  return out;
}
