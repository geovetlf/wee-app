import { storageBucket } from '../engine/http';
import * as M from './material';

/*
 * LEER EL MATERIAL DEL PERSONAJE para responder (docs/AUTONOMIA.md § 1b).
 *
 * Aparte de ./materialServidor.ts a propósito: este módulo no declara Functions,
 * así que las acciones (./acciones.ts) pueden importarlo sin cargar disparadores.
 * Descargar un índice es leer del Storage: sin IA ni coste por consulta.
 */

// ── Con caché por instancia ─────────────────────────────────────────────────

/* El mismo bucket que el resto del motor (STORAGE_BUCKET o el de por defecto). */
const bucket = storageBucket;

const cache = new Map<string, { firma: string; indices: M.IndiceDeArchivo[] }>();

/** Tras borrar un archivo: que la próxima lectura vuelva a mirar el Storage. */
export const olvidarIndices = (perfilId: string): void => { cache.delete(perfilId); };

/** Los índices del material de un personaje. Si nada cambió desde la última vez, no se descarga otra vez. */
export async function indicesDelMaterial(perfilId: string): Promise<M.IndiceDeArchivo[]> {
  const [archivos] = await bucket().getFiles({ prefix: M.prefijoDeIndices(perfilId) });
  const firma = archivos.map((f) => `${f.name}@${f.metadata.generation}`).sort().join('|');
  const guardado = cache.get(perfilId);
  if (guardado && guardado.firma === firma) return guardado.indices;
  const indices = (await Promise.all(archivos.map(async (f) => {
    try { const [c] = await f.download(); return M.leerIndice(JSON.parse(c.toString('utf8'))); } catch { return null; }
  }))).filter((x): x is M.IndiceDeArchivo => Boolean(x));
  if (cache.size > 50) cache.clear();
  cache.set(perfilId, { firma, indices });
  return indices;
}

/** Los fragmentos del material que vienen al caso, listos para el prompt. Sin material, ninguno. */
export async function fragmentosDelMaterial(perfilId: string, consulta: string): Promise<string[]> {
  const indices = await indicesDelMaterial(perfilId);
  return M.fragmentosParaElPrompt(M.buscarEnMaterial(indices, consulta));
}
