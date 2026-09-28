/*
 * LAS DOS COLUMNAS DEL ESCRITORIO, EN EL IDIOMA DE QUIEN MIRA (fase 5C.1).
 *
 * EL CATÁLOGO GUARDABA LAS DOS COSAS Y LA BARRA LEÍA LA QUE NO ERA.
 *
 * `MENU_ITEM` lleva dos campos por opción: `clave`, que es lo que se pinta, y
 * `label`, el español que quedó ahí como documentación. El cajón del ☰ resuelve
 * la clave desde que se migró; la barra lateral del escritorio seguía pintando
 * el `label`, así que con la aplicación en inglés enseñaba "Comunidades",
 * "Guardados", "Configuración" y "Mis proyectos" —los mismos nombres que el
 * cajón sí traducía—. Dos menús que son el mismo menú, discrepando.
 *
 * La misma fuente, la misma lista, el mismo orden: lo único que cambia es cuál
 * de los dos campos se lee. Y lo que el catálogo NO tiene que traducir se queda
 * donde estaba: los emojis, los ids, `MENU_ITEM.creator.label` —que dice
 * "Weë AI" y es marca— y el nombre de la agenda, ËContact, que sale de la
 * identidad activa y también es marca.
 *
 * Se usa el traductor de verdad de Weë, como en `i18n-polls.test.mjs`.
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

const LATERAL = soloCodigo(leer('components/Sidebar.tsx'));
const DERECHA = soloCodigo(leer('components/RightSidebar.tsx'));
const CAJON = soloCodigo(leer('components/DrawerMenu.tsx'));
const CATALOGO = leer('constants/weeMenu.ts');

/* Las once opciones que la barra pinta con `<Opcion id=…>`. */
const IDS = [...LATERAL.matchAll(/<Opcion\s+id="([a-zA-Z]+)"/g)].map((m) => m[1]);

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · La barra lee la clave, no el español ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('1) la barra ya no pinta MENU_ITEM[id].label',
    !/label=\{label \?\? MENU_ITEM\[id\]\.label\}/.test(LATERAL)
    && !/MENU_ITEM\[id\]\.label/.test(LATERAL));
  check('2) la barra resuelve MENU_ITEM[id].clave con el traductor',
    /label=\{label \?\? t\(MENU_ITEM\[id\]\.clave\)\}/.test(LATERAL) && /const t = useT\(\);/.test(LATERAL));

  /* Y lo hace igual que el cajón: dos menús que son el mismo menú. */
  check('2) igual que el cajón del ☰', /t\(MENU_ITEM\[id\]\.clave\)/.test(CAJON));

  /* Eran once; la Fase 11 añadió «Mis creaciones» dentro de Weë Creator. La regla es la clave, no el número. */
  check('3) todas las opciones tienen clave en español',
    IDS.length >= 11 && IDS.every((id) => {
      const m = CATALOGO.match(new RegExp(`\\b${id}: \\{[^}]*clave: '([a-z]+)\\.([a-zA-Z]+)'`));
      return m && esT[m[1]]?.[m[2]];
    }), IDS.join(' '));
  check('4) y en inglés', IDS.every((id) => {
    const m = CATALOGO.match(new RegExp(`\\b${id}: \\{[^}]*clave: '([a-z]+)\\.([a-zA-Z]+)'`));
    return m && enT[m[1]]?.[m[2]];
  }));

  /*
   * LO QUE IMPORTA DE VERDAD: con la aplicación en inglés, ninguna opción de la
   * barra se queda diciendo el español del catálogo. Se compara contra el
   * `label` que el catálogo guarda, que es exactamente lo que se pintaba antes.
   */
  const enEspanol = IDS.map((id) => {
    const m = CATALOGO.match(new RegExp(`\\b${id}: \\{[^}]*clave: '([a-z]+)\\.([a-zA-Z]+)'[^}]*label: '([^']+)'`));
    if (!m) return null;
    const [, modulo, k, label] = m;
    /* Credits, ËContact, Weëls, WeeTalk y Weë AI son marca: dicen lo mismo a propósito. */
    const marca = /^(Credits|ËContact|ẄContact|Weëls|WeeTalk|Weë AI)$/.test(label);
    return !marca && EN(`${modulo}.${k}`) === label ? id : null;
  }).filter(Boolean);
  check('5) en inglés no queda ningún label español del catálogo', enEspanol.length === 0, enEspanol.join(' '));

  const enIngles = IDS.map((id) => {
    const m = CATALOGO.match(new RegExp(`\\b${id}: \\{[^}]*clave: '([a-z]+)\\.([a-zA-Z]+)'[^}]*label: '([^']+)'`));
    if (!m) return null;
    const [, modulo, k, label] = m;
    return ES(`${modulo}.${k}`) !== label ? `${id}:${ES(`${modulo}.${k}`)}≠${label}` : null;
  }).filter(Boolean);
  check('6) y en español dice exactamente lo que decía', enIngles.length === 0, enIngles.join(' '));

  /* Una muestra, escrita, de lo que se lee en cada idioma. */
  const muestra = (t) => ['menu.communities', 'menu.saved', 'menu.settings', 'menu.help', 'menu.projects']
    .map((k) => t(k)).join(' · ');
  check('6) en español: ' + muestra(ES), muestra(ES) === 'Comunidades · Guardados · Configuración · Ayuda · Mis proyectos');
  check('6) en inglés: ' + muestra(EN), muestra(EN) !== muestra(ES) && !/Comunidades|Guardados|Configuración/.test(muestra(EN)));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Los otros textos de la barra ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const pares = [
    ['7) Inicio', 'nav.home', 'Inicio', /label=\{t\('nav\.home'\)\}/],
    ['8) Buscar', 'nav.search', 'Buscar', /label=\{t\('nav\.search'\)\}/],
    ['9) PERFIL', 'menu.sectionProfile', 'PERFIL', /\{t\('menu\.sectionProfile'\)\}/],
    ['10) EXPLORA', 'menu.sectionExplore', 'EXPLORA', /\{t\('menu\.sectionExplore'\)\}/],
    ['11) Crear mi perfil Weë', 'menu.createWeeProfile', 'Crear mi perfil Weë', /t\('menu\.createWeeProfile'\)/],
  ];
  for (const [nombre, clave, español, patron] of pares) {
    check(`${nombre} sale de ${clave}`,
      patron.test(LATERAL) && ES(clave) === español && EN(clave) !== español,
      ES(clave) + ' / ' + EN(clave));
  }

  check('12) Ocultar / Ver especialistas sale de sus dos claves',
    /accessibilityLabel=\{t\(creatorOpen \? 'menu\.hideSpecialists' : 'menu\.showSpecialists'\)\}/.test(LATERAL)
    && ES('menu.hideSpecialists') === 'Ocultar especialistas' && ES('menu.showSpecialists') === 'Ver especialistas'
    && EN('menu.hideSpecialists') === 'Hide specialists' && EN('menu.showSpecialists') === 'Show specialists',
    EN('menu.hideSpecialists') + ' / ' + EN('menu.showSpecialists'));

  /* Y no queda ninguna de las siete escrita a mano. */
  const quedan = ['label="Inicio"', 'label="Buscar"', '>PERFIL<', '>EXPLORA<',
    "'Crear mi perfil Weë'", "'Ocultar especialistas'", "'Ver especialistas'"]
    .filter((f) => LATERAL.includes(f));
  check('12) ninguna de las siete sigue escrita a mano', quedan.length === 0, quedan.join(' '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · La columna derecha ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('13) el buscador usa la clave que ya existía',
    /placeholder=\{t\('weeai\.searchLabel'\)\}/.test(DERECHA)
    && /accessibilityLabel=\{t\('weeai\.searchLabel'\)\}/.test(DERECHA)
    && ES('weeai.searchLabel') === 'Buscar en Weë' && EN('weeai.searchLabel') === 'Search Weë',
    ES('weeai.searchLabel') + ' / ' + EN('weeai.searchLabel'));

  check('14) Términos usa menu.terms',
    /\{t\('menu\.terms'\)\}/.test(DERECHA) && ES('menu.terms') === 'Términos' && EN('menu.terms') === 'Terms');
  check('15) Privacidad usa menu.privacy',
    /\{t\('menu\.privacy'\)\}/.test(DERECHA) && ES('menu.privacy') === 'Privacidad' && EN('menu.privacy') === 'Privacy');

  const quedan = ['"Buscar en Weë"', '>Términos<', '>Privacidad<'].filter((f) => DERECHA.includes(f));
  check('15) ninguna de las tres sigue escrita a mano', quedan.length === 0, quedan.join(' '));

  /* Y lo de 5C sigue donde estaba, intacto. */
  check('15) lo que cerró 5C no se movió',
    /accessibilityLabel=\{t\('nav\.openWeeAi'\)\}/.test(DERECHA) && /\{t\('nav\.goToWeeAi'\)\}/.test(DERECHA)
    && /\{t\('nav\.weeAiQuestion'\)\}/.test(DERECHA) && /\{t\('nav\.weeAiPitch'\)\}/.test(DERECHA));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Ni claves duplicadas, ni catálogo tocado ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* Solo dos claves nuevas; el resto son las de siempre. */
  check('16) no se inventaron nav.signOut ni menu.create',
    !esT.nav?.signOut && !esT.menu?.create && !enT.nav?.signOut && !enT.menu?.create);
  check('16) ni un segundo "Términos" o "Buscar en Weë"',
    (Object.values(esT).filter((m) => Object.values(m).includes('Términos')).length) === 1
    && (Object.values(esT).filter((m) => Object.values(m).includes('Buscar en Weë')).length) === 1);

  /*
   * EL CATÁLOGO NO SE TOCA. Los ids, los emojis, los iconos, las claves y el
   * orden son los de antes, y el `label` sigue debajo como documentación.
   */
  check('17) los ids y los emojis del catálogo son los de siempre',
    /realProfile: \{ id: 'realProfile', icono: 'perfilReal', clave: 'menu\.realProfile', emoji: '👤', label: 'Perfil Real' \}/.test(CATALOGO)
    && /settings: \{ id: 'settings', icono: 'engranaje', clave: 'menu\.settings', emoji: '⚙️', label: 'Configuración' \}/.test(CATALOGO));
  check('17) y "Weë AI" sigue siendo marca, sin pasar por clave en la barra',
    /label=\{MENU_ITEM\.creator\.label\}/.test(LATERAL) && /creator: 'Weë AI'/.test(leer('i18n/textos/en/menu.ts')));

  check('18) las rutas de la barra no cambiaron',
    /navigation\.navigate\('WeeProfileCreation'\)/.test(LATERAL)
    && /navigation\.navigate\('EContact'\)/.test(LATERAL)
    && /navigation\.navigate\('SavedPosts'\)/.test(LATERAL)
    && /navigation\.navigate\('Settings'\)/.test(LATERAL)
    && /navigation\.navigate\('Help'\)/.test(LATERAL)
    && /navigation\.navigate\('Specialist', \{ id: exp\.id \}\)/.test(LATERAL));
  check('19) ni la lógica: sesión, identidad y pliegue siguen igual',
    /onPress=\{handleLogout\}/.test(LATERAL) && /onPress=\{requireLogin\}/.test(LATERAL)
    && /user \? goTab\('Profile'\) : requireLogin\(\)/.test(LATERAL)
    && /setCreatorOpen\(\(v\) => !v\)/.test(LATERAL) && /\{creatorOpen && \(/.test(LATERAL));
  /* Mismo orden de siempre; «Mis creaciones» (Fase 11) entra justo detrás de «Mis proyectos», dentro de Weë Creator. */
  check('19) y el orden de las opciones es el mismo',
    IDS.join(' ') === 'realProfile weeProfile credits econtact communities weels weetalk projects creations saved settings help',
    IDS.join(' '));

  /*
   * LO QUE VIENE DE LOS DATOS NO SE TRADUCE: el nombre de la agenda sale de la
   * identidad activa y los nombres de las experiencias son de Weë.
   */
  check('20) el nombre de la agenda sigue viniendo de la identidad activa',
    /<Opcion id="econtact" label=\{nombreLista\}/.test(LATERAL) && !/t\(nombreLista\)/.test(LATERAL));
  check('20) y los nombres de los especialistas se pintan crudos',
    /label=\{exp\.name\}/.test(LATERAL) && !/t\(exp\.name\)/.test(LATERAL));

  /* Nadie se montó un traductor propio ni un ternario de idioma. */
  check('20) sin sistemas paralelos ni ternarios de idioma',
    !/i18next|react-intl|idioma === 'en'|locale === 'en'/.test(LATERAL + DERECHA)
    && /from '\.\.\/contexts\/IdiomaContext'/.test(LATERAL) && /from '\.\.\/contexts\/IdiomaContext'/.test(DERECHA));
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
