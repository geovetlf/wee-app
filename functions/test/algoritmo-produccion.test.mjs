/**
 * PRODUCCIÓN ≠ MAIN EN EL ALGORITHM ENGINE, y que nadie lo olvide (misión de cierre, FASE 15).
 *
 * Main lleva el contrato del motor que dice `functions/src/core/contracts.ts`. Producción lleva el que
 * había en el commit desde el que se desplegó `creatorChat` —la única Function que puede ejecutar el
 * motor, y solo en sombra—, según el mapa de producción (`ops/produccion.json`). Esta suite lee los dos
 * números de esas dos fuentes —ninguno escrito a mano aquí— y exige que la documentación los diga como
 * son:
 *
 *   · `docs/RUNTIME.md` § 3, `docs/ALGORITHM-ENGINE.md` y `CLAUDE.md` nombran los dos;
 *   · ninguna línea de `docs/` ni de `CLAUDE.md` que hable del motor y de producción dice el número de
 *     main sin decir también el de producción, mientras sean distintos.
 *
 * El día que `creatorChat` se despliegue desde main, los dos números coincidirán: la suite lo dirá, y
 * la documentación tendrá que decirlo también (MAIN = PRODUCCIÓN). Lee la historia de git (la CI la trae:
 * `fetch-depth: 0`); nunca toca producción.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');
let failures = 0;
let n = 0;
const check = (nombre, ok, detalle = '') => {
  n++;
  if (ok) console.log(`✔ ${n}) ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  else { failures++; console.log(`✘ ${n}) ${nombre}${detalle ? ` — ${detalle}` : ''}`); }
};
const versionEn = (texto) => texto.match(/ALGORITHM_CONTRACT_VERSION = '([0-9]+\.[0-9]+)'/)?.[1];

/* ── 1 · Los dos números, de sus fuentes ── */
/* Solo de `funciones`, la lista que `produccion-mapa` valida; y el commit, con su forma de siempre —40 hexadecimales—
 * ANTES de dárselo a git: nada que empiece por `-` llega a `git show` como una opción (revisión de seguridad). */
const COMMIT = /^[0-9a-f]{40}$/;
const creatorChat = (JSON.parse(leer('ops/produccion.json')).funciones ?? []).find((f) => f?.funcion === 'creatorChat');
const commitValido = typeof creatorChat?.commit === 'string' && COMMIT.test(creatorChat.commit);
const MAIN = versionEn(leer('functions/src/core/contracts.ts'));
let PROD;
let errorDeGit = '';
if (commitValido) {
  try {
    PROD = versionEn(execFileSync('git', ['show', `${creatorChat.commit}:functions/src/core/contracts.ts`], { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  } catch (e) { errorDeGit = String(e.message).split('\n')[0]; }
} else errorDeGit = 'el commit de creatorChat en ops/produccion.json no tiene la forma de un commit (40 hexadecimales)';
const CORTO = creatorChat?.commit?.slice(0, 7);

check('1 · el mapa de producción tiene `creatorChat` con un commit bien formado, y main tiene su contrato', commitValido && !!MAIN, `${CORTO} · main ${MAIN}`);
check('2 · el contrato del motor en el commit desplegado de `creatorChat` se lee de git', !!PROD, PROD ? `producción ${PROD}` : errorDeGit);
console.log(`   MAIN = ${MAIN} · PRODUCCIÓN = ${PROD} (creatorChat, ${CORTO})${MAIN === PROD ? ' — coinciden' : ' — distintos'}`);

/* ── 2 · Donde se tiene que decir, se dice ── */
const fila = leer('docs/RUNTIME.md').split('\n').find((l) => l.startsWith('| **Algorithm Engine**')) ?? '';
check('3 · RUNTIME.md § 3: la fila del motor dice el contrato de main Y el de producción, con el commit',
  fila.includes(`**${MAIN} en main**`) && fila.includes(`**${PROD} en producción**`) && fila.includes(CORTO),
  fila.slice(0, 160));
const ALG = leer('docs/ALGORITHM-ENGINE.md');
check('4 · ALGORITHM-ENGINE.md lo dice con la forma acordada: `MAIN = …` y `PRODUCCIÓN = …`',
  ALG.includes(`MAIN = ${MAIN}`) && ALG.includes(`PRODUCCIÓN = ${PROD}`));
const CLAUDE = leer('CLAUDE.md');
check('5 · CLAUDE.md también', CLAUDE.includes(`MAIN = ${MAIN}`) && CLAUDE.includes(`PRODUCCIÓN = ${PROD}`));

/* ── 3 · Y nadie dice que producción usa lo de main ── */
const docs = [
  'CLAUDE.md',
  ...fs.readdirSync(path.join(RAIZ, 'docs')).filter((f) => f.endsWith('.md')).map((f) => `docs/${f}`),
];
const deProduccion = /producci[oó]n|desplegad|deployed|production/i;
const delMotor = /algorithm engine|algoritmo|motor de decisi[oó]n|algorithm_contract|contrato del motor/i;
const numero = (v) => new RegExp(`(?<![0-9.])${v.replace('.', '\\.')}(?![0-9])`);
const dudosas = MAIN === PROD ? [] : docs.flatMap((d) => leer(d).split('\n').map((l, i) => ({ d, i: i + 1, l })))
  .filter(({ l }) => deProduccion.test(l) && delMotor.test(l) && numero(MAIN).test(l) && !numero(PROD).test(l));
check('6 · ninguna línea de docs/ ni de CLAUDE.md atribuye a producción el contrato de main sin decir el de producción',
  dudosas.length === 0, dudosas.slice(0, 6).map(({ d, i, l }) => `${d}:${i} «${l.trim().slice(0, 90)}»`).join(' | '));
check('7 · CONTROL · la regla de arriba ve una afirmación falsa: «el Algorithm Engine corre en producción con el contrato de main»',
  MAIN === PROD || (deProduccion.test(`el Algorithm Engine corre en producción con el contrato ${MAIN}`)
    && delMotor.test(`el Algorithm Engine corre en producción con el contrato ${MAIN}`)
    && numero(MAIN).test(`contrato ${MAIN}`) && !numero(PROD).test(`contrato ${MAIN}`)));

console.log(failures ? `\n${failures} comprobación(es) fallaron` : `\nProducción ≠ main en el Algorithm Engine, dicho donde hay que decirlo: MAIN = ${MAIN} · PRODUCCIÓN = ${PROD}`);
process.exit(failures ? 1 : 0);
