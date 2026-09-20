/**
 * F12-D · EL CANARY DE WEË BRAIN — `brainChat` con `text.generate`, y nada más.
 *
 * Esta es la primera vez que una ruta de producción de Weë puede pasar por el
 * Core Runtime. Lo que se prueba aquí no es que el conductor funcione —eso está
 * en `runtime-conductor`, `runtime-premigracion` y el emulador— sino lo que el
 * canary añade encima:
 *
 *   A · La puerta: quién pasa, quién no, y que cerrada no cambia nada.
 *   B · La cuenta la pone el principal autenticado, nunca el cliente.
 *   C · CORE o LEGACY, jamás los dos: una operación, una llamada al proveedor.
 *   D · Credits: la regla nueva del `catch` está puesta donde tiene que estar.
 *   E · El camino entero, de la referencia al texto que contesta Weë Brain.
 *   F · Volver atrás: cerrar la puerta devuelve todo a como estaba, sin desplegar.
 *
 * El contador de Credits con el motor DE VERDAD vive en `runtime-premigracion`
 * (sección F): allí están el cobro único, el duplicado concurrente, el bloque de
 * doce y el reembolso seguro. Aquí no se repiten; se comprueba que `brainChat`
 * los tiene enchufados.
 *
 * Todo es de verdad menos el proveedor y los almacenes. Usa el compilado:
 * `npm run build` antes de `npm test`.
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
const motorDelGateway = lib('engine/gateway.js');
const registroDeWee = lib('registry/index.js');
const ajustes = lib('engine/registry.js');
const trabajosDeWee = lib('job/index.js');
const { crearConductor } = lib('runtime/conductor.js');
const { colaDeInvocacion } = lib('runtime/cola.js');
const { crearEjecutor } = lib('runtime/ejecutor.js');
const { resolutorDelRouter } = lib('runtime/resolucion.js');
const { resolutorDeBrain, huellaDeEntrada, CLAVE_DE_REFERENCIA } = lib('runtime/contexto.js');
const { politicaPorReglas, SIN_REGLAS } = lib('runtime/politica.js');
const { pensadorSobreConductor, FalloDelPensador } = lib('runtime/pensador.js');
const { decidirRuntime, leerPuerta, PUERTA_CERRADA } = lib('runtime/puerta.js');
const { configuracionDeLaPuerta, olvidarLaPuerta, COLECCION_DE_LA_PUERTA, DOCUMENTO_DE_LA_PUERTA, VIGENCIA_DE_LA_PUERTA_MS } = lib('runtime/configuracion.js');

const BRAIN = sinComentarios(leer('functions/src/creator/brain.ts'));

/* ── El mundo de prueba ────────────────────────────────────────────────────── */

let reloj = 5_000_000;
const now = () => reloj;
const ANA = 'usuario1';
const OTRO = 'intruso9';
const CHAT = 'chatDeAna0001';
const MENSAJE = 'msg_0002';
const PREGUNTA = 'explícame por qué el cielo es azul';
const ANTES = 'buenas tardes';

const adaptador = (id, run, caps = ['text.generate', 'text.search']) => {
  const a = {
    id, name: id, modalities: ['text'], llamadas: [],
    models: [{ id: `${id}-1`, provider: id, capabilities: caps, quality: 3, speed: 3, cost: { unit: 'call', usd: 0.01 } }],
    isConfigured: () => true, supports: (c) => caps.includes(c),
    async run(req) { a.llamadas.push(req); return run(req, a.llamadas.length); },
  };
  return a;
};
const contesta = (texto) => async () => ({ output: { kind: 'text', content: texto }, usage: { inputTokens: 9, outputTokens: 4 }, costUSD: 0.001, latencyMs: 3 });

const almacen = () => {
  const porId = new Map(); const porClave = new Map(); const k = (s, key) => `${s.length}.${s}:${key}`;
  return {
    porId,
    async crearSiAusente(job) { await null; const c = k(job.idempotency.scope, job.idempotency.key); if (porClave.has(c)) return { created: false, job: porId.get(porClave.get(c)) }; porClave.set(c, job.jobId); porId.set(job.jobId, job); return { created: true, job }; },
    async obtener(id) { await null; return porId.get(id); },
    async porIdempotencia(s, key) { await null; const c = k(s, key); return porClave.has(c) ? porId.get(porClave.get(c)) : undefined; },
    async aplicar(t) { await null; const a = porId.get(t.jobId); if (!a || a.revision !== t.expectedRevision) return { applied: false, job: a }; porId.set(t.jobId, t.job); return { applied: true, job: t.job }; },
    async recuperables() { return { jobs: [] }; },
  };
};
const ejecuciones = () => {
  const m = new Map();
  return {
    async crearSiAusente({ run, workflow }) { await null; if (m.has(run.id)) return { created: false, guardada: m.get(run.id) }; const g = { run, workflow, revision: 0 }; m.set(run.id, g); return { created: true, guardada: g }; },
    async obtener(id) { await null; return m.get(id); },
    async guardar(run, rev) { await null; const a = m.get(run.id); if (!a || a.revision !== rev) return { saved: false, guardada: a }; const g = { run, workflow: a.workflow, revision: rev + 1 }; m.set(run.id, g); return { saved: true, guardada: g }; },
  };
};

/** La conversación de Ana, como la guarda `brainChats`. Solo lectura, igual que el puerto real. */
const conversaciones = () => {
  const chats = new Map();
  return {
    chats,
    crear(chatId, userId, mensajes) { chats.set(chatId, { userId, mensajes }); },
    async duenoDe(chatId) { return chats.get(chatId)?.userId; },
    async mensaje(chatId, id) { const m = chats.get(chatId)?.mensajes.find((x) => x.id === id); return m ? { role: m.role, text: m.text } : undefined; },
    async anterioresA(chatId, id, limite) { const ms = chats.get(chatId)?.mensajes ?? []; const i = ms.findIndex((x) => x.id === id); return i < 0 ? [] : ms.slice(Math.max(0, i - limite), i).map((m) => ({ role: m.role, text: m.text })); },
  };
};
const conversacionDeAna = () => {
  const f = conversaciones();
  f.crear(CHAT, ANA, [
    { id: 'msg_0001', role: 'user', text: ANTES },
    { id: 'msg_0001_wee', role: 'wee', text: 'hola' },
    { id: MENSAJE, role: 'user', text: PREGUNTA },
  ]);
  f.crear('chatDelOtro0001', OTRO, [{ id: 'msg_7001', role: 'user', text: 'esto es del otro' }]);
  return f;
};

/* La MISMA forma que `brainInput` de `creator/brain.ts`: quien cotiza y quien ejecuta construyen igual. */
const construirEntrada = ({ mensaje, historial, locale }) => ({
  system: `Eres Weë Brain. Idioma: ${locale ?? 'es'}`, prompt: mensaje.text, history: historial,
  imageUrl: mensaje.imageUrl, documentUrl: mensaje.documentUrl, audioUrl: mensaje.audioUrl, kind: 'answer', maxOutputTokens: 1400, temperature: 0.7,
});

const mundo = (o = {}) => {
  const adapters = o.adapters ?? { x: adaptador('x', contesta('el aire dispersa la luz azul')) };
  const config = { providers: {}, settings: ajustes.DEFAULT_SETTINGS };
  const registro = core.crearRegistro(registroDeWee.datosDelRegistro(adapters, config.providers));
  const trazas = [];
  const gateway = core.crearGateway({ registry: registro, executor: motorDelGateway.crearEjecutorDelMotor({ adapters, config: () => config, now }), tracer: { record: (t) => trazas.push(t) }, now });
  const router = core.crearRouter({ registry: registro });
  const trabajos = o.trabajos ?? almacen();
  const runs = o.ejecuciones ?? ejecuciones();
  const fuente = o.fuente ?? conversacionDeAna();
  const filas = [];
  const conductor = crearConductor({
    trabajos, ejecuciones: runs, cola: colaDeInvocacion(now), motor: trabajosDeWee.crearMotorDeTrabajosDeWee().motor,
    resolver: resolutorDelRouter(router, politicaPorReglas(o.reglas ?? SIN_REGLAS)),
    ejecutor: crearEjecutor({
      gateway, ahora: now, repetir: () => () => {},
      contexto: resolutorDeBrain({ conversaciones: fuente, construirEntrada, turnos: 12 }),
      duenoDelTrabajo: async (id) => (await trabajos.obtener(id))?.owner.userId,
      /* El mismo puerto por el que `creator/brain.ts` recuerda la fila de `aiGenerations`. */
      libro: { async abrir(d) { filas.push(d); return `gen_${filas.length}`; }, async cerrar() {} },
    }),
    trabajador: { worker: o.worker ?? 'w-1', visibilityMs: 30_000, backpressureDelayMs: 1_000 }, ahora: now,
  });
  return { conductor, adapters, trabajos, runs, fuente, trazas, filas };
};

let serie = 0;
const traza = (uid = ANA, extra = {}) => { serie++; const id = `brain_c_${String(serie).padStart(4, '0')}`; return { traceId: id, requestId: id, userId: uid, sessionId: CHAT, runId: CHAT, stepId: MENSAJE, workplace: 'brain', ...extra }; };

/** Lo mismo que compone `creator/brain.ts` cuando la puerta se abre. */
const pensadorDeBrain = (m, { uid = ANA, ref, locale, huella = true } = {}) => {
  const entrada = construirEntrada({ mensaje: { role: 'user', text: PREGUNTA }, historial: [{ role: 'user', text: ANTES }, { role: 'model', text: 'hola' }], ...(locale ? { locale } : {}) });
  return pensadorSobreConductor({
    conductor: m.conductor,
    principal: { userId: uid },
    referencia: ref ?? { kind: 'brain.message', chatId: CHAT, messageId: MENSAJE, ...(huella ? { quotedInputHash: huellaDeEntrada(entrada) } : {}) },
    ...(locale ? { locale } : {}),
    ruteo: { modelId: 'x-1', allowedProviders: ['x'] },
    contabilidad: { service: 'ai_brain', creditsEstimated: 0, estimatedUsd: 0.01, creditTransactionId: 'usage_brain_c' },
    deadlineAt: now() + 90_000,
  });
};
const pedir = (uid = ANA) => ({ capability: 'text.generate', trace: traza(uid), language: undefined });

/* ── A · La puerta ─────────────────────────────────────────────────────────── */
console.log('\n── A · La puerta: quién pasa, quién no, y qué pasa si nadie la tocó ──');
{
  const CANARIA = 'cuentaDelCanary01';
  const abierta = { habilitado: true, capacidades: ['text.generate'], cuentas: [CANARIA] };
  const ctx = (o = {}) => ({ capability: 'text.generate', userId: CANARIA, experienceId: 'brain', ...o });

  check('PUERTA CERRADA → LEGACY: sin configuración no pasa nadie', decidirRuntime(undefined, ctx()).runtime === 'legacy' && decidirRuntime(undefined, ctx()).motivo === 'deshabilitada');
  check('PUERTA ABIERTA pero cuenta que no es la del canary → LEGACY', decidirRuntime(abierta, ctx({ userId: 'otraCuenta00001' })).motivo === 'cuenta_fuera_de_la_prueba');
  check('PUERTA ABIERTA + cuenta del canary + `text.generate` → CORE', decidirRuntime(abierta, ctx()).runtime === 'core' && decidirRuntime(abierta, ctx()).motivo === 'abierta');
  check('PUERTA ABIERTA + cuenta del canary + CUALQUIER OTRA capacidad → LEGACY', ['text.search', 'video.generate', 'image.generate', 'voice.tts'].every((c) => decidirRuntime(abierta, ctx({ capability: c })).runtime === 'legacy'));
  check('y `habilitado: false` manda sobre todo lo demás: volver atrás es un booleano', decidirRuntime({ ...abierta, habilitado: false }, ctx()).runtime === 'legacy');
  check('una configuración a medio entender NO abre nada', [{ habilitado: 'sí' }, { habilitado: true }, { habilitado: true, capacidades: 'text.generate' }, { habilitado: true, capacidades: ['text.generate', 7] }, 'abierta', []].every((c) => decidirRuntime(c, ctx()).runtime === 'legacy'));
  check('`PUERTA_CERRADA` es la que se usa cuando no hay nada, y es inmutable', Object.isFrozen(PUERTA_CERRADA) && decidirRuntime(PUERTA_CERRADA, ctx()).runtime === 'legacy' && leerPuerta(PUERTA_CERRADA).ok === true);

  /* ── Lo guardado, leído de Firestore ── */
  const fakeDb = (valor, { revienta = false } = {}) => {
    const lecturas = [];
    return {
      lecturas,
      collection(c) { return { doc(d) { return { async get() { lecturas.push(`${c}/${d}`); if (revienta) throw new Error('firestore caído'); return { exists: valor !== undefined, data: () => valor }; } }; } }; },
    };
  };
  olvidarLaPuerta();
  let db = fakeDb({ habilitado: true, capacidades: ['text.generate'], cuentas: [CANARIA] });
  let guardada = await configuracionDeLaPuerta(db, now);
  check('la puerta se guarda en `aiSettings/runtime`, que es server-only', db.lecturas[0] === `${COLECCION_DE_LA_PUERTA}/${DOCUMENTO_DE_LA_PUERTA}` && COLECCION_DE_LA_PUERTA === 'aiSettings' && /match \/aiSettings\/\{settingId\} \{\s*allow read, write: if false;/.test(leer('firestore.rules')));
  check('y lo guardado decide de verdad', decidirRuntime(guardada, ctx()).runtime === 'core');
  await configuracionDeLaPuerta(db, now);
  check('se recuerda un minuto: no cuesta una lectura por mensaje', db.lecturas.length === 1 && VIGENCIA_DE_LA_PUERTA_MS === 60_000);
  reloj += VIGENCIA_DE_LA_PUERTA_MS + 1;
  await configuracionDeLaPuerta(db, now);
  check('y pasado el minuto se vuelve a mirar: cambiarla no exige desplegar', db.lecturas.length === 2);

  olvidarLaPuerta();
  check('si Firestore no contesta, la puerta queda CERRADA: una incidencia de lectura nunca abre un camino', decidirRuntime(await configuracionDeLaPuerta(fakeDb(undefined, { revienta: true }), now), ctx()).runtime === 'legacy');
  olvidarLaPuerta();
  check('y si el documento no existe, igual', decidirRuntime(await configuracionDeLaPuerta(fakeDb(undefined), now), ctx()).runtime === 'legacy');
  olvidarLaPuerta();
}

/* ── B · La cuenta ─────────────────────────────────────────────────────────── */
console.log('\n── B · La cuenta la pone el principal autenticado, no el cliente ──');
{
  check('`brainChat` decide con `uid`, que sale de `request.auth`', /const uid = request\.auth\.uid;/.test(BRAIN) && /decidirRuntime\(await configuracionDeLaPuerta\(db\), \{ capability: capacidad, userId: uid, experienceId: EXPERIENCIA_DE_BRAIN \}\)/.test(BRAIN));
  check('sin sesión no hay ruta que decidir: la petición muere antes', /if \(!request\.auth\) throw new EngineError\('UNAUTHORIZED'\);/.test(BRAIN) && BRAIN.indexOf("if (!request.auth)") < BRAIN.indexOf('decidirRuntime('));
  /* Lo que llegue en `data` no participa: la entrada declara seis campos y ninguno es una cuenta. */
  const entrada = BRAIN.match(/export interface BrainChatInput \{[\s\S]*?\n\}/)[0];
  check('y la entrada del cliente no tiene por dónde nombrar una cuenta', !/(accountId|userId|uid|principal)\s*\??:/.test(entrada));
  check('el principal que viaja al conductor es ese mismo uid', /principal: \{ userId: uid \}/.test(BRAIN));
  /* Y aunque alguien lograra colar otra cuenta en la referencia, el contexto se comprueba contra el dueño del TRABAJO. */
  const m = mundo();
  const suyo = await pensadorDeBrain(m).pensar(pedir());
  const ajeno = await pensadorDeBrain(m, { uid: OTRO }).pensar(pedir(OTRO)).catch((e) => e);
  check('y la conversación de Ana solo la resuelve Ana: otro principal con la MISMA referencia no lee nada', !!suyo.response && ajeno instanceof FalloDelPensador && ajeno.motivo === 'failed');
  check('al intruso ni siquiera se le llamó al proveedor', m.adapters.x.llamadas.length === 1);
}

/* ── C · CORE xor LEGACY ───────────────────────────────────────────────────── */
console.log('\n── C · CORE o LEGACY, jamás los dos ──');
{
  check('hay UN pensador, elegido UNA vez', /const pensador: Thinker = porElCore \? await pensadorDelConductor\(\) : pensadorDeSiempre\(\);/.test(BRAIN) && BRAIN.match(/const pensador: Thinker/g).length === 1);
  check('y una sola llamada al motor de siempre en todo el archivo', BRAIN.match(/engine\.generate\(/g).length === 1);
  check('que vive DENTRO del pensador de siempre, no fuera', BRAIN.indexOf('const pensadorDeSiempre') < BRAIN.indexOf('engine.generate(') && BRAIN.indexOf('engine.generate(') < BRAIN.indexOf('const pensadorDelConductor'));
  check('el pensador del conductor no llama al motor de siempre: baja por el Gateway', !/engine\.generate/.test(BRAIN.slice(BRAIN.indexOf('const pensadorDelConductor'), BRAIN.indexOf('const cerebro'))));
  check('el conductor se construye SOLO si la puerta se abrió: cerrada, ni se instancia', /porElCore \? await pensadorDelConductor\(\)/.test(BRAIN) && !/await conductorDeWee\(\{[\s\S]{0,200}\}\);\s*const pensadorDeSiempre/.test(BRAIN));
  check('y el candado de la capacidad está en el código, no en la configuración', /const CAPACIDAD_DEL_CANARY: CapabilityId = 'text\.generate';/.test(BRAIN) && /porElCore = puerta\.runtime === 'core' && capacidad === CAPACIDAD_DEL_CANARY/.test(BRAIN));
}

/* ── D · Credits ───────────────────────────────────────────────────────────── */
console.log('\n── D · Credits: la regla nueva, en el sitio exacto ──');
{
  check('el `catch` reembolsa lo cobrado SOLO si devolverlo es seguro', /const devolverEsSeguro = !\(error instanceof FalloDelPensador\) \|\| error\.reembolsoSeguro;\s*if \(spend && devolverEsSeguro\) \{/.test(BRAIN));
  check('y cuando no lo es, no liquida el libro a cero: la reserva se queda autorizada', /\} else if \(spend\) \{[\s\S]{0,260}console\.warn/.test(BRAIN) && !/else if \(spend\) \{[\s\S]{0,260}refundCredits/.test(BRAIN));
  check('un error que no viene del conductor se comporta como siempre', !(new TypeError('x') instanceof FalloDelPensador) && !(new Error('x') instanceof FalloDelPensador));
  check('el conductor dice que devolver es seguro cuando el trabajo terminó mal', new FalloDelPensador('failed', true, { code: 'PROVIDER_ERROR' }).reembolsoSeguro === true);
  check('y que NO lo es cuando salió, lo tiene otro, o ya terminó en otra invocación',
    ['outcome_unknown', 'in_progress_elsewhere', 'completed_elsewhere'].every((mo) => new FalloDelPensador(mo, false, { code: 'PROVIDER_ERROR' }).reembolsoSeguro === false));
  check('el pensador no cobra, no reserva y no reembolsa: solo dice si es seguro', !/spendCredits|completeCredits|refundCredits|creditEngine/.test(sinComentarios(leer('functions/src/runtime/pensador.ts'))));
  check('el canary NO cambió cuándo se cobra: búsqueda por delante, conversación por bloques de doce', BRAIN.indexOf('if (webSearch) {') < BRAIN.indexOf('engine.generate(') && /const consumo = await contarRespuesta\(uid, messageId\);\s*if \(consumo\.cobrada\)/.test(BRAIN));
  check('ni el Financial Core, ni el Credit Engine, ni los precios', !/creditEngine\.[a-z]/i.test(sinComentarios(leer('functions/src/runtime/index.ts')) + sinComentarios(leer('functions/src/runtime/conductor.ts'))));
  /* Una sola transacción para los dos caminos: la que abre la fila del libro y la que después se liquida. */
  const enElDeSiempre = BRAIN.slice(BRAIN.indexOf('const pensadorDeSiempre'), BRAIN.indexOf('const pensadorDelConductor'));
  const enElDelConductor = BRAIN.slice(BRAIN.indexOf('const pensadorDelConductor'), BRAIN.indexOf('const cerebro'));
  check('y la transacción que liquida el libro es la MISMA por los dos caminos',
    /creditTransactionId: usageTransactionId\(requestId\)/.test(enElDeSiempre) && /creditTransactionId: usageTransactionId\(requestId\)/.test(enElDelConductor)
    && BRAIN.match(/settle\(\{ creditTransactionId: usageTransactionId\(requestId\)/g).length === 2);
  check('y el servicio y los Credits estimados viajan igual por los dos: lo que se cotizó es lo que se anota',
    /creditsEstimated: creditsDelMensaje/.test(enElDeSiempre) && /creditsEstimated: creditsDelMensaje/.test(enElDelConductor)
    && /service,/.test(enElDeSiempre) && /service,/.test(enElDelConductor));
}

/* ── E · El camino entero ──────────────────────────────────────────────────── */
console.log('\n── E · De la referencia al texto que contesta Weë Brain ──');
{
  const m = mundo();
  const r = await pensadorDeBrain(m).pensar(pedir());
  const trabajo = [...m.trabajos.porId.values()][0];
  const visto = m.adapters.x.llamadas[0]?.input ?? {};

  check('RESPUESTA: Weë Brain recibe el texto del proveedor', r.response?.kind === 'text' && r.response.content === 'el aire dispersa la luz azul');
  check('CONTEXTO POR REFERENCIA: al proveedor le llega la conversación resuelta, no la referencia', visto.prompt === PREGUNTA && visto.history.length === 2 && visto.history[0].text === ANTES && !(CLAVE_DE_REFERENCIA in visto));
  check('y en el trabajo guardado no queda ni una palabra de la conversación', !JSON.stringify(trabajo).includes(PREGUNTA) && !JSON.stringify(trabajo).includes(ANTES) && JSON.stringify(trabajo).includes(CLAVE_DE_REFERENCIA));
  check('OWNERSHIP: el trabajo es de la cuenta autenticada', trabajo.owner.userId === ANA);
  check('ROUTER: se ejecutó el modelo que se cotizó, y por el proveedor pedido', trabajo.implementation.modelId === 'x-1' && trabajo.implementation.providerId === 'x');
  check('GATEWAY: dejó UNA traza, con la capacidad, el proveedor, el modelo y el intento', m.trazas.length === 1 && m.trazas[0].capability === 'text.generate' && m.trazas[0].provider === 'x' && m.trazas[0].model === 'x-1' && m.trazas[0].status === 'ok' && m.trazas[0].attempt === 1);
  check('y esa traza NO lleva ni el mensaje ni la respuesta: identificadores y números', !JSON.stringify(m.trazas[0]).includes(PREGUNTA) && !JSON.stringify(m.trazas[0]).includes('dispersa'));
  check('con los campos de identidad que la Fase 10 añadió y la Fase 2 ya no se come', m.trazas[0].userId === ANA && m.trazas[0].workplace === 'brain' && m.trazas[0].sessionId === CHAT);
  check('PROVEEDOR: se le llamó UNA vez', m.adapters.x.llamadas.length === 1);
  check('LIBRO: se abrió una fila antes de salir, con el servicio y la transacción de Credits', m.filas.length === 1 && m.filas[0].metadata.service === 'ai_brain' && m.filas[0].metadata.creditTransactionId === 'usage_brain_c');
  check('y `brainChat` la nombra como la nombraría el camino de siempre: chat, mensaje y `brain_<messageId>`',
    /libroDelMotor\(firestoreLedger, \(\) => \(\{ requestId, jobId: chatRef\.id, stepId: messageId \}\)\)/.test(BRAIN));
  check('JOB: terminó, con UN intento y marcado como salido antes de salir', trabajo.state === 'completed' && trabajo.attempts.length === 1 && trabajo.attempts[0].dispatched === true);
  check('y no es una muestra del modo demo: lo sirvió un proveedor de verdad', r.synthetic === false);

  /* Lo que se cotizó es lo que se ejecuta. */
  const cambiada = mundo();
  cambiada.fuente.chats.get(CHAT).mensajes[0].text = 'alguien escribió otra cosa entre medias';
  const roto = await pensadorDeBrain(cambiada).pensar(pedir()).catch((e) => e);
  check('si la conversación cambió entre cotizar y ejecutar, NO se ejecuta otra cosa', roto instanceof FalloDelPensador && cambiada.adapters.x.llamadas.length === 0);
  check('y devolver el dinero en ese caso es SEGURO: no salió nada', roto.reembolsoSeguro === true);

  /* La misma petición, otra vez. */
  const t = almacen(); const e = ejecuciones(); const f = conversacionDeAna(); const ad = { x: adaptador('x', contesta('una sola vez')) };
  const uno = mundo({ adapters: ad, trabajos: t, ejecuciones: e, fuente: f });
  const dos = mundo({ adapters: ad, trabajos: t, ejecuciones: e, fuente: f, worker: 'w-2' });
  const peticion = pedir();
  const r1 = await pensadorDeBrain(uno).pensar(peticion);
  const r2 = await pensadorDeBrain(dos).pensar(peticion).catch((x) => x);
  check('ENTREGA REPETIDA: el proveedor se llama UNA vez aunque la petición llegue dos', ad.x.llamadas.length === 1 && t.porId.size === 1);
  check('la segunda no inventa una respuesta, y dice que devolver NO es seguro', !!r1.response && r2 instanceof FalloDelPensador && r2.motivo === 'completed_elsewhere' && r2.reembolsoSeguro === false);
}

/* ── F · Volver atrás ──────────────────────────────────────────────────────── */
console.log('\n── F · Volver atrás: cerrar la puerta y que todo vuelva a como estaba ──');
{
  const CANARIA = 'cuentaDelCanary01';
  const ctx = { capability: 'text.generate', userId: CANARIA, experienceId: 'brain' };
  const documento = { habilitado: true, capacidades: ['text.generate'], cuentas: [CANARIA] };
  let almacenado = documento;
  const db = { collection() { return { doc() { return { async get() { return { exists: almacenado !== undefined, data: () => almacenado }; } }; } }; } };

  olvidarLaPuerta();
  check('con la puerta abierta, esa cuenta va por el Core', decidirRuntime(await configuracionDeLaPuerta(db, now), ctx).runtime === 'core');
  almacenado = { ...documento, habilitado: false };
  olvidarLaPuerta();
  check('se cambia UN booleano en Firestore y vuelve a LEGACY: sin desplegar, sin tocar código', decidirRuntime(await configuracionDeLaPuerta(db, now), ctx).runtime === 'legacy');
  almacenado = documento;
  olvidarLaPuerta();
  check('y volver a abrirla es el mismo gesto: es reversible en los dos sentidos', decidirRuntime(await configuracionDeLaPuerta(db, now), ctx).runtime === 'core');
  almacenado = undefined;
  olvidarLaPuerta();
  check('borrar el documento también cierra', decidirRuntime(await configuracionDeLaPuerta(db, now), ctx).runtime === 'legacy');
  olvidarLaPuerta();

  check('el camino de siempre no se borró: sigue entero al lado', /engine\.generate\(/.test(BRAIN) && /const pensadorDeSiempre = \(\): Thinker/.test(BRAIN));
  check('`creatorJobs`, `creatorRun` y `drama.ts` siguen donde estaban', fs.existsSync(path.resolve(RAIZ, 'functions/src/creator/index.ts')) && fs.existsSync(path.resolve(RAIZ, 'functions/src/engine/pipelines/drama.ts')) && /creatorJobs/.test(leer('functions/src/creator/index.ts')));
  check('y por dónde fue cada mensaje queda anotado, sin secretos y sin enseñárselo a nadie',
    /WEË BRAIN · ruta=\$\{porElCore \? 'CORE' : 'LEGACY'\}/.test(BRAIN) && !/ruta|runtimePath/.test(BRAIN.slice(BRAIN.indexOf('return { chatId: chatRef.id, messageId: `${messageId}_wee`'))));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
