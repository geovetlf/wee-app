#!/usr/bin/env node
/*
 * EL GUARDIAN DE LA BASE CONTRA UN PR, SIN EJECUTAR NADA DEL PR — `ops/harness/guardian-pr.mjs`.
 *
 *   node ops/harness/guardian-pr.mjs [--evento <evento.json>] [--raiz <clon de la base>] [--remoto <remoto>]
 *
 * Lo ejecuta .github/workflows/guardian-base.yml (`on: pull_request_target`): GitHub lee ESE workflow de la rama base,
 * hace checkout de la base y corre ESTE archivo tal como está en la base. Un PR no puede cambiar ni el workflow ni este
 * código para su propia ejecución: es el único control del Guardian que no corre código del cambio que juzga.
 *
 * Qué hace, en orden (sale 0 PASA · 1 BLOQUEA · 3 FALLO; un fallo nunca es verde):
 *  1. Lee el evento (GITHUB_EVENT_PATH o --evento): número del PR y SHA de su cabeza. Nada del evento entra en un shell:
 *     el número se valida como entero y el SHA como 40 hex, y git los recibe como argumentos, nunca interpolados.
 *  2. Trae la cabeza del PR como DATOS: `git fetch <remoto> +refs/pull/<n>/head:refs/guardian/pr` y comprueba que es el
 *     SHA del evento (si el PR se movió, FALLO: ya llegará el evento del nuevo push).
 *  3. La base del diff es `git merge-base HEAD <cabeza>`: el diff es el `base...head` del PR.
 *  4. Saca la cabeza a una carpeta temporal fuera del checkout (`git worktree add --detach`), sin hooks
 *     (core.hooksPath vacío) y sin filtros de LFS. Esa carpeta solo se LEE: el Guardian parsea su TypeScript con la
 *     API de `typescript` (sin plugins, sin ejecutar), lee sus JSON y le pregunta a git; no importa, no requiere, no
 *     lanza nada de ella.
 *  5. Juzga ese árbol con el paso de CI DE LA BASE (`guardian-ci.mjs` → `guardian.mjs --estricto`, con su política
 *     y su guardia: los archivos de este checkout). La verificación anidada de guardian-base.mjs no hace falta (este
 *     Guardian YA es el de la base) y se apaga con GUARDIAN_DESDE_LA_BASE.
 *  6. Borra la carpeta temporal, el worktree y la referencia. Del checkout de la base no cambia ningún archivo.
 *
 * Confianza: lo que define la política y el mapa (`.claude/`, `ops/`, `docs/`) se lee del clon de la base, no del PR: un PR no
 *  puede juzgarse con reglas que él mismo cambia (GUARDIAN_CONFIANZA_RAIZ). El clon debe estar limpio, o es FALLO.
 *
 * Límites (docs y functions/test/guardian-base-workflow.test.mjs): solo actúa cuando main ya tiene este workflow; solo
 * BLOQUEA si su check («Guardian de la base (independiente)») está en los requeridos del ruleset de main, que es una
 * decisión del dueño; y algunas fuentes que el Guardian consulta del árbol juzgado (settings.json, produccion.json…)
 * son las del PR: cambiarlas sale como AUTOPROTECCIÓN y zona roja, y eso lo mira una persona.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pasoDeCI, CODIGO } from './guardian-ci.mjs';
import { MARCA_ANIDADA } from './guardian-base.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SHA40 = /^[0-9a-f]{40}$/;
export const REF_LOCAL = 'refs/guardian/pr';

/** Pura: lo que se necesita del evento de pull_request_target, validado; o { error }. */
export const datosDelEvento = (evento) => {
  const pr = evento?.pull_request;
  const numero = pr?.number ?? evento?.number;
  const cabeza = pr?.head?.sha;
  if (!Number.isSafeInteger(numero) || numero <= 0) return { error: 'el evento no trae un número de PR válido' };
  if (typeof cabeza !== 'string' || !SHA40.test(cabeza)) return { error: 'el evento no trae el SHA de la cabeza del PR (40 hex)' };
  return { numero, cabeza };
};

/** git sin hooks, sin LFS, sin preguntar nada y sin interpolar: argumentos, nunca un shell. */
const git = (raiz, args, extra = {}) => spawnSync('git', ['-C', raiz, '-c', `core.hooksPath=${extra.sinHooks}`, ...args], {
  encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024,
  env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_LFS_SKIP_SMUDGE: '1', GIT_CONFIG_NOSYSTEM: '1' },
});

/**
 * El control entero; devuelve { codigo, texto } sin salir del proceso. `raiz` es el clon de la base donde se traen los
 * datos (por defecto, este checkout); `remoto`, de dónde se traen.
 */
export const juzgarPR = ({ evento, raiz = REPO, remoto = 'origin', entorno = process.env } = {}) => {
  const fallo = (motivo) => ({ codigo: CODIGO.FALLO, resultado: 'FALLO', texto: `✘ Guardian de la base: FALLO — ${motivo}\n` });
  const d = datosDelEvento(evento);
  if (d.error) return fallo(d.error);
  let tmp;
  let worktree = null;
  try {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-guardian-pr-'));
    const sinHooks = path.join(tmp, 'sin-hooks');
    fs.mkdirSync(sinHooks);
    const g = (args) => git(raiz, args, { sinHooks });
    const sucioDelClon = String(g(['status', '--porcelain']).stdout || '').trim();
    if (sucioDelClon !== '') return fallo(`el clon de la base tiene cambios sin confirmar: el Guardian lee su política de ahí, así que no se juzga con un árbol sucio (${sucioDelClon.replace(/s+/g, ' ').slice(0, 160)})`);
    const f = g(['fetch', '--quiet', '--no-tags', '--no-recurse-submodules', remoto, `+refs/pull/${d.numero}/head:${REF_LOCAL}`]);
    if (f.status !== 0) return fallo(`no se pudo traer el PR #${d.numero} como datos (${String(f.stderr || '').trim().slice(0, 200)})`);
    const traido = String(g(['rev-parse', '--verify', '--quiet', `${REF_LOCAL}^{commit}`]).stdout || '').trim();
    if (traido !== d.cabeza) return fallo(`la cabeza del PR #${d.numero} ya no es ${d.cabeza} (es ${traido || 'nada'}): se juzgará con el evento del nuevo push`);
    const mb = g(['merge-base', 'HEAD', d.cabeza]);
    const base = String(mb.stdout || '').trim();
    if (mb.status !== 0 || !SHA40.test(base)) return fallo(`no hay merge-base entre la base y ${d.cabeza}`);
    worktree = path.join(tmp, 'pr');
    const w = g(['worktree', 'add', '--quiet', '--detach', worktree, d.cabeza]);
    if (w.status !== 0) { worktree = null; return fallo(`no se pudo sacar el PR a una carpeta de datos (${String(w.stderr || '').trim().slice(0, 200)})`); }
    const env = {
      PATH: entorno.PATH, HOME: entorno.HOME, SystemRoot: entorno.SystemRoot, NODE_OPTIONS: entorno.NODE_OPTIONS,
      GUARDIAN_BASE: base, GUARDIAN_CONFIANZA_RAIZ: path.resolve(raiz), [MARCA_ANIDADA]: '1', GIT_LFS_SKIP_SMUDGE: '1', GIT_TERMINAL_PROMPT: '0',
    };
    for (const k of Object.keys(env)) if (env[k] === undefined) delete env[k];
    const r = pasoDeCI({ raiz: worktree, entorno: env });
    const cabecera = `Guardian de la base (independiente) · código de ${REPO === raiz ? 'este checkout de la base' : REPO} · PR #${d.numero} · cabeza ${d.cabeza} · base del diff ${base}\n`
      + 'El veredicto lo da el Guardian de la BASE; ningún archivo del PR se ejecuta (se leen como datos).\n';
    return { codigo: r.codigo, resultado: r.resultado, texto: cabecera + r.texto };
  } catch (e) {
    return fallo(`fallo interno (${e && e.message})`);
  } finally {
    if (worktree) git(raiz, ['worktree', 'remove', '--force', worktree], { sinHooks: os.tmpdir() });
    git(raiz, ['worktree', 'prune'], { sinHooks: os.tmpdir() });
    git(raiz, ['update-ref', '-d', REF_LOCAL], { sinHooks: os.tmpdir() });
    if (tmp) { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* temporal */ } }
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    const opcion = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
    const rutaEvento = opcion('--evento') || process.env.GITHUB_EVENT_PATH;
    let evento = null;
    try { evento = JSON.parse(fs.readFileSync(rutaEvento, 'utf8')); } catch (e) { evento = null; }
    const { codigo, texto } = evento ? juzgarPR({ evento, raiz: path.resolve(opcion('--raiz') || REPO), remoto: opcion('--remoto') || 'origin' })
      : { codigo: CODIGO.FALLO, texto: `✘ Guardian de la base: FALLO — no se puede leer el evento (${rutaEvento || 'sin GITHUB_EVENT_PATH'})\n` };
    process.stdout.write(texto);
    process.exitCode = codigo;
  } catch (e) {
    console.error(`✘ Guardian de la base: FALLO interno — ${e && e.message}`);
    process.exitCode = CODIGO.FALLO;
  }
}
