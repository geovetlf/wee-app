/**
 * F12-D · LA TAREA QUE VIVE EN CASA DE OTRO.
 *
 * Hasta aquí, toda operación de Weë cabía dentro de una llamada: se pedía, se
 * esperaba y se contestaba. Un vídeo no cabe. El proveedor lo coge, dice cómo
 * lo llama, y sigue por su cuenta minutos u horas —mientras el proceso que lo
 * pidió ya no existe—.
 *
 * Esta suite prueba las cinco piezas que hacen que eso no pierda ni dinero ni
 * resultados, y sobre todo prueba lo que NO tienen que hacer:
 *
 *   A · Encontrar de quién es un aviso (`providerRef` → trabajo e intento).
 *   B · Que el mismo aviso repetido sea el MISMO aviso (eventId determinista).
 *   C · Los relojes, que no son el mismo reloj.
 *   D · Que el proveedor la coja y suelte el proceso (`accepted`).
 *   E · Qué dice un aviso, y qué NO autoriza a hacer.
 *   F · Traerse el resultado antes de que el enlace caduque.
 *   G · Atender un aviso de principio a fin.
 *   H · Preguntar cuando nadie ha avisado (reconciliación).
 *   I · El dinero: qué se cobra, qué se devuelve y qué NO.
 *   J · Aislamiento: de quién es cada cosa.
 *   K · Estructura: qué se añadió, qué no se tocó y qué sigue sin conectar.
 *
 * ── LA REGLA QUE SE PRUEBA MÁS VECES ────────────────────────────────────────
 *
 *     NO SABER NUNCA ES HABER FALLADO.
 *
 * Un proveedor que no contesta, un estado que no se reconoce, un enlace que no
 * se pudo descargar: ninguno cierra un trabajo y ninguno devuelve un Credit.
 *
 * NADA DE ESTO ESTÁ CONECTADO: no hay capacidad asíncrona migrada, el receptor
 * de avisos no se exporta como Function y no se desplegó nada.
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
/* Para preguntar por el ORDEN de las cosas: un `import` de arriba no es «usarlo antes». */
const sinImportes = (src) => sinComentarios(src).replace(/^\s*import[\s\S]*?from\s+'[^']+';$/gm, ' ');

/** Los módulos que producción carga de verdad. Un archivo muerto no enciende nada. */
const fuentesVivas = () => [
  'functions/src/index.ts', 'functions/src/creator/index.ts', 'functions/src/creator/brain.ts',
  'functions/src/creator/video.ts', 'functions/src/creator/planner.ts', 'functions/src/engine/index.ts',
  'functions/src/engine/gateway.ts', 'functions/src/engine/router.ts', 'functions/src/settlement/programado.ts',
];

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };

const { claveDeOperacion, clavesDeOperacionDe, identidadCompleta, identidadDeEvento, intentoDeLaOperacion } = lib('runtime/proveedor.js');
const { PLAZOS_DE_VIDEO, TOPE_DEL_CONTRATO_MS, politicaDe, revisarPlazos, segundosParaElProveedor } = lib('runtime/plazos.js');
const { leerAviso } = lib('runtime/aviso.js');
const { atenderAviso } = lib('runtime/atencion.js');
const { decidirReconciliacion } = lib('runtime/reconciliacion.js');
const { reconciliarTrabajos, reconciliarUno } = lib('runtime/reconciliador.js');
const { identidadDelMaterial, procedenciaDe, tipoDeMaterialDe } = lib('runtime/materializacion.js');
const { decidirLiquidacion } = lib('runtime/liquidacion.js');
const { leerAvisoDeSeedance } = lib('engine/providers/seedance.js');
const { crearJobEngine, POLITICA_DE_TRABAJO } = lib('core/job.js');
const { mismoTestigo } = lib('engine/webhooks.js');
const { mantenimientoDeWee } = lib('runtime/index.js');

const motor = crearJobEngine();
const T0 = 1_700_000_000_000;
const ANA = 'uAna';
const BEA = 'uBea';

/* ── El proveedor de mentira ───────────────────────────────────────────────── */

/**
 * FAKE SEEDANCE. Habla EXACTAMENTE el idioma de ModelArk —los mismos nombres de
 * campo, los mismos seis estados— porque lo que se está probando es el
 * traductor de verdad (`leerAvisoDeSeedance`), no una versión de mentira de él.
 * Lo único falso es de dónde salen los bytes.
 */
const seedanceFalso = (estado, extra = {}) => ({
  id: extra.id ?? 'cgt-20260920-abc123',
  model: 'dreamina-seedance-2-0-260128',
  status: estado,
  updated_at: extra.updated_at ?? 1_700_000_100,
  ...(estado === 'succeeded' ? { content: { video_url: extra.url ?? 'https://ark-content.example/v/abc.mp4?sig=SECRETO' }, usage: { completion_tokens: 108_000 } } : {}),
  ...(extra.error ? { error: extra.error } : {}),
});

/** Un resolutor de mentira que contesta lo que se le diga, incluido «no sé». */
const resolutorFalso = (respuesta) => ({ consultar: async () => respuesta });

/* ── Un trabajo, con solo lo que estas piezas miran ────────────────────────── */

const intento = (o = {}) => ({
  attemptId: o.attemptId ?? 'j1#1',
  number: o.number ?? 1,
  startedAt: o.startedAt ?? T0,
  dispatched: o.dispatched ?? true,
  providerKey: 'k1',
  ...(o.providerRef !== undefined ? { providerRef: o.providerRef } : { providerRef: { providerId: 'seedance', operationId: 'cgt-20260920-abc123' } }),
  ...(o.outcome !== undefined ? { outcome: o.outcome } : {}),
  ...(o.endedAt !== undefined ? { endedAt: o.endedAt } : {}),
  ...(o.lease !== undefined ? { lease: o.lease } : {}),
});

const trabajo = (o = {}) => ({
  contract: '1.0',
  jobId: o.jobId ?? 'j1',
  revision: o.revision ?? 1,
  state: o.state ?? 'waiting',
  owner: { userId: o.userId ?? ANA },
  context: { operationId: 'oper-1' },
  capability: o.capability ?? 'video.generate',
  implementation: { providerId: 'seedance', modelId: 'dreamina-seedance-2-0-260128', adapterId: 'adapter:seedance' },
  input: { prompt: 'x' },
  trace: { traceId: 'tr-1', requestId: 'req-1', userId: o.userId ?? ANA, runId: 'run-1', stepId: 'p1' },
  metadata: o.metadata === null ? undefined : { creditTransactionId: 'usage_op1', creditRequestId: 'op1', creditsEstimated: 12, service: 'ai_video', ...(o.metadata ?? {}) },
  mode: 'sync',
  policy: POLITICA_DE_TRABAJO,
  idempotency: { key: 'k', scope: 's', fingerprint: 'f' },
  createdAt: T0, updatedAt: T0, deadlineAt: T0 + 3_600_000, availableAt: T0,
  attempts: o.attempts ?? [intento()],
  attemptCount: (o.attempts ?? [intento()]).length,
  seenEvents: o.seenEvents ?? [],
});

/* ═══ A · ¿DE QUIÉN ES ESTE AVISO? ═════════════════════════════════════════ */
console.log('\n── A · Encontrar el trabajo por cómo lo llama el proveedor ──');
{
  check('la clave lleva proveedor Y operación: dos proveedores pueden llamar igual a dos tareas', claveDeOperacion('seedance', 'cgt-1') === 'seedance:cgt-1');
  check('y no se puede fabricar una que sea otra cosa: ni rutas, ni espacios, ni saltos de línea',
    [['seedance', 'a/b'], ['see dance', 'x'], ['seedance', 'a\nb'], ['seedance', 'a\\b'], ['', 'x'], ['seedance', '']].every(([p, o]) => claveDeOperacion(p, o) === undefined));
  check('ni una desmedida', claveDeOperacion('s'.repeat(65), 'x') === undefined && claveDeOperacion('s', 'x'.repeat(257)) === undefined);

  /* A1 · providerRef creation: el trabajo declara TODAS sus operaciones, no solo la última. */
  const dos = trabajo({ attempts: [
    intento({ attemptId: 'j1#1', providerRef: { providerId: 'seedance', operationId: 'cgt-VIEJA' } }),
    intento({ attemptId: 'j1#2', number: 2, providerRef: { providerId: 'seedance', operationId: 'cgt-NUEVA' } }),
  ] });
  check('un trabajo con dos intentos declara las DOS operaciones: un aviso tardío de la primera tiene que encontrar su sitio',
    clavesDeOperacionDe(dos).join(',') === 'seedance:cgt-VIEJA,seedance:cgt-NUEVA');
  check('un intento que nunca salió no declara nada', clavesDeOperacionDe(trabajo({ attempts: [intento({ providerRef: null })] })).length === 0);
  check('y no se repiten: el mismo nombre dos veces es uno', clavesDeOperacionDe(trabajo({ attempts: [intento(), intento({ attemptId: 'j1#2' })] })).length === 1);

  /* A2 · providerRef lookup: de la operación al INTENTO, que es lo que el motor exige. */
  check('de la operación se llega a su intento, no solo a su trabajo', intentoDeLaOperacion(dos, { providerId: 'seedance', operationId: 'cgt-VIEJA' })?.attemptId === 'j1#1');
  check('y a una operación que no es de este trabajo no se le inventa uno', intentoDeLaOperacion(dos, { providerId: 'seedance', operationId: 'cgt-AJENA' }) === undefined);
  check('ni a una del mismo nombre en otro proveedor', intentoDeLaOperacion(dos, { providerId: 'flux', operationId: 'cgt-VIEJA' }) === undefined);

  const ALM = sinComentarios(leer('functions/src/runtime/almacen.ts'));
  check('el índice es una PROYECCIÓN del trabajo, no una segunda verdad: se deriva y se escribe con él', /providerOps: \[\.\.\.clavesDeOperacionDe\(job\)\]/.test(ALM) && /json: JSON\.stringify\(job\)/.test(ALM));
  check('se busca con una consulta de un solo campo: sin índice compuesto', /where\('providerOps', 'array-contains', clave\)/.test(ALM));
  /* Z · providerRef collision/ambiguity. */
  check('se piden DOS para poder ver lo que no puede pasar, y si pasa NO se elige: es ambigua', /\.limit\(2\)/.test(ALM) && /motivo: 'ambigua'/.test(ALM));
}

/* ═══ B · EL MISMO AVISO ES EL MISMO AVISO ═════════════════════════════════ */
console.log('\n── B · La identidad de un aviso: calculada, nunca recibida ──');
{
  const datos = { providerId: 'seedance', operationId: 'cgt-1', providerStatus: 'succeeded', updatedAt: 1_700_000_100 };
  /* C · duplicate callback · D · same callback multiple times. */
  check('el mismo aviso, calculado tres veces, da el mismo identificador', new Set([identidadDeEvento(datos), identidadDeEvento({ ...datos }), identidadDeEvento({ ...datos })]).size === 1);
  check('no depende del proceso, ni del reloj de casa, ni del azar', identidadDeEvento(datos) === identidadDeEvento({ ...datos }));
  check('cambiar el estado cambia la identidad', identidadDeEvento(datos) !== identidadDeEvento({ ...datos, providerStatus: 'failed' }));
  check('cambiar CUÁNDO lo cambió, también', identidadDeEvento(datos) !== identidadDeEvento({ ...datos, updatedAt: 1_700_000_200 }));
  check('y la operación de otro trabajo, también', identidadDeEvento(datos) !== identidadDeEvento({ ...datos, operationId: 'cgt-2' }));
  check('tiene la forma que el motor admite como identidad de evento', /^ev_[0-9a-f]{32}$/.test(identidadDeEvento(datos)));
  check('sin fecha se DEGRADA en vez de fallar, y se puede saber que se degradó',
    !!identidadDeEvento({ ...datos, updatedAt: undefined }) && identidadCompleta(1) === true && identidadCompleta(undefined) === false && identidadCompleta('') === false);
  check('sin operación o sin estado no hay identidad que valga', identidadDeEvento({ ...datos, operationId: '' }) === undefined && identidadDeEvento({ ...datos, providerStatus: '' }) === undefined);

  /* La defensa persistente: el motor guarda lo visto DENTRO del trabajo, no en memoria. */
  const j = trabajo({ state: 'waiting' });
  const ev = { eventId: identidadDeEvento(datos), jobId: 'j1', attemptId: 'j1#1', kind: 'progress', at: T0 + 1000, providerRef: { providerId: 'seedance', operationId: 'cgt-20260920-abc123' } };
  const d1 = motor.recibirEvento(j, ev, T0 + 1000);
  check('un aviso nuevo mueve el trabajo y queda anotado EN el trabajo, que es lo que se guarda', d1.status === 'transition' && d1.job.seenEvents.includes(ev.eventId));
  const d2 = motor.recibirEvento(d1.job, ev, T0 + 2000);
  check('el mismo, otra vez, no hace nada: la deduplicación vive en el estado guardado, no en la memoria del proceso', d2.status === 'noop' && d2.warnings.includes('event_duplicate'));
  const d3 = motor.recibirEvento(d1.job, ev, T0 + 3000);
  check('y una tercera vez, tampoco', d3.status === 'noop');
}

/* ═══ C · LOS RELOJES ══════════════════════════════════════════════════════ */
console.log('\n── C · Cinco relojes que no son el mismo ──');
{
  check('los plazos del vídeo se sostienen', revisarPlazos(PLAZOS_DE_VIDEO).length === 0, revisarPlazos(PLAZOS_DE_VIDEO).join(','));
  check('la concesión es MUCHO más corta que la vida del trabajo: un proceso muerto no bloquea horas', PLAZOS_DE_VIDEO.concesionMs * 60 <= PLAZOS_DE_VIDEO.vidaDelTrabajoMs);
  check('el trabajo vive MÁS que la tarea en el proveedor: si no, el resultado llega a un trabajo que ya no lo admite', PLAZOS_DE_VIDEO.vidaDelTrabajoMs > PLAZOS_DE_VIDEO.vidaEnElProveedorMs);
  check('y cabe en el tope del contrato del motor', PLAZOS_DE_VIDEO.vidaDelTrabajoMs <= TOPE_DEL_CONTRATO_MS);
  check('se puede reconciliar dentro de la ventana del proveedor', PLAZOS_DE_VIDEO.vidaDelTrabajoMs <= PLAZOS_DE_VIDEO.horizonteDeReconciliacionMs);
  check('el envío es una llamada, no una espera: segundos', PLAZOS_DE_VIDEO.envioMs <= 60_000);
  check('los dos que pone el proveedor son los publicados: 7 días de ventana y 24 h de enlace',
    PLAZOS_DE_VIDEO.horizonteDeReconciliacionMs === 7 * 24 * 3_600_000 && PLAZOS_DE_VIDEO.vidaDeLaUrlMs === 24 * 3_600_000);
  check('un plazo incoherente se NOMBRA, no se resume en «inválido»',
    revisarPlazos({ ...PLAZOS_DE_VIDEO, concesionMs: PLAZOS_DE_VIDEO.vidaDelTrabajoMs }).includes('concesion_no_menor')
    && revisarPlazos({ ...PLAZOS_DE_VIDEO, vidaEnElProveedorMs: PLAZOS_DE_VIDEO.vidaDelTrabajoMs + 1 }).includes('proveedor_supera_trabajo')
    && revisarPlazos({ ...PLAZOS_DE_VIDEO, vidaDelTrabajoMs: TOPE_DEL_CONTRATO_MS + 1, horizonteDeReconciliacionMs: Infinity }).includes('trabajo_supera_el_tope'));
  const p = politicaDe(PLAZOS_DE_VIDEO, POLITICA_DE_TRABAJO);
  check('la política que sale de ellos respeta los reintentos del motor: no se los inventa', p.retry === POLITICA_DE_TRABAJO.retry && p.maxLifetimeMs === PLAZOS_DE_VIDEO.vidaDelTrabajoMs && p.leaseMs === PLAZOS_DE_VIDEO.concesionMs);
  check('y al proveedor se le habla en SUS unidades', segundosParaElProveedor(PLAZOS_DE_VIDEO) === 7200);
}

/* ═══ D · QUE LA COJA Y SUELTE EL PROCESO ══════════════════════════════════ */
console.log('\n── D · El proveedor la coge: `accepted` ──');
{
  const SD = sinComentarios(leer('functions/src/engine/providers/seedance.ts'));
  check('Seedance sabe aceptar y soltar: devuelve el nombre de la tarea sin sondear', /accepted: \{ operationId: taskId \}/.test(SD));
  check('pero SOLO si se lo piden', /if \(request\.acceptAsync\)/.test(SD));
  check('y el sondeo de siempre sigue ahí, detrás', /pollUntil/.test(SD));
  check('sin `acceptAsync`, el camino de siempre no cambia: el router legacy nunca lo pide', !/acceptAsync/.test(sinComentarios(leer('functions/src/engine/router.ts'))));
  check('y si un adaptador lo devolviera por ahí, se trata como el fallo que es: no se finge un resultado', /if \(salida\.accepted\) throw new EngineError/.test(sinComentarios(leer('functions/src/engine/router.ts'))));

  const TYPES = sinComentarios(leer('functions/src/engine/types.ts'));
  check('el contrato del adaptador es ADITIVO: `ProviderResult` sigue siendo lo que era, con el discriminante ausente', /accepted\?: undefined;/.test(TYPES) && /export interface ProviderResult \{/.test(TYPES));
  check('y la aceptación es otro tipo, no un resultado vacío: no hay salida que fingir', /export interface ProviderAccepted \{/.test(TYPES) && !/output\?: ProviderOutput/.test(TYPES));

  const GW = sinComentarios(leer('functions/src/engine/gateway.ts'));
  /* El bloque que construye la aceptación, aislado: se mira lo que lleva y lo que NO lleva. */
  const bloqueAceptado = (GW.match(/return \{\s*ok: true,\s*accepted: true,[\s\S]*?\};/) || [''])[0];
  check('la aceptación lleva la operación y los avisos', /operation: \{/.test(bloqueAceptado) && /warnings:/.test(bloqueAceptado));
  check('y NO lleva uso: lo que hay al aceptar es una estimación, y el uso es lo que el proveedor DIJO consumir', bloqueAceptado.length > 0 && !/usage:/.test(bloqueAceptado));
  check('la modalidad de ejecución NO cambia: sigue siendo `sync`', /mode: 'sync'/.test(sinComentarios(leer('functions/src/core/gateway.ts'))));
}

/* ═══ E · QUÉ DICE UN AVISO ════════════════════════════════════════════════ */
console.log('\n── E · Lo que cuenta el proveedor, traducido sin fiarse ──');
{
  /* H · provider success. */
  const ok = leerAvisoDeSeedance(seedanceFalso('succeeded'));
  check('«terminó bien» se traduce a terminado, y el enlace viaja aparte', ok.desenlace === 'terminado' && ok.recurso.includes('abc.mp4'));
  /* G · provider failure. */
  check('«falló» se traduce a fallado', leerAvisoDeSeedance(seedanceFalso('failed', { error: { code: 'X', message: 'boom' } })).desenlace === 'fallado');
  /* I · provider expired · J · provider cancelled. */
  check('«caducó» también: es un final definitivo del otro lado', leerAvisoDeSeedance(seedanceFalso('expired')).desenlace === 'fallado');
  check('y «cancelado», también —sin abrir un estado nuevo en el Core solo para nombrarlo—', leerAvisoDeSeedance(seedanceFalso('cancelled')).desenlace === 'fallado');
  check('pero lo que él dijo se conserva palabra por palabra: no se pierde al traducir',
    leerAvisoDeSeedance(seedanceFalso('cancelled')).providerStatus === 'cancelled' && leerAvisoDeSeedance(seedanceFalso('expired')).providerStatus === 'expired');
  /* K · provider still running. */
  check('«en cola» y «ejecutándose» son EN MARCHA: ni terminan ni fallan', leerAvisoDeSeedance(seedanceFalso('queued')).desenlace === 'en_marcha' && leerAvisoDeSeedance(seedanceFalso('running')).desenlace === 'en_marcha');
  /* F · unknown callback. */
  check('un estado que no conocemos es DESCONOCIDO, nunca un fallo', leerAvisoDeSeedance(seedanceFalso('rumiando')).desenlace === 'desconocido');
  check('un cuerpo que no es un aviso no se interpreta', [null, undefined, 1, 'x', [], {}, { id: 'x' }, { status: 'succeeded' }].every((c) => leerAvisoDeSeedance(c) === undefined));

  const j = trabajo();
  const at = T0 + 5_000;
  /* Un desconocido no produce evento: no mueve nada. */
  check('un desconocido no produce evento: no hay nada que aplicar', leerAviso({ aviso: leerAvisoDeSeedance(seedanceFalso('rumiando')), job: j, intento: j.attempts[0], at }).ok === false);
  const enMarcha = leerAviso({ aviso: leerAvisoDeSeedance(seedanceFalso('running')), job: j, intento: j.attempts[0], at });
  check('un «en marcha» produce un `progress` que NO termina nada', enMarcha.ok && enMarcha.evento.kind === 'progress' && enMarcha.terminal === false);
  const fallo = leerAviso({ aviso: leerAvisoDeSeedance(seedanceFalso('cancelled', { error: { code: 'CancelledByUser', message: 'lo paró alguien' } })), job: j, intento: j.attempts[0], at });
  check('un «cancelado» produce un `failed` terminal', fallo.ok && fallo.evento.kind === 'failed' && fallo.terminal === true);
  check('y lo suyo queda escrito en los metadatos, que es donde se puede mirar después',
    fallo.evento.metadata.providerStatus === 'cancelled' && fallo.evento.metadata.providerCode === 'CancelledByUser' && fallo.evento.error.details.providerStatus === 'cancelled');
  check('el motivo va acotado: nada sin medida entra en un trabajo',
    leerAviso({ aviso: { ...leerAvisoDeSeedance(seedanceFalso('failed')), motivo: 'x'.repeat(5000) }, job: j, intento: j.attempts[0], at }).evento.error.details.providerMessage.length <= 200);

  /* W · result URL expiration protection: un final bueno SIN resultado guardado no cierra. */
  const sinGuardar = leerAviso({ aviso: leerAvisoDeSeedance(seedanceFalso('succeeded')), job: j, intento: j.attempts[0], at });
  check('un final BUENO sin el resultado ya guardado NO cierra el trabajo: cerrarlo sería cobrar por un enlace que caduca', sinGuardar.ok === false && sinGuardar.motivo === 'sin_efecto');
  const guardado = leerAviso({ aviso: leerAvisoDeSeedance(seedanceFalso('succeeded')), job: j, intento: j.attempts[0], at, outputRefs: ['mat_abc'] });
  check('con el resultado en casa, sí', guardado.ok && guardado.evento.kind === 'succeeded' && guardado.evento.outputRefs[0] === 'mat_abc');
  check('y el enlace del proveedor NO viaja al evento: ni en salidas, ni en metadatos, ni en el error',
    !JSON.stringify(guardado.evento).includes('SECRETO') && !JSON.stringify(guardado.evento).includes('ark-content'));
}

/* ═══ F · TRAERSE EL RESULTADO ═════════════════════════════════════════════ */
console.log('\n── F · La identidad del material: calculada, no sorteada ──');
{
  /* V · materialization duplicate. */
  const a = identidadDelMaterial('j1', 'j1#1');
  check('la misma llegada, calculada dos veces, pide el MISMO material', a === identidadDelMaterial('j1', 'j1#1'));
  check('otro INTENTO es otro material: un reintento no pisa el resultado del primero', a !== identidadDelMaterial('j1', 'j1#2'));
  check('y otro trabajo, también', a !== identidadDelMaterial('j2', 'j1#1'));
  check('tiene la forma que el contrato del material admite', /^mat_[0-9a-f]{32}$/.test(a) && /^[A-Za-z0-9_-]{4,128}$/.test(a));
  check('sin trabajo o sin intento no hay identidad', identidadDelMaterial('', 'x') === undefined && identidadDelMaterial('x', '') === undefined);

  const j = trabajo();
  const prov = procedenciaDe(j, leerAvisoDeSeedance(seedanceFalso('succeeded')), T0);
  check('la procedencia sale del TRABAJO: trabajo, ejecución, paso, petición y traza', prov.jobId === 'j1' && prov.runId === 'run-1' && prov.stepId === 'p1' && prov.requestId === 'req-1' && prov.traceId === 'tr-1');
  check('del aviso se toma UNA cosa: cómo llama él a la operación', prov.operationId === 'cgt-20260920-abc123');
  check('y el proveedor y el modelo salen de lo que decidió el Router, no del mensaje', prov.provider === 'seedance' && prov.model === 'dreamina-seedance-2-0-260128');
  check('el enlace NO entra en la procedencia', !JSON.stringify(prov).includes('SECRETO'));
  check('la clase de material sale de la capacidad', tipoDeMaterialDe('video.generate') === 'video' && tipoDeMaterialDe('image.edit') === 'image' && tipoDeMaterialDe('text.generate') === 'text' && tipoDeMaterialDe('raro') === undefined);

  const MAT = sinComentarios(leer('functions/src/content/materializador.ts'));
  { const cuerpo = sinImportes(leer('functions/src/content/materializador.ts')); check('se pregunta si ya está ANTES de descargar: un webhook repetido no se baja el vídeo tres veces', cuerpo.indexOf('leerMaterial') < cuerpo.indexOf('fetchBytes')); }
  check('la ruta del objeto se deriva de la identidad: dos llegadas no dejan dos objetos', /users\/\$\{userId\}\/ai-generations\/\$\{assetId\}/.test(MAT));
  check('y el objeto se escribe SOLO si no existe', /ifGenerationMatch: 0/.test(MAT));
  check('un enlace caducado se distingue de un fallo de red, y NINGUNO cierra el trabajo', /'caducado'/.test(MAT) && /'no_se_pudo_traer'/.test(MAT));
  check('la ficha se crea solo si no está: la segunda llegada no pisa la primera', /\.create\(doc\)/.test(sinComentarios(leer('functions/src/content/index.ts'))));
}

/* ═══ G · ATENDER UN AVISO, DE PRINCIPIO A FIN ═════════════════════════════ */
console.log('\n── G · El camino entero, con puertos de mentira ──');

/** Un mundo con el motor de verdad y todo lo demás de mentira. */
const mundo = (o = {}) => {
  const estado = { jobs: new Map(), guardados: new Map(), descargas: 0, escrituras: 0 };
  for (const j of o.jobs ?? [trabajo()]) estado.jobs.set(j.jobId, j);
  const deps = {
    trabajos: {
      async porReferenciaDeProveedor(providerId, operationId) {
        const clave = claveDeOperacion(providerId, operationId);
        if (!clave) return { ok: false, motivo: 'no_encontrada' };
        const encontrados = [...estado.jobs.values()].filter((j) => clavesDeOperacionDe(j).includes(clave));
        if (!encontrados.length) return { ok: false, motivo: 'no_encontrada' };
        if (encontrados.length > 1) return { ok: false, motivo: 'ambigua' };
        const i = intentoDeLaOperacion(encontrados[0], { providerId, operationId });
        return i ? { ok: true, job: encontrados[0], intento: i } : { ok: false, motivo: 'intento_no_encontrado' };
      },
      async recuperables() { return { jobs: [...estado.jobs.values()] }; },
    },
    motor,
    almacen: {
      async aplicar(t) {
        estado.escrituras++;
        const actual = estado.jobs.get(t.jobId);
        /* EL MISMO CAS QUE EL ALMACÉN DE VERDAD: quien llega con una revisión vieja NO escribe. */
        if (!actual || actual.revision !== t.expectedRevision) return { applied: false, job: actual };
        estado.jobs.set(t.jobId, t.job);
        return { applied: true, job: t.job };
      },
    },
    materializar: {
      async guardar(p) {
        estado.descargas++;
        if (o.materializacionFalla) return { ok: false, motivo: o.materializacionFalla };
        const yaEstaba = estado.guardados.has(p.assetId);
        estado.guardados.set(p.assetId, p);
        return { ok: true, assetId: p.assetId, yaEstaba };
      },
    },
    ahora: () => o.ahora ?? T0 + 10_000,
  };
  return { deps, estado };
};

{
  /* H · provider success, camino entero. */
  const { deps, estado } = mundo();
  const r = await atenderAviso(deps, leerAvisoDeSeedance(seedanceFalso('succeeded')));
  check('un final bueno: se guarda el resultado, se cierra el trabajo y se dice cuál es el material', r.estado === 'aplicado' && r.terminal === true && /^mat_/.test(r.assetId));
  check('el trabajo quedó terminado y con el material como salida', estado.jobs.get('j1').state === 'completed' && estado.jobs.get('j1').result.outputRefs[0] === r.assetId);
  check('y se guardó exactamente una vez', estado.descargas === 1);
  check('el enlace del proveedor no llegó al trabajo guardado', !JSON.stringify(estado.jobs.get('j1')).includes('SECRETO'));

  /* T · callback after success · C/D · duplicate callback. */
  const descargasAntes = estado.descargas;
  const r2 = await atenderAviso(deps, leerAvisoDeSeedance(seedanceFalso('succeeded')));
  check('el MISMO aviso otra vez, con el trabajo ya cerrado: no hace nada', r2.estado === 'repetido');
  check('y no vuelve a cobrar ni a duplicar el material: ya estaba', estado.guardados.size === 1);
  check('ni siquiera le pregunta al materializador: sobre un trabajo terminal no se gasta nada', estado.descargas === descargasAntes);
  check('y no escribe: el trabajo no se mueve ni una revisión', estado.escrituras === 1);
}
{
  /* G · provider failure, camino entero. */
  const { deps, estado } = mundo();
  const r = await atenderAviso(deps, leerAvisoDeSeedance(seedanceFalso('failed', { error: { code: 'ContentModerated', message: 'no' } })));
  check('un fallo definitivo cierra el trabajo como fallado', r.estado === 'aplicado' && r.terminal === true);
  check('sin descargar nada: no hay resultado que traerse', estado.descargas === 0);

  /* U · callback after failure. */
  const r2 = await atenderAviso(deps, leerAvisoDeSeedance(seedanceFalso('succeeded')));
  check('y un «terminó bien» que llega DESPUÉS no desentierra el trabajo', r2.estado === 'repetido' && estado.jobs.get('j1').state !== 'completed');
}
{
  /* K · provider still running. */
  const { deps, estado } = mundo();
  const r = await atenderAviso(deps, leerAvisoDeSeedance(seedanceFalso('running')));
  check('«sigue en marcha» deja el trabajo ESPERANDO y anota la referencia', r.estado === 'aplicado' && r.terminal === false && estado.jobs.get('j1').state === 'waiting');
  check('sin descargar nada y sin cerrar nada', estado.descargas === 0 && !estado.jobs.get('j1').result);
}
{
  /* F · unknown callback. */
  const { deps, estado } = mundo();
  const r = await atenderAviso(deps, leerAvisoDeSeedance(seedanceFalso('rumiando')));
  check('un estado que no conocemos no mueve NADA: ni cierra, ni falla, ni descarga', r.estado === 'sin_efecto' && estado.jobs.get('j1').state === 'waiting' && estado.descargas === 0 && estado.escrituras === 0);
}
{
  /* W · result URL expiration protection, camino entero. */
  const { deps, estado } = mundo({ materializacionFalla: 'caducado' });
  const r = await atenderAviso(deps, leerAvisoDeSeedance(seedanceFalso('succeeded')));
  check('si el resultado no se pudo traer, el trabajo NO se cierra: se aplaza', r.estado === 'aplazado' && r.motivo === 'caducado');
  check('y se queda esperando, para que alguien vuelva a intentarlo', estado.jobs.get('j1').state === 'waiting' && estado.escrituras === 0);
}
{
  /* E · out-of-order callback: un aviso de un intento viejo no mueve el actual. */
  const dos = trabajo({ attempts: [
    intento({ attemptId: 'j1#1', providerRef: { providerId: 'seedance', operationId: 'cgt-VIEJA' }, outcome: 'failed', endedAt: T0 + 1 }),
    intento({ attemptId: 'j1#2', number: 2, providerRef: { providerId: 'seedance', operationId: 'cgt-NUEVA' } }),
  ] });
  const { deps, estado } = mundo({ jobs: [dos] });
  const r = await atenderAviso(deps, leerAvisoDeSeedance(seedanceFalso('succeeded', { id: 'cgt-VIEJA' })));
  check('un aviso sobre un intento YA CERRADO no mueve el intento en curso', r.estado === 'repetido' && estado.jobs.get('j1').state === 'waiting');

  /* Y · attempt isolation: el aviso del intento vivo sí. */
  const r2 = await atenderAviso(deps, leerAvisoDeSeedance(seedanceFalso('succeeded', { id: 'cgt-NUEVA' })));
  check('y el del intento vivo, sí', r2.estado === 'aplicado');
  check('el material es el del intento que lo produjo, no el del trabajo', r2.assetId === identidadDelMaterial('j1', 'j1#2'));
}
{
  /* Z · ambiguity · X · account isolation: la misma respuesta hacia fuera. */
  const a = trabajo({ jobId: 'jA', userId: ANA });
  const b = trabajo({ jobId: 'jB', userId: BEA });
  const { deps } = mundo({ jobs: [a, b] });
  const r = await atenderAviso(deps, leerAvisoDeSeedance(seedanceFalso('succeeded')));
  check('dos trabajos que declaran la misma operación: NO se elige uno —sería inventarse de quién es el dinero—', r.estado === 'no_encontrada');
  const { deps: d2 } = mundo({ jobs: [trabajo({ jobId: 'jX' })] });
  const r2 = await atenderAviso(d2, leerAvisoDeSeedance(seedanceFalso('succeeded', { id: 'cgt-DE-NADIE' })));
  check('y una operación que no es de nadie se contesta IGUAL que una ajena: probando nombres no se averigua nada', r2.estado === 'no_encontrada');
}
{
  /* S · concurrent settlement: dos entregas a la vez. */
  const { deps, estado } = mundo();
  const [x, y] = await Promise.all([
    atenderAviso(deps, leerAvisoDeSeedance(seedanceFalso('succeeded'))),
    atenderAviso(deps, leerAvisoDeSeedance(seedanceFalso('succeeded'))),
  ]);
  const aplicados = [x, y].filter((r) => r.estado === 'aplicado').length;
  check('dos entregas simultáneas del mismo aviso: UNA aplica, la otra se encuentra el trabajo ya movido', aplicados === 1 && [x, y].some((r) => r.estado === 'repetido'));
  check('y queda UN solo material', estado.guardados.size === 1);
  check('el trabajo quedó cerrado una vez', estado.jobs.get('j1').state === 'completed');
}

/* ═══ H · PREGUNTAR CUANDO NADIE HA AVISADO ════════════════════════════════ */
console.log('\n── H · La reconciliación: la segunda forma de enterarse ──');
{
  const P = PLAZOS_DE_VIDEO;
  check('a un trabajo que salió y espera, se le pregunta', decidirReconciliacion(trabajo(), T0 + 10_000, P).tipo === 'preguntar');
  check('a uno que nadie ha mandado, no', decidirReconciliacion(trabajo({ attempts: [intento({ dispatched: false })] }), T0 + 10_000, P).motivo === 'no_salio');
  check('a uno que salió sin nombre, tampoco: no hay por qué operación preguntar', decidirReconciliacion(trabajo({ attempts: [intento({ providerRef: null })] }), T0 + 10_000, P).motivo === 'sin_referencia');
  check('a uno TERMINADO, tampoco', decidirReconciliacion(trabajo({ state: 'completed' }), T0 + 10_000, P).motivo === 'trabajo_terminal');
  check('a uno cuyo intento ya tiene desenlace, tampoco', decidirReconciliacion(trabajo({ attempts: [intento({ outcome: 'succeeded' })] }), T0 + 10_000, P).motivo === 'trabajo_terminal');
  /* No pisarle el trabajo a quien lo está haciendo. */
  check('y a uno que alguien está ejecutando AHORA, tampoco: preguntar por encima de quien trabaja es pisarle',
    decidirReconciliacion(trabajo({ attempts: [intento({ lease: { owner: 'w1', until: T0 + 60_000 } })] }), T0 + 10_000, P).motivo === 'en_otras_manos');
  check('pasada la ventana en que el proveedor recuerda, se deja de preguntar —pero NO se cierra ni se devuelve nada—',
    decidirReconciliacion(trabajo(), T0 + P.horizonteDeReconciliacionMs + 1, P).tipo === 'rendirse');
  check('la ventana se mide desde que SALIÓ, no desde que nació el trabajo', decidirReconciliacion(trabajo(), T0 + P.horizonteDeReconciliacionMs - 1, P).tipo === 'preguntar');

  /* M · reconciliation: contesta y se resuelve. */
  const { deps, estado } = mundo();
  const r = await reconciliarUno({ ...deps, resolutores: { seedance: resolutorFalso({ conocido: true, aviso: leerAvisoDeSeedance(seedanceFalso('succeeded')) }) }, plazos: P }, estado.jobs.get('j1'));
  check('si el proveedor contesta que terminó, se resuelve por el MISMO camino que un webhook', r.respuesta === 'conocido' && r.desenlace === 'aplicado' && estado.jobs.get('j1').state === 'completed');

  /* N · unknown reconciliation · L · provider unavailable. */
  for (const motivo of ['no_contesta', 'no_la_conoce', 'no_configurado', 'ilegible']) {
    const { deps: d, estado: e } = mundo();
    const v = await reconciliarUno({ ...d, resolutores: { seedance: resolutorFalso({ conocido: false, motivo }) }, plazos: P }, e.jobs.get('j1'));
    check(`«${motivo}» deja el trabajo EXACTAMENTE como estaba: ni se cierra, ni se marca, ni se devuelve nada`,
      v.respuesta === motivo && e.jobs.get('j1').state === 'waiting' && e.escrituras === 0 && e.descargas === 0);
  }
  {
    const { deps: d, estado: e } = mundo();
    const v = await reconciliarUno({ ...d, resolutores: {}, plazos: P }, e.jobs.get('j1'));
    check('y sin nadie que sepa hablar con ese proveedor tampoco pasa nada malo', v.respuesta === 'no_configurado' && e.jobs.get('j1').state === 'waiting');
  }

  /* La pasada entera, acotada. */
  const { deps: d3, estado: e3 } = mundo();
  const informe = await reconciliarTrabajos({ ...d3, resolutores: { seedance: resolutorFalso({ conocido: false, motivo: 'no_contesta' }) }, plazos: P, quietoDesdeMs: 0 });
  check('la pasada cuenta lo que hizo sin inventarse nada', informe.mirados === 1 && informe.preguntados === 1 && informe.sinRespuesta === 1 && informe.resueltos === 0 && e3.escrituras === 0);
  check('y no es un bucle: entra, mira lo que le dejan y sale', !/while \(true\)/.test(sinComentarios(leer('functions/src/runtime/reconciliador.ts'))));

  /* El tope de preguntas: lo que impide que una pasada se coma su propio plazo. */
  const muchos = Array.from({ length: 9 }, (_, i) => trabajo({ jobId: `j${i}`, attempts: [intento({ attemptId: `j${i}#1`, providerRef: { providerId: 'seedance', operationId: `cgt-${i}` } })] }));
  const { deps: d4, estado: e4 } = mundo({ jobs: muchos });
  let preguntas = 0;
  const lento = { consultar: async () => { preguntas++; return { conocido: false, motivo: 'no_contesta' }; } };
  const acotado = await reconciliarTrabajos({ ...d4, resolutores: { seedance: lento }, plazos: P, quietoDesdeMs: 0, maxPreguntas: 3 });
  check('con nueve trabajos que preguntar y un tope de tres, se hacen TRES llamadas y ni una más', preguntas === 3 && acotado.preguntados === 3);
  check('y la pasada lo DICE en vez de fingir que terminó', acotado.agotadas === true);
  check('los que no se preguntaron no se cuentan como mirados: la siguiente pasada tiene que verlos igual', acotado.mirados === 3);
  check('nada se cerró ni se movió por haberse quedado sin preguntas', e4.escrituras === 0 && [...e4.jobs.values()].every((j) => j.state === 'waiting'));
  const sinTope = await reconciliarTrabajos({ ...mundo({ jobs: muchos }).deps, resolutores: { seedance: { consultar: async () => ({ conocido: false, motivo: 'no_contesta' }) } }, plazos: P, quietoDesdeMs: 0 });
  check('sin llegar al tope, la pasada no dice que se agotara', sinTope.agotadas === false && sinTope.preguntados === 9);
}

/* ── La pasada de mantenimiento: preguntar, y DESPUÉS liquidar ────────────── */
{
  const orden = [];
  const pasada = mantenimientoDeWee({
    reconciliacion: async () => { orden.push('preguntar'); return { mirados: 1, preguntados: 1, resueltos: 1, enMarcha: 0, sinRespuesta: 0, rendidos: 0, aplazados: 0, omitidos: 0, agotadas: false, vistos: [] }; },
    liquidacion: async () => { orden.push('liquidar'); return { sweepId: 's1', startedAt: 0, finishedAt: 1, durationMs: 1, examined: 1, settled: 1, refunded: 0, skipped: 0, unknown: 0, errors: 0, pending: false }; },
  });
  const r = await pasada();
  check('primero se pregunta y DESPUÉS se liquida: al revés, el dinero de un vídeo hecho tardaría una pasada de más', orden.join('→') === 'preguntar→liquidar');

  /* Y lo que se LEE va en el mismo orden que lo que pasó, o los registros mienten. */
  const registro = [];
  await mantenimientoDeWee({
    reconciliacion: async () => ({ mirados: 0, preguntados: 0, resueltos: 0, enMarcha: 0, sinRespuesta: 0, rendidos: 0, aplazados: 0, omitidos: 0, agotadas: false, vistos: [] }),
    liquidacion: async () => { registro.push('anota-liquidacion'); return { sweepId: 's3', startedAt: 0, finishedAt: 1, durationMs: 1, examined: 0, settled: 0, refunded: 0, skipped: 0, unknown: 0, errors: 0, pending: false }; },
    anotarPregunta: () => registro.push('anota-pregunta'),
  })();
  check('la reconciliación se anota ANTES de liquidar: si no, los registros dirían que se liquidó primero', registro.join('→') === 'anota-pregunta→anota-liquidacion');
  check('y la pasada devuelve las dos cosas', r.reconciliacion.resueltos === 1 && r.liquidacion.settled === 1 && r.falloAlPreguntar === false);

  /* Un proveedor caído no puede impedir que se cobre lo que ya estaba resuelto. */
  const orden2 = [];
  const conFallo = mantenimientoDeWee({
    reconciliacion: async () => { orden2.push('preguntar'); throw new Error('el proveedor no está'); },
    liquidacion: async () => { orden2.push('liquidar'); return { sweepId: 's2', startedAt: 0, finishedAt: 1, durationMs: 1, examined: 3, settled: 2, refunded: 0, skipped: 1, unknown: 0, errors: 0, pending: false }; },
  });
  const r2 = await conFallo();
  check('si preguntar revienta, se liquida igual: lo ya resuelto no espera a que vuelva un proveedor', orden2.join('→') === 'preguntar→liquidar' && r2.liquidacion.settled === 2);
  check('y se dice que no se pudo preguntar, en vez de contarlo como que no había nada', r2.falloAlPreguntar === true && r2.reconciliacion === undefined);
}

/* ═══ I · EL DINERO ════════════════════════════════════════════════════════ */
console.log('\n── I · Qué se cobra, qué se devuelve y qué NO ──');
{
  /* O · accepted settlement: aceptada no es incertidumbre. */
  const aceptada = trabajo({ state: 'waiting', attempts: [intento({ outcome: 'unknown', endedAt: T0 + 1, providerRef: { providerId: 'seedance', operationId: 'cgt-1' } })] });
  const d = decidirLiquidacion(aceptada, T0 + 10_000);
  check('una tarea ACEPTADA por el proveedor se espera: hay a quién preguntarle', d.tipo === 'esperar' && d.motivo === 'aceptada_por_el_proveedor');

  /* R · no refund on unknown: sin nombre, no se sabe. */
  const aCiegas = trabajo({ state: 'failed', attempts: [intento({ outcome: 'unknown', endedAt: T0 + 1, providerRef: null })] });
  check('una que salió y volvió sin nombre NO se reembolsa: se reconcilia', decidirLiquidacion(aCiegas, T0 + 10_000).tipo === 'reconciliar');

  /* P · success settlement. */
  const buena = trabajo({ state: 'completed', attempts: [intento({ outcome: 'succeeded', endedAt: T0 + 1 })] });
  const dp = decidirLiquidacion(buena, T0 + 10_000);
  check('una que terminó bien se cobra por lo que se cotizó, ni un Credit más', dp.tipo === 'liquidar' && dp.importe === 12);

  /* Q · failure refund. */
  const mala = trabajo({ state: 'failed', attempts: [intento({ outcome: 'failed', endedAt: T0 + 1 })] });
  const dq = decidirLiquidacion(mala, T0 + 10_000);
  check('una que falló de verdad se devuelve', dq.tipo === 'reembolsar' && dq.motivo === 'fallo_definitivo');
  check('y una que nunca salió, también —no hay nada que pagar—', decidirLiquidacion(trabajo({ state: 'failed', attempts: [intento({ dispatched: false, outcome: 'failed', endedAt: T0 + 1 })] }), T0 + 10_000).motivo === 'no_salio');

  /* La regla crítica: un trabajo vivo nunca se reembolsa por un plazo local. */
  const vivo = trabajo({ state: 'running', attempts: [intento({ lease: { owner: 'w1', until: T0 + 60_000 } })] });
  check('UN TRABAJO VIVO NO SE REEMBOLSA, dure lo que dure', decidirLiquidacion(vivo, T0 + 10_000).tipo === 'esperar');
  check('ni uno que el motor todavía puede mover', decidirLiquidacion(trabajo({ state: 'queued', attempts: [] }), T0 + 10_000).tipo === 'esperar');
  check('Brain no cambia: su liquidación sigue siendo la del canary, dentro de la llamada', /reembolsoSeguro/.test(leer('functions/src/creator/brain.ts')));
}

/* ═══ J · AISLAMIENTO Y SEGURIDAD ══════════════════════════════════════════ */
console.log('\n── J · De quién es cada cosa ──');
{
  const j = trabajo({ userId: ANA });
  const ATN = sinComentarios(leer('functions/src/runtime/atencion.ts'));
  check('la cuenta sale del TRABAJO guardado, nunca del aviso', /userId: job\.owner\.userId/.test(ATN));
  check('el aviso no trae cuenta, ni trabajo, ni intento, y no se le leen', !/aviso\.(userId|accountId|jobId|attemptId)/.test(ATN));
  const prov = procedenciaDe(j, leerAvisoDeSeedance({ ...seedanceFalso('succeeded'), userId: BEA, accountId: BEA, jobId: 'jOtro' }), T0);
  check('y si el mensaje intentara traerla, no se usa', !JSON.stringify(prov).includes(BEA) && prov.jobId === 'j1');

  const WH = sinComentarios(leer('functions/src/engine/webhooks.ts'));
  { const cuerpo = sinImportes(leer('functions/src/engine/webhooks.ts')); check('el receptor acota el cuerpo ANTES de mirarlo', cuerpo.indexOf('MAX_CUERPO_DE_AVISO') < cuerpo.indexOf('leerAvisoDeSeedance')); }
  check('compara el testigo en tiempo constante: `!==` deja adivinarlo carácter a carácter', /timingSafeEqual/.test(WH));
  check('y no se inventa una firma que el proveedor no publica: se deja el hueco, y se dice', /comprobarFirma/.test(WH));
  check('el proveedor lo fija la RUTA, no el cuerpo: nadie elige desde fuera qué adaptador lo lee', !/body\.provider|cuerpo\.provider/.test(WH));
  check('contesta lo mismo exista el trabajo o no: este puerto no es un buscador de cuentas ajenas', (WH.match(/status\(202\)/g) || []).length === 1 && !/status\(404\)/.test(WH));
  check('no registra el cuerpo, ni el enlace, ni el testigo', !/console\.(log|warn|error)\([^)]*(cuerpo|body|recurso|token)/.test(WH));
  check('NO ESTÁ DESPLEGADO: `index.ts` no lo exporta —nombrarlo al explicarlo no es exportarlo—', !/avisoDeProveedor/.test(sinComentarios(leer('functions/src/index.ts'))));

  check('el testigo se compara bien', mismoTestigo('abc', 'abc') === true);
  check('y mal cuando toca: distinto, vacío, ausente o de otra longitud',
    [['abd', 'abc'], ['ab', 'abc'], ['', 'abc'], [undefined, 'abc'], [123, 'abc'], ['abc', ''], ['abc', undefined]].every(([r, e]) => mismoTestigo(r, e) === false));

  const MAT = sinComentarios(leer('functions/src/content/materializador.ts'));
  check('un material que existe pero es de otra cuenta no se devuelve: un identificador no da acceso a nada', /ownerAccountId !== peticion\.userId/.test(MAT));
  check('el tamaño de lo que se trae está acotado', /MAX_BYTES_DE_RESULTADO/.test(MAT));
}

/* ═══ K · ESTRUCTURA ═══════════════════════════════════════════════════════ */
console.log('\n── K · Qué se añadió, qué NO se tocó y qué sigue sin conectar ──');
{
  const puros = ['aviso.ts', 'proveedor.ts', 'plazos.ts', 'reconciliacion.ts', 'materializacion.ts', 'atencion.ts', 'reconciliador.ts'];
  for (const f of puros) {
    const src = sinComentarios(leer(`functions/src/runtime/${f}`));
    check(`${f}: no sabe de Firestore, ni de red, ni de HTTP`, !/firebase-admin|getFirestore|fetch\(|onRequest|onSchedule/.test(src));
    check(`${f}: no lee el reloj ni tira dados`, !/Date\.now\(\)|Math\.random\(\)|randomUUID/.test(src));
  }
  check('y NINGUNO nombra a un proveedor concreto: la traducción es del adaptador', puros.every((f) => !/seedance|modelark|byteplus|flux|gemini/i.test(sinComentarios(leer(`functions/src/runtime/${f}`)))));
  check('nada de esto guarda estado entre pasadas', puros.every((f) => !/^(let|var) /m.test(sinComentarios(leer(`functions/src/runtime/${f}`)))));

  /* Lo que NO se tocó. */
  check('el Financial Core no se tocó', !/git/.test('') && !/credits/.test(sinComentarios(leer('functions/src/runtime/atencion.ts'))));
  check('no hay un segundo motor de trabajos: el aviso lo aplica el de siempre', /motor\.recibirEvento/.test(sinComentarios(leer('functions/src/runtime/atencion.ts'))));
  check('no hay un segundo sistema de materiales: se usa el de la Fase 11', /crearMaterialDesdeUrl/.test(sinComentarios(leer('functions/src/content/materializador.ts'))));
  check('ni una colección nueva de Media Cloud', !['mediaProviders', 'mediaObjects', 'mediaOperations', 'mediaUsage'].some((c) => fs.readdirSync(path.resolve(RAIZ, 'functions/src/runtime')).some((f) => leer(`functions/src/runtime/${f}`).includes(c))));
  check('el cliente no puede leer trabajos', !/match \/jobs\//.test(leer('firestore.rules')) || /allow read: if false/.test(leer('firestore.rules')));

  /*
   * ESTO CAMBIÓ CON EL PASO I. El reconciliador YA está programado: es la red
   * de seguridad del dinero y se pone antes de saltar, no después. Lo que
   * sigue sin conectar es todo lo demás.
   */
  const PROG = sinComentarios(leer('functions/src/settlement/programado.ts'));
  const INDEX = sinComentarios(leer('functions/src/index.ts'));
  check('el reconciliador SÍ está programado, y por la pasada del runtime, no por una suya', /mantenimientoDeWee/.test(PROG));
  check('la tarea está desplegada', /export \{ barridoDeLiquidacion \} from '\.\/settlement\/programado'/.test(INDEX));
  check('cada cinco minutos', /every \$\{minutosDelBarrido\(\)\} minutes/.test(PROG) && /SETTLEMENT_SWEEP_MINUTES/.test(PROG));
  check('el programador dispara y NO decide: ni orden, ni cobros, ni reembolsos, ni desenlaces',
    !/decidirLiquidacion|decidirReconciliacion|completeCredits|refundCredits|atenderAviso|consultar\(/.test(PROG));
  check('el ORDEN —preguntar y después liquidar— vive en el runtime, que es donde es correctitud',
    /const liquidacion = await liquidar\(\)/.test(sinComentarios(leer('functions/src/runtime/index.ts'))));
  check('y declara SOLO la clave que hace falta para preguntar, no las ocho', /secrets: RECONCILIATION_SECRETS/.test(PROG) && /RECONCILIATION_SECRETS = \[SECRETS\.ARK_API_KEY\]/.test(sinComentarios(leer('functions/src/secrets.ts'))));
  check('con memoria para traerse un resultado, que es lo que puede acabar haciendo', /memory: '1GiB'/.test(PROG));
  /*
   * M-1 encendió la aceptación asíncrona en UN sitio y solo uno. Lo que se fija
   * ya no es «nadie la enciende» —sería mentira— sino que quien la enciende es
   * la puerta del canary de vídeo, y que por defecto sigue apagada.
   */
  const VIDEO = sinComentarios(leer('functions/src/creator/video.ts'));
  const RT = sinComentarios(leer('functions/src/runtime/index.ts'));
  check('la aceptación asíncrona sigue siendo opt-in: el conductor solo la pide si se la piden', /\.\.\.\(deps\.aceptaAsincrono \? \{ aceptaAsincrono: true \} : \{\}\)/.test(RT));
  check('y la enciende EXACTAMENTE un módulo vivo: la puerta del canary de vídeo',
    fuentesVivas().filter((f) => /aceptaAsincrono: true/.test(sinComentarios(leer(f)))).join(',') === 'functions/src/creator/video.ts');
  check('detrás de la puerta, nunca antes: si la puerta dice legacy, no se enciende nada', VIDEO.indexOf('decidirRuntime') < VIDEO.indexOf('aceptaAsincrono: true'));
  check('el canary de texto de Brain no cambió: su candado sigue siendo `text.generate`', /CAPACIDAD_DEL_CANARY: CapabilityId = 'text\.generate'/.test(leer('functions/src/creator/brain.ts')));
  check('el camino de siempre sigue entero: el sondeo y `videoEngine` siguen ahí para quien no pase por la puerta',
    /pollUntil/.test(leer('functions/src/engine/providers/seedance.ts')) && /videoEngine\.generate\(/.test(VIDEO));
  /* El dinero: en marcha NO se cobra y NO se devuelve. Es la regla que protege una tarea viva. */
  check('con el vídeo en marcha no se cobra ni se devuelve: lo cierra la liquidación',
    /estado === 'en_marcha'/.test(VIDEO) && !/en_marcha'[\s\S]{0,400}(completeCredits|refundCredits)/.test(VIDEO));
  check('y la reserva viaja DENTRO del trabajo, que es lo que la liquidación sabrá leer', /creditRequestId: requestId/.test(VIDEO) && /creditTransactionId: usageTransactionId\(requestId\)/.test(VIDEO));

  check('esta suite está en la cadena de `npm test`', /runtime-asincrono\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
