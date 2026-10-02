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

  check('hay CINCO acciones y ninguna más', ACCIONES_DEL_CANARY.join(',') === 'subir,confirmar,procesar,entregar,listar');
  check('una acción desconocida se rechaza', /ACCIONES_DEL_CANARY\.includes\(accion\)/.test(CANARY) && /Acción desconocida/.test(CANARY));
  /*
   * Y NO QUEDA NADA DEL DIAGNÓSTICO DE SEPTIEMBRE. Dos acciones temporales
   * —`subirSinCondicional` para H1, `credenciales` para H2— y una opción en el
   * adaptador vivieron aquí mientras se buscaba por qué R2 devolvía 400. Las
   * tres se retiraron al cerrarse el incidente, y esto impide que vuelvan sin
   * que alguien lo decida.
   */
  check('no queda ninguna acción de diagnóstico temporal',
    !/subirSinCondicional|'credenciales'|formaDeLasCredenciales|diagnosticoSinCondicional/.test(CANARY)
    && !/diagnosticoSinCondicional/.test(leer('functions/src/media/r2.ts')));

  /* Reutilización literal: se llaman las funciones de MC-2/MC-3/MC-4, no se reescriben. */
  check('`subir` llama a `solicitarSubida` de MC-3',
    /await solicitarSubida\(/.test(CANARY) && /depsDeSubidaDeWee\(getFirestore\(\)\)/.test(CANARY));
  check('`confirmar` llama a `confirmarSubida` de MC-3', /await confirmarSubida\(depsDeSubidaDeWee\(getFirestore\(\)\)/.test(CANARY));
  check('`procesar` sigue llamando a la composición de MC-4', /return ejecutarCanaryDeMedios\(accountId, assetId\)/.test(CANARY));
  check('`entregar` llama a `solicitarEntrega` de MC-2', /await solicitarEntrega\(depsDeEntregaDeWee\(getFirestore\(\)\)/.test(CANARY));
  check('NO hay un segundo flujo de subida NI de entrega: ni firma, ni clave, ni contenedor propios',
    !/urlDeSubida\(|urlFirmada\(|claveDelObjeto\(|firmarConsulta|rutaCanonica|contenedor:\s*'|R2_BUCKET|env\(/.test(CANARY));
  /*
   * MC-9 · `listar` SÍ nombra el contenedor, pero para PEDÍRSELO al puerto, que
   * es exactamente lo contrario de tener uno propio: el valor sigue saliendo del
   * adaptador y esta puerta no sabe de dónde.
   */
  check('y el contenedor lo sigue diciendo el PUERTO, no la puerta',
    /contenedor: puerto\.contenedor/.test(CANARY));
  check('`entregar` usa el MISMO material derivado, no uno que llegue de fuera',
    /pedirEntregaDelCanary\(accountId, assetId, operationId\)/.test(CANARY));
  check('devuelve la llave —sin ella no hay GET— y NO la persiste en ningún sitio',
    /return \{ entrega: r\.entrega, traza: r\.traza \}/.test(CANARY) && !/\.set\(|\.create\(|\.update\(/.test(CANARY));
  check('y deja escrito que MC-2 entrega el ORIGINAL, no la miniatura: su contrato no admite variante',
    /el objeto ORIGINAL del material, no su miniatura/i.test(leer('functions/src/media/canary.ts').replace(/\n\s*\*\s?/g, ' ')));
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

/* ═══ Z · MC-9 · LA QUINTA ACCIÓN: ENUMERAR ═══════════════════════════════ */
console.log('\n── Z · Enumerar: solo lectura, y solo lo de uno ──');
{
  const { createHmac, createHash } = require('node:crypto');
  const { ACCIONES_DEL_CANARY, MAX_OBJETOS_DEL_CANARY, listarDelCanary } = lib('media/canary.js');
  const { crearAdaptadorDeR2, R2_PROVIDER_ID, anfitrionDeR2, MAX_CLAVES_POR_PAGINA } = lib('media/r2.js');
  const { claveDelObjeto, prefijoDeCuenta, claveEsDeLaCuenta } = core;

  const ANA = 'cuentaDeAna';
  const BEA = 'cuentaDeBea';
  const CUENTA_R2 = 'a'.repeat(32);
  const CONFIG = { accountId: CUENTA_R2, accessKeyId: 'AKIAEJEMPLO', secretAccessKey: 'c0ffee'.repeat(10) + 'abcd', bucket: 'wee-media-canary' };
  const T0 = Date.UTC(2026, 8, 21, 12, 0, 0);
  const CLAVE = claveDelObjeto(ANA, 'asset_abc123');

  /* 1/2/3 · quién puede y de quién es. */
  check('Z1) la acción exige admin ANTES de leer nada del cuerpo',
    /assertAdmin\(request\.auth\);\s*const datos/.test(CANARY));
  check('Z2) la cuenta sale de la sesión, no del cuerpo',
    /listarDelCanary\(request\.auth!\.uid/.test(CANARY));
  check('Z3) no se lee NINGÚN campo `accountId`, `prefijo`, `bucket` ni `objectKey` del cliente',
    !/datos\.(accountId|prefijo|prefix|bucket|objectKey|container|providerId)/.test(CANARY));
  check('Z3) lo único que acepta de fuera es la acción y un cursor',
    (CANARY.match(/datos\.[a-zA-Z]+/g) || []).every((c) => ['datos.accion', 'datos.operationId', 'datos.contentType', 'datos.bytes', 'datos.cursor'].includes(c)),
    [...new Set(CANARY.match(/datos\.[a-zA-Z]+/g) || [])].join(' '));

  /* 4/5 · proveedor y prefijo, del servidor. */
  check('Z4) el proveedor lo elige el servidor por configuración', /proveedorConfigurado\(\)/.test(CANARY));
  check('Z5) el prefijo lo deriva `prefijoDeCuenta` y no hay otra fuente',
    /prefijoDeCuenta\(accountId\)/.test(CANARY) && !/prefijo = [^p]/.test(CANARY));
  check('Z11) no hay forma de pedir un prefijo arbitrario: el adaptador rechaza el vacío',
    (await crearAdaptadorDeR2({ config: () => CONFIG, fetch: async () => { throw new Error('no'); } })
      .listar({ prefijo: '', limite: 10 })).ok === false);

  /* 6 · el tope. */
  check('Z6) el canary enumera como mucho 100, muy por debajo del tope del proveedor',
    MAX_OBJETOS_DEL_CANARY === 100 && MAX_OBJETOS_DEL_CANARY < MAX_CLAVES_POR_PAGINA);
  check('Z6) y el límite no llega del cliente: va escrito en el código',
    /limite: MAX_OBJETOS_DEL_CANARY/.test(CANARY) && !/datos\.limite|datos\.max/.test(CANARY));
  check('Z6) el adaptador rechaza cualquier límite por encima del documentado',
    (await crearAdaptadorDeR2({ config: () => CONFIG, fetch: async () => { throw new Error('no'); } })
      .listar({ prefijo: prefijoDeCuenta(ANA), limite: MAX_CLAVES_POR_PAGINA + 1 })).ok === false);

  /* 7 · el cursor. */
  check('Z7) el cursor del cliente se acota y se pasa opaco',
    /cursor\.length > 2048/.test(CANARY) && /\.\.\.\(cursor \? \{ cursor \} : \{\}\)/.test(CANARY));

  /* ── 12 · LA PETICIÓN CANÓNICA DE `ListObjectsV2` ──────────────────────── */
  let visto;
  const xml = (items, truncado = false, token = '') => `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>${CONFIG.bucket}</Name>
<IsTruncated>${truncado}</IsTruncated>${token ? `<NextContinuationToken>${token}</NextContinuationToken>` : ''}${items}</ListBucketResult>`;
  const contenido = (k, s) => `<Contents><Key>${k}</Key><Size>${s}</Size><LastModified>2026-09-21T10:00:00.000Z</LastModified><ETag>&quot;deadbeef&quot;</ETag></Contents>`;

  const adaptador = (respuesta) => crearAdaptadorDeR2({
    config: () => CONFIG,
    ahora: () => T0,
    fetch: async (url, init) => { visto = { url, init }; return respuesta(); },
  });

  const r19 = await adaptador(() => ({ ok: true, status: 200, text: async () => xml(contenido(CLAVE, 577908)) }))
    .listar({ prefijo: prefijoDeCuenta(ANA), limite: 100 });

  /* 19 · provider result with object. */
  check('Z19) un listado con un objeto se lee entero',
    r19.ok && r19.objetos.length === 1 && r19.objetos[0].objectKey === CLAVE && r19.objetos[0].bytes === 577908
    && r19.objetos[0].etiquetaDelProveedor === 'deadbeef' && r19.objetos[0].modificadoEn > 0);
  check('Z19) y sin cursor: se vio el prefijo entero', r19.cursor === undefined);

  /* 12 · la firma, reconstruida a mano. */
  const u = new URL(visto.url);
  const consulta = u.search.slice(1);
  check('Z12) el método es GET y la URI es la del CONTENEDOR, no la de un objeto',
    visto.init.method === 'GET' && u.pathname === `/${CONFIG.bucket}`);
  check('Z12) el host es el derivado de la cuenta de R2', u.host === anfitrionDeR2(CUENTA_R2));
  check('Z12) la consulta va ordenada y codificada, con los parámetros de `ListObjectsV2`',
    consulta === `list-type=2&max-keys=100&prefix=${encodeURIComponent(prefijoDeCuenta(ANA))}`, consulta);

  const cab = Object.fromEntries(Object.entries(visto.init.headers).map(([k, v]) => [k.toLowerCase(), v]));
  const vacioSha = createHash('sha256').update(Buffer.alloc(0)).digest('hex');
  check('Z12) lleva `x-amz-date` y `x-amz-content-sha256` del cuerpo vacío',
    /^\d{8}T\d{6}Z$/.test(cab['x-amz-date']) && cab['x-amz-content-sha256'] === vacioSha);

  /* La petición canónica, escrita aquí a mano según el protocolo. */
  const nombres = Object.keys(cab).filter((k) => k !== 'authorization').sort();
  const canonica = [
    'GET', u.pathname, consulta,
    nombres.map((k) => `${k}:${cab[k]}\n`).join(''),
    nombres.join(';'),
    vacioSha,
  ].join('\n');
  const dia = cab['x-amz-date'].slice(0, 8);
  const ambito = `${dia}/auto/s3/aws4_request`;
  const paraFirmar = ['AWS4-HMAC-SHA256', cab['x-amz-date'], ambito, createHash('sha256').update(canonica).digest('hex')].join('\n');
  let k = createHmac('sha256', `AWS4${CONFIG.secretAccessKey}`).update(dia).digest();
  for (const p of ['auto', 's3', 'aws4_request']) k = createHmac('sha256', k).update(p).digest();
  const esperada = createHmac('sha256', k).update(paraFirmar).digest('hex');

  check('Z12) la firma del adaptador coincide con la recalculada a mano según SigV4',
    cab.authorization === `AWS4-HMAC-SHA256 Credential=${CONFIG.accessKeyId}/${ambito}, SignedHeaders=${nombres.join(';')}, Signature=${esperada}`,
    cab.authorization?.slice(0, 40) + '…');
  check('Z12) y la consulta que se FIRMÓ es exactamente la que se ENVÍA',
    canonica.split('\n')[2] === consulta);

  /* 15/16/17/18 · lo que dice el proveedor. */
  const estado = async (s) => adaptador(() => ({ ok: false, status: s, text: async () => '' }))
    .listar({ prefijo: prefijoDeCuenta(ANA), limite: 10 });
  check('Z15) un 404 no produce una lista vacía: produce un fallo', (await estado(404)).ok === false);
  check('Z16) un 403 tampoco, y se traduce a «sin permiso»',
    (await estado(403)).ok === false && (await estado(403)).error.code === 'PROVIDER_UNAVAILABLE');
  check('Z17) un 500 tampoco', (await estado(500)).ok === false);
  const r18 = await adaptador(() => ({ ok: true, status: 200, text: async () => xml('') }))
    .listar({ prefijo: prefijoDeCuenta(ANA), limite: 10 });
  check('Z18) un listado legítimamente VACÍO sí es una lista vacía y completa',
    r18.ok && r18.objetos.length === 0 && r18.cursor === undefined);
  check('Z13) un XML que no se entiende es un fallo, nunca una lista vacía',
    (await adaptador(() => ({ ok: true, status: 200, text: async () => '<nope/>' }))
      .listar({ prefijo: prefijoDeCuenta(ANA), limite: 10 })).ok === false);
  check('Z14) truncado SIN token se rechaza entero',
    (await adaptador(() => ({ ok: true, status: 200, text: async () => xml(contenido(CLAVE, 10), true, '') }))
      .listar({ prefijo: prefijoDeCuenta(ANA), limite: 10 })).ok === false);
  const trunco = await adaptador(() => ({ ok: true, status: 200, text: async () => xml(contenido(CLAVE, 10), true, 'tok-1') }))
    .listar({ prefijo: prefijoDeCuenta(ANA), limite: 10 });
  check('Z14) y truncado CON token devuelve cursor: hay más y se sabe', trunco.cursor === 'tok-1');

  /* 8/9/10 · lo que sale por la puerta. */
  const SALIDA = CANARY.match(/export const listarDelCanary[\s\S]*?\n\};/)[0];
  check('Z8) la salida se copia campo a campo, no se devuelve lo que trae el adaptador',
    /objectKey: o\.objectKey/.test(SALIDA) && !/\.\.\.o[,\s}]/.test(SALIDA));
  check('Z9/Z10) y no hay ni un campo de secreto, credencial, firma o URL',
    !/url|firma|signature|secret|accessKey|Authorization|token|credencial/i.test(SALIDA));
  check('Z10) ni el error del proveedor sale entero: solo su código',
    /\$\{r\.error\.code\}/.test(SALIDA) && !/JSON\.stringify\(r\.error\)/.test(SALIDA));
  check('Z9) la Function sigue sin imprimir nada', !/console\./.test(CANARY));

  /* 20 · aislamiento. */
  check('Z20) el prefijo de dos cuentas nunca coincide', prefijoDeCuenta(ANA) !== prefijoDeCuenta(BEA));
  check('Z20) y una clave de BEA no es de ANA',
    claveEsDeLaCuenta(claveDelObjeto(BEA, 'asset_abc123'), ANA) === false
    && claveEsDeLaCuenta(claveDelObjeto(ANA, 'asset_abc123'), ANA) === true);
  check('Z20) aunque el proveedor devuelva una clave ajena, no sale por esta puerta',
    /\.filter\(\(o\) => claveEsDeLaCuenta\(o\.objectKey, accountId\)\)/.test(SALIDA));

  /* La puerta sigue siendo lo que era. */
  check('Z) las acciones son exactamente cinco, y `listar` es la nueva',
    ACCIONES_DEL_CANARY.length === 5 && ACCIONES_DEL_CANARY.includes('listar'));
  check('Z) no se coló ninguna acción experimental',
    !/subirSinCondicional|credenciales|diagnostico|sonda|temporal|debug/i.test(CANARY));
  check('Z) enumerar es SOLO LECTURA: no escribe, no marca, no confirma, no crea ficha',
    !/marcarMaterialFallido|registrarHuerfano|marcarBorrado|reconciliarSubidas|\.borrar\(/.test(SALIDA));
  check('Z) y `listarDelCanary` existe y es una función', typeof listarDelCanary === 'function');

  /*
   * §15 · SE INTENTA FILTRAR A PROPÓSITO. Un adaptador hostil devuelve, junto a
   * cada objeto, todo lo que jamás debería salir: credencial, firma, URL
   * firmada, cabecera de autorización y un token. Si la puerta devolviera lo
   * que le dan en vez de copiar campo a campo, esto saldría por la respuesta.
   */
  {
    const VENENO = {
      accessKey: 'AKIAFILTRADA', secret: 'secretofiltrado', Authorization: 'AWS4-HMAC-SHA256 Credential=filtrada',
      signedUrl: 'https://x.r2.cloudflarestorage.com/a?X-Amz-Signature=deadbeef',
      signature: 'deadbeefdeadbeef', token: 'tok-filtrado', canonicalRequest: 'GET\n/x\n\n',
    };
    const hostil = {
      [R2_PROVIDER_ID]: {
        providerId: R2_PROVIDER_ID, capacidades: ['object.list'], contenedor: CONFIG.bucket,
        async listar() {
          return {
            ok: true,
            objetos: [
              { objectKey: CLAVE, bytes: 10, contentType: 'image/png', etiquetaDelProveedor: 'e1', modificadoEn: T0, ...VENENO },
              /* Y una clave ajena, por si el filtro de cuenta se hubiera caído. */
              { objectKey: claveDelObjeto(BEA, 'asset_abc123'), bytes: 10, ...VENENO },
            ],
            cursor: 'tok-siguiente',
          };
        },
      },
    };
    const salida = await listarDelCanary(ANA, undefined, hostil);
    const texto = JSON.stringify(salida);
    const filtrado = Object.entries(VENENO).filter(([k, v]) => texto.includes(k) || texto.includes(v));
    check('§15) un adaptador hostil no consigue filtrar NADA por esta puerta',
      filtrado.length === 0, filtrado.map(([k]) => k).join(',') || 'nada');
    check('§15) ni la clave de otra cuenta, aunque el proveedor la devuelva',
      !texto.includes(BEA) && salida.objetos.length === 1 && salida.objetos[0].objectKey === CLAVE);
    check('§15) sale exactamente lo que se decidió que salga, y nada más',
      Object.keys(salida.objetos[0]).join(',') === 'objectKey,bytes,contentType,etiqueta,modificadoEn');
    check('§15) y con cursor, `completo` es FALSO: un listado a medias no autoriza nada',
      salida.cursor === 'tok-siguiente' && salida.completo === false);
    check('§15) las claves de primer nivel también están acotadas',
      Object.keys(salida).sort().join(',') === 'completo,contenedor,cursor,objetos,prefijo,providerId');
  }
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
