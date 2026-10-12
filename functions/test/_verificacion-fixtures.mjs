/*
 * A6 · LA COSTURA, COMO FIXTURE (R7 · M-02).
 *
 * Esto NO es código de producción y no se propone como tal: vive en `functions/test` a propósito. A6 (verificación y
 * recuperación) existe, está probado y no está conectado a nada; lo que falta es lo que lo conectaría —traducir un
 * trabajo del Job Engine a lo que A6 entiende, y decidir qué se hace con lo que A6 propone—. Aquí se escribe esa
 * costura UNA vez, de referencia, para poder ejercitar A6 contra trabajos de forma real SIN tocar `functions/src`.
 *
 *   · Trabajos REALES: los construye el Job Engine de verdad (`crearJobEngine`), no objetos a mano. Un `Job` que
 *     el motor no produciría no prueba nada sobre la costura.
 *   · `traducir`: Job → { peticion, contexto } con LISTA BLANCA de claves. Omite lo que A6 no debe ver (no terminal,
 *     cancelado, duplicado, sintético, desenlace desconocido, sin expectativas): es la política que los silencios
 *     de la auditoría C (R6 §3) piden y que A6 no puede tomar solo.
 *   · `EJECUCION` y `puertaDeEjecucion`: qué efecto tiene cada recuperación que A6 propone y quién puede hacerla.
 *     Nada con efecto distinto de «ninguno» es automático.
 *   · El oráculo del dinero NO se reimplementa: se usa `decidirLiquidacion` de `runtime/liquidacion`, el mismo que
 *     usa el barrido desplegado.
 *
 * Todo es síncrono, sin red, sin reloj del sistema y sin azar: lo mismo con la misma entrada, siempre.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const aqui = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ = path.resolve(aqui, '../../');
export const lib = (p) => require_(path.resolve(aqui, '../lib/' + p));
export const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
export const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

export const A = lib('core/algorithm/index.js');
export const CORE = lib('core/index.js');
export const { ALGORITHM_CONTRACT_VERSION } = lib('core/contracts.js');
export const { decidirLiquidacion, reservaDe } = lib('runtime/liquidacion.js');
export const { tipoDeMaterialDe } = lib('runtime/materializacion.js');

/* ── Utilidades deterministas ─────────────────────────────────────────────── */

/** Un generador con semilla: el mismo barajado siempre. Nada de `Math.random`. */
export const mulberry32 = (semilla) => {
  let a = semilla | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
export const barajar = (arr, semilla) => {
  const r = mulberry32(semilla);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
/** Baraja TODOS los arrays de un valor, sea cual sea su profundidad. Las claves de un objeto no se tocan. */
export const barajarProfundo = (v, semilla) => {
  let contador = 0;
  const ir = (x) => {
    if (Array.isArray(x)) return barajar(x.map(ir), semilla + (contador++));
    if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, y]) => [k, ir(y)]));
    return x;
  };
  return ir(v);
};
/** JSON con las claves ordenadas: dos valores iguales dan el mismo texto, estén como estén sus claves. */
export const canon = (v) => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]]))
  : x));
export const clonar = (v) => JSON.parse(JSON.stringify(v));
export const congelarProfundo = (v) => {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const x of Object.values(v)) congelarProfundo(x);
  }
  return v;
};
export const hashDe = (texto) => {
  /* FNV-1a de 32 bits: no es criptografía, solo una huella corta para comparar y para el informe. */
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
};

/* ── El catálogo y la capacidad inventada ─────────────────────────────────── */

/** Construida en ejecución: ni siquiera aparece entera en el código. */
export const CAPACIDAD_INVENTADA = ['future', 'synthetic', 'capability'].join('.');
export const KIND_INVENTADO = ['novel', 'mesh'].join('.');
export const idsDelCatalogo = () => CORE.CAPABILITY_CATALOG.map((e) => e.id).sort();
/** La MODALIDAD que declara el catálogo para lo que produce una capacidad (`Modality`), no la clase de material. */
export const modalidadQueProduce = (cap) => CORE.CAPABILITY_CATALOG.find((e) => e.id === cap)?.produces;

/* ── Los motores de A6 ────────────────────────────────────────────────────── */

export const crearMotores = (opciones = {}) => ({
  a6: A.crearMotorDeVerificacion(opciones),
  rec: A.crearMotorDeRecuperacion(),
});
export const kindsDe = (analisis) => analisis.proposals.map((p) => p.kind);
export const comoEvidencia = (senales) => senales.map((s) => ({ claim: s.key, signal: s, supports: true }));

/* ── Trabajos REALES, producidos por el Job Engine de verdad ──────────────── */

export const T0 = 1_700_000_000_000;
export const QUIEN = { userId: 'user-0001' };
const motor = CORE.crearJobEngine();
const aplicar = (d) => {
  if (d.status !== 'transition') throw new Error(`el Job Engine no dio una transición: ${d.status} ${d.refusal ?? ''} ${JSON.stringify(d.error ?? {})}`);
  return d.transition.job;
};
/** Lo que el trabajo guarda sobre su dinero: la reserva con la que se cotizó. Lo lee `decidirLiquidacion`. */
export const reservaDeLaPrueba = (nombre) => ({
  creditRequestId: `cr-${nombre}`, creditTransactionId: `tx-${nombre}`, creditsEstimated: 5, service: 'ai_image',
});
const peticion = (nombre, extra = {}) => ({
  contract: '1.0', principal: QUIEN, at: T0, capability: 'image.generate',
  implementation: { providerId: 'prov-a', modelId: 'prov-a.uno' }, input: { prompt: 'un gato con sombrero' },
  trace: { traceId: `trace-${nombre}`, requestId: `req-${nombre}`, userId: QUIEN.userId },
  metadata: reservaDeLaPrueba(nombre), ...extra,
});
export const nuevoTrabajo = (nombre, extra = {}) => aplicar(motor.crear(peticion(nombre, extra)));
const idDeIntento = (job) => job.attempts[job.attempts.length - 1].attemptId;
export const reclamar = (job, at, worker = 'w1') => aplicar(motor.reclamar(job, { principal: QUIEN, at, worker }));
export const marcarEnvio = (job, at, providerRef) => aplicar(motor.marcarEnvio(job, {
  principal: QUIEN, at, worker: 'w1', attemptId: idDeIntento(job), ...(providerRef ? { providerRef } : {}),
}));
export const informar = (job, at, informe) => motor.informar(job, { principal: QUIEN, at, report: { attemptId: idDeIntento(job), ...informe } });
export const cancelar = (job, at) => motor.cancelar(job, QUIEN, at);
export const evaluar = (job, at) => motor.evaluar(job, at);
export const recibirEvento = (job, evento, at) => motor.recibirEvento(job, { jobId: job.jobId, attemptId: idDeIntento(job), at, ...evento }, at);
export const falloDelCore = (code, details) => CORE.errorDelCore(code, 'adapter:prov-a', details ? { details } : {});
export const unaVez = { policy: { retry: { maxAttempts: 1 } } };

/** Un intento que sale hacia el proveedor y acaba como se dice. Devuelve la decisión entera: quien llama la aplica. */
const intentoCompleto = (job, at, informe) => {
  const reclamado = reclamar(job, at);
  const enviado = marcarEnvio(reclamado, at + 1);
  return informar(enviado, at + 2, { dispatched: true, ...informe });
};

export const AHORA = T0 + 1_000;

/**
 * LOS TRABAJOS DE FORMA REAL. Cada uno está en un estado al que el Job Engine llega de verdad: ninguno se escribió a mano
 * (salvo `fallo_sin_error`, que parte de uno real y le quita el error: es el caso que el motor no produce pero un
 * histórico dañado sí). `at` es el «ahora» con el que se les pregunta qué hacer con su dinero.
 */
export const construirTrabajos = () => {
  const t = {};
  const completado = (nombre, capability, refs, extra = {}) => {
    const d = intentoCompleto(nuevoTrabajo(nombre, { capability, ...extra }), T0 + 1, { outcome: 'succeeded', result: { outputRefs: refs } });
    return aplicar(d);
  };
  t.texto_ok = completado('texto_ok', 'text.generate', ['asset:texto_ok:1']);
  t.imagen_dos_ok = completado('imagen_dos_ok', 'image.generate', ['asset:imagen_dos_ok:2', 'asset:imagen_dos_ok:1']);
  t.voz_ok = completado('voz_ok', 'voice.tts', ['asset:voz_ok:1']);
  t.documento_ok = completado('documento_ok', 'document.generate', ['asset:documento_ok:1']);
  t.mundo_ok = completado('mundo_ok', 'world.generate', ['asset:mundo_ok:1']);
  t.completado_vacio = completado('completado_vacio', 'image.generate', []);

  /* Un vídeo: el proveedor lo acepta, el trabajo espera, y un aviso lo termina. */
  {
    const ref = { providerId: 'prov-a', operationId: 'op-video' };
    let j = marcarEnvio(reclamar(nuevoTrabajo('video_asincrono_ok', { capability: 'video.generate' }), T0 + 1), T0 + 2, ref);
    j = aplicar(informar(j, T0 + 3, { outcome: 'unknown', dispatched: true, providerRef: ref }));
    t.esperando_aceptada = j;
    t.video_asincrono_ok = aplicar(recibirEvento(j, { eventId: 'ev-1', kind: 'succeeded', providerRef: ref, outputRefs: ['asset:video_asincrono_ok:1'] }, T0 + 60));
  }

  /* El proveedor falla tres veces seguidas, con un error que sí se reintenta. */
  {
    let j = nuevoTrabajo('proveedor_agotado');
    let at = T0 + 1;
    for (let i = 1; i <= 3; i++) {
      const d = intentoCompleto(j, at, { outcome: 'failed', error: falloDelCore('PROVIDER_ERROR', { reason: 'provider_error', providerRetryable: true }) });
      j = aplicar(d);
      at = (d.retryAt ?? at + 10) + 1;
    }
    t.proveedor_agotado = j;
  }
  /* Un bloqueo de seguridad del proveedor, tal como lo cuenta el adaptador: PROVIDER_ERROR con `providerRetryable: false`. */
  const bloqueo = () => falloDelCore('PROVIDER_ERROR', { reason: 'provider_error', providerRetryable: false });
  t.bloqueo_de_seguridad = aplicar(intentoCompleto(nuevoTrabajo('bloqueo_de_seguridad', unaVez), T0 + 1, { outcome: 'failed', error: bloqueo() }));
  /* El mismo bloqueo con los intentos de siempre: el motor lo REINTENTA, que es lo que se quiere demostrar. */
  t.bloqueo_reintentado = aplicar(intentoCompleto(nuevoTrabajo('bloqueo_reintentado'), T0 + 1, { outcome: 'failed', error: bloqueo() }));

  /* Un fallo del proveedor que SÍ admite otro intento, con una sola oportunidad: el otro lado de la moneda del bloqueo. */
  t.proveedor_una_vez = aplicar(intentoCompleto(nuevoTrabajo('proveedor_una_vez', unaVez), T0 + 1, {
    outcome: 'failed', error: falloDelCore('PROVIDER_ERROR', { reason: 'provider_error', providerRetryable: true }),
  }));
  t.politica_de_contenido = aplicar(intentoCompleto(nuevoTrabajo('politica_de_contenido'), T0 + 1, { outcome: 'failed', error: falloDelCore('CONTENT_POLICY') }));
  t.sin_creditos = aplicar(intentoCompleto(nuevoTrabajo('sin_creditos'), T0 + 1, { outcome: 'failed', error: falloDelCore('INSUFFICIENT_CREDITS') }));
  t.timeout_conocido = aplicar(intentoCompleto(nuevoTrabajo('timeout_conocido', unaVez), T0 + 1, { outcome: 'timed_out', error: falloDelCore('TIMEOUT', { reason: 'timeout', scope: 'execution' }) }));

  /* El plazo se acaba con un intento que salió y del que no volvió nadie. */
  {
    const j = marcarEnvio(reclamar(nuevoTrabajo('plazo_sin_saber', { capability: 'video.generate' }), T0 + 1), T0 + 2);
    t.plazo_sin_saber = aplicar(evaluar(j, j.deadlineAt + 1));
  }

  /* Alguien manda parar con el intento en el aire; el fallo posterior NO se reintenta. */
  {
    const j = marcarEnvio(reclamar(nuevoTrabajo('cancelado_en_marcha', { capability: 'video.generate' }), T0 + 1), T0 + 2);
    const pidio = aplicar(cancelar(j, T0 + 3));
    t.cancel_pedido = pidio;
    t.cancelado_en_marcha = aplicar(informar(pidio, T0 + 4, { outcome: 'failed', dispatched: true, error: falloDelCore('PROVIDER_ERROR') }));
  }
  t.cancelado_en_cola = aplicar(cancelar(nuevoTrabajo('cancelado_en_cola'), T0 + 3));

  /*
   * El duplicado y quien de verdad trabaja COMPARTEN reserva: es una sola petición de la persona, hecha dos veces. En el
   * primer par la primera invocación sigue en marcha; en el segundo ya entregó la respuesta. Un duplicado no tiene
   * reserva propia, y «abortar con reembolso» desharía la de la otra invocación.
   */
  {
    const falloDuplicado = (nombre, reserva) => aplicar(informar(reclamar(nuevoTrabajo(nombre, { metadata: reserva }), T0 + 1), T0 + 2,
      { outcome: 'failed', dispatched: false, error: CORE.errorDelCore('DUPLICATE_REQUEST', 'runtime') }));
    const enMarcha = reservaDeLaPrueba('reserva-compartida');
    t.primera_invocacion = reclamar(nuevoTrabajo('primera_invocacion', { metadata: enMarcha }), T0 + 1);
    t.duplicado = falloDuplicado('duplicado', enMarcha);
    const entregada = reservaDeLaPrueba('reserva-ya-entregada');
    t.primera_entregada = completado('primera_entregada', 'text.generate', ['asset:primera_entregada:1'], { metadata: entregada });
    t.duplicado_tardio = falloDuplicado('duplicado_tardio', entregada);
  }

  t.en_cola = nuevoTrabajo('en_cola');
  t.zombi = reclamar(nuevoTrabajo('zombi'), T0 + 1);
  /* Un histórico dañado: terminó mal y nadie guardó por qué. El motor no lo produce; un documento viejo sí. */
  t.fallo_sin_error = { ...t.politica_de_contenido, error: undefined, attempts: t.politica_de_contenido.attempts.map((a) => ({ ...a, error: undefined })) };
  return Object.freeze(t);
};

/** El «ahora» con el que se le pregunta a `decidirLiquidacion` por cada trabajo: la concesión del zombi ya caducó. */
export const ahoraDe = (nombre) => (nombre === 'zombi' ? T0 + 1_000_000 : AHORA);

/* ── La LISTA BLANCA: lo único que cruza la costura ───────────────────────── */

/**
 * Deny-by-default. `violacionesEn` (la frontera de A6) rechaza `provider`, `model`, `adapter`, `implementation`,
 * `providerId`, `modelId`, `adapterId`, `implementationRef`, `allowedProviders` y `excludeProviders` en CUALQUIER
 * parte del resultado, pero tiene topes (profundidad 8, 4 095 claves) y mira claves, no valores: no basta con ella.
 * Aquí se deja pasar solo lo escrito.
 */
export const CLAVES_BLANCAS = Object.freeze({
  peticion: ['expected', 'actual', 'evidence', 'constraints'],
  expectativa: ['kind', 'required', 'count', 'requiredFields', 'quality'],
  actual: ['id', 'status', 'outputs', 'error', 'metadata'],
  salida: ['kind', 'ref'],
  error: ['code'],
  metadataDelResultado: ['jobRevision', 'attemptCount', 'dispatched', 'hasProviderRef'],
  contexto: ['alternatives', 'hasFallback', 'metadata', 'previous', 'retry'],
  metadataDelContexto: ['errorCode', 'providerRetryable'],
  previo: ['kind', 'failureClass', 'succeeded'],
  retry: ['maxAttempts'],
  evidencia: ['claim', 'signal', 'supports'],
  senal: ['key', 'subject', 'value', 'source', 'sampleSize', 'at', 'confidence'],
  restricciones: ['maxLatencyMs', 'budget', 'quality'],
  calidad: ['minScore', 'checks', 'onBelow'],
  presupuesto: ['maxUsd'],
  calidadDeRestriccion: ['minScore'],
});
const soloClaves = (obj, claves) => Object.fromEntries(Object.entries(obj ?? {}).filter(([k, v]) => claves.includes(k) && v !== undefined));
/* La lista blanca llega hasta el fondo: `quality` y `budget` son objetos, y lo que lleven dentro también se filtra. */
const limpiarExpectativa = (e) => {
  const x = soloClaves(e, CLAVES_BLANCAS.expectativa);
  if (x.quality !== undefined) x.quality = x.quality && typeof x.quality === 'object' ? soloClaves(x.quality, CLAVES_BLANCAS.calidad) : undefined;
  if (Array.isArray(x.requiredFields)) x.requiredFields = x.requiredFields.filter((s) => typeof s === 'string');
  return Object.fromEntries(Object.entries(x).filter(([, v]) => v !== undefined));
};
const limpiarRestricciones = (c) => {
  const x = soloClaves(c, CLAVES_BLANCAS.restricciones);
  if (x.budget !== undefined) x.budget = x.budget && typeof x.budget === 'object' ? soloClaves(x.budget, CLAVES_BLANCAS.presupuesto) : undefined;
  if (x.quality !== undefined) x.quality = x.quality && typeof x.quality === 'object' ? soloClaves(x.quality, CLAVES_BLANCAS.calidadDeRestriccion) : undefined;
  return Object.fromEntries(Object.entries(x).filter(([, v]) => v !== undefined));
};
export const clavesDe = (v, salida = new Set()) => {
  if (Array.isArray(v)) { for (const x of v) clavesDe(x, salida); } else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) { salida.add(k); clavesDe(x, salida); }
  }
  return salida;
};
const porTexto = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/* ── El traductor de referencia ───────────────────────────────────────────── */

export const OMISIONES = Object.freeze(['no_terminal', 'cancelado', 'duplicado', 'sintetico', 'desenlace_desconocido', 'sin_expectativas']);

const claseDelIntento = (intento) => A.claseDeFallo(intento?.error?.code ? { code: intento.error.code } : undefined);

/**
 * JOB → LO QUE A6 ENTIENDE, o POR QUÉ NO SE LE PREGUNTA.
 *
 * `opciones`: `expected` (las expectativas; el `kind` que falte sale del catálogo), `esperarLoDeLaCapacidad` (la
 * expectativa mínima: lo que la capacidad produce, según el catálogo), `kindDeSalida` (obligatorio para una capacidad
 * que no está en el catálogo), `hasFallback`, `alternatives`, `sintetico`, `medidas`, `constraints` y `forzar`
 * (solo para DEMOSTRAR qué diría A6 si alguien se saltara las omisiones: nunca es una política).
 *
 * Reglas, cada una con su porqué:
 *   · terminal o nada: A6 verifica lo que SALIÓ, y de un trabajo en marcha no ha salido nada.
 *   · cancelado: lo mandó parar alguien. No es un fallo recuperable, y A6 lo trata como `fail` y propone `replan`.
 *   · duplicado: la persona ya tiene la respuesta (o la tiene otra invocación). `abort` es «con reembolso».
 *   · sintético: una muestra no es un resultado.
 *   · desenlace desconocido: salió y no se sabe cómo acabó. Eso se RECONCILIA por `providerRef`; A6 no ve nada de eso.
 *   · sin expectativas: verificar contra nada siempre sale bien, y ese aprobado no vale.
 *   · `kind` de las salidas y de las expectativas, de UNA fuente: `tipoDeMaterialDe`. `Modality` y `AssetKind` no coinciden.
 *   · `maxAttempts` de A6 = intentos TOTALES del trabajo − 1: A6 habla de REINTENTOS y el Job Engine de intentos.
 *   · `previous` = los reintentos que el Job Engine ya hizo (todos los intentos menos el primero).
 */
export const traducir = (job, opciones = {}) => {
  const forzar = opciones.forzar === true;
  const intentos = [...(job?.attempts ?? [])].sort((a, b) => a.number - b.number);
  const ultimo = intentos[intentos.length - 1];
  const codigo = job?.error?.code ?? ultimo?.error?.code;
  const kindDelCatalogo = tipoDeMaterialDe(job?.capability);

  const baseExpectativas = Array.isArray(opciones.expected) && opciones.expected.length
    ? opciones.expected
    : (opciones.esperarLoDeLaCapacidad === true ? [{}] : []);
  const kindsPedidos = [...new Set(baseExpectativas.map((e) => e?.kind).filter((k) => typeof k === 'string' && k))];
  const kindDeSalida = opciones.kindDeSalida ?? kindDelCatalogo ?? (kindsPedidos.length === 1 ? kindsPedidos[0] : undefined);
  const expected = baseExpectativas
    .map((e) => ({ ...limpiarExpectativa(e), kind: typeof e?.kind === 'string' && e.kind ? e.kind : kindDeSalida }))
    .filter((e) => typeof e.kind === 'string' && e.kind)
    .sort((a, b) => porTexto(a.kind, b.kind));

  let omision;
  if (!job || typeof job !== 'object' || typeof job.jobId !== 'string') omision = ['no_terminal', 'no es un trabajo'];
  else if (!CORE.esTrabajoTerminal(job.state)) omision = ['no_terminal', `el trabajo está «${job.state}»: de él todavía no ha salido nada`];
  else if (job.state === 'cancelled') omision = ['cancelado', 'alguien mandó parar: no es un fallo recuperable'];
  else if (codigo === 'DUPLICATE_REQUEST') omision = ['duplicado', 'es un duplicado: la respuesta es de otra invocación y su reserva también'];
  else if (opciones.sintetico === true) omision = ['sintetico', 'lo sirvió un proveedor interno: es una muestra, no un resultado'];
  else if (ultimo && ultimo.dispatched === true && (ultimo.outcome === undefined || ultimo.outcome === 'unknown')) {
    omision = ['desenlace_desconocido', 'salió hacia el proveedor y no se sabe cómo acabó: se reconcilia, no se verifica'];
  } else if (!expected.length) omision = ['sin_expectativas', 'no se dijo qué se esperaba: verificar contra nada no es aprobar'];
  if (omision && !forzar) return Object.freeze({ omitido: omision[0], porque: omision[1] });

  /* A partir de aquí solo pasa lo escrito en la lista blanca. */
  const refs = (job.result?.outputRefs ?? []).filter((r) => typeof r === 'string' && r.trim().length > 0).sort(porTexto);
  const outputs = job.state === 'completed' ? refs.map((ref) => ({ kind: kindDeSalida ?? 'sin_clase', ref })) : [];
  let status;
  let error;
  /* Como el conductor (`recoger`): sin error guardado, un plazo vencido es TIMEOUT y lo demás INTERNAL_ERROR. */
  /* Solo de lo que FALLÓ: un trabajo cancelado guarda `INVALID_REQUEST` (`cancelled_by_request`), y eso no es un fallo de la petición. */
  const codigoDeFallo = (job.state === 'failed' || job.state === 'timed_out')
    ? (codigo ?? (job.state === 'timed_out' ? 'TIMEOUT' : 'INTERNAL_ERROR'))
    : undefined;
  if (job.state === 'completed') status = 'succeeded';
  else if (job.state === 'failed' || job.state === 'timed_out') {
    status = 'failed';
    error = { code: codigoDeFallo };
  } else if (job.state === 'cancelled') status = 'cancelled';
  else status = job.state;

  const medidas = (opciones.medidas ?? []).filter((s) => s && s.subject === job.jobId)
    .map((s) => soloClaves(s, CLAVES_BLANCAS.senal))
    .sort((a, b) => porTexto(canon(a), canon(b)));
  const restricciones = opciones.constraints ? limpiarRestricciones(opciones.constraints) : undefined;
  const actual = {
    id: job.jobId, status, outputs, ...(error ? { error } : {}),
    metadata: {
      jobRevision: job.revision, attemptCount: job.attemptCount,
      dispatched: ultimo?.dispatched === true, hasProviderRef: !!ultimo?.providerRef,
    },
  };
  const peticion = {
    expected: expected.length ? expected : [{ kind: kindDeSalida ?? 'sin_clase' }],
    actual,
    ...(medidas.length ? { evidence: comoEvidencia(medidas) } : {}),
    ...(restricciones && Object.keys(restricciones).length ? { constraints: restricciones } : {}),
  };

  const detalles = job.error?.details ?? ultimo?.error?.details;
  const providerRetryable = typeof detalles?.providerRetryable === 'boolean' ? detalles.providerRetryable : undefined;
  const total = job.policy?.retry?.maxAttempts;
  const previous = intentos.slice(1).map((_a, i) => ({ kind: 'retry', failureClass: claseDelIntento(intentos[i]), succeeded: false }));
  const alternatives = [...(opciones.alternatives ?? [])].filter((x) => typeof x === 'string' && x).sort(porTexto);
  const contexto = {
    ...(alternatives.length ? { alternatives } : {}),
    ...(opciones.hasFallback === true ? { hasFallback: true } : {}),
    metadata: { ...(codigoDeFallo ? { errorCode: codigoDeFallo } : {}), ...(providerRetryable !== undefined ? { providerRetryable } : {}) },
    ...(previous.length ? { previous } : {}),
    ...(typeof total === 'number' ? { retry: { maxAttempts: Math.max(0, total - 1) } } : {}),
  };
  return congelarProfundo({
    peticion, contexto,
    atadoA: { jobId: job.jobId, jobRevision: job.revision, ...(ultimo?.attemptId ? { attemptId: ultimo.attemptId } : {}) },
    runId: `${job.jobId}:verificacion:${ultimo?.attemptId ?? 'sin-intento'}`,
    hechos: {
      ...(codigoDeFallo ? { errorCode: codigoDeFallo } : {}), ...(providerRetryable !== undefined ? { providerRetryable } : {}),
      intentosHechos: job.attemptCount, intentosTotales: total,
      ...(ultimo ? { ultimoIntento: { dispatched: ultimo.dispatched === true, ...(ultimo.outcome ? { outcome: ultimo.outcome } : {}) } } : {}),
      cancelado: job.state === 'cancelled', duplicado: codigo === 'DUPLICATE_REQUEST',
    },
    ...(omision ? { omitidoIgnorado: omision[0] } : {}),
  });
};

/** ¿Sigue valiendo este veredicto para el trabajo tal como está AHORA? A6 no puede saberlo: no ve revisión ni intento. */
export const vigente = (atadoA, jobActual) => {
  if (!atadoA || !jobActual || atadoA.jobId !== jobActual.jobId) return false;
  const ultimo = [...(jobActual.attempts ?? [])].sort((a, b) => a.number - b.number).pop();
  return atadoA.jobRevision === jobActual.revision && atadoA.attemptId === ultimo?.attemptId;
};

/** `create()` de un almacén: lo segundo con la misma identidad es un duplicado, no un fallo. */
export class RegistroDeReferencia {
  constructor() { this.vistos = new Set(); }
  registrar(runId) {
    if (this.vistos.has(runId)) return 'duplicado';
    this.vistos.add(runId);
    return 'nuevo';
  }
}

/* ── Qué efecto tiene cada recuperación, y quién puede hacerla ────────────── */

/** `Record<RecoveryKind, …>` EXHAUSTIVO: una recuperación nueva en A6 sin una fila aquí hace fallar la prueba. */
export const EJECUCION = Object.freeze({
  verify_again: Object.freeze({ efecto: 'ninguno', ejecutor: 'runtime', puerta: 'ya_existe' }),
  retry: Object.freeze({ efecto: 'mismo_gasto', ejecutor: 'Job Engine', puerta: 'ya_existe' }),
  regenerate: Object.freeze({ efecto: 'gasto_nuevo', ejecutor: 'Router', puerta: 'confirma_la_persona' }),
  fallback: Object.freeze({ efecto: 'gasto_nuevo', ejecutor: 'Router', puerta: 'confirma_la_persona' }),
  alternative_strategy: Object.freeze({ efecto: 'gasto_nuevo', ejecutor: 'Planner', puerta: 'confirma_la_persona' }),
  replan: Object.freeze({ efecto: 'gasto_nuevo', ejecutor: 'Planner', puerta: 'confirma_la_persona' }),
  partial: Object.freeze({ efecto: 'visible', ejecutor: 'persona', puerta: 'autoriza_el_dueno' }),
  reduce_scope: Object.freeze({ efecto: 'visible', ejecutor: 'persona', puerta: 'autoriza_el_dueno' }),
  abort: Object.freeze({ efecto: 'irreversible', ejecutor: 'persona', puerta: 'confirma_la_persona' }),
});
export const EFECTOS = Object.freeze(['ninguno', 'mismo_gasto', 'gasto_nuevo', 'visible', 'irreversible']);
export const PUERTAS = Object.freeze(['ya_existe', 'confirma_la_persona', 'autoriza_el_dueno']);

const motivoDeBloqueo = (kind, hechos, liquidacion) => {
  if (hechos?.duplicado) return 'duplicado: la respuesta y la reserva son de otra invocación';
  if (hechos?.cancelado) return 'cancelado: alguien mandó parar';
  if (kind === 'abort' && liquidacion && liquidacion.tipo !== 'reembolsar' && liquidacion.tipo !== 'nada') {
    return `abortar «con reembolso» contradice a decidirLiquidacion (${liquidacion.tipo})`;
  }
  if (kind === 'retry') {
    if (hechos?.providerRetryable === false) return 'el proveedor dijo que repetirlo no sirve (providerRetryable: false)';
    if (hechos?.errorCode && !CORE.esReintentable(hechos.errorCode)) return `el Job Engine no reintenta ${hechos.errorCode}`;
    if (typeof hechos?.intentosTotales === 'number' && hechos.intentosHechos >= hechos.intentosTotales) return 'no quedan intentos';
    if (hechos?.ultimoIntento && !CORE.seguroReintentar({ dispatched: hechos.ultimoIntento.dispatched, outcome: hechos.ultimoIntento.outcome })) {
      return 'salió y no se sabe cómo acabó: repetirlo puede duplicarlo';
    }
  }
  return undefined;
};

/**
 * LO QUE UN CONSUMIDOR PUEDE HACER CON LO QUE A6 PROPONE.
 * `automaticas` solo puede contener lo que no tiene efecto (`verify_again`): lo demás pasa por una puerta.
 */
export const puertaDeEjecucion = (analisis, hechos, liquidacion) => {
  const permitidas = [];
  const bloqueadas = [];
  for (const p of analisis?.proposals ?? []) {
    /* Lo que no está en la tabla no se hace: una recuperación nueva sin su fila no pasa por defecto. */
    const porque = EJECUCION[p.kind] ? motivoDeBloqueo(p.kind, hechos, liquidacion) : 'sin fila en la tabla de efectos: lo que no está escrito no se hace';
    if (porque) bloqueadas.push({ kind: p.kind, porque });
    else permitidas.push({ kind: p.kind, ...EJECUCION[p.kind], automatica: EJECUCION[p.kind]?.efecto === 'ninguno' });
  }
  return Object.freeze({
    permitidas: Object.freeze(permitidas), bloqueadas: Object.freeze(bloqueadas),
    automaticas: Object.freeze(permitidas.filter((p) => p.automatica).map((p) => p.kind)),
  });
};

/* ── Un evaluador por el puerto, precomputado, para lo que A6 no mira ─────── */

/** «No vacía»: lee el tamaño que la costura calculó de antemano (`Asset.bytes`). A6 no abre nada. */
export const evaluadorDeNoVacia = Object.freeze({
  id: 'evaluador.no_vacia',
  supports: (c) => c.type === 'content.no_vacia',
  evaluate: (c, ctx) => {
    const salidas = (ctx.resultado.outputs ?? []).filter((o) => o.kind === c.subject);
    if (!salidas.length) return undefined;
    const bytes = salidas.map((o) => o.metadata?.bytes);
    if (bytes.some((b) => typeof b !== 'number')) return { status: 'unknown', because: 'no se midió el tamaño' };
    return bytes.every((b) => b > 0) ? { status: 'pass', because: 'todas pesan algo' } : { status: 'fail', because: 'hay una salida de 0 bytes' };
  },
});

/* ── Un ciclo de A9 con una capacidad inventada, para `cerrar` ────────────── */

export const paso = (id, dep, cap = CAPACIDAD_INVENTADA) => ({ id, capability: cap, purpose: `p${id}`, produces: 'text', ...(dep ? { dependsOn: dep } : {}) });
export const senalesDeLosPasos = (t) => t.steps.flatMap((s) => [
  { key: 'step.latencyMs', subject: s.id, value: 300, source: 'measured', sampleSize: 20 },
  { key: 'step.costUsd', subject: s.id, value: 0.01, source: 'measured', sampleSize: 20 },
]);
export const decisionBase = (senales, extra = {}) => ({
  contract: ALGORITHM_CONTRACT_VERSION, objective: { weights: { latency: 1, reliability: 1 } },
  trace: { traceId: 't', requestId: 'r', userId: 'u' }, signals: senales, ...extra,
});
