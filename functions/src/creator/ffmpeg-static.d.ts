/**
 * Tipos mínimos de `ffmpeg-static` mientras el paquete no esté en `functions/package.json` (porte de filmmaker/core,
 * 2026-11-18). El paquete exporta la RUTA de su binario (`module.exports = ruta`), o `null` si no lo bajó.
 *
 * BORRAR este archivo cuando se añada la dependencia (`npm install ffmpeg-static@^5.3.0 --prefix functions`, con
 * autorización): el paquete trae sus propios tipos.
 */
declare module 'ffmpeg-static' {
  const ruta: string | null;
  export = ruta;
}
