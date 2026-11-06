#!/usr/bin/env node
/*
 * HOOK PostToolUse DEL BUILD GUARDIAN — `.claude/hooks/guardian-post-edit.mjs`.
 *
 * Propuesto para `Edit|Write|MultiEdit|NotebookEdit` (ops/harness/propuesta-settings-guardian.json); NO está
 * registrado en ningún settings activo. Corre DESPUÉS de escribir: no puede deshacer nada, solo devolver un motivo a
 * Claude. Por eso es rápido (milisegundos, sin el Guardian completo, que tarda ~13 s en un archivo de functions/src) y
 * selectivo (solo el archivo tocado):
 *  · bloquea (`decision: "block"`) si el archivo quedó con la sintaxis rota (JSON, `.mjs`/`.cjs`, `.js` de Node) o si
 *    es una ruta de secretos (deny de settings.json, la guardia la negaría, o nombre de secreto) — sin abrirlo nunca;
 *  · avisa (`additionalContext`) si es zona roja o ruta protegida (`ask`): el permiso ya se pidió antes de escribir;
 *  · calla si el archivo está fuera del proyecto, en node_modules, .git o functions/lib, o no es de estas herramientas.
 * Lo completo (diff, G3, registros, producción) lo hace el hook Stop. Si el propio hook falla (entrada ilegible,
 * excepción) sale 2 con el motivo en stderr: Claude lo ve; no se calla. Lo fija functions/test/guardian-hooks.test.mjs.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
/* Sin dependencias: si un módulo del Guardian no carga, el hook sigue pudiendo leer y responder (no falla abierto). */
const leerJSON = async (stdin) => {
  let t = '';
  for await (const x of stdin) { t += x; if (t.length > 1024 * 1024) throw new Error('la entrada del hook pasa de 1 MB'); }
  const d = JSON.parse(t);
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('la entrada del hook no es un objeto JSON');
  return d;
};
/** Las piezas del Guardian, cargadas al usarse: un fallo de carga es un fallo del hook (sale 2), no un «sin opinión». */
export const dependencias = async () => ({ ...(await import('./guardian-comun.mjs')), ...(await import('../../ops/harness/guardian-ci.mjs')) });

export const HERRAMIENTAS = Object.freeze(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const PROYECTO_POR_DEFECTO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Pura salvo la lectura del archivo tocado: lo que el hook responde a una entrada ya parseada. */
export const decidirPostEdit = async (datos, { raiz, windows, deps } = {}) => {
  const { rutaDelProyecto, ignorada, clasificarRuta, revisarSintaxis, tocaProteccionesPropias } = deps || await dependencias();
  if (!HERRAMIENTAS.includes(datos.tool_name)) return { salida: null };
  const ti = datos.tool_input || {};
  const archivo = ti.file_path || ti.notebook_path;
  if (typeof archivo !== 'string' || !archivo) return { salida: null };
  const rel = rutaDelProyecto(archivo, raiz, { windows });
  if (!rel || ignorada(rel)) return { salida: null, rel };
  const c = clasificarRuta(raiz, rel);
  const bloqueos = [];
  if (c.secreto) bloqueos.push(`${rel} es una ruta de secretos o credenciales (${[...c.deny, c.guardia].filter(Boolean).join('; ') || 'nombre de secreto'}): no se versiona ni se comparte; revisa por qué se escribió.`);
  const sintaxis = c.secreto ? null : revisarSintaxis(raiz, rel);
  if (sintaxis) bloqueos.push(`${sintaxis}. Arréglalo antes de seguir.`);
  const avisos = [];
  if (c.zonasRojas.length) avisos.push(`zona roja ${c.zonasRojas.map((z) => `«${z}»`).join(', ')} (ops/revision/reglas.mjs): tocarla pide revisión`);
  if (c.ask && !c.secreto) avisos.push(`ruta protegida (${[...c.permisosAsk, c.guardia].filter(Boolean).join('; ')}): la aprueba el dueño`);
  if (tocaProteccionesPropias([rel]).length) avisos.push('AUTOPROTECCIÓN: es una protección del propio Guardian; el Guardian no puede validar su propio cambio: necesita una revisión independiente');
  const contexto = avisos.length ? `Build Guardian · ${rel}: ${avisos.join(' · ')}. Antes de terminar, el hook Stop pasará el Guardian completo.` : null;
  if (bloqueos.length) {
    return {
      rel, salida: {
        decision: 'block', reason: `Build Guardian: ${bloqueos.join(' ')}`,
        ...(contexto ? { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: contexto } } : {}),
      },
    };
  }
  if (contexto) return { rel, salida: { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: contexto } } };
  return { rel, salida: null };
};

export const principal = async ({ stdin = process.stdin, entorno = process.env, escribir = (t) => process.stdout.write(t), error = (t) => process.stderr.write(t) } = {}) => {
  let datos;
  try { datos = await leerJSON(stdin); } catch (e) {
    error(`Build Guardian (PostToolUse): entrada ilegible, no se pudo comprobar la edición (${e.message}).\n`);
    return 2;
  }
  const raiz = path.resolve(entorno.CLAUDE_PROJECT_DIR || datos.cwd || PROYECTO_POR_DEFECTO);
  let salida;
  try { ({ salida } = await decidirPostEdit(datos, { raiz })); } catch (e) {
    error(`Build Guardian (PostToolUse): falló por dentro y NO comprobó la edición (${e && e.message}).
`);
    return 2;
  }
  if (salida) escribir(JSON.stringify(salida));
  return 0;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal().then(
    (codigo) => { process.exitCode = codigo; },
    (e) => {
      process.stderr.write(`Build Guardian (PostToolUse): falló por dentro y NO comprobó la edición (${e && e.message}).\n`);
      process.exitCode = 2;
    },
  );
}
