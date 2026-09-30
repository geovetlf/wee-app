/*
 * BUSCAR, CREAR Y DEJAR COMUNIDADES (fase 5L).
 *
 * La pantalla entró en esta fase por una línea —un rótulo que decía "Mis
 * comunidades" mientras la clave llevaba tiempo escrita sin usar— y resultó
 * tener veintiuna: la cabecera, el buscador, los tres rótulos, la insignia de
 * oficial, el contador de miembros, los dos estados del botón, el diálogo de
 * salir entero, los tres avisos de error, y todo el formulario de crear.
 *
 * TRES COSAS QUE ESTA PRUEBA DEFIENDE Y NO SON OBVIAS:
 *
 *   · EL NOMBRE DE UNA COMUNIDAD LO ESCRIBIÓ UNA PERSONA. Aparece en el
 *     diálogo de salir y en la descripción que se guarda al crearla: entra por
 *     hueco y sale sin tocar, en los dos idiomas;
 *
 *   · LA DESCRIPCIÓN POR DEFECTO SE GUARDA. Si quien crea una comunidad no
 *     escribe ninguna, Weë compone "Comunidad de X" y eso QUEDA EN FIRESTORE.
 *     Se traduce la plantilla, no lo ya guardado: las comunidades que existen
 *     conservan su descripción, que es suya;
 *
 *   · EL CONTADOR DE MIEMBROS USA PLURALES DE VERDAD. Antes era un ternario.
 *
 * Se usa el traductor de verdad de Weë, como en `i18n-polls.test.mjs`.
 */
import fs from 'node:fs';
import { textosDe, traductorDe } from './i18n-ayuda.mjs';

const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const soloCodigo = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
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

const CRUDO = leer('screens/CommunitiesManagementScreen.tsx');
const PANTALLA = soloCodigo(CRUDO);

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · "Mis comunidades", y las veinte que venían con ella ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 1 y 2 · El leak que abrió la fase. */
  check('1) "Mis comunidades" ya no está escrito a mano', !/'Mis comunidades'/.test(PANTALLA));
  check('2) y sale de settings.myCommunities, la clave que ya existía',
    /renderSectionHeader\(t\('settings\.myCommunities'\), \(item as any\)\.count as number\)/.test(PANTALLA));

  /* 3, 4, 5 y 6 · La clave y sus dos idiomas. */
  check('3) existe en español', !!esT.settings?.myCommunities);
  check('4) y en inglés', !!enT.settings?.myCommunities);
  check('5) en español: ' + ES('settings.myCommunities'), ES('settings.myCommunities') === 'Mis comunidades');
  check('6) en inglés: ' + EN('settings.myCommunities'), EN('settings.myCommunities') === 'My communities');

  /* 7 · Sin duplicar: no se creó una gemela en el módulo nuevo. */
  check('7) no se creó una gemela en communities',
    !esT.communities?.myCommunities && !esT.communities?.mineSection
    && Object.values(esT).filter((m) => Object.values(m).includes('Mis comunidades')).length === 1);

  /*
   * 8 · Y ninguna de las otras veinte sigue escrita a mano. Los `console.error`
   * y los nombres de ruta —'Register', 'Feed'— no cuentan: son técnicos.
   */
  const FRASES = ['Comunidades\n', "'Crear comunidad'", '"Crear comunidad"', 'Buscar comunidades...',
    'Cargando comunidades', 'Comunidades unidas', 'Descubrir comunidades', '>Oficial<', "'miembro'", "'miembros'",
    "'Unido'", "'Unirse'", 'Salir de comunidad', '¿Estás seguro de que quieres salir',
    "'Cancelar'", "text: 'Salir'", 'No se pudo salir de la comunidad', 'No se pudo completar la acción',
    'Nueva comunidad', '>Crear<', '>Nombre<', 'Ej: Amantes del café', '>Descripción<',
    '¿De qué trata esta comunidad?', 'No se pudo crear la comunidad', 'Comunidad de $', 'No hay comunidades disponibles'];
  const quedan = FRASES.filter((f) => PANTALLA.includes(f));
  check('8) ninguna de las 27 frases sigue en la pantalla', quedan.length === 0, quedan.join(' | '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Cada pieza, con su clave ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const PIEZAS = [
    ['la cabecera', /\{t\('menu\.communities'\)\}/],
    ['el buscador', /placeholder=\{t\('communities\.searchPlaceholder'\)\}/],
    ['el estado de carga', /\{t\('communities\.loading'\)\}/],
    ['el estado vacío', /\{t\('communities\.empty'\)\}/],
    ['los otros dos rótulos', /t\('communities\.joinedSection'\)[\s\S]{0,220}t\('communities\.discoverSection'\)/],
    ['la insignia de oficial', /\{t\('communities\.official'\)\}/],
    ['el contador de miembros', /\{t\('communities\.members', \{ contador: item\.memberCount \}\)\}/],
    ['los dos estados del botón', /\{t\(isJoined \? 'communities\.memberOf' : 'communities\.join'\)\}/],
    ['el título de la modal', /\{t\('communities\.newCommunity'\)\}/],
    ['los dos campos', /\{t\('communities\.name'\)\}[\s\S]{0,220}t\('communities\.namePlaceholder'\)/],
    ['la descripción', /\{t\('communities\.description'\)\}[\s\S]{0,260}t\('communities\.descriptionPlaceholder'\)/],
  ];
  for (const [nombre, patron] of PIEZAS) check(`9) ${nombre} sale de su clave`, patron.test(PANTALLA));

  /* Los botones que reutilizan claves de otros módulos. */
  check('9) y "Crear" reutiliza nav.create, sin duplicar',
    /<Text style=\{styles\.modalHeaderBtnText\}>\{t\('nav\.create'\)\}<\/Text>/.test(PANTALLA)
    && !esT.communities?.createButton);
  check('9) y "Crear comunidad" es la etiqueta del botón de la cabecera',
    /accessibilityLabel=\{t\('communities\.create'\)\}/.test(PANTALLA));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · El diálogo de salir y los tres avisos ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * 15 · La pantalla NO usa `confirmAction`: arma su propio `Alert.alert` de
   * tres botones. Eso no cambia —sería un refactor—; lo que cambia es de dónde
   * salen sus palabras. `Cancelar` reutiliza `common.cancel`.
   */
  check('15) el diálogo de salir usa i18n y conserva su forma',
    /Alert\.alert\(\s*\n\s*t\('communities\.leaveTitle'\),\s*\n\s*t\('communities\.leaveConfirm', \{ nombre: community\.name \}\),/.test(PANTALLA)
    && /\{ text: t\('common\.cancel'\), style: 'cancel', onPress: \(\) => setJoiningCommunity\(null\) \}/.test(PANTALLA)
    && /text: t\('communities\.leave'\),\s*\n\s*style: 'destructive',/.test(PANTALLA));

  check('15) y los tres avisos de error reutilizan common.error',
    (PANTALLA.match(/Alert\.alert\(t\('common\.error'\)/g) || []).length === 3
    && /t\('communities\.leaveFailed'\)/.test(PANTALLA)
    && /t\('communities\.actionFailed'\)/.test(PANTALLA)
    && /Alert\.alert\(t\('common\.error'\), t\('communities\.createFailed'\)\)/.test(PANTALLA));

  /* El error técnico va al registro; la persona ve la frase de Weë (cierre de F11: antes mandaba `e.message`). */
  check('15) el error técnico queda en el registro y la persona ve la frase de Weë',
    /console\.error\('Error creando la comunidad:', e\);/.test(PANTALLA) && !/e\.message \|\|/.test(PANTALLA));

  /* Lo que se lee, en los dos idiomas. */
  check('15) en español: ' + [ES('communities.leaveTitle'), ES('communities.leave'), ES('common.cancel')].join(' · '),
    ES('communities.leaveTitle') === 'Salir de comunidad' && ES('communities.leave') === 'Salir');
  check('15) en inglés: ' + [EN('communities.leaveTitle'), EN('communities.leave'), EN('common.cancel')].join(' · '),
    EN('communities.leaveTitle') === 'Leave community' && EN('communities.leave') === 'Leave');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Los nombres de las comunidades no se traducen ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * 11 y 12 · Se prueba con lo que de verdad escribe la gente, incluido algo
   * que parece una clave y algo con comillas dentro.
   */
  const NOMBRES = ['Weë Filmmakers', 'Amantes del café', 'Coffee lovers', '100% Gamers', 'Join', '{{nombre}}'];
  const rotosSalir = NOMBRES.filter((n) =>
    !ES('communities.leaveConfirm', { nombre: n }).includes(`"${n}"`)
    || !EN('communities.leaveConfirm', { nombre: n }).includes(`"${n}"`));
  check('11) el nombre viaja intacto en el diálogo de salir', rotosSalir.length === 0, rotosSalir.join(' | '));
  const rotosDesc = NOMBRES.filter((n) =>
    !ES('communities.defaultDescription', { nombre: n }).includes(n)
    || !EN('communities.defaultDescription', { nombre: n }).includes(n));
  check('12) y en la descripción que se guarda', rotosDesc.length === 0, rotosDesc.join(' | '));
  check('12) ejemplo: ' + EN('communities.leaveConfirm', { nombre: 'Weë Filmmakers' }),
    EN('communities.leaveConfirm', { nombre: 'Weë Filmmakers' }) === 'Are you sure you want to leave "Weë Filmmakers"?');

  /* Y la pantalla los pinta crudos. */
  check('11) el nombre y la descripción de cada comunidad se pintan crudos',
    /\{item\.name\}/.test(PANTALLA) && /\{item\.description\}/.test(PANTALLA)
    && !/t\(item\.name\)|t\(item\.description\)/.test(PANTALLA));

  /* 13 · Las rutas y los registros técnicos, intactos. */
  check('13) las rutas y los console.error no se tradujeron',
    /'Register'/.test(PANTALLA) && /'Feed'/.test(PANTALLA)
    && /console\.error\('Error loading communities:'/.test(CRUDO)
    && !/t\('Register'\)|navigate\(t\(/.test(PANTALLA));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Plurales, accesibilidad y lo que no se movió ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 14 · El contador, por Intl y no por un ternario. */
  check('14) el contador de miembros usa plurales de verdad',
    ES('communities.members', { contador: 1 }) === '1 miembro'
    && ES('communities.members', { contador: 12 }) === '12 miembros'
    && EN('communities.members', { contador: 1 }) === '1 member'
    && EN('communities.members', { contador: 12 }) === '12 members',
    ES('communities.members', { contador: 1 }) + ' / ' + EN('communities.members', { contador: 12 }));
  check('14) y ya no queda el ternario', !/memberCount === 1 \?/.test(PANTALLA));

  /*
   * 9 y 10 · La pantalla tenía UNA etiqueta de accesibilidad y sigue teniendo
   * una: la del botón de crear. No se añadió ninguna.
   */
  check('9) la única etiqueta de accesibilidad está traducida',
    /accessibilityLabel=\{t\('communities\.create'\)\}/.test(PANTALLA));
  check('10) y no se añadió ninguna nueva',
    (CRUDO.match(/accessibilityLabel=/g) || []).length === 1
    && (CRUDO.match(/accessibilityHint=/g) || []).length === 0);

  /* 16 y 17 · La lógica y la navegación, donde estaban. */
  check('16) la lógica de comunidades no cambió',
    /await communityService\.leaveCommunity\(user\.uid, community\.id!\)/.test(PANTALLA)
    && /await communityService\.joinCommunity\(user\.uid, communityId\)/.test(PANTALLA)
    && /await communityService\.createCommunity\(\{/.test(PANTALLA)
    && /updateLocalProfile\(\{ joinedCommunities: newJoined \}\)/.test(PANTALLA));
  check('16) ni los límites del formulario, ni el auto-join',
    /maxLength=\{40\}/.test(PANTALLA) && /maxLength=\{200\}/.test(PANTALLA)
    && /disabled=\{!newName\.trim\(\) \|\| creating\}/.test(PANTALLA));
  check('17) y la navegación tampoco',
    /navigation\.goBack\(\)/.test(PANTALLA) && /setShowCreateModal\(true\)/.test(PANTALLA));

  /* 18 · Un solo sistema de traducción. */
  check('18) sin traductores propios ni ternarios de idioma',
    !/i18next|react-intl|idioma === 'en'|locale === 'en'/.test(PANTALLA)
    && /import \{ useT \} from '\.\.\/contexts\/IdiomaContext';/.test(CRUDO) && /const t = useT\(\);/.test(PANTALLA));
  check('18) y el módulo está registrado en los dos índices',
    /import \{ communities \} from '\.\/communities';/.test(leer('i18n/textos/es/index.ts'))
    && /import \{ communities \} from '\.\/communities';/.test(leer('i18n/textos/en/index.ts'))
    && /^ {2}communities,$/m.test(leer('i18n/textos/es/index.ts'))
    && /^ {2}communities,$/m.test(leer('i18n/textos/en/index.ts')));

  /* 19 y 20 · El viaje de ida y de vuelta, con el módulo entero. */
  const CLAVES = Object.keys(esT.communities || {});
  /*
   * "Cuadrado" es que las dos listas sean LA MISMA, no que tengan un número
   * concreto: el módulo creció en la fase 5P con la entrada del Home. Se mira
   * en las dos direcciones, que es lo que de verdad protege.
   */
  check('19) el módulo está cuadrado en los dos idiomas',
    CLAVES.length >= 23
    && CLAVES.length === Object.keys(enT.communities || {}).length
    && CLAVES.every((k) => enT.communities[k])
    && Object.keys(enT.communities || {}).every((k) => esT.communities[k]), String(CLAVES.length));
  const vacias = CLAVES.filter((k) => !String(enT.communities[k] ?? '').trim());
  check('19) ninguna traducción inglesa está vacía', vacias.length === 0, vacias.join(' '));
  /*
   * "posts" se dice igual en los dos idiomas: es la palabra, no un olvido. La
   * lista es cerrada, así que cualquier OTRA coincidencia sigue siendo un fallo.
   */
  /* El contador de publicaciones de la cabecera de una comunidad dice «posts» por la misma razón. */
  const IGUALES = ['posts', 'postCount_one', 'postCount_other'];
  const iguales = CLAVES.filter((k) => esT.communities[k] === enT.communities[k]);
  check('20) ES → EN mueve todas salvo la que se dice igual',
    iguales.length === IGUALES.length && IGUALES.every((k) => iguales.includes(k)), iguales.join(' '));
  check('20) y EN → ES las devuelve',
    CLAVES.every((k) => ES(`communities.${k}`) === esT.communities[k] && EN(`communities.${k}`) === enT.communities[k]));
  const conAcento = CLAVES.filter((k) => /[áéíóúñ¿¡]/i.test(String(enT.communities[k]).replace(/Weë/g, '')));
  check('20) la inglesa está en inglés', conAcento.length === 0, conAcento.join(' '));

  /* CONTROL de fase: no se tocó nada de lo ya cerrado. */
  check('20) control: ni Configuración, ni notify, ni el perfil',
    /t\('settings\.locationOff'\)/.test(leer('screens/SettingsScreen.tsx'))
    && /confirmLabel: string,/.test(leer('utils/notify.ts'))
    && /t\('econtact\.acceptLabel', \{ lista: nombreLista \}\)/.test(leer('screens/UserProfileScreen.tsx')));
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
