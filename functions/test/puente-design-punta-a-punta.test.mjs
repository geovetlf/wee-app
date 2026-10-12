/*
 * EL PUENTE DE WEË DESIGN, DE PUNTA A PUNTA (R8, PAN, 2026-10-12).
 *
 * `puente-design.test.mjs` demuestra QUÉ sale de «Crear»: ejecuta la pantalla de verdad y comprueba el contexto que navega a `CreatorFlow`. Lo que
 * no hacía —porque cuando se escribió el servidor tenía defectos que todavía no estaban arreglados— es comprobar que eso que sale ENTRA bien en
 * el servidor. Con las correcciones de R7-Design en la base ya se puede, y esta suite lo ejecuta de verdad, sin red ni emulador:
 *
 *   pantalla de Design (`DesignScreen`, el código de verdad, tocada por `_pantallas.mjs`)
 *     → el contexto que navega a `CreatorFlow`
 *     → el servicio de la app (`services/creatorService.ts`, el de verdad: `start` y `answer`)
 *     → `creatorChat` COMPILADO (`functions/lib`), con el Credit Engine y el libro de generaciones de verdad
 *     → sobre una Firestore en memoria (`_firestore-en-memoria.mjs`, la de `aceptacion-recorrido-servidor`).
 *
 *   E · del botón al servidor: el `goal` llega intacto (con y sin ajustes en palabras, en español y en inglés), el servidor NO repregunta lo
 *       que ya se dijo, toda pregunta con botones ofrece «No sé» (CL-10), «Un post para mi marca» es un afiche y no un logo (CL-11) y llegar
 *       no cobra nada: ni un Credit, ni una reserva, ni una generación, y el precio se ve ANTES de crear.
 *   F · P3 y el puente conviven en la misma pantalla: «Mis creaciones» enseña lo creado y «Crear» sigue llevando solo lo escrito, mientras
 *       carga y aunque falle; y reabrir una creación no crea ni cuesta nada.
 *
 * Lo que NO es: no ejecuta `creatorQuote` ni `creatorRun` (eso es `aceptacion-recorrido-servidor`: precio, cobro y reembolso), ni un proveedor
 * real, ni el aspecto en pantalla. Usa el compilado (`npm run build` antes). Unos 10 s.
 */
import { crearEntorno } from './_pantallas.mjs';
import { BaseEnMemoria, instalarLaBase, darDeAlta, saldoDe, lib } from './_firestore-en-memoria.mjs';
import { apuntarLaConsola, acelerarLasEsperasCortas } from './_aceptacion.mjs';
import { crearCargador } from './filmmaker-cliente.mjs';

const consola = apuntarLaConsola();
/* El proveedor de prueba «piensa» 0,6–1,1 s por llamada a propósito; aquí no hace falta esperarlo (las esperas largas, las de verdad, no se tocan). */
const sinEsperas = acelerarLasEsperasCortas();
const imprimir = (s) => process.stdout.write(`${s}\n`);
let failures = 0;
const check = (name, cond, extra = '') => {
  imprimir((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const grupo = (titulo) => imprimir(`\n─── ${titulo} ───`);
const prueba = async (name, fn) => {
  try { const [ok, extra] = await fn(); check(name, ok === true, extra); } catch (e) { check(name, false, `lanzó: ${e && e.message ? e.message : e}`); }
};

/* ── El traductor y las constantes de VERDAD ── */
const base = crearCargador({ dobles: { 'react-native': { Platform: { OS: 'android', select: (o) => o.android ?? o.default }, Dimensions: { get: () => ({ width: 390, height: 800 }) } } } });
const { crearTraductor } = base('i18n/traducir.ts');
const DICCIONARIOS = { es: base('i18n/textos/es/index.ts').es, en: base('i18n/textos/en/index.ts').en };
const traductorDe = (idioma) => crearTraductor(idioma, DICCIONARIOS, {});

/* ── La pantalla de verdad, con la sesión y el servicio de trabajos a la vista ── */
const comunes = (idioma) => ({ colores, usuario, movil }) => {
  const t = traductorDe(idioma);
  const tema = { useTheme: () => ({ theme: { colors: colores } }), enTemaClaro: (C) => C };
  const habla = { useT: () => t, useIdioma: () => ({ t, locale: idioma }) };
  return {
    '../contexts/ThemeContext': tema, '../../contexts/ThemeContext': tema,
    '../contexts/IdiomaContext': habla, '../../contexts/IdiomaContext': habla,
    '../contexts/AuthContext': { useAuth: () => ({ user: usuario }) },
    '../hooks/useResponsive': { useResponsive: () => ({ isMobile: movil, isTablet: false, isDesktop: !movil }) },
    '../components/BarraInferior': { ALTO_BARRA: 64 },
  };
};
const doblesDeDesign = (idioma) => (ctx) => {
  const { capturar } = ctx;
  return {
    ...comunes(idioma)(ctx),
    '../components/creator/CajaQueCrece': { PaginaDeCajas: capturar('PaginaDeCajas') },
    '../components/studio/StudioHeader': capturar('StudioHeader'),
    '../components/studio/StudioPromptComposer': capturar('StudioPromptComposer'),
    '../components/creator/AjustesContextuales': capturar('AjustesContextuales'),
    '../components/creator/AvisoDeCreacion': capturar('AvisoDeCreacion'),
    '../components/creator/FilaDeCreaciones': capturar('FilaDeCreaciones'),
    '../components/creator/FichaDeContexto': capturar('FichaDeContexto'),
    '../components/EspacioDeEscritura': { __esModule: true, default: capturar('EspacioDeEscritura'), useAlturaDelTeclado: () => 0 },
    '../components/design/DesignExplore': capturar('DesignExplore'),
    '../components/design/DesignPanel': capturar('DesignPanel'),
  };
};
const trabajoDe = (id, experienceId, goal, status = 'done', extra = {}) => ({
  id, userId: 'u1', experienceId, goal, status, questions: [], answers: [], plan: null, steps: [], results: [], progressText: '',
  creditsEstimated: 5, creditsCharged: status === 'done' ? 5 : 0, demo: true, ...extra,
});
/**
 * La pantalla montada UNA vez por idioma (transpilar el código de verdad cuesta lo suyo), con su servicio de trabajos de mentira: lo que
 * había en la cuenta, y si falla o tarda. `montar` la deja en blanco para cada escenario.
 */
const crearMundoDePantalla = (idioma) => {
  const lista = [];
  const control = { falla: false, diferido: false, pendientes: [] };
  const env = crearEntorno({ pantalla: 'screens/DesignScreen.tsx', dobles: doblesDeDesign(idioma), usuario: { uid: 'u1' } });
  env.cargar('services/creatorService.ts').creatorService.getMyJobsDe = (_uid, pertenece, cantidad) => {
    if (control.falla) return Promise.reject(new Error('sin red'));
    const datos = lista.filter(pertenece).slice(0, cantidad);
    return control.diferido ? new Promise((resolver) => control.pendientes.push(() => resolver(datos))) : Promise.resolve(datos);
  };
  const montar = (trabajosDeLaCuenta = []) => {
    env.reiniciar();
    lista.length = 0;
    lista.push(...trabajosDeLaCuenta);
    control.falla = false;
    control.diferido = false;
    control.pendientes.length = 0;
    return { env, control, lista };
  };
  return { env, montar };
};
const mundos = { es: crearMundoDePantalla('es'), en: crearMundoDePantalla('en') };
/** Lo que navega la pantalla al tocar «Crear» con esa idea y esos ajustes: el contexto de `CreatorFlow`. */
const desdeCrear = ({ idioma = 'es', texto, ajustes = {} }) => {
  const { env } = mundos[idioma].montar();
  env.dibujar();
  env.capturas.StudioPromptComposer.onCambiar(texto);
  env.dibujar();
  for (const [grupo_, opcion] of Object.entries(ajustes)) { env.capturas.AjustesContextuales.onElegir(grupo_, opcion); env.dibujar(); }
  env.olvidar();
  env.capturas.StudioPromptComposer.onCrear();
  const paso = env.navegacion.find((n) => n[1] === 'CreatorFlow');
  return paso ? paso[2] : undefined;
};

/* ── El servidor de verdad (compilado) sobre una Firestore en memoria, y el servicio de la app delante ── */
let almacen = new BaseEnMemoria();
instalarLaBase(() => almacen);
const creator = lib('creator/index.js');
const ANA = 'AbCdEfGhIjKlMnOpQrStUvWxYz01';
/* `httpsCallable` de la app, atado al callable compilado: lo que `creatorService` manda sale tal cual hacia `creatorChat`. */
const enviadas = [];
const puente = crearCargador({
  dobles: {
    'firebase/functions': { httpsCallable: (_functions, nombre) => async (datos) => { enviadas.push({ nombre, datos }); return { data: await creator[nombre].run({ auth: { uid: ANA }, data: datos }) }; } },
    'firebase/firestore': new Proxy({}, { get: () => () => { throw new Error('sin red'); } }),
    '../config/firebase': { db: {}, functions: {} },
  },
});
const { creatorService: servicio } = puente('services/creatorService.ts');
const trabajo = (jobId) => almacen.leer(`creatorJobs/${jobId}`);
const usos = () => almacen.de('creditTransactions').filter((t) => t.type === 'usage');
const libro = () => almacen.de('aiGenerations');
const mundo = async () => { almacen = new BaseEnMemoria(); enviadas.length = 0; await darDeAlta(almacen, ANA); };
/** Lo que haría quien no sabe qué contestar: «No sé» si lo hay; si no, la primera opción; si no, un texto. */
const responder = (q) => (q.options.some((o) => o.id === 'idk') ? { optionId: 'idk' } : q.options.length ? { optionId: q.options[0].id } : { text: 'La Espiga' });
/** La conversación entera con el servidor, como la haría `CreatorFlow` con ese contexto, hasta que hay plan. */
const conversar = async (contexto, locale = 'es') => {
  let r = await servicio.start(contexto.experienceId, contexto.goal, contexto.presets, undefined, contexto.projectId, locale);
  const preguntas = [];
  let vueltas = 0;
  while (r.status === 'asking' && vueltas++ < 8) {
    preguntas.push(r.question);
    r = await servicio.answer(r.jobId, { questionId: r.question.id, ...responder(r.question) }, undefined, locale);
  }
  return { r, preguntas };
};

/* ═══ E · DEL BOTÓN AL SERVIDOR ═══════════════════════════════════════════ */
grupo('E · Lo que sale de «Crear» entra bien en el servidor compilado');

const IDEA = 'Un salón con chimenea';
await mundo();
const sinAjustes = desdeCrear({ texto: IDEA });
const conAjustes = desdeCrear({ texto: IDEA, ajustes: { style: 'minimal', materials: 'wood' } });
const poster = desdeCrear({ texto: 'Un post para mi marca' });
const logo = desdeCrear({ texto: 'Un logo para mi cafetería La Espiga, natural' });
const posterEn = desdeCrear({ idioma: 'en', texto: 'A post for my brand', ajustes: { style: 'minimal', materials: 'wood' } });
const tEn = traductorDe('en');
const AJUSTES_EN = [tEn('design.valMinimal'), tEn('design.valWood')].join(', ');
const saldoAntes = saldoDe(almacen, ANA);

const a = await conversar(sinAjustes);
const b = await conversar(conAjustes);
const c = await conversar(poster);
const d = await conversar(logo);
const e = await conversar(posterEn, 'en');
const todas = [a, b, c, d, e];

await prueba('E1) lo que sale de «Crear» —sin ajustes, con ajustes dichos en palabras y en inglés— llega a creatorChat y se guarda TAL CUAL (la experiencia design, la idea, el idioma; el recorte es de 300), y por el camino solo viaja creatorChat', async () => {
  const ja = trabajo(a.r.jobId);
  const jb = trabajo(b.r.jobId);
  const je = trabajo(e.r.jobId);
  const entrada = enviadas.find((x) => x.nombre === 'creatorChat' && x.datos.goal === IDEA);
  const nombres = [...new Set(enviadas.map((x) => x.nombre))];
  return [!!sinAjustes && ja.experienceId === 'design' && ja.goal === IDEA && ja.userId === ANA && ja.locale === 'es'
    && !!entrada && !('projectId' in entrada.datos) && !('imageUrl' in entrada.datos) && entrada.datos.presetAnswers.length === 0
    && conAjustes.goal === `${IDEA} · Minimalista, Madera` && jb.goal === conAjustes.goal && jb.goal.length <= 300
    && posterEn.goal === `A post for my brand · ${AJUSTES_EN}` && AJUSTES_EN !== 'Minimalista, Madera' && je.goal === posterEn.goal && je.locale === 'en'
    && nombres.join() === 'creatorChat', `${ja.goal} | ${jb.goal} | ${je.goal} | ${nombres.join()}`];
});
await prueba('E2) (CL-11) «Un post para mi marca» —y «A post for my brand»— es un afiche, no un logo: el servidor lo deduce, no lo pregunta y no hace las preguntas de un logo', async () => {
  const j = trabajo(c.r.jobId);
  const je = trabajo(e.r.jobId);
  const ids = c.preguntas.map((q) => q.id);
  const paso = j.plan.steps.find((p) => p.id === 'images') || j.plan.steps[1];
  const esAfiche = (x) => x.answers.some((r) => r.questionId === 'what' && r.optionId === 'poster' && r.inferred === true);
  return [esAfiche(j) && esAfiche(je) && !ids.includes('what') && !ids.includes('name') && !ids.includes('feel') && !e.preguntas.some((q) => q.id === 'what') && paso.input.kind !== 'logo',
    `preguntas: ${ids.join(', ')} · imagen: ${paso && paso.input.kind}`];
});
await prueba('E3) el servidor NO repregunta lo que la frase ya dijo: «un logo» y «natural» se deducen y no vuelven a salir como pregunta', async () => {
  const j = trabajo(d.r.jobId);
  const ids = d.preguntas.map((q) => q.id);
  return [j.answers.some((x) => x.questionId === 'what' && x.optionId === 'logo' && x.inferred) && j.answers.some((x) => x.questionId === 'look' && x.optionId === 'natural' && x.inferred)
    && !ids.includes('what') && !ids.includes('look'), `preguntó: ${ids.join(', ')}`];
});
await prueba('E4) (CL-10) toda pregunta con botones ofrece «🤷 No sé», en las cinco conversaciones (y la que pide qué se necesita, también)', async () => {
  const conBotones = todas.flatMap((x) => x.preguntas).filter((q) => q.options.length > 0);
  const sinSalida = conBotones.filter((q) => !q.options.some((o) => o.id === 'idk'));
  const noSe = conBotones.find((q) => q.id === 'what');
  return [conBotones.length >= 5 && sinSalida.length === 0 && !!noSe && noSe.options.some((o) => /No sé/i.test(o.label) || o.id === 'idk'),
    `${conBotones.length} preguntas con botones · sin salida: ${sinSalida.map((q) => q.id).join(', ') || 'ninguna'}`];
});
await prueba('E5) llegar no cobra nada —ni un Credit, ni una reserva, ni una generación; el trabajo queda a 0 cobrados— y el PRECIO se ve ANTES de crear: cada plan trae su total, y es el estimado del trabajo', async () => {
  const jobs = todas.map((x) => trabajo(x.r.jobId));
  return [saldoDe(almacen, ANA) === saldoAntes && usos().length === 0 && libro().length === 0 && jobs.every((j) => j.creditsCharged === 0 && j.status === 'planned')
    && todas.every((x) => x.r.pricing && x.r.pricing.total > 0 && x.r.pricing.total === x.r.creditsEstimated && trabajo(x.r.jobId).creditsEstimated === x.r.pricing.total),
    `${saldoAntes} → ${saldoDe(almacen, ANA)} · ${usos().length} usos · ${libro().length} generaciones · precios ${todas.map((x) => x.r.pricing && x.r.pricing.total).join(' ')}`];
});

/* ═══ F · P3 Y EL PUENTE CONVIVEN ═════════════════════════════════════════ */
grupo('F · «Mis creaciones» de verdad y «Crear» de verdad, en la misma pantalla');

const SUYAS = [
  trabajoDe('d1', 'design', 'Un yate de quince metros', 'done', { results: [{ stepId: 'images', kind: 'image', title: 'Propuestas', url: 'https://almacen.weeapp.test/d1/1.png', urls: ['https://almacen.weeapp.test/d1/1.png'] }] }),
  trabajoDe('h1', 'home', 'Rediseñar mi salón', 'done', { results: [] }),
  trabajoDe('c1', 'chef', 'Lasaña', 'done'),
];
const entrar = async (p) => { p.env.dibujar(); p.env.enfocar(); await p.env.calma(); p.env.dibujar(); return p.env; };
const tocarCrear = (env, texto) => {
  env.capturas.StudioPromptComposer.onCambiar(texto);
  env.dibujar();
  env.olvidar();
  env.capturas.StudioPromptComposer.onCrear();
  return env.navegacion.filter((n) => n[1] === 'CreatorFlow').map((n) => n[2]);
};

await prueba('F1) con creaciones a la vista, la fila enseña las suyas y «Crear» sigue llevando SOLO lo escrito: experiencia, lugar de trabajo e idea (sin trabajo, sin proyecto)', async () => {
  const env = await entrar(mundos.es.montar(SUYAS));
  const ids = env.capturas.FilaDeCreaciones.creaciones.map((x) => x.id).join();
  const enviados = tocarCrear(env, 'Una butaca de cuero');
  return [ids === 'd1,h1' && enviados.length === 1 && Object.keys(enviados[0]).sort().join() === 'experienceId,goal,workspace' && enviados[0].goal === 'Una butaca de cuero' && enviados[0].experienceId === 'design',
    `${ids} · ${JSON.stringify(enviados[0])}`];
});
await prueba('F2) tocar una creación reabre ESE trabajo —experiencia e id, nada más— y no pasa por el servidor: no crea, no manda lo escrito y no cuesta nada', async () => {
  const antes = { saldo: saldoDe(almacen, ANA), envios: enviadas.length, usos: usos().length, libro: libro().length };
  const env = await entrar(mundos.es.montar(SUYAS));
  env.capturas.StudioPromptComposer.onCambiar('Algo a medio escribir');
  env.dibujar();
  env.olvidar();
  env.capturas.FilaDeCreaciones.onAbrir('h1');
  const nav = env.navegacion.map((n) => n.slice(0, 3));
  return [nav.length === 1 && nav[0][1] === 'CreatorFlow' && JSON.stringify(nav[0][2]) === JSON.stringify({ experienceId: 'home', jobId: 'h1' })
    && saldoDe(almacen, ANA) === antes.saldo && enviadas.length === antes.envios && usos().length === antes.usos && libro().length === antes.libro, JSON.stringify(nav)];
});
await prueba('F3) mientras la fila carga, y aunque falle, «Crear» funciona igual: lo escrito sale como siempre', async () => {
  const cargando = mundos.es.montar(SUYAS);
  cargando.control.diferido = true;
  const e1 = await entrar(cargando);
  const durante = e1.capturas.FilaDeCreaciones.estado;
  const lo1 = tocarCrear(e1, 'Un faro en una isla');
  const fallando = mundos.es.montar(SUYAS);
  fallando.control.falla = true;
  const aviso = console.warn; console.warn = () => {};
  let lo2; let tras;
  try { const e2 = await entrar(fallando); tras = e2.capturas.FilaDeCreaciones.estado; lo2 = tocarCrear(e2, 'Un faro en una isla'); } finally { console.warn = aviso; }
  const igual = JSON.stringify(lo1) === JSON.stringify([{ experienceId: 'design', workspace: 'design', goal: 'Un faro en una isla' }]) && JSON.stringify(lo2) === JSON.stringify(lo1);
  return [durante === 'cargando' && tras === 'error' && igual, `${durante} → ${JSON.stringify(lo1)} · ${tras} → ${JSON.stringify(lo2)}`];
});

consola.restaurar();
sinEsperas();
imprimir(failures ? `\n${failures} comprobación(es) fallaron` : '\nLo que sale de «Crear» entra bien en el servidor, y «Mis creaciones» de verdad convive con el puente');
process.exit(failures ? 1 : 0);
