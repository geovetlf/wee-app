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
 *
 * Cada defecto trae su CONTROL, para que un verde no pueda ser un verde vacío. Sin red, sin emulador, sin secretos.
 *
 * ── Lo que NO se prueba aquí ────────────────────────────────────────────────
 *
 * El aspecto, el desplazamiento, el teclado ni un lector de pantalla de verdad (eso es de un dispositivo; CL-26), y el
 * servidor de verdad en emulador (`design-recorrido.emulator.mjs`, CL-18). El servidor se sustituye por uno de mentira que
 * contesta lo mínimo; lo que decide el servidor con la carga que recibe se comprueba, ejecutado, en B.
 */
import { crearComprobador } from './_aceptacion.mjs';
import { crearFlujo } from './_creatorflow-en-proceso.mjs';

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
  const servidor = (await import('./_creatorflow-en-proceso.mjs')).crearServidor();
  servidor.fallar('creatorChat', (await import('./_creatorflow-en-proceso.mjs')).errorDeRed());
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

terminar();
