/**
 * TRAZABILIDAD DE WEË AI · D-3 CONECTADO DE PUNTA A PUNTA (R9 · integración de E2 con la línea A).
 *
 *   node test/traza-weeai-texto-final-conectado.test.mjs      (necesita `npm run build`: usa functions/lib)
 *
 * La costura `services/textoFinalDeWeeAi.ts` ya re-exporta el contrato de la línea A. Esta suite corre la cadena real
 * —costura → `services/cicloDeTrabajo.ts` (transpilado, Firebase doblado) → callable `cicloDeTrabajo` COMPILADO sobre la
 * Firestore en memoria— con la entrada exacta que arma `CreatorFlow` (`requestIdDelTextoFinal(job.id)`, la herramienta de
 * la experiencia, el proyecto del trabajo). Prueba idempotencia, persistencia, errores y reintentos, con CONTROLES.
 * Nada sale a la red; no hace falta emulador.
 */
import { register } from 'node:module';
import { BaseEnMemoria, instalarLaBase, lib } from './_firestore-en-memoria.mjs';

register(new URL('./_pc-dominio-ganchos.mjs', import.meta.url));

let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const titulo = (x) => console.log(`\n─── ${x} ───`);
const intento = async (fn) => { try { return { ok: true, valor: await fn() }; } catch (error) { return { ok: false, error }; } };

/* El servidor: el callable compilado sobre una base en memoria. */
const base = new BaseEnMemoria();
instalarLaBase(() => base);
const C = lib('content/creaciones.js');
/* El Content Core crea la ficha de texto con `create` (solo si no existe): la base en memoria lo aprende aquí. */
Object.getPrototypeOf(base.doc('x/y')).create = async function create(data) {
  if (this.base.docs.has(this.path)) { const e = new Error('ya existe'); e.code = 6; throw e; }
  this.base.docs.set(this.path, JSON.parse(JSON.stringify(data)));
};
const ANA = 'cuentaAna0001';
const BETO = 'cuentaBeto0001';
base.docs.set('creatorProjects/proj_ana_negocio', { userId: ANA, name: 'Velas', emoji: '📁', createdAt: 1, updatedAt: 1 });
base.docs.set('creatorProjects/proj_beto_1', { userId: BETO, name: 'Ajeno', emoji: '📁', createdAt: 1, updatedAt: 1 });

/* El cliente: la costura y el contrato reales; el callable doblado entra al servidor con la sesión de quien llama. */
const costura = await import('../../services/textoFinalDeWeeAi.ts');
const ciclo = await import('../../services/cicloDeTrabajo.ts');
const E = globalThis.__pc;
let sesion = ANA;
let averia = null; // (fase: 'antes' | 'despues') → simula la red caída antes de llegar o después de que el servidor guardó
const servidor = async (nombre, datos) => {
  if (averia === 'antes') { averia = null; throw Object.assign(new Error('network-request-failed'), { code: 'functions/unavailable' }); }
  const r = await C.cicloDeTrabajo.run({ auth: { uid: sesion }, data: datos });
  if (averia === 'despues') { averia = null; throw Object.assign(new Error('deadline-exceeded'), { code: 'functions/deadline-exceeded' }); }
  return r;
};
const cuantos = (col) => base.de(col).length;
const entradaDe = (jobId, extra = {}) => ({
  texto: 'Plan de negocio para vender velas: 1) costes, 2) precio, 3) canales.',
  herramienta: 'business', proyectoOrigenId: 'proj_ana_negocio', requestId: costura.requestIdDelTextoFinal(jobId), ...extra,
});

/* ═══ A · LA COSTURA ES EL CONTRATO ═══════════════════════════════════════════════════════════════════════════════ */
titulo('A · la costura re-exporta el contrato verificado de la línea A');
check('A1) `guardarTextoFinal` de la costura ES el del contrato (no una copia ni un null)',
  typeof costura.guardarTextoFinal === 'function' && costura.guardarTextoFinal === ciclo.guardarTextoFinal);
check('A2) el requestId de cada trabajo cabe en la forma que acepta el servidor (ids de Firestore de 20 caracteres)',
  ['AbCdEfGhIjKlMnOpQrSt', 'job-b', 'demo_job_0001'].every((id) => /^[A-Za-z0-9_.:-]{8,128}$/.test(costura.requestIdDelTextoFinal(id))));

/* ═══ B · SIN FUNCTION NO HAY ÉXITO FALSO ════════════════════════════════════════════════════════════════════════ */
titulo('B · sin la Function disponible no se inventa nada');
{
  E.callable = null;
  const r = await intento(() => costura.guardarTextoFinal(entradaDe('job-sin-fn')));
  check('B1) ErrorDeCiclo «no_disponible», nunca un resultado inventado', !r.ok && r.error.code === 'no_disponible');
  check('CONTROL · B2) y no queda nada guardado', cuantos('assets') === 0 && cuantos('creations') === 0);
}

/* ═══ C · GUARDA Y PERSISTE ══════════════════════════════════════════════════════════════════════════════════════ */
titulo('C · guardar persiste UN asset de texto y su creación final, de la cuenta de la sesión');
E.callable = servidor;
const e1 = entradaDe('job-negocio-01');
const r1 = await costura.guardarTextoFinal(e1);
const ficha = base.leer(`assets/${r1.assetId}`);
const creacion = base.leer(`creations/${r1.creacionId}`);
check('C1) devuelve creación y asset nuevos', !r1.yaExistia && !!r1.creacionId && !!r1.assetId);
check('C2) el asset es TEXTO de la cuenta, con el texto tal cual, la herramienta y el requestId del trabajo',
  ficha?.kind === 'text' && ficha.ownerAccountId === ANA && ficha.contenido === e1.texto && ficha.metadata?.experienceId === 'business'
  && ficha.provenance?.requestId === e1.requestId);
check('C3) la creación final queda vinculada al proyecto del trabajo y contiene solo ese asset',
  creacion?.status === 'final' && creacion.ownerAccountId === ANA && creacion.proyectoOrigenId === 'proj_ana_negocio'
  && JSON.stringify(creacion.assetIds) === JSON.stringify([r1.assetId]));
check('C4) por el callable viajó la acción del contrato, sin cuenta en los datos (la pone la sesión)',
  E.llamadas.at(-1)?.nombre === 'cicloDeTrabajo' && E.llamadas.at(-1)?.datos.accion === 'guardarTexto' && !('cuenta' in E.llamadas.at(-1).datos));

/* ═══ D · IDEMPOTENCIA ═══════════════════════════════════════════════════════════════════════════════════════════ */
titulo('D · el mismo trabajo no crea dos creaciones');
{
  const antes = { a: cuantos('assets'), c: cuantos('creations') };
  const r2 = await costura.guardarTextoFinal(e1);
  check('D1) repetir con el mismo requestId devuelve LA MISMA creación y el mismo asset (yaExistia)',
    r2.yaExistia && r2.creacionId === r1.creacionId && r2.assetId === r1.assetId);
  check('D2) y no añade nada', cuantos('assets') === antes.a && cuantos('creations') === antes.c);
  const otro = await intento(() => costura.guardarTextoFinal({ ...e1, texto: 'Otro texto distinto' }));
  check('D3) el mismo requestId con OTRO texto es «conflicto» y no pisa lo guardado',
    !otro.ok && otro.error.code === 'conflicto' && base.leer(`assets/${r1.assetId}`).contenido === e1.texto);
  const r3 = await costura.guardarTextoFinal(entradaDe('job-negocio-02'));
  check('CONTROL · D4) otro trabajo SÍ es otra creación', !r3.yaExistia && r3.creacionId !== r1.creacionId && cuantos('creations') === antes.c + 1);
}

/* ═══ E · ERRORES Y REINTENTOS ═══════════════════════════════════════════════════════════════════════════════════ */
titulo('E · errores visibles y reintentos sin duplicar');
{
  const e = entradaDe('job-negocio-03');
  const antes = { a: cuantos('assets'), c: cuantos('creations') };
  averia = 'antes';
  const fallo = await intento(() => costura.guardarTextoFinal(e));
  check('E1) la red caída antes de llegar es un ERROR para la interfaz (no un éxito)', !fallo.ok && cuantos('creations') === antes.c);
  const reintento = await costura.guardarTextoFinal(e);
  check('E2) el reintento con el mismo requestId guarda UNA vez', !reintento.yaExistia && cuantos('creations') === antes.c + 1 && cuantos('assets') === antes.a + 1);
}
{
  const e = entradaDe('job-negocio-04');
  const antes = { a: cuantos('assets'), c: cuantos('creations') };
  averia = 'despues';
  const perdida = await intento(() => costura.guardarTextoFinal(e));
  check('E3) si el servidor guardó pero la respuesta se perdió, la interfaz ve un error (no finge)', !perdida.ok);
  check('E4) …aunque el servidor sí lo guardó una vez', cuantos('creations') === antes.c + 1);
  const reintento = await costura.guardarTextoFinal(e);
  check('E5) el reintento NO duplica: devuelve la misma creación con yaExistia', reintento.yaExistia && cuantos('creations') === antes.c + 1 && cuantos('assets') === antes.a + 1);
}
{
  const ajeno = await intento(() => costura.guardarTextoFinal(entradaDe('job-negocio-05', { proyectoOrigenId: 'proj_beto_1' })));
  check('E6) colgarlo del proyecto de otra cuenta llega como «no_encontrado» y no guarda', !ajeno.ok && ajeno.error.code === 'no_encontrado'
    && !base.leer(`assets/${C.idDeTextoFinal(ANA, costura.requestIdDelTextoFinal('job-negocio-05'))}`));
  const vacio = await intento(() => costura.guardarTextoFinal(entradaDe('job-negocio-06', { texto: '   ' })));
  check('CONTROL · E7) un texto vacío llega como «invalido»', !vacio.ok && vacio.error.code === 'invalido');
}

/* ═══ F · LAS TRES EXPERIENCIAS Y EL AISLAMIENTO ═════════════════════════════════════════════════════════════════ */
titulo('F · Writer, Business y Travel pasan; la cuenta la decide la sesión');
for (const herramienta of costura.EXPERIENCIAS_CON_TEXTO_FINAL) {
  const r = await intento(() => costura.guardarTextoFinal({ texto: `Texto de ${herramienta}`, herramienta, proyectoOrigenId: null, requestId: costura.requestIdDelTextoFinal(`job-${herramienta}-07`) }));
  check(`F1) ${herramienta}: el servidor acepta su identificador y guarda`, r.ok && base.leer(`assets/${r.valor.assetId}`)?.metadata?.experienceId === herramienta);
}
{
  sesion = BETO;
  const rB = await costura.guardarTextoFinal({ ...e1, proyectoOrigenId: null });
  check('F2) el mismo requestId desde OTRA cuenta es otra creación de esa cuenta (no la de Ana)',
    !rB.yaExistia && rB.creacionId !== r1.creacionId && base.leer(`creations/${rB.creacionId}`)?.ownerAccountId === BETO);
  sesion = ANA;
}

console.log(failures === 0 ? '\n✔ traza-weeai-texto-final-conectado: todo en orden' : `\n✘ traza-weeai-texto-final-conectado: ${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
