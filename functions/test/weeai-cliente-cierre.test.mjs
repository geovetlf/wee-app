/**
 * WEË AI · EL CLIENTE DEL CIERRE DE DESIGN (R7-Design): CL-12, CL-20 y CL-24, CON COMPORTAMIENTO.
 *
 * `docs/WEE-DESIGN-CIERRE.md` §8 lista tres defectos del cliente de Weë AI que la ronda anterior solo pudo LEER (no hay
 * framework de interfaz en el repositorio): el reintento tras un fallo de cotización, el proyecto que no viaja al crear y el
 * aviso de la creación que no se anuncia y no se lee. Aquí se ejecutan. La pantalla de verdad (`CreatorFlowScreen`) y el
 * servicio de verdad (`creatorService`) se cargan con `_creatorflow-en-proceso.mjs` —efectos, referencias y un servidor de
 * mentira que anota cada llamada—, y lo que se mira es lo que SALE de la app: qué callable se llama, con qué carga y en qué orden.
 *
 *   A · CL-12 · «Probar otra vez» tras un fallo de cotización vuelve a cotizar el MISMO trabajo; no crea, no reserva Credits
 *       y no abre otro trabajo. Y lo de siempre sigue siendo lo de siempre: tras fallar al crear se vuelve a crear, tras
 *       fallar al empezar se vuelve a empezar.
 *   B · CL-20 · crear desde un proyecto: la primera llamada al servidor lleva el `projectId` y el trabajo nace DENTRO del
 *       proyecto (no entra al terminar, si la persona se acuerda de «Guardar en proyecto»). Del cliente a la carga del
 *       callable, y del callable al documento: la mitad del servidor se ejecuta con sus funciones compiladas.
 *   C · CL-24 · el aviso de la creación (`AvisoDeCreacion`, compartido con Weë Studio): se ANUNCIA (región viva) y todo su
 *       texto pasa el contraste AA en los DOS temas, calculado con la fórmula de WCAG sobre los colores que el código
 *       declara en `ThemeContext.tsx` —no sobre una cifra copiada— y sobre lo que el componente de verdad pinta.
 *
 * Cada defecto trae su CONTROL, para que un verde no pueda ser un verde vacío. Sin red, sin emulador, sin secretos.
 *
 * ── Lo que NO se prueba aquí ────────────────────────────────────────────────
 *
 * El aspecto, el desplazamiento, el teclado ni un lector de pantalla de verdad (eso es de un dispositivo; CL-26), y el
 * servidor de verdad en emulador (`design-recorrido.emulator.mjs`, CL-18). El servidor se sustituye por uno de mentira que
 * contesta lo mínimo; lo que decide el servidor con la carga que recibe se comprueba, ejecutado, en B.
 */
import { crearComprobador, acelerarLasEsperasCortas, apuntarLaConsola } from './_aceptacion.mjs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { crearFlujo, crearProyecto, crearServidor, errorDeRed, trabajoTerminado, traductorDe, textoDe } from './_creatorflow-en-proceso.mjs';
import { BaseEnMemoria, instalarLaBase, darDeAlta, lib } from './_firestore-en-memoria.mjs';
import { React, h } from './_pantallas.mjs';
import { temasDeLaApp, contraste, AA_TEXTO } from './_contraste-wcag.mjs';
import { RAIZ, crearCargador, leer } from './filmmaker-cliente.mjs';

const { renderToStaticMarkup } = createRequire(path.resolve(RAIZ, 'package.json'))('react-dom/server');

const { check, titulo, aviso, terminar } = crearComprobador();

/** Lo que una prueba lee de las llamadas: «creatorQuote(job-1, high)». */
const resumen = (l) => {
  const d = l.datos;
  return `${l.nombre}(${[d.jobId, d.quality, d.projectId].filter(Boolean).join(', ')})`;
};
const desde = (f, n) => f.servidor.llamadas.slice(n).map(resumen);
/** Las propiedades con que la pantalla montó el presupuesto la última vez (vacío si ya no está en pantalla). */
const plan = (f) => f.capturas.PlanCard || {};
/** Pulsa «Probar otra vez» (el «Probar otra vez» de la auditoría). Si ya no está en pantalla no hay nada que pulsar: la comprobación que sigue lo dirá. */
const reintentar = async (f) => (f.hayBoton(f.t('weeai.tryAgain')) ? f.tocar(f.t('weeai.tryAgain')) : f.asentar());
const nuevoFlujo = (extra = {}) => crearFlujo({ params: { experienceId: 'design', goal: 'Un logo para mi cafetería' }, ...extra });
/** La consola de la app avisa cuando se rompe la escucha de un trabajo: aquí es ruido esperado. */
const sinRuido = async (f) => { const w = console.warn; console.warn = () => {}; try { return await f(); } finally { console.warn = w; } };

/* ═══ A · CL-12 · REINTENTAR TRAS UN FALLO DE COTIZACIÓN ═════════════════════════════════════════════════════════ */
titulo('A · CL-12 · «Probar otra vez» tras un fallo de cotización');
{
  const f = await nuevoFlujo();
  const t = f.t;
  check('A0 · el escenario arranca como una persona lo vive: un solo creatorChat, el trabajo planificado y su presupuesto a la vista',
    desde(f, 0).join() === 'creatorChat()' && !!f.capturas.PlanCard && plan(f).quality === null && plan(f).creditsEstimated === 12, desde(f, 0).join(' · '));

  /* La persona cambia de nivel y la cotización falla (sin red). */
  f.servidor.fallar('creatorQuote', f.errores.sinRed());
  await f.capturas.PlanCard.onQuality('high');
  await f.asentar();
  check('A1 · si falla la cotización se ve el motivo y un «Probar otra vez»', f.texto().includes(t('weeai.errOffline')) && f.hayBoton(t('weeai.tryAgain')), f.texto().slice(0, 140));
  check('A1 · el nivel y el precio de antes no se tocan: la cotización no llegó', plan(f).quality === null && plan(f).creditsEstimated === 12);

  const antes = f.servidor.llamadas.length;
  await reintentar(f);
  const hecho = desde(f, antes);
  check('A1 · «Probar otra vez» vuelve a COTIZAR el mismo nivel del MISMO trabajo (creatorQuote sobre job-1, nivel high)', hecho.join() === 'creatorQuote(job-1, high)', hecho.join(' · ') || '(no llamó a nadie)');
  check('A1 · y NO crea: ni creatorRun (que reserva Credits sin que se vea el precio nuevo) ni un creatorChat que abriría otro trabajo',
    !hecho.some((x) => /^creatorRun|^creatorChat/.test(x)) && !f.servidor.de('creatorRun').length && f.servidor.de('creatorChat').length === 1, hecho.join(' · '));
  check('A2 · y si esta vez sale bien: el error desaparece y la pantalla enseña el nivel y el precio nuevos',
    !f.hayBoton(t('weeai.tryAgain')) && !f.texto().includes(t('weeai.errOffline')) && plan(f).quality === 'high' && plan(f).creditsEstimated === 24,
    `nivel ${plan(f).quality} · ${plan(f).creditsEstimated} Credits`);
  f.cerrar();
}
{
  /* Dos fallos seguidos: el cuadro sigue ahí y el siguiente intento vuelve a ser cotizar. */
  const f = await nuevoFlujo();
  f.servidor.fallar('creatorQuote', f.errores.sinRed(), 2);
  await f.capturas.PlanCard.onQuality('max');
  await f.asentar();
  await reintentar(f);
  check('A3 · si el reintento también falla, el cuadro sigue y la siguiente vez vuelve a ser cotizar (no se queda en otra cosa)',
    f.hayBoton(f.t('weeai.tryAgain')) && desde(f, 1).join(' · ') === 'creatorQuote(job-1, max) · creatorQuote(job-1, max)', desde(f, 1).join(' · '));
  await reintentar(f);
  check('A3 · y a la tercera sale: tres cotizaciones del mismo nivel, y ningún trabajo nuevo ni ninguna creación',
    desde(f, 1).join(' · ') === 'creatorQuote(job-1, max) · creatorQuote(job-1, max) · creatorQuote(job-1, max)' && plan(f).quality === 'max' && !f.hayBoton(f.t('weeai.tryAgain')), desde(f, 1).join(' · '));
  f.cerrar();
}
{
  /* El último nivel pedido es el que se reintenta, no el primero que falló. */
  const f = await nuevoFlujo();
  f.servidor.fallar('creatorQuote', f.errores.sinRed(), 2);
  await f.capturas.PlanCard.onQuality('high');
  await f.asentar();
  await f.capturas.PlanCard.onQuality('max');
  await f.asentar();
  const antes = f.servidor.llamadas.length;
  await reintentar(f);
  check('A4 · si la persona probó otro nivel y también falló, se reintenta el ÚLTIMO que pidió (max), no el primero', desde(f, antes).join() === 'creatorQuote(job-1, max)', desde(f, antes).join(' · '));
  f.cerrar();
}
{
  /* El reintento sigue al ÚLTIMO error: si después falló otra cosa, se repite esa otra cosa. */
  const f = await nuevoFlujo();
  f.servidor.fallar('creatorQuote', f.errores.sinRed());
  await f.capturas.PlanCard.onQuality('high');
  await f.asentar();
  f.servidor.fallar('creatorRun', f.errores.sinRed());
  await f.capturas.PlanCard.onCreate();
  await f.asentar();
  const antes = f.servidor.llamadas.length;
  await reintentar(f);
  check('A5 · si tras fallar la cotización la persona pulsa «Crear» y esa llamada falla, «Probar otra vez» repite la creación (el último error), no una cotización que ya pasó',
    desde(f, antes).join() === 'creatorRun(job-1)', desde(f, antes).join(' · '));
  f.cerrar();
}
{
  /* CONTROL · lo de siempre: tras fallar al CREAR, el reintento crea. */
  const f = await nuevoFlujo();
  f.servidor.fallar('creatorRun', f.errores.sinRed());
  await f.capturas.PlanCard.onCreate();
  await f.asentar();
  check('CONTROL · A6 · el fallo de «Crear» enseña su error y su «Probar otra vez»', f.hayBoton(f.t('weeai.tryAgain')) && f.texto().includes(f.t('weeai.errOffline')));
  const antes = f.servidor.llamadas.length;
  await reintentar(f);
  check('CONTROL · A6 · tras fallar al crear, «Probar otra vez» vuelve a CREAR el mismo trabajo (no cotiza y no abre otro)',
    desde(f, antes).join() === 'creatorRun(job-1)' && f.servidor.de('creatorChat').length === 1 && !f.servidor.de('creatorQuote').length, desde(f, antes).join(' · '));
  f.cerrar();
}
{
  /* CONTROL · lo de siempre: tras fallar al EMPEZAR no hay trabajo, y el reintento empieza. */
  const servidor = crearServidor();
  servidor.fallar('creatorChat', errorDeRed());
  const f = await nuevoFlujo({ servidor });
  check('CONTROL · A7 · si falla al empezar se ve el error y no hay presupuesto todavía', f.hayBoton(f.t('weeai.tryAgain')) && !f.capturas.PlanCard);
  await reintentar(f);
  check('CONTROL · A7 · y «Probar otra vez» vuelve a EMPEZAR (otro creatorChat con la misma frase): aún no había trabajo que cotizar',
    f.servidor.de('creatorChat').length === 2 && f.servidor.de('creatorChat')[1].goal === 'Un logo para mi cafetería' && !!f.capturas.PlanCard && !f.servidor.de('creatorQuote').length,
    desde(f, 0).join(' · '));
  f.cerrar();
}
{
  /* La rama que el encargo describe como «abre un trabajo nuevo»: el trabajo deja de llegar por Firestore y el reintento vuelve a empezar. */
  await sinRuido(async () => {
    const f = await nuevoFlujo();
    f.servidor.fallar('creatorQuote', f.errores.sinRed());
    await f.capturas.PlanCard.onQuality('high');
    await f.asentar();
    f.servidor.romperLaEscucha('job-1');
    await f.asentar();
    const antes = f.servidor.llamadas.length;
    await reintentar(f);
    check('A8 · si además la escucha del trabajo se corta (no hay estado «planificado» que leer), el reintento SIGUE siendo cotizar el mismo trabajo, no abrir otro',
      desde(f, antes).join() === 'creatorQuote(job-1, high)' && f.servidor.de('creatorChat').length === 1, desde(f, antes).join(' · '));
    f.cerrar();
  });
}
{
  /* La pantalla no deja promesas sin atender. */
  const f = await nuevoFlujo();
  f.servidor.fallar('creatorQuote', f.errores.sinRed());
  await f.capturas.PlanCard.onQuality('high');
  await f.asentar();
  await reintentar(f);
  check('A9 · todo el recorrido anterior no deja ninguna promesa rechazada sin atender', f.rechazos.length === 0, f.rechazos.join(' · '));
  f.cerrar();
}

/* ═══ B · CL-20 · EL PROYECTO VIAJA AL CREAR ═════════════════════════════════════════════════════════════════════ */
titulo('B · CL-20 · crear desde un proyecto: el trabajo nace dentro de él');
const PROYECTOS = {
  'proj-1': { id: 'proj-1', userId: 'u1', name: 'Mi cafetería', emoji: '☕' },
  'proj-2': { id: 'proj-2', userId: 'u1', name: 'Otro proyecto', emoji: '🎬' },
};
/** Weë AI abierto con lo que trae la ruta cuando se viene de un proyecto. */
const desdeProyecto = (extra = {}) => crearFlujo({ params: { experienceId: 'design', goal: 'Un logo para mi cafetería', projectId: 'proj-1' }, proyectos: PROYECTOS, ...extra });
/** …y llevado hasta el resultado: planificado, creado y terminado. */
const terminado = async (extra = {}) => {
  const f = await desdeProyecto(extra);
  await f.capturas.PlanCard.onCreate();
  await f.asentar();
  return f;
};
const proyectoDe = (l) => (l ? l.projectId : undefined);
/** Para el detalle de una comprobación: el proyecto de cada llamada, o «—» si no llevaba. */
const proyectos = (ls) => ls.map((l) => proyectoDe(l) ?? '—').join(' · ') || '(sin llamadas)';

{
  const contexto = leer('constants/weeWorkspaces.ts');
  check('B0 · la ruta lo declara: `projectId` es parte de `ContextoDeExperiencia`, la única forma que leen la pantalla y escriben las portadas',
    /export interface ContextoDeExperiencia \{[\s\S]*?\n  projectId\?: string;/.test(contexto));
}
{
  const f = await desdeProyecto();
  const [inicio] = f.servidor.de('creatorChat');
  check('B1 · al empezar desde un proyecto, la PRIMERA llamada (creatorChat) lleva el projectId: el trabajo nace dentro del proyecto', proyectoDe(inicio) === 'proj-1', JSON.stringify(inicio));
  check('B1 · y lo demás de esa llamada no cambia: la experiencia, el objetivo, las respuestas ya dadas y el idioma',
    inicio?.experienceId === 'design' && inicio?.goal === 'Un logo para mi cafetería' && Array.isArray(inicio?.presetAnswers) && inicio.presetAnswers.length === 0 && inicio?.locale === 'es', JSON.stringify(inicio));
  check('B1 · y no manda nada más de la cuenta: solo cinco claves, ninguna de ellas un precio, un modelo ni una cuenta',
    Object.keys(inicio || {}).sort().join() === 'experienceId,goal,locale,presetAnswers,projectId', Object.keys(inicio || {}).sort().join());
  await f.capturas.PlanCard.onCreate();
  await f.asentar();
  check('B2 · al terminar, el trabajo YA está en el proyecto sin que nadie lo asigne: la tarjeta del resultado enseña su nombre y no hubo «Guardar en proyecto»',
    f.capturas.ResultCard?.projectName === 'Mi cafetería' && f.asignaciones.length === 0, `${f.capturas.ResultCard?.projectName ?? '(sin nombre)'} · asignaciones: ${f.asignaciones.length}`);
  f.cerrar();
}
{
  /* CONTROL: sin proyecto, la llamada no lleva la clave (ni vacía ni null): lo de siempre. */
  const f = await crearFlujo({ params: { experienceId: 'design', goal: 'Un logo para mi cafetería' }, proyectos: PROYECTOS });
  const [inicio] = f.servidor.de('creatorChat');
  check('CONTROL · B3 · sin proyecto no viaja la clave projectId (ni vacía ni nula) y el trabajo no pertenece a ninguno',
    !!inicio && !('projectId' in inicio) && !f.servidor.trabajos['job-1'].projectId, JSON.stringify(inicio));
  await f.capturas.PlanCard.onCreate();
  await f.asentar();
  check('CONTROL · B3 · y la tarjeta del resultado no enseña ningún proyecto', f.capturas.ResultCard?.projectName === undefined);
  f.cerrar();
}
{
  /* Lo que la pantalla abre después NACE en el mismo proyecto: otra versión, un ajuste, otro intento, el puente. */
  const f = await terminado();
  await f.capturas.ResultCard.onAnotherVersion();
  await f.asentar();
  check('B4 · «Otra versión» abre un trabajo nuevo EN EL MISMO proyecto', f.servidor.de('creatorChat').length === 2 && proyectoDe(f.servidor.de('creatorChat')[1]) === 'proj-1',
    proyectos(f.servidor.de('creatorChat')));
  f.cerrar();

  const g = await terminado();
  await g.capturas.ResultCard.onEdit('con más color');
  await g.asentar();
  check('B4 · y un ajuste («con más color») también', g.servidor.de('creatorChat').length === 2 && proyectoDe(g.servidor.de('creatorChat')[1]) === 'proj-1', proyectos(g.servidor.de('creatorChat')));
  g.cerrar();

  const h = await terminado();
  await h.capturas.ResultCard.onContinue('logo');
  const salto = h.navegacion.find((n) => n[0] === 'push' && n[1] === 'CreatorFlow');
  check('B5 · el puente («no sé qué hacer»), que abre otra pantalla de Weë AI para seguir donde se estaba, también la abre dentro del proyecto',
    !!salto && salto[2].projectId === 'proj-1' && salto[2].experienceId === 'design', JSON.stringify(salto));
  h.cerrar();
}
{
  /* Si falla al empezar, el reintento lleva el proyecto igual. */
  const servidor = crearServidor();
  servidor.fallar('creatorChat', errorDeRed());
  const f = await desdeProyecto({ servidor });
  await reintentar(f);
  const llamadas = f.servidor.de('creatorChat');
  check('B6 · si falla al empezar, la llamada fallida y el reintento llevan el mismo proyecto (el reintento no lo pierde)',
    llamadas.length === 2 && llamadas.every((l) => proyectoDe(l) === 'proj-1') && !!f.capturas.PlanCard, proyectos(llamadas));
  f.cerrar();
}
{
  /* «Guardar en proyecto» sigue como estaba: mueve el trabajo a OTRO proyecto, y la pantalla lo enseña. */
  const f = await terminado();
  await f.capturas.ResultCard.onSaveToProject();
  await f.asentar();
  check('CONTROL · B7 · «Guardar en proyecto» sigue abriendo el selector', f.capturas.ProjectPicker?.visible === true);
  await f.capturas.ProjectPicker.onPick({ id: 'proj-2', name: 'Otro proyecto' });
  await f.asentar();
  check('CONTROL · B7 · y elegir otro proyecto sigue moviendo el trabajo (assignJob) y mostrando su nombre',
    f.asignaciones.length === 1 && f.asignaciones[0].jobId === 'job-1' && f.asignaciones[0].projectId === 'proj-2' && f.capturas.ResultCard?.projectName === 'Otro proyecto',
    `${JSON.stringify(f.asignaciones)} · ${f.capturas.ResultCard?.projectName}`);
  f.cerrar();
}
{
  /* Un proyecto que ya no existe, o que no es de la persona, no rompe la pantalla: las reglas se lo niegan y no se enseña nombre. */
  const f = await crearFlujo({ params: { experienceId: 'design', goal: 'Un logo para mi cafetería', projectId: 'borrado' }, proyectos: { borrado: new Error('permission-denied') } });
  await f.capturas.PlanCard.onCreate();
  await f.asentar();
  check('B8 · con un proyecto borrado o ajeno la pantalla sigue entera: termina, no enseña ningún nombre y no deja promesas rechazadas sin atender',
    f.capturas.ResultCard?.projectName === undefined && f.rechazos.length === 0 && !!f.capturas.ResultCard, f.rechazos.join(' · ') || 'sin rechazos');
  f.cerrar();
}
{
  /* La entrada desde la página de un proyecto: abrir una de sus creaciones lleva el proyecto, y de ahí hasta la llamada al servidor. */
  const reabierta = trabajoTerminado('job-9', { projectId: 'proj-1' });
  const p = await crearProyecto({ id: 'proj-1', trabajos: [reabierta] });
  const fila = p.botonQueEmpieza('Un logo para mi cafetería');
  check('B9 · la página del proyecto lista su creación', !!fila && /Un logo para mi cafetería/.test(p.texto() + fila.etiqueta), fila?.etiqueta);
  await p.tocar(fila.etiqueta);
  const paso = p.navegacion.find((n) => n[0] === 'navigate' && n[1] === 'CreatorFlow');
  check('B9 · abrir una creación DESDE el proyecto lleva el proyecto con ella: { experienceId, jobId, projectId }',
    !!paso && paso[2].experienceId === 'design' && paso[2].jobId === 'job-9' && paso[2].projectId === 'proj-1', JSON.stringify(paso));
  p.cerrar();

  /* …y la cadena entera del cliente: lo que navega ProjectScreen entra tal cual en Weë AI y sale hacia creatorChat. */
  const servidor = crearServidor();
  servidor.sembrar(reabierta);
  const f = await crearFlujo({ params: paso ? paso[2] : {}, servidor, proyectos: PROYECTOS });
  check('B9 · reabrir no crea nada: sin creatorChat al entrar', servidor.de('creatorChat').length === 0 && !!f.capturas.ResultCard, f.servidor.llamadas.map((l) => l.nombre).join(' · ') || 'sin llamadas');
  await f.capturas.ResultCard.onAnotherVersion();
  await f.asentar();
  check('B9 · y pedir otra versión de una creación reabierta desde su proyecto nace en ese proyecto (de la fila del proyecto a la llamada al servidor)',
    servidor.de('creatorChat').length === 1 && proyectoDe(servidor.de('creatorChat')[0]) === 'proj-1', proyectos(servidor.de('creatorChat')));
  f.cerrar();

  /* Lo que NO está conectado, dicho por lo que la pantalla hace hoy. */
  const q = await crearProyecto({ id: 'proj-1', trabajos: [] });
  q.capturas.SectionTitle.onAction();
  q.capturas.ClosingBanner.onPress();
  const alHub = q.navegacion.filter((n) => n[1] === 'WeeCreator');
  aviso(`OBSERVACIÓN CL-20: «Añadir» y «Crear algo nuevo» de la página de un proyecto llevan al selector de Weë AI (WeeCreator) ${alHub.every((n) => n.length === 2) ? 'SIN el proyecto' : 'con algo más'}: ${JSON.stringify(alHub)}.`);
  aviso('  El selector y las pantallas de cada especialista abren CreatorFlow por su cuenta y ninguna reenvía un proyecto: conectar «Añadir» toca unas ocho pantallas (entre ellas DesignScreen, de otra tarea). Propuesta en docs/WEE-DESIGN-CIERRE.md §7 (P11).');
  q.cerrar();
}
{
  /* La mitad del servidor, EJECUTADA con sus funciones compiladas y una Firestore en memoria (como `aceptacion-recorrido-servidor`). */
  const ANA = 'AbCdEfGhIjKlMnOpQrStUvWxYz01';
  const BEA = 'ZyXwVuTsRqPoNmLkJiHgFeDcBa99';
  const base = new BaseEnMemoria();
  const deshacerLaBase = instalarLaBase(() => base);
  const deshacerLasEsperas = acelerarLasEsperasCortas();
  const consola = apuntarLaConsola();
  try {
    await darDeAlta(base, ANA);
    await darDeAlta(base, BEA);
    const creator = lib('creator/index.js');
    const chat = (data, uid = ANA) => creator.creatorChat.run({ auth: { uid }, data });
    /* Lo mismo que pide `projectsService.jobsForProject`: los trabajos de ESA persona en ESE proyecto. */
    const delProyecto = async (uid, proyecto) => (await base.collection('creatorJobs').where('userId', '==', uid).where('projectId', '==', proyecto).get()).docs.map((d) => d.id);

    const conProyecto = await chat({ experienceId: 'design', goal: 'Un logo para mi cafetería', projectId: 'proj-1', locale: 'es' });
    const doc = base.leer(`creatorJobs/${conProyecto.jobId}`);
    check('B10 · SERVIDOR (ejecutado) · creatorChat guarda el projectId en el trabajo al crearlo, antes de terminar nada', doc?.projectId === 'proj-1' && doc?.status !== 'done', `status ${doc?.status} · projectId ${doc?.projectId}`);
    check('B10 · SERVIDOR · y el proyecto lo lista (la consulta de jobsForProject: dueño + proyecto) aunque la persona no haya guardado nada ni haya terminado',
      (await delProyecto(ANA, 'proj-1')).join() === conProyecto.jobId, (await delProyecto(ANA, 'proj-1')).join());
    const sinProyecto = await chat({ experienceId: 'design', goal: 'Un logo para mi cafetería', locale: 'es' });
    check('CONTROL · B10 · SERVIDOR · sin projectId el trabajo no entra en ningún proyecto', !('projectId' in base.leer(`creatorJobs/${sinProyecto.jobId}`)) && (await delProyecto(ANA, 'proj-1')).length === 1);
    const ajeno = await chat({ experienceId: 'design', goal: 'Un logo para mi cafetería', projectId: 'proyecto-de-bea', locale: 'es' });
    check('B10 · SERVIDOR · un projectId que no es de la persona no mete su trabajo en la lista de otra: la lista filtra por dueño',
      (await delProyecto(BEA, 'proyecto-de-bea')).length === 0 && (await delProyecto(ANA, 'proyecto-de-bea')).join() === ajeno.jobId);
    aviso(`OBSERVACIÓN CL-20 (H B-12): el servidor guardó projectId «${base.leer(`creatorJobs/${ajeno.jobId}`)?.projectId}» —un proyecto que ANA no tiene— sin comprobar nada (creator/index.ts:329), y firestore.rules:1064-1066 tampoco lo comprueba al moverlo.`);
    aviso('  El riesgo es acotado (el trabajo es de quien lo crea y el proyecto ajeno no lo lista); lo que queda es un trabajo con un proyecto que su dueña no puede leer. Validarlo es cambio de servidor y de reglas: propuesta en el informe, no se toca aquí.');
  } finally {
    consola.restaurar();
    deshacerLasEsperas();
    deshacerLaBase();
  }
}

/* ═══ C · CL-24 · EL AVISO DE LA CREACIÓN SE ANUNCIA Y SE LEE ════════════════════════════════════════════════════ */
titulo('C · CL-24 · el aviso de la creación: región viva y contraste AA en los dos temas');
const TEMAS = temasDeLaApp();
const aplanar = (s) => (Array.isArray(s) ? Object.assign({}, ...s.map(aplanar)) : s || {});
/**
 * Dibuja `components/creator/AvisoDeCreacion.tsx` TAL COMO ESTÁ con los colores de un tema de verdad y apunta lo que pinta: la
 * lámina de fuera (su fondo y si es una región viva), cada texto con su color, cada botón y cada icono. Solo se sustituye
 * React Native por piezas que dejan ver el estilo y las propiedades de accesibilidad.
 */
const dibujarAviso = (estado, tema, props = {}) => {
  const colores = TEMAS[tema];
  const visto = { raiz: null, textos: [], botones: [], iconos: [] };
  let cerrado = 0;
  const t = traductorDe('es');
  const cargar = crearCargador({
    dobles: {
      react: React,
      'react-native': {
        View: (p) => { visto.raiz ??= { estilo: aplanar(p.style), vivo: p.accessibilityLiveRegion, rol: p.accessibilityRole }; return h('div', null, p.children); },
        Text: (p) => { visto.textos.push({ texto: textoDe(p.children), color: aplanar(p.style).color }); return h('span', null, p.children); },
        TouchableOpacity: (p) => { visto.botones.push({ etiqueta: textoDe(p.children), rol: p.accessibilityRole, tocar: p.onPress }); return h('button', null, p.children); },
        StyleSheet: { create: (s) => s, hairlineWidth: 1 },
        Platform: { OS: 'android', select: (o) => o.android ?? o.default },
      },
      '@expo/vector-icons': { Ionicons: (p) => { visto.iconos.push({ nombre: p.name, color: p.color }); return h('i'); } },
      '../../contexts/ThemeContext': { useTheme: () => ({ theme: { colors: colores } }) },
      '../../contexts/IdiomaContext': { useT: () => t },
    },
  });
  const Aviso = cargar('components/creator/AvisoDeCreacion.tsx').default;
  const html = renderToStaticMarkup(h(Aviso, { estado, bottom: 0, onCerrar: () => { cerrado++; }, ...props }));
  return { ...visto, html, t, colores, cerrados: () => cerrado };
};
const es = traductorDe('es');
const claro = TEMAS.claro;
const oscuro = TEMAS.oscuro;

{
  check('CONTROL · C0 · los dos temas se leen del código (ThemeContext.tsx) con los colores que el aviso usa: el fondo de la tarjeta, el texto y el acento oscuro',
    ['card', 'text', 'textSecondary', 'accentDark'].every((k) => /^#[0-9A-F]{6}$/.test(claro[k]) && /^#[0-9A-F]{6}$/.test(oscuro[k])), `claro: card ${claro.card} · texto ${claro.text} · acentoOscuro ${claro.accentDark} — oscuro: card ${oscuro.card} · texto ${oscuro.text} · acentoOscuro ${oscuro.accentDark}`);
  check('CONTROL · C0 · y la fórmula es la de WCAG: negro sobre blanco 21:1, y el dorado de antes sobre blanco no pasaba (2,24:1) pero sí sobre el fondo oscuro',
    Math.abs(contraste('#000000', '#FFFFFF') - 21) < 0.001 && contraste(claro.accentDark, claro.card) < AA_TEXTO && contraste(oscuro.accentDark, oscuro.card) >= AA_TEXTO,
    `claro ${contraste(claro.accentDark, claro.card).toFixed(2)}:1 · oscuro ${contraste(oscuro.accentDark, oscuro.card).toFixed(2)}:1`);
}
{
  const quieto = dibujarAviso('quieto', 'claro');
  check('CONTROL · C1 · quieto no dibuja nada (el aviso no existe hasta que hay algo que contar)', quieto.html === '' && !quieto.raiz);
  for (const estado of ['creando', 'listo']) {
    const a = dibujarAviso(estado, 'claro');
    check(`C1 · «${estado}» se ANUNCIA: la lámina del aviso es una región viva, para que un lector de pantalla lo diga sin que la persona lo busque`,
      a.raiz?.vivo === 'polite' || a.raiz?.vivo === 'assertive' || a.raiz?.rol === 'alert', JSON.stringify(a.raiz && { vivo: a.raiz.vivo, rol: a.raiz.rol }));
    check(`C1 · y es «cortés» (polite) y no interrumpe: es un estado, no un error`, a.raiz?.vivo === 'polite' && a.raiz?.rol !== 'alert');
  }
}
for (const [tema, colores] of [['claro', claro], ['oscuro', oscuro]]) {
  const listo = dibujarAviso('listo', tema);
  const creando = dibujarAviso('creando', tema);
  const fondo = listo.raiz?.estilo.backgroundColor;
  check(`C2 · tema ${tema} · el aviso se pinta sobre el fondo de la tarjeta de ese tema (${colores.card})`, fondo === colores.card, String(fondo));
  const accion = listo.textos.find((x) => x.texto === es('studio.dismiss'));
  const ratioAccion = accion?.color ? contraste(accion.color, fondo) : 0;
  check(`C2 · tema ${tema} · el texto de la acción («${es('studio.dismiss')}») pasa AA (≥ ${AA_TEXTO}:1) sobre el fondo del aviso`, ratioAccion >= AA_TEXTO, `${accion?.color ?? '(sin color)'} sobre ${fondo} = ${ratioAccion.toFixed(2)}:1`);
  const sueltos = [...listo.textos, ...creando.textos].filter((x) => !x.color || contraste(x.color, fondo) < AA_TEXTO);
  check(`C2 · tema ${tema} · y todo el texto del aviso —el título, la pista, la acción y el «creando»— también (${[...listo.textos, ...creando.textos].length} textos)`,
    sueltos.length === 0, sueltos.map((x) => `«${x.texto}» ${x.color ?? '(sin color)'} = ${x.color ? contraste(x.color, fondo).toFixed(2) : '—'}:1`).join(' · ') || 'todos ≥ 4,5:1');
}
{
  /* La estructura no cambia: lo que se pinta y lo que se puede tocar es lo de siempre. */
  const listo = dibujarAviso('listo', 'claro');
  check('CONTROL · C3 · el aviso listo sigue siendo lo que era: un título, su pista y UNA acción que lo cierra (rol «button»)',
    listo.textos.map((x) => x.texto).join(' | ') === [es('studio.ready'), es('studio.readyHint'), es('studio.dismiss')].join(' | ')
    && listo.botones.length === 1 && listo.botones[0].rol === 'button' && listo.botones[0].etiqueta === es('studio.dismiss'), listo.textos.map((x) => x.texto).join(' | '));
  listo.botones[0].tocar();
  check('CONTROL · C3 · tocar la acción cierra el aviso (onCerrar, una vez)', listo.cerrados() === 1);
  const sinPista = dibujarAviso('listo', 'claro', { clavePista: null });
  check('CONTROL · C3 · sin pista (cuando la sección ya crea de verdad) desaparece solo la pista, y lo demás sigue', !sinPista.textos.some((x) => x.texto === es('studio.readyHint')) && sinPista.botones.length === 1);
  const creando = dibujarAviso('creando', 'claro');
  check('CONTROL · C3 · y «creando» sigue sin acción: solo el icono y su texto', creando.botones.length === 0 && creando.textos.map((x) => x.texto).join() === es('studio.creating') && creando.iconos.length === 1);
}

terminar();
