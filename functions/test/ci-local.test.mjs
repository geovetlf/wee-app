/*
 * LA CI LOCAL ES LA DE GITHUB — `scripts/ci-local.mjs`.
 *
 * Lo que importa de esta herramienta es que no se separe nunca de la CI de verdad:
 * lee .github/workflows/ci.yml y ejecuta SUS pasos. Aquí se fija que (1) encuentra
 * los cuatro trabajos con los nombres que exige el despliegue, (2) recoge TODOS los
 * pasos con `run`, (3) lo único que se salta son instalaciones, (4) hereda el `env`
 * del workflow, y (5) `--plan` no ejecuta nada.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`✔ ${name}`);
  else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const importar = (rel) => import(pathToFileURL(path.join(RAIZ, rel)).href);

const local = await importar('scripts/ci-local.mjs');
const { NIVELES_DE_CI } = await importar('ops/despliegue/plan.mjs');
const yml = fs.readFileSync(path.join(RAIZ, '.github/workflows/ci.yml'), 'utf8');
const ts = local.trabajos(yml);

check('1) encuentra los cuatro trabajos, en orden, con los nombres que exige el despliegue',
  JSON.stringify(ts.map((t) => t.nombre)) === JSON.stringify(NIVELES_DE_CI), ts.map((t) => t.nombre).join(' | '));
check('2) y sus dependencias: el nivel 2 espera al 1 y el 3 a los dos del 2',
  ts[1].necesita.join() === 'nivel-1' && ts[2].necesita.join() === 'nivel-1' && ts[3].necesita.join() === 'nivel-2-suites,nivel-2-emuladores');
const runs = (yml.match(/^ {8}run:/gm) || []).length;
const pasos = ts.flatMap((t) => t.pasos);
check('3) recoge TODOS los pasos con `run` del workflow, ni uno menos', runs > 0 && pasos.length === runs, `${pasos.length} de ${runs}`);
const quitadas = pasos.flatMap((p) => local.local(p.run).quitadas.map((l) => l.trim()));
check('4) lo único que se salta son instalaciones (npm ci y firebase-tools), nunca una prueba ni un build',
  quitadas.length > 0 && quitadas.every((l) => /^npm ci\b|^npm install --global firebase-tools@/.test(l)), quitadas.join(' | '));
const todo = pasos.map((p) => local.local(p.run).quedan).join('\n');
check('5) y corre lo que corre GitHub: tsc, build de Functions y de la web, todas las suites, los emuladores, el escaneo y las políticas',
  ['npx tsc --noEmit', 'npm run build --prefix functions', 'npx expo export -p web', 'npm run test:todas --prefix functions',
    'node functions/test/_emuladores.mjs', 'node scripts/escaneo-secretos.mjs', 'for suite in', 'node scripts/ci-sin-secretos.mjs'].every((c) => todo.includes(c)));
check('6) cada nivel empieza comprobando que el entorno no trae nada real', ts.every((t) => /ci-sin-secretos/.test(t.pasos[0]?.run || '')));
check('7) hereda el `env` del workflow (la memoria de Node)', local.entorno(yml).NODE_OPTIONS === '--max-old-space-size=4096');
check('8) el nivel de cada trabajo sale de su nombre', ts.map(local.nivelDe).join() === '1,2,2,3');

/* Si la CI cambia, la local cambia con ella: un paso nuevo aparece sin tocar el script. */
const conPasoNuevo = yml.replace('      - name: Ningún secreto en el repositorio', '      - name: Un paso nuevo\n        run: echo nuevo\n      - name: Ningún secreto en el repositorio');
check('9) un paso nuevo en ci.yml aparece en la CI local sin tocar el script',
  local.trabajos(conPasoNuevo)[3].pasos.some((p) => p.run === 'echo nuevo'));

const plan = spawnSync(process.execPath, [path.join(RAIZ, 'scripts/ci-local.mjs'), '--plan'], { cwd: RAIZ, encoding: 'utf8', timeout: 30000 });
check('10) `--plan` no ejecuta nada: enseña los cuatro niveles y sale enseguida',
  plan.status === 0 && /PLAN \(no se ejecutó nada\)/.test(plan.stdout) && NIVELES_DE_CI.every((n) => plan.stdout.includes(n)) && !/ falló /.test(plan.stdout));
const fuente = fs.readFileSync(path.join(RAIZ, 'scripts/ci-local.mjs'), 'utf8');
check('11) ejecuta con el intérprete de GitHub (bash -eo pipefail), sin shell de Windows ni texto armado',
  /spawnSync\('bash', \['--noprofile', '--norc', '-eo', 'pipefail', '-c', comando\]/.test(fuente) && !/execSync|shell:\s*true/.test(fuente));

const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'functions/package.json'), 'utf8'));
check('12) esta suite está en la cadena de `npm test`', /ci-local\.test\.mjs/.test(pkg.scripts.test));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
