/**
 * EN QUÉ IDIOMA ESCRIBE EL SERVIDOR LO QUE ESCRIBE ÉL SOLO (el push y la página pública).
 *
 * Los textos salen de los diccionarios de la app (`./textosDelServidor.ts`, generado). Aquí solo se elige cuál, con
 * la misma cadena que usa la app (`i18n/resolver.ts`): el locale, su idioma y el inglés, que es el respaldo de Weë.
 * Con una diferencia que no es un descuido: SIN IDIOMA —una cuenta antigua que nunca lo guardó, un navegador que no
 * dice el suyo— se escribe en español, que es lo que escribía el servidor antes de esto. Nadie deja de entender lo
 * que entendía ayer.
 */
export type TablaDeTextos = Readonly<Record<string, string>>;

/**
 * Una etiqueta de idioma en su forma canónica ('da-dk' → 'da-DK', 'zh-hant-tw' → 'zh-Hant-TW'), o null si no lo es.
 * La sabe `Intl.getCanonicalLocales`, sin el Core: lo que llega del cliente o de una cabecera se acepta solo si tiene
 * forma de idioma, y nada más se guarda ni se usa.
 */
export const etiquetaDeIdioma = (crudo: unknown): string | null => {
  if (typeof crudo !== 'string') return null;
  const limpio = crudo.trim();
  if (!limpio || limpio.length > 35 || !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{1,8})*$/.test(limpio)) return null;
  try {
    return Intl.getCanonicalLocales(limpio)[0] ?? null;
  } catch {
    return null;
  }
};

export const tablaDelIdioma = (tablas: Readonly<Record<string, TablaDeTextos>>, crudo: unknown): TablaDeTextos => {
  const etiqueta = etiquetaDeIdioma(crudo);
  if (!etiqueta) return tablas.es;
  const idioma = etiqueta.split('-')[0];
  return tablas[etiqueta] || tablas[idioma] || tablas.en || tablas.es;
};

/** El primer idioma de un `Accept-Language` («da-DK,da;q=0.9,en;q=0.8» → «da-DK»), o null. */
export const idiomaDelNavegador = (cabecera: unknown): string | null => {
  if (typeof cabecera !== 'string' || !cabecera.trim()) return null;
  const preferidos = cabecera
    .split(',')
    .map((parte) => {
      const [etiqueta, ...params] = parte.trim().split(';');
      const q = params.map((p) => /^\s*q=([\d.]+)\s*$/.exec(p)).find(Boolean);
      return { etiqueta: etiqueta.trim(), peso: q ? Number(q[1]) : 1 };
    })
    .filter((p) => p.etiqueta && p.etiqueta !== '*' && p.peso > 0)
    .sort((a, b) => b.peso - a.peso);
  return preferidos.length ? etiquetaDeIdioma(preferidos[0].etiqueta) : null;
};

/** Mete los valores en el texto: '{{nombre}} en Weë' + {nombre:'Ana'}. Lo que no viene se deja como está. */
export const rellenarTexto = (texto: string, valores: Record<string, string | number> = {}): string =>
  texto.replace(/\{\{\s*(\w+)\s*\}\}/g, (entero, nombre: string) => (valores[nombre] === undefined ? entero : String(valores[nombre])));
