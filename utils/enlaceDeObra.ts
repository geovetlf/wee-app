/**
 * LOS ENLACES A TIENDAS DE UNA WEË PAGE (dueño, 2026-11-23: «hazlo lo más fácil posible»).
 *
 * Nada se vende dentro de Weë: la página enseña enlaces a la tienda del creador (su web, Amazon, Etsy, una librería) y
 * un toque la abre, sin pantalla ni aviso intermedio. Solo se admite `https://`; si la persona pega «amazon.com/…», Weë
 * lo completa. `http://`, `javascript:`, `mailto:`… no son enlaces de tienda y se rechazan.
 *
 * El servidor (`normalizarEnlace` en functions/src/social/pages.ts) aplica la MISMA regla: esto solo ayuda a escribir.
 */

/** Devuelve el enlace listo (`https://…`) o null si no vale. Pura. */
export const normalizarEnlaceDeObra = (v: string): string | null => {
  const w = (v ?? '').trim();
  if (!w || w.length > 500 || /\s/.test(w)) return null;
  const tieneEsquema = /^[a-z][a-z0-9+.-]*:/i.test(w);
  if (tieneEsquema && !/^https:\/\//i.test(w)) return null;
  try {
    const u = new URL(tieneEsquema ? w : `https://${w}`);
    if (u.protocol !== 'https:' || !u.hostname.includes('.') || u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
};

/** El dominio que se enseña junto al nombre del enlace («amazon.com»), sin «www.». */
export const dominioDeEnlace = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};
