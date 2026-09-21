/**
 * MEDIA CANARY BRIDGE — B-1 y L-1, y nada más.
 *
 * Lo que esta fase construye es un PUENTE: una Function que ata piezas que ya
 * existen, y un llavero de secretos que no toca el de la IA. Todo lo que se
 * prueba aquí es alguna consecuencia de esas dos frases.
 *
 *   A · La composición: se usa lo que hay, no se reescribe nada.
 *   B · Los dos llaveros, aislados de verdad.
 *   C · Propiedad y seguridad de la puerta.
 *   D · Qué NO se ha hecho: ni desplegar, ni ampliar alcance.
 *
 * NADA ESTÁ DESPLEGADO y no se ha hecho ni una llamada a ningún proveedor.
 *
 * Usa el compilado: `npm run build` antes de `npm test`.
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
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };

const core = lib('core/index.js');
const CANARY = sinComentarios(leer('functions/src/media/canary.ts'));
const SECRETOS = leer('functions/src/secrets.ts');
const INDEX = leer('functions/src/index.ts');

/* ═══ A · LA COMPOSICIÓN ══════════════════════════════════════════════════ */
console.log('\n── A · Se usa lo que hay, no se reescribe nada ──');
{
  check('1 · la Function existe y es un solo archivo de composición', fs.existsSync(path.resolve(RAIZ, 'functions/src/media/canary.ts')));
  check('2 · usa el TRABAJADOR existente de la Fase 12-A', /import \{ atenderEntrega \} from '\.\.\/job\/worker'/.test(CANARY) && /atenderEntrega\(deps, entrega\)/.test(CANARY));
  check('3 · usa la COLA existente, sin crear otra', /import \{ colaDeInvocacion \} from '\.\.\/runtime\/cola'/.test(CANARY) && /colaDeInvocacion\(ahora\)/.test(CANARY));
  check('4 · usa el EJECUTOR de MC-4', /crearEjecutorDeMedios\(\{/.test(CANARY));
  check('usa el MOTOR de la Fase 8 y el ALMACÉN de la 12-D', /crearMotorDeTrabajosDeWee\(\)/.test(CANARY) && /almacenDeTrabajos\(db\)/.test(CANARY));
  check('y los adaptadores y el procesador de MC-1/MC-4', /adaptadoresDeMedios\(\)/.test(CANARY) && /crearProcesadorDeImagen\(\)/.test(CANARY));

  check('10 · NO crea un segundo motor de trabajos', !/crearJobEngine/.test(CANARY));
  check('10 · NO crea una cola nueva', !/class .*Cola|new Map\(\)|enqueue\(message\)|const avisos/.test(CANARY));
  check('10 · NO copia la lógica del trabajador: ni concesiones, ni transiciones, ni reintentos',
    !/reclamar\(|marcarEnvio|renovar\(|aplicar\(|transition|maxAttempts|backoff/.test(CANARY));
  check('no mete R2 ni `sharp` dentro del trabajador: el trabajador no se tocó',
    !/r2|sharp/i.test(sinComentarios(leer('functions/src/job/worker.ts'))));
  check('ni crea un `atenderEntregaR2` ni un `mediaWorkerR2`', !/atenderEntregaR2|mediaWorkerR2/.test(CANARY));

  /* La composición se puede construir de verdad. */
  const { TRANSFORMACION_DEL_CANARY } = lib('media/canary.js');
  const core = lib('core/index.js');
  check('la transformación del canary está FIJA en el código y es válida',
    core.transformacionValida(TRANSFORMACION_DEL_CANARY) && TRANSFORMACION_DEL_CANARY.tipo === 'thumbnail' && TRANSFORMACION_DEL_CANARY.ancho === 400);
  check('y está congelada: nadie la cambia en caliente', Object.isFrozen(TRANSFORMACION_DEL_CANARY));
}

/* ═══ B · LOS DOS LLAVEROS ════════════════════════════════════════════════ */
console.log('\n── B · MEDIA_SECRETS no roza AI_SECRETS ──');
{
  const { AI_SECRETS, MEDIA_SECRETS, MEDIA_SECRET_NAMES, PROVIDER_SECRET_NAMES, CALLBACK_SECRETS, RECONCILIATION_SECRETS } = lib('secrets.js');
  const nombres = (l) => l.map((s) => s.name ?? s.secretName ?? String(s)).sort();

  check('5 · MEDIA_SECRETS existe y lleva SOLO las dos credenciales de R2',
    MEDIA_SECRET_NAMES.join(',') === 'R2_ACCESS_KEY_ID,R2_SECRET_ACCESS_KEY', MEDIA_SECRET_NAMES.join(','));
  check('5 · el identificador de cuenta y el contenedor NO están: no son credenciales',
    !MEDIA_SECRET_NAMES.includes('R2_ACCOUNT_ID') && !MEDIA_SECRET_NAMES.includes('R2_BUCKET'));

  /* K · EL TEST QUE MÁS IMPORTA. */
  check('K · ninguna R2_* entró en PROVIDER_SECRET_NAMES', !PROVIDER_SECRET_NAMES.some((x) => /^R2_/.test(x)));
  check('K · AI_SECRETS NO contiene ningún secreto de medios',
    nombres(AI_SECRETS).every((x) => !/^R2_/.test(x)), nombres(AI_SECRETS).join(','));
  check('K · y los dos conjuntos son DISJUNTOS',
    nombres(AI_SECRETS).filter((x) => nombres(MEDIA_SECRETS).includes(x)).length === 0);
  check('9 · una Function de IA sigue declarando exactamente los mismos secretos que antes',
    AI_SECRETS.length === PROVIDER_SECRET_NAMES.length);
  check('9 · así que si falta el secreto de R2, lo único que no se despliega es Media Cloud',
    MEDIA_SECRETS.length === 2 && !nombres(AI_SECRETS).some((x) => nombres(MEDIA_SECRETS).includes(x)));
  check('sigue el patrón que YA existía para secretos por función',
    Array.isArray(CALLBACK_SECRETS) && Array.isArray(RECONCILIATION_SECRETS) && /CALLBACK_SECRETS/.test(SECRETOS) && /MEDIA_SECRETS/.test(SECRETOS));

  check('la Function declara MEDIA_SECRETS y NADA más', /secrets: MEDIA_SECRETS/.test(CANARY) && !/AI_SECRETS/.test(CANARY));
  check('y ninguna Function existente cambió de secretos',
    !/MEDIA_SECRETS/.test(leer('functions/src/creator/brain.ts')) && !/MEDIA_SECRETS/.test(leer('functions/src/creator/index.ts')) && !/MEDIA_SECRETS/.test(leer('functions/src/creator/video.ts')));

  /* 6 · El saneador de registros tapa AMBOS llaveros. */
  check('6 · el censor de registros recorre los DOS llaveros', /PROVIDER_SECRET_NAMES, \.\.\.MEDIA_SECRET_NAMES/.test(SECRETOS));
  check('6 · y `secretValue` sabe buscar en los dos', /MEDIA_SECRET_REFS as Record/.test(SECRETOS));
  check('6 · no hay ni un `console.` en el puente', !/console\./.test(CANARY));
  check('6 · ni un secreto escrito en el código', !/[A-Za-z0-9/+]{32,}/.test(CANARY) && !/accessKey\s*[:=]\s*['"]/.test(CANARY));
  check('6 · ni la respuesta lleva URL, firma o credencial',
    !/url|firma|signature|secret|credential/i.test(CANARY.split('export interface ResumenDelCanary')[1].split('}')[0]));
}

/* ═══ B2 · LAS TRES ACCIONES ══════════════════════════════════════════════ */
console.log('\n── B2 · Subir, confirmar, procesar: las tres reutilizan MC-3/MC-4 ──');
{
  const { ACCIONES_DEL_CANARY, MAX_BYTES_DEL_CANARY, TIPOS_DEL_CANARY } = lib('media/canary.js');

  check('hay TRES acciones y ninguna más', ACCIONES_DEL_CANARY.join(',') === 'subir,confirmar,procesar');
  check('una acción desconocida se rechaza', /ACCIONES_DEL_CANARY\.includes\(accion\)/.test(CANARY) && /Acción desconocida/.test(CANARY));

  /* Reutilización literal: se llaman las funciones de MC-3, no se reescriben. */
  check('`subir` llama a `solicitarSubida` de MC-3', /await solicitarSubida\(depsDeSubidaDeWee\(getFirestore\(\)\)/.test(CANARY));
  check('`confirmar` llama a `confirmarSubida` de MC-3', /await confirmarSubida\(depsDeSubidaDeWee\(getFirestore\(\)\)/.test(CANARY));
  check('`procesar` sigue llamando a la composición de MC-4', /return ejecutarCanaryDeMedios\(accountId, assetId\)/.test(CANARY));
  check('NO hay un segundo flujo de subida: ni firma, ni clave, ni contenedor propios',
    !/urlDeSubida\(|claveDelObjeto\(|firmarConsulta|rutaCanonica|contenedor/.test(CANARY));
  check('ni se toca la Fase 11 desde aquí: las tres operaciones entran por `depsDeSubidaDeWee`',
    !/crearMaterialParaSubida|marcarMaterialSubido|assets\(\)/.test(CANARY));

  /* El canary estrecha lo que MC-3 admite. */
  check('acepta como mucho una imagen PEQUEÑA', MAX_BYTES_DEL_CANARY === 2 * 1024 * 1024);
  check('y solo tipos que el procesador sabe abrir', TIPOS_DEL_CANARY.join(',') === 'image/png,image/jpeg,image/webp');
  check('es MÁS estrecho que MC-3, nunca más ancho', MAX_BYTES_DEL_CANARY < core.POLITICA_DE_SUBIDA.maxBytes);
  check('un tipo o un tamaño fuera de eso se rechazan en la puerta',
    /TIPOS_DEL_CANARY\.includes\(contentType\)/.test(CANARY) && /bytes > MAX_BYTES_DEL_CANARY/.test(CANARY));

  /* LO QUE MÁS IMPORTA: el material NO se nombra desde fuera. */
  check('el material se DERIVA de (cuenta, clave de operación): no llega ningún identificador',
    /identidadDeMaterialDeSubida\(accountId, operationId\)/.test(CANARY) && !/datos\.assetId/.test(CANARY));
  check('y por tanto no se puede apuntar a un material ajeno ni a uno propio que el canary no creara',
    core.FORMA_DE_ID_DE_MATERIAL.test(lib('media/subida.js').identidadDeMaterialDeSubida('Dl2Ycaoab', 'operacion-de-prueba')));
  check('la clave de operación está acotada', /operationId\.length < 8 \|\| operationId\.length > 128/.test(CANARY));
}

/* ═══ C · PROPIEDAD Y SEGURIDAD ═══════════════════════════════════════════ */
console.log('\n── C · La puerta no deja elegir nada ──');
{
  check('7 · solo administración: reutiliza el guardián que ya existe', /assertAdmin\(request\.auth\)/.test(CANARY) && /from '\.\.\/shared\/admin'/.test(CANARY));
  check('7 · LA CUENTA SALE DE LA SESIÓN, nunca de la petición', /const accountId = request\.auth!\.uid;/.test(CANARY));
  check('7 · y el material NI SIQUIERA SE NOMBRA: se deriva de la cuenta y la clave de operación',
    /const assetId = identidadDeMaterialDeSubida\(accountId, operationId\);/.test(CANARY));
  check('7 · y no puede elegir cuenta, dueño, proveedor, contenedor, clave, destino ni transformación',
    !/data\)\.(accountId|ownerAccountId|providerId|bucket|objectKey|destino|transformacion|processor)/.test(CANARY));
  check('7 · la transformación está escrita en el código, no llega de fuera', /transformaciones: \[TRANSFORMACION_DEL_CANARY\]/.test(CANARY));
  check('8 · la configuración de R2 NO aparece en el Core',
    !/R2|cloudflare|bucket|endpoint|accessKey/i.test(sinComentarios(leer('functions/src/core/media/proceso.ts')))
    && !/R2|cloudflare|endpoint|accessKey/i.test(sinComentarios(leer('functions/src/core/media/puerto.ts'))));
  check('8 · ni el puente nombra credenciales o direcciones de R2', !/R2_ACCESS|R2_SECRET|R2_ACCOUNT|R2_BUCKET|cloudflarestorage/.test(CANARY));
}

/* ═══ D · QUÉ NO SE HA HECHO ══════════════════════════════════════════════ */
console.log('\n── D · Preparado, no desplegado ──');
{
  check('está exportada desde `index.ts`, que es el gesto explícito de «esto ya se despliega»',
    /export \{ mediaCanary \} from '\.\/media\/canary'/.test(INDEX));
  check('y es la ÚNICA de Media Cloud que se exporta: ni subida, ni entrega, ni procesado tienen puerta propia',
    (INDEX.match(/from '\.\/media\//g) || []).length === 1);
  check('el puente no crea infraestructura: ni Pub/Sub, ni Tasks, ni Redis, ni cola durable',
    !/PubSub|CloudTasks|redis|kafka|durable|onMessagePublished|onSchedule/i.test(CANARY));
  /* El comentario parte la frase en dos líneas; se junta antes de buscarla. */
  const PROSA = leer('functions/src/media/canary.ts').replace(/\n\s*\*\s?/g, ' ');
  check('documenta por escrito que la cola durable hará falta más adelante',
    /Durable queue is not required for this first image-processing canary; required before long-running media workloads/.test(PROSA));
  check('no crea bucket, ni despliega, ni llama a ningún proveedor',
    !/createBucket|crearBucket|firebase deploy|fetch\(/.test(CANARY));
  check('no cobra Credits ni toca ningún libro', !/[Cc]redit|ledger|cobrar|spend/i.test(CANARY));
  check('no hace ciclo de vida, ni limpieza, ni migración',
    !/borrar|lifecycle|garbage|migrat|reconcil|retention/i.test(CANARY));
  check('no implementa vídeo, audio ni documentos', !/video|audio|document|ffmpeg/i.test(CANARY));

  check('esta suite está en la cadena de `npm test`', /media-canary\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
