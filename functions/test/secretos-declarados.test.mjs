/**
 * B2 · D-01 (W5) · UN SECRETO DECLARADO TIENE QUE EXISTIR EN get-wee ANTES DE DESPLEGAR.
 *
 * Cada `defineSecret` entra en el manifiesto de TODA la base de código (`declaredParams` de firebase-functions, que el
 * cargador serializa para `firebase deploy`) y firebase-tools 15.29 (`prepare` → `resolveBackend` → `ensureSecret`)
 * comprueba que cada secreto exista en Secret Manager ANTES de filtrar por `--only` y aunque ninguna función lo monte: en
 * modo no interactivo —el workflow de despliegue, `despliegue.yml`, `--non-interactive`— el despliegue FALLA («In
 * non-interactive mode but have no value for the secret …»); en una terminal, ofrece CREARLO pidiendo un valor.
 * `FAL_KEY` estaba declarada (llavero «dormido», 3faee564) y no existe en get-wee: el primer despliegue de cualquier función
 * desde entonces se habría parado ahí.
 *
 * Esta suite fija:
 *   1 · los secretos que declara el código —el manifiesto ENTERO, cargando el punto de entrada del despliegue (`main`)—
 *       son EXACTAMENTE los de la lista de abajo: los que existen en get-wee y el código espera. Declarar uno nuevo =
 *       crearlo antes en Secret Manager y añadirlo aquí y a `secrets.ts` en el mismo cambio;
 *   2 · `FAL_KEY` (y cualquier llavero dormido) se NOMBRA pero NO se declara, y `defineSecret` solo vive en `secrets.ts`;
 *   3 · lo que no cambia: el censor de registros, el adaptador de fal (lee su clave por el nombre; dormido y apagado en el
 *       registro) y lo que monta cada función;
 *   4 · CONTROL: la comparación detecta un secreto declarado que no está en la lista (no es una prueba ciega);
 *   5 · NOMBRES (2026-11-07, condiciones del dueño para la excepción de `secrets.ts` en la cerca H2 de Music): los llaveros
 *       que exporta `secrets.ts` son los tres conocidos, NOMBRAN exactamente las autorizadas más las dormidas sin repetir
 *       ninguna, y solo dos sitios declaran. firebase-functions 7.3.2 (`registerParam`) quita el parámetro anterior con el
 *       mismo nombre, así que un duplicado NUNCA llega al manifiesto: por eso se vigila en la fuente;
 *   6 · MUSIC: ninguna clave musical —las que cita su matriz sin estar autorizadas, o con nombre musical— está nombrada en un
 *       llavero ni declarada, y ningún archivo de functions/src/music lee una clave ni la nombra fuera de la ficha documental
 *       de su matriz; con su CONTROL.
 *
 * Sin red, sin GCP y sin valores: la red está cortada antes de cargar nada, no hay credenciales ni proyecto real, antes de
 * cargar nada se quitan del entorno TODOS los nombres de clave, y solo se leen NOMBRES de parámetros (`toSpec()`), nunca un
 * valor. Ninguna comprobación imprime un valor.
 */
import net from 'node:net';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── Aislamiento, antes de cargar nada ─────────────────────────────────────── */
const intentosDeRed = [];
globalThis.fetch = async (url) => { intentosDeRed.push(`fetch ${String(url).slice(0, 60)}`); throw new Error('secretos-declarados: red cortada'); };
net.Socket.prototype.connect = function (...a) { intentosDeRed.push(`socket ${JSON.stringify(a[0])?.slice(0, 60)}`); throw new Error('secretos-declarados: red cortada'); };
for (const k of ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_CONFIG', 'GOOGLE_CLOUD_PROJECT', 'K_SERVICE', 'FUNCTION_TARGET', 'FAL_KEY']) delete process.env[k];
process.env.GCLOUD_PROJECT = 'demo-secretos-declarados';
process.env.METADATA_SERVER_DETECTION = 'none';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../..');
const FUNCIONES = path.resolve(here, '..');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let fallos = 0;
const check = (nombre, ok, evidencia = '') => { if (!ok) fallos++; console.log(`${ok ? '✔' : '✘'} ${nombre}${evidencia ? ` · ${evidencia}` : ''}`); };

/**
 * Los secretos que EXISTEN en Secret Manager de get-wee y que el código declara, por NOMBRE (`gcloud secrets list --project
 * get-wee`, solo lectura, 2026-11-06: expediente W5, evidencias/lecturas-produccion-2026-11-06.md §1). get-wee guarda
 * otros dos que no son de las Functions y no se nombran aquí. `FAL_KEY` NO existe.
 */
const EXISTEN_EN_GET_WEE = Object.freeze([
  'ANTHROPIC_API_KEY', 'ARK_API_KEY', 'BFL_API_KEY', 'DEEPSEEK_API_KEY', 'ELEVENLABS_API_KEY', 'GEMINI_API_KEY',
  'MINIMAX_API_KEY', 'OPENAI_API_KEY', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'SEEDANCE_CALLBACK_TOKEN',
]);
/** Los llaveros DORMIDOS: nombrados en `secrets.ts` y sin declarar (ver 2). Activar uno = pasarlo a la lista de arriba en el mismo cambio que crea el secreto. */
const DORMIDAS = Object.freeze(['FAL_KEY']);
/* Ningún valor de verdad al alcance de la suite (condición 6 del dueño, 2026-11-07): antes de cargar nada se quitan del
   entorno TODOS los nombres de clave, no solo FAL_KEY; así ni la carga del código ni el censor (3b) pueden leer uno. */
for (const k of [...EXISTEN_EN_GET_WEE, ...DORMIDAS]) delete process.env[k];

/** Pura: lo declarado que no existe (lo que pararía `firebase deploy`) y lo que existe y ya no se declara. */
const comparar = (declarados, existen) => ({
  declaradosSinExistir: declarados.filter((n) => !existen.includes(n)).sort(),
  existentesSinDeclarar: existen.filter((n) => !declarados.includes(n)).sort(),
});

/* ── El manifiesto ENTERO: el punto de entrada del despliegue, como lo carga firebase-functions ── */
const { main } = JSON.parse(fs.readFileSync(path.join(FUNCIONES, 'package.json'), 'utf8'));
let errorDeCarga = null;
try { require(path.join(FUNCIONES, main)); } catch (e) { errorDeCarga = e; }
const { declaredParams } = require('firebase-functions/params');
const secretosDeclarados = () => [...new Set((declaredParams || [])
  .filter((p) => p && typeof p.toSpec === 'function' && p.toSpec().type === 'secret').map((p) => p.name))].sort();
const declarados = secretosDeclarados();
const { declaradosSinExistir, existentesSinDeclarar } = comparar(declarados, EXISTEN_EN_GET_WEE);

check(`1a · nada declarado fuera de la lista: ningún defineSecret exige en el despliegue un secreto que no exista en get-wee (${declarados.length} declarados)`,
  !errorDeCarga && declarados.length > 0 && declaradosSinExistir.length === 0, declaradosSinExistir.join(', ') || declarados.join(', '));
check('1b · y todo lo de la lista sigue declarado (retirar un secreto del código = quitarlo de la lista en el mismo cambio)',
  !errorDeCarga && existentesSinDeclarar.length === 0, existentesSinDeclarar.join(', '));
check(`1c · el manifiesto es el de TODA la base de código (${main}), leído sin red, sin GCP y sin valores`,
  !errorDeCarga && intentosDeRed.length === 0, errorDeCarga ? String(errorDeCarga.message).slice(0, 160) : intentosDeRed.slice(0, 3).join(' | '));
check('1d · la lista autorizada tiene las 11 claves, sin repetir ninguna, y ninguna es a la vez dormida',
  EXISTEN_EN_GET_WEE.length === 11 && new Set(EXISTEN_EN_GET_WEE).size === 11 && !DORMIDAS.some((n) => EXISTEN_EN_GET_WEE.includes(n)));

/* ── fal: nombrado, sin declarar ─────────────────────────────────────────── */
const S = require(path.join(FUNCIONES, 'lib/secrets.js'));
check('2 · FAL_KEY se nombra (llavero dormido) pero NO se declara: ni defineSecret, ni FAL_SECRETS, ni FAL_SECRET_REFS',
  S.FAL_SECRET_NAMES.includes('FAL_KEY') && !declarados.includes('FAL_KEY') && S.FAL_SECRETS.length === 0 && Object.keys(S.FAL_SECRET_REFS).length === 0);
const fuentesTs = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? fuentesTs(path.join(dir, e.name)) : e.name.endsWith('.ts') ? [path.join(dir, e.name)] : []));
const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const conDefine = fuentesTs(path.join(FUNCIONES, 'src'))
  .filter((f) => /\bdefine(Json)?Secret\s*\(/.test(sinComentarios(fs.readFileSync(f, 'utf8'))))
  .map((f) => path.relative(RAIZ, f).split(path.sep).join('/'));
const secretsTs = sinComentarios(leer('functions/src/secrets.ts'));
check('2b · en todo functions/src, defineSecret solo vive en secrets.ts, y nunca sobre los nombres de fal',
  JSON.stringify(conDefine) === JSON.stringify(['functions/src/secrets.ts'])
  && !/FAL_SECRET_NAMES\.map\([^)]*defineSecret/.test(secretsTs) && !/defineSecret\(\s*['"]FAL_KEY['"]/.test(secretsTs), conDefine.join(', '));

/* ── Lo que no cambia ────────────────────────────────────────────────────── */
check('3 · sin declararla, leer FAL_KEY no lanza ni inventa un valor', S.secretValue('FAL_KEY') === undefined);
{
  /* Un valor DE MENTIRA en el entorno, solo para ver que el censor de registros lo recoge: nunca una clave de verdad.
     Con el entorno limpio (arriba) el censor no ve NINGÚN valor; con el de mentira, ve ese y solo ese. No se imprime nada. */
  const deMentira = 'valor-de-prueba-fal-no-real-b2-0001';
  const antes = S.knownSecretValues();
  process.env.FAL_KEY = deMentira;
  const despues = S.knownSecretValues();
  delete process.env.FAL_KEY;
  check('3b · el censor de registros sigue cubriendo los tres llaveros: un valor de FAL_KEY en el entorno se censura (y, con el entorno limpio, no ve ninguno)',
    antes.length === 0 && despues.length === 1 && despues[0] === deMentira
    && /PROVIDER_SECRET_NAMES, \.\.\.MEDIA_SECRET_NAMES, \.\.\.FAL_SECRET_NAMES/.test(secretsTs));
}
{
  const { ADAPTERS, DEFAULT_PROVIDERS } = require(path.join(FUNCIONES, 'lib/engine/registry.js'));
  const sinClave = ADAPTERS.fal?.isConfigured?.() === false;
  process.env.FAL_KEY = 'valor-de-prueba-fal-no-real-b2-0002';
  const conClave = ADAPTERS.fal?.isConfigured?.() === true;
  delete process.env.FAL_KEY;
  check('4 · el adaptador de fal sigue entero y dormido: registrado, apagado por defecto, lee FAL_KEY por su nombre (sin ella, no configurado)',
    !!ADAPTERS.fal && DEFAULT_PROVIDERS.fal?.enabled === false && sinClave && conClave, `sin clave ${sinClave} · con clave de mentira ${conClave}`);
}
{
  const nombres = (l) => l.map((s) => s.name).sort();
  const MODELO = ['ANTHROPIC_API_KEY', 'ARK_API_KEY', 'BFL_API_KEY', 'DEEPSEEK_API_KEY', 'ELEVENLABS_API_KEY', 'GEMINI_API_KEY', 'MINIMAX_API_KEY', 'OPENAI_API_KEY'];
  const igual = (a, b) => JSON.stringify(a) === JSON.stringify([...b].sort());
  check('5 · los demás proveedores no cambian: lo que monta cada función es lo de antes (IA 9, modelo 8, avatar, aviso, reconciliación y medios)',
    igual(nombres(S.AI_SECRETS), [...MODELO, 'SEEDANCE_CALLBACK_TOKEN']) && igual(nombres(S.MODEL_SECRETS), MODELO)
    && igual(nombres(S.AVATAR_SECRETS), ['GEMINI_API_KEY']) && igual(nombres(S.CALLBACK_SECRETS), ['SEEDANCE_CALLBACK_TOKEN'])
    && igual(nombres(S.RECONCILIATION_SECRETS), ['ARK_API_KEY']) && igual(nombres(S.MEDIA_SECRETS), ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']));
}

/* ── CONTROL: la comparación no es ciega ─────────────────────────────────── */
{
  const { defineSecret } = require('firebase-functions/params');
  defineSecret('B2_CONTROL_SECRETO_QUE_NO_EXISTE');
  const control = comparar(secretosDeclarados(), EXISTEN_EN_GET_WEE);
  check('6 · CONTROL: un defineSecret que no está en la lista se detecta como «declarado sin existir», y solo él',
    JSON.stringify(control.declaradosSinExistir) === JSON.stringify(['B2_CONTROL_SECRETO_QUE_NO_EXISTE']) && control.existentesSinDeclarar.length === 0,
    control.declaradosSinExistir.join(', '));
}

/* ── 5 · NOMBRES: los llaveros, lo que nombran y los sitios que declaran ─── */
/** Pura: de unos llaveros {nombre: [claves]}, las claves repetidas, las no autorizadas y las autorizadas que faltan. */
const auditarNombres = (llaveros, autorizadas) => {
  const todas = Object.values(llaveros).flat();
  const unicas = [...new Set(todas)];
  return {
    duplicadas: [...new Set(todas.filter((n, i) => todas.indexOf(n) !== i))].sort(),
    noAutorizadas: unicas.filter((n) => !autorizadas.includes(n)).sort(),
    autorizadasSinNombrar: autorizadas.filter((n) => !unicas.includes(n)).sort(),
  };
};
const LLAVEROS = ['FAL_SECRET_NAMES', 'MEDIA_SECRET_NAMES', 'PROVIDER_SECRET_NAMES'];
const llaverosExportados = Object.keys(S).filter((k) => /_SECRET_NAMES$/.test(k)).sort();
const llaveros = Object.fromEntries(llaverosExportados.map((k) => [k, [...S[k]]]));
const nombresDeLlaveros = auditarNombres(llaveros, [...EXISTEN_EN_GET_WEE, ...DORMIDAS]);
check('7 · NOMBRES: secrets.ts exporta los tres llaveros conocidos y nombra exactamente las 11 autorizadas más las dormidas, sin repetir ninguna',
  JSON.stringify(llaverosExportados) === JSON.stringify(LLAVEROS)
  && !nombresDeLlaveros.duplicadas.length && !nombresDeLlaveros.noAutorizadas.length && !nombresDeLlaveros.autorizadasSinNombrar.length,
  [`llaveros: ${llaverosExportados.join(', ')}`, ...Object.entries(nombresDeLlaveros).filter(([, v]) => v.length).map(([k, v]) => `${k}: ${v.join(', ')}`)].join(' · '));
const sitiosQueDeclaran = (secretsTs.match(/\bdefine(Json)?Secret\s*\(/g) || []).length;
check('7b · DECLARACIONES: en secrets.ts solo declaran dos sitios —el llavero de proveedores y el de medios, recorriendo su lista de nombres—: ningún defineSecret suelto ni repetido',
  sitiosQueDeclaran === 2
  && /PROVIDER_SECRET_NAMES\.map\(\(name\) => \[name, defineSecret\(name\)\]/.test(secretsTs)
  && /MEDIA_SECRET_NAMES\.map\(\(name\) => \[name, defineSecret\(name\)\]/.test(secretsTs), `${sitiosQueDeclaran} sitio(s)`);

/* ── 6 · MUSIC: ninguna clave propia y ninguna lectura de claves ─────────── */
const { PROVEEDORES_MUSICALES } = require(path.join(FUNCIONES, 'lib/music/matrix.js'));
const PATRON_MUSICAL = /(^|_)(MUSIC|MUREKA|YINCHAO|SUNO|UDIO)(_|$)/;
/** Pura: los nombres de clave que cita una matriz de Music (lo primero de cada `claveEnEntorno`). */
const clavesDeLaMatriz = (fichas) => fichas.map((f) => String(f.claveEnEntorno ?? '').match(/^[A-Z][A-Z0-9_]*/)?.[0]).filter(Boolean);
const deLaMatriz = clavesDeLaMatriz(PROVEEDORES_MUSICALES);
const musicalesSinAutorizar = deLaMatriz.filter((n) => !EXISTEN_EN_GET_WEE.includes(n)).sort();
/** Pura: de unos nombres, los musicales (citados por la matriz sin estar autorizados, o con nombre musical). */
const musicalesEn = (lista, sinAutorizar) => lista.filter((n) => sinAutorizar.includes(n) || PATRON_MUSICAL.test(n)).sort();
const musicalesEnLlaveros = musicalesEn(Object.values(llaveros).flat(), musicalesSinAutorizar);
const musicalesDeclaradas = musicalesEn(declarados, musicalesSinAutorizar);
check(`8 · MUSIC sin clave propia: ninguna clave musical —las de su matriz sin autorizar (${musicalesSinAutorizar.join(', ') || 'ninguna'}) o con nombre musical— está nombrada en un llavero ni declarada`,
  deLaMatriz.length > 0 && !musicalesEnLlaveros.length && !musicalesDeclaradas.length, [...musicalesEnLlaveros, ...musicalesDeclaradas].join(', '));
const LECTORES = /\b(env|secretValue|knownSecretValues)\s*\(|\b(SECRETS|[A-Z]+_SECRET_REFS|[A-Z]+_SECRETS)\b|from\s+['"][^'"]*secrets['"]/;
/** Pura: las claves que nombra un texto FUERA del campo documental `claveEnEntorno` de una ficha. */
const citasFueraDeLaFicha = (texto, claves) => {
  const sinFichas = texto.replace(/claveEnEntorno:\s*'[^']*'/g, '');
  return claves.filter((n) => sinFichas.includes(n));
};
const fuentesMusic = fuentesTs(path.join(FUNCIONES, 'src', 'music'))
  .map((f) => [path.relative(RAIZ, f).split(path.sep).join('/'), sinComentarios(fs.readFileSync(f, 'utf8'))]);
const musicLee = fuentesMusic.filter(([, t]) => LECTORES.test(t)).map(([f]) => f);
const musicCita = fuentesMusic.flatMap(([f, t]) => citasFueraDeLaFicha(t, [...EXISTEN_EN_GET_WEE, ...DORMIDAS, ...musicalesSinAutorizar]).map((n) => `${f}: ${n}`));
check('8b · MUSIC no lee claves: ningún archivo de functions/src/music usa un lector (env, secretValue, llaveros) ni nombra una clave fuera de la ficha documental de su matriz',
  fuentesMusic.length > 0 && !musicLee.length && !musicCita.length, [...musicLee, ...musicCita].join(', '));

/* ── CONTROL de 5 y 6: no son pruebas ciegas ─────────────────────────────── */
{
  const c1 = auditarNombres({ A: ['GEMINI_API_KEY', 'MUREKA_API_KEY'], B: ['GEMINI_API_KEY'] }, ['GEMINI_API_KEY']);
  const c2 = musicalesEn(['GEMINI_API_KEY', 'YINCHAO_API_KEY', 'SUNO_API_KEY', 'AUDIO_API_KEY'], ['YINCHAO_API_KEY']);
  const c3 = LECTORES.test("import { env } from '../engine/http'; const k = env('MINIMAX_API_KEY');")
    && !LECTORES.test("import { ProviderError } from '../engine/http';");
  const c4 = citasFueraDeLaFicha("claveEnEntorno: 'MUREKA_API_KEY (sin configurar)', otra = 'MINIMAX_API_KEY'", ['MINIMAX_API_KEY', 'MUREKA_API_KEY']);
  check('9 · CONTROL: se detectan una clave no autorizada, una repetida, una musical (y no una que solo contiene «AUDIO»), un lector en Music y una clave citada fuera de la ficha',
    JSON.stringify(c1) === JSON.stringify({ duplicadas: ['GEMINI_API_KEY'], noAutorizadas: ['MUREKA_API_KEY'], autorizadasSinNombrar: [] })
    && JSON.stringify(c2) === JSON.stringify(['SUNO_API_KEY', 'YINCHAO_API_KEY']) && c3 && JSON.stringify(c4) === JSON.stringify(['MINIMAX_API_KEY']));
}

if (fallos) { console.log(`\n✘ ${fallos} fallo(s)`); process.exit(1); }
console.log('\n✔ secretos-declarados: todo en orden');
process.exit(0);
