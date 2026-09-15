/*
 * MOVERSE POR WEË EN EL IDIOMA DE QUIEN MIRA (fase 5C).
 *
 * Lo que queda de la navegación: las pastillas que acotan el muro, la etiqueta
 * que dice de dónde viene una publicación, la barra de abajo, la barra lateral
 * del escritorio y la columna derecha. Son los mandos de la casa —no contenido,
 * no datos—, y seguían escritos en español a mano.
 *
 * DOS COSAS QUE NO SE TRADUCEN Y AQUÍ SE DEFIENDEN:
 *
 *   · LOS NOMBRES DE WEË. Seis de las siete pastillas del muro son marca
 *     —WeeStudio, WeeTravel, WeeMusic, WeeChef, WeeDesign, WEEBusiness— y se
 *     escriben igual en todos los idiomas. Solo "Todo" es una palabra;
 *
 *   · LO QUE NOMBRA UNA ETIQUETA. `Ir a {{nombre}}` lleva el nombre de una
 *     comunidad o de una sección: entra por hueco y sale tal cual.
 *
 * Se usa el traductor de verdad de Weë, con sus diccionarios, como en
 * `i18n-polls.test.mjs`. Un traductor de mentira escondería justo lo que esto
 * tiene que encontrar.
 */
import fs from 'node:fs';
import { textosDe, traductorDe } from './i18n-ayuda.mjs';

const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const soloCodigo = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

let failures = 0;
const check = (name, cond, extra = '') => {
  if (cond) console.log(`✔ ${name}${extra ? ' — ' + extra : ''}`);
  else { failures++; console.log(`✘ ${name}${extra ? ' — ' + extra : ''}`); }
};

const ES = await traductorDe('es');
const EN = await traductorDe('en');
const esT = textosDe('es');
const enT = textosDe('en');

const F = {
  landing: 'screens/LandingScreen.tsx',
  web: 'screens/WebLandingScreen.tsx',
  tag: 'components/WeeTag.tsx',
  barra: 'components/BarraInferior.tsx',
  lateral: 'components/Sidebar.tsx',
  derecha: 'components/RightSidebar.tsx',
  filtros: 'utils/feedFilters.ts',
};
const C = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, soloCodigo(leer(p))]));

/* Las claves de esta fase: las nuevas y las que se reutilizan. */
const NUEVAS = {
  nav: ['goTo', 'weeNavigation', 'goHome', 'myProfile', 'openWeeAi', 'goToWeeAi', 'weeAiQuestion', 'weeAiPitch'],
  home: ['filterBy', 'filterAll'],
  menu: ['signIn'],
};
const REUTILIZADAS = { nav: ['create'], menu: ['signOut'] };

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Ninguna frase sigue escrita a mano ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('1) LandingScreen ya no escribe "Filtrar:"',
    !/Filtrar:/.test(C.landing) && /t\('home\.filterBy', \{ nombre: etiqueta \}\)/.test(C.landing));
  check('2) WebLandingScreen tampoco',
    !/Filtrar:/.test(C.web) && /t\('home\.filterBy', \{ nombre: etiqueta \}\)/.test(C.web));
  check('3) WeeTag ya no escribe "Ir a "',
    !/Ir a \$\{/.test(C.tag) && /t\('nav\.goTo', \{ nombre \}\)/.test(C.tag));
  check('4) la barra inferior ya no escribe "Navegación de Weë"',
    !/"Navegación de Weë"/.test(C.barra) && /t\('nav\.weeNavigation'\)/.test(C.barra));

  const enLateral = ['"Ir al inicio"', "'Ir a mi perfil'", '"Crear"', '>Crear<',
    '"Cerrar sesión"', '>Cerrar sesión<', "'Iniciar sesión'", '"Iniciar sesión"', '>Iniciar sesión<']
    .filter((f) => C.lateral.includes(f));
  check('5) la barra lateral ya no escribe ninguno de sus cinco', enLateral.length === 0, enLateral.join(' '));

  check('6) la columna derecha ya no escribe "Ir a WEË AI"',
    !/WEË AI/.test(C.derecha) && /t\('nav\.goToWeeAi'\)/.test(C.derecha));
  /* Y de paso deja de existir esa grafía: el sitio se llama "Weë AI". */
  check('6) y el nombre queda escrito "Weë AI"',
    esT.nav.goToWeeAi === 'Ir a Weë AI' && enT.nav.goToWeeAi === 'Go to Weë AI');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Las claves, en los dos idiomas ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const todas = Object.entries(NUEVAS).flatMap(([m, ks]) => ks.map((k) => [m, k]));
  const faltanEs = todas.filter(([m, k]) => !esT[m]?.[k]).map(([m, k]) => m + '.' + k);
  check('7) las 11 claves nuevas existen en español', faltanEs.length === 0, faltanEs.join(' '));
  const faltanEn = todas.filter(([m, k]) => !enT[m]?.[k]).map(([m, k]) => m + '.' + k);
  check('8) y en inglés', faltanEn.length === 0, faltanEn.join(' '));

  const vacias = todas.filter(([m, k]) => !String(enT[m]?.[k] ?? '').trim() || !String(esT[m]?.[k] ?? '').trim())
    .map(([m, k]) => m + '.' + k);
  check('9) ninguna traducción está vacía', vacias.length === 0, vacias.join(' '));

  const copiadas = todas.filter(([m, k]) => esT[m][k] === enT[m][k]).map(([m, k]) => m + '.' + k);
  check('9) y ninguna se quedó en español en el diccionario inglés', copiadas.length === 0, copiadas.join(' '));

  /* Las que se reutilizan tienen que seguir estando donde estaban. */
  const reut = Object.entries(REUTILIZADAS).flatMap(([m, ks]) => ks.map((k) => [m, k]));
  const rotas = reut.filter(([m, k]) => !esT[m]?.[k] || !enT[m]?.[k]).map(([m, k]) => m + '.' + k);
  check('10) las claves reutilizadas siguen existiendo', rotas.length === 0, rotas.join(' '));
  check('10) y no se duplicaron: "Crear" y "Cerrar sesión" salen de las de siempre',
    /t\('nav\.create'\)/.test(C.lateral) && /t\('menu\.signOut'\)/.test(C.lateral)
    /* `menu.create'` con la comilla: `menu.createWeeProfile` es otra clave y sí existe. */
    && !/nav\.signOut'|nav\.logout'|menu\.create'/.test(C.lateral));

  /* El inglés está en inglés, salvo la diéresis de la marca. */
  const conAcento = todas.filter(([m, k]) => /[áéíóúñ¿¡]/i.test(String(enT[m][k]).replace(/Weë|Weël|Weëls/g, '')))
    .map(([m, k]) => m + '.' + k);
  check('11) ninguna frase inglesa lleva tildes ni signos de apertura', conAcento.length === 0, conAcento.join(' '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Los huecos: lo de dentro no se traduce ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* El hueco existe en los dos idiomas o la cifra se pierde en uno. */
  for (const [m, k] of [['home', 'filterBy'], ['nav', 'goTo']]) {
    check(`12) ${m}.${k} lleva el hueco {{nombre}} en los dos`,
      /\{\{nombre\}\}/.test(esT[m][k]) && /\{\{nombre\}\}/.test(enT[m][k]),
      esT[m][k] + ' / ' + enT[m][k]);
  }

  /* Y el hueco se rellena de verdad, con lo que le den, sin tocarlo. */
  check('13) el filtro conserva el nombre de la sección, tal cual',
    ES('home.filterBy', { nombre: 'WeeStudio' }) === 'Filtrar: WeeStudio'
    && EN('home.filterBy', { nombre: 'WeeStudio' }) === 'Filter: WeeStudio',
    ES('home.filterBy', { nombre: 'WeeStudio' }) + ' / ' + EN('home.filterBy', { nombre: 'WeeStudio' }));

  check('14) la etiqueta conserva el nombre de la comunidad, tal cual',
    ES('nav.goTo', { nombre: 'Relaciones & Amor' }) === 'Ir a Relaciones & Amor'
    && EN('nav.goTo', { nombre: 'Relaciones & Amor' }) === 'Go to Relaciones & Amor',
    EN('nav.goTo', { nombre: 'Relaciones & Amor' }));

  check('14) y el de una sección de Weë, también',
    EN('nav.goTo', { nombre: 'Weë Travel' }) === 'Go to Weë Travel', EN('nav.goTo', { nombre: 'Weë Travel' }));

  /* Ningún hueco se queda sin rellenar ni se escapa una clave. */
  const rotos = ['Todo', 'WEEBusiness', 'Fotografía nocturna', 'Weë Studio']
    .flatMap((n) => [ES('home.filterBy', { nombre: n }), EN('home.filterBy', { nombre: n }),
      ES('nav.goTo', { nombre: n }), EN('nav.goTo', { nombre: n })])
    .filter((s) => /\{\{|home\.|nav\./.test(s));
  check('15) no se escapa ningún hueco ni ninguna clave', rotos.length === 0, rotos.join(' | '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · ES y EN, lo que se lee ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const fila = (t) => [t('nav.weeNavigation'), t('nav.goHome'), t('nav.myProfile'),
    t('nav.create'), t('menu.signIn'), t('menu.signOut'), t('nav.goToWeeAi'), t('home.filterAll')].join(' · ');

  check('16) en español: ' + fila(ES),
    fila(ES) === 'Navegación de Weë · Ir al inicio · Ir a mi perfil · Crear · Iniciar sesión · Cerrar sesión · Ir a Weë AI · Todo');
  check('17) en inglés: ' + fila(EN),
    fila(EN) === 'Weë navigation · Go to home · Go to my profile · Create · Sign in · Sign out · Go to Weë AI · All');

  /*
   * ES → EN y EN → ES: el mismo traductor con otro locale da otra frase, y
   * ninguna clave se queda a medias. Es lo que hace el cambio de idioma en
   * caliente, porque `t` se vuelve a pedir en cada render.
   */
  const claves = ['nav.weeNavigation', 'nav.goHome', 'nav.myProfile', 'nav.openWeeAi', 'nav.goToWeeAi',
    'nav.weeAiQuestion', 'nav.weeAiPitch', 'menu.signIn', 'menu.signOut', 'nav.create', 'home.filterAll'];
  const iguales = claves.filter((k) => ES(k) === EN(k));
  check('18) el cambio ES → EN mueve las once', iguales.length === 0, iguales.join(' '));
  check('19) y EN → ES las devuelve', claves.every((k) => ES(k) === esT[k.split('.')[0]][k.split('.')[1]]));

  /* La marca aguanta el viaje. */
  check('20) "Weë" sigue en pie en inglés',
    /Weë/.test(EN('nav.weeNavigation')) && /Weë AI/.test(EN('nav.goToWeeAi')) && /Weë/.test(EN('nav.weeAiPitch')),
    EN('nav.weeNavigation') + ' · ' + EN('nav.weeAiPitch'));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Las pastillas: marca fuera, interfaz dentro ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* Solo "Todo" guarda clave. Las otras seis son nombres y se copian. */
  check('21) solo la pastilla "Todo" lleva clave',
    (C.filtros.match(/clave: '/g) || []).length === 1
    && /\{ id: 'all', label: 'Todo', clave: 'home\.filterAll' \}/.test(C.filtros));
  /*
   * Y las seis marcas se copian tal cual, CON LA GRAFÍA APROBADA DE PRODUCTO:
   * con diéresis y separada (fase 5P). No se traducen —son nombres— pero sí se
   * escriben como Weë las escribe en todas partes.
   */
  check('21) y las seis marcas siguen escritas tal cual, con la grafía aprobada',
    ['Weë Studio', 'Weë Travel', 'Weë Music', 'Weë Chef', 'Weë Design', 'Weë Business']
      .every((n) => C.filtros.includes(`label: '${n}' }`)));
  check('21) y no queda ninguna de las viejas',
    !/WeeStudio|WeeTravel|WeeMusic|WeeChef|WeeDesign|WEEBusiness/.test(C.filtros));
  /* Los identificadores internos no se movieron: reparten el muro. */
  check('21) los identificadores internos siguen intactos',
    ['all', 'studio', 'travel', 'music', 'chef', 'design', 'business']
      .every((id) => C.filtros.includes(`{ id: '${id}'`)));

  /* Quien pinta resuelve; el catálogo no llama al traductor. */
  check('22) el catálogo no traduce: lo hace quien pinta',
    !/IdiomaContext|useT\(\)|\bt\('/.test(C.filtros)
    && /const etiqueta = f\.clave \? t\(f\.clave\) : f\.label;/.test(C.landing)
    && /const etiqueta = f\.clave \? t\(f\.clave\) : f\.label;/.test(C.web));

  /* CONTROL: ni los ids, ni el orden, ni el reparto cambiaron. */
  check('23) control: los ids y su orden son los de siempre',
    /'all' \| 'studio' \| 'travel' \| 'music' \| 'chef' \| 'design' \| 'business'/.test(C.filtros)
    && C.filtros.indexOf("id: 'studio'") < C.filtros.indexOf("id: 'business'"));
  check('23) control: el filtrado no se tocó',
    /export const estaActiva = \(elegidas: SeccionesElegidas, id: HomeSectionId\): boolean =>/.test(C.filtros)
    && /id === 'all' \? elegidas\.length === 0 : elegidas\.includes\(id\)/.test(C.filtros)
    && /if \(tocada === 'all'\) return \[\];/.test(C.filtros));
  check('24) control: tocar una pastilla sigue haciendo lo mismo',
    /onPress=\{\(\) => setFeedFilter\(\(elegidas\) => alternarSeccion\(elegidas, f\.id\)\)\}/.test(C.landing)
    && /onPress=\{\(\) => setFeedFilter\(\(elegidas\) => alternarSeccion\(elegidas, f\.id\)\)\}/.test(C.web));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · Nada más se movió ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* WeeTag: sigue siendo una etiqueta, con su destino y su recorte. */
  check('25) control: WeeTag navega y se recorta igual',
    /if \(!onPress\) \{/.test(C.tag) && /onPress=\{onPress\}/.test(C.tag)
    && /maxWidth: '55%'/.test(leer(F.tag)) && /numberOfLines=\{1\}/.test(C.tag));
  check('25) y el nombre se sigue pintando crudo', /\{nombre\}\s*<\/Text>/.test(C.tag) && !/t\(nombre\)/.test(C.tag));

  /* La barra inferior: mismos destinos, mismo orden, misma forma. */
  check('26) control: los cinco destinos y su orden no cambiaron',
    /'Home' \| 'Search' \| 'Create' \| 'Inbox' \| 'Notifications'/.test(C.barra)
    && C.barra.indexOf("id: 'Home'") < C.barra.indexOf("id: 'Notifications'"));
  check('26) y cada destino sigue diciendo si está puesto',
    /accessibilityLabel=\{activo \? `\$\{t\(destino\.clave\)\}, \$\{t\('nav\.current'\)\}` : t\(destino\.clave\)\}/.test(C.barra));

  /* La barra lateral: navegación, sesión y perfiles intactos. */
  check('27) control: la barra lateral navega igual',
    /onPress=\{\(\) => goHome\('Landing'\)\}/.test(C.lateral)
    && /navigation\.navigate\('WeeCreator'\)/.test(C.lateral)
    && /onPress=\{handleLogout\}/.test(C.lateral) && /onPress=\{requireLogin\}/.test(C.lateral));
  /* Del catálogo salen las DOS cosas de una opción: su dibujo y su clave de texto. */
  check('27) y sus opciones siguen saliendo de MENU_ITEM',
    /MENU_ITEM\[id\]\.icono/.test(C.lateral) && /t\(MENU_ITEM\[id\]\.clave\)/.test(C.lateral));

  /* La columna derecha: mismo destino, mismo pie. */
  check('28) control: la columna derecha sigue llevando a Weë AI',
    /onPress=\{\(\) => navigation\.navigate\('WeeCreator'\)\}/.test(C.derecha));

  /* Y ninguno de los seis se inventó un sistema de traducción propio. */
  const paralelos = Object.entries(C)
    .filter(([, s]) => /i18next|react-intl|LOCALES\s*=|TRADUCCIONES\s*=|idioma === 'en' \?/.test(s))
    .map(([k]) => k);
  check('29) nadie se montó un traductor propio', paralelos.length === 0, paralelos.join(' '));
  check('29) y todos piden el de siempre',
    ['tag', 'lateral', 'derecha'].every((k) => /from '\.\.\/contexts\/IdiomaContext'/.test(C[k])));

  /* CONTROL de fase: esto no tocó lo que ya estaba cerrado. */
  check('30) control: ni Composer, ni PostCard, ni encuestas, ni el tiempo relativo',
    !/getRelativeTime|pollView|textoVotos|CreateScreen|ComposerEntry/.test(
      C.tag + C.barra + C.lateral + C.derecha + C.filtros));
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
