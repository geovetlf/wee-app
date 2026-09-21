/*
 * CANARY DE WEE MEDIA CLOUD — INVOCAR `mediaCanary` EN PRODUCCIÓN.
 *
 * Un script de un solo uso para ejecutar, paso a paso y a mano, la primera
 * prueba real de Media Cloud. No es parte del producto, no lo llama nadie y no
 * se despliega: vive aquí como viven `inventario-media.mjs` o `copias.mjs`,
 * que son las otras herramientas que tocan producción desde una máquina.
 *
 * ── Por qué hace falta un token, y de dónde sale ────────────────────────────
 *
 * `mediaCanary` es una Function *callable*: exige un ID token de Firebase Auth
 * y comprueba `assertAdmin`. El Admin SDK por sí solo no vale —ese es de
 * servidor y no produce una sesión de persona—, así que el camino es:
 *
 *     ADC de gcloud  →  createCustomToken(uid)  →  signInWithCustomToken
 *                    →  ID token (≈1 h)  →  POST a la callable
 *
 * **No se crea ninguna credencial nueva**: se reutiliza la ADC que ya usan los
 * demás scripts, y no hay clave de cuenta de servicio en ninguna parte.
 *
 * Acuñar un custom token es FIRMAR, y firmar exige una cuenta de servicio. Sin
 * clave descargada, el Admin SDK firma por delegación: pide a la API de IAM que
 * firme en nombre de `FIRMANTE` usando la ADC de quien ejecuta. Por eso hay que
 * decirle CUÁL es esa cuenta —no puede adivinarla fuera de Google Cloud, donde
 * no existe el servidor de metadatos—, y por eso quien ejecute necesita
 * `iam.serviceAccounts.signBlob` sobre ella. El secreto sigue sin salir nunca
 * de Google: aquí solo entra y sale la firma.
 *
 * ── Lo que este script NO imprime jamás ─────────────────────────────────────
 *
 * El token propio, el ID token y la URL firmada de subida. Los tres son
 * credenciales al portador: el token abre tu sesión y la URL abre una escritura
 * en el contenedor. Se quedan en memoria y mueren con el proceso.
 *
 * ── Uso ─────────────────────────────────────────────────────────────────────
 *
 *   WEE_CANARY_UID=<uid>  node scripts/canary-medios.mjs subir \
 *       --operacion canary-media-0001 --archivo ./mi-imagen.png
 *
 * Sin `--ejecutar` **no toca la red**: lee el archivo, lo valida entero,
 * compone el paquete y lo enseña. Ese es el modo por defecto a propósito.
 *
 *   --ejecutar      hace de verdad la llamada (pide ADC y acuña el token)
 *   --archivo <p>   la imagen local de la prueba; su tamaño REAL es el que viaja
 *   --url <u>       otra dirección de la Function, si cambiara
 *
 * ── Subir es UNA operación, no dos ──────────────────────────────────────────
 *
 * `subir` pide el permiso Y manda los bytes en la misma ejecución. No es por
 * comodidad: el permiso es una URL firmada, o sea una credencial de escritura
 * con quince minutos de vida, y el único sitio donde no puede filtrarse es la
 * memoria de este proceso. Si se imprimiera para dársela a `curl`, quedaría en
 * la terminal, en el historial y en cualquier registro que los recoja.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const PROYECTO = 'get-wee';
const URL_POR_DEFECTO = 'https://us-central1-get-wee.cloudfunctions.net/mediaCanary';

/*
 * Quién FIRMA el custom token. Es un identificador público, no una credencial:
 * nombra la cuenta, no da acceso a ella. Deliberadamente NO es la cuenta con la
 * que corre `mediaCanary` en producción (`…-compute@developer…`, el runtime de
 * TODAS las Functions): firmar desde una máquina no necesita suplantar al
 * servidor, y `firebase-adminsdk` no ejecuta nada, así que el permiso concedido
 * sobre ella no alcanza a ninguna Function.
 */
const FIRMANTE = 'firebase-adminsdk-fbsvc@get-wee.iam.gserviceaccount.com';

/* Lo que la puerta admite. Tiene que coincidir con `media/canary.ts`; si no, la rechaza ella. */
const ACCIONES = ['subir', 'confirmar', 'procesar', 'entregar'];
const TIPOS = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

/* ── Lo que se pide por la línea de órdenes ────────────────────────────────── */

const args = process.argv.slice(2);
const accion = args.find((a) => !a.startsWith('--')) ?? '';
const valor = (nombre) => {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const ejecutar = args.includes('--ejecutar');

const morir = (mensaje) => { console.error(`\n  ${mensaje}\n`); process.exit(1); };

if (!ACCIONES.includes(accion)) morir(`Acción: una de ${ACCIONES.join(', ')}`);

/*
 * EL UID ENTRA POR EL ENTORNO, no por el código. No es un secreto —es un
 * identificador— pero tampoco tiene por qué quedarse escrito en el repositorio,
 * y pasarlo al invocar deja claro con qué identidad se está actuando.
 */
const uid = (process.env.WEE_CANARY_UID || '').trim();
if (!uid) morir('Falta WEE_CANARY_UID: el uid del administrador con el que se actúa.');

const operationId = valor('operacion') ?? '';
if (operationId.length < 8 || operationId.length > 128) {
  morir('--operacion: entre 8 y 128 caracteres. Es la clave de idempotencia, y de ella sale el material.');
}

/* ── El paquete ────────────────────────────────────────────────────────────── */

/**
 * QUÉ ES DE VERDAD ESTE ARCHIVO. Por su firma, no por su nombre.
 *
 * La extensión la escribe quien quiera; los primeros bytes los escribe el
 * programa que creó la imagen. Comprobar los dos y exigir que coincidan es lo
 * que evita mandar un PNG diciendo que es un JPEG — y el tipo viaja FIRMADO en
 * el permiso, así que una mentira aquí la rechazaría el proveedor con un 403
 * bastante difícil de entender.
 */
const tipoPorLosBytes = (b) => {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return undefined;
};

const PORLAEXTENSION = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

/**
 * LEER Y VALIDAR LA IMAGEN, ANTES DE TOCAR LA RED.
 *
 * Todo esto es local: si algo no cuadra, el script se para sin haber acuñado
 * un token, sin haber llamado a la función y sin haber pedido ningún permiso
 * de escritura. Fallar barato es la idea.
 */
const leerImagen = () => {
  const ruta = valor('archivo');
  if (!ruta) morir('--archivo: la ruta de una imagen local pequeña (PNG, JPEG o WebP). No se descarga ninguna de Internet.');

  const abs = path.resolve(ruta);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) morir(`No encuentro un archivo en ${abs}`);

  const datos = fs.readFileSync(abs);
  if (datos.length < 1) morir('El archivo está vacío.');
  if (datos.length > MAX_BYTES) morir(`El archivo pesa ${datos.length} bytes; el tope de esta prueba son ${MAX_BYTES} (2 MiB).`);

  const porExtension = PORLAEXTENSION[path.extname(abs).toLowerCase()];
  const porBytes = tipoPorLosBytes(datos);
  if (!porBytes) morir('Los primeros bytes no son de un PNG, un JPEG ni un WebP.');
  if (!TIPOS.includes(porBytes)) morir(`Tipo no admitido: ${porBytes}`);
  if (porExtension && porExtension !== porBytes) {
    morir(`La extensión dice ${porExtension} y los bytes dicen ${porBytes}. No sigo: el tipo viaja firmado.`);
  }
  return { abs, datos, contentType: porBytes };
};

/**
 * SOLO LO QUE LA PUERTA ACEPTA. Nada de cuenta, material, proveedor,
 * contenedor, clave ni referencia de almacén: todo eso lo DERIVA el servidor, y
 * mandarlo no serviría de nada salvo para confundir a quien lea esto mañana.
 *
 * El tamaño sale del archivo, no de un parámetro: declarar uno y mandar otro es
 * una discrepancia que nadie detectaría hasta el final.
 */
const imagen = accion === 'subir' ? leerImagen() : undefined;
const paquete = imagen
  ? { accion, operationId, contentType: imagen.contentType, bytes: imagen.datos.length }
  : { accion, operationId };

/* ── La identidad temporal ─────────────────────────────────────────────────── */

/**
 * DE LA ADC A UN ID TOKEN. Tres pasos y ninguno deja rastro en disco.
 *
 * La clave web que pide `signInWithCustomToken` es configuración PÚBLICA —viaja
 * dentro de cada app Android publicada— y por eso se lee del archivo que ya
 * está en el repositorio en vez de pedir otra variable.
 */
const conseguirIdToken = async () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'google-services.json'), 'utf8'));
  if (cfg?.project_info?.project_id !== PROYECTO) {
    morir(`google-services.json apunta a ${cfg?.project_info?.project_id}, no a ${PROYECTO}. No sigo.`);
  }
  const apiKey = cfg?.client?.[0]?.api_key?.[0]?.current_key;
  if (!apiKey) morir('No encuentro la clave web pública en google-services.json.');

  const admin = require(path.join(RAIZ, 'functions/node_modules/firebase-admin'));
  /* `serviceAccountId` dice a quién firmar; la ADC dice quién lo pide. Ninguna clave. */
  if (!admin.apps.length) admin.initializeApp({ projectId: PROYECTO, serviceAccountId: FIRMANTE });

  /* Acuñado con la ADC. Dura cinco minutos y solo sirve para canjearlo. */
  const propio = await admin.auth().createCustomToken(uid);

  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: propio, returnSecureToken: true }),
  });
  const cuerpo = await r.json();
  if (!r.ok || !cuerpo.idToken) {
    /* Del error sale el código, nunca el cuerpo entero: podría llevar el token dentro. */
    morir(`No se pudo canjear el token (HTTP ${r.status}, ${cuerpo?.error?.message ?? 'sin detalle'}).`);
  }
  return cuerpo.idToken;
};

/* ── Lo que se enseña ──────────────────────────────────────────────────────── */

/*
 * NADA SE IMPRIME EN CRUDO.
 *
 * Esto era una lista de lo prohibido —«quita `intento` y enseña lo demás»— y
 * por eso fallaba: `entregar` devuelve `entrega.url`, que es una llave de
 * LECTURA firmada, y como nadie la había nombrado salía entera por la terminal.
 * Una lista de lo prohibido solo protege de lo que ya se conoce; cualquier
 * campo nuevo se filtra por omisión, que es exactamente al revés de lo que hace
 * falta aquí.
 *
 * La regla es ahora de FORMA, no de inventario: se recorre todo lo que se va a
 * imprimir y se tapa lo que delata ser una credencial por su nombre O por su
 * valor. Una URL firmada que mañana llegara bajo otro nombre seguiría sin
 * salir, porque lo que la delata es empezar por `http`.
 */
const NOMBRE_DE_CREDENCIAL = /(url|token|authorization|bearer|firma|signature|credential|secret|password|apikey|accesskey)/i;
const VALOR_DE_CREDENCIAL = /^(https?:\/\/|ey[A-Za-z0-9_-]{10,}\.)/;
/** `huellaDeUrl` es lo contrario de una URL: la llave reducida a algo inofensivo. */
const NOMBRE_SEGURO = /huella/i;
const TAPADO = '[tapado: credencial]';

const sanear = (v) => {
  if (Array.isArray(v)) return v.map(sanear);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) =>
      [k, !NOMBRE_SEGURO.test(k) && NOMBRE_DE_CREDENCIAL.test(k) ? TAPADO : sanear(x)]));
  }
  return typeof v === 'string' && VALOR_DE_CREDENCIAL.test(v) ? TAPADO : v;
};

/** Un resumen sin credenciales. Ninguna URL firmada sale de aquí. */
const enseñar = (respuesta) => {
  const r = respuesta?.result ?? respuesta;

  const i = r?.intento;
  if (i) {
    console.log('  intento    :', i.intentId);
    console.log('  material   :', i.assetId);
    console.log('  método     :', i.metodo);
    console.log('  cabeceras  :', Object.keys(i.cabeceras ?? {}).join(', '), '(obligatorias: van firmadas)');
    console.log('  max bytes  :', i.maxBytes);
    console.log('  caduca     :', new Date(i.expiraEn).toISOString(), `(${i.vigenciaSegundos}s)`);
    console.log('  url firmada: [no se imprime: es una credencial de escritura]');
  }

  /*
   * `entregar`. De la llave sale su HUELLA, que es para lo que MC-2 la calcula:
   * poder cruzar un problema con la llave que lo dio sin escribir la llave.
   */
  const e = r?.entrega;
  if (e) {
    console.log('  material   :', e.assetId);
    console.log('  caduca     :', new Date(e.expiraEn).toISOString(), `(${e.vigenciaSegundos}s)`);
    console.log('  huella     :', r?.traza?.huellaDeUrl ?? '(sin huella)');
    console.log('  url firmada: [no se imprime: es una credencial de lectura]');
  }

  const { intento, entrega, ...resto } = r ?? {};
  if (Object.keys(resto).length) console.log('  resto      :', JSON.stringify(sanear(resto)));
};

/*
 * DEL FALLO SOLO SALE EL CÓDIGO.
 *
 * Un 400 sin más no dice nada, y el porqué está en el cuerpo XML que devuelve
 * el proveedor. Pero ese cuerpo suele traer de vuelta trozos de la petición
 * —S3 y R2 repiten el recurso y las cabeceras en sus errores—, así que aquí no
 * se guarda, no se devuelve y no se imprime: se lee, se le saca UNA cosa y se
 * tira. Nunca queda en una variable que alguien pueda enseñar por descuido.
 *
 * El filtro es de FORMA. Solo letras, de 3 a 48: así son todos los códigos de
 * S3 y de R2 (`InvalidArgument`, `NotImplemented`, `PreconditionFailed`), y así
 * no es ninguna credencial —una firma son 64 dígitos hexadecimales, y un
 * `X-Amz-Credential` lleva barras y una fecha—. Si algún día un código legítimo
 * trajera una cifra, se perderá y saldrá `unknown`: prefiero quedarme sin
 * diagnóstico a imprimir algo que no he sabido reconocer.
 *
 * Y se mira solo el principio del cuerpo: un error de R2 cabe de sobra en 4 KiB,
 * y lo que no quepa no puede colarse por aquí.
 */
const CODIGO_DE_PROVEEDOR = /<Code>\s*([A-Za-z]{3,48})\s*<\/Code>/;

/*
 * Y EL MENSAJE, QUE ES DONDE R2 DICE **CUÁL** ARGUMENTO.
 *
 * `InvalidArgument` es genérico a propósito; el nombre del argumento va en el
 * `<Message>`. Pero un mensaje es prosa libre del proveedor, no una etiqueta,
 * así que no basta con recortarlo: pasa dos filtros y solo sale si pasa los dos.
 *
 *   FORMA      letras, cifras, espacios y la puntuación de una frase. Sin `/`,
 *              `%`, `&`, `=` ni `?`, que son los caracteres sin los cuales no
 *              cabe una URL ni una cadena de consulta. Entre 3 y 160.
 *   CONTENIDO  y aun encajando en la forma, se tira si menciona `x-amz`,
 *              `aws4`, un esquema `http`, una autorización, una firma, una
 *              credencial o una tirada larga de hexadecimal.
 *
 * Esto pierde diagnóstico a propósito: un mensaje legítimo que nombre una
 * cabecera `x-amz-*` saldrá como `unknown`. Es el orden de preferencia que
 * quiero — antes quedarme sin saber que enseñar algo que no he reconocido.
 */
const MENSAJE_DE_PROVEEDOR = /<Message>\s*([^<]{0,400}?)\s*<\/Message>/;
const FORMA_DE_MENSAJE = /^[A-Za-z][A-Za-z0-9 .,:;'"()[\]_-]{2,159}$/;
const MENSAJE_PROHIBIDO = /(x-amz|aws4|https?:|bearer|authorization|signature|credential|[0-9a-f]{20,})/i;

/* Puros: trabajan sobre la cadena ya acotada. El cuerpo se lee UNA vez, arriba. */
const codigoDe = (xml) => CODIGO_DE_PROVEEDOR.exec(xml)?.[1] ?? 'unknown';

const mensajeDe = (xml) => {
  const crudo = MENSAJE_DE_PROVEEDOR.exec(xml)?.[1];
  if (typeof crudo !== 'string') return 'unknown';
  if (!FORMA_DE_MENSAJE.test(crudo)) return 'unknown';
  if (MENSAJE_PROHIBIDO.test(crudo)) return 'unknown';
  return crudo;
};

/** UNA sola lectura del cuerpo, acotada, y de ella salen las dos etiquetas. */
const diagnosticoDelFallo = async (r) => {
  let xml = '';
  try {
    xml = (await r.text()).slice(0, 4096);
  } catch {
    return { providerCode: 'unknown', providerMessage: 'unknown' };
  }
  return { providerCode: codigoDe(xml), providerMessage: mensajeDe(xml) };
};

/**
 * MANDAR LOS BYTES. La URL entra por parámetro y sale por el `fetch`, y no pasa
 * por ningún otro sitio: ni por una variable de entorno, ni por disco, ni por
 * una línea de registro, ni por el valor de retorno.
 *
 * Se usan EXACTAMENTE el método y las cabeceras que dio el permiso. No es una
 * formalidad: las dos van dentro de la firma, así que cambiar una sola invalida
 * la petición entera.
 */
const mandarLosBytes = async (intento, datos) => {
  const r = await fetch(intento.url, {
    method: intento.metodo,
    headers: { ...intento.cabeceras },
    body: new Uint8Array(datos),
  });
  /* Del cuerpo no salen más que dos etiquetas filtradas: podría traer la petición de vuelta, firma incluida. */
  return { status: r.status, ok: r.ok, ...(r.ok ? {} : await diagnosticoDelFallo(r)) };
};

/* ── Adelante ──────────────────────────────────────────────────────────────── */

const destino = valor('url') ?? URL_POR_DEFECTO;

console.log('\n  WEE MEDIA CLOUD — canary');
console.log('  proyecto :', PROYECTO);
console.log('  función  :', destino);
console.log('  identidad:', uid.slice(0, 6) + '…', '(del entorno)');
console.log('  paquete  :', JSON.stringify(paquete));
if (imagen) {
  console.log('  archivo  :', imagen.abs);
  console.log('  validado :', imagen.datos.length, 'bytes ·', imagen.contentType, '(por sus bytes, no por su nombre)');
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  Hasta aquí, TODO ha sido local. De aquí para abajo se toca producción.    */
/* ══════════════════════════════════════════════════════════════════════════ */

if (!ejecutar) {
  console.log('\n  MODO PREPARACIÓN: no se ha tocado la red.');
  console.log('  Ni se ha acuñado ningún token, ni se ha llamado a la función, ni a R2.');
  console.log('  Para hacerlo de verdad, repite con --ejecutar.\n');
  process.exit(0);
}

const idToken = await conseguirIdToken();
const r = await fetch(destino, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` },
  body: JSON.stringify({ data: paquete }),
});
const cuerpo = await r.json().catch(() => ({}));

console.log('\n  HTTP', r.status);
if (!r.ok) {
  console.error('  error:', cuerpo?.error?.message ?? cuerpo?.error?.status ?? 'sin detalle');
  process.exit(1);
}
enseñar(cuerpo);

/*
 * Y si era una subida, los bytes van AHORA, con el permiso todavía en memoria.
 * No hay un paso intermedio en el que la URL exista fuera de este proceso.
 */
if (imagen) {
  const intento = (cuerpo?.result ?? cuerpo)?.intento;
  if (!intento?.url) morir('La respuesta no trae permiso de subida; no hay nada que mandar.');

  const envio = await mandarLosBytes(intento, imagen.datos);
  console.log('\n  — bytes enviados al proveedor —');
  console.log('  HTTP       :', envio.status);
  if (!envio.ok) console.log('  providerCode:', envio.providerCode ?? 'unknown');
  if (!envio.ok) console.log('  providerMessage:', envio.providerMessage ?? 'unknown');
  console.log('  enviados   :', imagen.datos.length, 'bytes');
  console.log('  intento    :', intento.intentId);
  console.log('  material   :', intento.assetId);
  console.log('  método     :', intento.metodo);
  console.log('  cabeceras  :', Object.keys(intento.cabeceras ?? {}).join(', '));
  console.log('  caduca     :', new Date(intento.expiraEn).toISOString());

  /*
   * UN 200 NO ES UNA CONFIRMACIÓN. Quiere decir que el proveedor aceptó la
   * petición, no que el objeto esté donde debe con el tamaño que debe. Eso lo
   * dice `confirmar`, que va a MIRAR el objeto — y es un paso aparte.
   */
  console.log(envio.ok
    ? '\n  El proveedor aceptó la petición. Eso NO es una confirmación:\n  quien comprueba que el objeto está de verdad es la acción `confirmar`.'
    : '\n  El proveedor NO aceptó la petición. Nada que confirmar.');
}
console.log('');
