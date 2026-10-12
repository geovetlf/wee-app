/**
 * TRAZABILIDAD DE WEË AI · CONSERVAR UN TEXTO FINAL EN «MIS CREACIONES» (R9 · E2, decisión del dueño D-3).
 *
 * Los resultados finales de texto de Weë Writer, Weë Business y Weë Travel se pueden guardar como material de texto en
 * Mis creaciones, SOLO si la persona lo pide. Quien guarda es el contrato de la línea A (`guardarTextoFinal` en
 * `services/cicloDeTrabajo.ts`, rama `r9/pc-dominio`), que todavía no existe: la costura `services/textoFinalDeWeeAi.ts`
 * es `null` y el botón lo dice. Esta suite prueba el botón (idempotencia, ocupado, mismo `requestId`, error, pendiente),
 * dónde aparece en `CreatorFlow`, y que la costura no se quede en `null` cuando el contrato exista.
 */
import fs from 'node:fs';
import path from 'node:path';
import { montarConEfectos, cargarBase } from './_traza-weeai.mjs';
import { crearFlujo, crearServidor, trabajoTerminado } from './_creatorflow-en-proceso.mjs';
import { RAIZ, leer } from './filmmaker-cliente.mjs';

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const titulo = (x) => console.log(`\n─── ${x} ───`);

const ENTRADA = { texto: 'Un plan de negocio para vender velas…', herramienta: 'business', proyectoOrigenId: 'proj-1', requestId: 'textoFinal_job-b' };
const boton = async (guardar) => {
  const p = await montarConEfectos({ pantalla: 'functions/test/_fixture-guardar-texto.cjs', dobles: () => ({}) , antes: (t) => { globalThis.__propsGuardarTexto = { entrada: ENTRADA, guardar, t, colores: { text: '#000', border: '#000', card: '#fff', error: '#f00' } }; } });
  return p;
};

/* ═══ A · EL BOTÓN ═══════════════════════════════════════════════════════════════════════════════════════════════ */
titulo('A · el botón guarda una vez, ocupado mientras guarda, con el requestId del resultado');
{
  const llamadas = [];
  let soltar;
  const guardar = (e) => { llamadas.push(e); return new Promise((r) => { soltar = () => r({ creacionId: 'c1', yaExistia: false }); }); };
  const p = await boton(guardar);
  const etiqueta = p.t('weeai.saveTextToCreations');
  check('A1) se ofrece «Guardar en Mis creaciones» y no guarda nada sin que se pida', p.hayBoton(etiqueta) && llamadas.length === 0);
  p.entorno.tocar(etiqueta, p.vista);
  p.dibujar();
  check('A2) al tocar, guarda con la entrada tal cual (texto, herramienta, proyecto y requestId)', llamadas.length === 1 && JSON.stringify(llamadas[0]) === JSON.stringify(ENTRADA), JSON.stringify(llamadas[0]));
  const ocupado = p.vista.botones.find((b) => b.etiqueta === p.t('weeai.savingText'));
  check('A3) mientras guarda, el botón dice «Guardando…» y está apagado', !!ocupado && ocupado.apagado);
  ocupado?.tocar();
  check('A4) un segundo toque mientras guarda no sale', llamadas.length === 1, String(llamadas.length));
  soltar();
  await p.asentar();
  const hecho = p.vista.botones.find((b) => b.etiqueta === p.t('weeai.textSaved'));
  check('A5) al terminar dice «Guardado en Mis creaciones» y no se puede volver a pulsar', !!hecho && hecho.apagado);
}
{
  const llamadas = [];
  let falla = true;
  const guardar = async (e) => { llamadas.push(e); if (falla) { falla = false; throw new Error('sin red'); } return { creacionId: 'c1', yaExistia: true }; };
  const p = await boton(guardar);
  await p.tocar(p.t('weeai.saveTextToCreations'));
  check('A6) si falla, se dice («No se pudo guardar») y se puede reintentar', p.texto().includes(p.t('weeai.couldNotSave')) && p.hayBoton(p.t('weeai.saveTextToCreations')));
  await p.tocar(p.t('weeai.saveTextToCreations'));
  check('A7) el reintento usa el MISMO requestId: el servidor no crea dos', llamadas.length === 2 && llamadas[0].requestId === llamadas[1].requestId && p.hayBoton(p.t('weeai.textSaved')));
}
{
  const p = await boton(null);
  const b = p.vista.botones.find((x) => x.etiqueta === p.t('weeai.saveTextNotYet'));
  check('A8) sin contrato todavía: el botón lo dice («todavía no disponible») y está apagado', !!b && b.apagado);
  check('CONTROL · A9) y no finge haber guardado', !p.texto().includes(p.t('weeai.textSaved')));
}

/* ═══ B · DÓNDE APARECE ══════════════════════════════════════════════════════════════════════════════════════════ */
titulo('B · aparece solo con el texto final de Writer, Business y Travel');
const terminadoDeTexto = (id, experienceId, extra = {}) => trabajoTerminado(id, {
  experienceId, goal: 'Un texto', results: [{ stepId: 't', kind: 'text', title: 'Texto', content: 'El texto final.' }], ...extra,
});
for (const exp of ['writer', 'business', 'travel']) {
  const servidor = crearServidor();
  servidor.sembrar(terminadoDeTexto(`job-${exp}`, exp));
  const f = await crearFlujo({ params: { experienceId: exp, jobId: `job-${exp}` }, servidor });
  const b = f.vista.botones.find((x) => x.etiqueta === f.t('weeai.saveTextNotYet') || x.etiqueta === f.t('weeai.saveTextToCreations'));
  check(`B1) ${exp}: un trabajo terminado con texto ofrece conservarlo`, !!b, f.vista.botones.map((x) => x.etiqueta).join(' · ').slice(0, 200));
  check(`B2) ${exp}: y no guarda nada por su cuenta al abrirlo`, f.servidor.llamadas.length === 0);
  f.cerrar();
}
{
  const servidor = crearServidor();
  servidor.sembrar(trabajoTerminado('job-img'));
  const f = await crearFlujo({ params: { experienceId: 'design', jobId: 'job-img' }, servidor });
  check('CONTROL · B3) Weë Design (imágenes) no lo ofrece', !f.hayBoton(f.t('weeai.saveTextNotYet')) && !f.hayBoton(f.t('weeai.saveTextToCreations')));
  f.cerrar();
}
{
  const servidor = crearServidor();
  servidor.sembrar(terminadoDeTexto('job-plan', 'business', { status: 'planned', results: [] }));
  const f = await crearFlujo({ params: { experienceId: 'business', jobId: 'job-plan' }, servidor });
  check('CONTROL · B4) un trabajo sin terminar (respuesta provisional) no lo ofrece', !f.hayBoton(f.t('weeai.saveTextNotYet')) && !f.hayBoton(f.t('weeai.saveTextToCreations')));
  f.cerrar();
}
{
  const { requestIdDelTextoFinal, EXPERIENCIAS_CON_TEXTO_FINAL } = cargarBase('services/textoFinalDeWeeAi.ts');
  check('B5) el requestId es estable por trabajo', requestIdDelTextoFinal('abc') === requestIdDelTextoFinal('abc') && requestIdDelTextoFinal('abc') !== requestIdDelTextoFinal('abd'));
  check('B6) y las experiencias son exactamente las de D-3 que son de esta línea', EXPERIENCIAS_CON_TEXTO_FINAL.join() === 'writer,business,travel');
}

/* ═══ C · LA COSTURA NO SE QUEDA EN NULL ═════════════════════════════════════════════════════════════════════════ */
titulo('C · la costura sigue al contrato');
{
  const contrato = path.resolve(RAIZ, 'services/cicloDeTrabajo.ts');
  const exporta = fs.existsSync(contrato) && /export\s+(async\s+function|const)\s+guardarTextoFinal\b/.test(fs.readFileSync(contrato, 'utf8'));
  const costura = leer('services/textoFinalDeWeeAi.ts');
  const reexporta = /export\s*\{\s*guardarTextoFinal\s*\}\s*from\s*'\.\/cicloDeTrabajo'/.test(costura);
  check(exporta ? 'C1) el contrato ya exporta guardarTextoFinal: la costura lo re-exporta' : 'C1) el contrato todavía no exporta guardarTextoFinal: la costura es null y la interfaz lo dice',
    exporta ? reexporta : /export const guardarTextoFinal:.*\| null = null;/.test(costura), exporta ? 'falta: export { guardarTextoFinal } from \'./cicloDeTrabajo\'' : '');
}

console.log(failures === 0 ? '\n✔ traza-weeai-texto-final: todo en orden' : `\n✘ traza-weeai-texto-final: ${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
