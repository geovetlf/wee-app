/**
 * GRAN MOTOR · PAQUETE A — HUECOS DE `engine/sanitize.ts` (defectos CONOCIDOS).
 *
 * `security.test.mjs` fija las formas de credencial que ya se censuraban. Esta
 * suite mide las que se escapan hoy, con sondas contra el compilado:
 *
 *   · JSON ANIDADO EN UN TEXTO. El cuerpo de error de un proveedor suele traer
 *     la petición como cadena: `{"error":"... {\"api_key\":\"…\"} ..."}`. Con las
 *     comillas escapadas, los patrones de cabecera no casan y el valor sale entero.
 *   · URL FIRMADAS. `X-Goog-Signature`, `X-Amz-Signature`, `X-Tos-Signature`,
 *     `…-Credential` y `…-Security-Token` son capacidades portadoras.
 *   · TOKENS QUE NO SON `access_token`: `refresh_token`, `id_token`, `session_token`.
 *   · CLAVES PRIVADAS PEM.
 *
 * Gran Motor S2 (2026-10-16): el parche de A (`docs/GRAN-MOTOR-A-sanitize.patch`) se
 * aplicó en `engine/sanitize.ts`, ampliado (token/sig/signature sueltos, usuario y
 * contraseña en una URL, correos), y las guardas de frontera (`puente-pre-f1d` E4/F1,
 * `video-asincrono` H2) se reconciliaron de forma aditiva. Los 15 huecos dejaron de
 * ser «conocidos»: ahora son comprobaciones normales que EXIGEN el saneo (con el
 * `sanitize.ts` de 8fcaccdc fallaban las 15; ver docs/GRAN-MOTOR-S2-PAGOS-SANITIZE.md).
 * Las secciones P y D siguen: la propuesta de A sigue cerrándolos y lo que ya
 * funcionaba no se rompe. La sección E añade sondas nuevas, positivas y negativas.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const { sanitizeForLog, providerLog, REDACTED, EMAIL_REDACTED } = lib('engine/sanitize.js');
const limpio = (texto, secreto) => !sanitizeForLog(texto, 600).includes(secreto);

/*
 * Los patrones PROPUESTOS (los mismos de docs/GRAN-MOTOR-A-sanitize.patch), aplicados DESPUÉS del censor actual.
 * Se construyen con `new RegExp` y cadenas crudas para no duplicar el escapado de la barra invertida.
 */
const BARRA = String.raw`\\*`; // cero o más barras invertidas
const VALOR = String.raw`[^"\\\n,}]+`;
const PROPUESTOS = [
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g, replace: REDACTED },
  { re: new RegExp(`(${BARRA}"?authorization${BARRA}"?\\s*[:=]\\s*${BARRA}"?)(${VALOR})`, 'gi'), replace: `$1${REDACTED}` },
  {
    re: new RegExp(`(${BARRA}"?(?:x-api-key|xi-api-key|x-key|api[_-]?key|apikey|(?:access|refresh|id|session)[_-]?token|private[_-]?key|secret|password)${BARRA}"?\\s*[:=]\\s*${BARRA}"?)(${VALOR})`, 'gi'),
    replace: `$1${REDACTED}`,
  },
  { re: new RegExp(String.raw`([?&](?:[\w-]*(?:signature|credential|security[_-]?token)|sig|(?:refresh|id|session)[_-]?token)=)([^&\s"\\]+)`, 'gi'), replace: `$1${REDACTED}` },
];
const conPropuesta = (texto) => {
  let t = sanitizeForLog(texto, 100_000);
  for (const { re, replace } of PROPUESTOS) t = t.replace(re, replace);
  return t;
};
const limpioConPropuesta = (texto, secreto) => !conPropuesta(texto).includes(secreto);

const Q = '\\"'; // una comilla escapada, como llega dentro de un texto
/* Las formas de credencial se parten a propósito: el escáner de secretos del repositorio no distingue un ejemplo de un valor real. */
const AWS = 'AK' + 'IA1234567890ABCDEF';
const PEM = '-----BEGIN ' + 'PRIVATE KEY-----';
const PEM_RSA = '-----BEGIN RSA ' + 'PRIVATE KEY-----';
const PEM_FIN = '-----END ' + 'PRIVATE KEY-----';
const SK = 's' + 'k-abcdefghijklmnop1234';
/* Cada hueco: [id, nombre, texto con la credencial, el secreto que NO debe sobrevivir]. */
const HUECOS = [
  ['A1', 'JSON anidado: api_key', `{"error":"bad {${Q}api_key${Q}:${Q}abcd1234efgh5678${Q}}"}`, 'abcd1234efgh5678'],
  ['A2', 'JSON anidado: authorization Key', `req {${Q}authorization${Q}:${Q}Key fal_abcdefghijk${Q}}`, 'fal_abcdefghijk'],
  ['A3', 'JSON anidado: x-api-key con espacio', `{${Q}x-api-key${Q}: ${Q}0123456789abcdef0123456789abcdef${Q}}`, '0123456789abcdef0123456789abcdef'],
  ['B1', 'URL firmada: X-Goog-Signature', 'https://storage.googleapis.com/b/o?X-Goog-Signature=0123456789abcdefSECRETO&X-Goog-Expires=600', '0123456789abcdefSECRETO'],
  ['B2', 'URL firmada: X-Goog-Credential', 'https://storage.googleapis.com/b/o?X-Goog-Credential=sa%40proyecto.iam%2F2026', 'sa%40proyecto'],
  ['B3a', 'URL firmada: X-Amz-Signature', `GET https://x.com/v?X-Amz-Credential=${AWS}&X-Amz-Signature=abcdef123456SECRETO`, 'abcdef123456SECRETO'],
  ['B3b', 'URL firmada: X-Amz-Credential', `GET https://x.com/v?X-Amz-Credential=${AWS}`, AWS],
  ['B4a', 'URL firmada: X-Tos-Signature (BytePlus)', 'https://tos.example.com/v.mp4?X-Tos-Signature=deadbeef1234SECRETO&X-Tos-Expires=600', 'deadbeef1234SECRETO'],
  ['B4b', 'URL firmada: X-Tos-Security-Token (BytePlus)', 'https://tos.example.com/v.mp4?X-Tos-Security-Token=tokensecreto9999', 'tokensecreto9999'],
  ['C1', 'refresh_token', '"refresh_token":"1//0gAbCdEfGhIjKlSECRETO"', '0gAbCdEfGhIjKlSECRETO'],
  ['C2a', 'id_token', 'id_token=abcdefSECRETO123456', 'abcdefSECRETO123456'],
  ['C2b', 'session_token', 'session_token: abcdefSECRETO123456', 'abcdefSECRETO123456'],
  ['C3', 'clave privada PEM', `${PEM}\nMIIEvQIBADANBgkqhSECRETO\n${PEM_FIN}`, 'MIIEvQIBADANBgkqhSECRETO'],
  ['C4', 'clave privada PEM truncada (sin la línea de cierre)', `error al leer ${PEM_RSA}\nMIIEowIBAAKCAQEASECRETO`, 'MIIEowIBAAKCAQEASECRETO'],
  ['C5', 'private_key de una cuenta de servicio en JSON', `{"private_key":"${PEM}\\nMIIEvgSECRETO\\n${PEM_FIN}\\n"}`, 'MIIEvgSECRETO'],
];

console.log('\n── A–C · Los 15 huecos de A: el secreto NO sobrevive (antes, defectos conocidos) ──');
for (const [id, nombre, texto, secreto] of HUECOS) check(`${id}) ${nombre}: el secreto no sobrevive al saneo`, limpio(texto, secreto), sanitizeForLog(texto, 600));

console.log('\n── P · La propuesta (docs/GRAN-MOTOR-A-sanitize.patch) los cierra todos ──');
{
  const abiertos = HUECOS.filter(([, , texto, secreto]) => !limpioConPropuesta(texto, secreto)).map(([id]) => id);
  check(`P1) con los patrones propuestos NO sobrevive ningún secreto de las ${HUECOS.length} sondas`, abiertos.length === 0, abiertos.join(', ') || 'todas cerradas');
  check('P2) se conserva lo que sirve para depurar: el nombre de la cabecera y el host/ruta de la URL',
    /api_key/.test(conPropuesta(`{${Q}api_key${Q}:${Q}abcd1234efgh5678${Q}}`))
    && /storage\.googleapis\.com\/b\/o\?X-Goog-Signature=/.test(conPropuesta('https://storage.googleapis.com/b/o?X-Goog-Signature=0123456789abcdefSECRETO')));
  const LIMPIOS = ['GET https://x.com/v?page=2&lang=es', 'el proveedor respondió 500, reintenta', 'modelo=gemini-3.1-flash-lite codigo=429', 'tokens usados: 1200 (token_count=1200)', 'firma de la función: signature of fn()'];
  const cambian = LIMPIOS.filter((t) => conPropuesta(t) !== sanitizeForLog(t, 100_000));
  check('P3) los textos sin credencial salen IDÉNTICOS con y sin la propuesta', cambian.length === 0, cambian.join(' | '));
  check('P4) y lo que ya se censuraba se sigue censurando (Authorization, Bearer, sk-, AIza)',
    ['authorization: Bearer abc123def456ghi789', SK, 'AIzaSyA1234567890abcdefghijk'].every((t) => conPropuesta(t).includes(REDACTED)));
}

console.log('\n── D · Lo que ya funciona hoy y no se puede romper ──');
{
  check('D1) Authorization / Bearer / sk- / AIza siguen censurados',
    limpio('authorization: Bearer abc123def456ghi789', 'abc123def456ghi789') && limpio(SK, SK.slice(3)) && limpio('AIzaSyA1234567890abcdefghijk', 'A1234567890abcdefghijk'));
  check('D2) un mensaje sin credencial sale tal cual (espacios colapsados)', sanitizeForLog('el proveedor   respondió 500\nreintenta', 100) === 'el proveedor respondió 500 reintenta');
  check('D3) y sigue acotado de tamaño', sanitizeForLog('x'.repeat(1000)).length <= 201);
  check('D4) `providerLog` pasa por el mismo censor (credencial en forma normal)', !providerLog({ provider: 'p', message: 'api_key=abcd1234efgh5678' }).includes('abcd1234efgh5678'));
  check('D5) la marca de censura es la de siempre', sanitizeForLog('api_key=abcd1234efgh5678').includes(REDACTED));
  const parche = leer('docs/GRAN-MOTOR-A-sanitize.patch');
  check('D6) el parche está donde se dice y toca SOLO engine/sanitize.ts', /^diff --git a\/functions\/src\/engine\/sanitize\.ts/m.test(parche) && (parche.match(/^diff --git/gm) || []).length === 1);
}

console.log('\n── E · Gran Motor S2: sondas nuevas (valores sintéticos) ──');
{
  const QQ = String.raw`\\\"`; // comilla escapada DOS veces, como llega un cuerpo de error dentro de otro
  const PEM_EC = '-----BEGIN EC ' + 'PRIVATE KEY-----';
  const PEM_EC_FIN = '-----END EC ' + 'PRIVATE KEY-----';
  const POSITIVOS = [
    ['E1', 'JSON escapado dos veces: api_key', `{"e":"{${QQ}api_key${QQ}:${QQ}zzSECRETOdoble01${QQ}}"}`, 'zzSECRETOdoble01'],
    ['E2', 'JSON escapado: Authorization Bearer', `{${Q}Authorization${Q}:${Q}Bearer abcdefSECRETO0123${Q}}`, 'abcdefSECRETO0123'],
    ['E3', '`"token":"…"` suelto', '{"token":"tok_sintetico_0123456789"}', 'tok_sintetico_0123456789'],
    ['E4', '`token=` en una URL', 'https://firebasestorage.googleapis.com/v0/b/demo/o/x?alt=media&token=1234abcdSECRETO', '1234abcdSECRETO'],
    ['E5', '`sig=` (SAS) en una URL', 'https://cuenta.blob.core.windows.net/c/v.mp4?sv=2024&sig=AbCdSECRETO%3D', 'AbCdSECRETO%3D'],
    ['E6', '`access_token=` en una URL', 'https://api.example.com/v1?access_token=ya29SINTETICOSECRETO', 'ya29SINTETICOSECRETO'],
    ['E7', 'X-Amz-Security-Token', 'https://s3.example.com/o?X-Amz-Security-Token=FQoSINTETICOSECRETO&X-Amz-Expires=60', 'FQoSINTETICOSECRETO'],
    ['E8', 'usuario:contraseña en una URL', 'connect postgres://usuario:claveSINTETICA99@db.example.com:5432/x', 'claveSINTETICA99'],
    ['E9', 'refresh_token en un formulario', 'grant_type=refresh_token&refresh_token=1//SINTETICOSECRETO&client_id=x', '1//SINTETICOSECRETO'],
    ['E10', 'client_secret en JSON', '{"client_id":"abc.apps","client_secret":"SINTETICO-client-SECRETO"}', 'SINTETICO-client-SECRETO'],
    ['E11', 'correo en el cuerpo de un error', 'invalid user persona.sintetica@example.com', 'persona.sintetica@example.com'],
    ['E12', 'PEM de clave EC', `${PEM_EC}\nMHcCAQEEISINTETICO\n${PEM_EC_FIN}`, 'MHcCAQEEISINTETICO'],
    ['E13', 'cabecera x-goog-api-key escapada', `{${Q}x-goog-api-key${Q}:${Q}SINTETICOgoog0123456789${Q}}`, 'SINTETICOgoog0123456789'],
  ];
  for (const [id, nombre, texto, secreto] of POSITIVOS) check(`${id}) ${nombre}: el secreto no sobrevive`, limpio(texto, secreto), sanitizeForLog(texto, 600));

  /* Errores: de un Error solo sale el mensaje (saneado); ni stack, ni cause, ni lo que cuelga un SDK. */
  const err = new Error('fallo de proveedor {"api_key":"msgSECRETO0123456"}');
  err.cause = new Error('causa con Bearer causaSECRETO0123456');
  err.response = { data: { echo: 'respSECRETO0123456' } };
  err.config = { headers: { Authorization: 'Bearer cfgSECRETO0123456' } };
  err.stack = 'Error: x\n    at pilaSECRETO0123456 (archivo.js:1:1)';
  const deError = sanitizeForLog(err, 2000);
  check('E14) Error: el mensaje sale saneado y sin cause, stack, response.data ni config.headers',
    deError.includes('fallo de proveedor') && !['msgSECRETO0123456', 'causaSECRETO0123456', 'respSECRETO0123456', 'cfgSECRETO0123456', 'pilaSECRETO0123456'].some((x) => deError.includes(x)), deError);
  check('E15) un objeto suelto no se vuelca (no salen sus campos)', !sanitizeForLog({ headers: { authorization: 'Bearer objSECRETO0123456' } }).includes('objSECRETO0123456'));
  const linea = providerLog({ provider: 'p', endpoint: 'https://storage.googleapis.com/b/o?X-Goog-Signature=sigSECRETO01', message: `{${Q}api_key${Q}:${Q}bodySECRETO01${Q}}` });
  check('E16) providerLog con una URL firmada como endpoint y un cuerpo escapado no deja nada',
    !linea.includes('sigSECRETO01') && !linea.includes('bodySECRETO01') && linea.includes('storage.googleapis.com'), linea);

  /* Negativos: lo legítimo sale IGUAL (sin sobre-saneo). */
  const LEGITIMOS = [
    'trabajo job_8f3a2c1d paso step-2 requestId=req_123 traceId=tr_456',
    'modelo=gemini-3.1-flash-lite proveedor=seedance modelo=seedance-2-0-pro',
    'GET https://storage.googleapis.com/wee-public/posts/a.jpg?width=200&format=webp',
    'https://example.com/@usuario/videos',
    'max_tokens: 1200 · token_count=1200 · tokens usados: 900 · prompt_token_count: 30',
    'firma de la función: signature of fn()',
    'el proveedor respondió 429; reintenta en 3 s',
    'aiGenerations/gen_0001 FAILED http=500',
  ];
  const cambiados = LEGITIMOS.filter((t) => sanitizeForLog(t, 600) !== t);
  check('E17) textos legítimos (ids de trabajo, modelos, URL públicas sin firma, recuentos de tokens) salen idénticos', cambiados.length === 0, cambiados.map((t) => `${t} → ${sanitizeForLog(t, 600)}`).join(' | '));
  check('E18) el correo lleva su propia etiqueta, no la de credencial', sanitizeForLog('a b.c@example.com').includes(EMAIL_REDACTED) && !sanitizeForLog('a b.c@example.com').includes(REDACTED));
  check('E19) el nombre del parámetro firmado se conserva para depurar', /X-Goog-Signature=\[credencial omitida\]/.test(sanitizeForLog('https://s.example.com/o?X-Goog-Signature=abcSECRETO', 600)));
}

check('esta suite está en la cadena de `npm test`', /sanitize-huecos\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ todo bien (los ${HUECOS.length} huecos de A, cerrados y exigidos)`);
process.exit(failures ? 1 : 0);
