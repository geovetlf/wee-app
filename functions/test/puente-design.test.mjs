/*
 * EL PUENTE DE LA CAJA DE WEË DESIGN A LA EXPERIENCIA COMÚN (R7-Design, tarea P · CL-01 y CL-03 de `docs/WEE-DESIGN-CIERRE.md`).
 *
 * Hasta aquí «Crear» en la pantalla montada de Weë Design era un temporizador de 1,6 s y un aviso que decía «es una
 * demostración» (`docs/DESIGN.md` §1, fase F2). El puente la conecta a `CreatorFlow` —que es donde están las preguntas, el
 * plan con su precio, la reserva, el progreso y el resultado— llevando SOLO lo escrito y los ajustes elegidos dichos en palabras.
 *
 * Es el molde de `puente-studio.test.mjs`, pero con una diferencia que importa: aquella lee texto; esta EJECUTA la pantalla de
 * verdad (`_pantallas.mjs`: `react-dom/server` y dobles de React Native), toca el botón «Crear» por su etiqueta accesible y mira a
 * dónde navega. La caja de escribir es la de siempre —`StudioPromptComposer` se carga tal cual y su `CajaDePrompt` es un doble
 * que repite la regla del botón (apagado sin texto, `puedeEnviar`)—, así que lo que se prueba es el camino que hace un dedo.
 *
 *  A. LA PANTALLA, TOCADA: «Crear» lleva a `CreatorFlow` con el contexto exacto, sin sesión va a `Login`, «Automático» no dice
 *     nada, los ajustes viajan en palabras, la caja vacía no hace nada, el doble toque no apila dos creaciones y volver atrás
 *     no pierde lo escrito. Y nada de servicios, Credits, avisos ni temporizadores.
 *  B. EL CONTEXTO NEUTRO (`utils/contextoDeDesign.ts`), ejecutado: sin presets, sin foto al crear, y la referencia funcional
 *     que lo comparte se comporta EXACTAMENTE como antes de extraerlo.
 *  C. LA FORMA DE LA PANTALLA, leída: ni presets ni foto ni servicios ni proveedores ni la referencia, y ya sin demostración.
 *  D. EL CONTRATO con la experiencia común y con el servidor.
 *
 * ── BLOCKED — HUMAN DECISION ───────────────────────────────────────────────
 * Dos comprobaciones fijan el comportamiento de hoy de algo que espera una decisión del dueño: que NO viaje ningún preset de
 * puerta (D1 y D7 de `docs/DESIGN.md` §4) y que las referencias de la caja, que son nombres de muestra, NO viajen (D6). Cuando
 * se decidan se invierten SOLO esas dos; ninguna otra depende del resultado.
 *
 * Cada detector lleva su CONTROL, para que un verde no pueda ser un verde vacío. Sin red ni emulador: unos 10 s.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { crearEntorno } from './_pantallas.mjs';
import { RAIZ, crearCargador, leer, sinComentarios } from './filmmaker-cliente.mjs';
import { PROVEEDOR } from './design-referencia.mjs';

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
/** Lo que falte al cargar no rompe la suite entera: cada comprobación que lo necesita falla con su nombre, y así el rojo SE LEE. */
const intentar = (f, siFalla = null) => { try { return f(); } catch { return siFalla; } };
const ordenado = (v) => (Array.isArray(v) ? v.map(ordenado) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, ordenado(v[k])])) : v);
/** Igualdad por contenido, sin depender del orden de las claves. */
const igual = (a, b) => JSON.stringify(ordenado(a)) === JSON.stringify(ordenado(b));
const requerir = createRequire(path.resolve(RAIZ, 'package.json'));

/* ── El traductor y las constantes de VERDAD, para saber qué debería salir ── */
const base = crearCargador({ dobles: { 'react-native': { Platform: { OS: 'android', select: (o) => o.android ?? o.default }, Dimensions: { get: () => ({ width: 390, height: 800 }) } } } });
const { crearTraductor } = base('i18n/traducir.ts');
const DICCIONARIOS = { es: base('i18n/textos/es/index.ts').es, en: base('i18n/textos/en/index.ts').en };
const traductorDe = (idioma) => crearTraductor(idioma, DICCIONARIOS, {});
const tEs = traductorDe('es');
const tEn = traductorDe('en');
const DESIGN = base('constants/designTools.ts');
const ENVIAR = tEs('studio.sendLabel');

/* ── Lo que la pantalla NO debe tocar: cualquier acceso queda anotado ── */
const llamadas = [];
const vigilado = (nombre) => new Proxy({}, { get: (_, k) => { if (k !== '__esModule' && k !== 'then') llamadas.push(`${nombre}.${String(k)}`); return () => undefined; } });
const SERVICIOS_VIGILADOS = [
  '../services/creatorService', '../services/creditsService', '../services/assetsService', '../services/projectsService',
  '../services/brainService', '../hooks/useWallet', '../hooks/useBrainChat',
];
/*
 * R8 · P3 Y EL PUENTE CONVIVEN. La fila «Mis creaciones» de la pantalla (`hooks/useCreacionesDeDesign`) LEE los trabajos de la cuenta con
 * `creatorService.getMyJobsDe` al enfocar la pantalla: es lo único que la pantalla puede tocar de ese servicio. Se deja pasar —sin trabajos— y
 * se apunta APARTE (`lecturas`); cualquier otra cosa —crear, responder, cotizar, ejecutar— sigue siendo un acceso vigilado, y tocar «Crear» no
 * puede añadir ninguna lectura (A14). `claveDelEstado` es el mapa de claves de estado: leerlo no es llamar a nadie.
 */
const lecturas = [];
const creatorServiceConLectura = () => ({
  creatorService: new Proxy({}, { get: (_, k) => {
    if (k === 'getMyJobsDe') return async (...argumentos) => { lecturas.push(argumentos); return []; };
    if (k !== '__esModule' && k !== 'then') llamadas.push(`../services/creatorService.creatorService.${String(k)}`);
    return () => undefined;
  } }),
  claveDelEstado: new Proxy({}, { get: (_, k) => `weeai.job.${String(k)}` }),
});

/*
 * Los dobles de la pantalla. Se sustituyen las piezas COMPARTIDAS de Weë AI (lo que cada una hace por dentro lo vigilan sus
 * propias suites) y se CARGA DE VERDAD lo que es del puente: la propia pantalla, `StudioPromptComposer`, el contexto neutro,
 * el destino de siempre y el catálogo de Weë Design. `AvisoDeCreacion` y `useAlturaDelTeclado` se doblan para que la pantalla
 * de ANTES del puente también cargue: es lo que permite ver esta suite en rojo contra ella.
 */
const doblesDeDesign = (idioma) => (ctx) => {
  const { h: hh, capturar, Toque, colores, usuario, movil } = ctx;
  const t = traductorDe(idioma);
  const tema = { useTheme: () => ({ theme: { colors: colores } }), enTemaClaro: (C) => C };
  const habla = { useT: () => t, useIdioma: () => ({ t, locale: idioma }) };
  return {
    '../contexts/ThemeContext': tema, '../../contexts/ThemeContext': tema,
    '../contexts/IdiomaContext': habla, '../../contexts/IdiomaContext': habla,
    '../contexts/AuthContext': { useAuth: () => ({ user: usuario }) },
    '../hooks/useResponsive': { useResponsive: () => ({ isMobile: movil, isTablet: false, isDesktop: !movil }) },
    '../components/BarraInferior': { ALTO_BARRA: 64 },
    ...Object.fromEntries(SERVICIOS_VIGILADOS.map((s) => [s, vigilado(s)])),
    '../services/creatorService': creatorServiceConLectura(),
    '../components/creator/CajaQueCrece': { PaginaDeCajas: capturar('PaginaDeCajas') },
    '../components/studio/StudioHeader': capturar('StudioHeader'),
    /* La caja de siempre, con su regla: el botón de crear se apaga mientras no haya nada escrito (`CajaDePrompt.puedeEnviar`). */
    '../creator/CajaDePrompt': capturar('CajaDePrompt', (p) => {
      const puedeEnviar = p.valor.trim().length > 0 && !p.ocupado && p.editable !== false;
      return hh('div', { 'data-componente': 'CajaDePrompt' },
        hh('textarea', { 'aria-label': p.etiqueta ?? p.placeholder, placeholder: p.placeholder, defaultValue: p.valor }),
        ...p.acciones.map((a) => hh(Toque, { key: `${a.icono}·${a.etiqueta}`, accessibilityLabel: a.etiqueta, accessibilityRole: 'button', onPress: a.alPulsar }, a.icono)),
        hh(Toque, { key: 'enviar', accessibilityLabel: p.etiquetaEnviar, accessibilityRole: 'button', disabled: !puedeEnviar, onPress: () => p.onEnviar() }, 'arrow-up'));
    }),
    '../components/creator/AjustesContextuales': capturar('AjustesContextuales'),
    '../components/creator/AvisoDeCreacion': capturar('AvisoDeCreacion'),
    '../components/creator/FilaDeCreaciones': capturar('FilaDeCreaciones'),
    '../components/creator/FichaDeContexto': capturar('FichaDeContexto', (p) => hh('span', { 'data-ficha': p.texto }, p.texto)),
    '../components/EspacioDeEscritura': { __esModule: true, default: capturar('EspacioDeEscritura'), useAlturaDelTeclado: () => 0 },
    '../components/design/DesignExplore': capturar('DesignExplore'),
    '../components/design/DesignPanel': capturar('DesignPanel'),
  };
};
const entornos = [];
const pantalla = (extra = {}) => {
  const e = crearEntorno({ pantalla: 'screens/DesignScreen.tsx', dobles: doblesDeDesign(extra.idioma ?? 'es'), ...extra });
  entornos.push(e);
  return e;
};
/** Toca «Crear» como un dedo. Si el botón está apagado o no está, lo cuenta en vez de romper. */
const crear = (e, etiqueta = ENVIAR) => { try { e.tocar(etiqueta); return null; } catch (err) { return String(err.message).split('\n')[0]; } };
/** Escribe en la caja y deja la pantalla dibujada con eso. */
const escribir = (e, texto) => { e.dibujar(); e.capturas.CajaDePrompt.onCambiar(texto); e.dibujar(); };
/** Lo que la pantalla navegó: [acción, destino, parámetros]. */
const navegado = (e) => e.navegacion.map((n) => n.slice(0, 3));

/* Los temporizadores se APUNTAN en vez de esperarse: la pantalla del puente no tiene ninguno. */
const temporizadores = [];
const setTimeoutReal = globalThis.setTimeout;
const clearTimeoutReal = globalThis.clearTimeout;
globalThis.setTimeout = (fn, ms) => { temporizadores.push({ fn, ms }); return temporizadores.length; };
globalThis.clearTimeout = () => {};

console.log('\n─── A. La pantalla, tocada: «Crear» lleva a CreatorFlow ───');

const IDEA = 'Un salón con chimenea';
{
  const e = pantalla();
  escribir(e, IDEA);
  const fallo = crear(e);
  const [paso] = navegado(e);
  check('A1) «Crear» con una idea lleva a CreatorFlow con su experiencia, su lugar de trabajo y la idea tal cual',
    fallo === null && e.navegacion.length === 1 && paso[0] === 'navigate' && paso[1] === 'CreatorFlow'
    && igual(paso[2], { experienceId: 'design', workspace: 'design', goal: IDEA }), fallo ?? JSON.stringify(paso));
  check('A2) y SOLO eso: ni presets, ni preset, ni adjuntos, ni foto, ni controles creativos, ni un trabajo que reabrir (el puente es neutro)',
    !!paso && !!paso[2] && Object.keys(paso[2]).sort().join() === 'experienceId,goal,workspace', paso ? Object.keys(paso[2]).sort().join() : 'no navegó');
  check('A3) el botón de crear de la caja se llama «Crear» y es el que lo hace (rol «button»)',
    e.dibujar().botones.some((b) => b.etiqueta === ENVIAR && b.rol === 'button'));
}
{
  /* «Automático» es no decir nada: elegirlo, o no tocar nada, deja la idea sola. */
  const e = pantalla();
  escribir(e, IDEA);
  for (const g of DESIGN.AJUSTES_DE_DESIGN) e.capturas.AjustesContextuales.onElegir(g.id, 'auto');
  e.dibujar();
  crear(e);
  check('A4) con todos los ajustes en «Automático» el objetivo es la idea SOLA, sin palabras añadidas ni separador',
    e.navegacion.length === 1 && e.navegacion[0][2]?.goal === IDEA, e.navegacion[0] ? JSON.stringify(e.navegacion[0][2]?.goal) : 'no navegó');
}
{
  /* Los ajustes viajan en palabras: las del idioma de la persona, no los identificadores. */
  const e = pantalla();
  escribir(e, IDEA);
  e.capturas.AjustesContextuales.onElegir('style', 'minimal');
  e.capturas.AjustesContextuales.onElegir('materials', 'wood');
  e.dibujar();
  crear(e);
  const esperado = `${IDEA} · ${tEs('design.valMinimal')}, ${tEs('design.valWood')}`;
  check('A5) los ajustes elegidos van DESPUÉS de la idea, en palabras: «idea · Minimalista, Madera»',
    e.navegacion.length === 1 && e.navegacion[0][2]?.goal === esperado, `${JSON.stringify(e.navegacion[0]?.[2]?.goal)} · esperaba ${JSON.stringify(esperado)}`);
  const en = pantalla({ idioma: 'en' });
  escribir(en, 'A living room with a fireplace');
  en.capturas.AjustesContextuales.onElegir('style', 'minimal');
  en.dibujar();
  crear(en, tEn('studio.sendLabel'));
  check('A5) y en inglés salen en inglés (las palabras salen del catálogo traducido, no de los identificadores)',
    en.navegacion.length === 1 && en.navegacion[0][2]?.goal === `A living room with a fireplace · ${tEn('design.valMinimal')}`
    && tEn('design.valMinimal') !== tEs('design.valMinimal'), JSON.stringify(en.navegacion[0]?.[2]?.goal));
}
{
  /* Lo que decide entra; lo que no decide, no. */
  const e = pantalla();
  escribir(e, IDEA);
  e.capturas.AjustesContextuales.onElegir('lighting', 'auto');
  e.capturas.AjustesContextuales.onElegir('quality', 'high');
  e.dibujar();
  crear(e);
  check('A6) mezclados «Automático» y una elección, solo habla la elección',
    e.navegacion.length === 1 && e.navegacion[0][2]?.goal === `${IDEA} · ${tEs('studio.valHigh')}`, JSON.stringify(e.navegacion[0]?.[2]?.goal));
}
{
  /* Lo escrito no se toca por dentro: ni acentos, ni comillas, ni un « · » propio, ni saltos de línea. */
  const raro = '  Una “butaca” de ñandú · para mí\ncon dos líneas  ';
  const e = pantalla();
  escribir(e, raro);
  crear(e);
  check('A7) lo escrito viaja entero —solo se recorta lo que sobra en los extremos— sin tocar nada por dentro',
    e.navegacion.length === 1 && e.navegacion[0][2]?.goal === raro.trim(), JSON.stringify(e.navegacion[0]?.[2]?.goal));
  const largo = `Un salón ${'muy '.repeat(120)}luminoso`;
  const l = pantalla();
  escribir(l, largo);
  crear(l);
  check('A7) y una idea larguísima sale COMPLETA: cortar es cosa del servidor (300), no de la pantalla',
    l.navegacion.length === 1 && l.navegacion[0][2]?.goal === largo.trim() && largo.length > 300, `${largo.length} caracteres`);
}
{
  /* Sin sesión nadie crea: lleva a entrar, igual que el resto de pantallas de Weë AI. */
  const e = pantalla({ usuario: null });
  escribir(e, IDEA);
  crear(e);
  check('A8) sin sesión «Crear» lleva a entrar (Login) y a ninguna otra parte',
    e.navegacion.length === 1 && e.navegacion[0].join() === 'navigate,Login', JSON.stringify(navegado(e)));
}
{
  /* La caja vacía no hace nada: el botón está apagado y, aunque alguien lo llamara, la pantalla tampoco navega. */
  const vacia = pantalla();
  vacia.dibujar();
  const intento = crear(vacia);
  check('A9) con la caja vacía el botón de crear está APAGADO (la caja lo apaga: no se puede ni tocar)', /apagado/.test(intento ?? ''), intento ?? 'se pudo tocar');
  vacia.capturas.CajaDePrompt.onEnviar();
  escribir(vacia, '    ');
  vacia.capturas.CajaDePrompt.onEnviar();
  const sinSesion = pantalla({ usuario: null });
  sinSesion.dibujar();
  sinSesion.capturas.CajaDePrompt.onEnviar();
  check('A9) y aunque se llamara a enviar a la fuerza —vacía o con solo espacios, con o sin sesión— no navega ni va a Login',
    vacia.navegacion.length === 0 && sinSesion.navegacion.length === 0, `${vacia.navegacion.length} + ${sinSesion.navegacion.length} navegaciones`);
}
{
  /* Un punto de partida sin nada más escrito: la idea queda empezada y «Crear» manda ESA idea. */
  const punto = DESIGN.PUERTAS_DE_DESIGN.find((p) => p.id === 'interiors').puntos[0];
  const e = pantalla();
  e.dibujar();
  e.capturas.DesignExplore.onAbrir('interiors');
  e.dibujar();
  e.capturas.DesignPanel.onElegirPunto(punto);
  e.dibujar();
  const empezada = e.capturas.CajaDePrompt?.valor;
  crear(e);
  check('A10) un punto de partida elegido sin texto deja la idea empezada, y «Crear» manda esa idea (sin el espacio que sobra)',
    empezada === `${tEs(punto.clave)} ` && e.navegacion.length === 1 && e.navegacion[0][2]?.goal === tEs(punto.clave), `${JSON.stringify(empezada)} → ${JSON.stringify(e.navegacion[0]?.[2]?.goal)}`);
  const con = pantalla();
  escribir(con, 'Una butaca de cuero');
  con.capturas.DesignExplore.onAbrir('vehicles');
  con.dibujar();
  con.capturas.DesignPanel.onElegirPunto(DESIGN.PUERTAS_DE_DESIGN.find((p) => p.id === 'vehicles').puntos[0]);
  con.dibujar();
  crear(con);
  check('A10) y si ya había algo escrito, el punto NO lo pisa: «Crear» manda lo que la persona escribió',
    con.navegacion.length === 1 && con.navegacion[0][2]?.goal === 'Una butaca de cuero', JSON.stringify(con.navegacion[0]?.[2]?.goal));
  check('A10) la puerta por la que se pasó NO viaja (la elección de puerta a intención de la plantilla es D1 y D7: BLOCKED — HUMAN DECISION)',
    !('presets' in (e.navegacion[0]?.[2] ?? {})) && !('preset' in (e.navegacion[0]?.[2] ?? {})));
}
{
  /* El doble toque: dos órdenes iguales a la navegación de verdad dejan UNA sola creación. */
  const e = pantalla();
  escribir(e, IDEA);
  const primero = crear(e);
  const segundo = crear(e);
  const acciones = e.navegacion.filter((n) => n[0] === 'navigate' && n[1] === 'CreatorFlow');
  const { StackRouter, CommonActions, StackActions } = requerir('@react-navigation/routers');
  const opciones = { routeNames: ['Main', 'Design', 'CreatorFlow', 'Login'], routeParamList: {}, routeGetIdList: {} };
  /* La pila de verdad (`StackRouter` de la versión instalada) recibiendo esas órdenes, una tras otra. */
  const rutasTras = (ordenes) => {
    const router = StackRouter({});
    let estado = router.getInitialState(opciones);
    for (const o of [CommonActions.navigate('Design'), ...ordenes]) {
      const nuevo = router.getStateForAction(estado, o, { ...opciones, routeKeyChanges: [], type: 'stack' });
      if (nuevo) estado = nuevo;
    }
    return estado.routes.map((r) => r.name);
  };
  const conNavigate = rutasTras(acciones.map((n) => CommonActions.navigate(n[1], n[2])));
  check('A11) dos toques seguidos a «Crear» salen como DOS órdenes iguales, sin estado que las distinga',
    primero === null && segundo === null && acciones.length === 2 && igual(acciones[0][2], acciones[1][2]), `${acciones.length} órdenes`);
  check('A11) y la pila de verdad las convierte en UNA sola CreatorFlow (no se abren dos conversaciones ni se crean dos trabajos)',
    conNavigate.filter((n) => n === 'CreatorFlow').length === 1, conNavigate.join(' > '));
  const conPush = rutasTras(acciones.map((n) => StackActions.push(n[1], n[2])));
  check('CONTROL: con `push` en vez de `navigate` la misma pila SÍ apilaría dos CreatorFlow (el detector muerde)',
    conPush.filter((n) => n === 'CreatorFlow').length === 2, conPush.join(' > '));
  check('A11) la pantalla navega con `navigate`, no con `push`', /navigation\.navigate\('CreatorFlow'/.test(leer('screens/DesignScreen.tsx')) && !/navigation\.push\(/.test(leer('screens/DesignScreen.tsx')));
}
{
  /* Volver desde CreatorFlow: la pantalla queda debajo, con lo suyo. No se borra nada al irse. */
  const e = pantalla();
  escribir(e, IDEA);
  e.capturas.AjustesContextuales.onElegir('style', 'minimal');
  e.tocar(tEs('studio.referenceLabel'));
  crear(e);
  e.enfocar();
  const vuelta = e.dibujar();
  check('A12) al volver atrás desde CreatorFlow la caja conserva lo escrito (como en Weë Studio: la pantalla no se vacía al crear)',
    e.capturas.CajaDePrompt?.valor === IDEA);
  check('A12) y conserva los ajustes elegidos y las referencias añadidas',
    e.capturas.AjustesContextuales?.elegido?.style === 'minimal' && (vuelta.html.match(/data-ficha=/g) || []).length === 1);
  check('A12) y no hizo nada más al irse: ni `goBack`, ni cambiar los parámetros de la ruta; solo `navigate` a CreatorFlow',
    e.navegacion.length === 1 && e.navegacion[0][0] === 'navigate' && e.navegacion[0][1] === 'CreatorFlow');
}
{
  /* Las referencias de la caja son nombres de muestra: hoy NO viajan (D6). Que no se vea una foto que no va. */
  const e = pantalla();
  escribir(e, IDEA);
  e.tocar(tEs('studio.referenceLabel'));
  e.tocar(tEs('studio.addLabel'));
  e.dibujar();
  const fichas = (e.dibujar().html.match(/data-ficha=/g) || []).length;
  crear(e);
  const ctxEnviado = e.navegacion[0]?.[2] ?? {};
  check('A13) BLOCKED — HUMAN DECISION (D6) · las referencias de la caja son nombres de muestra y HOY no viajan: ni `adjuntos` ni foto al crear (F-07: el plan de `design` la ignora)',
    fichas === 2 && e.navegacion.length === 1 && !('adjuntos' in ctxEnviado) && !('imageUri' in ctxEnviado), `${fichas} fichas · ${Object.keys(ctxEnviado).join(', ')}`);
}
{
  /* Nada de lo que la pantalla NO debe hacer por su cuenta. */
  check('A14) crear no llama a ningún servicio de creación, de Credits, de materiales ni de proyectos, ni a Weë Brain (ni un acceso; la fila «Mis creaciones» solo LEE con `getMyJobsDe`, y se anota aparte)',
    llamadas.length === 0, llamadas.slice(0, 4).join(' · ') || 'ninguna llamada');
  check('A14) no avisa de nada («próximamente», errores…)',
    entornos.every((e) => e.avisos.length === 0), entornos.flatMap((e) => e.avisos).join(' · ') || 'sin avisos');
  {
    /* R8 · P3 y el puente conviven: la única lectura es la de la fila de creaciones, al enfocar; tocar «Crear» no añade ninguna. */
    const e = pantalla();
    const antes = lecturas.length;
    e.dibujar();
    e.enfocar();
    const alEnfocar = lecturas.length - antes;
    escribir(e, IDEA);
    crear(e);
    const alCrear = lecturas.length - antes - alEnfocar;
    check('A14) la única lectura de la pantalla es la de la fila «Mis creaciones» (los trabajos de la cuenta, al enfocarla): tocar «Crear» no añade ninguna',
      alEnfocar === 1 && alCrear === 0 && e.navegacion.length === 1 && e.navegacion[0][1] === 'CreatorFlow', `${alEnfocar} al enfocar · ${alCrear} al crear`);
  }
  check('A14) y no deja ningún temporizador: ya no hay creación de mentira que esperar',
    temporizadores.length === 0, `${temporizadores.length} temporizador(es)`);
  const e = pantalla();
  escribir(e, IDEA);
  crear(e);
  e.dibujar();
  check('A15) la pantalla ya no monta el aviso de demostración ni deja la caja «ocupada» mientras se crea',
    !e.capturas.AvisoDeCreacion && !e.capturas.CajaDePrompt.ocupado, e.capturas.AvisoDeCreacion ? `AvisoDeCreacion estado=${e.capturas.AvisoDeCreacion.estado}` : 'sin aviso');
  /* CONTROL: el vigilante de servicios muerde. */
  const antesDelControl = llamadas.length;
  vigilado('control').creatorService;
  const mordio = llamadas.length === antesDelControl + 1;
  llamadas.length = antesDelControl;
  check('CONTROL: un acceso a un servicio vigilado QUEDARÍA anotado', mordio, 'si esto pasara, A14 no protegería nada');
  /* CONTROL de la lectura: `getMyJobsDe` se anota aparte, y cualquier otro método del servicio de trabajos sigue siendo un acceso vigilado. */
  const lecturasAntes = lecturas.length;
  creatorServiceConLectura().creatorService.getMyJobsDe();
  const leyo = lecturas.length === lecturasAntes + 1 && llamadas.length === antesDelControl;
  lecturas.length = lecturasAntes;
  creatorServiceConLectura().creatorService.start;
  const vigiloElResto = llamadas.length === antesDelControl + 1;
  llamadas.length = antesDelControl;
  check('CONTROL: leer los trabajos queda anotado como LECTURA y cualquier otra cosa del servicio (`start`, `run`…) como acceso vigilado', leyo && vigiloElResto, 'si esto pasara, A14 no distinguiría leer de crear');
}

console.log('\n─── B. El contexto neutro, ejecutado ───');

const hayNeutro = fs.existsSync(path.resolve(RAIZ, 'utils/contextoDeDesign.ts'));
const N = hayNeutro ? base('utils/contextoDeDesign.ts') : {};
const REF = base('utils/designReferencia.ts');
const D = base('utils/destinoDeIntencion.ts');
const REGISTRO = base('constants/designReferencia.ts');
const IDS_DE_QUE = new Set(REGISTRO.QUE_SE_DISENA.map((q) => q.id));
check('B1) existe `utils/contextoDeDesign.ts` y exporta lo que la pantalla y la referencia necesitan',
  typeof N.contextoDeDesign === 'function' && typeof N.palabrasDeLosAjustes === 'function', hayNeutro ? Object.keys(N).join(', ') : 'no existe el archivo');
const contexto = (e) => (typeof N.contextoDeDesign === 'function' ? N.contextoDeDesign(e) : undefined);
check('B2) crear con una idea: la experiencia `design`, el lugar de trabajo `design` y la idea; nada más',
  igual(contexto({ intencion: 'crear', texto: ` ${IDEA} ` }), { experienceId: 'design', workspace: 'design', goal: IDEA }));
check('B2) con ajustes en palabras, van detrás de la idea', igual(contexto({ intencion: 'crear', texto: IDEA, ajustesEnPalabras: 'Moderno, Madera' }), { experienceId: 'design', workspace: 'design', goal: `${IDEA} · Moderno, Madera` }));
check('B3) sin nada escrito (o solo espacios) no hay contexto: `null`', contexto({ intencion: 'crear', texto: '' }) === null && contexto({ intencion: 'crear', texto: '   ' }) === null);
const FOTO = { clase: 'fotoDeUnEspacio', uri: 'file:///salon.jpg' };
check('B4) sin el catálogo de la plantilla (`idsDeQue`) NINGUNA puerta se convierte en preset: el puente no puede soltar uno por descuido',
  !('presets' in (contexto({ intencion: 'crear', texto: IDEA, que: 'logo' }) ?? { presets: 1 })));
check('B4) con el catálogo, el preset es la respuesta `what` ya dada (así lo usa la referencia)',
  igual(contexto({ intencion: 'crear', texto: IDEA, que: 'logo', idsDeQue: IDS_DE_QUE })?.presets, [{ questionId: 'what', optionId: 'logo' }])
  && !('presets' in (contexto({ intencion: 'crear', texto: IDEA, que: 'zzz', idsDeQue: IDS_DE_QUE }) ?? { presets: 1 })));
check('B5) crear NUNCA lleva foto, aunque le pasen una (la plantilla `design` la ignora y subirla para nada sería mentir: F-07)',
  igual(contexto({ intencion: 'crear', texto: IDEA, adjuntos: [FOTO] }), { experienceId: 'design', workspace: 'design', goal: IDEA }));
check('B5) transformar un espacio sí: va a Hogar & Diseño (`home`) con la foto de siempre (`adjuntos` e `imageUri`), y solo la de un espacio',
  igual(contexto({ intencion: 'transformar', texto: 'Quiero otro suelo', adjuntos: [FOTO, { clase: 'referencia', uri: 'file:///otra.jpg' }] }),
    { experienceId: 'home', workspace: 'design', goal: 'Quiero otro suelo', adjuntos: [FOTO], imageUri: FOTO.uri }));

/*
 * LA REFERENCIA, COMO ANTES. `contextoDeDesign` vivía dentro de `utils/designReferencia.ts` y se extrajo a un módulo neutro
 * para que la pantalla montada pueda usarlo sin «saber» que la referencia existe (I17). El cuerpo de abajo es el de antes de
 * extraerlo (a64ff24), con su catálogo de `QUE_SE_DISENA`: es el oráculo de que la referencia no cambió ni un resultado.
 */
const contextoDeAntes = (e) => {
  const texto = e.texto.trim();
  if (!texto) return null;
  const destino = D.destinoDeIntencion(texto, { declaradaPorLaPuerta: e.intencion === 'crear' ? 'design' : 'home', dentroDe: 'design' });
  if (!destino) return null;
  const fotos = e.intencion === 'transformar' ? (e.adjuntos ?? []).filter((a) => a.clase === 'fotoDeUnEspacio') : [];
  return {
    experienceId: destino.experienceId,
    workspace: 'design',
    goal: e.ajustesEnPalabras ? `${texto} · ${e.ajustesEnPalabras}` : texto,
    ...(e.intencion === 'crear' && e.que && IDS_DE_QUE.has(e.que) ? { presets: [{ questionId: 'what', optionId: e.que }] } : {}),
    ...(fotos.length ? { adjuntos: [...fotos], imageUri: fotos[0].uri } : {}),
  };
};
const MATRIZ = [
  { intencion: 'crear', texto: IDEA },
  { intencion: 'crear', texto: `  ${IDEA}  `, ajustesEnPalabras: 'Moderno, Madera' },
  { intencion: 'crear', texto: IDEA, que: 'logo' },
  { intencion: 'crear', texto: IDEA, que: 'scene', ajustesEnPalabras: 'Natural' },
  { intencion: 'crear', texto: IDEA, que: 'inventado' },
  { intencion: 'crear', texto: IDEA, que: null },
  { intencion: 'crear', texto: IDEA, adjuntos: [FOTO] },
  { intencion: 'crear', texto: '' },
  { intencion: 'crear', texto: '   ' },
  { intencion: 'transformar', texto: 'Otro suelo', adjuntos: [FOTO] },
  { intencion: 'transformar', texto: 'Otro suelo', adjuntos: [FOTO, FOTO] },
  { intencion: 'transformar', texto: 'Otro suelo', adjuntos: [{ clase: 'referencia', uri: 'file:///x.jpg' }] },
  { intencion: 'transformar', texto: 'Otro suelo', ajustesEnPalabras: 'Cálida' },
  { intencion: 'transformar', texto: 'Otro suelo', que: 'logo', adjuntos: [FOTO] },
  { intencion: 'transformar', texto: '' },
];
const distintos = MATRIZ.filter((e) => !igual(REF.contextoDeDesign(e), contextoDeAntes(e)));
check('B6) la referencia funcional da EXACTAMENTE lo mismo que antes de extraer la función, en las 15 entradas que la ejercitan',
  distintos.length === 0 && typeof REF.contextoDeDesign === 'function', distintos.length ? `difiere en ${JSON.stringify(distintos[0])}` : `${MATRIZ.length} entradas iguales`);
check('B6) y el contexto neutro, con el catálogo de la plantilla, da lo mismo que la referencia',
  typeof N.contextoDeDesign === 'function' && MATRIZ.every((e) => igual(N.contextoDeDesign({ ...e, idsDeQue: IDS_DE_QUE }), REF.contextoDeDesign(e))));

const t1 = (c) => ({ 'design.valMinimal': 'Minimalista', 'design.valWood': 'Madera', 'studio.valHigh': 'Alta' }[c] ?? c);
const palabras = (elegido, t = t1, grupos) => (typeof N.palabrasDeLosAjustes === 'function' ? N.palabrasDeLosAjustes(elegido, t, grupos) : undefined);
check('B7) los ajustes dichos en palabras: «Automático» no dice nada y lo elegido sale del catálogo traducido',
  igual(palabras({ style: 'auto', materials: 'wood', quality: 'high' }), ['Madera', 'Alta']) && igual(palabras({}), []));
check('B7) un grupo o una opción que el catálogo no conoce se deja fuera, sin romper nada',
  igual(palabras({ inventado: 'x', style: 'tampoco', materials: 'wood' }), ['Madera']));
check('B7) el orden es el de elección (el del primer toque a cada grupo), igual que en la referencia',
  igual(palabras({ quality: 'high', style: 'minimal' }), ['Alta', 'Minimalista']) && igual(palabras({ style: 'minimal', quality: 'high' }), ['Minimalista', 'Alta']));
check('B7) con otro catálogo (sin tocar el de Weë Design) hace lo mismo: no depende de los grupos de hoy',
  igual(palabras({ a: 'x' }, (c) => c.toUpperCase(), [{ id: 'a', opciones: [{ id: 'x', clave: 'k.x' }] }]), ['K.X']));

const fuenteNeutra = hayNeutro ? leer('utils/contextoDeDesign.ts') : '';
const codigoNeutro = sinComentarios(fuenteNeutra);
const importaciones = [...codigoNeutro.matchAll(/^import\s[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1]).sort();
check('B8) el módulo neutro solo importa el contrato del contexto, el catálogo de la pantalla y el destino de siempre',
  fuenteNeutra !== '' && importaciones.join() === ['../constants/designTools', '../constants/weeWorkspaces', './destinoDeIntencion'].join(), importaciones.join(', ') || 'sin importaciones');
check('B8) no sabe que la referencia existe (ni su lógica ni su registro), no llama a Firebase ni a servicios, no nombra proveedores y no usa `any`',
  fuenteNeutra !== '' && !/designReferencia|DesignReferencia/.test(codigoNeutro) && !/firebase|httpsCallable|creatorService|spendCredits|useWallet/.test(codigoNeutro)
  && !PROVEEDOR.test(codigoNeutro) && !/:\s*any\b|<any>|\bas any\b/.test(codigoNeutro));
const refFuente = leer('utils/designReferencia.ts');
check('B9) la referencia lo re-exporta con su catálogo de `QUE_SE_DISENA` (una sola función de verdad, y la referencia sigue exportando la suya)',
  /from '\.\/contextoDeDesign'/.test(refFuente) && /export const contextoDeDesign\b/.test(refFuente) && /idsDeQue/.test(refFuente));

console.log('\n─── C. La forma de la pantalla, leída ───');

const fuente = leer('screens/DesignScreen.tsx');
const codigo = sinComentarios(fuente);
const hayTemporizador = (c) => /\bsetTimeout\b|\bclearTimeout\b|LO_QUE_TARDA_LA_DEMO/.test(c);
const hayDemostracion = (c) => /AvisoDeCreacion|EstadoDeCreacion|useAlturaDelTeclado|\bocupado=/.test(c);
const llevaEstructura = (c) => /\b(presets?|adjuntos|imageUri|creative|jobId)\b/.test(c);
const llamaPorSuCuenta = (c) => /spendCredits|completeCredits|refundCredits|creditsBalance|creditsService|useWallet|httpsCallable|getFunctions\(|from 'firebase\/|creatorService|assetsService|projectsService|brainService|useBrainChat/.test(c);
const sabeDeLaReferencia = (c) => /designReferencia|DesignReferencia/.test(c);
/*
 * R8 · P3 y el puente conviven. La fila «Mis creaciones» REABRE un trabajo ya hecho por su `jobId` (`alAbrirCreacion`): es otro camino, el de
 * volver a algo que ya existe, y no el de crear. Lo que no puede pasar es que el de CREAR lleve un trabajo, una experiencia escrita a mano ni
 * estructura: por eso C2 y C3 miran la pantalla sin ese manejador (que vigila `design-mis-creaciones` E2: solo experiencia y trabajo, ni
 * proyecto ni texto).
 */
const sinReabrirCreaciones = (c) => c.replace(/const alAbrirCreacion = useCallback\([\s\S]*?\n  \}, \[[^\]]*\]\);/, '');
check('C1) crear es ir a CreatorFlow con el objeto que arma `contextoDeDesign`, no con uno escrito al lado',
  /const contexto = contextoDeDesign\(\{/.test(codigo) && /navigation\.navigate\('CreatorFlow', contexto\);/.test(codigo));
check('C2) el contexto sale de UN solo sitio: la pantalla no escribe la experiencia ni el lugar de trabajo a mano al CREAR (reabrir una creación ya hecha, que sí lleva su experiencia, es otro camino)',
  !/experienceId\s*:/.test(sinReabrirCreaciones(codigo)) && !/workspace\s*:/.test(sinReabrirCreaciones(codigo)));
check('C3) la pantalla no construye presets, adjuntos, foto, controles creativos ni reabre trabajos al CREAR: solo lo escrito y los ajustes (reabrir una creación ya hecha es otro camino)',
  !llevaEstructura(sinReabrirCreaciones(codigo)));
check('C4) ya no hay creación de mentira: ni temporizador, ni aviso de demostración, ni su estado, ni el teclado del aviso',
  !hayTemporizador(codigo) && !hayDemostracion(codigo));
check('C5) la pantalla no mueve dinero ni llama a nadie por su cuenta: ni Credits, ni servicios, ni Firebase, ni Weë Brain',
  !llamaPorSuCuenta(codigo), (codigo.match(/spendCredits|creditsBalance|creditsService|useWallet|httpsCallable|creatorService|assetsService|projectsService|brainService|useBrainChat/) || ['ninguna llamada'])[0]);
check('C6) la pantalla de siempre no sabe que la referencia funcional existe (I17), y el contexto lo comparte un módulo neutro',
  !sabeDeLaReferencia(fuente) && /from '\.\.\/utils\/contextoDeDesign'/.test(codigo));
check('C7) y no nombra proveedores ni modelos: la persona elige el resultado y Weë elige la IA', !PROVEEDOR.test(codigo));
check('C8) sin sesión va a Login, como el resto de pantallas de Weë AI (y solo después de comprobar que hay algo escrito)',
  /navigation\.navigate\('Login'\)/.test(codigo) && codigo.indexOf('if (!contexto) return;') > -1 && codigo.indexOf('if (!contexto) return;') < codigo.indexOf("navigation.navigate('Login')"));
check('C9) ningún texto nuevo escrito a mano: lo único que dice la pantalla fuera de i18n sigue siendo el nombre de marca de la cabecera y `notify(t(…))`',
  !/notify\(\s*['"`]/.test(codigo) && (codigo.match(/notify\(/g) || []).length === (codigo.match(/notify\(t\(/g) || []).length);
/*
 * Una `useCallback` que lee algo que no declara en sus dependencias se queda con el valor viejo: en la app de verdad «Crear»
 * mandaría la idea o los ajustes de antes. El entorno de pruebas dibuja de nuevo cada vez y no lo ve, así que se lee aquí.
 */
const dependenciasSinDeclarar = (src, nombre, usados) => {
  const ini = src.indexOf(`const ${nombre} = useCallback(`);
  const fin = ini < 0 ? -1 : src.indexOf('\n  }, [', ini);
  if (fin < 0) return [...usados];
  const cuerpo = src.slice(ini, fin);
  const declaradas = src.slice(fin + '\n  }, ['.length, src.indexOf(']);', fin)).split(',').map((x) => x.trim()).filter(Boolean);
  return usados.filter((u) => new RegExp(`\\b${u}\\b`).test(cuerpo) && !declaradas.includes(u));
};
const USADOS_AL_CREAR = ['prompt', 'ajustes', 'user', 'navigation', 't'];
const sinDeclarar = dependenciasSinDeclarar(codigo, 'alCrear', USADOS_AL_CREAR);
check('C10) `alCrear` declara en sus dependencias todo lo que lee (la idea, los ajustes, la sesión, la navegación y el traductor): nunca manda lo de antes',
  sinDeclarar.length === 0 && /const alCrear = useCallback/.test(codigo), sinDeclarar.join(', ') || 'completas');

/* CONTROLES: cada detector tiene que morder. */
check('CONTROL: un temporizador de demostración, un aviso de demostración o un `ocupado=` se verían',
  hayTemporizador("setTimeout(() => setEstado('listo'), 1600)") && hayDemostracion('<AvisoDeCreacion estado={estado} />') && hayDemostracion('<X ocupado={estado === 1} />')
  && !hayTemporizador("navigation.navigate('CreatorFlow', contexto)") && !hayDemostracion("navigation.navigate('CreatorFlow', contexto)"),
  'si esto pasara, C4 y A14 no protegerían nada');
check('CONTROL: un preset, una foto o un trabajo en el contexto se verían',
  llevaEstructura("{ presets: [{ questionId: 'what', optionId: que }] }") && llevaEstructura('{ imageUri: foto }') && llevaEstructura('{ adjuntos }') && llevaEstructura('{ creative }')
  && !llevaEstructura("{ goal: texto }"), 'si esto pasara, C3 no protegería nada');
check('CONTROL: el `jobId` de reabrir una creación solo se perdona DENTRO de `alAbrirCreacion`: en `alCrear` se vería',
  !llevaEstructura(sinReabrirCreaciones('const alAbrirCreacion = useCallback((id) => {\n    navigate("CreatorFlow", { experienceId, jobId: id });\n  }, [navigation]);'))
  && llevaEstructura(sinReabrirCreaciones('const alCrear = useCallback(() => {\n    navigate("CreatorFlow", { goal, jobId: id });\n  }, [navigation]);')),
  'si esto pasara, C3 perdonaría un trabajo en el contexto de crear');
check('CONTROL: una llamada a Credits, a un servicio o a Firebase se vería',
  llamaPorSuCuenta('await spendCredits({ jobId })') && llamaPorSuCuenta("import { creatorService } from '../services/creatorService'") && llamaPorSuCuenta("from 'firebase/functions'")
  && !llamaPorSuCuenta("navigation.navigate('CreatorFlow', contexto)"), 'si esto pasara, C5 no protegería nada');
check('CONTROL: mencionar la referencia funcional se vería (I17)',
  sabeDeLaReferencia("import { x } from '../utils/designReferencia'") && sabeDeLaReferencia('<DesignReferenciaScreen />') && !sabeDeLaReferencia("import { contextoDeDesign } from '../utils/contextoDeDesign'"),
  'si esto pasara, C6 no protegería nada');
check('CONTROL: una dependencia que falte en `alCrear` se vería',
  dependenciasSinDeclarar(['const alCrear = useCallback(() => {', '    const c = { prompt, ajustes };', '  }, [prompt]);'].join('\n'), 'alCrear', ['prompt', 'ajustes']).join() === 'ajustes'
  && dependenciasSinDeclarar(['const alCrear = useCallback(() => {', '    const c = { prompt, ajustes };', '  }, [prompt, ajustes]);'].join('\n'), 'alCrear', ['prompt', 'ajustes']).length === 0,
  'si esto pasara, C10 no protegería nada');
check('CONTROL: un contexto armado a mano con la experiencia se vería (salvo dentro de `alAbrirCreacion`, que reabre un trabajo ya hecho)',
  /experienceId\s*:/.test("const c = { experienceId: 'design', goal }") && !/experienceId\s*:/.test('const contexto = contextoDeDesign({ intencion })')
  && /experienceId\s*:/.test(sinReabrirCreaciones('const alCrear = useCallback(() => {\n    navigate("CreatorFlow", { experienceId: "design", goal });\n  }, [navigation]);'))
  && !/experienceId\s*:/.test(sinReabrirCreaciones('const alAbrirCreacion = useCallback((id) => {\n    navigate("CreatorFlow", { experienceId: "design", jobId: id });\n  }, [navigation]);')),
  'si esto pasara, C2 no protegería nada');

console.log('\n─── D. El contrato con la experiencia común y con el servidor ───');

const flujo = leer('screens/CreatorFlowScreen.tsx');
const servicio = sinComentarios(leer('services/creatorService.ts'));
check('D1) CreatorFlow elige la experiencia por `params.experienceId` y arranca la conversación con `params.goal`',
  /getExperienceById\(params\.experienceId \|\| ''\)/.test(flujo) && /start\(params\.goal\)/.test(flujo));
/*
 * Lo que `creatorService.start` manda al servidor. Se lee el cuerpo de la llamada y se pide lo que el puente necesita (la
 * experiencia, el objetivo y el idioma) y que `workspace` NO sea una de sus claves —así sigue siendo solo transporte—. No se
 * exige que sean las ÚNICAS: otra tarea puede añadir `projectId` (CL-20) sin que esta comprobación tenga que enterarse.
 */
const cuerpoDeStart = (servicio.match(/start:[\s\S]*?call<ChatResponse>\('creatorChat', \{([\s\S]*?)\n    \}\),/) || [])[1] ?? '';
check('D2) al empezar, el cliente manda al servidor la experiencia, el objetivo y el idioma, y `workspace` no es una de sus claves (solo transporte)',
  /\bexperienceId\b/.test(cuerpoDeStart) && /\bgoal: goal \|\| ''/.test(cuerpoDeStart) && /\blocale\b/.test(cuerpoDeStart) && !/\bworkspace\b/.test(cuerpoDeStart),
  cuerpoDeStart.replace(/\s+/g, ' ').trim().slice(0, 140) || 'no encuentro la llamada');
check('CONTROL: un `workspace` o un objetivo que no se manda se verían en ese cuerpo',
  !/\bworkspace\b/.test('experienceId, goal: goal || \'\', locale,') && /\bworkspace\b/.test('experienceId, workspace, goal: goal || \'\', locale,') && !/\bgoal: goal \|\| ''/.test('experienceId, locale,'),
  'si esto pasara, D2 no protegería nada');
const registro = base('constants/weeExperiences.ts');
const espacios = base('constants/weeWorkspaces.ts');
check('D3) la experiencia `design` existe en el registro de la app y vive en el lugar de trabajo `design`',
  !!registro.getExperienceById('design') && espacios.workspaceDe('design') === 'design' && espacios.workspaceDe('home') === 'design');
const plantillas = intentar(() => requerir(path.resolve(RAIZ, 'functions/lib/creator/templates.js')), null);
check('D3) y existe su plantilla en el servidor compilado, con su objetivo por defecto para una caja sin idea',
  !!plantillas?.TEMPLATES?.design && typeof plantillas.TEMPLATES.design.defaultGoal === 'string' && plantillas.TEMPLATES.design.defaultGoal.length > 0,
  plantillas ? `defaultGoal «${plantillas.TEMPLATES.design.defaultGoal}»` : 'falta functions/lib compilado');
check('D4) lo que la pantalla manda es lo que arma el contexto compartido con la referencia: mismo resultado para la misma idea y los mismos ajustes',
  (() => {
    const e = pantalla();
    escribir(e, IDEA);
    e.capturas.AjustesContextuales.onElegir('style', 'minimal');
    e.dibujar();
    crear(e);
    return e.navegacion.length === 1 && igual(e.navegacion[0][2], REF.contextoDeDesign({ intencion: 'crear', texto: IDEA, ajustesEnPalabras: tEs('design.valMinimal') }));
  })());

check('D5) el documento que la pantalla cita existe, dice qué presupone (D1, D2 y D7) y no marca ninguna decisión como tomada',
  (() => {
    const ruta = path.resolve(RAIZ, 'docs/WEE-DESIGN-PUENTE.md');
    if (!fs.existsSync(ruta)) return false;
    const doc = fs.readFileSync(ruta, 'utf8');
    return /\bD1\b/.test(doc) && /\bD2\b/.test(doc) && /\bD7\b/.test(doc) && !/DECID[IÍ]D[AO]/i.test(doc);
  })());

globalThis.setTimeout = setTimeoutReal;
globalThis.clearTimeout = clearTimeoutReal;
console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\n«Crear» de Weë Design llega a CreatorFlow con lo escrito y los ajustes en palabras, y nada más');
process.exit(failures ? 1 : 0);
