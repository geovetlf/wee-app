/**
 * `allowMockFallback` — LA MITIGACIÓN DE LA DECISIÓN A, DEMOSTRADA (B4-03, 2026-10-14). Nada de producción se toca:
 * esto es lo que HARÍA apagar el modo demo, medido sobre el código, con el Credit Engine de verdad y una Firestore en
 * memoria. Usa el compilado (`npm run build` antes). Sin red, sin claves, sin proveedor real.
 *
 *   A  EL MOTOR, capacidad por capacidad (todas las de `DEFAULT_ROUTING`). Con el demo permitido, cada una contesta
 *      de muestra y vale 0 Credits (el invariante de B4-03: lo simulado no se cobra, para NINGUNA capacidad). Con el
 *      demo apagado, ninguna entrega muestra: `NOT_AVAILABLE`. `world.generate` no es del demo en ningún caso.
 *   B  `creatorRun` de punta a punta con dinero real. Demo permitido: termina de muestra y la reserva se devuelve
 *      entera. Demo apagado: falla como «no disponible», la reserva se devuelve entera y no se ejecuta ni una
 *      generación. CONTROL: con un proveedor real configurado y el demo apagado, la creación SIGUE funcionando y
 *      cobra (la mitigación no mata lo real).
 *   C  Weë Brain con el demo apagado: «no disponible», sin cobro y sin avanzar el bloque.
 *   D  Lo que NO protege (hay que decirlo): si el motor no puede LEER la configuración vuelve a los valores por
 *      defecto y el demo vuelve a estar permitido. La mitigación solo en Firestore no es a prueba de una caída;
 *      cambiar el valor por defecto en código sí lo sería, y eso exige despliegue y la decisión del dueño.
 */
import net from 'node:net';
import { BaseEnMemoria, instalarLaBase, darDeAlta, saldoDe, lib } from './_firestore-en-memoria.mjs';
import { acelerarLasEsperasCortas, apuntarLaConsola } from './_aceptacion.mjs';

const CLAVES = ['ANTHROPIC_API_KEY', 'ARK_API_KEY', 'BFL_API_KEY', 'DEEPSEEK_API_KEY', 'ELEVENLABS_API_KEY', 'FAL_KEY',
  'GEMINI_API_KEY', 'MINIMAX_API_KEY', 'OPENAI_API_KEY', 'SEEDANCE_CALLBACK_TOKEN'];
for (const k of [...CLAVES, 'GOOGLE_APPLICATION_CREDENTIALS', 'FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST', 'GOOGLE_CLOUD_PROJECT']) delete process.env[k];
process.env.GCLOUD_PROJECT = 'demo-mock-fallback';
process.env.METADATA_SERVER_DETECTION = 'none';
const intentosDeRed = [];
globalThis.fetch = async (u) => { intentosDeRed.push(`fetch ${String(u).slice(0, 80)}`); throw new Error('sin red'); };
const conectarOriginal = net.Socket.prototype.connect;
net.Socket.prototype.connect = function () { intentosDeRed.push('socket'); throw new Error('sin red'); };

let base = new BaseEnMemoria();
instalarLaBase(() => base);
acelerarLasEsperasCortas();
const consola = apuntarLaConsola();

const { engine } = lib('engine/index.js');
const cfg = lib('engine/config.js');
const { DEFAULT_ROUTING, DEFAULT_SETTINGS, ADAPTERS } = lib('engine/registry.js');
const creator = lib('creator/index.js');
const brain = lib('creator/brain.js');
const lim = lib('creator/chatLimite.js');
const { RESPUESTAS_POR_CREDIT } = lib('creator/brainUsage.js');

let fallo = 0;
const check = (nombre, ok, evidencia = '') => { if (!ok) fallo++; process.stdout.write(`${ok ? '✔' : '✘'} ${nombre}${evidencia ? ` · ${evidencia}` : ''}\n`); };
const UID = 'DemoAnaAAAAAAAAAAAAAAAAAAAA1';

/* Cada prueba empieza de cero: base nueva, el demo en el valor que se pide (o el de partida si no se dice) y sin caché de configuración. */
const mundo = async ({ demo, conCuenta = true } = {}) => {
  base = new BaseEnMemoria();
  if (conCuenta) await darDeAlta(base, UID);
  base.docs.set('aiSettings/chat', { porMinuto: 30, porDia: 300, nuevosPorDia: 100 });
  if (demo !== undefined) base.docs.set('aiSettings/global', { allowMockFallback: demo });
  cfg.invalidateConfig();
  lim.olvidarLimitesDelChat();
};

/* ══ A · el motor, capacidad por capacidad ═══════════════════════════════════════════════════════════════════════ */
check('A0 el valor de partida de `allowMockFallback` es true (DECISIÓN A del dueño, pendiente: si cambia, esta cerca cambia con él)', DEFAULT_SETTINGS.allowMockFallback === true);
const capacidades = Object.keys(DEFAULT_ROUTING);
check('A1 el registro tiene las capacidades que se esperan (29), para que una nueva no escape de esta prueba', capacidades.length === 29, `capacidades=${capacidades.length}`);

const ENTRADAS = { 'image.edit': { prompt: 'x', imageUrl: 'https://x.test/a.png' } };
const probar = async (capability, demo) => {
  await mundo({ demo, conCuenta: false });
  try {
    const r = await engine.generate({
      capability, input: ENTRADAS[capability] || { prompt: 'una prueba', text: 'una prueba', content: 'una prueba' },
      userId: UID, jobId: 'j1', stepId: 's1', experienceId: 'chef', goal: 'prueba', requestId: `j1:${capability}:${demo}`,
    });
    return { ok: true, demo: r.demo, credits: r.credits, provider: r.provider };
  } catch (e) {
    return { ok: false, codigo: e?.code, motivo: e?.details?.reason };
  }
};
const conDemo = [];
const sinDemo = [];
for (const c of capacidades) { conDemo.push([c, await probar(c, true)]); sinDemo.push([c, await probar(c, false)]); }
const delDemo = conDemo.filter(([c]) => c !== 'world.generate');
check('A2 con el demo permitido, TODA capacidad contesta de muestra (provider mock, demo true)', delDemo.every(([, r]) => r.ok && r.demo === true && r.provider === 'mock'),
  JSON.stringify(delDemo.filter(([, r]) => !(r.ok && r.demo === true)).map(([c]) => c)));
check('A3 …y lo de muestra vale 0 Credits, para TODAS (el invariante de B4-03)', delDemo.every(([, r]) => r.credits === 0), JSON.stringify(delDemo.filter(([, r]) => r.credits !== 0).map(([c, r]) => [c, r.credits])));
check('A4 con el demo apagado, NINGUNA capacidad entrega muestra: todas son «no disponible»',
  sinDemo.every(([, r]) => !r.ok && r.codigo === 'NOT_AVAILABLE' && r.motivo === 'no_disponible'), JSON.stringify(sinDemo.filter(([, r]) => r.ok).map(([c]) => c)));
const mundoNoEsDemo = conDemo.find(([c]) => c === 'world.generate')[1];
check('A5 `world.generate` no es una capacidad del demo ni con el demo permitido (3D real o nada)', !mundoNoEsDemo.ok && mundoNoEsDemo.codigo === 'NOT_AVAILABLE');
check('A6 las capacidades SIN proveedor en su cadena (compose, montage, vertical, doc.render) solo funcionan hoy como muestra',
  ['video.compose', 'video.montage', 'video.vertical', 'doc.render'].every((c) => DEFAULT_ROUTING[c].chain.length === 0
    && conDemo.find(([x]) => x === c)[1].demo === true && !sinDemo.find(([x]) => x === c)[1].ok));

/* ══ B · creatorRun de punta a punta, con dinero real ═══════════════════════════════════════════════════════════ */
const chat = (data) => creator.creatorChat.run({ auth: { uid: UID }, data: { locale: 'es', ...data } });
const planear = async (experienceId, goal) => {
  let r = await chat({ experienceId, goal });
  for (let vueltas = 0; r.status === 'asking' && vueltas < 12; vueltas++) {
    const q = r.question;
    const answer = q.options?.length ? { questionId: q.id, optionId: q.options[0].id } : { questionId: q.id, text: 'Texto libre de prueba' };
    r = await chat({ jobId: r.jobId, answer });
  }
  return r;
};
const correr = (jobId) => creator.creatorRun.run({ auth: { uid: UID }, data: { jobId } }).then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));
const usos = () => base.de('creditTransactions').filter((t) => t.type === 'usage');
let llamadasAlMock = 0;
const mockRun = ADAPTERS.mock.run;
ADAPTERS.mock.run = async (...a) => { llamadasAlMock++; return mockRun.apply(ADAPTERS.mock, a); };

await mundo();
{
  const plan = await planear('chef', 'Una receta fácil para cenar');
  llamadasAlMock = 0;
  const r = await correr(plan.jobId);
  const t = base.leer(`creatorJobs/${plan.jobId}`);
  check('B1 demo permitido: la creación termina y es de muestra', r.ok && t.status === 'done' && t.demo === true, `${t.status} demo=${t.demo}`);
  check('B2 …no cobra nada: el trabajo dice 0 y el saldo queda en 240', t.creditsCharged === 0 && saldoDe(base, UID) === 240, `cobrado=${t.creditsCharged} saldo=${saldoDe(base, UID)}`);
  check('B3 …y la reserva se devuelve ENTERA (el asiento de uso queda REFUNDED, ninguno COMPLETED)', usos().length === 1 && usos()[0].status === 'REFUNDED', JSON.stringify(usos().map((u) => u.status)));
  check('B4 …todos sus resultados están marcados de muestra', t.results.length > 0 && t.results.every((x) => x.demo === true), `resultados=${t.results.length}`);
}
await mundo({ demo: false });
{
  const plan = await planear('chef', 'Una receta fácil para cenar');
  llamadasAlMock = 0;
  const r = await correr(plan.jobId);
  const t = base.leer(`creatorJobs/${plan.jobId}`);
  check('B5 demo apagado, sin proveedor real: creatorRun falla como «no disponible» (no entrega muestra)', !r.ok && r.e?.details?.code === 'NOT_AVAILABLE', JSON.stringify(r.e?.details));
  check('B6 …el trabajo queda `failed`, sin ningún resultado', t.status === 'failed' && (t.results || []).length === 0, `${t.status} resultados=${(t.results || []).length}`);
  check('B7 …no cobra: saldo 240 y la reserva devuelta entera', saldoDe(base, UID) === 240 && usos().length === 1 && usos()[0].status === 'REFUNDED', `saldo=${saldoDe(base, UID)} ${JSON.stringify(usos().map((u) => u.status))}`);
  check('B8 …y no se ejecutó ni una generación de muestra (ningún proveedor llamado, ninguna fila en el libro)', llamadasAlMock === 0 && base.de('aiGenerations').length === 0, `mock=${llamadasAlMock} libro=${base.de('aiGenerations').length}`);
  check('B9 …el mensaje a la persona no nombra proveedores ni «demo»', !/mock|demo|gemini|openai|claude|flux|seedance/i.test(String(r.e?.message)), String(r.e?.message));
}
/* CONTROL: un proveedor real configurado, el demo apagado: la mitigación no mata lo real. */
const original = { isConfigured: ADAPTERS.gemini.isConfigured, run: ADAPTERS.gemini.run };
const conRealidad = () => {
  ADAPTERS.gemini.isConfigured = () => true;
  ADAPTERS.gemini.run = async (r) => mockRun.call(ADAPTERS.mock, r);
};
const sinRealidad = () => { ADAPTERS.gemini.isConfigured = original.isConfigured; ADAPTERS.gemini.run = original.run; };
await mundo({ demo: false });
conRealidad();
{
  const plan = await planear('writer', 'Un cuento corto para dormir');
  const r = await correr(plan.jobId);
  const t = base.leer(`creatorJobs/${plan.jobId}`);
  check('B10 CONTROL: con un proveedor real y el demo apagado, la creación SIGUE funcionando (no es de muestra)', r.ok && t.status === 'done' && t.demo === false && t.results.every((x) => x.demo !== true), `${t.status} demo=${t.demo}`);
  check('B11 CONTROL: …y cobra lo cotizado (la reserva se COMPLETA y el saldo baja)', usos().length === 1 && usos()[0].status === 'COMPLETED' && t.creditsCharged > 0 && saldoDe(base, UID) === 240 - t.creditsCharged, `cobrado=${t.creditsCharged} saldo=${saldoDe(base, UID)} ${JSON.stringify(usos().map((u) => u.status))}`);
}
sinRealidad();

/* ══ C · Weë Brain con el demo apagado ═══════════════════════════════════════════════════════════════════════════ */
await mundo({ demo: false });
{
  const enviar = (data) => brain.brainChat.run({ auth: { uid: UID }, data: { locale: 'es', ...data } }).then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));
  const r = await enviar({ message: 'hola', messageId: 'c1_msg_1' });
  check('C1 Brain con el demo apagado y sin proveedor real: «no disponible» (no responde de muestra)', !r.ok && r.e?.details?.code === 'NOT_AVAILABLE', JSON.stringify(r.e?.details));
  check('C2 …sin ningún cobro y sin avanzar el bloque de doce', usos().length === 0 && saldoDe(base, UID) === 240 && (base.leer(`brainUsage/${UID}`)?.respuestasTotales ?? 0) === 0,
    `asientos=${usos().length} saldo=${saldoDe(base, UID)} totales=${base.leer(`brainUsage/${UID}`)?.respuestasTotales}`);
  const b = await enviar({ message: 'busca algo', messageId: 'c1_busq', webSearch: true });
  check('C3 …y una búsqueda tampoco cobra (su reserva se devuelve) cuando no hay proveedor', !b.ok && usos().every((u) => u.status === 'REFUNDED') && saldoDe(base, UID) === 240, `${JSON.stringify(usos().map((u) => u.status))} saldo=${saldoDe(base, UID)}`);
  check('C4 el bloque de doce no cambia (sigue en cero)', RESPUESTAS_POR_CREDIT === 12 && (base.leer(`brainUsage/${UID}`)?.respuestasTotales ?? 0) === 0);
}

/* ══ D · lo que esta mitigación NO protege ═══════════════════════════════════════════════════════════════════════ */
{
  base = new BaseEnMemoria();
  base.docs.set('aiSettings/global', { allowMockFallback: false });
  cfg.invalidateConfig();
  const original = base.collection.bind(base);
  base.collection = (p) => { if (p === 'aiProviders' || p === 'aiRouting') throw new Error('Firestore caído'); return original(p); };
  const c = await cfg.loadConfig(true);
  check('D1 si el motor no puede LEER la configuración, vuelve a los valores por defecto y el demo vuelve a estar permitido',
    c.settings.allowMockFallback === DEFAULT_SETTINGS.allowMockFallback && c.source === 'defaults', `allowMockFallback=${c.settings.allowMockFallback} fuente=${c.source}`);
  base.collection = original;
  cfg.invalidateConfig();
}

/* ══ Cierre ══════════════════════════════════════════════════════════════════════════════════════════════════════ */
check('ninguna conexión fuera del proceso', intentosDeRed.length === 0, `intentos=${intentosDeRed.length}`);
net.Socket.prototype.connect = conectarOriginal;
ADAPTERS.mock.run = mockRun;
sinRealidad();
consola.restaurar();
process.stdout.write(fallo ? `\n✘ ${fallo} comprobación(es) fallaron\n` : '\n✔ Con el demo apagado nada se entrega de muestra ni se cobra; con el demo permitido lo simulado vale 0\n');
process.exit(fallo ? 1 : 0);
