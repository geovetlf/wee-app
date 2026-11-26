/**
 * EL CDN DE PRUEBA DE LAS SUITES DE EMULADOR CON UN PROVEEDOR DE MENTIRA (Bloque B2, 2026-11-06).
 *
 * Es un módulo, no una suite (el guion bajo lo dice). Lo usan `video-asincrono`, `f1d` y `mundo3d` (`*.emulator.mjs`).
 *
 * Desde el paquete E del Gran Motor (2026-10-16) el materializador solo descarga el resultado de un destino PERMITIDO
 * (`destinoDeResultadoPermitido`, functions/src/content/materializador.ts): https, sin usuario ni clave, y un NOMBRE de
 * dominio público —nada de IP, ni `localhost`, ni nombres internos—. Es la puerta contra la fuga de credenciales de la
 * Function por un enlace manipulado, y estas suites no la tocan. Lo que cambia es el enlace que da el proveedor de mentira:
 * en vez de `http://127.0.0.1:<puerto>/…` (que la puerta, con razón, rechaza), un `https://<nombre>.invalid/…`
 * —`.invalid` está reservado y no existe en ningún DNS— y `fetch` desvía SOLO ese prefijo al servidor local de la suite,
 * con el mismo método, cabeceras, cuerpo y señal. Hace de CDN. Cualquier otra dirección pasa sin tocar.
 *
 * Devuelve el recuento de peticiones desviadas (para comprobar que el resultado se sirvió aquí) y cómo quitar el desvío.
 */

/** Pura: la dirección local a la que va una petición al CDN de prueba, o `null` si no es del CDN. */
export const direccionLocalDelCdn = (cdn, puerto, recurso) => {
  const url = typeof recurso === 'string' ? recurso : recurso instanceof URL ? recurso.href : undefined;
  if (!url || !url.startsWith(`${cdn}/`)) return null;
  return `http://127.0.0.1:${puerto}${url.slice(cdn.length)}`;
};

/**
 * Instala el desvío en `globalThis.fetch`. `cdn` es el origen https de prueba (sin barra final) y `servidor` el servidor
 * HTTP local de la suite, ya escuchando en 127.0.0.1.
 */
export const instalarCdnDePrueba = (cdn, servidor) => {
  if (!/^https:\/\/[a-z0-9.-]+\.invalid$/.test(cdn)) throw new Error(`CDN de prueba no válido: ${cdn} (https y .invalid, sin barra final)`);
  const fetchDelSistema = globalThis.fetch;
  const desvios = { total: 0 };
  globalThis.fetch = (recurso, opciones) => {
    const local = direccionLocalDelCdn(cdn, servidor.address().port, recurso);
    if (local) {
      desvios.total++;
      return fetchDelSistema(local, opciones);
    }
    return fetchDelSistema(recurso, opciones);
  };
  return { desvios, quitar: () => { globalThis.fetch = fetchDelSistema; } };
};
