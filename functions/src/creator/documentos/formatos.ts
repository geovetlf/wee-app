import { inflateRawSync } from 'node:zlib';
import { ErrorDeDocumento, LIMITES } from './contrato';

/**
 * Detección y extracción de texto. Sin dependencias: lector ZIP mínimo (DOCX y EPUB son ZIP) con topes anti zip-bomb.
 * El formato se decide por los BYTES, no por la extensión ni por el tipo que declara el cliente.
 */

const TOPE_ENTRADA = 25 * 1024 * 1024;
const TOPE_TOTAL = 60 * 1024 * 1024;
const TOPE_ENTRADAS = 5000;

interface EntradaZip { nombre: string; metodo: number; comprimido: number; tamano: number; desplazamiento: number }

const leerZip = (buf: Buffer): Map<string, EntradaZip> => {
  const ventana = Math.max(0, buf.length - 65_557);
  let eocd = -1;
  for (let i = buf.length - 22; i >= ventana; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new ErrorDeDocumento('archivo_danado', 'zip sin directorio central');
  const total = buf.readUInt16LE(eocd + 10);
  let pos = buf.readUInt32LE(eocd + 16);
  if (total > TOPE_ENTRADAS) throw new ErrorDeDocumento('archivo_danado', 'zip con demasiadas entradas');
  const entradas = new Map<string, EntradaZip>();
  let suma = 0;
  for (let n = 0; n < total; n++) {
    if (pos + 46 > buf.length || buf.readUInt32LE(pos) !== 0x02014b50) throw new ErrorDeDocumento('archivo_danado', 'zip ilegible');
    const metodo = buf.readUInt16LE(pos + 10);
    const comprimido = buf.readUInt32LE(pos + 20);
    const tamano = buf.readUInt32LE(pos + 24);
    const largoNombre = buf.readUInt16LE(pos + 28);
    const extra = buf.readUInt16LE(pos + 30);
    const comentario = buf.readUInt16LE(pos + 32);
    const desplazamiento = buf.readUInt32LE(pos + 42);
    const nombre = buf.toString('utf8', pos + 46, pos + 46 + largoNombre);
    suma += tamano;
    if (tamano > TOPE_ENTRADA || suma > TOPE_TOTAL) throw new ErrorDeDocumento('archivo_danado', 'zip demasiado grande al descomprimir');
    entradas.set(nombre, { nombre, metodo, comprimido, tamano, desplazamiento });
    pos += 46 + largoNombre + extra + comentario;
  }
  return entradas;
};

const extraerEntrada = (buf: Buffer, e: EntradaZip): Buffer => {
  const p = e.desplazamiento;
  if (p + 30 > buf.length || buf.readUInt32LE(p) !== 0x04034b50) throw new ErrorDeDocumento('archivo_danado', 'zip ilegible');
  const inicio = p + 30 + buf.readUInt16LE(p + 26) + buf.readUInt16LE(p + 28);
  const datos = buf.subarray(inicio, inicio + e.comprimido);
  if (e.metodo === 0) return Buffer.from(datos);
  if (e.metodo !== 8) throw new ErrorDeDocumento('archivo_danado', 'compresion no admitida');
  try {
    return inflateRawSync(datos, { maxOutputLength: TOPE_ENTRADA });
  } catch {
    throw new ErrorDeDocumento('archivo_danado', 'zip no se pudo descomprimir');
  }
};

const entidades = (s: string): string =>
  s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, e: string) => {
    const k = e.toLowerCase();
    if (k === 'amp') return '&';
    if (k === 'lt') return '<';
    if (k === 'gt') return '>';
    if (k === 'quot') return '"';
    if (k === 'apos') return "'";
    if (k === 'nbsp') return ' ';
    const cp = k.startsWith('#x') ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
    return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : '';
  });

const limpiar = (s: string): string =>
  s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

/** Texto de un DOCX: párrafos en líneas, estilos «Heading/Título n» como «# ». */
export const textoDeDocx = (buf: Buffer): string => {
  const zip = leerZip(buf);
  const doc = zip.get('word/document.xml');
  if (!doc) throw new ErrorDeDocumento('archivo_danado', 'docx sin document.xml');
  const xml = extraerEntrada(buf, doc).toString('utf8');
  const parrafos = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [];
  const lineas = parrafos.map((p) => {
    const titulo = /<w:pStyle\s+w:val="(?:Heading\s*\d|Title|T[^"]{0,3}tulo\s*\d?)"/i.test(p);
    const texto = p
      .replace(/<w:tab\s*\/>/g, '\t')
      .replace(/<w:br\s*\/>/g, '\n')
      .replace(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g, '$1\u0001')
      .replace(/<[^>]+>/g, '')
      .replace(/\u0001/g, '');
    const t = entidades(texto).trim();
    return t && titulo ? `# ${t}` : t;
  });
  return limpiar(lineas.join('\n'));
};

const relativa = (base: string, href: string): string => {
  let limpio = href.split('#')[0];
  try { limpio = decodeURIComponent(limpio); } catch { /* se queda como llegó */ }
  const partes = (base ? base.split('/') : []).concat(limpio.split('/'));
  const salida: string[] = [];
  for (const p of partes) {
    if (!p || p === '.') continue;
    if (p === '..') salida.pop();
    else salida.push(p);
  }
  return salida.join('/');
};

/** Texto de un EPUB: los documentos de la columna en el orden de lectura, h1–h3 como «# ». */
export const textoDeEpub = (buf: Buffer): string => {
  const zip = leerZip(buf);
  const contenedor = zip.get('META-INF/container.xml');
  if (!contenedor) throw new ErrorDeDocumento('archivo_danado', 'epub sin container.xml');
  const ruta = /full-path="([^"]+)"/.exec(extraerEntrada(buf, contenedor).toString('utf8'))?.[1];
  const opfEntrada = ruta ? zip.get(ruta) : undefined;
  if (!ruta || !opfEntrada) throw new ErrorDeDocumento('archivo_danado', 'epub sin paquete');
  const opf = extraerEntrada(buf, opfEntrada).toString('utf8');
  const base = ruta.includes('/') ? ruta.slice(0, ruta.lastIndexOf('/')) : '';
  const manifiesto = new Map<string, string>();
  for (const m of opf.match(/<item\s[^>]*>/g) ?? []) {
    const id = /\bid="([^"]+)"/.exec(m)?.[1];
    const href = /\bhref="([^"]+)"/.exec(m)?.[1];
    if (id && href) manifiesto.set(id, href);
  }
  const orden = (opf.match(/<itemref\s[^>]*>/g) ?? []).map((m) => /\bidref="([^"]+)"/.exec(m)?.[1]).filter(Boolean) as string[];
  const secciones: string[] = [];
  for (const idref of orden) {
    const href = manifiesto.get(idref);
    const entrada = href ? zip.get(relativa(base, href)) : undefined;
    if (!entrada || !/\.(x?html?)$/i.test(entrada.nombre)) continue;
    const html = extraerEntrada(buf, entrada).toString('utf8');
    const cuerpo = (/<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html)
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi, (_, t: string) => `\n\n# ${t.replace(/<[^>]+>/g, '').trim()}\n\n`)
      .replace(/<\/(p|div|li|tr|blockquote)>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '');
    secciones.push(entidades(cuerpo));
  }
  return limpiar(secciones.join('\n\n'));
};

/** Páginas de un PDF por sus marcas; `undefined` si no se pueden contar (flujos de objetos). */
export const paginasDePdf = (buf: Buffer): number | undefined => {
  const t = buf.toString('latin1');
  const hojas = (t.match(/\/Type\s*\/Page(?![A-Za-z])/g) ?? []).length;
  let cuenta = 0;
  for (const m of t.matchAll(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/g)) cuenta = Math.max(cuenta, Number(m[1]));
  for (const m of t.matchAll(/\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages/g)) cuenta = Math.max(cuenta, Number(m[1]));
  const n = Math.max(hojas, cuenta);
  return n > 0 ? n : undefined;
};
const pdfCifrado = (buf: Buffer): boolean => /\/Encrypt\s/.test(buf.toString('latin1', Math.max(0, buf.length - 4096)));

export type DocumentoLeido =
  | { formato: 'txt' | 'md' | 'docx' | 'epub'; texto: string; caracteres: number }
  | { formato: 'pdf'; paginas?: number };

const esZip = (b: Buffer) => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 3 || b[2] === 5);
const esPdf = (b: Buffer) => b.subarray(0, 1024).includes(Buffer.from('%PDF-'));

/** Detecta el formato por los bytes y valida lo que se puede validar sin pagar nada. `nombre` solo desempata txt/md. */
export const leerDocumento = (buf: Buffer, nombre = ''): DocumentoLeido => {
  if (!buf.length) throw new ErrorDeDocumento('archivo_vacio', 'archivo vacio');
  if (buf.length > LIMITES.bytesArchivo) throw new ErrorDeDocumento('archivo_demasiado_grande', 'archivo demasiado grande');
  if (esPdf(buf)) {
    if (pdfCifrado(buf)) throw new ErrorDeDocumento('pdf_cifrado', 'pdf cifrado');
    const paginas = paginasDePdf(buf);
    if (paginas !== undefined && paginas > LIMITES.paginasPdf) throw new ErrorDeDocumento('pdf_demasiado_largo', 'pdf demasiado largo');
    return { formato: 'pdf', paginas };
  }
  let formato: 'txt' | 'md' | 'docx' | 'epub';
  let texto: string;
  if (esZip(buf)) {
    const nombres = [...leerZip(buf).keys()];
    if (nombres.includes('word/document.xml')) { formato = 'docx'; texto = textoDeDocx(buf); }
    else if (nombres.includes('META-INF/container.xml')) { formato = 'epub'; texto = textoDeEpub(buf); }
    else throw new ErrorDeDocumento('formato_no_admitido', 'zip que no es docx ni epub');
  } else {
    if (buf.includes(0)) throw new ErrorDeDocumento('formato_no_admitido', 'binario desconocido');
    texto = limpiar(buf.toString('utf8').replace(/^﻿/, ''));
    formato = /\.(md|markdown)$/i.test(nombre) ? 'md' : 'txt';
  }
  if (texto.length < 20) throw new ErrorDeDocumento('sin_texto', 'sin texto');
  if (texto.length > LIMITES.caracteresDeTexto) throw new ErrorDeDocumento('texto_demasiado_largo', 'texto demasiado largo');
  return { formato, texto, caracteres: texto.length };
};
