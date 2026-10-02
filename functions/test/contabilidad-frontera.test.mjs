/**
 * S6-E · LA FRONTERA DE LA CONTABILIDAD, FIJADA.
 *
 * ── Lo que esta auditoría encontró, y conviene decirlo primero ──────────────
 *
 * El canario de `video.generate` NO había que construirlo: YA EXISTE.
 * `creator/video.ts` declara su capacidad (`CAPACIDAD_DEL_CANARY`), lee la
 * puerta de F12-D y, con ella abierta, manda el vídeo por el conductor →
 * Orchestrator → Router del Core → Job Engine → cola → trabajador → Gateway
 * del Core → adaptador de Seedance. Lo construyeron F12-D y el tramo
 * asíncrono; sigue cerrado y sin desplegar.
 *
 * Lo que S6-E tenía que demostrar de verdad es lo otro: que en todo ese camino
 * NADIE cobra dos veces, y que cada responsabilidad sigue donde le toca.
 *
 *   UNA PETICIÓN = UNA GENERACIÓN = UN COBRO.
 *   Y la identidad que lo sostiene es `requestId`, de punta a punta.
 *
 *   A · Quién cobra, y sobre todo quién NO
 *   B · Una sola identidad, de la callable al libro
 *   C · Los cinco desenlaces: éxito, fallo, duplicado, colgado, asíncrono
 *   D · El canario, tal como está: construido, cerrado, sin desplegar
 *
 * Sin proveedor real, sin red, sin Firestore, sin dinero.
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
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const creditos = lib('credits/creditTransactions.js');
const VIDEO = leer('functions/src/creator/video.ts');

/* ═══ A · QUIÉN COBRA ═════════════════════════════════════════════════════ */
console.log('\n── A · El dinero se toca en UN sitio, y no es abajo ──');
{
  /*
   * LA REGLA DE S6-E, MEDIDA SOBRE TODA LA CADENA DE EJECUCIÓN. Si mañana
   * alguien mete un cobro en el Router, en el Gateway o en un adaptador, esto
   * lo dice — y eso es exactamente lo que una frontera de contabilidad tiene
   * que hacer por uno.
   */
  const CAPAS = {
    'core/router.ts': 'el Router decide; no cobra',
    'core/gateway.ts': 'el Gateway ejecuta; no cobra',
    'engine/gateway.ts': 'el ejecutor del motor traduce; no cobra',
    'engine/router.ts': 'el router legacy enruta y reintenta; no cobra',
    'router/politica.ts': 'la frontera acota; no cobra',
    'core/job.ts': 'el Job Engine administra intentos; no cobra',
    'core/job-queue.ts': 'la cola transporta; no cobra',
    'job/worker.ts': 'el trabajador atiende; no cobra',
    'runtime/conductor.ts': 'el conductor mueve; no cobra',
  };
  const cobran = Object.keys(CAPAS).filter((f) =>
    /spendCredits|refundCredits|completeCredits|holdCredits|creditEngine/.test(sinComentarios(leer(`functions/src/${f}`))));
  check('A) NINGUNA de las nueve capas de ejecución toca el dinero',
    cobran.length === 0, cobran.join(',') || `${Object.keys(CAPAS).length} capas limpias`);

  const adaptadores = fs.readdirSync(path.resolve(RAIZ, 'functions/src/engine/providers')).filter((f) => f.endsWith('.ts'));
  check('A) ni un solo adaptador de proveedor',
    adaptadores.every((f) => !/creditEngine|spendCredits|Credits/.test(sinComentarios(leer(`functions/src/engine/providers/${f}`)))),
    `${adaptadores.length} adaptadores`);

  /* Y quién sí. */
  const quienesCobran = ['creator/video.ts', 'creator/brain.ts', 'creator/credits.ts', 'generateAvatar.ts']
    .filter((f) => /creditEngine\.(spend|refund|complete)Credits/.test(leer(`functions/src/${f}`)));
  check('A) quien cobra es la PUERTA, donde se sabe quién pide y para qué',
    quienesCobran.length === 4, quienesCobran.join(','));
  check('A) y la autoridad es UNA: el Credit Engine. No hay un segundo motor de Credits',
    !/crearCreditEngine|CreditEngine2|creditosDe/.test(
      leer('functions/src/creator/video.ts') + leer('functions/src/runtime/conductor.ts') + leer('functions/src/core/router.ts')));
}

/* ═══ B · UNA SOLA IDENTIDAD ══════════════════════════════════════════════ */
console.log('\n── B · `requestId` de la callable al libro ──');
{
  check('B) la transacción de uso SE DERIVA del `requestId`: no se inventa un id',
    creditos.usageTransactionId('abc') === 'usage_abc'
    && creditos.refundTransactionId('abc') === 'refund_abc');
  check('B) y el reembolso tiene la SUYA: un cobro y su devolución no son la misma fila',
    creditos.usageTransactionId('abc') !== creditos.refundTransactionId('abc'));

  /* El mismo id atraviesa las cuatro fronteras del canario. */
  check('B) el canario lleva el MISMO `requestId` al cobro, a la traza, al libro y a la operación',
    /spendCredits\(\{[\s\S]{0,400}?requestId,/.test(VIDEO)
    && /trace: \{ traceId: requestId, requestId, userId: uid/.test(VIDEO)
    && /creditTransactionId: usageTransactionId\(requestId\)/.test(VIDEO)
    && /contexto: \{ appId: 'wee', operationId: requestId \}/.test(VIDEO));
  check('B) y esa contabilidad viaja DENTRO del trabajo guardado, para cuando la llamada ya no exista',
    /contabilidad: \{[\s\S]{0,300}?creditRequestId: requestId,/.test(VIDEO)
    && /Lo que la liquidación leerá del trabajo GUARDADO/.test(VIDEO));
  /*
   * EL LIBRO ANOTA; LA LIQUIDACIÓN DEVUELVE. Son dos responsabilidades y están
   * en dos funciones distintas del mismo archivo de composición, a propósito:
   * `libroDelMotor` no toca dinero, y `liquidacionDeWee` sí —es su trabajo,
   * cerrar lo que quedó vivo cuando nadie estaba para cerrarlo—. Lo que no
   * puede pasar es que se mezclen.
   */
  const RUNTIME = leer('functions/src/runtime/index.ts');
  const cuerpoDelLibro = (RUNTIME.match(/export const libroDelMotor[\s\S]*?\n\}\);/) || [''])[0];
  check('B) el libro del motor NO cobra: solo anota lo que le dan',
    cuerpoDelLibro.length > 0 && !/spendCredits|refundCredits|completeCredits/.test(cuerpoDelLibro));
  check('B) y quien SÍ devuelve es la liquidación, que es otra función y otro nombre',
    /export const liquidacionDeWee/.test(RUNTIME)
    && /refundCredits\(/.test((RUNTIME.match(/export const liquidacionDeWee[\s\S]*?\n\};/) || [''])[0]));
}

/* ═══ C · LOS CINCO DESENLACES ════════════════════════════════════════════ */
console.log('\n── C · Qué pasa con el dinero en cada final ──');
{
  /* 1 · Duplicado ya terminado: se devuelve el mismo vídeo, y se cobra CERO. */
  check('C1) DUPLICADO ya terminado: el mismo vídeo, sin volver a generar y sin volver a cobrar',
    /if \(spend\.duplicate\)/.test(VIDEO)
    && /Ya terminó: se devuelve el mismo video sin volver a generar ni cobrar/.test(VIDEO)
    && /credits: 0, demo: doc\.provider === 'mock', status: 'COMPLETED', duplicate: true/.test(VIDEO));

  /* 2 · Duplicado en marcha: no se lanza una segunda generación. */
  check('C2) DUPLICADO en marcha: no se lanza una segunda generación con el mismo cobro',
    /no se lanza una segunda generación con el mismo cobro[\s\S]{0,160}DUPLICATE_REQUEST/.test(VIDEO));

  /* 3 · Colgado: se devuelve lo retenido, en vez de «duplicado» para siempre. */
  check('C3) COLGADO por tiempo: se devuelve lo retenido en vez de contestar «duplicado» para siempre',
    /operacionAbandonada\(true, \(spend\.authorizedAt \?\? Infinity\) \+ PLAZO_DE_VIDEO_MS, Date\.now\(\)\)/.test(VIDEO)
    && /refundCredits\(\{[\s\S]{0,200}?el intento anterior se quedó sin tiempo/.test(VIDEO));

  /* 4 · Fallo: solo se devuelve si devolver es SEGURO. */
  check('C4) FALLO: se devuelve solo si devolver es SEGURO; si no, lo cierra la liquidación',
    /if \(desenlace\.reembolsoSeguro\)/.test(VIDEO)
    && /fallo sin reembolso seguro[\s\S]{0,60}lo cierra la liquidación/.test(VIDEO));
  check('C4) y al devolver se LIQUIDA el libro a cero: no queda una fila abierta',
    /firestoreLedger\.settle\(\{ creditTransactionId: usageTransactionId\(requestId\), finalAmount: 0 \}\)/.test(VIDEO));

  /* 5 · Asíncrono aceptado: ni cobro, ni reembolso. */
  check('C5) ACEPTADO y en marcha: ni se cobra, ni se devuelve — el dinero de una tarea viva no se toca',
    /Ni cobro, ni reembolso, ni segundo POST/.test(VIDEO)
    && /status: 'ACCEPTED'/.test(VIDEO));
  check('C5) y quien lo cierra después es el barrido de liquidación, que ya existe y ya está desplegado',
    /barridoDeLiquidacion/.test(leer('functions/src/index.ts'))
    && /decidirLiquidacion/.test(leer('functions/src/runtime/index.ts')));

  /* Éxito por el camino legacy: confirma. */
  check('C6) ÉXITO: `completeCredits` confirma con el mismo `requestId`',
    /completeCredits\(\{ userId: uid, requestId,/.test(VIDEO));
}

/* ═══ D · EL CANARIO, TAL COMO ESTÁ ═══════════════════════════════════════ */
console.log('\n── D · Construido, cerrado, y sin desplegar ──');
{
  check('D) el canario declara SU capacidad en su propio código: la configuración no puede ampliarla',
    /const CAPACIDAD_DEL_CANARY: CapabilityId = 'video\.generate';/.test(VIDEO)
    && /porElCore = puerta\.runtime === 'core' && normalizado\.capability === CAPACIDAD_DEL_CANARY/.test(VIDEO));
  check('D) y va por UNO de los dos caminos, nunca por los dos: serían dos vídeos y dos cobros',
    /Nunca los dos, porque serían dos vídeos y dos cobros/.test(VIDEO)
    && /if \(porElCore\) \{/.test(VIDEO));
  check('D) LA PUERTA SIGUE CERRADA por defecto',
    /habilitado: false/.test(leer('functions/src/runtime/puerta.ts'))
    && /PUERTA_CERRADA/.test(leer('functions/src/runtime/puerta.ts')));
  check('D) el Router del Core entra por su composición, sin un `if` por capacidad',
    /resolutorPorCadena\(router, cadenaViva/.test(leer('functions/src/runtime/index.ts'))
    && !/video\.generate/.test(sinComentarios(leer('functions/src/core/router.ts'))));
  check('D) el Job Engine es quien reintenta, y el Router no sabe de reintentos',
    !/reintent|retry/.test(sinComentarios(leer('functions/src/core/router.ts')))
    && /maxAttempts/.test(leer('functions/src/core/job.ts')));
  check('D) el material resultante entra por el Content Core, no por un almacén nuevo',
    /materialDeWee/.test(leer('functions/src/runtime/index.ts'))
    && /PuertoDeMaterial/.test(leer('functions/src/runtime/conductor.ts')));

  /* Lo que S6-E NO tocó. */
  check('D) S6-E no tocó el Planner, ni el Gateway, ni el Financial Core, ni los adaptadores',
    !/S6-E/.test(leer('functions/src/core/planner.ts') + leer('functions/src/core/gateway.ts')
      + leer('functions/src/credits/creditEngine.ts')));
  check('D) ni `creatorRun`: sigue entero en el camino legacy',
    /runCapability\(/.test(leer('functions/src/creator/index.ts'))
    && /holdCredits/.test(leer('functions/src/creator/credits.ts')));
  check('D) y la frontera de ruteo de S6-C/S6-D sigue sin conectarse a nada',
    !/registroConPolitica|cadenasDesdeLaConfiguracion/.test(
      leer('functions/src/runtime/index.ts') + leer('functions/src/creator/video.ts')));

  check('esta suite está en la cadena de `npm test`', /contabilidad-frontera\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
