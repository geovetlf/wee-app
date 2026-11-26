import { unzipSync } from 'fflate';
import { FormatoDeMaterial, MAX_CARACTERES_POR_ARCHIVO } from './material';

/*
 * Sacar el texto de un archivo del material del personaje, SIN IA ni APIs de pago
 * (decisión del dueño, 2026-11-22: subir no le cuesta nada a Weë).
 *
 *   · PDF  → unpdf (pdf.js de Mozilla empaquetado para servidor, MIT).
 *   · DOCX → mammoth (BSD-2).
 *   · EPUB → fflate (MIT) abre el zip y se leen sus capítulos en el orden del libro.
 *   · TXT / MD → tal cual, como UTF-8.
 *
 * Un PDF escaneado (fotos de páginas) no tiene texto: leerlo pediría OCR con IA,
 * que tiene coste, así que se rechaza con el motivo `sinTexto`.
 */

/** Lo más que puede ocupar un DOCX descomprimido (un libro largo cabe de sobra). */
export const MAX_DOCX_DESCOMPRIMIDO = 60 * 1024 * 1024;

export class ErrorDeExtraccion extends Error {
  constructor(public readonly motivo: 'sinTexto' | 'ilegible') { super(motivo); }
}

/** Tope de lo que se descomprime de un EPUB (contra zips «bomba»). */
const MAX_BYTES_DESCOMPRIMIDOS = 40 * 1024 * 1024;

const decodificar = (bytes: Uint8Array): string => new TextDecoder('utf-8', { fatal: false }).decode(bytes);

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** De XHTML a texto: bloques → saltos de línea, sin etiquetas, entidades resueltas. */
export function textoDeXhtml(xhtml: string): string {
  return xhtml
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|section|tr)>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ' ';
      }
      return ENTIDADES[e.toLowerCase()] ?? m;
    });
}

const atributo = (etiqueta: string, nombre: string): string | null => {
  const m = new RegExp(`\\b${nombre}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(etiqueta);
  return m ? (m[2] ?? m[3] ?? null) : null;
};

const unirRuta = (base: string, relativa: string): string => {
  const partes = (base.includes('/') ? base.slice(0, base.lastIndexOf('/') + 1) : '').concat(decodeURIComponent(relativa.split('#')[0])).split('/');
  const out: string[] = [];
  for (const p of partes) { if (p === '..') out.pop(); else if (p && p !== '.') out.push(p); }
  return out.join('/');
};

/** El texto de un EPUB, capítulo a capítulo en el orden de lectura (spine). */
export function textoDeEpub(bytes: Uint8Array): string {
  let total = 0;
  const archivos = unzipSync(bytes, {
    filter: (f) => {
      if (!/\.(xhtml|html|htm|opf|xml)$/i.test(f.name)) return false;
      total += f.originalSize;
      return f.originalSize < 10 * 1024 * 1024 && total <= MAX_BYTES_DESCOMPRIMIDOS;
    },
  });
  const contenedor = archivos['META-INF/container.xml'];
  const rutaOpf = contenedor ? atributo(/<rootfile\b[^>]*>/i.exec(decodificar(contenedor))?.[0] ?? '', 'full-path') : null;
  const opf = rutaOpf ? archivos[rutaOpf] : undefined;
  let orden: string[] = [];
  if (opf && rutaOpf) {
    const xml = decodificar(opf);
    const manifiesto = new Map<string, string>();
    for (const m of xml.matchAll(/<item\b[^>]*>/gi)) {
      const id = atributo(m[0], 'id'), href = atributo(m[0], 'href');
      if (id && href) manifiesto.set(id, unirRuta(rutaOpf, href));
    }
    orden = [...xml.matchAll(/<itemref\b[^>]*>/gi)].map((m) => manifiesto.get(atributo(m[0], 'idref') ?? '') ?? '').filter(Boolean);
  }
  // Sin un índice legible, los capítulos en orden alfabético: mejor eso que nada.
  if (!orden.length) orden = Object.keys(archivos).filter((n) => /\.(xhtml|html|htm)$/i.test(n)).sort();
  return orden.map((ruta) => (archivos[ruta] ? textoDeXhtml(decodificar(archivos[ruta])) : '')).join('\n\n');
}

export async function extraerTexto(bytes: Uint8Array, formato: FormatoDeMaterial): Promise<string> {
  let texto = '';
  try {
    if (formato === 'txt' || formato === 'md') texto = decodificar(bytes);
    else if (formato === 'epub') texto = textoDeEpub(bytes);
    else if (formato === 'docx') {
      /*
       * Un DOCX es un ZIP: antes de dárselo a mammoth (que descomprime sin límite) se
       * suma lo que ocuparía descomprimido, leyendo solo el índice. Una «bomba» de
       * compresión se rechaza como ilegible en vez de tirar la función (auditoría M4).
       */
      let descomprimido = 0;
      unzipSync(bytes, { filter: (f) => { descomprimido += f.originalSize || 0; return false; } });
      if (descomprimido > MAX_DOCX_DESCOMPRIMIDO) throw new ErrorDeExtraccion('ilegible');
      const mammoth = await import('mammoth');
      texto = (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value;
    } else if (formato === 'pdf') {
      // unpdf publica sus tipos solo para ESM (.d.mts); aquí se usa su build CommonJS con la forma mínima que hace falta.
      const { getDocumentProxy, extractText } = require('unpdf') as {
        getDocumentProxy(datos: Uint8Array): Promise<unknown>;
        extractText(pdf: unknown, opciones: { mergePages: false }): Promise<{ totalPages: number; text: string[] | string }>;
      };
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const r = await extractText(pdf, { mergePages: false });
      texto = (Array.isArray(r.text) ? r.text : [r.text]).join('\n\n');
    }
  } catch {
    throw new ErrorDeExtraccion('ilegible');
  }
  // Un margen sobre el tope: el recorte fino (y su aviso) lo hace `indexarArchivo`.
  texto = texto.slice(0, MAX_CARACTERES_POR_ARCHIVO + 10_000);
  if (texto.replace(/\s+/g, '').length < 20) throw new ErrorDeExtraccion('sinTexto');
  return texto;
}
