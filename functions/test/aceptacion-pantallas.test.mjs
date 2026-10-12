/**
 * ACEPTACIÓN · LAS PANTALLAS DE WEË CHEF Y DE WEË DESIGN, TOCADAS COMO LAS TOCA UNA PERSONA.
 *
 * Catálogo y numeración de escenarios: `docs/WEE-ACEPTACION.md` (cada comprobación lleva el id del suyo).
 *
 * ── Qué es esto y qué no ────────────────────────────────────────────────────
 *
 * Las pruebas de pantalla que ya hay (`chef-weeai`, `cajas-weeai`, `ajustes-weeai`, `credits-weeai`) LEEN el código de
 * la pantalla y comprueban que tiene la forma acordada. Esta ejecuta el código de verdad: dibuja la pantalla con
 * `react-dom/server`, TOCA sus botones por su etiqueta accesible y mira a dónde navega, qué estado cambia y qué le
 * pasa a cada pieza. Es lo más cerca de «una persona pulsó» a lo que se puede llegar sin un navegador, y es el mismo
 * método de `filmmaker-ui.test.mjs` (el entorno está en `_pantallas.mjs`).
 *
 *   A · Weë Chef, entrar: las ocho funciones, en su orden, en español y en inglés; la cabecera y la caja.
 *   B · Weë Chef, elegir una función: las que abren la conversación (con su preset exacto), las que abren un panel, el
 *       gesto de atrás, y qué pasa sin sesión.
 *   C · Weë Chef, escribir y enviar: la idea, los ajustes de cocina (que viajan como palabras) y la foto.
 *   D · Weë Chef, «mis proyectos»: sin sesión, vacío, con trabajos y abrir uno.
 *   E · Weë Design, entrar y crear: lo que hace —y lo que NO hace— el botón de crear de la pantalla montada.
 *   F · Weë Design, las puertas: abrir, elegir un punto de partida, volver, y el gesto de atrás; ajustes y referencias.
 *
 * ── Lo que NO se prueba aquí ───────────────────────────────────────────────
 *
 * El aspecto (colores, tamaños, sombras), el desplazamiento, el teclado, los gestos reales, la web de verdad, ni nada
 * que dependa de un motor de renderizado. Eso es de un navegador o de un dispositivo (ver el catálogo, «requiere (d)»).
 *
 * Las piezas COMPARTIDAS de Weë AI (la caja de escribir, la cabecera, la hoja de ajustes) se sustituyen por dobles que
 * apuntan con qué propiedades las monta la pantalla: lo que cada una hace por dentro ya lo vigilan sus propias suites.
 * Weë Design se prueba contra el CONTRATO con sus piezas (qué le pasa a cada una), no contra su marcado: si otra tarea
 * cambia cómo se dibujan, esta suite sigue siendo cierta mientras se sigan hablando igual. Las tres piezas propias de
 * Weë Chef (las funciones, los paneles y «mis proyectos») sí se cargan de verdad: son parte de lo que la persona ve.
 *
 * Sin red, sin emulador. Unos 5 s.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { crearComprobador } from './_aceptacion.mjs';
import { crearEntorno } from './_pantallas.mjs';
import { crearCargador, leer } from './filmmaker-cliente.mjs';

const { check, hueco, titulo, aviso, terminar } = crearComprobador();
const aqui = path.dirname(fileURLToPath(import.meta.url));
/** El servidor compilado: aquí solo se lee su plantilla de Chef, que es pura (no abre Firestore ni llama a nadie). */
const lib = (p) => createRequire(import.meta.url)(path.resolve(aqui, '../lib', p));

/* El traductor y las constantes de VERDAD, para saber qué debería salir. */
const base = crearCargador({ dobles: { 'react-native': { Platform: { OS: 'android', select: (o) => o.android ?? o.default }, Dimensions: { get: () => ({ width: 390, height: 800 }) } } } });
const { crearTraductor } = base('i18n/traducir.ts');
const DICCIONARIOS = { es: base('i18n/textos/es/index.ts').es, en: base('i18n/textos/en/index.ts').en };
const formatoReal = base('i18n/formato.ts');
const traductorDe = (idioma) => crearTraductor(idioma, DICCIONARIOS, {});
const formatoDe = (idioma) => ({ numero: (v, o) => formatoReal.formatearNumero(v, idioma, o), lista: (c, tipo) => formatoReal.formatearLista(c, idioma, tipo) });
const CHEF = base('constants/chefTools.ts');
const DESIGN = base('constants/designTools.ts');
const tEs = traductorDe('es');

/* ── Lo que comparten las dos pantallas: temas, idioma, sesión y tamaño ── */
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

/* ── Los dobles de Weë Chef: las tres piezas propias se cargan de VERDAD; las comunes de Weë AI se capturan ── */
const doblesDeChef = (idioma) => (ctx) => {
  const { h: hh, capturar, Toque, trabajos, consultasDeTrabajos } = ctx;
  return {
    ...comunes(idioma)(ctx),
    '../hooks/useEspecialista': { useEspecialista: () => ({ headline: 'La cocina, sin complicarte' }) },
    '../services/creatorService': { creatorService: { getMyJobsDe: async (uid, pertenece, cantidad, tamano) => { consultasDeTrabajos.push({ uid, cantidad, tamano }); return trabajos.filter(pertenece).slice(0, cantidad); } } },
    '../components/creator/CajaQueCrece': { PaginaDeCajas: capturar('PaginaDeCajas') },
    '../components/creator/CabeceraDeSeccion': capturar('CabeceraDeSeccion', (p) => hh('header', null, `${p.nombre} · ${p.lema} · ${p.descripcion}`)),
    '../components/creator/CajaDePrompt': capturar('CajaDePrompt', (p) => hh('div', { 'data-componente': 'CajaDePrompt' },
      hh('textarea', { 'aria-label': p.etiqueta, placeholder: p.placeholder, defaultValue: p.valor }),
      ...p.acciones.map((a) => hh(Toque, { key: a.etiqueta, accessibilityLabel: a.etiqueta, onPress: a.alPulsar }, a.icono)))),
    '../components/creator/AjustesContextuales': capturar('AjustesContextuales'),
    '../components/EspacioDeEscritura': capturar('EspacioDeEscritura'),
  };
};
const chef = (extra = {}) => crearEntorno({ pantalla: 'screens/ChefScreen.tsx', dobles: doblesDeChef(extra.idioma ?? 'es'), ...extra });

const trabajoDe = (id, experienceId, goal, status = 'done') => ({ id, userId: 'u1', experienceId, goal, status, questions: [], answers: [], plan: null, steps: [], results: [], progressText: '', creditsEstimated: 5, creditsCharged: 5, demo: true });

/* ═══ A · WEË CHEF: ENTRAR ════════════════════════════════════════════════ */
titulo('A · Weë Chef: entrar');
const chefEs = chef();
{
  const d = chefEs.dibujar();
  const titulos = CHEF.TARJETAS_DE_CHEF.map((tj) => tEs(tj.claveTitulo));
  const delOrden = d.botones.map((b) => b.etiqueta).filter((e) => titulos.includes(e));
  check('ACE-C-01 · la pantalla enseña las ocho funciones, con su nombre, en su orden', titulos.length === 8 && delOrden.join('|') === titulos.join('|'), delOrden.join(' · '));
  check('ACE-C-01 · la cabecera dice «Chef», su lema y su descripción', chefEs.capturas.CabeceraDeSeccion.nombre === 'Chef' && chefEs.capturas.CabeceraDeSeccion.descripcion === tEs('chef.description') && /sin complicarte/.test(d.texto));
  const caja = chefEs.capturas.CajaDePrompt;
  check('ACE-C-01 · la caja va VACÍA —sin frase dentro—, con su nombre para quien la escucha, y con los cinco controles en su orden',
    caja.valor === '' && caja.placeholder === '' && caja.etiqueta === tEs('chef.placeholder')
    && caja.acciones.map((a) => a.icono).join() === 'add,camera-outline,image-outline,mic-outline,options-outline', caja.acciones.map((a) => a.icono).join());
  check('ACE-C-01 · el botón de enviar se llama «Cocinar»', caja.etiquetaEnviar === tEs('chef.sendLabel') && /Cocinar/.test(caja.etiquetaEnviar));
  const mitad = (d.html.match(/data-ancho="50%"/g) || []).length;
  check('ACE-C-01 · en el teléfono, dos funciones por fila (cada hueco ocupa la mitad)', mitad === 8, `${mitad} huecos al 50 %`);
  check('ACE-C-01 · entrar no llama a nadie ni navega a ninguna parte', chefEs.navegacion.length === 0 && chefEs.consultasDeTrabajos.length === 0);
}
{
  /* El mismo Chef en inglés: ni una función se queda en español. */
  const chefEn = chef({ idioma: 'en' });
  const tEn = traductorDe('en');
  const d = chefEn.dibujar();
  const titulosEn = CHEF.TARJETAS_DE_CHEF.map((tj) => tEn(tj.claveTitulo));
  const etiquetas = d.botones.map((b) => b.etiqueta);
  check('ACE-C-20 · en inglés las ocho funciones salen en inglés (ninguna con su nombre en español)',
    titulosEn.every((x) => etiquetas.includes(x)) && !etiquetas.some((e) => /Sustituir|Información nutricional|Lista de compras|Ingredientes/i.test(e)), titulosEn.join(' · '));
  check('ACE-C-20 · y la caja y su botón también', chefEn.capturas.CajaDePrompt.etiqueta === tEn('chef.placeholder') && chefEn.capturas.CajaDePrompt.etiquetaEnviar === 'Cook');
}

/* ═══ B · WEË CHEF: ELEGIR UNA FUNCIÓN ════════════════════════════════════ */
titulo('B · Weë Chef: elegir una función');
{
  for (const tj of CHEF.TARJETAS_DE_CHEF.filter((x) => x.preset)) {
    chefEs.reiniciar();
    chefEs.tocar(tEs(tj.claveTitulo));
    const [paso] = chefEs.navegacion;
    check(`ACE-C-02 · «${tEs(tj.claveTitulo)}» abre la conversación de Weë Chef con su opción de siempre (${tj.preset.optionId})`,
      chefEs.navegacion.length === 1 && paso[0] === 'navigate' && paso[1] === 'CreatorFlow' && paso[2].experienceId === 'chef'
      && paso[2].preset.questionId === 'what' && paso[2].preset.optionId === tj.preset.optionId && paso[2].goal === undefined && paso[2].imageUri === undefined, JSON.stringify(paso));
  }
  /* Lo que viaja tiene que ser lo que el servidor entiende: el identificador de cada tarjeta es una opción REAL de su plantilla. */
  const { TEMPLATES } = lib('creator/templates.js');
  const preguntaDe = (id) => TEMPLATES.chef.questions.find((q) => q.id === id);
  check('ACE-C-02 · y la opción de cada una EXISTE en la plantilla de Chef del servidor (ese identificador viaja y está dentro de los trabajos ya guardados de la gente)',
    CHEF.TARJETAS_DE_CHEF.filter((x) => x.preset).every((tj) => !!preguntaDe(tj.preset.questionId)?.options.some((o) => o.id === tj.preset.optionId)),
    CHEF.TARJETAS_DE_CHEF.filter((x) => x.preset).map((tj) => tj.preset.optionId).join(' · '));
  /* Los tres paneles: no navegan, se abren dentro. */
  for (const tj of CHEF.TARJETAS_DE_CHEF.filter((x) => x.panel)) {
    chefEs.reiniciar();
    chefEs.tocar(tEs(tj.claveTitulo));
    const dentro = chefEs.dibujar();
    const entradas = CHEF.ENTRADAS_POR_PANEL[tj.panel].map((e) => tEs(e.clave));
    check(`ACE-C-03 · «${tEs(tj.claveTitulo)}» abre su panel DENTRO de la pantalla (no navega) con sus ${entradas.length} entradas y un volver`,
      chefEs.navegacion.length === 0 && entradas.every((x) => dentro.botones.some((b) => b.etiqueta === x)) && dentro.botones.some((b) => b.etiqueta === tEs('common.back'))
      && dentro.texto.includes(tEs(CHEF.CLAVE_DEL_PANEL[tj.panel])));
    chefEs.enfocar();
    const seQuedaElGesto = chefEs.atras();
    check('ACE-C-03 · y en Android el gesto de atrás cierra el panel antes de salir de la sección (la pantalla se queda el gesto y vuelve a las funciones)',
      seQuedaElGesto === true && chefEs.dibujar().botones.some((b) => b.etiqueta === tEs(CHEF.TARJETAS_DE_CHEF[0].claveTitulo)));
  }
  /* Elegir dentro de un panel vuelve a la caja con la frase empezada. */
  chefEs.reiniciar();
  chefEs.tocar(tEs('chef.swapTitle'));
  const lactosa = CHEF.ENTRADAS_POR_PANEL.swap.find((e) => e.id === 'lactose');
  chefEs.tocar(tEs(lactosa.clave));
  chefEs.dibujar();
  check('ACE-C-03 · elegir «sin lactosa» dentro de «Sustituir ingredientes» vuelve a la caja con la frase empezada, y sin navegar',
    chefEs.navegacion.length === 0 && chefEs.capturas.CajaDePrompt.valor === tEs('chef.panelStart', { panel: tEs('chef.swapTitle'), que: tEs(lactosa.clave) }) && chefEs.capturas.CajaDePrompt.valor.endsWith(': '),
    chefEs.capturas.CajaDePrompt.valor);
  chefEs.reiniciar();
  chefEs.tocar(tEs('chef.shoppingTitle'));
  chefEs.tocar(tEs('common.back'));
  chefEs.dibujar();
  check('ACE-C-03 · el volver del propio panel también lo cierra, sin perder la caja', !!chefEs.capturas.CajaDePrompt && chefEs.capturas.CajaDePrompt.valor === '' && chefEs.navegacion.length === 0);
  chefEs.reiniciar();
  chefEs.dibujar();
  chefEs.enfocar();
  check('ACE-C-03 · sin ningún panel abierto, el gesto de atrás NO se lo queda Weë Chef: sale de la sección como siempre', chefEs.atras() === undefined);
}
{
  const sinSesion = chef({ usuario: null });
  sinSesion.tocar(tEs('catalogo.chefAcRecipeTitle'));
  const sinSesion2 = chef({ usuario: null });
  sinSesion2.dibujar();
  sinSesion2.capturas.CajaDePrompt.onCambiar('Una cena');
  sinSesion2.dibujar();
  sinSesion2.capturas.CajaDePrompt.onEnviar();
  check('ACE-C-02 · sin haber entrado, elegir una función o enviar una idea lleva a entrar (Login), no a crear',
    sinSesion.navegacion.length === 1 && sinSesion.navegacion[0].join() === 'navigate,Login' && sinSesion2.navegacion.length === 1 && sinSesion2.navegacion[0].join() === 'navigate,Login');
}

/* ═══ C · WEË CHEF: ESCRIBIR, AJUSTES Y FOTO ══════════════════════════════ */
titulo('C · Weë Chef: escribir, ajustes y foto');
{
  chefEs.reiniciar();
  chefEs.dibujar();
  chefEs.capturas.CajaDePrompt.onEnviar();
  chefEs.capturas.CajaDePrompt.onCambiar('   ');
  chefEs.dibujar();
  chefEs.capturas.CajaDePrompt.onEnviar();
  check('ACE-C-04 · enviar con la caja vacía (o solo espacios) no hace nada: no navega ni crea', chefEs.navegacion.length === 0);

  chefEs.capturas.CajaDePrompt.onCambiar('Una cena para mis amigos');
  chefEs.dibujar();
  chefEs.capturas.CajaDePrompt.onEnviar();
  check('ACE-C-04 · una idea escrita abre la conversación con ESA idea como objetivo (sin ajustes, sin foto, sin preset)',
    chefEs.navegacion.length === 1 && chefEs.navegacion[0][1] === 'CreatorFlow' && chefEs.navegacion[0][2].experienceId === 'chef'
    && chefEs.navegacion[0][2].goal === 'Una cena para mis amigos' && chefEs.navegacion[0][2].preset === undefined && chefEs.navegacion[0][2].imageUri === undefined, JSON.stringify(chefEs.navegacion[0]));
}
{
  /* Los ajustes de cocina: se eligen sin gastar nada, se ven, se quitan de un toque y viajan como palabras. */
  chefEs.reiniciar();
  chefEs.dibujar();
  chefEs.tocar(tEs('chef.settingsLabel'));
  const abierta = chefEs.dibujar();
  check('ACE-C-04 · «ajustes» abre la hoja de ajustes de cocina (con los cuatro grupos: personas, tiempo, dieta y nivel) y no llama a nadie',
    chefEs.capturas.AjustesContextuales.visible === true && chefEs.capturas.AjustesContextuales.grupos.map((g) => g.id).join() === 'people,time,diet,level' && chefEs.navegacion.length === 0 && abierta.botones.length > 0);
  chefEs.capturas.AjustesContextuales.onElegir('diet', 'glutenFree');
  chefEs.capturas.AjustesContextuales.onElegir('people', 'auto');
  const sinGluten = tEs('chef.valGlutenFree');
  const conFicha = chefEs.dibujar();
  check('ACE-C-04 · lo elegido que decide algo se ve debajo de la caja como una ficha («Sin gluten»); lo que no decide («Las que sean») no se enseña',
    conFicha.botones.some((b) => b.etiqueta === sinGluten) && !conFicha.botones.some((b) => b.etiqueta === tEs('chef.valAnyone')));
  chefEs.capturas.CajaDePrompt.onCambiar('Un postre para el cumpleaños');
  chefEs.dibujar();
  chefEs.capturas.CajaDePrompt.onEnviar();
  const objetivoEnviado = chefEs.navegacion[0] && chefEs.navegacion[0][2].goal;
  check('ACE-C-04 · y al enviar viaja con la idea, y lo elegido viaja escrito con ella (la idea y la restricción, juntas en el objetivo)',
    chefEs.navegacion.length === 1 && chefEs.navegacion[0][1] === 'CreatorFlow' && typeof objetivoEnviado === 'string'
    && objetivoEnviado.includes('Un postre para el cumpleaños') && objetivoEnviado.includes(sinGluten), objetivoEnviado);
  /*
   * AISLADA a propósito. Esto es lo ÚNICO de esta suite que fija CÓMO se unen la idea y los ajustes: hoy, «idea (ajustes)», al
   * FINAL. Es justo lo que H `B-03 (i)` pide decidir (el servidor corta el objetivo a 300 y lo que va al final se pierde primero),
   * y G `D-CHEF-4` lo da por «integración incompleta». Cuando se decida, se INVIERTE solo esta comprobación; ninguna otra de las
   * cuatro suites depende del orden (la del servidor, `aceptacion-recorrido-servidor` F, mira solo que la restricción no se pierda).
   */
  check('BLOCKED — HUMAN DECISION (H B-03 i · G D-CHEF-4) · ACE-C-04 · HOY el objetivo es «idea (ajustes)», con la restricción AL FINAL entre paréntesis (interpolación de `chef.goalWith`)',
    objetivoEnviado === `Un postre para el cumpleaños (${sinGluten})`, objetivoEnviado);
  chefEs.olvidar();
  chefEs.tocar(sinGluten);
  chefEs.dibujar();
  chefEs.capturas.CajaDePrompt.onEnviar();
  check('ACE-C-04 · tocar la ficha la quita (vuelve a «las que sean»): lo que se envía ya no lleva la restricción',
    chefEs.navegacion.length === 1 && chefEs.navegacion[0][2].goal === 'Un postre para el cumpleaños', chefEs.navegacion[0] && chefEs.navegacion[0][2].goal);
  chefEs.reiniciar();
  chefEs.dibujar();
  chefEs.tocar(tEs('chef.voiceLabel'));
  check('ACE-C-04 · el micrófono NO finge dictar: avisa «próximamente» y no hace otra cosa', chefEs.avisos.join() === tEs('common.comingSoon') && chefEs.navegacion.length === 0, chefEs.avisos.join());
}
{
  /* La foto de lo que hay en la nevera. */
  const conFoto = chef({ fotos: { resultado: { canceled: false, assets: [{ uri: 'file:///nevera.jpg' }] } } });
  conFoto.dibujar();
  conFoto.tocar(tEs('chef.cameraLabel'));
  await conFoto.calma();
  const tras = conFoto.dibujar();
  check('ACE-C-05 · hacer una foto con la cámara la añade: aparece como ficha («Foto añadida») y la caja ya tiene la frase de siempre para esta foto',
    tras.botones.some((b) => b.etiqueta === tEs('chef.photoReady')) && conFoto.capturas.CajaDePrompt.valor === tEs('catalogo.chefAcIngredientsGoal'), conFoto.capturas.CajaDePrompt.valor);
  conFoto.capturas.CajaDePrompt.onEnviar();
  check('ACE-C-05 · una foto sola ya es una petición: enviar abre la conversación con la foto, y con la frase de siempre como objetivo',
    conFoto.navegacion.length === 1 && conFoto.navegacion[0][2].imageUri === 'file:///nevera.jpg' && conFoto.navegacion[0][2].goal === tEs('catalogo.chefAcIngredientsGoal'), JSON.stringify(conFoto.navegacion[0]));
  conFoto.tocar(tEs('chef.photoReady'));
  check('ACE-C-05 · y tocar la ficha de la foto la quita', !conFoto.dibujar().botones.some((b) => b.etiqueta === tEs('chef.photoReady')));

  const conTexto = chef({ fotos: { resultado: { canceled: false, assets: [{ uri: 'file:///plato.jpg' }] } } });
  conTexto.dibujar();
  conTexto.capturas.CajaDePrompt.onCambiar('Mejora la luz de mi plato');
  conTexto.dibujar();
  conTexto.tocar(tEs('chef.galleryLabel'));
  await conTexto.calma();
  conTexto.dibujar();
  check('ACE-C-05 · si ya había texto escrito, la foto NO lo pisa', conTexto.capturas.CajaDePrompt.valor === 'Mejora la luz de mi plato');

  const cancela = chef({ fotos: { resultado: { canceled: true } } });
  cancela.dibujar();
  cancela.tocar(tEs('chef.galleryLabel'));
  await cancela.calma();
  const sinPermiso = chef({ fotos: { permiso: false, resultado: { canceled: false, assets: [{ uri: 'x' }] } } });
  sinPermiso.dibujar();
  sinPermiso.tocar(tEs('chef.cameraLabel'));
  await sinPermiso.calma();
  check('ACE-C-05 · si se cancela el selector, o no se da permiso, no pasa nada: ni foto, ni texto, ni aviso de error',
    !cancela.dibujar().botones.some((b) => b.etiqueta === tEs('chef.photoReady')) && !sinPermiso.dibujar().botones.some((b) => b.etiqueta === tEs('chef.photoReady'))
    && cancela.capturas.CajaDePrompt.valor === '' && sinPermiso.avisos.length === 0 && cancela.avisos.length === 0);
}

/* ═══ D · WEË CHEF: MIS PROYECTOS ═════════════════════════════════════════ */
titulo('D · Weë Chef: «mis proyectos»');
{
  const sinSesion = chef({ usuario: null, trabajos: [trabajoDe('j1', 'chef', 'Una cena')] });
  sinSesion.dibujar();
  sinSesion.enfocar();
  await sinSesion.calma();
  check('ACE-C-16 · sin sesión no se pide nada a nadie y se ve el vacío', sinSesion.consultasDeTrabajos.length === 0 && sinSesion.dibujar().texto.includes(tEs('chef.projectsEmpty')));

  const vacio = chef({ trabajos: [] });
  vacio.dibujar();
  vacio.enfocar();
  await vacio.calma();
  const dv = vacio.dibujar();
  check('ACE-C-16 · sin trabajos: se dice con palabras («todavía no has cocinado nada») y con lo que pasará, sin inventar ejemplos',
    vacio.consultasDeTrabajos.length === 1 && dv.texto.includes(tEs('chef.projectsEmpty')) && dv.texto.includes(tEs('chef.projectsEmptyHint')));
  check('ACE-C-16 · y lo que pide es lo suyo: los trabajos de su cuenta, hasta ocho, en páginas de veinte',
    vacio.consultasDeTrabajos[0].uid === 'u1' && vacio.consultasDeTrabajos[0].cantidad === 8 && vacio.consultasDeTrabajos[0].tamano === 20);

  const trabajos = [
    trabajoDe('c1', 'chef', 'Lasaña vegetariana para cuatro'),
    trabajoDe('d1', 'design', 'Un logo para mi cafetería'),
    trabajoDe('c2', 'chef', 'Menú de la semana', 'running'),
    trabajoDe('c3', 'chef', 'Una receta que no salió', 'failed'),
  ];
  const lleno = chef({ trabajos });
  lleno.dibujar();
  lleno.enfocar();
  await lleno.calma();
  const dl = lleno.dibujar();
  check('ACE-C-16 · con trabajos se ven los de Chef (y solo los de Chef) con el estado de cada uno, y ya no se ve el vacío',
    dl.botones.some((b) => b.etiqueta === 'Lasaña vegetariana para cuatro') && dl.botones.some((b) => b.etiqueta === 'Menú de la semana') && !dl.botones.some((b) => b.etiqueta === 'Un logo para mi cafetería')
    && dl.texto.includes(tEs('weeai.jobRunning')) && dl.texto.includes(tEs('weeai.jobFailed')) && !dl.texto.includes(tEs('chef.projectsEmpty')));
  lleno.tocar('Menú de la semana');
  check('ACE-C-16 · abrir uno reabre ESE trabajo (con su experiencia y su id), sin crear otro',
    lleno.navegacion.length === 1 && lleno.navegacion[0][1] === 'CreatorFlow' && lleno.navegacion[0][2].jobId === 'c2' && lleno.navegacion[0][2].experienceId === 'chef' && lleno.navegacion[0][2].goal === undefined, JSON.stringify(lleno.navegacion[0]));
  lleno.olvidar();
  lleno.tocar(tEs('chef.seeAll'));
  check('ACE-C-16 · «Ver todos» lleva a Mis proyectos', lleno.navegacion.length === 1 && lleno.navegacion[0][1] === 'Projects');
}

/* ═══ E · WEË DESIGN: ENTRAR Y CREAR ══════════════════════════════════════ */
titulo('E · Weë Design: entrar y crear');
const doblesDeDesign = (idioma) => (ctx) => {
  const { h: hh, capturar } = ctx;
  return {
    ...comunes(idioma)(ctx),
    '../components/creator/CajaQueCrece': { PaginaDeCajas: capturar('PaginaDeCajas') },
    '../components/studio/StudioHeader': capturar('StudioHeader'),
    '../components/studio/StudioPromptComposer': capturar('StudioPromptComposer'),
    '../components/creator/AjustesContextuales': capturar('AjustesContextuales'),
    '../components/creator/AvisoDeCreacion': capturar('AvisoDeCreacion'),
    '../components/creator/FilaDeCreaciones': capturar('FilaDeCreaciones'),
    '../components/creator/FichaDeContexto': capturar('FichaDeContexto', (p) => hh('span', { 'data-ficha': p.texto }, p.texto)),
    '../components/EspacioDeEscritura': { __esModule: true, default: capturar('EspacioDeEscritura'), useAlturaDelTeclado: () => 0 },
    '../components/design/DesignExplore': capturar('DesignExplore'),
    '../components/design/DesignPanel': capturar('DesignPanel'),
  };
};
/* Los temporizadores de la pantalla se APUNTAN en vez de esperarse: así se sabe qué espera y se puede disparar sin reloj. */
const temporizadores = [];
const setTimeoutReal = globalThis.setTimeout;
const clearTimeoutReal = globalThis.clearTimeout;
globalThis.setTimeout = (fn, ms) => { temporizadores.push({ fn, ms }); return temporizadores.length; };
globalThis.clearTimeout = () => {};
const design = crearEntorno({ pantalla: 'screens/DesignScreen.tsx', dobles: doblesDeDesign('es') });
{
  design.dibujar();
  const c = design.capturas;
  check('ACE-D-01 · la pantalla de Design entrega su cabecera, su caja, sus puertas y su galería, y empieza «quieta» (nada creándose)',
    c.StudioHeader.nombre === 'Design' && c.StudioPromptComposer.valor === '' && c.StudioPromptComposer.placeholder === tEs('design.placeholder') && c.StudioPromptComposer.ocupado === false
    && !!c.DesignExplore && c.AvisoDeCreacion.estado === 'quieto' && c.FilaDeCreaciones.creaciones.length === 4 && !c.DesignPanel);
  check('ACE-D-01 · las puertas de la portada se abren con la puerta que se toca y «Ver todas» las enseña todas; la galería es de MUESTRA (sus títulos son claves, no contenido de nadie)',
    typeof c.DesignExplore.onAbrir === 'function' && typeof c.DesignExplore.onVerTodas === 'function' && c.FilaDeCreaciones.creaciones.every((x) => typeof x.claveTitulo === 'string'));
  check('ACE-D-01 · en el teléfono, dos puertas por fila', c.DesignExplore.porFila === 2, String(c.DesignExplore.porFila));
  check('ACE-D-01 · «Ver todas» (las creaciones) lleva a Mis proyectos', (c.FilaDeCreaciones.onVerTodas(), design.navegacion.some((n) => n[1] === 'Projects')));
}
{
  design.reiniciar();
  design.dibujar();
  design.capturas.StudioPromptComposer.onCrear();
  design.dibujar();
  check('ACE-D-06 · «Crear» con la caja vacía no hace nada: ni estado de «creando», ni temporizador, ni navegación',
    design.capturas.AvisoDeCreacion.estado === 'quieto' && temporizadores.length === 0 && design.navegacion.length === 0);
  design.capturas.StudioPromptComposer.onCambiar('Un yate de quince metros');
  design.dibujar();
  design.capturas.StudioPromptComposer.onCrear();
  design.dibujar();
  check('ACE-D-06 · «Crear» con una idea pasa a «creando» (la caja se queda ocupada y el aviso lo dice)',
    design.capturas.AvisoDeCreacion.estado === 'creando' && design.capturas.StudioPromptComposer.ocupado === true);
  const importaciones = leer('screens/DesignScreen.tsx').split('\n').filter((l) => /^import /.test(l)).join('\n');
  check('ACE-D-06 · y lo que espera es UN TEMPORIZADOR, no una respuesta del servidor: la pantalla ni siquiera importa un servicio, un hook de Credits ni Firebase',
    temporizadores.length === 1 && typeof temporizadores[0].fn === 'function' && !/services\/|useWallet|useBrain|firebase|creditsService/i.test(importaciones), `${importaciones.split('\n').length} importaciones`);
  temporizadores[0].fn();
  design.dibujar();
  check('ACE-D-06 · al vencer, pasa a «lista» sin resultado alguno: no hay ningún trabajo, ningún Credit movido ni ninguna navegación a CreatorFlow',
    design.capturas.AvisoDeCreacion.estado === 'listo' && design.navegacion.length === 0 && design.capturas.StudioPromptComposer.ocupado === false);
  design.capturas.AvisoDeCreacion.onCerrar();
  design.dibujar();
  check('ACE-D-06 · y el aviso se cierra tocándolo', design.capturas.AvisoDeCreacion.estado === 'quieto');
  hueco('ACE-D-06', 'BLOCKED — HUMAN DECISION (H B-01): el botón «Crear» de la pantalla montada de Weë Design crea de verdad: abre la conversación de Weë AI (CreatorFlow, experiencia «design») con lo escrito y lo elegido (hoy es una demostración con temporizador, y los ajustes y las referencias no viajan a ninguna parte)',
    design.navegacion.some((n) => n[1] === 'CreatorFlow'), 'ver docs/DESIGN.md §1 y la fase F2 (decisiones D1, D2 y D7 del dueño); H B-01; lo cierra la tarea F o el dueño, no esta');
}

/* ═══ F · WEË DESIGN: LAS PUERTAS ═════════════════════════════════════════ */
titulo('F · Weë Design: las puertas, los puntos de partida, el gesto de atrás, los ajustes y las referencias');
{
  design.reiniciar();
  design.dibujar();
  design.capturas.DesignExplore.onAbrir('interiors');
  design.dibujar();
  check('ACE-D-03 · abrir una puerta (Interiores) la pone a pantalla completa, y la portada deja de verse', design.capturas.DesignPanel.vista === 'interiors' && typeof design.capturas.DesignPanel.onElegirPunto === 'function' && !design.capturas.DesignExplore);
  const punto = DESIGN.PUERTAS_DE_DESIGN.find((p) => p.id === 'interiors').puntos[0];
  design.capturas.DesignPanel.onElegirPunto(punto);
  design.dibujar();
  check('ACE-D-03 · elegir un punto de partida vuelve a la portada y deja la idea EMPEZADA en la caja, para terminarla con palabras propias',
    design.capturas.DesignPanel === undefined && design.capturas.StudioPromptComposer.valor === `${tEs(punto.clave)} `, JSON.stringify(design.capturas.StudioPromptComposer.valor));
  design.capturas.StudioPromptComposer.onCambiar('Un salón con chimenea');
  design.dibujar();
  design.capturas.DesignExplore.onAbrir('vehicles');
  design.dibujar();
  design.capturas.DesignPanel.onElegirPunto(DESIGN.PUERTAS_DE_DESIGN.find((p) => p.id === 'vehicles').puntos[0]);
  design.dibujar();
  check('ACE-D-03 · y si ya había algo escrito, elegir un punto NO lo pisa', design.capturas.StudioPromptComposer.valor === 'Un salón con chimenea', design.capturas.StudioPromptComposer.valor);
}
{
  /* El camino: portada → «Ver todas» → una puerta; atrás deshace UN paso cada vez. */
  design.reiniciar();
  design.dibujar();
  design.capturas.DesignExplore.onVerTodas();
  design.dibujar();
  check('ACE-D-03 · «Ver todas» abre el catálogo completo de puertas', design.capturas.DesignPanel.vista === 'todas');
  design.capturas.DesignPanel.onAbrirCategoria('furniture');
  design.dibujar();
  check('ACE-D-03 · desde allí se entra en una puerta', design.capturas.DesignPanel.vista === 'furniture');
  design.enfocar();
  const primero = design.atras();
  design.dibujar();
  check('ACE-D-03 · en Android el gesto de atrás se lo queda Weë Design y deshace UN paso: de la puerta a «Ver todas»', primero === true && design.capturas.DesignPanel.vista === 'todas');
  design.enfocar();
  const segundo = design.atras();
  design.dibujar();
  check('ACE-D-03 · otro atrás: de «Ver todas» a la portada', segundo === true && design.capturas.DesignPanel === undefined);
  design.enfocar();
  check('ACE-D-03 · y desde la portada el gesto ya no se lo queda nadie: sale de la sección', design.atras() === undefined);
  design.capturas.StudioPromptComposer.onCambiar('Una butaca');
  design.dibujar();
  design.capturas.DesignExplore.onAbrir('product');
  design.dibujar();
  design.capturas.DesignPanel.onVolver();
  design.dibujar();
  check('ACE-D-03 · el «volver» de la propia puerta también deshace un paso y NO borra lo escrito', design.capturas.DesignPanel === undefined && design.capturas.StudioPromptComposer.valor === 'Una butaca');
}
{
  /* Ajustes y referencias: se ven, no cuestan nada, y (hoy) no viajan. */
  design.reiniciar();
  design.dibujar();
  design.capturas.StudioPromptComposer.onAjustes();
  design.dibujar();
  check('ACE-D-04 · «ajustes» abre la hoja con los cinco grupos de un diseño (estilo, materiales, luz, formato, calidad) sin llamar a nadie',
    design.capturas.AjustesContextuales.visible === true && design.capturas.AjustesContextuales.grupos.map((g) => g.id).join() === 'style,materials,lighting,format,quality' && design.navegacion.length === 0);
  design.capturas.AjustesContextuales.onElegir('style', 'minimal');
  design.dibujar();
  check('ACE-D-04 · lo elegido se queda marcado en la hoja mientras la pantalla vive', design.capturas.AjustesContextuales.elegido.style === 'minimal');
  design.capturas.AjustesContextuales.onCerrar();
  design.dibujar();
  check('ACE-D-04 · y cerrarla no cambia nada más', design.capturas.AjustesContextuales.visible === false && design.capturas.AjustesContextuales.elegido.style === 'minimal');
  design.capturas.StudioPromptComposer.onReferencia();
  design.dibujar();
  design.capturas.StudioPromptComposer.onReferencia();
  const conReferencias = design.dibujar();
  check('ACE-D-05 · añadir una referencia la deja a la vista como ficha, y se pueden añadir varias', (conReferencias.html.match(/data-ficha=/g) || []).length === 2 && design.capturas.AjustesContextuales.referencias === 2);
  aviso('OBSERVACIÓN ACE-D-05 (H B-03 iii): las referencias de la pantalla montada son nombres de MUESTRA (no hay selector de archivos) y el botón del micrófono (`onVoz`) está enganchado a la misma función: pulsar el micrófono también «añade una referencia». Es cosa de Weë Design (tarea F); aquí no se pina porque un arreglo local lo cambiaría con razón.');
}

globalThis.setTimeout = setTimeoutReal;
globalThis.clearTimeout = clearTimeoutReal;
terminar();
