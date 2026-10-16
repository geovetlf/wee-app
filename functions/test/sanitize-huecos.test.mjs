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
 * POR QUÉ ES «CONOCIDO» Y NO UN ARREGLO: el cambio es de `engine/sanitize.ts`, y las
 * guardas de frontera (`puente-pre-f1d` F1, `video-asincrono` H2) fijan QUÉ archivos
 * del motor se pueden tocar y con qué tamaño. Ampliarlas es una decisión del
 * dueño, no de esta misión. El parche está listo y verificado en
 * `docs/GRAN-MOTOR-A-sanitize.patch`; y esta suite demuestra, sin tocar el motor,
 * que los patrones propuestos cierran TODOS los huecos sin cambiar lo que ya salía.
 *
 * Se informa con ✘ (conocido) sin parar la cadena; si deja de reproducirse (se
 * aplicó el parche) avisa con ✔ (¿corregido?) para que se actualice el registro.
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
const conocidos = [];
const conocido = (id, name, reproduce, extra = '') => {
  console.log((reproduce ? '✘ (conocido ' + id + ') ' : '✔ (¿corregido? ' + id + ') ') + name + (extra ? ' — ' + extra : ''));
  conocidos.push({ id, reproduce });
};

const { sanitizeForLog, providerLog, REDACTED } = lib('engine/sanitize.js');
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

console.log('\n── A–C · Lo que se escapa hoy (defectos conocidos) ──');
for (const [id, nombre, texto, secreto] of HUECOS) conocido(id, nombre, !limpio(texto, secreto));

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

check('esta suite está en la cadena de `npm test`', /sanitize-huecos\.test\.mjs/.test(leer('functions/package.json')));
const vivos = conocidos.filter((k) => k.reproduce).map((k) => k.id);
const corregidos = conocidos.filter((k) => !k.reproduce).map((k) => k.id);
if (corregidos.length) console.log(`\nℹ huecos que YA NO se reproducen: ${corregidos.join(', ')} — actualiza esta suite y docs/GRAN-MOTOR-A-ROUTER.md`);
console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ todo bien (huecos conocidos vigentes: ${vivos.length}/${conocidos.length})`);
process.exit(failures ? 1 : 0);
