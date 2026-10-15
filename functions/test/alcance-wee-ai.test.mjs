/**
 * LA COMPROBACIÓN DE ALCANCE DE LA FASE 1 — «WEË AI FUERA DE ALCANCE» (scripts/alcance-wee-ai.mjs).
 *
 * El script dice, con evidencia, que un cambio no toca Weë AI. Esta suite fija QUÉ es Weë AI para él, para que nadie encoja la
 * lista sin que se note:
 *
 *   A  la clasificación de rutas: cada archivo de Weë AI que importa cae en WEE_AI o en COMPARTIDO; las pruebas y las
 *      herramientas de operaciones no.
 *   B  la cerca: TODO lo que hay en `functions/src` está clasificado A PROPÓSITO. Un directorio nuevo hace fallar la suite hasta que
 *      alguien decide a qué lado cae: así «no estaba en la lista» nunca es la razón de que un cambio en Weë AI pase.
 *   C  el comportamiento del script: lista, cuenta y sale con 1 si hay algo fuera de alcance (probado con un repositorio temporal).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../..');
let fallo = 0;
const check = (nombre, ok, evidencia = '') => { if (!ok) fallo++; process.stdout.write(`${ok ? '✔' : '✘'} ${nombre}${evidencia ? ` · ${evidencia}` : ''}\n`); };

const A = await import(pathToFileURL(path.join(RAIZ, 'scripts/alcance-wee-ai.mjs')).href);
const { clasificar, resumir } = A;

/* ── A · la clasificación ────────────────────────────────────────────────────────────────────────────────────────── */
const DEL_SERVIDOR = ['creator/index.ts', 'creator/brain.ts', 'creator/templates.ts', 'engine/router.ts', 'engine/registry.ts', 'engine/providers/gemini.ts', 'gateway/index.ts',
  'runtime/index.ts', 'planner/index.ts', 'router/index.ts', 'registry/index.ts', 'evals/index.ts', 'settlement/programado.ts', 'brain/index.ts', 'orchestrator/index.ts',
  'workflow/index.ts', 'skills/index.ts', 'generateAvatar.ts', 'vertexAI.ts', 'secrets.ts'].map((f) => `functions/src/${f}`);
check('A1 el servidor de Weë AI es WEE_AI (creator, engine, gateway, runtime, planner, router, registry, evals, settlement, brain, orchestrator, workflow, skills, avatar, claves)',
  DEL_SERVIDOR.every((r) => clasificar(r) === 'WEE_AI'), DEL_SERVIDOR.filter((r) => clasificar(r) !== 'WEE_AI').join(', '));
const DE_LA_INTERFAZ = ['screens/WeeCreatorScreen.tsx', 'screens/SpecialistScreen.tsx', 'screens/CreatorFlowScreen.tsx', 'screens/BrainChatScreen.tsx', 'screens/ChefScreen.tsx', 'screens/BusinessScreen.tsx',
  'components/creator/ResultCard.tsx', 'components/chef/ChefPanel.tsx', 'services/creatorService.ts', 'services/brainService.ts', 'hooks/useBrainChat.ts', 'constants/specialists.ts',
  'constants/weeExperiences.ts', 'constants/chefTools.ts', 'i18n/textos/es/weeai.ts', 'i18n/textos/pt-PT/weeai.ts', 'i18n/textos/en/chef.ts', 'i18n/textos/da/servidor/movimientos.ts', 'docs/CREATOR.md', 'docs/AI-ENGINE.md'];
check('A2 la interfaz, los servicios, las constantes, los textos y los documentos de arquitectura de Weë AI son WEE_AI', DE_LA_INTERFAZ.every((r) => clasificar(r) === 'WEE_AI'), DE_LA_INTERFAZ.filter((r) => clasificar(r) !== 'WEE_AI').join(', '));
const COMP = ['core/router.ts', 'core/brain.ts', 'credits/creditEngine.ts', 'financial/index.ts', 'job/index.ts', 'content/index.ts', 'media/canary.ts', 'filmmaker/index.ts', 'productions/puerta.ts', 'shots/puerta.ts', 'elements/puerta.ts', 'index.ts'].map((f) => `functions/src/${f}`);
check('A3 lo compartido (Core, Credit Engine, Financial Core, motor de trabajos, Studio y Filmmaker, el índice de funciones) es COMPARTIDO', COMP.every((r) => clasificar(r) === 'COMPARTIDO'), COMP.filter((r) => clasificar(r) !== 'COMPARTIDO').join(', '));
const LIBRES = ['functions/test/chat-limites.test.mjs', 'scripts/prelanzamiento.mjs', 'ops/observabilidad/aplicar.mjs', '.github/workflows/ci.yml', 'docs/LANZAMIENTO.md', 'ops/harness/guardian.mjs', 'functions/package.json', 'firestore.rules'];
check('A4 las pruebas, las herramientas de operaciones, la CI y los documentos de lanzamiento NO son de Weë AI',
  LIBRES.every((r) => ['PRUEBA', 'OTRO'].includes(clasificar(r))), LIBRES.filter((r) => !['PRUEBA', 'OTRO'].includes(clasificar(r))).join(', '));
check('A5 las pruebas son PRUEBA (se pueden cambiar: probar Weë AI no lo cambia)', clasificar('functions/test/creator.test.mjs') === 'PRUEBA' && clasificar('functions/test/_firestore-en-memoria.mjs') === 'PRUEBA');
check('A6 la clasificación acepta rutas de Windows', clasificar('functions\\src\\creator\\index.ts') === 'WEE_AI');
const por = resumir([...DEL_SERVIDOR.slice(0, 2), COMP[0], LIBRES[0], LIBRES[1]]);
check('A7 resumir cuenta por clase', por.WEE_AI.length === 2 && por.COMPARTIDO.length === 1 && por.PRUEBA.length === 1 && por.OTRO.length === 1);
check('A8 las listas están congeladas', Object.isFrozen(A.WEE_AI) && Object.isFrozen(A.COMPARTIDO) && Object.isFrozen(A.PRUEBA));

/* ── B · la cerca: nada en functions/src queda sin decidir ───────────────────────────────────────────────────────── */
/*
 * Cada entrada de `functions/src` (directorio o archivo suelto) tiene su clase DECIDIDA aquí. «OTRO» es una decisión, no un
 * olvido: son identidad, moderación, pagos, lo social, lo público y las utilidades comunes, que no generan con la IA.
 */
const DECIDIDOS = {
  WEE_AI: ['creator', 'engine', 'gateway', 'runtime', 'planner', 'router', 'registry', 'evals', 'settlement', 'brain', 'orchestrator', 'workflow', 'skills', 'music', 'generateAvatar.ts', 'vertexAI.ts', 'secrets.ts'],
  COMPARTIDO: ['core', 'credits', 'financial', 'job', 'content', 'media', 'filmmaker', 'productions', 'shots', 'elements', 'index.ts'],
  OTRO: ['identity', 'moderation', 'payments', 'public', 'social', 'shared', 'opciones.ts'],
};
const todos = fs.readdirSync(path.join(RAIZ, 'functions/src'));
const sinDecidir = todos.filter((e) => !Object.values(DECIDIDOS).flat().includes(e));
check('B1 todo lo que hay en functions/src tiene su clase decidida (un directorio nuevo hace fallar esta suite hasta que alguien decida)', sinDecidir.length === 0, sinDecidir.join(', '));
const mal = [];
for (const [clase, entradas] of Object.entries(DECIDIDOS)) {
  for (const e of entradas) {
    if (!todos.includes(e)) continue;
    const ruta = fs.statSync(path.join(RAIZ, 'functions/src', e)).isDirectory() ? `functions/src/${e}/x.ts` : `functions/src/${e}`;
    if (clasificar(ruta) !== clase) mal.push(`${e}: el script dice ${clasificar(ruta)}, aquí se decidió ${clase}`);
  }
}
check('B2 el script clasifica cada entrada de functions/src como se decidió aquí', mal.length === 0, mal.join(' | '));
const huérfanas = Object.values(DECIDIDOS).flat().filter((e) => !todos.includes(e));
check('B3 ninguna entrada decidida aquí ha desaparecido de functions/src (la cerca no se pudre)', huérfanas.length === 0, huérfanas.join(', '));

/* ── C · el script, ejecutado con un repositorio temporal ────────────────────────────────────────────────────────── */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-alcance-'));
const git = (...a) => execFileSync('git', ['-C', tmp, ...a], { encoding: 'utf8' }).trim();
const escribir = (rel, t) => { fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true }); fs.writeFileSync(path.join(tmp, rel), t); };
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'prueba@wee.test'); git('config', 'user.name', 'Prueba'); git('config', 'core.autocrlf', 'false');
escribir('README.md', 'base\n');
git('add', '-A'); git('commit', '-q', '-m', 'base');
const correr = (...extra) => spawnSync(process.execPath, [path.join(RAIZ, 'scripts/alcance-wee-ai.mjs'), '--base', 'main', ...extra], { cwd: tmp, encoding: 'utf8' });
git('checkout', '-q', '-b', 'limpia');
escribir('functions/test/algo.test.mjs', 'x\n'); escribir('ops/algo.json', '{}\n'); escribir('docs/LANZAMIENTO.md', 'x\n');
git('add', '-A'); git('commit', '-q', '-m', 'limpia');
const limpia = correr('--head', 'limpia');
check('C1 un cambio solo de pruebas, operaciones y documentos de lanzamiento sale 0 y lo dice', limpia.status === 0 && /ningún archivo de Weë AI/.test(limpia.stdout), `${limpia.status} ${limpia.stdout.slice(-120)}`);
git('checkout', '-q', 'main'); git('checkout', '-q', '-b', 'toca');
escribir('functions/src/creator/index.ts', 'x\n'); escribir('functions/src/core/router.ts', 'x\n'); escribir('functions/test/algo.test.mjs', 'x\n');
git('add', '-A'); git('commit', '-q', '-m', 'toca');
const toca = correr('--head', 'toca');
check('C2 un cambio en creator/ sale 1 y nombra el archivo', toca.status === 1 && /WEE_AI\s+functions\/src\/creator\/index\.ts/.test(toca.stdout) && /fuera de alcance/.test(toca.stdout), `${toca.status}`);
check('C3 …y lo compartido también se avisa (core/router.ts)', /COMPARTIDO\s+functions\/src\/core\/router\.ts/.test(toca.stdout));
const directo = correr('--head', 'toca', '--solo-directo');
check('C4 con --solo-directo, un cambio que toca creator/ sigue saliendo 1 (lo directo nunca pasa)', directo.status === 1 && /WEE_AI\s+functions\/src\/creator\/index\.ts/.test(directo.stdout));
git('checkout', '-q', 'main'); git('checkout', '-q', '-b', 'soloCompartido');
escribir('functions/src/core/router.ts', 'x\n');
git('add', '-A'); git('commit', '-q', '-m', 'compartido');
const comp = correr('--head', 'soloCompartido', '--solo-directo');
check('C5 un cambio solo en lo compartido sale 0 con --solo-directo y 1 sin él', comp.status === 0 && correr('--head', 'soloCompartido').status === 1);
const roto = correr('--head', 'no-existe');
check('C6 una referencia que no existe sale 2 (no «todo bien»)', roto.status === 2, `${roto.status}`);
const json = JSON.parse(correr('--head', 'toca', '--json').stdout);
check('C7 --json trae las clases', Array.isArray(json.WEE_AI) && json.WEE_AI.includes('functions/src/creator/index.ts') && json.total === 3);
fs.rmSync(tmp, { recursive: true, force: true });

const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'functions/package.json'), 'utf8'));
check('esta suite está en la cadena de `npm test`', /alcance-wee-ai\.test\.mjs/.test(pkg.scripts.test));

process.stdout.write(fallo ? `\n✘ ${fallo} comprobación(es) fallaron\n` : '\n✔ El alcance de Weë AI está fijado: nada de lo suyo cambia sin que el script lo diga\n');
process.exit(fallo ? 1 : 0);
