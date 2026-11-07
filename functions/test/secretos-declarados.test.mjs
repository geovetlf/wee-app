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
 *   4 · CONTROL: la comparación detecta un secreto declarado que no está en la lista (no es una prueba ciega).
 *
 * Sin red, sin GCP y sin valores: la red está cortada antes de cargar nada, no hay credenciales ni proyecto real, y solo se
 * leen NOMBRES de parámetros (`toSpec()`), nunca un valor.
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
  /* Un valor DE MENTIRA en el entorno, solo para ver que el censor de registros lo recoge: nunca una clave de verdad. */
  const deMentira = 'valor-de-prueba-fal-no-real-b2-0001';
  process.env.FAL_KEY = deMentira;
  const censura = S.knownSecretValues().includes(deMentira);
  delete process.env.FAL_KEY;
  check('3b · el censor de registros sigue cubriendo los tres llaveros: un valor de FAL_KEY en el entorno se censura',
    censura && /PROVIDER_SECRET_NAMES, \.\.\.MEDIA_SECRET_NAMES, \.\.\.FAL_SECRET_NAMES/.test(secretsTs));
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

if (fallos) { console.log(`\n✘ ${fallos} fallo(s)`); process.exit(1); }
console.log('\n✔ secretos-declarados: todo en orden');
process.exit(0);
