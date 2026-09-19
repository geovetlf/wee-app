/*
 * WEE CORE — IDENTIDAD, PROPIEDAD Y EVENTOS DE DOMINIO (fase 10).
 *
 * ── Las tres frases que esto vigila ────────────────────────────────────────
 *
 *  1. UNA CUENTA POSEE, UNA ENTIDAD ACTÚA. Es la regla que Weë ya rompía en
 *     los contratos: `Asset.userId` y `Project.userId` hacían dueño a la CARA
 *     activa —`uid` o `hidi_uid`—, no a la cuenta. Con eso, cambiar de perfil
 *     cambiaba de dueño y publicar desde una Página habría obligado a copiar
 *     el archivo. Aquí se comprueba que ya no puede pasar.
 *
 *  2. UNA PÁGINA NO ES UNA CUENTA, NI UNA CARA, NI EL PERFIL BIZ. Es una
 *     entidad de la cuenta, sin billetera propia y sin identidad financiera.
 *
 *  3. UN EVENTO NO ES UNA TRAZA, NI UN TRABAJO, NI UN ASIENTO. Son cuatro
 *     sistemas con cuatro públicos, y el día que se mezclen, uno de los cuatro
 *     dejará de servir para lo suyo.
 *
 * ── Y una que importa más de lo que parece ─────────────────────────────────
 *
 * QUE EL CATÁLOGO DE EVENTOS SEA HONESTO. Hay treinta nombres declarados y
 * ninguno se emite todavía. Ese es justo el defecto que ha aparecido en TODAS
 * las fases anteriores —valores declarados que nadie produce— y aquí se
 * declara a propósito, así que hay una prueba que lo dice en voz alta en vez
 * de dejar creer que Weë ya publica eventos.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* El mismo cargador diminuto que el resto de las pruebas del Core. */
const ts = require('typescript');
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (base) => (fs.existsSync(path.resolve(RAIZ, base + '.ts')) ? base + '.ts' : base + '/index.ts');
const cargados = new Map();
const cargar = async (ruta) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  let js = ts.transpileModule(leer(ruta), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const carpeta = path.posix.dirname(ruta.split(path.sep).join('/'));
  for (const [, rel] of js.matchAll(/from ['"](\.[^'"]*)['"]/g)) {
    const url = (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, rel))))).url;
    js = js.split(`from '${rel}'`).join(`from '${url}'`).split(`from "${rel}"`).join(`from "${url}"`);
  }
  const url = comoModulo(js);
  const resultado = { url, ns: await import(url) };
  cargados.set(ruta, resultado);
  return resultado;
};

const core = (await cargar('functions/src/core/index.ts')).ns;

const FUENTE_IDENTITY = sinComentarios(leer('functions/src/core/identity.ts'));
const FUENTE_EVENTS = sinComentarios(leer('functions/src/core/events.ts'));
const FUENTE_PROJECT = sinComentarios(leer('functions/src/core/project.ts'));
const FUENTE_OBS = sinComentarios(leer('functions/src/core/observability.ts'));

const CUENTA = 'acc_0018439';
const REAL = { entityId: '00184391', entityType: 'REAL_PROFILE', entitySequence: 1 };
const WEE = { entityId: '00184392', entityType: 'WEE_PROFILE', entitySequence: 2 };
const PAGE = { entityId: '00184393', entityType: 'PAGE', entitySequence: 3 };
const entidad = (ref, extra = {}) => ({
  contract: '1.0', ownerAccountId: CUENTA, status: 'ACTIVE',
  createdAt: 1, updatedAt: 1, ...ref, ...extra,
});

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Las tres entidades, y solo tres ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('1) hay exactamente tres tipos de entidad',
    core.TIPOS_DE_ENTIDAD.length === 3
    && core.TIPOS_DE_ENTIDAD.join() === 'REAL_PROFILE,WEE_PROFILE,PAGE');

  /* El Perfil Biz se eliminó. Un negocio es una Página, no una cara. */
  check('2) NO existe un cuarto tipo para los negocios',
    !core.esTipoDeEntidad('BIZ_PROFILE') && !core.esTipoDeEntidad('BUSINESS_PROFILE')
    && !/BIZ_PROFILE|BUSINESS_PROFILE/.test(FUENTE_IDENTITY));

  check('3) la secuencia dice qué tipo CORRESPONDE, y de 3 en adelante son Páginas',
    core.tipoPorSecuencia(1) === 'REAL_PROFILE' && core.tipoPorSecuencia(2) === 'WEE_PROFILE'
    && [3, 4, 10, 99].every((n) => core.tipoPorSecuencia(n) === 'PAGE'));

  /*
   * 4 · LO QUE DA SENTIDO A GUARDAR EL TIPO. Una entidad cuyo tipo y cuya
   * secuencia se contradicen se RECHAZA, en vez de creerle a uno de los dos.
   */
  check('4) una entidad válida es coherente consigo misma',
    core.entidadValida(entidad(REAL)) && core.entidadValida(entidad(WEE)) && core.entidadValida(entidad(PAGE)));
  check('5) y una que se contradice se rechaza en vez de elegir un bando',
    !core.entidadValida(entidad({ ...PAGE, entityType: 'REAL_PROFILE' }))
    && !core.entidadValida(entidad({ ...REAL, entitySequence: 7 })));
  check('6) sin cuenta no hay entidad',
    !core.entidadValida({ ...entidad(REAL), ownerAccountId: '' })
    && !core.entidadValida({ ...entidad(REAL), ownerAccountId: undefined }));

  /* 7 · El Core NO clasifica mirando el identificador. Nunca. */
  check('7) el módulo de identidad no clasifica leyendo el último carácter',
    !/slice\(-1\)|charAt\(.*length ?- ?1|endsWith\(/.test(FUENTE_IDENTITY));
  check('8) y la décima entidad demuestra por qué',
    core.identificadorDeEntidad('0018439', 10) === '001843910'
    && core.identificadorDeEntidad('0018439', 10).slice(-1) === '0'
    && core.tipoPorSecuencia(10) === 'PAGE');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · El identificador interno y el nombre público son DOS cosas ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('9) un handle bien formado se acepta',
    core.esHandle('cafe.lima') && core.esHandle('ana_wee') && core.esHandle('w33'));
  check('10) y uno que no, no',
    !core.esHandle('ab') && !core.esHandle('@ana') && !core.esHandle('Ana')
    && !core.esHandle('_ana') && !core.esHandle('ana.') && !core.esHandle('a..b')
    && !core.esHandle('x'.repeat(31)));

  /*
   * 11 · NO HAY NINGUNA FUNCIÓN QUE DERIVE UN HANDLE DE UN entityId, NI AL
   * REVÉS. Si la hubiera, cambiar el nombre público huerfanaría lo publicado,
   * y el identificador enseñaría la posición de la entidad dentro de la cuenta.
   */
  check('11) el handle no se calcula a partir del identificador, se elige',
    !/handleDe|handleDesde|handlePara|derivarHandle/i.test(FUENTE_IDENTITY)
    && !/entityIdDe(Handle|sdeHandle)|resolverHandle/i.test(FUENTE_IDENTITY));
  check('12) y una entidad puede existir sin handle',
    core.entidadValida(entidad(PAGE)) && core.entidadValida(entidad(PAGE, { handle: 'cafe.lima' }))
    && !core.entidadValida(entidad(PAGE, { handle: 'NO VALE' })));

  /*
   * 13 · Y EL FORMATO ACTUAL DE IDENTIDAD NO ESTORBA. Se temía que una Página
   * necesitara una forma tipo `page_x` y chocara con `FORMA_DE_IDENTIDAD`
   * (`utils/econtactModel.ts`), que prohíbe el guion bajo salvo el prefijo
   * heredado. No hace falta: el identificador de una Página es numérico.
   */
  check('13) el identificador de una Página no necesita prefijo ninguno',
    /^[0-9]+$/.test(core.identificadorDeEntidad('0018439', 3))
    && !/page_|PREFIJO_DE_PAGE/.test(FUENTE_IDENTITY));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · El número de cuenta: se da forma, no se inventa ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('14) la posición de la serie se convierte en número, con sus ceros',
    core.numeroDeCuentaDesde(18439) === '0018439' && core.numeroDeCuentaDesde(1) === '0000001');
  check('15) y es puro: la misma posición da siempre el mismo número',
    core.numeroDeCuentaDesde(42) === core.numeroDeCuentaDesde(42));
  check('16) lo que no cabe en el ancho NO se recorta: sería el número de otra cuenta',
    core.numeroDeCuentaDesde(12345678, 7) === undefined
    && core.numeroDeCuentaDesde(0) === undefined && core.numeroDeCuentaDesde(-1) === undefined);
  check('17) el resultado siempre es un número de cuenta válido',
    [1, 7, 18439, 9999999].every((n) => core.esNumeroDeCuenta(core.numeroDeCuentaDesde(n))));

  /* 18 · El Core no reparte posiciones: eso tiene estado y el Core no lo tiene. */
  check('18) el Core NO asigna la siguiente posición — eso tiene estado',
    !/siguienteNumero|asignarNumero|nextAccountNumber|contador/i.test(FUENTE_IDENTITY));
  check('19) y el número sigue sin autorizar nada',
    !/accountNumber ?===|walletNumber ?===|numeroDeCuenta ?===/.test(FUENTE_IDENTITY));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · PROPIEDAD ≠ ATRIBUCIÓN (el corazón de la fase) ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * 20 · EL CONTRATO QUE SE CORRIGIÓ. `Asset` y `Project` decían `userId`, y en
   * Weë un «user id» es la CARA activa. Ahora dicen `ownerAccountId`.
   */
  check('20) un material ya NO pertenece a un "userId"',
    !/^\s*userId: string;/m.test(FUENTE_PROJECT),
    'userId era la cara activa: cambiar de perfil cambiaba de dueño');
  check('21) un material pertenece a la CUENTA, y el proyecto también',
    /export interface Asset extends OwnedByAccount/.test(FUENTE_PROJECT)
    && /export interface Project extends OwnerRef, EntityAttribution/.test(FUENTE_PROJECT));

  const material = {
    ownerAccountId: CUENTA,
    createdByEntityId: REAL.entityId, createdByEntityType: 'REAL_PROFILE',
    id: 'asset_1', kind: 'image', versions: [], currentVersion: 1, createdAt: 1, updatedAt: 1,
  };

  /* 22 · PUBLICAR DESDE OTRA ENTIDAD NO MUEVE LA PROPIEDAD. */
  const publicado = core.atribuirA(material, { entityId: PAGE.entityId, entityType: 'PAGE' });
  check('22) publicar desde una Página no cambia de quién es el material',
    publicado.ownerAccountId === CUENTA && publicado.ownerAccountId === material.ownerAccountId);
  check('23) y las dos atribuciones conviven: quién lo creó y quién lo publicó',
    publicado.createdByEntityId === REAL.entityId && publicado.createdByEntityType === 'REAL_PROFILE'
    && publicado.publishedByEntityId === PAGE.entityId && publicado.publishedByEntityType === 'PAGE');
  check('24) el material NO se duplica al cambiar de entidad: es el mismo id',
    publicado.id === material.id);

  /* 25 · Y la comprobación de pertenencia es por cuenta, nunca por entidad. */
  check('25) una entidad es de su cuenta y de ninguna otra',
    core.entidadEsDeLaCuenta(entidad(PAGE), CUENTA)
    && !core.entidadEsDeLaCuenta(entidad(PAGE), 'acc_otra')
    && !core.entidadEsDeLaCuenta(entidad(PAGE), '')
    && !core.entidadEsDeLaCuenta(undefined, CUENTA));

  /*
   * 26 · LAS TRES ENTIDADES GASTAN DE LA MISMA BILLETERA. Ya lo probaba la
   * Fase 9; se repite aquí desde el lado de Identity porque es la mitad de la
   * regla: si una Página tuviera billetera, sería una cuenta.
   */
  const cuenta = {
    contract: '1.0', accountId: CUENTA, accountNumber: '0018439', revision: 1,
    status: 'ACTIVE', credits: 100, currency: 'USD',
    lifetime: core.VIDA_EN_CERO, createdAt: 1, updatedAt: 1,
  };
  const billetera = core.billeteraDe(cuenta);
  check('26) hay UNA billetera y es de la cuenta, no de la entidad',
    billetera.accountId === CUENTA && billetera.walletNumber === '0018439' && billetera.credits === 100);
  check('27) el módulo de identidad no crea billeteras ni saldos',
    !/wallet|billetera|credits|saldo/i.test(FUENTE_IDENTITY),
    'una Página con billetera sería una cuenta');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Eventos: la forma ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const base = {
    eventId: 'ev_0001', type: 'POST_CREATED',
    aggregate: { type: 'post', id: 'post_1' },
    accountId: CUENTA, occurredAt: 1_700_000_000_000,
    payload: { postId: 'post_1' },
  };

  const e = core.crearEvento(base);
  check('28) un evento bien formado se construye', !!e && e.contract === '1.0' && e.version === 1);
  check('29) y lleva la CUENTA, no la entidad, como dueño de lo que pasó',
    e.accountId === CUENTA && e.actor === undefined);
  check('30) la entidad que actuó viaja aparte, como atribución', (() => {
    const conActor = core.crearEvento({ ...base, actor: { entityId: PAGE.entityId, entityType: 'PAGE' } });
    return conActor.accountId === CUENTA && conActor.actor.entityId === PAGE.entityId;
  })());

  check('31) el tipo tiene forma propia, distinta de capacidades y estados',
    core.esTipoDeEvento('POST_CREATED') && core.esTipoDeEvento('AI_GENERATION_REFUNDED')
    && !core.esTipoDeEvento('image.generate') && !core.esTipoDeEvento('job_completed')
    && !core.esTipoDeEvento('post_created') && !core.esTipoDeEvento(''));

  check('32) sin identificador, sin tipo, sin cuenta o sin agregado no hay evento',
    core.crearEvento({ ...base, eventId: '' }) === undefined
    && core.crearEvento({ ...base, type: 'nope' }) === undefined
    && core.crearEvento({ ...base, accountId: '' }) === undefined
    && core.crearEvento({ ...base, aggregate: { type: '', id: 'x' } }) === undefined);

  check('33) la versión del payload empieza en 1 y se puede subir',
    core.crearEvento(base).version === 1 && core.crearEvento({ ...base, version: 3 }).version === 3
    && core.crearEvento({ ...base, version: 0 }) === undefined);

  /* 34 · INMUTABLE de verdad, no solo para el compilador. */
  check('34) el sobre está congelado hacia dentro', (() => {
    try { e.payload.postId = 'otro'; } catch { /* modo estricto */ }
    try { e.accountId = 'acc_otra'; } catch { /* modo estricto */ }
    return Object.isFrozen(e) && Object.isFrozen(e.payload)
      && e.payload.postId === 'post_1' && e.accountId === CUENTA;
  })());

  /* 35–36 · El payload es un AVISO, no un transporte de datos. */
  check('35) un payload que no cabe se rechaza',
    core.crearEvento({ ...base, payload: { texto: 'x'.repeat(5000) } }) === undefined
    && core.payloadAcotado({ a: 1 }) && !core.payloadAcotado({ a: 'x'.repeat(5000) }));
  check('36) y uno con un secreto dentro, también, a cualquier profundidad',
    core.crearEvento({ ...base, payload: { apiKey: 'sk-1' } }) === undefined
    && core.crearEvento({ ...base, payload: { a: { b: { token: 'x' } } } }) === undefined
    && !core.payloadLimpio({ meta: [{ password: 'x' }] })
    && core.payloadLimpio({ postId: 'p1', titulo: 'Un Weël' }));
  check('36b) pero SÍ puede llevar texto: un evento social lo necesita',
    core.payloadLimpio({ content: 'hola', message: 'hola' }),
    'esto es lo contrario que una traza, y a propósito');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · Eventos: la entrega honesta ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const ev = (id, seq) => core.crearEvento({
    eventId: id, type: 'POST_UPDATED', aggregate: { type: 'post', id: 'post_1' },
    accountId: CUENTA, occurredAt: 1, payload: {}, ...(seq !== undefined ? { sequence: seq } : {}),
  });

  /*
   * 37 · «EXACTAMENTE UNA VEZ» NO SE PUEDE DECLARAR. No existe: lo que los
   * sistemas llaman así es «al menos una vez» más un consumidor idempotente.
   */
  check('37) el contrato no promete exactly-once, porque no existe',
    !/exactly_once|exactlyOnce|exactamente una vez/i.test(FUENTE_EVENTS.replace(/GarantiaDeEntrega/g, '')));
  check('38) lo que sí se puede prometer está declarado',
    /'at_most_once' \| 'at_least_once'/.test(FUENTE_EVENTS));

  /* 39 · La otra mitad de la garantía: deduplicar por eventId. */
  check('39) el mismo evento entregado dos veces es UN hecho', (() => {
    const unicos = core.deduplicar([ev('a'), ev('b'), ev('a'), ev('c'), ev('b')]);
    return unicos.length === 3 && unicos.map((x) => x.eventId).join() === 'a,b,c';
  })(), 'y conserva el primero y el orden: deduplicar no es reordenar');

  /* 40 · Correlación y causalidad. */
  check('40) la causalidad se encadena y hereda la correlación', (() => {
    const padre = core.crearEvento({
      eventId: 'ev_padre', type: 'ASSET_PUBLISHED', aggregate: { type: 'asset', id: 'a1' },
      accountId: CUENTA, occurredAt: 1, payload: {}, correlationId: 'trace_9',
    });
    const hijo = core.crearEvento(core.causadoPor(padre, {
      eventId: 'ev_hijo', type: 'NOTIFICATION_CREATED', aggregate: { type: 'notification', id: 'n1' },
      accountId: CUENTA, occurredAt: 2, payload: {},
    }));
    return hijo.causationId === 'ev_padre' && hijo.correlationId === 'trace_9';
  })(), 'explica por qué alguien recibió un aviso, que hoy no se puede responder');

  /* 41–42 · El orden, solo donde significa algo. */
  check('41) dentro de un agregado, la posición ordena', (() => {
    const ordenados = core.enOrden([ev('c', 3), ev('a', 1), ev('b', 2)], { type: 'post', id: 'post_1' });
    return ordenados.map((x) => x.eventId).join() === 'a,b,c';
  })());
  check('42) y fuera de él no compara nada: los de otro agregado ni aparecen', (() => {
    const otro = core.crearEvento({
      eventId: 'x', type: 'POST_UPDATED', aggregate: { type: 'post', id: 'post_2' },
      accountId: CUENTA, occurredAt: 1, payload: {}, sequence: 0,
    });
    return core.enOrden([ev('a', 5), otro], { type: 'post', id: 'post_1' }).length === 1;
  })());
  check('43) los que no traen posición se quedan al final, sin inventarles una', (() => {
    const r = core.enOrden([ev('sin'), ev('con', 1)], { type: 'post', id: 'post_1' });
    return r.map((x) => x.eventId).join() === 'con,sin';
  })());

  /* 44 · La bandeja de salida: la forma honesta de emitir desde una transacción. */
  check('44) existe la forma de una bandeja de salida, sin infraestructura detrás',
    /export interface OutboxRecord/.test(FUENTE_EVENTS)
    && /'pending' \| 'delivered' \| 'failed'/.test(FUENTE_EVENTS));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · Los eventos NO son otra cosa ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * Cuatro fronteras. Cada una se rompería igual: metiendo en un sitio algo que
   * pertenece a otro «solo por esta vez».
   */
  check('45) EVENTOS ≠ OBSERVABILIDAD: no hay Tracer ni traza aquí',
    !/Tracer|OperationTrace|latencyMs|providerUsd/.test(FUENTE_EVENTS));
  check('46) y la traza sigue sin poder convertirse en bus de eventos',
    !/publish|emit|EventBus|subscribe/i.test(FUENTE_OBS));
  check('47) el único hilo entre los dos es la correlación',
    /correlationId/.test(FUENTE_EVENTS) && /traceId/.test(leer('functions/src/core/observability.ts')));

  check('48) EVENTOS ≠ JOB ENGINE: aquí no hay intentos, plazos ni cancelación',
    !/attempts?\s*:|leaseUntil|deadlineAt|cancelRequested|retr(y|ies)/i.test(
      FUENTE_EVENTS.replace(/readonly attempts: number;/, '')));
  check('49) EVENTOS ≠ WORKFLOW: ni pasos, ni dependencias, ni grafo',
    !/WorkflowStep|dependsOn|stepId/.test(FUENTE_EVENTS));
  check('50) EVENTOS ≠ LIBRO: ni asientos, ni saldos, ni dinero',
    !/LedgerEntry|balanceAfter|amountMinor|Money/.test(FUENTE_EVENTS));

  /* 51 · Y no es infraestructura: no puede haber una cola aquí dentro. */
  check('51) no hay corredor, ni cola, ni flujo dentro del contrato',
    !/kafka|redis|rabbit|nats|pubsub|queue\b/i.test(FUENTE_EVENTS));
  check('52) solo hay dos puertos, y el de emisión no sabe suscribir',
    /export interface EventPublisher/.test(FUENTE_EVENTS)
    && /export interface EventHandler/.test(FUENTE_EVENTS)
    && !/subscribe\(/.test(FUENTE_EVENTS),
    'un puerto que emite y suscribe a la vez ya es un corredor de mensajes');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── H · El catálogo, y su honestidad ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const PEDIDOS = ['POST_CREATED', 'POST_UPDATED', 'POST_DELETED', 'COMMENT_CREATED', 'COMMENT_DELETED',
    'LIKE_CREATED', 'LIKE_REMOVED', 'FOLLOW_CREATED', 'FOLLOW_REMOVED', 'PROFILE_UPDATED',
    'PAGE_CREATED', 'PAGE_UPDATED', 'COMMUNITY_CREATED', 'COMMUNITY_UPDATED',
    'WEEL_CREATED', 'WEEL_PUBLISHED', 'ASSET_CREATED', 'ASSET_PUBLISHED', 'ASSET_DELETED',
    'AI_GENERATION_REQUESTED', 'AI_GENERATION_STARTED', 'AI_GENERATION_COMPLETED',
    'AI_GENERATION_FAILED', 'AI_GENERATION_CANCELLED', 'AI_GENERATION_REFUNDED',
    'CREDIT_CHARGED', 'CREDIT_REFUNDED', 'NOTIFICATION_CREATED',
    'SEARCH_INDEX_REQUESTED', 'ANALYTICS_EVENT_CREATED'];

  const faltan = PEDIDOS.filter((t) => !core.esEventoDeclarado(t));
  check('53) los treinta nombres pedidos están reservados', faltan.length === 0, faltan.join(' '));
  check('54) y todos tienen la forma del contrato',
    core.EVENTOS_DECLARADOS.every((t) => core.esTipoDeEvento(t)));
  check('55) todos se pueden construir de verdad, no solo nombrar',
    core.EVENTOS_DECLARADOS.every((t) => !!core.crearEvento({
      eventId: `ev_${t}`, type: t, aggregate: { type: 'x', id: 'y' },
      accountId: CUENTA, occurredAt: 1, payload: {},
    })));

  /*
   * 56 · LA PRUEBA MÁS IMPORTANTE DE ESTE ARCHIVO, y la que dice la verdad.
   *
   * El defecto que ha aparecido en TODAS las fases anteriores es el mismo:
   * valores declarados que nadie produce nunca. Aquí se declaran treinta a
   * propósito, así que la prueba no comprueba que se produzcan —no se
   * producen— sino que NADIE LO ESTÉ FINGIENDO: ni un emisor, ni un
   * transporte, ni un consumidor en todo el repositorio.
   */
  const emisores = [];
  const mirar = (dir) => {
    for (const e of fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true })) {
      if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'lib') mirar(`${dir}/${e.name}`); continue; }
      if (!/\.tsx?$/.test(e.name)) continue;
      const ruta = `${dir}/${e.name}`;
      if (ruta.endsWith('core/events.ts')) continue;
      const src = sinComentarios(leer(ruta));
      if (/crearEvento\(|\.publish\(\s*\[|EventPublisher|OutboxRecord/.test(src)) emisores.push(ruta);
    }
  };
  mirar('functions/src');
  check('56) HONESTIDAD: ningún evento se emite todavía, y nadie finge que sí',
    emisores.length === 0, emisores.join(' ') || '30 nombres reservados, 0 productores');
  check('57) el archivo lo dice en voz alta, para quien lea el código y no la prueba',
    /NINGUNO DE ESTOS SE EMITE TODAVÍA/.test(leer('functions/src/core/events.ts')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── I · Los módulos nuevos siguen siendo Core ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const NUEVOS = [['identity.ts', FUENTE_IDENTITY], ['events.ts', FUENTE_EVENTS]];

  const sucios = NUEVOS.filter(([, s]) => /firebase|firestore|node:fs|node:http|axios|fetch\(|require\(/.test(s));
  check('58) ni Firebase, ni red, ni disco', sucios.length === 0, sucios.map((x) => x[0]).join());

  const inestables = NUEVOS.filter(([, s]) => /Date\.now\(|Math\.random\(|new Date\(/.test(s));
  check('59) ni reloj ni dados: el instante y el identificador los pone quien emite',
    inestables.length === 0, inestables.map((x) => x[0]).join());

  const PROVEEDORES = ['gemini', 'seedance', 'seedream', 'deepseek', 'openai', 'claude', 'anthropic',
    'elevenlabs', 'minimax', 'flux', 'tripo', 'hunyuan', 'qwen', 'wan', 'yinchao', 'bytedance', 'byteplus'];
  const conProveedor = NUEVOS.filter(([, s]) =>
    PROVEEDORES.some((p) => new RegExp(`(?<![a-z])${p}(?![a-z])`, 'i').test(s)));
  check('60) y ningún nombre de proveedor', conProveedor.length === 0, conProveedor.map((x) => x[0]).join());

  /* 61 · Solo importan del Core, como todo lo demás. */
  const fuera = [];
  for (const archivo of ['functions/src/core/identity.ts', 'functions/src/core/events.ts']) {
    for (const [, dep] of sinComentarios(leer(archivo)).matchAll(/from ['"]([^'"]+)['"]/g)) {
      if (!dep.startsWith('.')) fuera.push(`${archivo} → ${dep}`);
    }
  }
  check('61) solo importan de sí mismos', fuera.length === 0, fuera.join(' '));

  /* 62 · Y no se ha duplicado vocabulario: EntityType tiene un solo dueño. */
  const dueños = [];
  const buscarDueño = (dir) => {
    for (const e of fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true })) {
      if (e.isDirectory()) { buscarDueño(`${dir}/${e.name}`); continue; }
      if (!e.name.endsWith('.ts')) continue;
      if (/export type EntityType\s*=/.test(leer(`${dir}/${e.name}`))) dueños.push(`${dir}/${e.name}`);
    }
  };
  buscarDueño('functions/src/core');
  check('62) `EntityType` se declara en UN solo sitio', dueños.length === 1,
    dueños.join(' ') || 'ninguno');
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
