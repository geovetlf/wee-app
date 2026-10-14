#!/usr/bin/env node
/*
 * HOOK Stop DEL BUILD GUARDIAN — `.claude/hooks/guardian-stop.mjs`.
 *
 * Propuesto en ops/harness/propuesta-settings-guardian.json; NO está registrado en ningún settings activo. Antes de
 * que Claude dé el trabajo por terminado, pasa las verificaciones obligatorias sobre lo que cambió en el árbol:
 *  1. la sintaxis de cada archivo cambiado (la misma comprobación rápida que el PostToolUse);
 *  2. el Build Guardian ESTRICTO sobre el diff (`cambio --base HEAD`) con el criterio de la CI (POLITICA_CI);
 *  3. el Guardian estricto `antes` sobre los archivos sin seguimiento (no entran en el diff), bloqueando solo las
 *     rutas de secretos.
 * Si algo bloquea, o el Guardian FALLA (tiempo, error, informe incoherente: guardian-estricto.mjs), responde
 * `{"decision":"block","reason":…}` y Claude sigue trabajando con el motivo. Un FALLO nunca es verde.
 *
 * Sin bucles: si `stop_hook_active` es true (Claude ya sigue por un Stop anterior) sale 0 en el acto; además Claude
 * Code corta a las 8 continuaciones. Si el propio hook falla (entrada ilegible, excepción) también bloquea —falla
 * cerrado— con el motivo; `stop_hook_active` lo acota a una vez. Solo lee: git status y el Guardian, que no escribe.
 * Lo fija functions/test/guardian-hooks.test.mjs.
 */
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
/* Sin dependencias: si un módulo del Guardian no carga, el hook sigue pudiendo leer y responder (no falla abierto). */
const leerJSON = async (stdin) => {
  let t = '';
  for await (const x of stdin) { t += x; if (t.length > 1024 * 1024) throw new Error('la entrada del hook pasa de 1 MB'); }
  const d = JSON.parse(t);
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('la entrada del hook no es un objeto JSON');
  return d;
};

const PROYECTO_POR_DEFECTO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const TIEMPO_GUARDIAN_MS = 4 * 60 * 1000;
/** Tope de TODO el hook: por debajo del `timeout` propuesto (600 s), para responder antes de que Claude Code lo mate. */
export const PRESUPUESTO_MS = 8 * 60 * 1000;
export const LOTE = 100;
/** Más lotes de archivos sin seguimiento que esto no se revisan: se bloquea diciendo cuántos (sin gasto sin fin). */
export const MAX_LOTES = 5;

/** Pura: `git status --porcelain=v1 -z --untracked-files=all` → { seguidos, nuevos } (sin borrados). */
export const partirEstado = (texto) => {
  const campos = String(texto || '').split('\0');
  const seguidos = [];
  const nuevos = [];
  for (let i = 0; i < campos.length; i++) {
    const c = campos[i];
    if (c.length < 4) continue;
    const xy = c.slice(0, 2);
    const ruta = c.slice(3).replace(/\\/g, '/');
    if (xy[0] === 'R' || xy[0] === 'C') i++; // el campo siguiente es la ruta de origen
    if (xy === '??') nuevos.push(ruta);
    else if (!xy.includes('D')) seguidos.push(ruta);
  }
  return { seguidos, nuevos };
};

const bloquear = (motivos) => ({ decision: 'block', reason: `Build Guardian (antes de terminar): ${motivos.join(' · ')}` });

/** Las verificaciones. `ejecutar` y `estado` existen para las pruebas. */
export const decidirStop = async (datos, {
  raiz, ejecutar, estado, politica, tiempoMs = TIEMPO_GUARDIAN_MS, presupuestoMs = PRESUPUESTO_MS, ahora = Date.now,
} = {}) => {
  if (datos.stop_hook_active === true) return { salida: null, motivo: 'stop_hook_active: no se repite' };
  const limite = ahora() + presupuestoMs;
  const { ignorada, clasificarRuta, revisarSintaxis } = await import('./guardian-comun.mjs');
  const est = estado ? estado(raiz) : spawnSync('git', ['-C', raiz, 'status', '--porcelain=v1', '-z', '--untracked-files=all'], { encoding: 'utf8', windowsHide: true });
  if (!est || est.status !== 0) {
    return { salida: bloquear([`no se pudo leer git status en ${raiz} (${String(est?.stderr || est?.error?.message || 'sin salida').trim().slice(0, 200)}): no se sabe qué cambió`]) };
  }
  const { seguidos, nuevos } = partirEstado(est.stdout);
  const s = seguidos.filter((r) => !ignorada(r));
  const n = nuevos.filter((r) => !ignorada(r));
  if (!s.length && !n.length) return { salida: null, motivo: 'sin cambios' };
  const motivos = [];
  for (const r of [...s, ...n]) { const e = revisarSintaxis(raiz, r); if (e) motivos.push(e); }
  const nuevosSecretos = n.filter((r) => clasificarRuta(raiz, r).secreto);
  for (const r of nuevosSecretos) motivos.push(`${r} es un archivo de secretos sin seguimiento: que no entre en ningún commit`);
  const c = await import('../../ops/harness/guardian-ci.mjs');
  if (!ejecutar) ejecutar = (await import('../../ops/harness/guardian-estricto.mjs')).ejecutarGuardianEstricto;
  if (!politica) politica = [...c.POLITICA_CI];
  /* Cada llamada lleva el tiempo que queda del presupuesto; sin presupuesto, no se llama y es FALLO (no verde). */
  const conTiempo = (pedido) => {
    const queda = limite - ahora();
    if (queda < 5000) return { resultado: 'FALLO', bloquean: [], motivo: `presupuesto del hook agotado (${Math.round(presupuestoMs / 1000)} s): no se revisó` };
    return ejecutar({ ...pedido, tiempoMs: Math.min(tiempoMs, queda) });
  };
  const resultados = [];
  if (s.length) resultados.push(['diff', conTiempo({ modo: 'cambio', raiz, base: 'HEAD', bloquear: politica })]);
  const nuevosRevisables = n.filter((r) => !nuevosSecretos.includes(r));
  const lotes = [];
  for (let i = 0; i < nuevosRevisables.length; i += LOTE) lotes.push(nuevosRevisables.slice(i, i + LOTE));
  if (lotes.length > MAX_LOTES) motivos.push(`${nuevosRevisables.length} archivos sin seguimiento: más de ${MAX_LOTES * LOTE} no se revisan (tope de gasto); ignóralos en .gitignore o revísalos por partes`);
  for (const lote of lotes.slice(0, MAX_LOTES)) resultados.push(['sin seguimiento', conTiempo({ modo: 'antes', raiz, archivos: lote, bloquear: ['ruta-protegida:deny'] })]);
  for (const [que, r] of resultados) {
    if (r.resultado === 'BLOQUEA') motivos.push(`Guardian (${que}) BLOQUEA: ${r.bloquean.join(', ')}`);
    else if (r.resultado !== 'PASA') motivos.push(`Guardian (${que}) FALLÓ y no hay verde: ${r.motivo}`);
  }
  if (motivos.length) return { salida: bloquear(motivos), llamadas: resultados.length };
  /* OBSERVACIÓN (no bloquea): lo que toca las protecciones del propio Guardian necesita una revisión independiente. */
  const propias = c.tocaProteccionesPropias([...s, ...n]);
  if (propias.length) {
    return {
      llamadas: resultados.length, motivo: 'todo pasa (con autoprotección en observación)',
      salida: { systemMessage: `Build Guardian · OBSERVACIÓN: hay cambios en las protecciones del propio Guardian (${propias.slice(0, 8).join(', ')}${propias.length > 8 ? '…' : ''}); su verde no es independiente: que los revise una persona antes de integrarlos.` },
    };
  }
  return { salida: null, motivo: 'todo pasa', llamadas: resultados.length };
};

export const principal = async ({ stdin = process.stdin, entorno = process.env, escribir = (t) => process.stdout.write(t), opciones = {} } = {}) => {
  let datos;
  try { datos = await leerJSON(stdin); } catch (e) {
    escribir(JSON.stringify(bloquear([`la entrada del hook es ilegible (${e.message}): no se pudo verificar nada`])));
    return 0;
  }
  const raiz = path.resolve(entorno.CLAUDE_PROJECT_DIR || datos.cwd || PROYECTO_POR_DEFECTO);
  let r;
  try { r = await decidirStop(datos, { raiz, ...opciones }); } catch (e) {
    if (datos.stop_hook_active === true) return 0;
    escribir(JSON.stringify(bloquear([`el hook falló por dentro (${e && e.message}): no hay verde`])));
    return 0;
  }
  if (r.salida) escribir(JSON.stringify(r.salida));
  return 0;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal().then(
    (codigo) => { process.exitCode = codigo; },
    (e) => {
      process.stderr.write(`Build Guardian (Stop): falló por dentro, no hay verde (${e && e.message}).\n`);
      process.exitCode = 2;
    },
  );
}
