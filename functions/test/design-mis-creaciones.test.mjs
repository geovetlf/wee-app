/*
 * WEË DESIGN — «MIS CREACIONES» ENSEÑA LO QUE LA PERSONA CREÓ (CL-04, propuesta P3; R8, PAN, 2026-10-12).
 *
 * Hasta aquí la fila «Mis creaciones» de la pantalla montada de Weë Design eran SIEMPRE las cuatro muestras («Salón luminoso», «Casa
 * entre pinos»…): con o sin sesión, con o sin nada creado, y bajo el título «Mis creaciones» como si fueran de la persona. El corredor
 * `_design-cierre.mjs` lo mide mirando el TEXTO de la pantalla (¿nombra a `getMyJobsDe`?), y un texto no demuestra que se vea lo
 * correcto. Esta suite EJECUTA la pantalla de verdad (`_pantallas.mjs`: `react-dom/server`, los efectos de foco que dispara
 * `enfocar()` y un servicio de mentira que anota cada llamada) con la fila común TAMBIÉN de verdad (`_fila-de-creaciones.mjs`), y
 * comprueba lo que una persona leería, sin red y sin emulador:
 *
 *   A · con sesión: se ven SUS creaciones de Weë Design y de Hogar & Diseño y no las muestras; cargando, vacío, error y reintento;
 *       sin sesión o sin nada creado: las muestras, rotuladas «Ejemplos»; qué se pide al servicio y qué no se cuela (Chef, Studio…);
 *   B · la fila compartida: lo nuevo hace lo que dice y, SIN las propiedades nuevas, dibuja exactamente lo mismo que antes (dorado
 *       generado desde la pieza original de `c3f7f9a7`), que es lo que ve Weë Studio;
 *   C · las funciones puras que deciden qué se enseña de cada trabajo;
 *   D · el texto nuevo, en los dieciséis idiomas;
 *   E · lo que la pantalla y su gancho NO hacen (crear, cobrar, otro proyecto) y que Weë Studio no ganó ninguna propiedad;
 *   F · el cierre ejecutable: CL-04 pasa por el motivo correcto, y un CONTROL demuestra que la comprobación de comportamiento
 *       detectaría una pantalla que solo NOMBRA al gancho pero sigue pintando las muestras.
 *
 * Cada detector lleva su CONTROL, para que un verde no pueda ser un verde vacío.
 */
import fs from 'node:fs';
import path from 'node:path';
import { crearEntorno } from './_pantallas.mjs';
import { crearFila } from './_fila-de-creaciones.mjs';
import { RAIZ, crearCargador, leer, sinComentarios } from './filmmaker-cliente.mjs';

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const grupo = (titulo) => console.log(`\n─── ${titulo} ───`);
/** Una comprobación que puede lanzar: lo que lance cuenta como fallo (y dice por qué) en vez de tumbar la suite entera. Devuelve `[ok, detalle]`. */
const prueba = async (name, fn) => {
  try {
    const [ok, extra] = await fn();
    check(name, ok === true, extra);
  } catch (e) {
    check(name, false, `lanzó: ${e && e.message ? e.message : e}`);
  }
};
const leerSiExiste = (rel) => { try { return leer(rel); } catch { return ''; } };

/* ── El traductor y las constantes de VERDAD, para saber qué debería salir ── */
const base = crearCargador({ dobles: { 'react-native': { Platform: { OS: 'android', select: (o) => o.android ?? o.default }, Dimensions: { get: () => ({ width: 390, height: 800 }) } } } });
const { crearTraductor } = base('i18n/traducir.ts');
/* Los diccionarios como los arma la app (`i18n/diccionarios.ts`): lo del cliente y, aparte, lo que escribe el servidor (sus objetivos por defecto, por ejemplo). */
const DICCIONARIOS = {
  es: { ...base('i18n/textos/es/index.ts').es, ...base('i18n/textos/es/servidor/index.ts').servidor },
  en: { ...base('i18n/textos/en/index.ts').en, ...base('i18n/textos/en/servidor/index.ts').servidor },
};
const formatoReal = base('i18n/formato.ts');
const traductorDe = (idioma) => crearTraductor(idioma, DICCIONARIOS, {});
const formatoDe = (idioma) => ({ numero: (v, o) => formatoReal.formatearNumero(v, idioma, o), lista: (c, tipo) => formatoReal.formatearLista(c, idioma, tipo) });
const tEs = traductorDe('es');
const tEn = traductorDe('en');
const DESIGN = base('constants/designTools.ts');
const EXPERIENCIAS = base('constants/weeExperiences.ts').ALL_EXPERIENCES.map((e) => e.id);
const MUESTRAS = DESIGN.CREACIONES_DE_DESIGN.map((c) => tEs(c.claveTitulo));

const MIS_CREACIONES = tEs('studio.creationsTitle');
const EJEMPLOS = tEs('design.examplesTitle');
const CARGANDO = tEs('creaciones.loading');
const FALLO = tEs('creaciones.loadFailed');
const REINTENTAR = tEs('creaciones.retry');
const VER_TODAS = `${tEs('studio.seeAll')} →`;

/* ── Lo que comparten las pantallas: temas, idioma, sesión y tamaño (el mismo molde de `aceptacion-pantallas`) ── */
const comunes = (idioma) => ({ colores, usuario, movil }) => {
  const t = traductorDe(idioma);
  const tema = { useTheme: () => ({ theme: { colors: colores } }), enTemaClaro: (C) => C };
  const habla = { useT: () => t, useIdioma: () => ({ t, formato: formatoDe(idioma), locale: idioma }) };
  return {
    '../contexts/ThemeContext': tema, '../../contexts/ThemeContext': tema,
    '../contexts/IdiomaContext': habla, '../../contexts/IdiomaContext': habla,
    '../contexts/AuthContext': { useAuth: () => ({ user: usuario }) },
    '../hooks/useResponsive': { useResponsive: () => ({ isMobile: movil, isTablet: false, isDesktop: !movil }) },
    '../components/BarraInferior': { ALTO_BARRA: 64 },
  };
};

/*
 * Los dobles de Weë Design: las piezas comunes de Weë AI se CAPTURAN (lo que la pantalla les pasa es el contrato) y la fila de
 * creaciones es la de VERDAD —dibujada con el React Native del entorno, así que sus botones se pueden tocar por su etiqueta—.
 * El gancho, la función pura y el servicio no se doblan: se cargan de verdad, y solo `getMyJobsDe` se sustituye después.
 */
const doblesDeDesign = (idioma) => (ctx) => {
  const { h: hh, capturar, reactNative, colores } = ctx;
  const { Fila } = crearFila({ t: traductorDe(idioma), colores, nativo: reactNative });
  return {
    ...comunes(idioma)(ctx),
    '../components/creator/CajaQueCrece': { PaginaDeCajas: capturar('PaginaDeCajas') },
    '../components/studio/StudioHeader': capturar('StudioHeader'),
    '../components/studio/StudioPromptComposer': capturar('StudioPromptComposer'),
    '../components/creator/AjustesContextuales': capturar('AjustesContextuales'),
    '../components/creator/AvisoDeCreacion': capturar('AvisoDeCreacion'),
    '../components/creator/FilaDeCreaciones': capturar('FilaDeCreaciones', (p) => hh(Fila, p)),
    '../components/creator/FichaDeContexto': capturar('FichaDeContexto', (p) => hh('span', { 'data-ficha': p.texto }, p.texto)),
    '../components/EspacioDeEscritura': { __esModule: true, default: capturar('EspacioDeEscritura'), useAlturaDelTeclado: () => 0 },
    '../components/design/DesignExplore': capturar('DesignExplore'),
    '../components/design/DesignPanel': capturar('DesignPanel'),
  };
};

const trabajoDe = (id, experienceId, goal, status = 'done', extra = {}) => ({
  id, userId: 'u1', experienceId, goal, status, questions: [], answers: [], plan: null, steps: [], results: [], progressText: '',
  creditsEstimated: 5, creditsCharged: status === 'done' ? 5 : 0, demo: false, ...extra,
});
const imagen = (url) => ({ stepId: 'images', kind: 'image', title: 'Propuestas', url, urls: [url, `${url}?2`, `${url}?3`] });
const texto = (contenido) => ({ stepId: 'concept', kind: 'text', title: 'Concepto', content: contenido });

/*
 * Un MUNDO: la pantalla montada una vez (transpilar el código de verdad cuesta lo suyo) con su servicio de mentira —`getMyJobsDe`
 * apunta con qué lo llamaron y contesta, al momento, tarde o con un fallo, lo que había en el momento de PEDIRLO— y la sesión como un
 * objeto que se puede cambiar. `montar` lo deja en blanco para cada escenario (`reiniciar` borra el estado de la pantalla, las
 * navegaciones y los avisos). Lo demás —el gancho, la función que decide qué se enseña— es el código de verdad.
 */
const crearMundo = (idioma = 'es', extraDobles = () => ({})) => {
  const sesion = { user: { uid: 'u1' }, loading: false };
  const lista = [];
  const control = { falla: false, diferido: false, pendientes: [] };
  const llamadas = [];
  const env = crearEntorno({
    pantalla: 'screens/DesignScreen.tsx', usuario: sesion.user, trabajos: lista,
    dobles: (ctx) => ({ ...doblesDeDesign(idioma)(ctx), '../contexts/AuthContext': { useAuth: () => ({ user: sesion.user, loading: sesion.loading }) }, ...extraDobles(ctx) }),
  });
  env.cargar('services/creatorService.ts').creatorService.getMyJobsDe = (uid, pertenece, cantidad, tamano) => {
    llamadas.push({ uid, pertenece, cantidad, tamano });
    if (control.falla) return Promise.reject(new Error('sin red'));
    const datos = lista.filter(pertenece).slice(0, cantidad);
    if (control.diferido) return new Promise((resolver) => control.pendientes.push(() => resolver(datos)));
    return Promise.resolve(datos);
  };
  const montar = ({ usuario = { uid: 'u1' }, trabajos = [], cargandoLaSesion = false } = {}) => {
    env.reiniciar();
    sesion.user = usuario;
    sesion.loading = cargandoLaSesion;
    lista.length = 0;
    lista.push(...trabajos);
    control.falla = false;
    control.diferido = false;
    control.pendientes.length = 0;
    llamadas.length = 0;
    return { env, control, llamadas, trabajos: lista, usuario };
  };
  return { montar, env };
};
const mundo = crearMundo('es');
const montar = (opciones) => mundo.montar(opciones);
/** Lo que se ve ahora: el texto de la pantalla y con qué propiedades montó la fila. */
const verAhora = (w) => { const d = w.env.dibujar(); return { d, texto: d.texto, fila: w.env.capturas.FilaDeCreaciones, html: d.html }; };
/** Entrar en la pantalla: se dibuja, se enfoca (lo que hace React Navigation) y se espera a que contesten. */
const entrar = async (w) => { w.env.dibujar(); w.env.enfocar(); await w.env.calma(); return verAhora(w); };
const sinAvisos = async (fn) => { const antes = console.warn; console.warn = () => {}; try { return await fn(); } finally { console.warn = antes; } };

/* Lo que debería verse, como funciones, para poder PROBAR que detectan lo que dicen detectar (los CONTROLES de F). */
const veMuestras = (v) => MUESTRAS.every((m) => v.texto.includes(m));
const veAlgunaMuestra = (v) => MUESTRAS.some((m) => v.texto.includes(m));
const veSusCreaciones = (v, titulos) => titulos.every((x) => v.texto.includes(x)) && !veAlgunaMuestra(v) && v.texto.includes(MIS_CREACIONES) && !v.texto.includes(EJEMPLOS);
const veLasMuestrasComoEjemplos = (v) => veMuestras(v) && v.texto.includes(EJEMPLOS) && !v.texto.includes(MIS_CREACIONES);

const SUYAS = [
  trabajoDe('d1', 'design', 'Un yate de quince metros', 'done', { results: [texto('Concepto del yate'), imagen('https://almacen.weeapp.test/d1/1.png')] }),
  trabajoDe('c1', 'chef', 'Lasaña vegetariana para cuatro'),
  trabajoDe('h1', 'home', 'Rediseñar mi salón en tonos cálidos', 'done', { results: [imagen('https://almacen.weeapp.test/h1/1.png')] }),
  trabajoDe('s1', 'studio', 'Un video corto del mar', 'done', { results: [{ stepId: 'v', kind: 'video', title: 'Video', url: 'https://almacen.weeapp.test/s1/v.mp4' }] }),
  trabajoDe('d2', 'design', 'Un logo para mi cafetería', 'running'),
  trabajoDe('d3', 'design', 'Un afiche a medias', 'asking'),
  trabajoDe('d4', 'design', 'Una silla de madera', 'planned'),
  trabajoDe('d5', 'design', 'Un barco que no salió', 'failed'),
  trabajoDe('d6', 'design', 'Un jardín cancelado', 'cancelled'),
];
const SUS_TITULOS = ['Un yate de quince metros', 'Rediseñar mi salón en tonos cálidos', 'Un logo para mi cafetería'];

/* ═══ A · LA PANTALLA ═════════════════════════════════════════════════════ */
grupo('A · La pantalla de Weë Design, ejecutada: lo que se ve en «Mis creaciones»');

await prueba('A1) (a) con creaciones de Design y de Hogar & Diseño se ven LAS SUYAS, bajo «Mis creaciones», y NO las muestras', async () => {
  const v = await entrar(montar({ trabajos: SUYAS }));
  return [veSusCreaciones(v, SUS_TITULOS), v.texto.slice(0, 200)];
});
await prueba('A1) y solo esas: ninguna de Chef, de Studio ni una a medias (preguntando, planificada, fallida o cancelada)', async () => {
  const v = await entrar(montar({ trabajos: SUYAS }));
  const ids = (v.fila?.creaciones ?? []).map((c) => c.id);
  return [ids.join() === 'd1,h1,d2' && !v.texto.includes('Lasaña') && !v.texto.includes('video corto') && !v.texto.includes('a medias') && !v.texto.includes('cancelado'), ids.join()];
});
await prueba('A1) con su miniatura cuando el dato la trae (la primera imagen del resultado) y sin ella cuando no', async () => {
  const v = await entrar(montar({ trabajos: SUYAS }));
  const [d1, h1, d2] = v.fila.creaciones;
  return [d1.uri === 'https://almacen.weeapp.test/d1/1.png' && h1.uri === 'https://almacen.weeapp.test/h1/1.png' && d2.uri === undefined
    && v.html.includes('src="https://almacen.weeapp.test/d1/1.png"') && (v.html.match(/<img\b/g) || []).length === 2, `${d1.uri} · ${h1.uri} · ${d2.uri}`];
});
await prueba('A1) cada una dice qué es: lo ya hecho, su tipo; lo que se está haciendo, que se está haciendo', async () => {
  const v = await entrar(montar({ trabajos: SUYAS }));
  return [v.texto.includes(tEs('creaciones.kindImage')) && v.texto.includes(tEs('weeai.jobRunning')), v.fila.creaciones.map((c) => tEs(c.claveTipo)).join(' · ')];
});
await prueba('A1) el título de cada una es lo que escribió la persona, tal cual (y el objetivo por defecto, en el idioma de quien mira)', async () => {
  const w = crearMundo('en').montar({ trabajos: [trabajoDe('d1', 'design', 'Un yate de quince metros'), trabajoDe('d9', 'design', 'Diseñar algo que imagino', 'done', { results: [imagen('https://almacen.weeapp.test/d9.png')] })] });
  const v = await entrar(w);
  const t = v.fila.creaciones.map((c) => c.titulo);
  return [t[0] === 'Un yate de quince metros' && t[1] === tEn('objetivos.objDesign') && t[1] !== 'Diseñar algo que imagino', t.join(' | ')];
});

await prueba('A2) (b) mientras contestan se ve «cargando» —y nunca las muestras por un instante, ni antes de que se enfoque la pantalla—', async () => {
  const w = montar({ trabajos: SUYAS });
  w.control.diferido = true;
  const antes = verAhora(w);
  w.env.enfocar();
  await w.env.calma();
  const durante = verAhora(w);
  const bien = (v) => v.fila.estado === 'cargando' && v.texto.includes(CARGANDO) && v.texto.includes(MIS_CREACIONES) && !veAlgunaMuestra(v) && !v.texto.includes(EJEMPLOS) && !v.texto.includes(FALLO);
  return [bien(antes) && bien(durante), `antes: ${antes.fila.estado} · durante: ${durante.fila.estado}`];
});
await prueba('A2) y al llegar lo suyo, sustituye el «cargando»', async () => {
  const w = montar({ trabajos: SUYAS });
  w.control.diferido = true;
  w.env.dibujar();
  w.env.enfocar();
  await w.env.calma();
  w.control.pendientes.forEach((f) => f());
  await w.env.calma();
  const v = verAhora(w);
  return [veSusCreaciones(v, SUS_TITULOS) && !v.texto.includes(CARGANDO) && v.fila.estado === undefined, `${v.fila.estado}`];
});
await prueba('A2) y mientras la sesión todavía se está resolviendo tampoco se enseñan las muestras ni se pide nada', async () => {
  const w = montar({ usuario: null, cargandoLaSesion: true, trabajos: SUYAS });
  const v = await entrar(w);
  return [v.fila.estado === 'cargando' && !veAlgunaMuestra(v) && !v.texto.includes(EJEMPLOS) && w.llamadas.length === 0, `${v.fila.estado} · ${w.llamadas.length} llamadas`];
});

await prueba('A3) (c) con sesión y NADA creado en Design se ven las muestras, rotuladas «Ejemplos», y ya no «Mis creaciones»', async () => {
  const w = montar({ trabajos: [trabajoDe('c1', 'chef', 'Lasaña vegetariana'), trabajoDe('d3', 'design', 'Un afiche a medias', 'asking')] });
  const v = await entrar(w);
  return [veLasMuestrasComoEjemplos(v) && v.fila.claveDelTitulo === 'design.examplesTitle' && v.fila.creaciones.length === 4 && w.llamadas.length === 1, v.texto.slice(0, 200)];
});
await prueba('A3) y las muestras no se pulsan (no son trabajos de nadie): ni una pieza es un botón', async () => {
  const v = await entrar(montar({ trabajos: [] }));
  const piezas = v.d.botones.filter((b) => /^Abrir creación/.test(b.etiqueta || ''));
  return [v.fila.onAbrir === undefined && piezas.length === 0, `${piezas.length} piezas pulsables`];
});

await prueba('A4) (d) si falla la carga, se DICE (no se disfraza de «no tienes nada»): mensaje, «Reintentar», y ni muestras ni «Ejemplos»', () => sinAvisos(async () => {
  const w = montar({ trabajos: SUYAS });
  w.control.falla = true;
  const v = await entrar(w);
  const reintentar = v.d.botones.find((b) => b.etiqueta === REINTENTAR);
  return [v.fila.estado === 'error' && v.texto.includes(FALLO) && v.texto.includes(MIS_CREACIONES) && !veAlgunaMuestra(v) && !v.texto.includes(EJEMPLOS)
    && !!reintentar && reintentar.rol === 'button' && !reintentar.apagado, `${v.fila.estado} · ${!!reintentar}`];
}));
await prueba('A4) y la salida es «Reintentar»: vuelve a pedir lo mismo y, si ahora sale bien, enseña lo suyo', () => sinAvisos(async () => {
  const w = montar({ trabajos: SUYAS });
  w.control.falla = true;
  await entrar(w);
  const pedidas = w.llamadas.length;
  w.control.falla = false;
  w.env.tocar(REINTENTAR);
  await w.env.calma();
  const v = verAhora(w);
  return [w.llamadas.length === pedidas + 1 && veSusCreaciones(v, SUS_TITULOS) && !v.texto.includes(FALLO), `${pedidas} → ${w.llamadas.length}`];
}));
await prueba('A4) un fallo al refrescar lo que ya se veía NO lo borra (se queda lo último que se supo)', () => sinAvisos(async () => {
  const w = montar({ trabajos: SUYAS });
  await entrar(w);
  w.control.falla = true;
  w.env.enfocar();
  await w.env.calma();
  const v = verAhora(w);
  return [veSusCreaciones(v, SUS_TITULOS) && v.fila.estado === undefined, `${v.fila.estado}`];
}));

await prueba('A5) (e) sin sesión se ven las muestras, rotuladas «Ejemplos», y no se le pide nada a nadie', async () => {
  const w = montar({ usuario: null, trabajos: SUYAS });
  const v = await entrar(w);
  return [veLasMuestrasComoEjemplos(v) && w.llamadas.length === 0 && v.fila.estado === undefined, `${w.llamadas.length} llamadas`];
});

await prueba('A6) (f) pide lo suyo —el de la CUENTA, ocho, en páginas de veinte— y SOLO las experiencias `design` y `home`', async () => {
  const w = montar({ trabajos: SUYAS });
  await entrar(w);
  const l = w.llamadas[0];
  const pasan = EXPERIENCIAS.filter((id) => l.pertenece(trabajoDe('x', id, 'algo', 'done')));
  return [w.llamadas.length === 1 && l.uid === 'u1' && l.cantidad === 8 && l.tamano === 20 && pasan.join() === 'design,home', `${l.uid} · ${l.cantidad} · ${l.tamano} · pasan: ${pasan.join()}`];
});
await prueba('A6) y de ellas, lo que ya está hecho o se está haciendo, nada más', async () => {
  const w = montar({ trabajos: [] });
  await entrar(w);
  const p = w.llamadas[0].pertenece;
  const pasan = ['asking', 'planned', 'running', 'done', 'failed', 'cancelled'].filter((s) => p(trabajoDe('x', 'design', 'algo', s)));
  return [pasan.join() === 'running,done', pasan.join()];
});

await prueba('A7) «Ver todas →» mantiene su destino de hoy —Mis proyectos— en TODOS los estados', () => sinAvisos(async () => {
  const destinos = [];
  for (const [nombre, armar] of [
    ['con creaciones', () => montar({ trabajos: SUYAS })],
    ['vacío', () => montar({ trabajos: [] })],
    ['sin sesión', () => montar({ usuario: null })],
    ['cargando', () => { const w = montar({ trabajos: SUYAS }); w.control.diferido = true; return w; }],
    ['error', () => { const w = montar({ trabajos: SUYAS }); w.control.falla = true; return w; }],
  ]) {
    const w = armar();
    const v = await entrar(w);
    w.env.olvidar();
    v.fila.onVerTodas();
    destinos.push([nombre, w.env.navegacion.map((n) => `${n[0]}:${n[1]}`).join(), v.texto.includes(VER_TODAS)]);
  }
  return [destinos.every(([, nav, visible]) => nav === 'navigate:Projects' && visible), destinos.map((d) => `${d[0]}=${d[1]}`).join(' · ')];
}));

await prueba('A8) tocar una creación REABRE ese trabajo (su experiencia y su id), sin crear otro ni mandar proyecto ni texto', async () => {
  const w = montar({ trabajos: SUYAS });
  const v = await entrar(w);
  w.env.olvidar();
  w.env.tocar(tEs('creaciones.openCreation', { nombre: 'Rediseñar mi salón en tonos cálidos' }));
  const n1 = JSON.stringify(w.env.navegacion);
  w.env.olvidar();
  v.fila.onAbrir('d1');
  const n2 = JSON.stringify(w.env.navegacion);
  return [n1 === JSON.stringify([['navigate', 'CreatorFlow', { experienceId: 'home', jobId: 'h1' }]]) && n2 === JSON.stringify([['navigate', 'CreatorFlow', { experienceId: 'design', jobId: 'd1' }]]), `${n1} · ${n2}`];
});
await prueba('A8) y abrir un id que no es de la fila no hace nada', async () => {
  const w = montar({ trabajos: SUYAS });
  const v = await entrar(w);
  w.env.olvidar();
  v.fila.onAbrir('c1');
  return [w.env.navegacion.length === 0, JSON.stringify(w.env.navegacion)];
});

await prueba('A9) volver a la pantalla refresca sin parpadeo: lo que se veía se queda mientras llega lo nuevo, y luego se cambia', async () => {
  const w = montar({ trabajos: SUYAS.slice(0, 1) });
  await entrar(w);
  w.trabajos.unshift(trabajoDe('d7', 'design', 'Una casa entre pinos', 'done', { results: [imagen('https://almacen.weeapp.test/d7/1.png')] }));
  w.control.diferido = true;
  w.env.enfocar();
  await w.env.calma();
  const durante = verAhora(w);
  w.control.pendientes.forEach((f) => f());
  await w.env.calma();
  const despues = verAhora(w);
  return [durante.fila.estado === undefined && durante.texto.includes('Un yate de quince metros') && !durante.texto.includes(CARGANDO) && !durante.texto.includes('Una casa entre pinos')
    && despues.texto.includes('Una casa entre pinos') && despues.texto.includes('Un yate de quince metros'), `${durante.fila.estado}`];
});
await prueba('A9) una respuesta que llega tarde no pisa a la más nueva', async () => {
  const w = montar({ trabajos: SUYAS.slice(0, 1) });
  w.control.diferido = true;
  w.env.dibujar();
  w.env.enfocar();
  /* La primera petición salió con «el yate»; antes de que conteste, cambia lo guardado y sale la segunda. */
  w.trabajos.length = 0;
  w.trabajos.push(trabajoDe('n1', 'design', 'Solo lo nuevo', 'done'));
  w.env.enfocar();
  await w.env.calma();
  const [primera, segunda] = w.control.pendientes;
  segunda();
  await w.env.calma();
  const trasLaNueva = verAhora(w);
  primera();
  await w.env.calma();
  const final = verAhora(w);
  return [w.control.pendientes.length === 2 && trasLaNueva.texto.includes('Solo lo nuevo') && final.texto.includes('Solo lo nuevo') && !final.texto.includes('Un yate de quince metros'), final.texto.slice(0, 120)];
});

await prueba('A10) si cambia la persona (otra cuenta en la misma pantalla), lo de la anterior NO se queda a la vista mientras llega lo nuevo', async () => {
  const sesion = { uid: 'u1' };
  const w = montar({ usuario: sesion, trabajos: SUYAS });
  await entrar(w);
  sesion.uid = 'u2';
  w.control.diferido = true;
  const tras = verAhora(w);
  w.env.enfocar();
  await w.env.calma();
  const cargando = verAhora(w);
  return [!tras.texto.includes('Un yate de quince metros') && !cargando.texto.includes('Un yate de quince metros') && cargando.fila.estado === 'cargando' && w.llamadas[w.llamadas.length - 1].uid === 'u2',
    `${tras.fila.estado} · ${cargando.fila.estado} · ${w.llamadas.map((x) => x.uid).join()}`];
});

await prueba('A11) la caja, las puertas y todo lo demás de la pantalla siguen donde estaban', async () => {
  const w = montar({ trabajos: SUYAS });
  const v = await entrar(w);
  const c = w.env.capturas;
  /* El aviso de la creación de mentira, si la pantalla aún lo monta, está quieto: esta fila no lo toca (y el puente de Weë Design lo quita del todo). */
  return [c.StudioHeader.nombre === 'Design' && c.StudioPromptComposer.placeholder === tEs('design.placeholder') && !!c.DesignExplore && (!c.AvisoDeCreacion || c.AvisoDeCreacion.estado === 'quieto')
    && v.fila.ancho === 140 && v.fila.alto === 120, `${v.fila.ancho}×${v.fila.alto}`];
});

/* ═══ B · LA FILA COMPARTIDA ══════════════════════════════════════════════ */
grupo('B · La fila compartida: lo nuevo hace lo que dice, y sin lo nuevo dibuja lo de siempre');

const { dibujar: dibujarFila } = crearFila({ t: tEs });
const nada = () => {};
const { CREACIONES_DEL_STUDIO } = base('constants/studioMocks.ts');
const dorado = JSON.parse(leer('functions/test/design-mis-creaciones.dorado.json'));

await prueba('B1) (g) lo que dibuja la fila para Weë Studio es EXACTAMENTE lo de antes (dorado de la pieza original, estilo por estilo)', async () => {
  const hoy = dibujarFila({ creaciones: CREACIONES_DEL_STUDIO, onVerTodas: nada, onOpciones: nada });
  return [hoy === dorado.casos.studio, hoy === dorado.casos.studio ? `${hoy.length} caracteres` : `distinto: ${hoy.slice(0, 160)}`];
});
await prueba('B1) y para la fila de siempre de Weë Design (las cuatro muestras, 140×120)', async () => {
  const hoy = dibujarFila({ creaciones: DESIGN.CREACIONES_DE_DESIGN, ancho: 140, alto: 120, onVerTodas: nada });
  return [hoy === dorado.casos.design, `${hoy.length} caracteres`];
});
await prueba('B1) y vacía', async () => [dibujarFila({ creaciones: [], onVerTodas: nada }) === dorado.casos.vacia, '']);
await prueba('B1) el dorado dice de dónde sale: la pieza original de c3f7f9a7', async () => [dorado.origen.commit === 'c3f7f9a7' && /^[0-9a-f]{64}$/.test(dorado.origen.sha256), dorado.origen.sha256.slice(0, 12)]);

const unaCreacion = { id: 'x1', claveTipo: 'creaciones.kindImage', icono: 'image-outline', titulo: 'Un yate de quince metros', tono: '#ECEBE8' };
const conMiniatura = { ...unaCreacion, uri: 'https://almacen.weeapp.test/x1.png' };
await prueba('B2) con `uri` la lámina enseña la imagen (recortada, con caché) y ya no el icono; sin `uri`, lo de siempre', async () => {
  const con = dibujarFila({ creaciones: [conMiniatura], onVerTodas: nada });
  const sin = dibujarFila({ creaciones: [unaCreacion], onVerTodas: nada });
  return [/<img src="https:\/\/almacen\.weeapp\.test\/x1\.png"[^>]*data-recorte="cover"[^>]*data-cache="memory-disk"/.test(con) && !/data-icono="image-outline"/.test(con)
    && !/<img\b/.test(sin) && /data-icono="image-outline"/.test(sin), ''];
});
await prueba('B2) con `uri` la etiqueta y el título siguen encima y debajo de la imagen', async () => {
  const con = dibujarFila({ creaciones: [conMiniatura], onVerTodas: nada });
  return [con.indexOf('<img') > -1 && con.indexOf('<img') < con.indexOf('>Imagen<') && con.indexOf('>Imagen<') < con.indexOf('Un yate de quince metros'), ''];
});
await prueba('B2) `claveDelTitulo` cambia el título de la fila (y sin ella dice «Mis creaciones»)', async () => {
  const con = dibujarFila({ creaciones: [], claveDelTitulo: 'design.examplesTitle', onVerTodas: nada });
  const sin = dibujarFila({ creaciones: [], onVerTodas: nada });
  return [con.includes(`>${EJEMPLOS}<`) && !con.includes(`>${MIS_CREACIONES}<`) && sin.includes(`>${MIS_CREACIONES}<`), ''];
});
await prueba('B2) `estado: cargando` enseña la rueda y «Cargando tus creaciones…» EN LUGAR de las láminas, sin quitar el título ni «Ver todas»', async () => {
  const m = dibujarFila({ creaciones: [unaCreacion], estado: 'cargando', onVerTodas: nada });
  return [m.includes('<progress') && m.includes(CARGANDO) && !m.includes('Un yate de quince metros') && m.includes(`>${MIS_CREACIONES}<`) && m.includes('Ver todas'), ''];
});
await prueba('B2) `estado: error` dice que no se pudo cargar y ofrece «Reintentar» (solo si hay a qué volver)', async () => {
  const con = dibujarFila({ creaciones: [], estado: 'error', onReintentar: nada, onVerTodas: nada });
  const sin = dibujarFila({ creaciones: [], estado: 'error', onVerTodas: nada });
  return [con.includes(FALLO) && new RegExp(`<button(?=[^>]*aria-label="${REINTENTAR}")(?=[^>]*data-pulsable="si")[^>]*>`).test(con) && sin.includes(FALLO) && !sin.includes(REINTENTAR), ''];
});
await prueba('B2) con `onAbrir` cada pieza es un botón con su nombre; sin él, ninguna', async () => {
  const con = dibujarFila({ creaciones: [unaCreacion, { ...unaCreacion, id: 'x2', titulo: 'Otra' }], onAbrir: nada, onVerTodas: nada });
  const sin = dibujarFila({ creaciones: [unaCreacion], onVerTodas: nada });
  const etiquetas = (m) => [...m.matchAll(/aria-label="([^"]*)"/g)].map((x) => x[1]);
  return [etiquetas(con).filter((e) => e.startsWith('Abrir creación')).join('|') === 'Abrir creación: Un yate de quince metros|Abrir creación: Otra' && etiquetas(sin).length === 0, etiquetas(con).join('|')];
});
await prueba('B2) las propiedades nuevas son opcionales: las que ya había (`creaciones`, `onVerTodas`) siguen siendo las únicas obligatorias', async () => {
  const src = sinComentarios(leer('components/creator/FilaDeCreaciones.tsx'));
  const props = (src.match(/interface Props \{([\s\S]*?)\n\}/) || [])[1] || '';
  const requeridas = [...props.matchAll(/^\s{2}(\w+)(\??):/gm)].filter((m) => m[2] === '').map((m) => m[1]);
  return [requeridas.join() === 'creaciones,onVerTodas', requeridas.join()];
});
await prueba('B2) y `t(\'studio.creationsTitle\')` sigue siendo de ESTA pieza y de ninguna otra (foundation-de-experiencias, i18n-cierre-textos)', async () => [/t\('studio\.creationsTitle'\)/.test(leer('components/creator/FilaDeCreaciones.tsx')), '']);

/* ═══ C · LAS FUNCIONES PURAS ═════════════════════════════════════════════ */
grupo('C · Las funciones puras que deciden qué se enseña de cada trabajo');

const cargarC = (rel) => mundo.env.cargar(rel);
await prueba('C1) `esUnaCreacionDeDesign`: solo `design` y `home`, y solo lo hecho o en marcha', async () => {
  const U = cargarC('utils/creacionesDeDesign.ts');
  const pasan = EXPERIENCIAS.filter((id) => U.esUnaCreacionDeDesign(trabajoDe('x', id, 'a', 'done')));
  const estados = ['asking', 'planned', 'running', 'done', 'failed', 'cancelled'].filter((s) => U.esUnaCreacionDeDesign(trabajoDe('x', 'home', 'a', s)));
  return [pasan.join() === 'design,home' && estados.join() === 'running,done' && U.EXPERIENCIAS_DE_DESIGN.join() === 'design,home', `${pasan.join()} · ${estados.join()}`];
});
await prueba('C2) `miniaturaDe`: la primera imagen del primer resultado que la trae; ni un texto, ni un video, ni una dirección vacía', async () => {
  const U = cargarC('utils/creacionesDeDesign.ts');
  const m = (results) => U.miniaturaDe(trabajoDe('x', 'design', 'a', 'done', { results }));
  return [m([texto('hola'), imagen('https://a.test/1.png')]) === 'https://a.test/1.png'
    && m([{ stepId: 'i', kind: 'image', title: 'T', url: 'https://a.test/solo.png' }]) === 'https://a.test/solo.png'
    && m([{ stepId: 'v', kind: 'video', title: 'V', url: 'https://a.test/v.mp4' }]) === undefined
    && m([{ stepId: 'i', kind: 'image', title: 'T', url: '' }, imagen('https://a.test/2.png')]) === 'https://a.test/2.png'
    && m([]) === undefined && m(undefined) === undefined, ''];
});
await prueba('C3) `claveDeLaEtiqueta`: lo hecho dice su tipo (o «Lista» si no hay nada que enseñar); lo que se está haciendo, que se está haciendo', async () => {
  const U = cargarC('utils/creacionesDeDesign.ts');
  const k = (status, results = []) => U.claveDeLaEtiqueta(trabajoDe('x', 'design', 'a', status, { results }));
  return [k('done', [imagen('https://a.test/1.png')]) === 'creaciones.kindImage' && k('done', [texto('hola')]) === 'creaciones.kindText' && k('done', [texto('a'), imagen('https://a.test/1.png')]) === 'creaciones.kindImage'
    && k('done', []) === 'weeai.jobDone' && k('running') === 'weeai.jobRunning', ''];
});
await prueba('C4) `creacionDeLaFila`: la forma que pide la fila, con el contenido de la persona como contenido (no como clave)', async () => {
  const U = cargarC('utils/creacionesDeDesign.ts');
  const f = U.creacionDeLaFila(SUYAS[0], tEs);
  const g = U.creacionDeLaFila(SUYAS[2], tEs);
  return [f.id === 'd1' && f.titulo === 'Un yate de quince metros' && f.claveTitulo === undefined && f.uri === 'https://almacen.weeapp.test/d1/1.png' && /^#[0-9A-Fa-f]{6}$/.test(f.tono)
    && f.icono === 'image-outline' && g.icono === 'home-outline' && f.claveTipo === 'creaciones.kindImage', JSON.stringify(f)];
});
await prueba('C5) las claves que usa existen, y las de estado son las de siempre del servicio (no se vuelven a escribir)', async () => {
  const real = cargarC('services/creatorService.ts');
  const U = cargarC('utils/creacionesDeDesign.ts');
  const claves = ['creaciones.kindImage', 'creaciones.kindText', 'weeai.jobDone', 'weeai.jobRunning'];
  return [claves.every((c) => tEs(c) !== c) && U.claveDeLaEtiqueta(trabajoDe('x', 'design', 'a', 'running')) === real.claveDelEstado.running, ''];
});

/* ═══ D · EL TEXTO NUEVO ══════════════════════════════════════════════════ */
grupo('D · «Ejemplos», en los dieciséis idiomas');

const LOCALES = fs.readdirSync(path.resolve(RAIZ, 'i18n/textos')).filter((d) => fs.statSync(path.resolve(RAIZ, 'i18n/textos', d)).isDirectory()).sort();
const valorDe = (locale, modulo, clave) => (leer(`i18n/textos/${locale}/${modulo}.ts`).match(new RegExp(`^\\s{2}${clave}:\\s*'((?:[^'\\\\]|\\\\.)*)'`, 'm')) || [])[1];
await prueba('D1) `design.examplesTitle` existe, con texto, en los dieciséis idiomas', async () => {
  const sin = LOCALES.filter((l) => !valorDe(l, 'design', 'examplesTitle'));
  return [LOCALES.length === 16 && sin.length === 0, sin.length ? `faltan: ${sin.join(', ')}` : `${LOCALES.length} idiomas`];
});
await prueba('D1) dice «Ejemplos» en español y «Examples» en inglés, y en ningún idioma es el título «Mis creaciones» (no se rotula como lo suyo)', async () => {
  const comoLoSuyo = LOCALES.filter((l) => valorDe(l, 'design', 'examplesTitle') === valorDe(l, 'studio', 'creationsTitle'));
  return [valorDe('es', 'design', 'examplesTitle') === 'Ejemplos' && valorDe('en', 'design', 'examplesTitle') === 'Examples' && comoLoSuyo.length === 0, comoLoSuyo.join(', ')];
});
await prueba('D1) el portugués es el de Brasil («Exemplos») y el danés el suyo («Eksempler»): la clave no se copia del español', async () => {
  const copiados = LOCALES.filter((l) => !['es', 'pt', 'pt-PT'].includes(l) && valorDe(l, 'design', 'examplesTitle') === 'Ejemplos');
  return [valorDe('pt', 'design', 'examplesTitle') === 'Exemplos' && valorDe('da', 'design', 'examplesTitle') === 'Eksempler' && copiados.length === 0, copiados.join(', ')];
});
await prueba('D2) la pantalla la pide por su clave (`design.examplesTitle`) y no escribe «Ejemplos» ni «Mis creaciones» a mano', async () => {
  const codigo = sinComentarios(leer('screens/DesignScreen.tsx'));
  return [/claveDelTitulo=\{[^}]*'design\.examplesTitle'/.test(codigo) && !/['">]\s*(Ejemplos|Examples|Mis creaciones)\s*['"<]/.test(codigo) && !/t\('studio\.creationsTitle'\)/.test(codigo), ''];
});

/* ═══ E · LO QUE NO HACE ══════════════════════════════════════════════════ */
grupo('E · Lo que la pantalla y su gancho no hacen, y que Weë Studio no cambió');

const gancho = sinComentarios(leerSiExiste('hooks/useCreacionesDeDesign.ts'));
const pantalla = sinComentarios(leer('screens/DesignScreen.tsx'));
await prueba('E1) del servicio de trabajos el gancho solo LEE (`getMyJobsDe`): ni crear, ni responder, ni cotizar, ni ejecutar, ni adjuntar', async () => {
  const usadas = [...gancho.matchAll(/creatorService\s*\.\s*(\w+)/g)].map((m) => m[1]);
  return [usadas.length > 0 && usadas.every((u) => u === 'getMyJobsDe'), usadas.join() || 'el gancho no existe o no lee nada'];
});
await prueba('E1) ni toca los Credits, ni Firebase, ni otro servicio, ni escribe nada', async () => {
  const fuente = `${gancho}\n${sinComentarios(leerSiExiste('utils/creacionesDeDesign.ts'))}`;
  const prohibido = /spendCredits|completeCredits|refundCredits|creditsService|useWallet|httpsCallable|getFunctions\(|from 'firebase\/|assetsService|projectsService|brainService|setDoc|updateDoc|addDoc|deleteDoc/;
  return [fuente.trim().length > 0 && !prohibido.test(fuente), (fuente.match(prohibido) || ['ninguno'])[0]];
});
await prueba('E2) abrir una creación no manda `projectId` ni `goal` ni `presets`: solo experiencia y trabajo', async () => {
  const trozo = (pantalla.match(/navigation\.navigate\('CreatorFlow', \{[^}]*\}\)/) || [''])[0];
  return [/experienceId: trabajo\.experienceId, jobId: trabajo\.id/.test(trozo) && !/projectId|goal|presets/.test(trozo), trozo || 'la pantalla no abre ninguna creación'];
});
await prueba('E2) y la pantalla de Design no lleva su propio texto de carga, de error ni de vacío: usa los de siempre de «Mis creaciones»', async () => {
  const keys = [...pantalla.matchAll(/t\('([\w.]+)'\)/g)].map((m) => m[1]);
  return [!keys.some((k) => /^design\.(loading|error|empty|retry)/.test(k)), keys.join()];
});
await prueba('E3) (g) Weë Studio sigue pasándole a la fila lo MISMO que antes: `creaciones`, `onVerTodas` y `onOpciones`, ninguna propiedad nueva', async () => {
  const studio = sinComentarios(leer('screens/StudioScreen.tsx'));
  const uso = (studio.match(/<FilaDeCreaciones\b([\s\S]*?)\/>/) || [])[1] || '';
  const props = [...uso.matchAll(/\b([a-zA-Z]+)=[{"']/g)].map((m) => m[1]);
  return [props.join() === 'creaciones,onVerTodas,onOpciones' && /creaciones=\{CREACIONES_DEL_STUDIO\}/.test(uso) && /onVerTodas=\{\(\) => navigation\.navigate\('Projects'\)\}/.test(uso), props.join()];
});

/* ═══ F · EL CIERRE EJECUTABLE ════════════════════════════════════════════ */
grupo('F · CL-04 en el corredor, por el motivo correcto');

const cierre = await import('./_design-cierre.mjs');
const cl04 = cierre.CRITERIOS.find((c) => c.id === 'CL-04');
await prueba('F1) el corredor da CL-04 como CUMPLIDO', async () => { const e = cierre.evaluar(cl04); return [e.estado === 'CUMPLIDO', `${e.estado}: ${e.evidencia}`]; });
await prueba('F1) y el documento de cierre lo dice igual en su lista', async () => {
  const fila = leer(cierre.CIERRE_MD).split('\n').find((l) => /^\|\s*CL-04\s*\|/.test(l)) || '';
  const celdas = fila.split('|').map((x) => x.trim());
  return [celdas[celdas.length - 2] === 'CUMPLIDO', celdas[celdas.length - 2]];
});

/*
 * EL CONTROL QUE IMPORTA. El detector del corredor mira el texto de la pantalla: una que NOMBRE al gancho pero siga pintando las
 * muestras lo pasaría. Aquí se monta esa pantalla con un gancho que «lee» pero siempre dice «lista, sin nada» y se comprueba que
 * las comprobaciones de comportamiento de arriba SÍ la detectan: si no pudieran, el verde de A no valdría nada.
 */
await prueba('F2) CONTROL: un gancho que siempre dice «lista, sin nada» deja las muestras bajo «Ejemplos» aunque haya creaciones; A1 lo detecta y el detector de TEXTO del corredor no', async () => {
  const w = crearMundo('es', () => ({
    '../hooks/useCreacionesDeDesign': { useCreacionesDeDesign: () => ({ fase: 'lista', creaciones: [], trabajoDe: () => undefined, recargar() {} }) },
  })).montar({ trabajos: SUYAS });
  const v = await entrar(w);
  const fuenteQueSoloNombra = "import { useCreacionesDeDesign } from '../hooks/useCreacionesDeDesign';\n<FilaDeCreaciones creaciones={CREACIONES_DE_DESIGN} />";
  const detectorDeTexto = /getMyJobsDe|assetsService|useCreaciones/;
  return [!veSusCreaciones(v, SUS_TITULOS) && veAlgunaMuestra(v) && detectorDeTexto.test(fuenteQueSoloNombra), `ve muestras: ${veAlgunaMuestra(v)} · el texto la daría por buena: ${detectorDeTexto.test(fuenteQueSoloNombra)}`];
});
await prueba('F2) CONTROL: las comprobaciones distinguen «Mis creaciones» de «Ejemplos»', async () => {
  const lo = { texto: `${MIS_CREACIONES} Un yate de quince metros ${VER_TODAS}` };
  const ej = { texto: `${EJEMPLOS} ${MUESTRAS.join(' ')} ${VER_TODAS}` };
  return [veSusCreaciones(lo, ['Un yate de quince metros']) && !veLasMuestrasComoEjemplos(lo) && veLasMuestrasComoEjemplos(ej) && !veSusCreaciones(ej, []), ''];
});

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nWeë Design: «Mis creaciones» enseña lo que la persona creó, y las muestras solo son ejemplos');
process.exit(failures ? 1 : 0);
