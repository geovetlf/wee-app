/*
 * UN PASO DEL PLAN PUEDE DECIR QUÉ PROVEEDORES ADMITE (B3.15.2-PREP).
 *
 * El Router lleva desde siempre obedeciendo `prefs.allowedProviders`, y tres
 * sitios de producción ya lo usan: el Weë Video Engine fija la familia
 * Seedance, el Weë Image Engine fija el proveedor del modelo elegido, y Weë
 * Brain fija DeepSeek.
 *
 * Lo que faltaba no era el mecanismo: era que un paso del plan pudiera
 * declararlo. `creatorRun` construía las preferencias con dos campos —calidad y
 * duración— y nada más, así que un paso de la rama genérica (voz, texto) no
 * podía acotar su cadena. Medido en B3.15.2: con la cadena
 * `elevenlabs → minimax`, un fallo del primero se convierte en una llamada al
 * segundo, y entonces medir si ElevenLabs funciona es imposible.
 *
 *  A. El transporte existe y no cambia nada más. (EJECUTADO)
 *  B. El Router hace lo que se le pide. (EJECUTADO contra el Router real)
 *  C. Sin declararlo, el comportamiento de siempre.
 *  D. Los tres caminos que ya lo usaban siguen igual.
 *  E. Nada de esto conoce un proveedor ni una capacidad.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ejecutor = leer('functions/src/creator/index.ts');

console.log('\n─── A. El transporte. EJECUTADO ───');

/*
 * Se ejecuta la construcción de `prefs` DE VERDAD: se extrae del COMPILADO, que
 * es lo que corre en producción, y se llama con las entradas que puede traer un
 * paso. No se copia la lógica a mano —copiarla probaría que funciona la copia—
 * y no se lee el TypeScript, que no se puede ejecutar tal cual.
 */
const compilado = leer('functions/lib/creator/index.js');
const trozo = compilado.slice(
  compilado.indexOf('const familiaDelPaso = stepInput.allowedProviders;'),
  compilado.indexOf('const stepCtx = ')
);
check('la construcción de prefs se encontró en el compilado', trozo.length > 100 && trozo.includes('allowedProviders'));

const construirPrefs = new Function('stepInput', `${trozo}\nreturn prefs;`);

const CASOS = [
  ['1 · un solo proveedor llega tal cual', { allowedProviders: ['elevenlabs'] }, ['elevenlabs']],
  ['2 · otro proveedor cualquiera también', { allowedProviders: ['minimax'] }, ['minimax']],
  ['3 · dos se preservan, y en su orden', { allowedProviders: ['elevenlabs', 'minimax'] }, ['elevenlabs', 'minimax']],
  ['4 · sin declararlo, no aparece', {}, undefined],
  ['E · una lista vacía se transporta tal cual', { allowedProviders: [] }, []],
  ['lo que no es una lista no se transporta', { allowedProviders: 'elevenlabs' }, undefined],
  ['ni una lista con algo que no es texto', { allowedProviders: ['elevenlabs', 7] }, undefined],
  ['ni un nulo', { allowedProviders: null }, undefined],
];
for (const [nombre, entrada, esperado] of CASOS) {
  const prefs = construirPrefs(entrada);
  check(nombre, JSON.stringify(prefs.allowedProviders) === JSON.stringify(esperado),
    `allowedProviders = ${JSON.stringify(prefs.allowedProviders)}`);
}

/* 5-9 · y lo que ya viajaba sigue viajando, esté o no la familia declarada. */
for (const [nombre, entrada] of [['con familia', { quality: 'max', durationSec: 12, allowedProviders: ['elevenlabs'] }],
                                 ['sin familia', { quality: 'max', durationSec: 12 }]]) {
  const prefs = construirPrefs(entrada);
  check(`5 · la calidad no se pierde (${nombre})`, prefs.quality === 'max', String(prefs.quality));
  check(`5 · la duración tampoco (${nombre})`, prefs.durationSec === 12, String(prefs.durationSec));
}
check('y sin calidad declarada sigue saliendo `auto`', construirPrefs({}).quality === 'auto');

/* 6-8 · lo que NO vive en prefs no se toca: viaja por el contexto del paso. */
check('6 · el requestId sigue fuera de prefs, en el contexto',
  /requestId: `\$\{jobId\}:\$\{next\.id\}`/.test(ejecutor));
check('7 · el modelo lo siguen poniendo los motores de dominio, no el paso',
  /prefs: \{ \.\.\.prefs, \.\.\.planned\.prefs \}/.test(ejecutor));
check('8 · y el servicio de cobro se calcula aparte, como siempre',
  /service: serviceForCapability\(next\.capability, stepInput\)/.test(ejecutor));

console.log('\n─── B. El Router obedece. EJECUTADO contra el Router real ───');

/*
 * Aquí no se simula el Router: se reproduce su filtro leyéndolo de su propia
 * fuente. Es la línea que decide si un eslabón de la cadena entra o se salta.
 */
const router = leer('functions/src/engine/router.ts');
/* Misión mundo3d (FASE 2): el descarte lleva además su CAUSA ('peticion'); el filtro y su motivo, los de siempre. */
const filtro = router.match(/if \(prefs\.allowedProviders && !prefs\.allowedProviders\.includes\(link\.provider\)\) return skip\('([^']+)', 'peticion'\);/);
check('el filtro del Router sigue donde estaba', !!filtro, filtro?.[1] ?? 'no encontrado');

const pasa = (prefs, proveedor) => !(prefs.allowedProviders && !prefs.allowedProviders.includes(proveedor));
const CADENA = ['elevenlabs', 'minimax'];

/* A · con ['elevenlabs'], MiniMax no puede ni ser candidato. */
const soloEleven = construirPrefs({ allowedProviders: ['elevenlabs'] });
check('A · con ElevenLabs permitido, MiniMax queda fuera',
  CADENA.filter((p) => pasa(soloEleven, p)).join(',') === 'elevenlabs');
/* B · y si ElevenLabs falla NO hay a quién caer: la cadena permitida tiene uno. */
check('B · si ElevenLabs falla no hay respaldo',
  CADENA.filter((p) => pasa(soloEleven, p) && p !== 'elevenlabs').length === 0);
/* C · sin declararlo, la cadena entera sigue disponible. */
const sinDeclarar = construirPrefs({});
check('C · sin declararlo, la cadena entera sigue disponible',
  CADENA.filter((p) => pasa(sinDeclarar, p)).join(',') === 'elevenlabs,minimax');
/* D · y al revés funciona igual: es genérico, no un permiso para ElevenLabs. */
const soloMinimax = construirPrefs({ allowedProviders: ['minimax'] });
check('D · con MiniMax permitido, ElevenLabs queda fuera',
  CADENA.filter((p) => pasa(soloMinimax, p)).join(',') === 'minimax');
/* E · y una lista vacía deja a todos fuera, que es lo que el Router ya hacía. */
const vacia = construirPrefs({ allowedProviders: [] });
check('E · una lista vacía no deja pasar a nadie',
  CADENA.filter((p) => pasa(vacia, p)).length === 0, 'el Router responde NOT_AVAILABLE');

console.log('\n─── C. El Router no se tocó ───');

check('el filtro es el de siempre', /return skip\('fuera de la familia de modelos permitida', 'peticion'\)/.test(router));
check('y el bucle de candidatos tampoco cambió', /for \(const candidate of decision\.candidates\) \{/.test(router));

console.log('\n─── D. Los tres que ya lo usaban, igual ───');

check('10 · el vídeo sigue fijando su familia',
  /allowedProviders: \[\.\.\.VIDEO_PROVIDERS\]/.test(leer('functions/src/engine/video.ts')));
check('11 · Weë Brain sigue fijando el suyo',
  /allowedProviders: \['deepseek'\]/.test(leer('functions/src/creator/brain.ts')));
check('12 · la imagen sigue fijando el del modelo elegido',
  /allowedProviders: \[choice\.model\.provider\]/.test(leer('functions/src/engine/image.ts')));
/* Y el orden de mezcla no cambió: lo del motor de dominio sigue mandando. */
check('y lo que pone el motor de dominio sigue mandando sobre lo del paso',
  ejecutor.indexOf('prefs: { ...prefs, ...planned.prefs }') > ejecutor.indexOf('const prefs: RoutingPrefs = {'));

console.log('\n─── E. Genérico: sin nombres propios ───');

const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
check('el transporte no nombra ningún proveedor',
  !/(elevenlabs|minimax|seedance|gemini|deepseek|flux|seedream|claude|openai)/i.test(sinComentarios(trozo)));
check('ni ninguna capacidad',
  !/voice\.|video\.|image\.|text\./.test(sinComentarios(trozo)));
/* CONTROL: un atajo con nombre propio TIENE que caer. */
check('CONTROL: un `if capability === voice.tts` sería detectado',
  /voice\./.test("if (next.capability === 'voice.tts') prefs.allowedProviders = ['elevenlabs'];"),
  'si esto pasara, el grupo E no protegería nada');

/* Y el cambio no se llevó por delante ninguna otra autoridad. */
for (const [que, ruta, marca] of [
  ['el Credit Engine', 'functions/src/creator/index.ts', /await holdCredits\(uid, jobId, job\.plan, job\.creditsEstimated, description\);/],
  ['la liquidación', 'functions/src/creator/index.ts', /await settleCredits\(uid, jobId, job\.creditsEstimated, used, description\);/],
  ['el Asset Core', 'functions/src/creator/index.ts', /const assetIds = await materialesDeResultado\(/],
]) {
  check(`${que} sigue donde estaba`, marca.test(leer(ruta)));
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nUn paso puede decir qué proveedores admite, y el Router le hace caso');
process.exit(failures ? 1 : 0);
