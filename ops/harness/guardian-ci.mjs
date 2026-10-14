#!/usr/bin/env node
/*
 * EL BUILD GUARDIAN EN LA CI, EN MODO BLOQUEANTE — `ops/harness/guardian-ci.mjs` (Nivel 3 de .github/workflows/ci.yml).
 *
 *   node ops/harness/guardian-ci.mjs [--raiz <dir>]
 *
 * Corre `guardian.mjs cambio --base <base> --estricto` con el criterio de la CI (`POLITICA_CI`) a través de
 * `guardian-estricto.mjs`, que no confunde un fallo con un verde. La base sale, en este orden, de GUARDIAN_BASE, del
 * evento de GitHub (GITHUB_EVENT_PATH: `pull_request.base.sha`, o `before` en un push que no cree la rama) o de
 * `git merge-base HEAD origin/main`. Sin `${{ }}` en el workflow: nada del evento entra en un shell.
 *
 * Salidas: 0 PASA · 1 BLOQUEA · 3 FALLO (sin base, tiempo agotado, Guardian roto, informe incoherente). Solo lee.
 * GUARDIAN_RAIZ hace lo mismo que --raiz (lo usan las pruebas para ejecutar el paso tal y como está en ci.yml).
 *
 * POLITICA_CI —qué CRITICAL bloquean— es una decisión: los demás CRITICAL (zona roja, ruta `ask`, código vivo en
 * producción, cercas, `permitido` del despliegue) son avisos legítimos de cuidado y bloquearlos pararía todo cambio
 * autorizado en Credits o en el motor. Se listan igualmente en la salida. Lo fija functions/test/guardian-bloqueante.test.mjs.
 *
 * AUTOPROTECCIÓN: si el diff toca las protecciones del propio Guardian (`PROTECCIONES_PROPIAS`), el mismo diff se juzga
 * además con el paso de CI de la BASE (`guardian-base.mjs`: su código, su política) y manda el peor resultado. Lo que
 * ejecuta esa verificación (este archivo, guardian-base.mjs y ci.yml) no lo puede validar ningún código del cambio:
 * se dice en la salida y queda para la revisión humana (CODEOWNERS).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ejecutarGuardianEstricto, TIEMPO_POR_DEFECTO_MS } from './guardian-estricto.mjs';
import { aTexto } from './guardian.mjs';
import { verificarDesdeLaBase, ORQUESTACION } from './guardian-base.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Los prefijos de id de CRITICAL que bloquean la CI (y el hook Stop). */
export const POLITICA_CI = Object.freeze(['g3:', 'registro:', 'guardia:', 'exports:', 'ruta-protegida:deny']);
export const CODIGO = Object.freeze({ PASA: 0, BLOQUEA: 1, FALLO: 3 });
const SHA = /^[0-9a-f]{7,40}$/i;
const CEROS = /^0+$/;

/** Pura: la base que da un evento de GitHub (o null). */
export const baseDelEvento = (evento) => {
  const pr = evento?.pull_request?.base?.sha;
  if (typeof pr === 'string' && SHA.test(pr)) return pr;
  const antes = evento?.before;
  if (typeof antes === 'string' && SHA.test(antes) && !CEROS.test(antes)) return antes;
  return null;
};

const gitLee = (raiz, args) => {
  const x = spawnSync('git', ['-C', raiz, ...args], { encoding: 'utf8', windowsHide: true });
  return x.status === 0 ? String(x.stdout).trim() : null;
};

/** La base del diff y de dónde sale; `{ error }` si no se puede saber (eso es FALLO, nunca un diff vacío). */
export const resolverBase = ({ raiz, entorno = process.env } = {}) => {
  if (entorno.GUARDIAN_BASE) return { base: entorno.GUARDIAN_BASE, origen: 'GUARDIAN_BASE' };
  if (entorno.GITHUB_EVENT_PATH) {
    let evento;
    try { evento = JSON.parse(fs.readFileSync(entorno.GITHUB_EVENT_PATH, 'utf8')); } catch (e) {
      return { error: `no se puede leer el evento de GitHub (${e.message})` };
    }
    const b = baseDelEvento(evento);
    if (b) return { base: b, origen: evento.pull_request ? 'pull_request.base.sha' : 'push.before' };
  }
  const mb = gitLee(raiz, ['merge-base', 'HEAD', 'origin/main']);
  if (mb) return { base: mb, origen: 'merge-base HEAD origin/main' };
  return { error: 'no hay base: ni GUARDIAN_BASE, ni evento de GitHub con base, ni origin/main en este clon' };
};

/**
 * Las protecciones del propio Guardian: un cambio que las toca se juzga con el código que él mismo trae, así que
 * su verde no es una verificación independiente. Se dice siempre (OBSERVACIÓN: no bloquea) para que lo mire una persona.
 */
export const PROTECCIONES_PROPIAS = Object.freeze([
  'ops/harness/guardian*.mjs', 'ops/harness/guardian-politica.json', 'ops/harness/propuesta-settings-guardian.json', 'ops/revision/**', 'ops/permitido.mjs',
  '.claude/hooks/**', '.claude/settings.json', '.github/workflows/ci.yml', 'scripts/ci-local.mjs', 'functions/test/_cadena.mjs',
  'functions/test/guardian-*.test.mjs', 'functions/test/harness-guardian.test.mjs',
]);
const globRe = (g) => new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*')}$`);
const PROPIAS_RE = PROTECCIONES_PROPIAS.map(globRe);
export const tocaProteccionesPropias = (rutas) => (Array.isArray(rutas) ? rutas.filter((r) => PROPIAS_RE.some((re) => re.test(r))) : []);

/** Pura: lo que queda en OBSERVACIÓN (se informa, no bloquea): los CRITICAL fuera de la política y la autoprotección. */
export const observacion = (informe) => {
  if (!informe) return { criticos: [], propias: [] };
  const criticos = [...(informe.hallazgos || []), ...(informe.omitidos || [])].filter((x) => x.nivel === 'CRITICAL')
    .map((x) => x.id).filter((id) => !POLITICA_CI.some((p) => id === p || id.startsWith(p))).sort();
  return { criticos, propias: tocaProteccionesPropias(informe.entrada?.rutas) };
};

/** Pura: el peor de dos resultados (FALLO > BLOQUEA > PASA). Un fallo nunca se tapa con un verde. */
export const peor = (a, b) => (['FALLO', 'BLOQUEA', 'PASA'].find((x) => x === a || x === b) || 'FALLO');

/** Las rutas del diff con la base más lo que git no sigue (solo lectura); [] si git no responde. */
const rutasDelDiff = (raiz, base) => {
  const d = gitLee(raiz, ['diff', '--name-only', base]);
  const n = gitLee(raiz, ['ls-files', '--others', '--exclude-standard']);
  return [...(d ? d.split('\n') : []), ...(n ? n.split('\n') : [])].filter(Boolean);
};

/**
 * El paso de CI entero; devuelve { codigo, texto } sin salir del proceso. Si el diff toca las protecciones del propio
 * Guardian, el mismo diff se juzga también con el paso de CI de la BASE y cuenta el peor de los dos.
 */
export const pasoDeCI = ({ raiz, entorno = process.env, tiempoMs = TIEMPO_POR_DEFECTO_MS, ejecutar = ejecutarGuardianEstricto, verificarBase = verificarDesdeLaBase } = {}) => {
  const b = resolverBase({ raiz, entorno });
  if (b.error) return { codigo: CODIGO.FALLO, resultado: 'FALLO', texto: `✘ Build Guardian (estricto): FALLO — ${b.error}\n` };
  const r = ejecutar({ modo: 'cambio', raiz, base: b.base, bloquear: [...POLITICA_CI], tiempoMs, env: entorno });
  const cabecera = `Build Guardian (estricto) · base ${b.base} (${b.origen}) · bloquean: ${POLITICA_CI.join(' ')}`;
  const cuerpo = r.informe ? aTexto(r.informe) : '';
  const obs = observacion(r.informe);
  /* Sin informe (el Guardian del cambio falló) las rutas salen de git: la verificación de la base no se salta. */
  const propias = obs.propias.length ? obs.propias : (r.informe ? [] : tocaProteccionesPropias(rutasDelDiff(raiz, b.base)));
  const vb = propias.length ? verificarBase({ raiz, base: b.base, entorno, tiempoMs }) : { estado: 'NO_APLICA' };
  const juzga = ['PASA', 'BLOQUEA', 'FALLO'].includes(vb.estado);
  const orquestacion = propias.filter((p) => ORQUESTACION.includes(p));
  const lineasObs = [
    obs.criticos.length ? `OBSERVACIÓN (no bloquea): ${obs.criticos.length} CRITICAL fuera de la política: ${obs.criticos.join(', ')}` : null,
    propias.length ? `OBSERVACIÓN · AUTOPROTECCIÓN: este cambio toca las protecciones del propio Guardian (${propias.join(', ')}); su verde lo da el código que trae el cambio: necesita una revisión humana independiente` : null,
    vb.estado === 'NO_DISPONIBLE' ? `OBSERVACIÓN · VERIFICACIÓN INDEPENDIENTE NO DISPONIBLE (no bloquea): ${vb.motivo}` : null,
    juzga ? `VERIFICACIÓN INDEPENDIENTE (Guardian de la base ${b.base}): ${vb.estado} — ${vb.motivo}${vb.estado !== 'PASA' && vb.cola ? `\n${vb.cola}` : ''}` : null,
    orquestacion.length ? `OBSERVACIÓN · AUTOPROTECCIÓN (no bloquea): ${orquestacion.join(', ')} es el camino que ejecuta esta verificación; ningún código del propio cambio lo puede validar: solo una revisión humana (CODEOWNERS)` : null,
  ].filter(Boolean);
  const resultado = juzga ? peor(r.resultado, vb.estado) : r.resultado;
  const motivo = resultado === r.resultado ? r.motivo : `${vb.estado === 'FALLO' ? 'la verificación con el Guardian de la base falló' : 'el Guardian de la base bloquea'}: ${vb.motivo}`;
  const marca = resultado === 'PASA' ? '✔' : '✘';
  return {
    codigo: CODIGO[resultado] ?? CODIGO.FALLO, resultado, observacion: obs, verificacionBase: vb,
    texto: `${cabecera}\n${cuerpo}\n${lineasObs.length ? `${lineasObs.join('\n')}\n` : ''}${marca} ${resultado}: ${motivo}\n`,
  };
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    const i = args.indexOf('--raiz');
    const raiz = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : process.env.GUARDIAN_RAIZ || REPO);
    const { codigo, texto } = pasoDeCI({ raiz });
    process.stdout.write(texto);
    process.exitCode = codigo;
  } catch (e) {
    console.error(`✘ Build Guardian (estricto): FALLO interno del paso — ${e && e.message}`);
    process.exitCode = CODIGO.FALLO;
  }
}
