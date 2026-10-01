/*
 * TODA FUNCIÓN TIENE TECHO DE INSTANCIAS — auditoría H0, §27 (fase 1).
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * No había `setGlobalOptions` en ninguna parte. El techo de 20 instancias que
 * tienen 28 funciones lo puso la plataforma al actualizarlas; las 6 que solo
 * tienen una revisión (burnViewOnce, deleteAsset, moderationAdmin,
 * reportContent, shots, productions) no tenían ninguno, y ante un pico o una
 * tormenta de reintentos escalaban sin freno.
 *
 * `functions/src/opciones.ts` declara el techo global (20) y es el PRIMER
 * import de index.ts, porque firebase-functions lee las opciones globales al
 * DEFINIR cada función: un import anterior que defina funciones se quedaría
 * sin él. Aquí se carga el compilado y se mira el techo de cada función
 * exportada. Bajar techos (fase 2) es decisión del dueño, no de este archivo.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const LIB = path.resolve(here, '../lib');
const leer = (p) => fs.readFileSync(path.resolve(here, '../../', p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* El techo de cada función. Una función nueva sin techo explícito hereda el global (20). */
const TECHO_GLOBAL = 20;
/* barridoDeLiquidacion = 1 (H0 #18): una pasada a la vez; ver su comprobación abajo. */
const EXCEPCIONES = { publicPostPage: 10, barridoDeLiquidacion: 1 };

/* ── A. El orden importa ────────────────────────────────────────────────── */
const indice = fs.readFileSync(path.join(LIB, 'index.js'), 'utf8');
const primerRequire = (indice.match(/require\("([^"]+)"\)/) || [])[1];
check('1) `./opciones` es el primer módulo que carga index.js (antes de definir cualquier función)', primerRequire === './opciones', String(primerRequire));
const fuentes = [];
const recorrer = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) recorrer(p); else if (e.name.endsWith('.ts')) fuentes.push(p);
  }
};
recorrer(path.resolve(here, '../src'));
const llamadas = fuentes.filter((f) => /setGlobalOptions\s*\(/.test(sinComentarios(fs.readFileSync(f, 'utf8'))));
check('2) hay exactamente UNA llamada a setGlobalOptions, en opciones.ts (dos llamadas son comportamiento indefinido)',
  llamadas.length === 1 && llamadas[0].endsWith(path.join('src', 'opciones.ts')), llamadas.map((f) => path.basename(f)).join(', '));
check('3) y fija el techo global en 20', /setGlobalOptions\(\{\s*maxInstances:\s*20\s*\}\)/.test(sinComentarios(leer('functions/src/opciones.ts'))));

/* ── B. Cada función exportada, cargada de verdad ───────────────────────── */
const exportado = require(path.join(LIB, 'index.js'));
const funciones = Object.entries(exportado).filter(([, v]) => v && v.__endpoint);
const sinTecho = funciones.filter(([, v]) => !(Number(v.__endpoint.maxInstances) > 0)).map(([k]) => k);
check('4) todas las funciones exportadas tienen techo de instancias', funciones.length >= 30 && sinTecho.length === 0,
  sinTecho.length ? sinTecho.join(', ') : `${funciones.length} funciones`);
const distintas = funciones.filter(([k, v]) => v.__endpoint.maxInstances !== (EXCEPCIONES[k] ?? TECHO_GLOBAL)).map(([k, v]) => `${k}=${v.__endpoint.maxInstances}`);
check('5) el techo es el global (20) salvo las excepciones declaradas aquí (publicPostPage = 10, barridoDeLiquidacion = 1)', distintas.length === 0, distintas.join(', '));
const barrido = funciones.find(([k]) => k === 'barridoDeLiquidacion')?.[1].__endpoint;
check('5b) el barrido, una pasada a la vez (H0 #18): una instancia y una petición; dura hasta 540 s y sale cada 5 min, así que sin esto dos pasadas se solapaban',
  barrido && barrido.maxInstances === 1 && barrido.concurrency === 1 && barrido.timeoutSeconds === 540, barrido ? `${barrido.maxInstances}/${barrido.concurrency}` : 'no está');
const SEIS = ['burnViewOnce', 'deleteAsset', 'moderationAdmin', 'reportContent'];
check('6) las que en producción no tenían techo lo tendrán en su próximo despliegue',
  SEIS.every((k) => exportado[k] && exportado[k].__endpoint.maxInstances === TECHO_GLOBAL), SEIS.join(', '));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
