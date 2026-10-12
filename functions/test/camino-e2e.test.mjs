/**
 * R7 · K · EL CAMINO DE UNA PETICIÓN, EJECUTADO (R-11 de docs/INTEGRACION-FLUJO-E2E.md).
 *
 * La tarea H (mapa de integración, ronda R7) midió con sondas, EN MEMORIA y SIN RED, qué camino recorre de verdad una petición:
 * qué puertas del Core están cerradas y cuáles atienden, que las cajas de siempre completan sin tocar el Core, qué hace Weë Brain por
 * cada camino y qué pasa en el Gateway del conductor. Esas sondas vivían fuera del repositorio. Esta suite las promueve a la cadena,
 * para que «CONECTADO» y «AISLADO» dejen de depender de leer código:
 *
 *   A · Las puertas del Core (S1): cerradas por defecto, de una en una, y solo tres.
 *   B · El camino de siempre (S4): `creatorChat` → `creatorRun` con el Credit Engine real; completa y NO toca el Core.
 *   C · Weë Brain por los dos caminos (S5): misma respuesta, y el trabajo del Core que el barrido no puede cerrar (B-05).
 *   D · `generateVideo` con la puerta cerrada (S6): el camino de siempre.
 *   E · El Gateway del conductor sin resolutores de material (S3 · B-06).
 *   F · Nada salió a la red.
 *
 * Lo que hay aquí es de verdad: el Credit Engine, el libro `aiGenerations`, el router, el limitador, los callables (`creatorChat`,
 * `creatorRun`, `brainChat`, `generateVideo`), el conductor, el Job Engine, el barrendero. Lo de mentira: Firestore (en memoria), el
 * Storage (solo sabe el tamaño de una foto) y el proveedor: ninguna clave, así que el router cae al proveedor de PRUEBA; y en C, un
 * doble de DeepSeek. Cualquier intento de salir a la red, de usar un proveedor real o de escribir en el Storage FALLA la suite.
 *
 * ── Lo que NO es un arreglo ─────────────────────────────────────────────────────────────────────────────────────────────────────
 * Dos cosas de aquí fijan un comportamiento que hoy es el INDESEADO, con su etiqueta, para que quien lo cambie lo vea y decida:
 *   · «BLOCKED — HUMAN DECISION · B-06» (E): el Gateway del conductor deja pasar al proveedor un paso que depende de otro SIN el
 *     material del anterior y sin fallar. Arreglarlo (R-05) mueve cercas y cablea resolutores: lo decide una persona.
 *   · «BLOCKED — HUMAN DECISION · B-05» (C): una respuesta GRATIS de Weë Brain por el Core deja un trabajo que el barrido no sabe
 *     cerrar (`TRANSACTION_NOT_FOUND`, cada 5 minutos). Arreglarlo (R-04) exige reanclar cercas.
 * Cuando una de las dos se resuelva, esa comprobación falla A PROPÓSITO y su mensaje dice qué hay que actualizar.
 *
 * Rápida (unos 8 s: casi todo es el proveedor de prueba, que duerme 0,6–1,1 s por generación a propósito), determinista (la salida
 * es idéntica en cada corrida: se comprobó con doce seguidas) y sin emulador. Usa el compilado: `npm run build` antes de `npm test`.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { crearFirestoreEnMemoria } from './_firestore-en-memoria-camino.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

/*
 * Lo que se imprime es lo de la suite. El ruido del servidor (trazas del Gateway y de Brain, avisos de trabajos que fallan a
 * propósito, con sus pilas y rutas) se guarda aparte y solo se enseña si algo falla: así la salida es la misma en cada corrida y en
 * cada máquina.
 */
const imprimir = console.log.bind(console);
const ruido = [];
for (const m of ['log', 'info', 'warn', 'debug', 'error']) console[m] = (...args) => { ruido.push(`[${m}] ${args.map(String).join(' ')}`); };

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; imprimir((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const seccion = (titulo) => imprimir(`\n── ${titulo} ──`);
const intento = async (fn) => { try { return { ok: true, valor: await fn() }; } catch (error) { return { ok: false, error }; } };
const codigo = (r) => (r.ok ? 'ok' : `${r.error?.code ?? '?'}/${r.error?.details?.code ?? r.error?.details?.reason ?? ''}`);

/* ═══ SIN RED, SIN PROVEEDORES, SIN ESCRIBIR EN NINGÚN SITIO ═══════════════════════════════════════════════════════════════════ */
process.env.STORAGE_BUCKET = 'demo-wee.appspot.com';
const intentosDeRed = [];
globalThis.fetch = async (url) => { intentosDeRed.push(String(url).slice(0, 80)); throw new Error(`PRUEBA SIN RED: ${String(url).slice(0, 80)}`); };

const fa = require('firebase-admin/firestore');
const { base, instalar } = crearFirestoreEnMemoria(fa);
instalar();

/* El Storage de mentira: solo sabe lo que midió la app al subir la foto (su tamaño). Escribir o descargar, no. */
const storage = require('firebase-admin/storage');
const escrituraEnElStorage = [];
storage.getStorage = () => ({
  bucket: (nombre) => ({
    name: nombre ?? 'demo-wee.appspot.com',
    file: (ruta) => ({
      getMetadata: async () => [{ metadata: { width: '1024', height: '768' } }],
      download: async () => { throw new Error('PRUEBA SIN RED: download'); },
      save: async () => { escrituraEnElStorage.push(ruta); throw new Error('PRUEBA SIN RED: save'); },
      createWriteStream: () => { escrituraEnElStorage.push(ruta); throw new Error('PRUEBA SIN RED: createWriteStream'); },
    }),
  }),
});

const registry = lib('engine/registry.js');
const sinProveedor = (id) => async () => { throw new Error(`PRUEBA SIN RED: se intentó usar el proveedor «${id}»`); };
for (const [id, adaptador] of Object.entries(registry.ADAPTERS)) {
  if (id === 'mock') continue;
  adaptador.isConfigured = () => false;
  adaptador.run = sinProveedor(id);
}
/* El doble de DeepSeek, solo durante C: DeepSeek «configurado» y sin red. Con él puesto, `text.generate` deja de admitir el demo. */
const deepseek = registry.ADAPTERS.deepseek;
const llamadasDeDeepseek = [];
const instalarDeepseek = () => {
  deepseek.isConfigured = () => true;
  deepseek.run = async (req) => {
    llamadasDeDeepseek.push(req.capability);
    return { output: { kind: 'text', content: `Respuesta de prueba nº ${llamadasDeDeepseek.length}.\n\n[[WEE:design]]`, sources: [] }, usage: { inputTokens: 12, outputTokens: 9 }, costUSD: 0.0004, latencyMs: 3, model: req.model.id };
  };
};
const quitarDeepseek = () => { deepseek.isConfigured = () => false; deepseek.run = sinProveedor('deepseek'); };

/* ═══ Las piezas de verdad ═════════════════════════════════════════════════════════════════════════════════════════════════════ */
const { creditEngine } = lib('credits/creditEngine.js');
const creatorMod = lib('creator/index.js');
const brainMod = lib('creator/brain.js');
const videoMod = lib('creator/video.js');
const engineMod = lib('engine/index.js');
const rt = lib('runtime/index.js');
const { almacenDeTrabajos } = lib('runtime/almacen.js');
const { olvidarLaPuerta } = lib('runtime/configuracion.js');
const { decidirRuntime } = lib('runtime/puerta.js');

/* Instrumentos: contar, sin cambiar nada, cuántas veces entra una petición al router vivo. */
const contar = (objeto, nombre) => {
  const original = objeto[nombre];
  const cuenta = { n: 0 };
  objeto[nombre] = function envuelta(...args) { cuenta.n++; return original.apply(this, args); };
  return cuenta;
};
const alRouterVivo = contar(engineMod.engine, 'generate');
const alRouterParaDecidir = contar(engineMod.engine, 'route');

/* ═══ Cuentas, colecciones y saldos ════════════════════════════════════════════════════════════════════════════════════════════ */
const UID = 'AbCdEfGhIjKlMnOpQrStUvWxYz01';
const OTRO = 'ZyXwVuTsRqPoNmLkJiHgFeDcBa99';
const SALDO = 5000;
for (const uid of [UID, OTRO]) {
  base.docs.set(`users/doc_${uid}`, { uid, displayName: uid });
  await creditEngine.ensureAccount(uid);
  base.docs.get(`users/doc_${uid}`).creditsBalance = SALDO;
}
const saldo = (uid = UID) => base.docs.get(`users/doc_${uid}`).creditsBalance;
const COLECCIONES_DEL_CORE = ['jobs', 'workflowRuns', 'jobQueue'];
const delCore = () => Object.fromEntries(COLECCIONES_DEL_CORE.map((c) => [c, base.de(c).length]));
const totalDelCore = () => Object.values(delCore()).reduce((a, b) => a + b, 0);
const sinCore = (antes) => JSON.stringify(delCore()) === JSON.stringify(antes);

/* ═══ A · LAS PUERTAS DEL CORE (S1) ════════════════════════════════════════════════════════════════════════════════════════════ */
seccion('A · Las puertas del Core: cerradas por defecto, de una en una, y solo tres');
{
  const abierta = (porCapacidad) => ({ habilitado: true, porCapacidad });
  const preguntas = {
    brainTexto: { capability: 'text.generate', userId: UID, experienceId: 'brain' },
    brainBusqueda: { capability: 'text.search', userId: UID, experienceId: 'brain' },
    video: { capability: 'video.generate', userId: UID, experienceId: 'studio' },
    videoDeFoto: { capability: 'video.image_to_video', userId: UID, experienceId: 'studio' },
    mundo: { capability: 'world.generate', userId: UID, experienceId: 'studio' },
    creatorRun: { capability: 'image.generate', userId: UID, experienceId: 'design' },
  };
  const quien = (cfg, ctx = {}) => Object.fromEntries(Object.entries(preguntas).map(([nombre, p]) => [nombre, decidirRuntime(cfg, { ...p, ...ctx })]));
  const soloCore = (decisiones) => Object.entries(decisiones).filter(([, d]) => d.runtime === 'core').map(([nombre]) => nombre).join();
  const motivos = (decisiones) => [...new Set(Object.values(decisiones).filter((d) => d.runtime === 'legacy').map((d) => d.motivo))].join();

  const porDefecto = quien(undefined);
  check('A1) sin documento `aiSettings/runtime` (el estado por defecto) ninguna de las seis peticiones va por el Core', soloCore(porDefecto) === '' && motivos(porDefecto) === 'deshabilitada', motivos(porDefecto));
  const apagada = quien({ habilitado: false, porCapacidad: { 'text.generate': { cuentas: [UID] } } });
  check('A2) con `habilitado: false` tampoco, aunque haya una lista de cuentas', soloCore(apagada) === '', soloCore(apagada));
  const soloTexto = quien(abierta({ 'text.generate': { cuentas: [UID] } }));
  check('A3) abierta SOLO `text.generate` para la cuenta: únicamente la respuesta de Weë Brain va por el Core', soloCore(soloTexto) === 'brainTexto', soloCore(soloTexto));
  check('A3b) y la búsqueda con fuentes de Brain, aunque sea Brain, sigue por el camino de siempre (capacidad no migrada)',
    soloTexto.brainBusqueda.runtime === 'legacy' && soloTexto.brainBusqueda.motivo === 'capacidad_no_migrada', soloTexto.brainBusqueda.motivo);
  const sinLista = quien(abierta({ 'text.generate': {} }));
  check('A4) abierta una capacidad SIN lista de cuentas: para nadie', soloCore(sinLista) === '' && sinLista.brainTexto.motivo === 'sin_lista_de_cuentas', sinLista.brainTexto.motivo);
  const soloVideo = quien(abierta({ 'video.generate': { cuentas: [UID], experiencias: ['studio'] } }));
  check('A5) abierta `video.generate` (Studio, esa cuenta): solo `generateVideo` va por el Core; ni el texto ni el mundo ni `creatorRun`', soloCore(soloVideo) === 'video', soloCore(soloVideo));
  const soloMundo = quien(abierta({ 'world.generate': { cuentas: [UID], experiencias: ['studio'] } }));
  check('A5b) abierta `world.generate`: solo el mundo; la puerta de una capacidad nunca abre la de otra', soloCore(soloMundo) === 'mundo', soloCore(soloMundo));
  const formaAntigua = quien({ habilitado: true, capacidades: ['text.generate'], cuentas: [UID] });
  check('A6) la forma antigua `{capacidades, cuentas}` ya no abre nada: configuración ilegible', soloCore(formaAntigua) === '' && formaAntigua.brainTexto.motivo === 'configuracion_ilegible', formaAntigua.brainTexto.motivo);
  const fueraDeLaLista = decidirRuntime(abierta({ 'text.generate': { cuentas: [UID] } }), { ...preguntas.brainTexto, userId: OTRO });
  check('A7) con la puerta abierta, una cuenta que NO está en la lista sigue por el camino de siempre', fueraDeLaLista.runtime === 'legacy' && fueraDeLaLista.motivo === 'cuenta_fuera_de_la_prueba', fueraDeLaLista.motivo);

  /* Y el código: quién pregunta por la puerta. Una cuarta puerta, o `creatorRun` entrando en el conductor, sería un cambio de estado de verdad. */
  const delServidor = (dir) => fs.readdirSync(path.resolve(RAIZ, 'functions/src', dir), { recursive: true }).map((f) => `${dir}/${String(f).split(path.sep).join('/')}`).filter((f) => f.endsWith('.ts'));
  const fuentes = ['.', ...fs.readdirSync(path.resolve(RAIZ, 'functions/src'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)]
    .flatMap((d) => (d === '.' ? fs.readdirSync(path.resolve(RAIZ, 'functions/src')).filter((f) => f.endsWith('.ts')) : delServidor(d)));
  const fueraDeRuntime = fuentes.filter((f) => !f.startsWith('runtime/'));
  const llaman = (patron) => fueraDeRuntime.filter((f) => patron.test(sinComentarios(leer(`functions/src/${f}`)))).sort();
  check('A8) solo TRES archivos fuera de `runtime/` preguntan por la puerta: la de Brain, la del vídeo y la del mundo',
    JSON.stringify(llaman(/\bdecidirRuntime\(/)) === JSON.stringify(['creator/brain.ts', 'creator/mundo.ts', 'creator/video.ts']), llaman(/\bdecidirRuntime\(/).join(' '));
  check('A9) y solo esos tres construyen el conductor (`conductorDeWee`)',
    JSON.stringify(llaman(/\bconductorDeWee\(/)) === JSON.stringify(['creator/brain.ts', 'creator/mundo.ts', 'creator/video.ts']), llaman(/\bconductorDeWee\(/).join(' '));
  const creador = sinComentarios(leer('functions/src/creator/index.ts'));
  check('A10) `creatorChat`, `creatorQuote` y `creatorRun` (las once experiencias) no importan el conductor, ni el Orchestrator, ni el Job Engine del Core',
    !/from '\.\.\/runtime|from '\.\.\/orchestrator|from '\.\.\/job\b|from '\.\.\/workflow|conductorDeWee|decidirRuntime/.test(creador));
}

/* ═══ B · EL CAMINO DE SIEMPRE, DE PUNTA A PUNTA (S4) ══════════════════════════════════════════════════════════════════════════ */
seccion('B · El camino de siempre, de punta a punta, con el Credit Engine real: completa y no toca el Core');
const fotoDeLaCuenta = `https://firebasestorage.googleapis.com/v0/b/demo-wee.appspot.com/o/${encodeURIComponent(`users/${UID}/creator-inputs/foto.jpg`)}?alt=media&token=abc-123`;
/** Una caja entera: pregunta, plan, precio y ejecución. Devuelve lo que hay que mirar, no lo imprime. */
const flujoLegacy = async (experienceId, goal, presets, { imagen } = {}) => {
  const saldoAntes = saldo();
  const coreAntes = delCore();
  let r = await intento(() => creatorMod.creatorChat.run({ auth: { uid: UID }, data: { experienceId, goal, presetAnswers: presets, locale: 'es-ES', ...(imagen ? { imageUrl: imagen } : {}) } }));
  if (!r.ok) return { fallo: `creatorChat ${codigo(r)}` };
  const jobId = r.valor.jobId;
  let turnos = 0;
  while (r.ok && r.valor.status === 'asking' && r.valor.question && turnos++ < 8) {
    const q = r.valor.question;
    const opcion = q.options.find((o) => o.id !== 'idk') ?? null;
    r = await intento(() => creatorMod.creatorChat.run({ auth: { uid: UID }, data: { jobId, answer: opcion ? { questionId: q.id, optionId: opcion.id } : { questionId: q.id, text: 'Café Aurora' }, locale: 'es-ES' } }));
  }
  if (!r.ok) return { fallo: `creatorChat (respuesta) ${codigo(r)}` };
  const plan = r.valor;
  const run = await intento(() => creatorMod.creatorRun.run({ auth: { uid: UID }, data: { jobId, locale: 'es-ES' } }));
  const trabajo = base.leer(`creatorJobs/${jobId}`);
  const asiento = base.leer(`creditTransactions/usage_${jobId}`);
  const libro = base.de('aiGenerations').filter((f) => f.jobId === jobId);
  return { jobId, plan, run, trabajo, asiento, libro, saldoAntes, saldoDespues: saldo(), coreIntacto: sinCore(coreAntes) };
};
const dineroCuadra = (f) => {
  const cobrado = f.trabajo.creditsCharged;
  return f.asiento?.status === 'COMPLETED' && f.asiento.amount === -cobrado && f.saldoAntes - f.saldoDespues === cobrado
    && f.libro.length > 0 && f.libro.every((x) => x.status === 'COMPLETED') && f.libro.reduce((a, x) => a + (x.creditsCharged ?? 0), 0) === cobrado;
};
const completa = (f) => !f.fallo && f.run.ok && f.trabajo.status === 'done' && f.trabajo.creditsCharged > 0 && f.trabajo.results.length > 0;

const diseno = await flujoLegacy('design', 'Diseñar un logo para mi cafetería Aurora', [{ questionId: 'what', optionId: 'logo' }]);
check('B1) Weë Design (un logo): plan, ejecución y resultado; el trabajo termina `done`', completa(diseno), diseno.fallo ?? `${diseno.trabajo?.status}`);
check('B2) …y el dinero cuadra: el asiento `usage_` COMPLETED, el saldo baja lo cobrado y el libro `aiGenerations` suma lo mismo', dineroCuadra(diseno),
  `cobrado ${diseno.trabajo?.creditsCharged} · saldo ${diseno.saldoAntes}→${diseno.saldoDespues} · libro ${diseno.libro?.map((x) => x.capability).join('+')}`);
check('B3) …sin crear ni un documento en `jobs`, `workflowRuns` ni `jobQueue`: no pasa por el conductor', diseno.coreIntacto);

const chef = await flujoLegacy('chef', 'Una receta rica con lo que tengo en la nevera', [{ questionId: 'what', optionId: 'recipe' }]);
check('B4) Weë Chef (una receta): termina `done`, el dinero cuadra y el Core sigue intacto', completa(chef) && dineroCuadra(chef) && chef.coreIntacto, chef.fallo ?? `${chef.trabajo?.status}`);

const animar = await flujoLegacy('studio', 'Animar mi foto del café', [{ questionId: 'type', optionId: 'animate' }, { questionId: 'style', optionId: 'warm' }], { imagen: fotoDeLaCuenta });
check('B5) Weë Studio (animar una foto): el vídeo de una foto —descripción + vídeo— termina `done`, con su dinero y el Core intacto',
  completa(animar) && dineroCuadra(animar) && animar.coreIntacto, animar.fallo ?? `${animar.trabajo?.status}`);
check('B5b) y ese plan es el de la foto: `vision.describe` + `video.image_to_video`, que pasan por `videoEngine` DENTRO de `creatorRun`, no por la puerta de vídeo',
  animar.plan?.plan?.steps?.map((s) => s.capability).join('+') === 'vision.describe+video.image_to_video', animar.plan?.plan?.steps?.map((s) => s.capability).join('+'));

const textoLargo = 'Quiero un video para mi cafetería de barrio: abrimos temprano, el olor a pan recién hecho, la espuma del café en la taza, la gente que entra con prisa y sale sonriendo. Que se vea cálido, humano, cercano y muy auténtico, sin postureo ni nada de lujo.';
const conVoz = await flujoLegacy('studio', `Video cinematográfico: ${textoLargo} · plano medio, luz de hora dorada, movimiento suave de cámara`,
  [{ questionId: 'type', optionId: 'promo' }, { questionId: 'style', optionId: 'warm' }, { questionId: 'where', optionId: 'vertical' }]);
{
  /*
   * B-11 (defecto conocido, solo en modo demo; R-09): el guion de prueba no trae «NARRACIÓN:», así que un vídeo con voz de Studio no
   * termina sin claves. Lo que se fija es lo que NO puede cambiar con o sin arreglo: que el dinero acabe cuadrado, o cobrado entero
   * o devuelto entero, y que el Core siga sin tocarse. Si R-09 se aplica, este trabajo pasará a `done` y la comprobación sigue valiendo.
   */
  const hecho = !conVoz.fallo && conVoz.run.ok && conVoz.trabajo.status === 'done';
  const devuelto = !conVoz.fallo && conVoz.trabajo.status === 'failed' && conVoz.trabajo.creditsCharged === 0 && conVoz.saldoAntes === conVoz.saldoDespues
    && conVoz.asiento?.status === 'REFUNDED';
  check('B6) Weë Studio (vídeo con voz, sin claves): o termina con su dinero cuadrado, o falla DEVOLVIENDO todo (B-11: hoy es lo segundo)',
    (hecho && dineroCuadra(conVoz)) || devuelto, conVoz.fallo ?? `${conVoz.trabajo?.status} · asiento ${conVoz.asiento?.status} · saldo ${conVoz.saldoAntes}→${conVoz.saldoDespues}`);
  check('B6b) …y el Core intacto también en ese camino', conVoz.coreIntacto);
}
check('B7) tras cuatro trabajos de cajas, el Core no ha visto NADA: cero documentos en `jobs`, `workflowRuns` y `jobQueue`', totalDelCore() === 0, JSON.stringify(delCore()));
check('B8) …y ningún trabajo materializó un asset: un resultado de prueba (demo) no se guarda (`assets`), no hay nada que cobrar de más ni que perder',
  base.de('assets').length === 0);

/* ═══ C · WEË BRAIN POR LOS DOS CAMINOS (S5) ═══════════════════════════════════════════════════════════════════════════════════ */
seccion('C · Weë Brain: el camino de siempre y el del Core, con DeepSeek de mentira');
instalarDeepseek();
{
  const saldoAntesDeBrain = saldo();
  const pedir = (uid, messageId, chatId) => intento(() => brainMod.brainChat.run({ auth: { uid }, data: { message: 'Hola Weë, quiero crear algo para mi negocio', messageId, locale: 'es-ES', ...(chatId ? { chatId } : {}) } }));
  const claves = (r) => (r.ok ? Object.keys(r.valor).sort().join(',') : codigo(r));

  /* (a) El camino de siempre: no hay documento de puerta. */
  olvidarLaPuerta();
  const a0 = { generate: alRouterVivo.n, route: alRouterParaDecidir.n, deepseek: llamadasDeDeepseek.length, generaciones: base.de('aiGenerations').length };
  const legacy = await pedir(UID, 'm_legacy_0001');
  check('C1) PUERTA CERRADA: Weë Brain contesta por el camino de siempre —`engine.generate` → `router.execute` → el proveedor—, sin crear nada en el Core',
    legacy.ok && alRouterVivo.n === a0.generate + 1 && llamadasDeDeepseek.length === a0.deepseek + 1 && totalDelCore() === 0 && base.de('aiGenerations').length === a0.generaciones + 1,
    `${codigo(legacy)} · al router vivo ${alRouterVivo.n - a0.generate} · al proveedor ${llamadasDeDeepseek.length - a0.deepseek}`);
  check('C1b) y la respuesta propone un especialista y trae su bloque de doce: `suggestedExperience` y `bloque.usadas`', legacy.ok && legacy.valor.suggestedExperience === 'design' && legacy.valor.bloque?.usadas === 1 && legacy.valor.credits === 0,
    JSON.stringify(legacy.valor?.bloque));

  /* (b) El del Core: la puerta abierta SOLO para text.generate y SOLO para esta cuenta (lo que haría el dueño para un canary). */
  base.docs.set('aiSettings/runtime', { habilitado: true, porCapacidad: { 'text.generate': { cuentas: [UID], experiencias: ['brain'] } } });
  olvidarLaPuerta();
  const b0 = { generate: alRouterVivo.n, route: alRouterParaDecidir.n, deepseek: llamadasDeDeepseek.length, generaciones: base.de('aiGenerations').length };
  const core = await pedir(UID, 'm_core_0001');
  check('C2) PUERTA ABIERTA PARA LA CUENTA: contesta por el Core —el router vivo solo DECIDE la cadena (`route`) y no ejecuta (`generate`)—, con una sola llamada al proveedor',
    core.ok && alRouterVivo.n === b0.generate && alRouterParaDecidir.n > b0.route && llamadasDeDeepseek.length === b0.deepseek + 1 && base.de('aiGenerations').length === b0.generaciones + 1,
    `${codigo(core)} · generate ${alRouterVivo.n - b0.generate} · route ${alRouterParaDecidir.n - b0.route} · proveedor ${llamadasDeDeepseek.length - b0.deepseek}`);
  check('C3) …y devuelve EXACTAMENTE la misma forma de respuesta que el camino de siempre (mismas claves)', legacy.ok && core.ok && claves(legacy) === claves(core), claves(core));
  const trabajos = base.de('jobs');
  const trabajo = trabajos[0];
  const J = trabajo ? JSON.parse(trabajo.json) : null;
  check('C4) y deja UN trabajo y UNA ejecución del Core: el trabajo completado, de `text.generate`, con un intento y su camino `cadena`',
    trabajos.length === 1 && base.de('workflowRuns').length === 1 && trabajo.state === 'completed' && trabajo.capability === 'text.generate' && trabajo.attemptCount === 1
    && J.metadata?.routeOrigin === 'cadena' && J.mode === 'sync', `${trabajos.length} trabajo(s) · ${trabajo?.state} · ${trabajo?.providerId}`);
  check('C5) el trabajo guarda una REFERENCIA a la conversación (`contextRef`), no el texto de la persona', !!J && 'contextRef' in J.input && !JSON.stringify(J.input).includes('quiero crear algo para mi negocio'),
    J ? Object.keys(J.input).sort().join(',') : '');
  const ejecucion = base.de('workflowRuns')[0];
  const W = ejecucion ? JSON.parse(ejecucion.workflowJson) : null;
  check('C6) la ejecución es un workflow de UN solo paso, `brain.reply`: no hay Planner del Core ni varios pasos',
    !!W && W.goal === 'brain.reply' && W.steps.length === 1 && W.steps[0].capability === 'text.generate', W ? `${W.goal} · ${W.steps.map((s) => s.capability).join('+')}` : '');

  /* (c) Una cuenta que no está en la lista sigue por el camino de siempre, aunque la puerta esté abierta. */
  const jobsAntes = base.de('jobs').length;
  const ajena = await pedir(OTRO, 'm_otra_0001');
  check('C7) una cuenta FUERA de la lista, con la puerta abierta, sigue por el camino de siempre: no crea trabajos del Core', ajena.ok && base.de('jobs').length === jobsAntes, codigo(ajena));
  /* (d) Repetir el mismo mensaje en su conversación no vuelve a llamar al proveedor. */
  const llamadas = llamadasDeDeepseek.length;
  const repetido = await pedir(UID, 'm_core_0001', core.ok ? core.valor.chatId : undefined);
  check('C8) repetir el mismo mensaje en su conversación devuelve lo ya contestado (`duplicate`) sin llamar otra vez al proveedor', repetido.ok && repetido.valor.duplicate === true && llamadasDeDeepseek.length === llamadas,
    `${codigo(repetido)} · llamadas nuevas ${llamadasDeDeepseek.length - llamadas}`);

  /*
   * ── BLOCKED — HUMAN DECISION · B-05 · R-04 ────────────────────────────────────────────────────────────────────────────────────
   * Las respuestas 1 a 11 de cada bloque de doce NO cobran, pero `brain.ts` pasa igualmente `creditTransactionId` y `creditRequestId` al
   * trabajo del Core. El barrendero lo lee como una reserva de 0, decide «liquidar 0» y `completeCredits` contesta
   * TRANSACTION_NOT_FOUND (no hay reserva): no lo marca liquidado y el trabajo vuelve a salir en CADA pasada (cada 5 minutos).
   * El arreglo mínimo (R-04: no pasar esas claves cuando la respuesta no cobra, o tratar el 0 como «nada que liquidar») toca
   * `creator/brain.ts` / `runtime/liquidacion.ts` y mueve cercas (`brain-canary` 40, `runtime-liquidacion` 4, `job-queue` 65):
   * exige la autorización de reanclar. Cuando se haga, las tres comprobaciones siguientes deben pasar a decir lo contrario.
   */
  const barrer = () => rt.barrerLiquidaciones({ trabajos: almacenDeTrabajos(base), liquidacion: rt.liquidacionDeWee(), ahora: () => Date.now() });
  const pasada1 = await barrer();
  const pasada2 = await barrer();
  const cierre = await intento(() => creditEngine.completeCredits({ userId: UID, requestId: 'brain_m_core_0001', finalAmount: 0, meta: { jobId: 'sonda' } }));
  const pendiente = base.de('jobs')[0]?.liquidacion;
  check('C9) BLOCKED — HUMAN DECISION · B-05 · la respuesta GRATIS del Core deja un trabajo que el barrido NO puede cerrar: mira 1, liquida 0 y falla 1, y vuelve a fallar en la pasada siguiente',
    pasada1.mirados === 1 && pasada1.liquidados === 0 && pasada1.fallos === 1 && pasada2.mirados === 1 && pasada2.fallos === 1,
    `1ª ${JSON.stringify({ mirados: pasada1.mirados, liquidados: pasada1.liquidados, fallos: pasada1.fallos })} · 2ª fallos ${pasada2.fallos}`);
  check('C10) BLOCKED — HUMAN DECISION · B-05 · la causa: el Credit Engine no tiene reserva que cerrar (`TRANSACTION_NOT_FOUND`) porque la respuesta 2 de 12 no cobra',
    !cierre.ok && (cierre.error?.code === 'TRANSACTION_NOT_FOUND' || cierre.error?.details?.code === 'TRANSACTION_NOT_FOUND' || /TRANSACTION_NOT_FOUND/.test(String(cierre.error?.message ?? '') + JSON.stringify(cierre.error?.details ?? {})))
    && !base.docs.has('creditTransactions/usage_brain_m_core_0001'), codigo(cierre));
  check('C11) BLOCKED — HUMAN DECISION · B-05 · y el trabajo se queda `pendiente` de liquidar, sin dinero movido (saldo intacto)', pendiente === 'pendiente' && saldo() === saldoAntesDeBrain && base.leer('creditTransactions/usage_brain_m_core_0001') === undefined,
    `${pendiente} · saldo ${saldoAntesDeBrain}→${saldo()}`);
  base.docs.delete('aiSettings/runtime');
  olvidarLaPuerta();
}
quitarDeepseek();

/* ═══ D · GENERATEVIDEO CON LA PUERTA CERRADA (S6) ═════════════════════════════════════════════════════════════════════════════ */
seccion('D · `generateVideo` con la puerta cerrada: el camino de siempre');
{
  const coreAntes = delCore();
  const saldoAntes = saldo();
  const r = await intento(() => videoMod.generateVideo.run({ auth: { uid: UID }, data: { prompt: 'Un faro al amanecer, olas suaves', requestId: 'vid_legacy_0001', durationSec: 5, aspectRatio: '16:9' } }));
  const asiento = base.leer('creditTransactions/usage_vid_legacy_0001');
  check('D1) PUERTA CERRADA: `generateVideo` completa por el camino de siempre (`videoEngine`), en modo demo, con su asiento COMPLETED y el saldo cuadrado',
    r.ok && r.valor.status === 'COMPLETED' && r.valor.demo === true && asiento?.status === 'COMPLETED' && saldoAntes - saldo() === -asiento.amount && asiento.amount < 0,
    `${codigo(r)} · ${r.valor?.status} · asiento ${asiento?.status}`);
  check('D2) …y sin crear ni un documento del Core (el vídeo de Studio nunca pasa por la puerta mientras esté cerrada)', sinCore(coreAntes), `antes ${JSON.stringify(coreAntes)} · ahora ${JSON.stringify(delCore())}`);
}

/* ═══ E · EL GATEWAY DEL CONDUCTOR SIN RESOLUTORES (S3 · B-06) ═════════════════════════════════════════════════════════════════ */
seccion('E · El Gateway del conductor: lo que hoy hace sin resolutores de material');
{
  const core = lib('core/index.js');
  const { crearGatewayDelMotor } = lib('engine/gateway.js');
  const llamadas = [];
  const adaptador = {
    id: 'x', name: 'x', modalities: ['text', 'image'], isConfigured: () => true, supports: () => true,
    models: [{ id: 'x-1', provider: 'x', capabilities: ['image.generate'], quality: 3, speed: 3, cost: { unit: 'call', usd: 0.01 } }],
    async run(req) { llamadas.push(JSON.parse(JSON.stringify(req.input))); return { output: { kind: 'image', url: 'https://demo/x.png' }, costUSD: 0.01, latencyMs: 2, model: 'x-1' }; },
  };
  const config = { providers: {}, settings: registry.DEFAULT_SETTINGS, routing: {}, source: 'defaults' };
  /* Las MISMAS opciones que `conductorDeWee` (runtime/index.ts): adaptadores, configuración, traza, reloj, aceptación asíncrona y jurisdicciones. */
  const comun = { adapters: { x: adaptador }, loadConfig: async () => config, tracer: { record() {} }, now: () => 1_700_000_000_000, aceptaAsincrono: false, jurisdiccionesDe: async () => undefined };
  let serie = 0;
  const peticion = () => ({
    contract: core.GATEWAY_CONTRACT_VERSION,
    capability: 'image.generate',
    implementation: { providerId: 'x', modelId: 'x-1' },
    input: { prompt: 'Una foto del café' },
    trace: { traceId: 'trace-e2e-0001', requestId: 'req-e2e-0001', userId: UID, runId: 'run-e2e-0001', stepId: 'b' },
    upstream: [{ stepId: 'a', capability: 'text.generate', produces: 'text', outputRefs: ['asset_0123456789abcdef0123456789abcdef'] }],
    idempotencyKey: `k-e2e-${String(++serie).padStart(4, '0')}`,
    execution: { mode: 'sync' },
  });

  /* La composición REAL del conductor, leída: qué opciones le da `conductorDeWee` al Gateway. */
  const fuente = sinComentarios(leer('functions/src/runtime/index.ts'));
  const inicio = fuente.indexOf('const gateway = crearGatewayDelMotor({');
  const bloque = inicio < 0 ? '' : fuente.slice(inicio, fuente.indexOf('});', inicio));
  const opciones = [...bloque.matchAll(/^\s{4}(\w+)(?=[:,\n])/gm)].map((m) => m[1]);
  check('E1) BLOCKED — HUMAN DECISION · B-06 · `conductorDeWee` compone el Gateway SIN `upstream`, `recursos` ni `referencias` (son las opciones que lo harían leer el material de los pasos anteriores)',
    bloque.length > 0 && !/\b(upstream|recursos|referencias)\b/.test(bloque) && opciones.includes('adapters') && opciones.includes('aceptaAsincrono'), opciones.join(','));

  const sinResolutor = await crearGatewayDelMotor(comun).ejecutar(peticion());
  check('E2) BLOCKED — HUMAN DECISION · B-06 · sin resolutor, un paso que DEPENDE de otro llega al proveedor con `input.upstream` sin definir… y el Gateway lo da por completado',
    sinResolutor.status === 'completed' && llamadas.length === 1 && llamadas[0].upstream === undefined, `status ${sinResolutor.status} · upstream ${JSON.stringify(llamadas[0]?.upstream)} · llamadas ${llamadas.length}`);

  const conResolutor = await crearGatewayDelMotor({ ...comun, upstream: async (_c, pasos) => ({ materiales: pasos.flatMap((p) => p.outputRefs.map((ref) => ({ stepId: p.stepId, capability: p.capability, materialType: 'text', assetId: ref, contenido: 'texto del paso anterior' }))), fallos: [] }) }).ejecutar(peticion());
  check('E3) CON resolutor, el mismo paso recibe el material del anterior: lo que haría falta cablear en el conductor',
    conResolutor.status === 'completed' && llamadas.length === 2 && llamadas[1].upstream?.[0]?.stepId === 'a' && llamadas[1].upstream[0].contenido === 'texto del paso anterior', JSON.stringify(llamadas[1]?.upstream)?.slice(0, 90));

  const antes = llamadas.length;
  const rechaza = await crearGatewayDelMotor({ ...comun, upstream: async () => ({ materiales: [], fallos: [{ reason: 'not_owned' }] }) }).ejecutar(peticion());
  check('E4) y con un resolutor que NO puede resolver, el paso se rechaza ANTES de llamar al proveedor (`INVALID_REQUEST`, cero llamadas): el modo seguro ya existe, solo falta ponerlo',
    rechaza.status === 'failed' && rechaza.error?.code === 'INVALID_REQUEST' && llamadas.length === antes, `${rechaza.status} · ${rechaza.error?.code} · llamadas nuevas ${llamadas.length - antes}`);
}

/* ═══ F · NADA SALIÓ A LA RED ══════════════════════════════════════════════════════════════════════════════════════════════════ */
seccion('F · Nada salió a la red, a un proveedor real ni al Storage');
check('F1) ninguna llamada de red intentada (`fetch`) en toda la suite', intentosDeRed.length === 0, intentosDeRed.join(' | '));
check('F2) ninguna escritura en el Storage', escrituraEnElStorage.length === 0, escrituraEnElStorage.join(' | '));
check('F3) ningún proveedor real configurado o usado: todos los adaptadores salvo el de prueba (y el doble de C) quedaron apagados',
  Object.entries(registry.ADAPTERS).filter(([id, a]) => id !== 'mock' && a.isConfigured()).length === 0);
check('F4) y esta suite está en la cadena de `npm test`', /camino-e2e\.test\.mjs/.test(leer('functions/package.json')));

if (failures) {
  imprimir('\nRuido del servidor durante la suite (para entender lo que falló):');
  for (const linea of ruido.slice(-40)) imprimir(`  ${linea.slice(0, 240)}`);
}
imprimir(failures ? `\n${failures} comprobación(es) fallaron` : `\n✔ El camino de una petición, ejecutado: las puertas, las cajas, Weë Brain por los dos caminos y el Gateway del conductor (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
