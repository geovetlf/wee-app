/*
 * QUE EL CONDUCTOR TAMBIÉN DEJE CONSTANCIA (B3.15.1).
 *
 * `aiProviderVerification` es la única prueba de que una integración pasó de
 * «escrita» a «respondió de verdad». Hasta B3.15.1 la escribía SOLO el Router
 * del motor, y el conductor del Core no pasa por ahí.
 *
 * Medido en producción el 2026-09-23: Seedance había generado dos vídeos con
 * coste de proveedor real —USD 0,2273 cada uno, 68 y 79 segundos— y el registro
 * de verificación no tenía ni un documento suyo. El inventario decía que
 * Seedance nunca había contestado.
 *
 * Un inventario que se queda corto es peor que no tenerlo, porque nadie duda de
 * él. Esto vigila que no vuelva a pasar, y que la corrección no ascienda a nadie
 * que no lo merezca.
 *
 *  A. Hay UNA fuente de verdad, y una sola colección.
 *  B. Qué cuenta como éxito real. (EJECUTADO)
 *  C. El conductor registra, y en el sitio correcto.
 *  D. El Router de siempre sigue registrando igual.
 *  E. Es genérica: sin nombres de proveedor ni de capacidad.
 *  F. Idempotencia y forma del documento.
 *  G. El registro vive en dos sitios, y en ningún otro.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const lib = (p) => require_(path.resolve(here, '../lib/' + p));

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const verificacion = leer('functions/src/engine/verification.ts');
const seam = leer('functions/src/runtime/index.ts');
const router = leer('functions/src/engine/router.ts');

console.log('\n─── A. Una sola fuente de verdad ───');

check('la colección es una', (verificacion.match(/collection\('aiProviderVerification'\)/g) || []).length === 1);
/* Ni un segundo registro por camino: eso sería el problema con otro nombre. */
const TODAS = ['functions/src/runtime/index.ts', 'functions/src/runtime/ejecutor.ts', 'functions/src/core/gateway.ts', 'functions/src/engine/router.ts'];
check('nadie crea una colección paralela',
  !TODAS.some((p) => /coreProviderVerification|legacyProviderVerification|runtimeProviderVerification/.test(leer(p))));
check('y solo `verification.ts` escribe en ella',
  !TODAS.some((p) => /collection\('aiProviderVerification'\)/.test(leer(p))));

console.log('\n─── B. Qué cuenta como éxito real. EJECUTADO ───');

/*
 * El predicado se EJECUTA contra los diez casos que de verdad pueden llegar.
 * Leerlo probaría que dice lo correcto; ejecutarlo prueba que lo hace.
 */
const { esExitoRealDeProveedor } = lib('engine/verification.js');
check('el predicado existe y es una función', typeof esExitoRealDeProveedor === 'function');

const CASOS = [
  ['F · un éxito real del Core se registra', ['completed', [], 'seedance'], true],
  ['C · un fallo del proveedor NO', ['failed', [], 'seedance'], false],
  ['B · aceptado pero sin resultado todavía NO', ['accepted', [], 'seedance'], false],
  ['A · proveedor elegido sin respuesta NO', [undefined, [], 'seedance'], false],
  ['E · un resultado sintético NO', ['completed', ['synthetic_result'], 'gemini'], false],
  ['D · el modo demostración NO', ['completed', [], 'mock'], false],
  ['sin proveedor NO', ['completed', [], undefined], false],
  ['sin proveedor (cadena vacía) NO', ['completed', [], ''], false],
  ['I · otro proveedor cualquiera SÍ', ['completed', [], 'elevenlabs'], true],
  ['J · y con cualquier otra capacidad también', ['completed', ['usage_missing'], 'flux'], true],
];
for (const [nombre, [estado, avisos, proveedor], esperado] of CASOS) {
  check(nombre, esExitoRealDeProveedor(estado, avisos, proveedor) === esperado,
    `${estado ?? 'sin estado'} · ${JSON.stringify(avisos)} · ${proveedor ?? 'sin proveedor'}`);
}
/* Y aguanta lo que llegue sin avisos declarados. */
check('sin lista de avisos no revienta', esExitoRealDeProveedor('completed', undefined, 'gemini') === true);

console.log('\n─── C. El conductor registra, y en el sitio correcto ───');

/*
 * En `libroDelMotor.cerrar`, que es el ÚNICO punto por el que pasa todo lo que
 * el conductor ejecuta —`ejecutor.ts` lo llama una vez por intento, justo
 * después de que el Gateway conteste—. No en cada adaptador, no en cada
 * capacidad: en el sitio donde ya se sabe quién contestó y con qué modelo.
 */
check('el seam importa el registro y el predicado',
  /import \{ esExitoRealDeProveedor, recordRealSuccess \} from '\.\.\/engine\/verification';/.test(seam));
check('y lo llama dentro de `cerrar`',
  /async cerrar\(fila, \{ dispatch, resultado, durationMs \}\)[\s\S]{0,2600}?void recordRealSuccess\(/.test(seam));
check('decidiendo con el predicado compartido',
  /if \(esExitoRealDeProveedor\(resultado\.status, resultado\.warnings, quien\?\.providerId\)\)/.test(seam));
/* Antes de cerrar la fila: si anotar fallara, lo que ya se pagó no pierde constancia. */
check('y antes de cerrar la fila, como el Router',
  seam.indexOf('void recordRealSuccess(') < seam.indexOf('await ledger.close(fila'));
/* Y el ejecutor sigue llamando a `cerrar` UNA vez por intento. */
const ejecutor = leer('functions/src/runtime/ejecutor.ts');
check('el ejecutor cierra una sola vez por intento',
  (ejecutor.match(/deps\.libro\?\.cerrar\(/g) || []).length === 1);
/* H · el sondeo vive DENTRO del adaptador, así que no multiplica cierres. */
check('H · el sondeo no multiplica cierres: ocurre dentro del adaptador',
  /pollUntil/.test(leer('functions/src/engine/providers/seedance.ts'))
  && !/pollUntil/.test(ejecutor));

console.log('\n─── D. El Router de siempre sigue igual ───');

check('sigue registrando donde registraba', /if \(!demo\) void recordRealSuccess\(/.test(router));
check('y sigue descartando lo aceptado antes de llegar',
  /if \(salida\.accepted\) throw new EngineError\('PROVIDER_ERROR', undefined, \{ provider: candidate\.provider, reason: 'accepted_sin_soporte' \}\)/.test(router));
/* Las dos puertas llegan a lo mismo: ni una asciende a quien la otra no ascendería. */
/*
 * El caso «demo» hay que emparejarlo bien: en el conductor un demo llega con
 * `synthetic_result`, que es su señal; en el Router llega con `demo = true`. La
 * primera versión de esta prueba pasaba un demo SIN la señal y se extrañaba de
 * que las dos puertas no coincidieran. No discrepaban: la prueba estaba
 * comparando dos cosas distintas.
 */
for (const [caso, estado, avisos, prov, demo] of [
  ['un éxito real', 'completed', [], 'seedance', false],
  ['un demo', 'completed', ['synthetic_result'], 'seedance', true],
  ['un mock', 'completed', [], 'mock', false],
  ['un fallo', 'failed', [], 'seedance', false],
]) {
  const core = esExitoRealDeProveedor(estado, avisos, prov);
  const legacy = estado === 'completed' && !demo && prov !== 'mock';
  check(`las dos puertas coinciden en ${caso}`, core === legacy, `core=${core} legacy=${legacy}`);
}

console.log('\n─── E. Genérica: sin nombres propios ───');

/* Sin comentarios: los motivos SÍ nombran proveedores, y deben poder hacerlo. */
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const NOMBRES = /(seedance|deepseek|elevenlabs|minimax|gemini|claude|openai|flux|seedream)/i;
const bloque = (() => {
  const i = seam.indexOf('async cerrar(fila');
  return sinComentarios(seam.slice(i, seam.indexOf('});', i)));
})();
check('el registro del conductor no nombra a ningún proveedor', !NOMBRES.test(bloque));
check('ni a ninguna capacidad', !/video\.|image\.|voice\.|text\./.test(bloque));
check('y el predicado tampoco', !NOMBRES.test(sinComentarios(verificacion.slice(
  verificacion.indexOf('export const esExitoRealDeProveedor'),
  verificacion.indexOf('const collection =')))));
/* No se añadió nadie a mano a la tabla declarada. */
const declarados = [...verificacion.matchAll(/^  '?([a-z-]+)'?: \{$/gm)].map((m) => m[1]);
check('no se añadió deepseek a mano a la tabla declarada', !declarados.includes('deepseek'),
  `declarados: ${declarados.join(', ')}`);

console.log('\n─── F. Idempotencia y forma del documento ───');

/* G · el mismo éxito dos veces no crea dos documentos: la clave es el proveedor. */
check('G · el documento se identifica por proveedor, no por intento',
  /const ref = collection\(\)\.doc\(provider\);/.test(verificacion));
check('la primera vez escribe, las siguientes suman',
  /if \(!snap\.exists\)[\s\S]{0,300}successes: 1[\s\S]{0,200}return;/.test(verificacion)
  && /successes: \(Number\(snap\.data\(\)\?\.successes\) \|\| 0\) \+ 1 \}, \{ merge: true \}/.test(verificacion));
check('y el esquema no cambió',
  ['provider', 'firstSuccessAt', 'lastSuccessAt', 'model', 'capability', 'generationId', 'successes']
    .every((c) => new RegExp(`\\b${c}\\b`).test(verificacion)));
/* Anotar no puede tumbar una generación que ya salió bien. */
check('anotar nunca tumba una generación', /catch \(error\)[\s\S]{0,180}no se pudo registrar la verificación/.test(verificacion));
check('y el seam no espera a que termine', /void recordRealSuccess\(/.test(seam));
/* El identificador de la petición no se interpreta: valen los dos formatos. */
check('el requestId no se parsea ni se restringe',
  !/run_/.test(sinComentarios(verificacion)) && !/requestId/.test(sinComentarios(verificacion)));

console.log(String.fromCharCode(10) + '─── G. El registro vive en dos sitios, y en ningún otro ───');

/*
 * LA PRIMERA VERSIÓN DE ESTE GRUPO SOLO PODÍA PASAR UNA VEZ.
 *
 * Preguntaba a `git diff HEAD` qué archivos estaban tocados, y eso describe el
 * árbol de trabajo, no el código: pasaba mientras el cambio estaba sin commit y
 * falló para siempre en cuanto se confirmó. Una prueba que mide un estado
 * transitorio no protege nada; solo avisa de que alguien hizo commit.
 *
 * Lo que de verdad hay que sostener es dónde VIVE el registro: en el Router del
 * motor y en el seam del conductor, y en ningún otro sitio. Eso es cierto hoy y
 * mañana, y se rompe justo cuando importa: cuando alguien añade una tercera
 * llamada suelta en un adaptador o en una capacidad.
 */
const fuentes = [];
const recorrer = (dir) => {
  for (const f of fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true })) {
    if (f.isDirectory()) recorrer(`${dir}/${f.name}`);
    else if (f.name.endsWith('.ts')) fuentes.push(`${dir}/${f.name}`);
  }
};
recorrer('functions/src');

const LLAMADA = 'recordRealSuccess(';
const llaman = fuentes.filter((f) => leer(f).includes(LLAMADA) && !f.endsWith('engine/verification.ts'));
check('solo dos sitios llaman al registro', llaman.length === 2, llaman.join(', '));
check('y son el Router del motor y el seam del conductor',
  llaman.includes('functions/src/engine/router.ts') && llaman.includes('functions/src/runtime/index.ts'),
  llaman.join(', '));
/* Ni un adaptador lo llama por su cuenta: eso sería volver a tener N caminos. */
const adaptadores = fuentes.filter((f) => f.includes('/providers/') && /recordRealSuccess/.test(leer(f)));
check('ningún adaptador lo llama por su cuenta', adaptadores.length === 0, adaptadores.join(', ') || 'ninguno');
check('y lo declara un solo archivo',
  fuentes.filter((f) => /export async function recordRealSuccess/.test(leer(f))).length === 1);

/* CONTROL: una tercera llamada suelta TIENE que caer. */
check('CONTROL: una tercera llamada suelta sería detectada',
  "void recordRealSuccess('x','y','z');".includes(LLAMADA),
  'si esto pasara, el grupo G no protegería nada');

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nEl conductor deja constancia igual que el Router');
process.exit(failures ? 1 : 0);
