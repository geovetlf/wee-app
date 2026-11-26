/*
 * CUÁNTO MIDE UN TEXTO, SIN MEDIRLO (portada de WeëAI v2, 2026-11-17).
 *
 * En web `adjustsFontSizeToFit` no existe y en nativo no se puede preguntar el ancho de un texto antes de pintarlo, así que la portada decide
 * tamaños con una estimación en «em» por escritura: cuántos cuerpos de letra ocupa el texto. No es una medida exacta —es una cota algo
 * holgada—, pero distingue lo que importa: una letra CJK o hangul mide un cuerpo entero, una jemer o devanagari bastante más que una latina,
 * y una árabe o hebrea menos. Se contrastó en el navegador con la medida real (canvas) de los 42 idiomas; el informe de la portada tiene la tabla.
 */

/** Anchura típica de una letra en cuerpos de letra, por escritura. `latino` es la de latín, cirílico y griego (cambia según sea nombre corto o frase). */
const anchoDeLetra = (c: number, latino: number): number => {
  if ((c >= 0x3000 && c <= 0x9fff) || (c >= 0xac00 && c <= 0xd7af) || (c >= 0xff00 && c <= 0xffef)) return 1.0;
  if (c >= 0x1780 && c <= 0x17ff) return 0.78;
  if (c >= 0x0900 && c <= 0x097f) return 0.64;
  if ((c >= 0x0590 && c <= 0x05ff) || (c >= 0x0600 && c <= 0x06ff)) return 0.52;
  if (c === 0x200b || c === 0x200c || c === 0x200d) return 0;
  return latino;
};

/** El texto en cuerpos de letra (em). `latino`: 0,68 para nombres sueltos (cota holgada), ~0,5-0,58 para frases con espacios. */
export const emDeTexto = (texto: string, latino = 0.68): number => {
  let em = 0;
  for (const ch of texto) em += anchoDeLetra(ch.codePointAt(0) ?? 0, latino);
  return Math.max(em, 0.5);
};
