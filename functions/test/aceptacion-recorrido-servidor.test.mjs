/**
 * ACEPTACIÓN · EL RECORRIDO DE UNA CREACIÓN, DE LA PRIMERA FRASE AL DINERO (Weë Design y Weë Chef).
 *
 * Catálogo y numeración de escenarios: `docs/WEE-ACEPTACION.md` (cada comprobación lleva el id del suyo).
 *
 * ── Qué es esto y qué no ────────────────────────────────────────────────────
 *
 * Hasta hoy cada pieza del camino real de Design y de Chef tenía sus pruebas —el planificador, el precio, el reclamo del
 * trabajo, el Credit Engine—, pero NINGUNA recorría el camino ENTERO: `creatorChat` → `creatorQuote` → `creatorRun` es
 * el único camino por el que una persona crea algo hoy, y no lo ejecutaba ninguna suite (tampoco hay una de emulador:
 * `docs/DESIGN.md` §5 ya lo pedía). Aquí se ejecutan los tres callables COMPILADOS, con el Credit Engine de verdad, el
 * libro de generaciones de verdad y el proveedor de prueba (`mock`), y lo único que se sustituye es el sitio donde se
 * guardan los documentos (una Firestore en memoria: `_firestore-en-memoria.mjs`).
 *
 * Cuenta lo que vive una persona, en el orden en que lo vive:
 *
 *   A · Design, de una frase a un logo pagado: preguntas, plan, PRECIO ANTES, cobro igual al precio, reparto en el libro.
 *   B · Chef: una receta, un menú de la semana, y «cocinar con lo que tengo» con y sin foto.
 *   C · Cuando el proveedor falla: comprensible, «no te cobré», reembolso exacto, y el reintento funciona.
 *   D · Cuando no alcanzan los Credits y cuando se pulsa dos veces.
 *   E · Sin sesión y con la sesión de otra persona.
 *   F · Lo que todavía no está (huecos conocidos, reproducidos): restricciones que se pierden en una idea larga, un
 *       trabajo abandonado que nadie barre y cancelar, que no existe.
 *
 * ── Lo que NO se prueba aquí, a propósito ──────────────────────────────────
 *
 *   · Ningún PRECIO en cifras: son de prueba y cambian. Se prueba que lo cobrado es lo mostrado, no cuánto es.
 *   · Un proveedor real: nada de esto sale de la máquina. La calidad de lo que devuelve una IA de verdad es de un canario
 *     gobernado, no de una suite.
 *   · Reglas de seguridad de Firestore, índices y Storage: solo las prueba un emulador (`*.emulator.mjs`).
 *
 * Usa el compilado (`npm run build` antes). Sin red, sin emulador, sin secretos. Unos 5 s.
 */
import fs from 'node:fs';
import path from 'node:path';
import { BaseEnMemoria, instalarLaBase, darDeAlta, saldoDe, lib } from './_firestore-en-memoria.mjs';
import { crearComprobador, acelerarLasEsperasCortas, apuntarLaConsola, PROVEEDORES_QUE_NO_SE_LEEN } from './_aceptacion.mjs';
import { crearCargador, RAIZ } from './filmmaker-cliente.mjs';

const { check, hueco, titulo, terminar } = crearComprobador();

let base = new BaseEnMemoria();
const deshacerLaBase = instalarLaBase(() => base);
const deshacerLasEsperas = acelerarLasEsperasCortas();
const consola = apuntarLaConsola();

const creator = lib('creator/index.js');
const { ADAPTERS } = lib('engine/registry.js');
const { ProviderError } = lib('engine/http.js');
const metaDeImagen = lib('engine/imageMeta.js');

const ANA = 'AbCdEfGhIjKlMnOpQrStUvWxYz01';
const BEA = 'ZyXwVuTsRqPoNmLkJiHgFeDcBa99';

const chat = (data, uid = ANA) => creator.creatorChat.run({ auth: { uid }, data });
const cotizar = (data, uid = ANA) => creator.creatorQuote.run({ auth: { uid }, data });
const crear = (data, uid = ANA) => creator.creatorRun.run({ auth: { uid }, data });
const intento = async (fn) => { try { return { ok: true, v: await fn() }; } catch (e) { return { ok: false, e }; } };

/* Una persona nueva, con los Credits de bienvenida. Cada escenario empieza en un mundo limpio. */
const mundo = async (saldo) => {
  base = new BaseEnMemoria();
  await darDeAlta(base, ANA, saldo === undefined ? {} : { saldo });
  await darDeAlta(base, BEA);
};
const trabajo = (jobId) => base.leer(`creatorJobs/${jobId}`);
const usos = () => base.de('creditTransactions').filter((t) => t.type === 'usage');
const libro = () => base.de('aiGenerations');
const sumaDe = (xs) => xs.reduce((a, b) => a + b, 0);

/** Lo que haría una persona que no sabe qué contestar: «No sé» si lo hay; si no, la primera opción; si no, un texto. */
const responder = (q) => {
  if (q.options.some((o) => o.id === 'idk')) return { optionId: 'idk' };
  if (q.options.length) return { optionId: q.options[0].id };
  return { text: 'La Espiga' };
};
/** La conversación entera, hasta que hay plan. Devuelve la última respuesta y las preguntas que se hicieron. */
const conversar = async (inicio, { uid = ANA, preparadas = {} } = {}) => {
  let r = await chat({ ...inicio, locale: 'es' }, uid);
  const preguntas = [];
  let vueltas = 0;
  while (r.status === 'asking' && vueltas++ < 8) {
    const q = r.question;
    preguntas.push(q);
    r = await chat({ jobId: r.jobId, answer: { questionId: q.id, ...(preparadas[q.id] ?? responder(q)) }, locale: 'es' }, uid);
  }
  return { r, preguntas };
};

/* ═══ A · DESIGN: DE UNA FRASE A UN LOGO PAGADO ═══════════════════════════ */
titulo('A · Weë Design: de una frase a un logo pagado');
{
  await mundo();
  const inicial = saldoDe(base, ANA);
  const { r: plan, preguntas } = await conversar(
    { experienceId: 'design', goal: 'Un logo para mi cafetería La Espiga, natural' },
    { preparadas: { name: { text: 'La Espiga' } } },
  );
  const ids = preguntas.map((q) => q.id);

  check('ACE-D-07 · lo que ya dijo no se vuelve a preguntar: el tipo de pieza («un logo») se entiende de la frase',
    !ids.includes('what'), ids.join(' · '));
  check('ACE-D-07 · y toda pregunta que hace tiene salida: «No sé» o texto libre (nadie se queda sin poder contestar)',
    preguntas.length > 0 && preguntas.every((q) => q.allowFreeText || q.options.some((o) => o.id === 'idk')), `${preguntas.length} preguntas`);
  check('ACE-D-07 · y son pocas: a lo sumo tres', preguntas.length <= 3, String(preguntas.length));
  check('ACE-D-07 · llega a un plan: un concepto y tres logos, con el nombre de la marca a la vista antes de crear',
    plan.status === 'planned' && plan.plan.steps.map((s) => s.capability).join('>') === 'text.generate>image.generate'
    && plan.plan.steps[1].input.count === 3 && plan.plan.steps[1].input.kind === 'logo' && /La Espiga/.test(plan.plan.explainToUser),
    plan.plan?.explainToUser);
  const visible = [plan.plan.explainToUser, ...plan.plan.steps.map((s) => s.purpose), ...preguntas.flatMap((q) => [q.text, ...q.options.map((o) => o.label)])].join(' · ');
  check('ACE-D-07 · y nada de lo que lee la persona nombra a un proveedor ni a un modelo', !PROVEEDORES_QUE_NO_SE_LEEN.test(visible));

  /* El precio, antes. */
  const p = plan.pricing;
  check('ACE-D-08 · el plan trae su PRECIO antes de crear: el total es la suma de los pasos y es el estimado del trabajo',
    !!p && p.total > 0 && p.total === sumaDe(p.steps.map((s) => s.credits)) && p.total === plan.creditsEstimated && p.steps.length === plan.plan.steps.length,
    p && `total ${p.total}`);
  check('ACE-D-08 · y se marca como precio de PRUEBA mientras no haya proveedor real (el trabajo es de demostración)',
    plan.demo === true && trabajo(plan.jobId).pricingMode === 'simulated');
  check('ACE-D-08 · mirar el plan no cuesta nada: ni una reserva, ni una fila en el libro, ni un Credit',
    saldoDe(base, ANA) === inicial && usos().length === 0 && libro().length === 0);

  /* Cambiar de nivel reprecia, sigue sin cobrar. */
  const opciones = p.options ?? [];
  const masCara = [...opciones].sort((a, b) => b.credits - a.credits)[0];
  const q = await cotizar({ jobId: plan.jobId, quality: masCara ? masCara.quality : 'high' });
  check('ACE-D-08 · elegir otro nivel de calidad reprecia al momento, con el mismo total en todos los sitios',
    q.creditsEstimated === q.pricing.total && (!masCara || q.creditsEstimated === masCara.credits)
    && trabajo(plan.jobId).creditsEstimated === q.creditsEstimated && trabajo(plan.jobId).quality === q.quality,
    `nivel ${q.quality} · total ${q.creditsEstimated}`);
  check('ACE-D-08 · y tampoco cobra', saldoDe(base, ANA) === inicial && usos().length === 0 && libro().length === 0);

  /* Crear. */
  const hecho = await crear({ jobId: plan.jobId, locale: 'es' });
  const j = trabajo(plan.jobId);
  check('ACE-D-09 · ACE-T-08 · crear termina bien, sin ninguna clave de proveedor (el modo demo termina el trabajo): queda hecho, con el concepto y las tres propuestas',
    hecho.status === 'done' && j.status === 'done' && j.results.length === 2 && j.results[0].kind === 'text'
    && j.results[1].kind === 'image' && (j.results[1].urls || []).length === 3 && j.steps.every((s) => s.status === 'done'),
    JSON.stringify(j.results.map((x) => `${x.kind}${x.urls ? `×${x.urls.length}` : ''}`)));
  check('ACE-D-09 · y el estado final se lee como un «listo», no como un técnico', /Listo/.test(j.progressText) && !!j.finishedAt);

  check('ACE-T-01 · el saldo baja EXACTAMENTE lo que se vio antes de crear (el del nivel elegido), ni un Credit más ni menos',
    saldoDe(base, ANA) === inicial - q.creditsEstimated && j.creditsCharged === q.creditsEstimated,
    `${inicial} → ${saldoDe(base, ANA)} (precio ${q.creditsEstimated})`);
  check('ACE-T-01 · una sola transacción de uso, COMPLETADA, por ese importe, ligada al trabajo',
    usos().length === 1 && usos()[0].status === 'COMPLETED' && usos()[0].amount === -q.creditsEstimated && usos()[0].id === `usage_${plan.jobId}`);
  const filas = libro();
  check('ACE-T-01 · el libro de generaciones reparte ese MISMO importe entre los pasos, y cada paso está completado',
    filas.length === 2 && filas.every((f) => f.status === 'COMPLETED') && sumaDe(filas.map((f) => f.creditsCharged)) === q.creditsEstimated,
    JSON.stringify(filas.map((f) => `${f.capability}:${f.creditsCharged}`)));

  /* Volver a pulsar «Crear» sobre lo hecho. */
  const antes = { saldo: saldoDe(base, ANA), usos: usos().length, libro: libro().length };
  const otra = await crear({ jobId: plan.jobId, locale: 'es' });
  check('ACE-D-12 · volver a pulsar «Crear» sobre un trabajo hecho no genera ni cobra otra vez',
    otra.status === 'done' && saldoDe(base, ANA) === antes.saldo && usos().length === antes.usos && libro().length === antes.libro);

  /* Reabrir: el documento lo guarda todo. */
  check('ACE-D-15 · el documento del trabajo guarda lo que hace falta para REABRIRLO en otra sesión: preguntas, respuestas, plan, pasos y resultados',
    j.userId === ANA && j.experienceId === 'design' && j.goal === 'Un logo para mi cafetería La Espiga, natural'
    && j.questions.length >= preguntas.length && j.answers.some((a) => a.questionId === 'name' && a.text === 'La Espiga')
    && j.answers.some((a) => a.inferred === true) && j.plan.steps.length === 2 && j.steps.length === 2 && j.results.length === 2);

  /* Una conversación a medias se puede reabrir en la MISMA pregunta (lo que hace la pantalla al abrir un trabajo con su id). */
  await mundo();
  const medias = await chat({ experienceId: 'design', goal: 'Un logo para mi cafetería', locale: 'es' });
  const docMedias = trabajo(medias.jobId);
  check('ACE-D-15 · una conversación a medias queda guardada de modo que se reabre en la misma pregunta: está «preguntando», la pregunta está en el documento y sin contestar',
    docMedias.status === 'asking' && docMedias.questions.some((q) => q.id === medias.question.id) && !docMedias.answers.some((a) => a.questionId === medias.question.id) && docMedias.plan === null);
}

/* ═══ B · CHEF: RECETA, MENÚ Y «COCINAR CON LO QUE TENGO» ═════════════════ */
titulo('B · Weë Chef: receta, menú y cocinar con lo que tengo');
{
  /* B1 · una receta */
  await mundo();
  const inicial = saldoDe(base, ANA);
  const { r: plan, preguntas } = await conversar({ experienceId: 'chef', goal: 'Una receta saludable para la familia', presetAnswers: [{ questionId: 'what', optionId: 'healthy' }] });
  check('ACE-C-07 · «para la familia» se entiende: solo falta preguntar cuánto tiempo hay, y con «No sé» como salida',
    preguntas.map((q) => q.id).join() === 'time' && preguntas[0].options.some((o) => o.id === 'idk'), preguntas.map((q) => q.id).join());
  check('ACE-C-06 · el plan es una receta paso a paso y una foto del plato, y lo dice con las palabras de la persona (la familia)',
    plan.status === 'planned' && plan.plan.steps.map((s) => s.capability).join('>') === 'text.generate>image.generate'
    && plan.plan.steps[1].input.count === 1 && /familia/.test(plan.plan.explainToUser), plan.plan?.explainToUser);
  check('ACE-C-06 · y no pide foto: nadie tiene que subir nada para una receta', !plan.plan.steps.some((s) => s.capability === 'vision.describe' || s.capability === 'image.edit'));
  const hecho = await crear({ jobId: plan.jobId, locale: 'es' });
  const j = trabajo(plan.jobId);
  check('ACE-C-06 · ACE-T-08 · crear (en modo demo, sin claves): la receta y la foto del plato, y el cobro es el precio visto',
    hecho.status === 'done' && j.results.map((x) => x.kind).join() === 'text,image' && j.creditsCharged === plan.pricing.total
    && saldoDe(base, ANA) === inicial - plan.pricing.total && usos().length === 1 && usos()[0].status === 'COMPLETED',
    `${inicial} → ${saldoDe(base, ANA)} (precio ${plan.pricing.total})`);
  check('ACE-C-15 · el libro reparte ese importe entre la receta y la foto, y suma lo cobrado',
    libro().length === 2 && sumaDe(libro().map((f) => f.creditsCharged)) === plan.pricing.total);
}
{
  /* B2 · un menú de la semana */
  await mundo();
  const inicial = saldoDe(base, ANA);
  const { r: plan } = await conversar({ experienceId: 'chef', goal: 'Un menú vegetariano para toda la semana' });
  const pasos = plan.plan.steps;
  check('ACE-C-08 · un menú de la semana son tres pasos encadenados: el menú, los precios de los ingredientes y la lista de compras',
    pasos.map((s) => s.capability).join('>') === 'text.generate>text.search>text.generate'
    && pasos[1].dependsOn?.join() === pasos[0].id && pasos[2].dependsOn?.join() === pasos[0].id, pasos.map((s) => s.id).join('>'));
  check('ACE-C-08 · cada paso lleva su precio y el total es lo estimado (la búsqueda de precios cuenta aparte)',
    plan.pricing.steps.length === 3 && plan.pricing.steps.some((s) => s.service === 'ai_search') && plan.pricing.total === plan.creditsEstimated);
  const hecho = await crear({ jobId: plan.jobId, locale: 'es' });
  const j = trabajo(plan.jobId);
  check('ACE-C-08 · crear: tres resultados, en el orden del plan, y el cobro es el precio visto',
    hecho.status === 'done' && j.results.length === 3 && j.results.map((x) => x.stepId).join() === pasos.map((s) => s.id).join()
    && saldoDe(base, ANA) === inicial - plan.pricing.total);
}
{
  /* B3 · cocinar con lo que tengo: SIN foto */
  await mundo();
  const inicial = saldoDe(base, ANA);
  const { r: plan } = await conversar({ experienceId: 'chef', goal: 'Cocinar con los ingredientes que tengo en casa', presetAnswers: [{ questionId: 'what', optionId: 'cook' }] });
  check('ACE-C-05 · «cocinar con lo que tengo» planifica mirar la foto primero, y el servidor lo sabe',
    plan.plan.steps[0].capability === 'vision.describe' && lib('creator/inputs.js').needsInputImage(plan.plan.steps));
  const sinFoto = await intento(() => crear({ jobId: plan.jobId, locale: 'es' }));
  check('ACE-C-05 · pedir crear SIN la foto se rechaza con su motivo («falta la foto») y en palabras de persona',
    !sinFoto.ok && sinFoto.e.code === 'invalid-argument' && sinFoto.e.details?.reason === 'needs_image' && /foto/i.test(sinFoto.e.message), sinFoto.e?.message);
  check('ACE-C-05 · y no cobra nada ni gasta IA: el trabajo sigue planificado, sin reserva y sin libro',
    saldoDe(base, ANA) === inicial && usos().length === 0 && libro().length === 0 && trabajo(plan.jobId).status === 'planned' && !trabajo(plan.jobId).runId);

  /* B4 · CON foto propia */
  process.env.STORAGE_BUCKET = 'wee-dev-geovet.firebasestorage.app';
  const original = metaDeImagen.imageDimensions;
  metaDeImagen.imageDimensions = async () => ({ width: 1200, height: 900 });
  const FOTO = `https://firebasestorage.googleapis.com/v0/b/wee-dev-geovet.firebasestorage.app/o/users%2F${ANA}%2Fcreator-inputs%2Fnevera.jpg?alt=media&token=abc`;
  const vistas = [];
  const corre = ADAPTERS.mock.run;
  ADAPTERS.mock.run = async (req) => { if (req.capability === 'vision.describe') vistas.push(req.input.imageUrl); return corre.call(ADAPTERS.mock, req); };
  const adjunta = await chat({ jobId: plan.jobId, imageUrl: FOTO, locale: 'es' });
  check('ACE-C-05 · adjuntar la foto a un trabajo ya planificado conserva el plan y vuelve a enseñar el precio',
    adjunta.status === 'planned' && adjunta.plan.steps.length === plan.plan.steps.length && adjunta.pricing.total === plan.pricing.total && adjunta.inputImageUrl === FOTO);
  const ajena = await intento(() => chat({ jobId: plan.jobId, imageUrl: FOTO.replace(ANA, BEA), locale: 'es' }));
  check('ACE-C-05 · una foto de OTRA persona no se acepta (solo las del Storage de la propia cuenta)', !ajena.ok && ajena.e.details?.code === 'INVALID_REQUEST');
  const hecho = await crear({ jobId: plan.jobId, locale: 'es' });
  check('ACE-C-05 · con la foto, se crea: el primer paso recibe SU foto, y se cobra el precio visto',
    hecho.status === 'done' && vistas.length === 1 && vistas[0] === FOTO && saldoDe(base, ANA) === inicial - plan.pricing.total && trabajo(plan.jobId).inputImageUrl === FOTO,
    `precio ${plan.pricing.total}`);
  ADAPTERS.mock.run = corre;
  metaDeImagen.imageDimensions = original;
}

/* ═══ C · CUANDO EL PROVEEDOR FALLA ═══════════════════════════════════════ */
titulo('C · Cuando el proveedor falla: comprensible, sin cobro, y el reintento funciona');
{
  await mundo();
  const inicial = saldoDe(base, ANA);
  const corre = ADAPTERS.mock.run;
  let falla = 'image.generate';
  ADAPTERS.mock.run = async (req) => {
    if (falla && req.capability === falla) throw new ProviderError('gemini respondió 503: overloaded (clave sk-123-secreta)', 'mock', 503, true);
    return corre.call(ADAPTERS.mock, req);
  };
  const { r: plan } = await conversar({ experienceId: 'design', goal: 'Una casa moderna' });
  const fallido = await intento(() => crear({ jobId: plan.jobId, locale: 'es' }));
  const j = trabajo(plan.jobId);
  const e = fallido.e;
  check('ACE-D-10 · el fallo llega a la persona como un error CONTROLADO: código de motor y una frase que dice «no te cobré»',
    !fallido.ok && e.details?.code === 'PROVIDER_ERROR' && e.details?.retryable === true && /No te cobré/.test(e.message), e && e.message);
  check('ACE-D-10 · sin proveedor, sin modelo y sin la clave ni el texto interno que dijo el proveedor',
    !PROVEEDORES_QUE_NO_SE_LEEN.test(e.message) && !/sk-123|overloaded|503/.test(e.message + JSON.stringify(e.details ?? {})));
  check('ACE-D-10 · el trabajo queda «fallido» con una frase amable en español y SIN cobro, con el primer paso hecho y el que falló marcado',
    j.status === 'failed' && j.creditsCharged === 0 && /No te cobré/.test(j.progressText) && !PROVEEDORES_QUE_NO_SE_LEEN.test(j.progressText)
    && j.steps.map((s) => s.status).join() === 'done,failed');
  check('ACE-T-01 · el dinero vuelve EXACTO: mismo saldo, la reserva queda REFUNDED y existe el reembolso enlazado por el mismo importe',
    saldoDe(base, ANA) === inicial && usos().length === 1 && usos()[0].status === 'REFUNDED'
    && base.de('creditTransactions').filter((t) => t.type === 'refund').map((t) => t.amount).join() === String(plan.creditsEstimated));
  check('ACE-T-01 · y el libro no deja nada cobrado: el paso que falló está FAILED y la suma cobrada es 0',
    libro().some((f) => f.status === 'FAILED') && sumaDe(libro().map((f) => f.creditsCharged || 0)) === 0);
  check('ACE-D-10 · el error técnico SÍ queda en el registro del servidor (para quien lo arregla), aunque no llegue a la persona',
    consola.lineas.some((l) => l.nivel === 'error' && new RegExp(plan.jobId).test(l.texto)));

  /* Reintentar: lo que hace el botón «Intentar de nuevo» es empezar OTRO trabajo con la misma frase. */
  falla = null;
  const { r: otro } = await conversar({ experienceId: 'design', goal: 'Una casa moderna' });
  const hecho = await crear({ jobId: otro.jobId, locale: 'es' });
  check('ACE-D-10 · reintentar funciona: otro trabajo, que cobra UNA vez el precio de ese trabajo, sin tocar el reembolso del anterior',
    hecho.status === 'done' && otro.jobId !== plan.jobId && saldoDe(base, ANA) === inicial - otro.pricing.total
    && usos().filter((t) => t.status === 'COMPLETED').length === 1 && usos().filter((t) => t.status === 'REFUNDED').length === 1);
  ADAPTERS.mock.run = corre;
}

/* ═══ D · SALDO INSUFICIENTE Y DOBLE PULSACIÓN ════════════════════════════ */
titulo('D · Cuando no alcanzan los Credits y cuando se pulsa dos veces');
{
  await mundo();
  const { r: plan } = await conversar({ experienceId: 'chef', goal: 'Una receta saludable para dos', presetAnswers: [{ questionId: 'what', optionId: 'healthy' }] });
  const precio = plan.pricing.total;
  base.docs.get(`users/doc_${ANA}`).creditsBalance = precio - 1;
  const corto = await intento(() => crear({ jobId: plan.jobId, locale: 'es' }));
  const j = trabajo(plan.jobId);
  check('ACE-D-11 · si no alcanza, el error dice cuánto hace falta y cuánto hay (para enseñar el aviso y la tienda), sin frase técnica',
    !corto.ok && corto.e.code === 'failed-precondition' && corto.e.details?.code === 'INSUFFICIENT_CREDITS'
    && corto.e.details.required === precio && corto.e.details.available === precio - 1, JSON.stringify(corto.e?.details));
  check('ACE-D-11 · y no pasa nada más: el trabajo sigue planificado y SIN arrancar (no parpadea «en marcha»), sin reserva ni libro ni cobro',
    j.status === 'planned' && j.steps.every((s) => s.status === 'pending') && !j.runId && usos().length === 0 && libro().length === 0
    && saldoDe(base, ANA) === precio - 1);
  base.docs.get(`users/doc_${ANA}`).creditsBalance = precio + 10;
  const hecho = await crear({ jobId: plan.jobId, locale: 'es' });
  check('ACE-D-11 · tras conseguir Credits, el MISMO trabajo se crea sin volver a empezar, y se cobra el precio', hecho.status === 'done' && saldoDe(base, ANA) === 10 && usos().length === 1);
}
{
  await mundo();
  const inicial = saldoDe(base, ANA);
  const { r: plan } = await conversar({ experienceId: 'chef', goal: 'Una receta saludable para dos', presetAnswers: [{ questionId: 'what', optionId: 'healthy' }] });
  const [uno, dos] = await Promise.all([intento(() => crear({ jobId: plan.jobId, locale: 'es' })), intento(() => crear({ jobId: plan.jobId, locale: 'es' }))]);
  const fallos = [uno, dos].filter((x) => !x.ok);
  check('ACE-D-12 · pulsar «Crear» dos veces a la vez (dos dedos, dos pantallas): se cobra UNA vez el precio y hay UNA transacción',
    saldoDe(base, ANA) === inicial - plan.pricing.total && usos().length === 1 && usos()[0].status === 'COMPLETED' && trabajo(plan.jobId).status === 'done');
  check('ACE-D-12 · y si una de las dos recibe un error es «esa creación ya está en marcha», nunca un fallo técnico ni un segundo cobro',
    fallos.length <= 1 && fallos.every((x) => x.e.code === 'already-exists' && x.e.details?.code === 'DUPLICATE_REQUEST' && /ya está en marcha/.test(x.e.message)),
    fallos.map((x) => x.e.message).join(' | ') || 'ninguna falló: la segunda encontró el trabajo hecho');
}

/* ═══ E · SIN SESIÓN Y CON LA SESIÓN DE OTRA PERSONA ══════════════════════ */
titulo('E · Sin sesión y con la sesión de otra persona');
{
  await mundo();
  const { r: plan } = await conversar({ experienceId: 'design', goal: 'Un logo para mi cafetería' });
  const instante = { doc: JSON.stringify(trabajo(plan.jobId)), saldo: saldoDe(base, ANA), usos: usos().length, libro: libro().length, cuentaBea: saldoDe(base, BEA) };
  const sinSesion = await Promise.all([
    intento(() => creator.creatorChat.run({ auth: null, data: { experienceId: 'design', goal: 'x' } })),
    intento(() => creator.creatorQuote.run({ auth: null, data: { jobId: plan.jobId } })),
    intento(() => creator.creatorRun.run({ auth: null, data: { jobId: plan.jobId } })),
  ]);
  check('ACE-D-22 · sin sesión nadie conversa, cotiza ni crea: «inicia sesión para crear con Weë»',
    sinSesion.every((x) => !x.ok && x.e.code === 'unauthenticated' && /Inicia sesión/.test(x.e.message)));
  const ajeno = await Promise.all([
    intento(() => chat({ jobId: plan.jobId, answer: { questionId: 'name', text: 'robado' } }, BEA)),
    intento(() => cotizar({ jobId: plan.jobId, quality: 'max' }, BEA)),
    intento(() => crear({ jobId: plan.jobId, locale: 'es' }, BEA)),
  ]);
  check('ACE-D-23 · con la sesión de OTRA persona, el trabajo ajeno no se contesta, no se cotiza y no se crea (y al cotizar ni siquiera se confirma que exista)',
    ajeno.every((x) => !x.ok && ['UNAUTHORIZED', 'INVALID_REQUEST'].includes(x.e.details?.code)) && ajeno[1].e.details.code === 'INVALID_REQUEST',
    ajeno.map((x) => x.e?.message).join(' | '));
  check('ACE-D-23 · y no cambia nada: ni el trabajo, ni su saldo, ni el de quien lo intentó, ni una transacción',
    JSON.stringify(trabajo(plan.jobId)) === instante.doc && saldoDe(base, ANA) === instante.saldo && saldoDe(base, BEA) === instante.cuentaBea
    && usos().length === instante.usos && libro().length === instante.libro);
}

/* ═══ F · LO QUE TODAVÍA NO ESTÁ (huecos conocidos, reproducidos) ═════════ */
titulo('F · Huecos conocidos');
{
  /* F1 · las restricciones de la cocina viajan al final de la idea, y el servidor corta la idea en 300 caracteres. */
  /* Solo el español: cargar los dieciséis diccionarios cuesta unos 3 s de transpilado y aquí no hacen falta. */
  const cargar = crearCargador();
  const { crearTraductor } = cargar('i18n/traducir.ts');
  const T = crearTraductor('es', { es: cargar('i18n/textos/es/index.ts').es }, {});
  const { formatearLista } = cargar('i18n/formato.ts');
  const AJ = cargar('constants/chefTools.ts').AJUSTES_DE_COCINA;
  const sinGluten = T(AJ.find((g) => g.id === 'diet').opciones.find((o) => o.id === 'glutenFree').clave);
  /*
   * Lo que arma `ChefScreen.alEnviar`: la idea y lo elegido en los ajustes, unidos por `chef.goalWith`. Esta prueba NO fija en qué
   * ORDEN ni con qué signos van (hoy: «idea (ajustes)», al final): eso es lo que la decisión de H `B-03` puede cambiar, y el único
   * sitio que lo fija con su nombre es la comprobación «BLOCKED — HUMAN DECISION» de `aceptacion-pantallas` (grupo C).
   */
  const mandar = (idea) => T('chef.goalWith', { idea, ajustes: formatearLista([sinGluten], 'es') });
  const pantalla = fs.readFileSync(path.resolve(RAIZ, 'screens/ChefScreen.tsx'), 'utf8');
  check('ACE-C-04 · (precondición) la pantalla une la idea y los ajustes con `chef.goalWith`, y lo unido lleva las dos cosas',
    /t\('chef\.goalWith', \{ idea, ajustes: formato\.lista\(/.test(pantalla) && mandar('Una cena').includes('Una cena') && mandar('Una cena').includes(sinGluten), mandar('Una cena'));

  await mundo();
  const corta = await chat({ experienceId: 'chef', goal: mandar('Una cena para mis amigos'), locale: 'es' });
  check('ACE-C-09 · con una idea corta, la restricción llega entera al trabajo', new RegExp(sinGluten).test(trabajo(corta.jobId).goal), trabajo(corta.jobId).goal);
  const larga = 'Quiero preparar una cena especial para mis amigos, con varios platos y que sobre algo para el día siguiente. '.repeat(3).trim();
  const enviada = mandar(larga);
  const guardada = trabajo((await chat({ experienceId: 'chef', goal: enviada, locale: 'es' })).jobId).goal;
  /* AISLADA a propósito: es lo ÚNICO de este archivo que fija el recorte a 300 (`creator/index.ts:310`). Al decidir B-03, se invierte solo esta. */
  hueco('ACE-C-09', 'BLOCKED — HUMAN DECISION (H B-03 i · G D-CHEF-5): una restricción elegida en los ajustes no se pierde nunca (con una idea de ~330 caracteres, el servidor corta en 300 y «sin gluten» desaparece sin avisar)',
    new RegExp(sinGluten, 'i').test(guardada), `se mandaron ${enviada.length} caracteres y se guardaron ${guardada.length}; opciones de H: que la caja avise, o subir el tope del servidor (mueve la cerca F4 de puente-pre-f1d), o que la restricción viaje fuera del texto`);
}
{
  /* F2 · un trabajo abandonado en marcha: solo se cierra si alguien vuelve a llamar a creatorRun. Ningún barrido mira creatorJobs. */
  const fuentes = (carpeta) => fs.readdirSync(path.resolve(RAIZ, 'functions/src', carpeta), { recursive: true }).map(String).filter((f) => f.endsWith('.ts'))
    .map((f) => fs.readFileSync(path.resolve(RAIZ, 'functions/src', carpeta, f), 'utf8'));
  const programadas = ['settlement', 'runtime', 'media'].flatMap(fuentes).filter((s) => /onSchedule\(/.test(s) || /barrido|barrendero/i.test(s));
  check('ACE-T-04 · (la prueba mira de verdad: hay tareas programadas y barredores que revisar)', programadas.length >= 2, `${programadas.length} archivos`);
  hueco('ACE-T-04', 'ACE-D-14 · un trabajo de Weë AI que se quedó «en marcha» porque murió el proceso se cierra y se devuelve SOLO, sin esperar a que la persona vuelva a pulsar',
    programadas.some((s) => /creatorJobs/.test(s)), 'ninguna tarea programada ni barredor lee `creatorJobs`: solo se repara al volver a llamar a creatorRun (plazos-y-liquidacion) y la pantalla no lo ofrece');
}
{
  /* F3 · cancelar: el estado existe, nadie lo escribe y la pantalla no lo ofrece. */
  const servidor = fs.readdirSync(path.resolve(RAIZ, 'functions/src/creator')).filter((f) => f.endsWith('.ts'))
    .map((f) => fs.readFileSync(path.resolve(RAIZ, 'functions/src/creator', f), 'utf8')).join('\n');
  const progreso = fs.readFileSync(path.resolve(RAIZ, 'components/creator/JobProgress.tsx'), 'utf8');
  const flujo = fs.readFileSync(path.resolve(RAIZ, 'screens/CreatorFlowScreen.tsx'), 'utf8');
  check('ACE-D-13 · la pantalla NO promete lo que no puede cumplir: ni «cancelar» ni «parar» mientras se crea',
    !/\b(cancel\w*|parar|detener)\b/i.test(progreso.replace(/\/\*[\s\S]*?\*\//g, '')) && !/handleCancel|cancelJob|creatorCancel/i.test(flujo));
  hueco('ACE-D-13', 'una creación en marcha se puede cancelar (el estado «cancelled» existe en el contrato pero ninguna función lo escribe y no hay callable para pedirlo)',
    /status:\s*'cancelled'/.test(servidor) || /export const creatorCancel/.test(fs.readFileSync(path.resolve(RAIZ, 'functions/src/creator/index.ts'), 'utf8')),
    'ver docs/WEE-DESIGN-FLOWS.md §4: «Cancelar: No existe»');
}

deshacerLasEsperas();
consola.restaurar();
deshacerLaBase();
terminar();
