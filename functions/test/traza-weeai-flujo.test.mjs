/**
 * TRAZABILIDAD DE WEË AI · REABRIR UN TRABAJO EN `CreatorFlow` (R9 · E2).
 *
 * Reabrir un trabajo por su `jobId` —desde Mis creaciones, un proyecto, la portada de Weë AI o recargando la página— es
 * la recuperación de la que depende todo lo que tarda. La auditoría encontró tres huecos entre la interfaz, el servicio y
 * lo guardado:
 *
 *   A · Un trabajo PLANIFICADO reabierto salía sin niveles de calidad ni desglose, y el nivel elegido antes se perdía de
 *       la vista (el presupuesto solo llega con la respuesta de `creatorChat`, que al reabrir no se repite).
 *   B · Un `jobId` que no existe, o que no se puede leer, dejaba la pantalla «pensando…» para siempre.
 *   C · Un trabajo `cancelled` (el estado existe en el contrato aunque hoy nadie lo escriba) no pintaba nada.
 *
 * Se monta `screens/CreatorFlowScreen.tsx` DE VERDAD con el servicio de la app de verdad y un servidor de mentira debajo
 * (`_creatorflow-en-proceso.mjs`): lo que se mira es lo que saldría de la app hacia `creatorChat` y `creatorQuote`.
 */
import { crearFlujo, crearServidor, trabajoTerminado } from './_creatorflow-en-proceso.mjs';

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const titulo = (x) => console.log(`\n─── ${x} ───`);

/** Un trabajo de Weë Design ya planificado, guardado con un nivel de calidad (o sin él). */
const planificado = (id, quality) => trabajoTerminado(id, {
  status: 'planned', results: [], creditsCharged: 0, creditsEstimated: quality === 'high' ? 24 : 12,
  steps: [{ id: 'images', capability: 'image.generate', purpose: 'las propuestas', status: 'pending' }],
  ...(quality !== undefined ? { quality } : {}),
});

/**
 * El servidor de mentira solo avisa de los trabajos que existen. Firestore, con uno que no existe, avisa igual con
 * `exists() === false`: así se imita aquí, delegando todo lo demás en el de siempre.
 */
const conDocumentoAusente = (servidor) => {
  const original = servidor.firestore;
  servidor.firestore = new Proxy({}, { get: (_o, k) => (k === 'onSnapshot'
    ? (ref, ok, err) => {
      if (!(ref.id in servidor.trabajos)) { ok({ exists: () => false, id: ref.id, data: () => undefined }); return () => {}; }
      return original.onSnapshot(ref, ok, err);
    }
    : original[k]) });
  return servidor;
};

/* ═══ A · EL PRESUPUESTO DE UN TRABAJO REABIERTO ═══════════════════════════════════════════════════════════════════ */
titulo('A · un trabajo planificado reabierto recupera su presupuesto, con el nivel que tenía');
{
  const servidor = crearServidor();
  servidor.sembrar(planificado('job-p', 'high'));
  const f = await crearFlujo({ params: { experienceId: 'design', jobId: 'job-p' }, servidor });
  const cotizaciones = f.servidor.de('creatorQuote');
  check('A1) al reabrirlo se pide el presupuesto UNA vez, para ESE trabajo y con el nivel guardado (high)',
    cotizaciones.length === 1 && cotizaciones[0].jobId === 'job-p' && cotizaciones[0].quality === 'high', JSON.stringify(cotizaciones));
  check('A2) y no se abre otro trabajo (ningún creatorChat)', f.servidor.de('creatorChat').length === 0);
  check('A3) la tarjeta del plan vuelve a tener sus niveles y el nivel elegido marcado',
    Array.isArray(f.capturas.PlanCard?.pricing?.options) && f.capturas.PlanCard.pricing.options.length === 3 && f.capturas.PlanCard.quality === 'high',
    JSON.stringify({ q: f.capturas.PlanCard?.quality, n: f.capturas.PlanCard?.pricing?.options?.length }));
  check('A4) con el precio de ese nivel', f.capturas.PlanCard?.creditsEstimated === 24, String(f.capturas.PlanCard?.creditsEstimated));
  check('A5) sin promesas rechazadas', f.rechazos.length === 0, f.rechazos.join());
  f.cerrar();
}
{
  const servidor = crearServidor();
  servidor.sembrar(planificado('job-q'));
  const f = await crearFlujo({ params: { experienceId: 'design', jobId: 'job-q' }, servidor });
  const [c] = f.servidor.de('creatorQuote');
  check('A6) sin nivel guardado se pide el presupuesto sin nivel (no se inventa uno)', !!c && !('quality' in c), JSON.stringify(c));
  f.cerrar();
}
{
  const servidor = crearServidor();
  servidor.fallar('creatorQuote', Object.assign(new Error('ya en marcha'), { code: 'functions/failed-precondition', details: { code: 'DUPLICATE_REQUEST' } }));
  servidor.sembrar(planificado('job-r', 'high'));
  const f = await crearFlujo({ params: { experienceId: 'design', jobId: 'job-r' }, servidor });
  check('A7) si el servidor dice que ya no se puede cambiar, se queda lo que había: plan a la vista, sin error y sin reintentar solo',
    !!f.capturas.PlanCard && f.servidor.de('creatorQuote').length === 1 && !f.hayBoton(f.t('weeai.tryAgain')) && f.rechazos.length === 0);
  f.cerrar();
}
{
  const f = await crearFlujo({ params: { experienceId: 'design', goal: 'Un logo para mi cafetería' } });
  check('CONTROL · A8) un trabajo NUEVO no pide un presupuesto extra: llega con la respuesta de creatorChat',
    f.servidor.de('creatorChat').length === 1 && f.servidor.de('creatorQuote').length === 0 && !!f.capturas.PlanCard?.pricing);
  f.cerrar();
}
{
  const servidor = crearServidor();
  servidor.sembrar(trabajoTerminado('job-d'));
  const f = await crearFlujo({ params: { experienceId: 'design', jobId: 'job-d' }, servidor });
  check('CONTROL · A9) un trabajo TERMINADO reabierto no pide presupuesto: enseña su resultado', f.servidor.de('creatorQuote').length === 0 && !!f.capturas.ResultCard);
  f.cerrar();
}

/* ═══ B · UN TRABAJO QUE NO ESTÁ ═══════════════════════════════════════════════════════════════════════════════════ */
titulo('B · un jobId que no existe se dice, y se puede empezar de nuevo');
{
  const servidor = conDocumentoAusente(crearServidor());
  const f = await crearFlujo({ params: { experienceId: 'design', jobId: 'no-existe' }, servidor });
  check('B1) se dice que el trabajo no está', f.texto().includes(f.t('weeai.jobNotFound')), f.texto().slice(0, 160));
  check('B2) y ya no se queda «pensando» (la conversación no se monta)', !f.capturas.GuidedQuestion);
  check('B3) hay una salida: «Empezar de nuevo»', f.hayBoton(f.t('weeai.startOver')));
  check('B4) abrirlo no crea nada por su cuenta', f.servidor.de('creatorChat').length === 0);
  await f.tocar(f.t('weeai.startOver'));
  check('B5) «Empezar de nuevo» suelta el jobId de la dirección y abre UN trabajo nuevo',
    f.navegacion.some((n) => n[0] === 'setParams' && n[1] && n[1].jobId === undefined) && f.servidor.de('creatorChat').length === 1, JSON.stringify(f.navegacion));
  check('B6) y el aviso desaparece en cuanto hay trabajo', !f.texto().includes(f.t('weeai.jobNotFound')) && !!f.capturas.PlanCard);
  f.cerrar();
}
{
  const servidor = crearServidor();
  servidor.sembrar(planificado('job-s', 'high'));
  const f = await crearFlujo({ params: { experienceId: 'design', jobId: 'job-s' }, servidor });
  f.servidor.romperLaEscucha('job-s');
  await f.asentar();
  check('B7) si la escucha se rompe (permisos, red), también se dice en vez de quedarse en blanco', f.texto().includes(f.t('weeai.jobNotFound')));
  f.cerrar();
}

/* ═══ C · UN TRABAJO CANCELADO ════════════════════════════════════════════════════════════════════════════════════ */
titulo('C · un trabajo cancelado se ve como tal');
{
  const servidor = crearServidor();
  servidor.sembrar(trabajoTerminado('job-c', { status: 'cancelled', results: [] }));
  const f = await crearFlujo({ params: { experienceId: 'design', jobId: 'job-c' }, servidor });
  check('C1) dice su estado (cancelado) con la clave de siempre', f.texto().includes(f.t('weeai.jobCancelled')), f.texto().slice(0, 160));
  check('C2) y ofrece la salida de siempre («Probar otra vez»)', f.hayBoton(f.t('weeai.tryAgain')));
  f.cerrar();
}
{
  const servidor = crearServidor();
  servidor.sembrar(trabajoTerminado('job-f', { status: 'failed', results: [] }));
  const f = await crearFlujo({ params: { experienceId: 'design', jobId: 'job-f' }, servidor });
  check('CONTROL · C3) un trabajo fallido sigue diciendo lo de siempre', f.texto().includes(f.t('weeai.itDidNotWork')) && f.hayBoton(f.t('weeai.tryAgain')));
  f.cerrar();
}

console.log(failures === 0 ? '\n✔ traza-weeai-flujo: todo en orden' : `\n✘ traza-weeai-flujo: ${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
