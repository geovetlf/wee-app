/*
 * RESOLUTOR DEL GUARDIAN DE LA BASE — `ops/harness/guardian-base-resolver.mjs`.
 *
 * Lo carga Node con `--import` (vía NODE_OPTIONS) cuando `ops/harness/guardian-base.mjs` ejecuta el Guardian de la
 * BASE desde una copia temporal fuera del repositorio. Esa copia no tiene `node_modules`; aquí, y solo para los paquetes
 * (`typescript`), si la resolución normal falla se reintenta desde el ancla que da GUARDIAN_BASE_ANCLA (un archivo del
 * checkout que corre la CI). Las rutas relativas, `node:` y `file:` no se tocan: el código que se ejecuta es el de la base.
 * Se usa la copia DE LA BASE de este archivo, no la del cambio. No escribe nada.
 */
import { registerHooks } from 'node:module';

const ANCLA = process.env.GUARDIAN_BASE_ANCLA;
const ES_PAQUETE = (s) => typeof s === 'string' && !/^(\.|\/|[A-Za-z]:|file:|node:|data:)/.test(s);

if (ANCLA) {
  registerHooks({
    resolve(especificador, contexto, siguiente) {
      try { return siguiente(especificador, contexto); } catch (e) {
        if (e && e.code === 'ERR_MODULE_NOT_FOUND' && ES_PAQUETE(especificador)) return siguiente(especificador, { ...contexto, parentURL: ANCLA });
        throw e;
      }
    },
  });
}
