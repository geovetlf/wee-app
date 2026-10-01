/**
 * F12-D · ENDURECIMIENTO PREVIO A LA MIGRACIÓN — antes de conectar Weë Brain.
 *
 * El primer tramo dejó el conductor construido y cuatro riesgos escritos. Esta
 * suite es la prueba de que están cerrados, o de que están acotados y se sabe
 * exactamente por dónde:
 *
 *   A · La traza: los campos de la Fase 2, los de la Fase 10 y los del runtime
 *       sobreviven juntos. Y una cuenta suplantada no pasa.
 *   B · El Gateway: qué contesta de verdad, caso por caso — y `accepted`.
 *   C · Policy & Eligibility: quién dice «no puede» y quién dice «no se debe».
 *   D · El contexto viaja por REFERENCIA: el trabajo no guarda la conversación.
 *   E · Seguridad del contexto: saber una referencia no da derecho a leerla.
 *   F · Credits: con el Credit Engine DE VERDAD, el runtime no cobra dos veces,
 *       no deja de cobrar, no reserva dos veces y no reembolsa lo que no debe.
 *   G · Estructura: qué se añadió, qué se tocó a propósito y qué sigue sin conectar.
 *
 * NADA DE ESTO CONECTA WEË BRAIN. Todo es de verdad menos el proveedor y los
 * almacenes, que viven aquí. El de Firestore se prueba contra el emulador
 * (`runtime-conductor.emulator.mjs`) y las consultas, contra producción en solo
 * lectura (docs/RUNTIME.md § 12).
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
const motorDelGateway = lib('engine/gateway.js');
const registroDeWee = lib('registry/index.js');
const ajustes = lib('engine/registry.js');
const http = lib('engine/http.js');
const trabajosDeWee = lib('job/index.js');
const { createCreditEngine } = lib('credits/creditEngine.js');
const { crearConductor } = lib('runtime/conductor.js');
const { colaDeInvocacion } = lib('runtime/cola.js');
const { crearEjecutor } = lib('runtime/ejecutor.js');
const { resolutorDelRouter, resolutorPorCadena } = lib('runtime/resolucion.js');
const { resolutorDeBrain, leerReferencia, huellaDeEntrada, CLAVE_DE_REFERENCIA } = lib('runtime/contexto.js');
const { politicaPorReglas, politicaCerrada, leerReglas, SIN_REGLAS } = lib('runtime/politica.js');
const { pensadorSobreConductor, FalloDelPensador } = lib('runtime/pensador.js');
const { ProviderError } = http;

/* ── El mundo de prueba ────────────────────────────────────────────────────── */

const T0 = 3_000_000;
let reloj = T0;
const now = () => reloj;
const ANA = 'usuario1';
const OTRO = 'intruso9';

const adaptador = (id, run, caps = ['text.generate', 'text.search'], extra = {}) => {
  const a = {
    id, name: id, modalities: ['text'], llamadas: [],
    models: [{ id: `${id}-1`, provider: id, capabilities: caps, quality: extra.quality ?? 3, speed: 3, cost: { unit: 'call', usd: 0.01 } }],
    isConfigured: () => true, supports: (c) => caps.includes(c),
    async run(req) { a.llamadas.push(req); return run(req, a.llamadas.length); },
  };
  return a;
};
const contesta = (texto = 'hola, soy Weë') => async () => ({ output: { kind: 'text', content: texto }, usage: { inputTokens: 9, outputTokens: 4 }, costUSD: 0.001, latencyMs: 3 });

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

/** LA FUENTE DE VERDAD de las conversaciones, en memoria. Solo lectura, como el puerto. */
const conversaciones = () => {
  const chats = new Map(); const lecturas = [];
  return {
    chats, lecturas,
    crear(chatId, userId, mensajes) { chats.set(chatId, { userId, mensajes }); },
    async duenoDe(chatId) { lecturas.push(`dueno:${chatId}`); return chats.get(chatId)?.userId; },
    async mensaje(chatId, id) { lecturas.push(`mensaje:${chatId}/${id}`); const m = chats.get(chatId)?.mensajes.find((x) => x.id === id); return m ? { ...m, id: undefined } : undefined; },
    async anterioresA(chatId, id, limite) { lecturas.push(`historial:${chatId}/${id}`); const ms = chats.get(chatId)?.mensajes ?? []; const i = ms.findIndex((x) => x.id === id); return i < 0 ? [] : ms.slice(Math.max(0, i - limite), i).map((m) => ({ ...m, id: undefined })); },
  };
};
/** La misma forma que `brainInput` de `creator/brain.ts`: quien cotiza y quien ejecuta construyen la entrada igual. */
const construirEntrada = ({ mensaje, historial, locale }) => ({
  system: `Eres Weë Brain. Idioma: ${locale ?? 'es'}`, prompt: mensaje.text, history: historial,
  imageUrl: mensaje.imageUrl, documentUrl: mensaje.documentUrl, audioUrl: mensaje.audioUrl, kind: 'answer', maxOutputTokens: 1400, temperature: 0.7,
});

const SECRETO = 'mi diagnóstico médico es privado y nadie más debe leerlo';
const HISTORIA = 'ayer te conté lo de mi hermana';
const conversacionDeAna = (fuente = conversaciones()) => {
  fuente.crear('chatDeAna0001', ANA, [
    { id: 'msg_0001', role: 'user', text: HISTORIA },
    { id: 'msg_0001_wee', role: 'wee', text: 'lo recuerdo' },
    { id: 'msg_0002', role: 'user', text: SECRETO },
  ]);
  fuente.crear('otroChatDeAna01', ANA, [{ id: 'msg_9001', role: 'user', text: 'otra conversación mía' }]);
  fuente.crear('chatDelOtro0001', OTRO, [{ id: 'msg_7001', role: 'user', text: 'esto es del otro' }]);
  return fuente;
};

const mundo = (o = {}) => {
  const adapters = o.adapters ?? { x: adaptador('x', contesta()) };
  const config = { providers: o.providers ?? {}, settings: ajustes.DEFAULT_SETTINGS };
  const registro = core.crearRegistro(registroDeWee.datosDelRegistro(adapters, config.providers));
  const trazas = [];
  const gateway = o.gateway ?? core.crearGateway({ registry: registro, executor: motorDelGateway.crearEjecutorDelMotor({ adapters, config: () => config, now }), tracer: { record: (t) => trazas.push(t) }, now });
  const router = core.crearRouter({ registry: registro });
  const trabajos = o.trabajos ?? almacen();
  const runs = o.ejecuciones ?? ejecuciones();
  const fuente = o.fuente ?? conversacionDeAna();
  const contexto = o.sinResolutor ? undefined : resolutorDeBrain({ conversaciones: fuente, construirEntrada, turnos: 12, ...(o.entidades ? { entidades: o.entidades } : {}) });
  const entregas = [];
  const conductor = crearConductor({
    trabajos, ejecuciones: runs, cola: colaDeInvocacion(now), motor: trabajosDeWee.crearMotorDeTrabajosDeWee().motor,
    resolver: o.cadena ? resolutorPorCadena(router, o.cadena, o.politica) : resolutorDelRouter(router, o.politica),
    ejecutor: crearEjecutor({ gateway, ahora: now, repetir: () => () => {}, ...(contexto ? { contexto } : {}), duenoDelTrabajo: async (id) => (await trabajos.obtener(id))?.owner.userId }),
    trabajador: { worker: o.worker ?? 'w-1', visibilityMs: 30_000, backpressureDelayMs: 1_000 }, ahora: now, observar: (e) => entregas.push(e),
    ...(o.esperar ? { esperar: o.esperar } : {}),
  });
  return { conductor, adapters, trabajos, runs, fuente, trazas, entregas, registro, router, gateway };
};
const trabajosDe = (m) => [...m.trabajos.porId.values()];
let serie = 0;
const traza = (uid = ANA, extra = {}) => { serie++; const id = `brain_p_${String(serie).padStart(4, '0')}`; return { traceId: id, requestId: id, userId: uid, workplace: 'brain', ...extra }; };
const conReferencia = (ref, extra = {}) => ({ id: `wf_p_${++serie}`, contract: '1.1', goal: 'brain.reply', steps: [{ id: 'pensar', capability: 'text.generate', purpose: 'Contestar', input: { [CLAVE_DE_REFERENCIA]: ref, ...extra } }] });
const REF = { kind: 'brain.message', chatId: 'chatDeAna0001', messageId: 'msg_0002' };
const esperar = async (ms) => { reloj += ms + 1; };

/* ── A · La traza ──────────────────────────────────────────────────────────── */
console.log('\n── A · La traza: Fase 2 + Fase 10 + runtime, juntas ──');
{
  const F2 = { traceId: 'trace-0001', requestId: 'req-0001', userId: ANA, sessionId: 'ses-1', runId: 'run-1', stepId: 'paso-1', appId: 'wee', workplace: 'brain', projectId: 'proj-1' };
  const F10 = { accountId: ANA, entityId: 'ent_abcdefghijklmnopqrstuvwxyz', entityType: 'WEE_PROFILE', operationId: 'op-0001', workspaceId: 'ws-1' };
  const leida = core.leerTraza({ trace: { ...F2, ...F10 } });
  check('los NUEVE campos de la Fase 2 siguen saliendo', Object.keys(F2).every((k) => leida?.[k] === F2[k]));
  check('y los CINCO de la Fase 10 ya no se pierden', Object.keys(F10).every((k) => leida?.[k] === F10[k]), JSON.stringify(Object.keys(F10).filter((k) => leida?.[k] !== F10[k])));
  const soloF2 = core.leerTraza({ trace: F2 });
  check('una traza que NO los trae sale EXACTAMENTE como antes, clave por clave: lo que ya funciona no nota el cambio', Object.keys(soloF2).join(',') === 'traceId,requestId,userId,sessionId,runId,stepId,appId,workplace,projectId');
  check('CUENTA SUPLANTADA: un `accountId` distinto de `userId` invalida la traza entera', core.leerTraza({ trace: { ...F2, accountId: OTRO } }) === null);
  check('y no se «corrige»: tampoco vale uno que no sea texto', core.leerTraza({ trace: { ...F2, accountId: 7 } }) === null && core.leerTraza({ trace: { ...F2, accountId: '' } }) === null);
  check('un tipo de entidad que no existe no pasa', core.leerTraza({ trace: { ...F2, entityType: 'ADMIN' } }) === null && core.leerTraza({ trace: { ...F2, entityType: 'PAGE' } })?.entityType === 'PAGE');
  check('ni una etiqueta con forma rara', core.leerTraza({ trace: { ...F2, operationId: 'con espacio' } }) === null && core.leerTraza({ trace: { ...F2, workspaceId: { a: 1 } } }) === null);
  check('`cuentaDeTraza` ya no puede devolver la cuenta de otro', core.cuentaDeTraza(leida) === ANA);
  check('ningún campo nuevo es un sitio donde quepa un secreto o el texto de alguien', core.trazaLimpia(leida) && !Object.keys(leida).some((k) => core.CAMPOS_PROHIBIDOS.includes(k)));

  /* Y sobreviven DE VERDAD por toda la cadena, no solo en el lector. */
  const m = mundo();
  const r = await m.conductor.ejecutar({ principal: { userId: ANA }, trace: { ...traza(), ...F10, appId: 'wee' }, workflow: conReferencia(REF), contexto: { appId: 'wee', workspaceId: 'ws-1', operationId: 'op-0001' } });
  const job = trabajosDe(m)[0];
  check('Workflow → Orchestrator: la ejecución guardada los conserva', ['accountId', 'entityId', 'entityType', 'operationId', 'workspaceId'].every((k) => r.run.trace[k] === F10[k]));
  check('Job Engine: el trabajo guardado los conserva', ['accountId', 'entityId', 'entityType', 'operationId', 'workspaceId'].every((k) => job.trace[k] === F10[k]));
  check('Gateway: y llegan al rastro de la operación', ['accountId', 'entityId', 'operationId', 'workspaceId'].every((k) => m.trazas[0][k] === F10[k]));
  check('los campos del RUNTIME —ejecución, paso y la clave de ESA operación— van con ellos', job.trace.runId === r.runId && job.trace.stepId === 'pensar' && job.trace.requestId === core.claveDePaso(r.runId, 'pensar', 1));
  check('y el contexto del trabajo sigue llevando lo suyo', job.context.operationId === 'op-0001' && job.context.workspaceId === 'ws-1' && job.context.appId === 'wee');
  const suplantada = await mundo().conductor.ejecutar({ principal: { userId: ANA }, trace: { ...traza(), accountId: OTRO }, workflow: conReferencia(REF) });
  check('una ejecución con la cuenta de OTRO en la traza no arranca', suplantada.estado === 'invalida');
}

/* ── B · El Gateway ────────────────────────────────────────────────────────── */
console.log('\n── B · El Gateway: qué contesta de verdad, y `accepted` ──');
{
  const pide = (id = 'x') => ({ contract: '1.0', capability: 'text.generate', implementation: { providerId: id, modelId: `${id}-1` }, input: { prompt: 'hola' }, trace: { traceId: 'trace-gw-01', requestId: 'req-gw-0001', userId: ANA } });
  const con = (run) => { const adapters = { x: adaptador('x', run) }; const config = { providers: {}, settings: ajustes.DEFAULT_SETTINGS }; return core.crearGateway({ registry: core.crearRegistro(registroDeWee.datosDelRegistro(adapters, config.providers)), executor: motorDelGateway.crearEjecutorDelMotor({ adapters, config: () => config, now }), tracer: { record() {} }, now }); };

  const ok = await con(contesta('bien')).ejecutar(pide());
  check('ÉXITO → `completed`, con respuesta y uso', ok.status === 'completed' && ok.response.content === 'bien' && ok.usage.inputTokens === 9);
  const e5xx = await con(async () => { throw new ProviderError('x respondió 503: overloaded', 'x', 503, true); }).ejecutar(pide());
  check('ERROR DEL PROVEEDOR → `failed` PROVIDER_ERROR, que admite otro intento', e5xx.status === 'failed' && e5xx.error.code === 'PROVIDER_ERROR' && core.esReintentable(e5xx.error.code));
  const rechazo = await con(async () => { throw new ProviderError('x: rechazo de entrada: sensitive', 'x', 400, false); }).ejecutar(pide());
  check('FALLO DE LA PETICIÓN → `failed` CONTENT_POLICY, que NO se reintenta', rechazo.status === 'failed' && rechazo.error.code === 'CONTENT_POLICY' && !core.esReintentable(rechazo.error.code));
  const lento = await con(() => new Promise(() => {})).ejecutar({ ...pide(), execution: { timeoutMs: 20 } });
  check('PLAZO → `failed` TIMEOUT', lento.status === 'failed' && lento.error.code === 'TIMEOUT');
  const roto = await con(async () => ({ nada: 'de lo que se espera' })).ejecutar(pide());
  check('RESPUESTA MAL FORMADA → `failed`, nunca un «completado» con basura dentro', roto.status === 'failed' && !roto.response, `${roto.status}/${roto.error?.code}`);
  const sinTipo = await con(async () => ({ output: { kind: 'holograma', content: 'x' }, costUSD: 0, latencyMs: 1 })).ejecutar(pide());
  check('y un tipo de salida que no existe tampoco cuela', sinTipo.status === 'failed', `${sinTipo.status}/${sinTipo.error?.details?.reason}`);
  check('el mensaje crudo del proveedor no sale en ningún error', ![e5xx, rechazo, roto].some((g) => /overloaded|sensitive/.test(JSON.stringify(g.error))));

  /*
   * `accepted`: DECLARADO EN EL CONTRATO, Y HOY NINGUNA RUTA LO PRODUCE.
   *
   * No es un olvido que haya que arreglar para Weë Brain: `accepted` significa «el
   * proveedor cogió la tarea y contestará luego», que es el camino del VÍDEO. Un
   * mensaje de texto se contesta en la misma llamada. El puerto por el que el
   * Gateway habla con los adaptadores ni siquiera tiene forma de decirlo —su
   * resultado es «salió bien, con respuesta» o «salió mal, con error»—, y dársela
   * es diseñar la ejecución asíncrona entera. Se deja escrito y vigilado.
   */
  const GW = sinComentarios(leer('functions/src/core/gateway.ts'));
  check('`accepted` está declarado en el contrato del Gateway', /GatewayStatus = 'completed' \| 'failed' \| 'accepted'/.test(GW));
  /*
   * ESTO CAMBIÓ, Y ES LO QUE ESTE ARCHIVO PEDÍA. El endurecimiento dejó escrito
   * que `accepted` estaba declarado y no podía producirse nunca, porque el
   * puerto hacia los adaptadores solo sabía decir «respuesta» o «error». El
   * bloque de ejecución asíncrona (F12-D) añadió la tercera respuesta y su
   * camino. Sigue sin migrarse ninguna capacidad: lo que hay es la puerta.
   */
  check('y ahora el Gateway SÍ puede producirlo, por el camino que faltaba', /status: 'accepted'/.test(GW) && /status: 'completed'/.test(GW) && /status: 'failed'/.test(GW));
  check('porque su puerto hacia los adaptadores ya sabe decir «el proveedor la cogió»', /\| \{ ok: true; accepted: true; operation: GatewayOperationRef/.test(GW));
  check('y sin referencia del proveedor no se da por aceptada: sería un callejón sin salida', /accepted_without_operation/.test(GW));
  /*
   * Y ESTO TAMBIÉN CAMBIÓ. Hasta el bloque de ejecución asíncrona, ningún
   * adaptador podía producir `accepted`: la puerta estaba y nadie la cruzaba.
   * Ahora Seedance sí sabe cruzarla —POST, acuse, y suelta el proceso—, pero
   * SOLO si se lo piden: `acceptAsync` es lo que lo pide, y el camino de
   * siempre no lo pide nunca. Lo que se fija aquí es exactamente eso: que la
   * capacidad exista y que esté cerrada por defecto.
   */
  const EJEC = sinComentarios(leer('functions/src/engine/gateway.ts'));
  check('el ejecutor del motor sabe traducir «la cogió» al contrato del Gateway', /accepted: true/.test(EJEC));
  /*
   * Esto fijaba la forma ANTIGUA —un spread condicional— y la forma cambió por
   * un motivo: por ese spread se perdió la opción en el primer canary real.
   * Ahora se exige lo contrario: asignación explícita, un booleano siempre
   * presente, y que el valor salga de quien compone y no de un descuido.
   */
  check('la opción viaja EXPLÍCITA al adaptador, siempre como booleano', /acceptAsync: deps\.aceptaAsincrono === true/.test(EJEC) && /aceptaAsincrono\?: boolean/.test(EJEC));
  check('y quien compone el Gateway también la pasa explícita al ejecutor', /aceptaAsincrono: deps\.aceptaAsincrono === true/.test(EJEC));
  check('un solo adaptador lo produce —Seedance— y ninguno más',
    fs.readdirSync(path.resolve(RAIZ, 'functions/src/engine/providers')).filter((f) => /accepted: \{ operationId/.test(leer(`functions/src/engine/providers/${f}`))).join(',') === 'seedance.ts');
  check('y sin que se lo pidan, Seedance sigue sondeando como siempre', /if \(request\.acceptAsync\)/.test(sinComentarios(leer('functions/src/engine/providers/seedance.ts'))));
  check('su ÚNICO consumidor es la composición del Job Engine, que lo traduce a «no se sabe todavía»', trabajosDeWee.informeDelGateway({ attemptId: 'a1' }, { status: 'accepted', implementation: {} }).outcome === 'unknown');

  /* Y si un día el Gateway lo contestara, el runtime YA es seguro: no lo da por hecho, no lo repite y no se queda esperando. */
  reloj = T0;
  const m = mundo({ gateway: { async ejecutar(p) { m.vistas = (m.vistas ?? 0) + 1; return { contract: '1.0', status: 'accepted', requestId: p.trace.requestId, traceId: p.trace.traceId, idempotencyKey: p.idempotencyKey, capability: p.capability, implementation: p.implementation, timing: { startedAt: reloj, finishedAt: reloj }, warnings: [] }; } }, esperar });
  const r = await m.conductor.ejecutar({ principal: { userId: ANA }, trace: traza(), workflow: conReferencia(REF) });
  check('con un `accepted` de verdad: el trabajo queda ESPERANDO, el paso sigue en marcha, y se dice', r.estado === 'en_curso' && r.avisos.includes('outcome_unknown') && trabajosDe(m)[0].state === 'waiting' && r.run.steps[0].state === 'running');
  check('no se repite la llamada, y la invocación no se queda esperando al plazo', m.vistas === 1 && reloj === T0);
  check('Weë Brain NO lo necesita: su capacidad se contesta en la misma llamada', ['text.generate', 'text.search'].every((c) => core.CAPABILITY_CATALOG.find((x) => x.id === c)?.produces === 'text'));
}

/* ── C · Policy & Eligibility ──────────────────────────────────────────────── */
console.log('\n── C · Policy & Eligibility: quién dice «no puede» y quién dice «no se debe» ──');
{
  const adapters = () => ({ alfa: adaptador('alfa', contesta('de alfa'), ['text.generate'], { quality: 5 }), beta: adaptador('beta', contesta('de beta'), ['text.generate'], { quality: 2 }) });
  const resolver = (o = {}) => {
    const ad = o.adapters ?? adapters();
    const router = core.crearRouter({ registry: core.crearRegistro(registroDeWee.datosDelRegistro(ad, o.providers ?? {})) });
    return o.cadena ? resolutorPorCadena(router, o.cadena, o.politica) : resolutorDelRouter(router, o.politica);
  };
  const pet = (extra = {}) => ({ peticion: { capability: 'text.generate', trace: traza(), ...extra }, input: {} });
  const de = (r, id) => r.elegibilidad.find((v) => v.providerId === id);

  const libre = await resolver({ politica: politicaPorReglas(SIN_REGLAS) }).resolver(pet());
  check('ELEGIBLE: sin ninguna regla conocida, nada se bloquea', libre.ok && libre.elegibilidad.every((v) => v.eligible) && libre.implementation.providerId === 'alfa');

  const apagado = await resolver({ providers: { alfa: { enabled: false, priority: 1 } }, politica: politicaPorReglas(SIN_REGLAS) }).resolver(pet());
  check('PROVEEDOR APAGADO: no es elegible, y quien lo dice es el ROUTER — la política ni se pregunta', apagado.ok && !de(apagado, 'alfa').eligible && de(apagado, 'alfa').decidedBy === 'router' && apagado.implementation.providerId === 'beta');
  const modeloApagado = await resolver({ providers: { alfa: { enabled: true, priority: 1, models: { 'alfa-1': { enabled: false } } } }, politica: politicaPorReglas(SIN_REGLAS) }).resolver(pet());
  check('MODELO APAGADO: lo mismo, y también es del Router', !de(modeloApagado, 'alfa').eligible && de(modeloApagado, 'alfa').decidedBy === 'router' && modeloApagado.implementation.providerId === 'beta');
  const sinCapacidad = await resolver({ politica: politicaPorReglas(SIN_REGLAS) }).resolver(pet({ capability: 'video.generate' }));
  check('CAPACIDAD QUE NADIE SIRVE: «no hay con qué», del Router; no hay candidato al que aplicarle una regla', !sinCapacidad.ok && sinCapacidad.reason === 'unavailable' && sinCapacidad.elegibilidad.length === 0);

  const REGLA = { id: 'r-alfa-region', source: 'Contrato con Alfa, cláusula 4.2 (ejemplo de prueba)', effect: 'deny', providerId: 'alfa', when: { regions: ['xx-prohibida'] } };
  const conRegla = politicaPorReglas(leerReglas([REGLA]).reglas);
  const enRegion = await resolver({ politica: conRegla }).resolver(pet({ constraints: { region: 'xx-prohibida' } }));
  check('RESTRICCIÓN DE REGIÓN CONOCIDA: ese proveedor no, y quien lo dice es la POLÍTICA, con su regla y su fuente',
    enRegion.ok && !de(enRegion, 'alfa').eligible && de(enRegion, 'alfa').decidedBy === 'policy' && de(enRegion, 'alfa').rule === 'r-alfa-region' && /cláusula 4\.2/.test(de(enRegion, 'alfa').source) && enRegion.implementation.providerId === 'beta');
  const otraRegion = await resolver({ politica: conRegla }).resolver(pet({ constraints: { region: 'yy-permitida' } }));
  check('en otra región la regla no aplica', otraRegion.implementation.providerId === 'alfa' && de(otraRegion, 'alfa').eligible);
  const sinRegion = await resolver({ politica: conRegla }).resolver(pet());
  check('REGIÓN DESCONOCIDA: NO se inventa una restricción — no saber dónde está alguien no es saber que está donde no se puede', sinRegion.implementation.providerId === 'alfa' && de(sinRegion, 'alfa').eligible);

  const todos = politicaPorReglas(leerReglas([{ id: 'r-todo', source: 'prueba', effect: 'deny', capability: 'text.generate' }]).reglas);
  const vetado = await resolver({ politica: todos }).resolver(pet());
  check('si una regla quita a TODOS, no es «no hay»: es «no se puede», y se dice', !vetado.ok && vetado.reason === 'policy_denied' && vetado.elegibilidad.every((v) => v.decidedBy === 'policy'));
  const cadena = { async cadena() { return [{ providerId: 'alfa', modelId: 'alfa-1' }, { providerId: 'beta', modelId: 'beta-1' }]; } };
  const enCadena = await resolver({ cadena, politica: conRegla }).resolver(pet({ constraints: { region: 'xx-prohibida' } }));
  check('con cadena de producto: la política quita, y el ORDEN sigue siendo el de la cadena', enCadena.ok && enCadena.origen === 'cadena' && enCadena.implementation.providerId === 'beta');
  const soloAlfa = await resolver({ cadena: { async cadena() { return [{ providerId: 'alfa', modelId: 'alfa-1' }]; } }, politica: conRegla }).resolver(pet({ constraints: { region: 'xx-prohibida' } }));
  check('y si la cadena solo tenía al vetado, NO se sale de ella a buscar otro', !soloAlfa.ok && soloAlfa.reason === 'policy_denied');
  const porApp = politicaPorReglas(leerReglas([{ id: 'r-app', source: 'prueba', effect: 'deny', modelId: 'alfa-1', when: { appIds: ['wee-chef'] } }]).reglas);
  check('una regla por PRODUCTO aplica a ese producto, y a uno que no dice cuál es NO', (await resolver({ politica: porApp }).resolver(pet({ appId: 'wee-chef' }))).implementation.providerId === 'beta' && (await resolver({ politica: porApp }).resolver(pet())).implementation.providerId === 'alfa');

  check('NO INVENTAR: sin lista, la política está vacía — y vacía no bloquea nada', leerReglas(undefined).ok && leerReglas(undefined).reglas.length === 0 && politicaPorReglas(SIN_REGLAS).evaluar({ capability: 'x.y', providerId: 'a', modelId: 'b' }).eligible);
  check('una regla SIN FUENTE no es una regla conocida: invalida la lista entera', [[{ ...REGLA, source: '' }], [{ ...REGLA, source: undefined }], [{ ...REGLA, effect: 'allow' }], [{ ...REGLA, pais: 'xx' }], [{ ...REGLA, when: { regions: [] } }], [REGLA, REGLA], 'todo', [7]].every((c) => leerReglas(c).ok === false));
  check('y para quien decida no ejecutar a ciegas con reglas ilegibles, hay una política cerrada', politicaCerrada.evaluar({}).eligible === false && politicaCerrada.evaluar({}).reason === 'policy_unreadable');
  const una = conRegla.evaluar({ capability: 'text.generate', providerId: 'alfa', modelId: 'alfa-1', region: 'xx-prohibida' });
  check('DETERMINISTA: misma entrada y mismas reglas, misma respuesta', JSON.stringify(una) === JSON.stringify(conRegla.evaluar({ capability: 'text.generate', providerId: 'alfa', modelId: 'alfa-1', region: 'xx-prohibida' })));
  const POL = sinComentarios(leer('functions/src/runtime/politica.ts'));
  check('no lee el reloj, no tira dados, no sale a la red y no es asíncrona', !/Date\.now|new Date|Math\.random|fetch\(|require\(|import |async |await |Promise/.test(POL));
  check('no hay lista de países, ni geolocalización, ni servicio externo', !/country|pa[ií]s(es)?\b|geo|ip\b|locale|navigator|https?:/i.test(POL));
  check('y NO repite ningún filtro del Router: ni habilitado, ni estado, ni salud, ni capacidad soportada', !/enabled|status|health|supports|puedeEjecutarse|isConfigured/.test(POL));
  check('la política no reordena ni puntúa: solo quita', !/\.sort\(|score|weight/.test(POL) && !/\.sort\(/.test(sinComentarios(leer('functions/src/runtime/resolucion.ts'))));
  /* Que sea byte a byte el del commit desplegado lo vigila job-queue 63; aquí, que no sepa que esta capa existe. */
  check('el Router del Core NO se tocó para nada de esto: ni sabe que existe la capa', !/PolicyEligibilityPort|politicaPorReglas|runtime\/|ReglaDePolitica/.test(leer('functions/src/core/router.ts')));
}

/* ── D · El contexto viaja por referencia ──────────────────────────────────── */
console.log('\n── D · El trabajo guarda DÓNDE está el contexto, no el contexto ──');
{
  reloj = T0;
  const m = mundo();
  const r = await m.conductor.ejecutar({ principal: { userId: ANA }, trace: traza(), workflow: conReferencia(REF, { locale: 'es-PE' }) });
  const visto = m.adapters.x.llamadas[0].input;
  check('REFERENCIA VÁLIDA: termina, y el proveedor recibe el mensaje y su historial enteros', r.estado === 'terminada' && visto.prompt === SECRETO && visto.history.length === 2 && visto.history[0].text === HISTORIA);
  check('el historial es el ANTERIOR a ese mensaje, con los papeles que espera el motor', visto.history.map((h) => h.role).join(',') === 'user,model' && !visto.history.some((h) => h.text === SECRETO));
  check('y el idioma, que no es de nadie, sí viaja en el trabajo', /es-PE/.test(visto.system));
  const guardado = JSON.stringify([trabajosDe(m), r.run, r.pasos.map((p) => ({ ...p, respuesta: undefined }))]);
  check('el TRABAJO guardado no contiene ni una palabra del mensaje ni del historial', !guardado.includes(SECRETO) && !guardado.includes(HISTORIA) && !guardado.includes('diagnóstico'));
  const guardada = trabajosDe(m)[0].input;
  check('lo que guarda es la referencia: qué conversación y qué mensaje, y el idioma — nada más',
    Object.keys(guardada).sort().join(',') === `${CLAVE_DE_REFERENCIA},locale` && guardada.locale === 'es-PE'
    && Object.keys(guardada[CLAVE_DE_REFERENCIA]).sort().join(',') === 'chatId,kind,messageId' && guardada[CLAVE_DE_REFERENCIA].chatId === REF.chatId && guardada[CLAVE_DE_REFERENCIA].messageId === REF.messageId);
  check('ni su huella de idempotencia lleva el principio del texto', !trabajosDe(m)[0].idempotency.fingerprint.includes('diagn') && !trabajosDe(m)[0].idempotency.fingerprint.includes('mi '));
  check('ni las entregas, ni el rastro del Gateway', !JSON.stringify([m.entregas, m.trazas]).includes(SECRETO));

  reloj = T0;
  const dosVeces = mundo({ adapters: { x: adaptador('x', async (_r, vez) => { if (vez === 1) throw new ProviderError('x respondió 429', 'x', 429, true); return { output: { kind: 'text', content: 'a la segunda' }, costUSD: 0, latencyMs: 1 }; }) }, esperar });
  const rr = await dosVeces.conductor.ejecutar({ principal: { userId: ANA }, trace: traza(), workflow: conReferencia(REF) });
  const [uno, dos] = dosVeces.adapters.x.llamadas;
  check('REINTENTO: el segundo intento resuelve la MISMA referencia y manda exactamente lo mismo', rr.estado === 'terminada' && JSON.stringify(uno.input) === JSON.stringify(dos.input) && dos.input.prompt === SECRETO);
  check('sin depender de la memoria de nadie: la fuente de verdad se leyó otra vez', dosVeces.fuente.lecturas.filter((l) => l.startsWith('dueno:')).length === 2);

  reloj = T0;
  const t = almacen(); const e = ejecuciones(); const f = conversacionDeAna();
  const ad = { x: adaptador('x', contesta('una vez')) };
  const ped = { principal: { userId: ANA }, trace: traza(), workflow: conReferencia(REF) };
  await mundo({ adapters: ad, trabajos: t, ejecuciones: e, fuente: f }).conductor.ejecutar(ped);
  const otra = await mundo({ adapters: ad, trabajos: t, ejecuciones: e, fuente: f, worker: 'w-2' }).conductor.ejecutar(ped);
  check('ENTREGA REPETIDA / OTRO PROCESO: no se ejecuta otra vez, y la referencia sigue ahí', otra.estado === 'terminada' && ad.x.llamadas.length === 1 && t.porId.size === 1);

  const huella = huellaDeEntrada(construirEntrada({ mensaje: { role: 'user', text: SECRETO }, historial: [{ role: 'user', text: HISTORIA }, { role: 'model', text: 'lo recuerdo' }] }));
  const cotizado = await mundo().conductor.ejecutar({ principal: { userId: ANA }, trace: traza(), workflow: conReferencia({ ...REF, quotedInputHash: huella }) });
  check('LO QUE SE COTIZÓ ES LO QUE SE EJECUTA: con la huella de la entrada cotizada, coincide y sale', cotizado.estado === 'terminada' && cotizado.cierre.state === 'done');
  check('la huella es un hash: identifica la entrada sin contener nada suyo', /^[a-f0-9]{64}$/.test(huella) && huella === huellaDeEntrada({ temperature: 0.7, ...construirEntrada({ mensaje: { role: 'user', text: SECRETO }, historial: [{ role: 'user', text: HISTORIA }, { role: 'model', text: 'lo recuerdo' }] }) }));
  const cambiada = conversacionDeAna();
  cambiada.chats.get('chatDeAna0001').mensajes.splice(2, 0, { id: 'msg_colado', role: 'user', text: 'alguien escribió entre medias' });
  const mc = mundo({ fuente: cambiada, esperar });
  const rc = await mc.conductor.ejecutar({ principal: { userId: ANA }, trace: traza(), workflow: conReferencia({ ...REF, quotedInputHash: huella }) });
  check('si la conversación CAMBIÓ entre cotizar y ejecutar, no se ejecuta otra cosa: falla SIN salir hacia el proveedor', rc.cierre.state === 'failed' && rc.pasos[0].error?.details?.reason === 'context_changed' && mc.adapters.x.llamadas.length === 0 && trabajosDe(mc)[0].attempts[0].dispatched === false);
  check('y no se reintenta: no va a cambiar', trabajosDe(mc)[0].attemptCount === 1);

  const sin = mundo({ sinResolutor: true });
  const rs = await sin.conductor.ejecutar({ principal: { userId: ANA }, trace: traza(), workflow: conReferencia(REF) });
  check('SIN RESOLUTOR, una referencia NO se le manda al proveedor como si fuera el encargo', rs.cierre.state === 'failed' && rs.pasos[0].error?.details?.reason === 'context_resolver_missing' && sin.adapters.x.llamadas.length === 0);
  const normal = mundo();
  await normal.conductor.ejecutar({ principal: { userId: ANA }, trace: traza(), workflow: { id: 'wf_normal_1', contract: '1.1', goal: 'x', steps: [{ id: 'pensar', capability: 'text.generate', purpose: 'P', input: { prompt: 'un encargo de tres líneas' } }] } });
  check('y un trabajo SIN referencia sigue como siempre: no hay nada que resolver', normal.adapters.x.llamadas[0].input.prompt === 'un encargo de tres líneas' && normal.fuente.lecturas.length === 0);
}

/* ── E · Seguridad del contexto ────────────────────────────────────────────── */
console.log('\n── E · Saber una referencia no da derecho a leerla ──');
{
  reloj = T0;
  const intento = async (ref, o = {}) => {
    const m = mundo({ ...o, esperar });
    const r = await m.conductor.ejecutar({ principal: { userId: o.quien ?? ANA }, trace: traza(o.quien ?? ANA), workflow: conReferencia(ref) });
    return { m, r, motivo: r.pasos[0]?.error?.details?.reason, llamadas: m.adapters.x.llamadas.length };
  };
  const propia = await intento(REF);
  check('MISMA CUENTA: su conversación, sí', propia.r.cierre.state === 'done' && propia.llamadas === 1);
  const ajena = await intento({ kind: 'brain.message', chatId: 'chatDelOtro0001', messageId: 'msg_7001' });
  check('OTRA CUENTA: la conversación de otro, NO — y el proveedor no se llama', ajena.r.cierre.state === 'failed' && ajena.motivo === 'context_not_found' && ajena.llamadas === 0);
  check('ni se le LEE un mensaje: se comprueba de quién es antes de leer nada suyo', !ajena.m.fuente.lecturas.some((l) => l.startsWith('mensaje:') || l.startsWith('historial:')));
  const inexistente = await intento({ kind: 'brain.message', chatId: 'chatQueNoExiste1', messageId: 'msg_0002' });
  check('REFERENCIA INEXISTENTE: exactamente la MISMA respuesta que la ajena — no se dice ni que exista', inexistente.motivo === ajena.motivo && JSON.stringify(inexistente.r.pasos[0].error) === JSON.stringify(ajena.r.pasos[0].error));
  const cruzada = await intento({ kind: 'brain.message', chatId: 'chatDeAna0001', messageId: 'msg_9001' });
  check('MENSAJE DE OTRA CONVERSACIÓN —aunque sea de la misma persona—: no está en esta', cruzada.motivo === 'context_not_found' && cruzada.llamadas === 0);
  const modificada = await intento({ ...REF, chatId: 'chatDelOtro0001' });
  check('REFERENCIA MODIFICADA: cambiar el chat por el de otro no abre nada', modificada.motivo === 'context_not_found' && modificada.llamadas === 0);
  const respuestaDeWee = await intento({ ...REF, messageId: 'msg_0001_wee' });
  check('una respuesta de Weë no es un mensaje que contestar', respuestaDeWee.motivo === 'context_not_found');

  for (const [nombre, ref] of [
    ['con una barra: `chatId` dejaría de ser un documento y sería una RUTA', { ...REF, chatId: 'chatDeAna0001/messages/x' }],
    ['que sube de carpeta', { ...REF, chatId: '../brainChats' }],
    ['con una clave de más', { ...REF, userId: OTRO }],
    ['de otra clase', { ...REF, kind: 'cualquier.cosa' }],
    ['que no es un objeto', 'chatDeAna0001'],
    ['con una huella que no lo es', { ...REF, quotedInputHash: 'abc' }],
  ]) {
    const x = await intento(ref);
    check(`REFERENCIA MAL FORMADA ${nombre}: se rechaza sin tocar la base de datos`, x.motivo === 'invalid_context_ref' && x.llamadas === 0 && x.m.fuente.lecturas.length === 0, String(x.motivo));
  }
  check('el lector es estricto y devuelve un objeto NUEVO: nada de lo que traía la entrada llega a nadie', leerReferencia({ ...REF }).ok && Object.isFrozen(leerReferencia({ ...REF }).ref) && leerReferencia({ ...REF, extra: 1 }).ok === false);

  const entidades = { vistas: [], async esDeLaCuenta(cuenta, entidad) { this.vistas.push([cuenta, entidad]); return cuenta === ANA && entidad === 'ent_de_ana'; } };
  const conCara = await intento({ ...REF, entityId: 'ent_de_ana' }, { entidades });
  check('ENTIDAD VÁLIDA: actuar con una cara SUYA, sí — y se comprobó contra la cuenta DUEÑA del trabajo', conCara.r.cierre.state === 'done' && JSON.stringify(entidades.vistas[0]) === JSON.stringify([ANA, 'ent_de_ana']));
  const caraAjena = await intento({ ...REF, entityId: 'ent_del_otro' }, { entidades });
  check('ENTIDAD AJENA: con la cara de otro, NO', caraAjena.motivo === 'entity_not_owned' && caraAjena.llamadas === 0);
  const sinQuienCompruebe = await intento({ ...REF, entityId: 'ent_de_ana' });
  check('y sin quien lo compruebe, una cara NO se da por buena', sinQuienCompruebe.motivo === 'entity_not_owned');

  /* EL DUEÑO SALE DEL ALMACÉN. El paquete no lo lleva, y la traza es un dato que viajó: `crear` no exige que coincida con el dueño. */
  const f = conversacionDeAna();
  const resolutor = resolutorDeBrain({ conversaciones: f, construirEntrada, turnos: 12 });
  const vistos = [];
  const ejecutor = crearEjecutor({ gateway: { async ejecutar(p) { vistos.push(p); return { status: 'completed', response: { kind: 'text', content: 'x', actual: { provider: { lines: [], usd: 0 }, latencyMs: 1 } }, implementation: {}, warnings: [] }; } }, ahora: now, repetir: () => () => {}, contexto: resolutor, duenoDelTrabajo: async () => OTRO });
  const paquete = { jobId: 'job-mentiroso', attemptId: 'a-1', attempt: 1, capability: 'text.generate', implementation: { providerId: 'x', modelId: 'x-1' }, input: { [CLAVE_DE_REFERENCIA]: REF }, trace: { traceId: 'trace-m-01', requestId: 'req-m-0001', userId: ANA }, mode: 'sync', idempotencyKey: 'k-0001', timeoutMs: 1000, deadlineAt: reloj + 1000 };
  const informe = await ejecutor.ejecutar(paquete, { renovar: async () => true });
  check('CUENTA SUPLANTADA EN LA TRAZA: la traza dice «Ana», el almacén dice que el trabajo es de otro → manda el ALMACÉN, y no se abre', informe.outcome === 'failed' && informe.dispatched === false && informe.error.details.reason === 'context_not_found' && vistos.length === 0);
  const sinDueno = await crearEjecutor({ gateway: { async ejecutar() { throw new Error('no debería'); } }, ahora: now, repetir: () => () => {}, contexto: resolutor, duenoDelTrabajo: async () => undefined }).ejecutar(paquete, { renovar: async () => true });
  check('un trabajo que el almacén no conoce no resuelve contexto de nadie', sinDueno.outcome === 'failed' && sinDueno.dispatched === false);
  const caida = await crearEjecutor({ gateway: { async ejecutar() { throw new Error('no debería'); } }, ahora: now, repetir: () => () => {}, contexto: { async resolver() { throw new Error('Firestore caído'); } }, duenoDelTrabajo: async () => ANA }).ejecutar(paquete, { renovar: async () => true });
  check('si la fuente de verdad no contesta, NO SALIÓ: se puede reembolsar sin miedo', caida.outcome === 'failed' && caida.dispatched === false && caida.error.details.reason === 'context_unavailable');
}

/* ── F · Credits ───────────────────────────────────────────────────────────── */
console.log('\n── F · Credits, con el Credit Engine DE VERDAD ──');
{
  /* Firestore en memoria, el mismo que usa `credits.test.mjs`: documentos, consultas simples y transacciones atómicas. */
  const INC = Symbol('inc');
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v) && !v[INC];
  const resolve = (value, existing, deep) => {
    if (value && typeof value === 'object' && value[INC] !== undefined) return (typeof existing === 'number' ? existing : 0) + value[INC];
    if (deep && isObj(value)) { const out = isObj(existing) ? { ...existing } : {}; for (const [k, v] of Object.entries(value)) out[k] = resolve(v, out[k], true); return out; }
    return value;
  };
  class Ref { constructor(db, p) { this.db = db; this.path = p; this.id = p.split('/').pop(); } async get() { const data = this.db.read(this.path); return { exists: data !== undefined, id: this.id, ref: this, data: () => data }; } }
  class Coll {
    constructor(db, p, filters = [], max = null) { Object.assign(this, { db, path: p, filters, max }); }
    doc(id) { return new Ref(this.db, `${this.path}/${id || 'auto_' + ++this.db.autoId}`); }
    where(field, _op, value) { return new Coll(this.db, this.path, [...this.filters, [field, value]], this.max); }
    orderBy() { return this; }
    limit(x) { return new Coll(this.db, this.path, this.filters, x); }
    async get() { let rows = [...this.db.docs.entries()].filter(([p]) => p.startsWith(this.path + '/') && !p.slice(this.path.length + 1).includes('/')).filter(([, d]) => this.filters.every(([f, v]) => d[f] === v)); if (this.max) rows = rows.slice(0, this.max); const docs = rows.map(([p, d]) => ({ exists: true, id: p.split('/').pop(), ref: new Ref(this.db, p), data: () => clone(d) })); return { docs, empty: docs.length === 0 }; }
  }
  class Tx { constructor(db) { this.db = db; this.writes = []; } get(t) { return t.get(); } set(ref, data, opts) { this.writes.push({ kind: 'set', ref, data, merge: !!(opts && opts.merge) }); } update(ref, data) { this.writes.push({ kind: 'update', ref, data }); }
    commit() { for (const w of this.writes) { const ex = this.db.docs.get(w.ref.path); if (w.kind === 'set') this.db.docs.set(w.ref.path, resolve(w.data, w.merge ? ex || {} : ex, true)); else { if (!ex) throw new Error('update sobre documento inexistente'); const out = { ...ex }; for (const [k, v] of Object.entries(w.data)) out[k] = resolve(v, out[k], false); this.db.docs.set(w.ref.path, out); } } } }
  class FakeDb { constructor() { this.docs = new Map(); this.queue = Promise.resolve(); this.autoId = 0; } collection(p) { return new Coll(this, p); } read(p) { return this.docs.has(p) ? clone(this.docs.get(p)) : undefined; }
    runTransaction(fn) { const run = async () => { const tx = new Tx(this); const r = await fn(tx); tx.commit(); return r; }; const p = this.queue.then(run, run); this.queue = p.catch(() => {}); return p; } }

  const nuevoBanco = async () => {
    const db = new FakeDb(); let clock = 0;
    const engine = createCreditEngine({ db: () => db, increment: (x) => ({ [INC]: x }), now: () => ++clock, welcomeCredits: 240, loadCosts: async () => {} });
    db.docs.set(`users/doc_${ANA}`, { uid: ANA, displayName: ANA });
    await engine.ensureAccount(ANA);
    const tx = (id) => db.read(`creditTransactions/${id}`);
    return { engine, db, saldo: () => db.read(`users/doc_${ANA}`).creditsBalance, tx, todas: () => [...db.docs.keys()].filter((p) => p.startsWith('creditTransactions/')).map((p) => p.split('/').pop()) };
  };

  /*
   * EL MODELO DE `brainChat`. Es la contabilidad de `creator/brain.ts` (líneas 310 a
   * 509), copiada paso a paso, con UNA diferencia: el reembolso del `catch` solo se
   * hace si el pensador dice que es seguro. Más abajo se comprueba, leyendo el
   * fuente, que `creator/brain.ts` sigue teniendo esta forma — y un CONTROL con la
   * regla de hoy («reembolsar siempre») demuestra por qué hace falta la diferencia.
   */
  const PRECIO = 3;
  const bloque = () => { const vistos = new Map(); let usadas = 0; return { usadas: () => usadas, poner: (u) => { usadas = u; }, contar(id) { if (vistos.has(id)) return vistos.get(id); usadas++; const cobrada = usadas === 12; if (cobrada) usadas = 0; const r = { cobrada }; vistos.set(id, r); return r; } }; };
  const brainChatModelo = async ({ banco, pensador, messageId, webSearch, contador, reembolsarSiempre = false }) => {
    const { engine } = banco; const requestId = `brain_${messageId}`; const service = webSearch ? 'ai_search' : 'ai_brain';
    let spend = null;
    if (webSearch) spend = await engine.spendCredits({ userId: ANA, service, amount: PRECIO, requestId, reason: 'búsqueda', source: 'weë-brain' });
    try {
      const pensado = await pensador.pensar({ kind: 'reply', capability: webSearch ? 'text.search' : 'text.generate', context: {}, trace: { traceId: requestId, requestId, userId: ANA, workplace: 'brain' } });
      if (!webSearch && contador.contar(messageId).cobrada) spend = await engine.spendCredits({ userId: ANA, service, amount: PRECIO, requestId, reason: '12 respuestas', source: 'weë-brain' });
      if (spend) await engine.completeCredits({ userId: ANA, requestId });
      return { ok: true, texto: pensado.response.content, credits: !spend || spend.duplicate ? 0 : spend.amount };
    } catch (error) {
      const seguro = reembolsarSiempre || !(error instanceof FalloDelPensador) || error.reembolsoSeguro;
      if (spend && seguro) await engine.refundCredits({ userId: ANA, requestId, reason: 'no pudo responder', source: 'weë-brain' }).catch(() => {});
      return { ok: false, error, reembolsado: !!spend && seguro };
    }
  };
  const pensadorDe = (m, messageId, webSearch = false) => pensadorSobreConductor({
    conductor: m.conductor, principal: { userId: ANA }, referencia: { kind: 'brain.message', chatId: 'chatDeAna0001', messageId: 'msg_0002' },
    contabilidad: { service: webSearch ? 'ai_search' : 'ai_brain', creditTransactionId: `usage_brain_${messageId}`, creditsEstimated: webSearch ? PRECIO : 0 },
  });

  reloj = T0;
  let banco = await nuevoBanco(); let m = mundo();
  const antes = banco.saldo();
  let r = await brainChatModelo({ banco, pensador: pensadorDe(m, 'm001', true), messageId: 'm001', webSearch: true, contador: bloque() });
  check('BÚSQUEDA, sale bien: se reserva, se ejecuta y se cobra UNA vez', r.ok && r.texto === 'hola, soy Weë' && banco.saldo() === antes - PRECIO && banco.tx('usage_brain_m001').status === 'COMPLETED' && m.adapters.x.llamadas.length === 1);
  check('una sola transacción de uso, ningún reembolso', banco.todas().filter((t) => t.includes('m001')).join(',') === 'usage_brain_m001');

  banco = await nuevoBanco(); m = mundo({ adapters: { x: adaptador('x', async () => { throw new ProviderError('x: rechazo de entrada: sensitive', 'x', 400, false); }) } });
  r = await brainChatModelo({ banco, pensador: pensadorDe(m, 'm002', true), messageId: 'm002', webSearch: true, contador: bloque() });
  check('BÚSQUEDA, el proveedor falla: el pensador dice que reembolsar es SEGURO, y se devuelve entero', !r.ok && r.error instanceof FalloDelPensador && r.error.reembolsoSeguro === true && r.reembolsado && banco.saldo() === antes && banco.tx('usage_brain_m002').status === 'REFUNDED');
  check('y el error que sube es el del Core, con su código: es el que la app sabe leer', r.error.weeError.code === 'CONTENT_POLICY' && !/sensitive/.test(JSON.stringify(r.error.weeError)));

  banco = await nuevoBanco(); m = mundo(); let contador = bloque(); contador.poner(10);
  const once = await brainChatModelo({ banco, pensador: pensadorDe(m, 'm011'), messageId: 'm011', webSearch: false, contador });
  m = mundo();
  const doce = await brainChatModelo({ banco, pensador: pensadorDe(m, 'm012'), messageId: 'm012', webSearch: false, contador });
  check('CONVERSACIÓN: once de cada doce no cobran, y la duodécima cobra el Credit del bloque — igual que hoy', once.ok && once.credits === 0 && doce.ok && doce.credits === PRECIO && banco.saldo() === antes - PRECIO && !banco.tx('usage_brain_m011') && banco.tx('usage_brain_m012').status === 'COMPLETED');

  banco = await nuevoBanco(); contador = bloque(); contador.poner(11);
  m = mundo({ adapters: { x: adaptador('x', async () => { throw new ProviderError('x respondió 500', 'x', 500, false); }) }, esperar });
  r = await brainChatModelo({ banco, pensador: pensadorDe(m, 'm013'), messageId: 'm013', webSearch: false, contador });
  check('CONVERSACIÓN, falla la que cerraba el bloque: ni se cobra ni se gasta el bloque — sin cobro que falte ni de más', !r.ok && banco.saldo() === antes && contador.usadas() === 11 && banco.todas().every((t) => !t.includes('m013')));

  reloj = T0;
  banco = await nuevoBanco(); const t = almacen(); const e = ejecuciones(); const f = conversacionDeAna(); const ad = { x: adaptador('x', contesta('una sola vez')) };
  const primera = await brainChatModelo({ banco, pensador: pensadorDe(mundo({ adapters: ad, trabajos: t, ejecuciones: e, fuente: f }), 'm020', true), messageId: 'm020', webSearch: true, contador: bloque() });
  const repetida = await brainChatModelo({ banco, pensador: pensadorDe(mundo({ adapters: ad, trabajos: t, ejecuciones: e, fuente: f, worker: 'w-2' }), 'm020', true), messageId: 'm020', webSearch: true, contador: bloque() });
  check('EL MISMO MENSAJE OTRA VEZ: ni doble reserva ni doble cobro — la segunda reserva es la misma transacción', primera.ok && banco.saldo() === antes - PRECIO && banco.todas().filter((x) => x.includes('m020')).length === 1);
  check('ni doble ejecución: el proveedor se llamó una vez', ad.x.llamadas.length === 1);
  check('y la repetida NO reembolsa lo que la primera ya cobró: el pensador dice «terminó en otra invocación», no «falló»', !repetida.ok && repetida.error.motivo === 'completed_elsewhere' && repetida.error.reembolsoSeguro === false && !repetida.reembolsado && banco.tx('usage_brain_m020').status === 'COMPLETED');

  /* DOS INVOCACIONES A LA VEZ: el caso que la regla de hoy resolvería MAL. */
  const carrera = async (reembolsarSiempre) => {
    reloj = T0;
    const b = await nuevoBanco(); const tt = almacen(); const ee = ejecuciones(); const ff = conversacionDeAna();
    const lento = { x: adaptador('x', async () => { await new Promise((ok) => setTimeout(ok, 40)); return { output: { kind: 'text', content: 'respuesta entregada' }, costUSD: 0.001, latencyMs: 40 }; }) };
    const una = brainChatModelo({ banco: b, pensador: pensadorDe(mundo({ adapters: lento, trabajos: tt, ejecuciones: ee, fuente: ff, worker: 'w-a' }), 'm030', true), messageId: 'm030', webSearch: true, contador: bloque(), reembolsarSiempre });
    await new Promise((ok) => setTimeout(ok, 10));
    const otra = brainChatModelo({ banco: b, pensador: pensadorDe(mundo({ adapters: lento, trabajos: tt, ejecuciones: ee, fuente: ff, worker: 'w-b' }), 'm030', true), messageId: 'm030', webSearch: true, contador: bloque(), reembolsarSiempre });
    const [ra, rb] = await Promise.all([una, otra]);
    return { b, ra, rb, llamadas: lento.x.llamadas.length };
  };
  const bien = await carrera(false);
  check('DOS A LA VEZ: el proveedor se llama UNA vez, y una de las dos entrega la respuesta', bien.llamadas === 1 && [bien.ra, bien.rb].filter((x) => x.ok).length === 1);
  check('la que no ejecutó NO reembolsa: su trabajo está en marcha en otro proceso', [bien.ra, bien.rb].filter((x) => !x.ok).every((x) => x.error.reembolsoSeguro === false && !x.reembolsado));
  check('resultado: respuesta entregada y COBRADA una vez. Ni de más, ni de menos', bien.b.saldo() === antes - PRECIO && bien.b.tx('usage_brain_m030').status === 'COMPLETED' && !bien.b.tx('refund_brain_m030'));
  const mal = await carrera(true);
  check('CONTROL — con la regla de HOY («reembolsar siempre que el pensador lance») la misma carrera ENTREGA LA RESPUESTA GRATIS', [mal.ra, mal.rb].some((x) => x.ok) && mal.b.tx('usage_brain_m030').status === 'REFUNDED' && mal.b.saldo() === antes, `${mal.b.tx('usage_brain_m030').status} · saldo ${mal.b.saldo()}`);
  check('y sin ningún error a la vista: `completeCredits` sobre una transacción reembolsada no hace nada ni avisa', [mal.ra, mal.rb].filter((x) => x.ok).length === 1);

  reloj = T0;
  banco = await nuevoBanco(); m = mundo({ gateway: { async ejecutar() { throw new Error('se cayó la red a media llamada'); } }, esperar });
  r = await brainChatModelo({ banco, pensador: pensadorDe(m, 'm040', true), messageId: 'm040', webSearch: true, contador: bloque() });
  check('SALIÓ Y NO SE SABE: no se reembolsa ni se cobra — la reserva se queda AUTHORIZED, como hoy cuando el proceso muere', !r.ok && r.error.motivo === 'outcome_unknown' && r.error.reembolsoSeguro === false && banco.tx('usage_brain_m040').status === 'AUTHORIZED' && banco.saldo() === antes - PRECIO);

  const invalida = await brainChatModelo({ banco: await nuevoBanco(), pensador: pensadorSobreConductor({ conductor: mundo().conductor, principal: { userId: OTRO }, referencia: REF }), messageId: 'm050', webSearch: true, contador: bloque() });
  check('una ejecución que no llega ni a empezar es segura de reembolsar: nada salió', !invalida.ok && invalida.error.reembolsoSeguro === true && invalida.reembolsado);

  /* El modelo de arriba solo vale mientras `creator/brain.ts` tenga esa forma. */
  const BRAIN = sinComentarios(leer('functions/src/creator/brain.ts'));
  check('`creator/brain.ts` sigue reservando la búsqueda ANTES de llamar al modelo', BRAIN.indexOf('if (webSearch) {') < BRAIN.indexOf('engine.generate(') && /if \(webSearch\) \{\s*spend = await creditEngine\.spendCredits\(/.test(BRAIN));
  /* + revisión post-auditoría 2026-10-01: entre contar y cobrar se apunta que ESTA invocación contó (queHacerConElCobro). */
  check('sigue cobrando la conversación DESPUÉS de responder, por bloques', /const consumo = await contarRespuesta\(uid, messageId\);\s*contadaAqui = true;\s*if \(consumo\.cobrada\)/.test(BRAIN) && BRAIN.indexOf('contarRespuesta(uid, messageId)') > BRAIN.indexOf('engine.generate('));
  check('sigue completando solo si hubo cobro', /if \(spend\) \{\s*await creditEngine\.completeCredits\(/.test(BRAIN));
  /*
   * ESTA COMPROBACIÓN CAMBIÓ CON EL CANARY (F12-D), y es el cambio que este
   * archivo pedía: el `catch` ya no reembolsa por el hecho de que algo lanzara.
   * Reembolsa lo que se cobró Y SOLO cuando devolverlo es seguro.
   */
  /*
   * Y lo mira donde hay que mirarlo: en lo que GUARDÓ el pensador, no en el
   * error que llega al `catch`. Weë Brain atrapa lo que lance el pensador y lo
   * sustituye por uno suyo, así que preguntarle al error que llega sería
   * preguntarle al mensajero — y la regla no se activaría nunca.
   */
  /*
   * + revisión post-auditoría 2026-10-01: la decisión la toma `queHacerConElCobro` (que además no devuelve una respuesta ya
   * ENTREGADA). Reembolsar sigue exigiendo que devolver sea seguro: lo prueba ejecutándola brain-canary y reservas-abandonadas.
   */
  check('y su `catch` reembolsa lo cobrado SOLO cuando devolverlo es seguro', /const devolverEsSeguro = !falloDelConductor \|\| falloDelConductor\.reembolsoSeguro;\s*const cobro = queHacerConElCobro\(\{ cobrado: !!spend, entregada, devolverEsSeguro, contadaAqui \}\);/.test(BRAIN)
    && /\} else if \(spend && cobro\.reembolsar\) \{\s*await creditEngine\.refundCredits\(/.test(BRAIN));
  check('el fallo del conductor se guarda en el pensador, porque Weë Brain lo tapa', /if \(error instanceof FalloDelPensador\) falloDelConductor = error;/.test(BRAIN) && /catch \(error\) \{\s*return fallar\('PROVIDER_ERROR', 'thinker_failed'/.test(sinComentarios(leer('functions/src/core/brain.ts'))));
  check('un camino que no pasa por el conductor lo deja sin tocar: se reembolsa como siempre', !/falloDelConductor =/.test(BRAIN.slice(BRAIN.indexOf('const pensadorDeSiempre'), BRAIN.indexOf('const pensadorDelConductor'))));
  check('Weë Brain YA ESTÁ CONECTADO al conductor, y solo para el canary de texto', /pensadorSobreConductor|conductorDeWee/.test(BRAIN) && /CAPACIDAD_DEL_CANARY: CapabilityId = 'text\.generate'/.test(BRAIN));
  check('la política de precio no cambió: doce respuestas por un Credit', /RESPUESTAS_POR_CREDIT/.test(BRAIN) && /RESPUESTAS_POR_CREDIT = 12/.test(leer('functions/src/creator/brainUsage.ts')));
}

/* ── G · Estructura ────────────────────────────────────────────────────────── */
console.log('\n── G · Qué se añadió, qué se tocó a propósito y qué sigue sin conectar ──');
{
  const dir = 'functions/src/runtime';
  check('cuatro archivos nuevos en el runtime: contexto, conversaciones, política y pensador', ['contexto.ts', 'conversaciones.ts', 'politica.ts', 'pensador.ts'].every((f) => fs.existsSync(path.resolve(RAIZ, dir, f))));
  const CONV = sinComentarios(leer(`${dir}/conversaciones.ts`));
  check('el puerto de conversaciones es de SOLO LECTURA: no tiene ni una escritura', !/\.set\(|\.update\(|\.create\(|\.delete\(|\.add\(|batch\(|runTransaction/.test(CONV));
  check('y no es otro almacén: lee `brainChats`, que ya existe', /const COLECCION = 'brainChats'/.test(leer(`${dir}/conversaciones.ts`)));
  check('contexto, política y pensador no saben de Firestore', ['contexto.ts', 'politica.ts', 'pensador.ts'].every((f) => !/firebase|firestore/i.test(sinComentarios(leer(`${dir}/${f}`)))));
  check('el pensador no cobra, no reserva y no reembolsa: solo dice si reembolsar es seguro', !/spendCredits|completeCredits|refundCredits|creditEngine/.test(sinComentarios(leer(`${dir}/pensador.ts`))) && /reembolsoSeguro/.test(leer(`${dir}/pensador.ts`)));
  check('la regla de entidades es la MISMA que usa la moderación, no otra', /actorDeLaCuenta/.test(leer(`${dir}/conversaciones.ts`)) && /actorDeLaCuenta/.test(leer('functions/src/moderation/index.ts')));
  const vivos = ['functions/src/index.ts', 'functions/src/creator/index.ts', 'functions/src/creator/brain.ts', 'functions/src/creator/video.ts', 'functions/src/gateway/index.ts', 'functions/src/engine/index.ts', 'functions/src/generateAvatar.ts'];
  /*
   * DE «NADIE ENTRA» A «ENTRA UNO Y SE SABE CUÁL». El canary de F12-D conectó
   * `brainChat` con `text.generate`. La guarda se estrecha en vez de quitarse:
   * un segundo módulo vivo que importe el runtime hace fallar esto.
   */
  const conPuerta = vivos.filter((f) => /decidirRuntime/.test(sinComentarios(leer(f))));
  check('DOS ENTRADAS AL RUNTIME, y las dos son canaries declarados: `brainChat` (texto) y `generateVideo` (vídeo)', conPuerta.join(',') === 'functions/src/creator/brain.ts,functions/src/creator/video.ts', conPuerta.join(','));
  check('no se tocó el Financial Core ni el Credit Engine', !/runtime/.test(leer('functions/src/credits/creditEngine.ts')));
  /*
   * De una fase cerrada se tocaron DOS cosas en F12-D, las dos del Gateway y
   * las dos autorizadas: `leerTraza` y el camino de `accepted`. S2 añadió una
   * tercera, también en el Gateway y también autorizada —la clave `creative` de
   * las pistas—, y tiene su propia comprobación. Lo que se vigila aquí es que
   * cada una siga teniendo la suya: una fase que toque el Gateway sin dejar
   * nombre hace fallar esto.
   */
  /*
   * Lo que importa es que las CUATRO sigan existiendo con su número, no cómo
   * estén redactadas. Escrito contra la frase entera, esto se rompía cada vez
   * que una fase legítima reformulaba un guard —C2 amplió 63f de «UNA clave»
   * a «las claves que haya»— y eso convierte una vigilancia en una molestia
   * que alguien acaba borrando.
   */
  check('lo tocado de una fase cerrada está vigilado una por una en job-queue 63b–63f', (() => {
    const jq = leer('functions/test/job-queue.test.mjs');
    return ['63b', '63c', '63e', '63f'].every((id) => new RegExp(`check\\('${id}\\) `).test(jq))
      && /63b\) del Gateway cambió `leerTraza`/.test(jq)
      && /63c\) y se completó `accepted`/.test(jq);
  })());
  check('esta suite está en la cadena de `npm test`', /runtime-premigracion\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
