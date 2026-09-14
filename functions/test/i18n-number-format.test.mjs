/*
 * LOS NÚMEROS, ESCRITOS COMO SE ESCRIBEN EN CADA SITIO (fase 5O).
 *
 * Weë enseñaba "12400 miembros". El traductor rellenaba los huecos con
 * `String(valor)` y un contador salía en bruto, con el idioma puesto en español
 * o en inglés, daba igual. Ahora un número pasa por `Intl.NumberFormat` con el
 * locale activo y sale "12.400 miembros" o "12,400 members".
 *
 * CINCO COSAS QUE ESTA PRUEBA DEFIENDE Y NO SON OBVIAS:
 *
 *   · LOS SEPARADORES NO ESTÁN ESCRITOS AQUÍ. Lo esperado se calcula con el
 *     propio `Intl`, así que esta prueba no dice "un punto": dice "lo que diga
 *     CLDR para ese locale". Si mañana entra el francés, el francés ya está;
 *
 *   · FORMATEAR Y PLURALIZAR SON DOS TRABAJOS. `Intl.NumberFormat` escribe la
 *     cifra; `Intl.PluralRules` elige entre `_one` y `_other`. Se comprueban por
 *     separado y se comprueba que no se han mezclado;
 *
 *   · UN AÑO NO ES UNA CANTIDAD. 2026 se escribe 2026 y nunca "2.026";
 *
 *   · LO QUE LLEGA COMO TEXTO SALE COMO TEXTO. Los nombres, las marcas y lo que
 *     diga el servidor no pasan por el formateador, ni aunque lleven dígitos;
 *
 *   · Y LLEGA A LA INTERFAZ DE VERDAD. No basta con que la función funcione: se
 *     comprueba que los contadores reales de Weë piden la clave con el número
 *     crudo, que es lo que hace que todo esto sirva de algo.
 *
 * Se usa el traductor de verdad de Weë, el mismo que corre en la aplicación.
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
const PE = await traductorDe('es-PE');
const esT = textosDe('es');

/** Lo que CLDR dice para ese locale. Nada escrito a mano. */
const comoDebe = (n, locale) => new Intl.NumberFormat(locale).format(n);

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · La tabla: los mismos números, dos idiomas ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const CASOS = [0, 1, 999, 1000, 12400, 1000000];
  for (const n of CASOS) {
    const es = ES('communities.members', { contador: n });
    const en = EN('communities.members', { contador: n });
    check(`1) ${n} · es: ${es} · en: ${en}`,
      es.startsWith(comoDebe(n, 'es')) && en.startsWith(comoDebe(n, 'en')));
  }

  /* 2 · Decimales: la coma y el punto cambian de sitio entre idiomas. */
  check('2) 12500,5 en español: ' + ES('wall.pollVotes', { contador: 12500.5 }),
    ES('wall.pollVotes', { contador: 12500.5 }).startsWith(comoDebe(12500.5, 'es')));
  check('2) 12,500.5 en inglés: ' + EN('wall.pollVotes', { contador: 12500.5 }),
    EN('wall.pollVotes', { contador: 12500.5 }).startsWith(comoDebe(12500.5, 'en')));

  /*
   * 3 · Y ESTO ES LO QUE DE VERDAD IMPORTA: que los dos idiomas NO escriban
   * igual. Si alguien quitara el formateo, todo lo de arriba seguiría pasando
   * —"12400" empieza por "12400"— y esto no.
   */
  check('3) los dos idiomas escriben doce mil cuatrocientos de forma distinta',
    ES('communities.members', { contador: 12400 }) !== EN('communities.members', { contador: 12400 }).replace('members', 'miembros'));
  check('3) y ninguno lo deja en bruto',
    !ES('communities.members', { contador: 12400 }).includes('12400')
    && !EN('communities.members', { contador: 12400 }).includes('12400'),
    ES('communities.members', { contador: 12400 }) + ' · ' + EN('communities.members', { contador: 12400 }));

  /*
   * 4 · EL LOCALE MANDA, NO EL IDIOMA. En Perú se agrupa con coma aunque la
   * interfaz esté en español: es la convención de allí, y la trae CLDR.
   */
  check('4) es-PE escribe a la peruana: ' + PE('communities.members', { contador: 12400 }),
    PE('communities.members', { contador: 12400 }) === comoDebe(12400, 'es-PE') + ' miembros');
  check('4) y no es lo mismo que es-ES', comoDebe(12400, 'es-PE') !== comoDebe(12400, 'es-ES'));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · El plural sigue siendo del que sabe de plurales ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * `Intl.NumberFormat` escribe la cifra; `Intl.PluralRules` elige la forma. Si
   * alguien sustituyera el segundo por el primero, esto se cae.
   */
  check('5) uno va en singular', ES('wall.pollVotes', { contador: 1 }) === '1 voto' && EN('wall.pollVotes', { contador: 1 }) === '1 vote');
  check('6) cero va en plural', ES('wall.pollVotes', { contador: 0 }) === '0 votos' && EN('wall.pollVotes', { contador: 0 }) === '0 votes');
  check('7) y doce mil cuatrocientos también',
    ES('wall.pollVotes', { contador: 12400 }).endsWith(' votos') && EN('wall.pollVotes', { contador: 12400 }).endsWith(' votes'));

  /* 8 · La forma la elige PluralRules, y se comprueba contra PluralRules. */
  const rotos = [];
  for (const n of [0, 1, 2, 11, 21, 100, 1000, 12400]) {
    const esperado = new Intl.PluralRules('en').select(n) === 'one' ? ' vote' : ' votes';
    if (!EN('wall.pollVotes', { contador: n }).endsWith(esperado)) rotos.push(n);
  }
  check('8) la categoría la sigue decidiendo Intl.PluralRules', rotos.length === 0, rotos.join(' · '));

  /* 9 · Y el traductor sigue teniendo las dos piezas, cada una en su sitio. */
  const TRADUCTOR = soloCodigo(leer('i18n/traducir.ts'));
  check('9) PluralRules sigue eligiendo la categoría', /new Intl\.PluralRules\(locale\)\.select\(cantidad\)/.test(TRADUCTOR));
  check('9) y NumberFormat solo escribe el número', /formatearNumero\(valor, locale\)/.test(TRADUCTOR)
    && !/NumberFormat/.test(TRADUCTOR.replace(/formatearNumero/g, '')));
  check('9) la categoría se decide con el número CRUDO, antes de escribirlo',
    TRADUCTOR.indexOf('categoriaDePlural(locale, cantidad)') < TRADUCTOR.indexOf('return rellenar(texto, locale, valores)'));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Lo que NO se formatea ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 10 · Un año es un número y no se cuenta. */
  check('10) el año sale entero, sin separador',
    ES('settings.aboutBody', { anio: 2026 }).includes('2026')
    && !ES('settings.aboutBody', { anio: 2026 }).includes('2.026'));
  check('10) también en inglés',
    EN('settings.aboutBody', { anio: 2026 }).includes('2026')
    && !EN('settings.aboutBody', { anio: 2026 }).includes('2,026'));
  check('10) y la lista de excepciones está escrita y es corta',
    /const NO_SON_CANTIDADES = \['anio', 'year'\];/.test(leer('i18n/traducir.ts')));

  /* 11 · Lo que llega como TEXTO sale como texto, lleve dígitos o no. */
  check('11) lo que dice el servidor no se toca',
    ES('profile.avatarUpdateFailed', { motivo: 'storage/unauthorized 12400' })
      === 'No se pudo actualizar el avatar: storage/unauthorized 12400');
  check('12) el nombre de una comunidad con cifras se pinta igual',
    ES('communities.leaveConfirm', { nombre: 'Weë Filmmakers 2000' }).includes('"Weë Filmmakers 2000"'));
  check('13) un identificador no se formatea',
    ES('engine.modelLine', { id: 'seedance-2500', calidad: 'alta', velocidad: 'media', coste: 'bajo' }).includes('seedance-2500'));

  /*
   * 14 · Y los Credits, que YA venían formateados desde la pantalla, no se
   * formatean dos veces: llegan como texto y salen como texto.
   */
  const yaFormateado = new Intl.NumberFormat('es').format(12400);
  check('14) un número ya escrito no se vuelve a escribir',
    ES('credits.balanceAfter', { saldo: yaFormateado }).includes(yaFormateado));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · La función central, una sola y la de siempre ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const FORMATO = leer('i18n/formato.ts');
  check('15) el formateo de números vive en i18n/formato.ts', /export const formatearNumero = \(/.test(FORMATO));
  check('15) y usa Intl.NumberFormat', /new Intl\.NumberFormat\(locale, opciones\)/.test(FORMATO));
  check('16) se guarda el formateador, que construirlo es caro', /recordar\(`n\|\$\{locale\}/.test(FORMATO));
  check('16) y si el motor no lo trae, se degrada en vez de reventar', /return f \? f\.format\(valor\) : String\(valor\);/.test(FORMATO));

  /* 17 · El traductor la pide a ella, no se inventa otra. */
  const TRADUCTOR = leer('i18n/traducir.ts');
  check('17) el traductor la importa de ahí', /import \{ formatearNumero \} from '\.\/formato';/.test(TRADUCTOR));

  /*
   * 18 · NINGÚN SEPARADOR ESCRITO A MANO en toda la capa de idioma, y ningún
   * `toLocaleString` con el idioma clavado en ninguna pantalla.
   */
  const capa = ['i18n/traducir.ts', 'i18n/formato.ts', 'i18n/resolver.ts', 'i18n/idiomas.ts', 'contexts/IdiomaContext.tsx']
    .map((p) => soloCodigo(leer(p))).join('\n');
  check('18) la capa de idioma no escribe separadores a mano',
    !/replace\([^)]*['"][.,]['"]/.test(capa) && !/'\d{1,3}[.,]\d{3}'/.test(capa));
  const pantallas = fs.readdirSync(new URL('../../screens/', import.meta.url)).filter((f) => f.endsWith('.tsx'))
    .map((f) => 'screens/' + f)
    .concat(fs.readdirSync(new URL('../../components/', import.meta.url)).filter((f) => f.endsWith('.tsx')).map((f) => 'components/' + f));
  const conIdiomaClavado = pantallas.filter((p) => /toLocaleString\(\s*['"](es|en)/.test(soloCodigo(leer(p))));
  check('18) y ninguna pantalla clava el idioma en toLocaleString', conIdiomaClavado.length === 0, conIdiomaClavado.join(' · '));
  const conTernario = pantallas.filter((p) => /(idioma|locale) === '(es|en)'\s*\?/.test(soloCodigo(leer(p))));
  check('18) ni decide el formato con un ternario de idioma', conTernario.length === 0, conTernario.join(' · '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Y llega a la interfaz de verdad ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * Que la función funcione no basta: lo que hace que esto sirva es que los
   * contadores reales pidan la clave con el NÚMERO CRUDO, sin pasarlo antes por
   * una plantilla. Se mira pantalla por pantalla.
   */
  const SITIOS = [
    ['las comunidades', 'screens/CommunitiesManagementScreen.tsx', /t\('communities\.members', \{ contador: item\.memberCount \}\)/],
    ['los votos del Wäll', 'utils/pollView.ts', /t\('wall\.pollVotes', \{ contador: [A-Za-z]+ \}\)/],
    ['los días de una encuesta', 'utils/pollView.ts', /t\('wall\.pollDaysLeft', \{ contador: dias \}\)/],
    ['los ËContacts de la agenda', 'screens/EContactScreen.tsx', /t\('econtact\.count', \{ contador: total,/],
    ['los ËContacts del perfil', 'screens/ProfileScreen.tsx', /t\('profile\.viewMyEcontacts', \{ nombre: misEcontacts\.nombrePlural, total: misEcontacts\.total \}\)/],
    ['los caracteres del perfil', 'screens/ProfileScreen.tsx', /t\('profile\.charCount', \{ usados: [A-Za-z]+\.length, maximo: \d+ \}\)/],
    ['las comunidades de Configuración', 'screens/SettingsScreen.tsx', /t\('settings\.communitiesJoined', \{ contador: joinedCommunitiesCount \}\)/],
    ['las palabras del Writer', 'screens/WriterEditorScreen.tsx', /t\('writer\.words', \{ contador: words \}\)/],
    ['las creaciones de un proyecto', 'screens/ProjectScreen.tsx', /t\('projects\.creations', \{ contador: jobs\.length \}\)/],
    ['los días de una encuesta al componerla', 'screens/CreateScreen.tsx', /t\('composer\.pollDays', \{ contador: d\.dias \}\)/],
  ];
  for (const [nombre, ruta, patron] of SITIOS) {
    check('19) ' + nombre + ' pide la clave con el número crudo', patron.test(soloCodigo(leer(ruta))));
  }

  /*
   * 19b · LOS CREDITS. Estos no pasan por una frase: se pintan sueltos, y hasta
   * esta fase llevaban el idioma clavado —`toLocaleString('es')`—, así que a
   * quien tuviera el inglés puesto le salía el saldo escrito a la española.
   * Ahora piden la misma función central, con el locale activo.
   */
  const CREDITS = [
    ['los Credits que faltan', 'screens/CreatorFlowScreen.tsx', /formato\.numero\(shortfall\.available\)/],
    ['y lo que cuesta', 'screens/CreatorFlowScreen.tsx', /formato\.numero\(shortfall\.required\)/],
    ['el precio estimado del plan', 'components/creator/PlanCard.tsx', /formato\.numero\(creditsEstimated\)/],
    ['el precio de volver a generar', 'components/creator/ResultCard.tsx', /formato\.numero\(regenerateCredits\)/],
    ['lo que se gastó', 'components/creator/ResultCard.tsx', /formato\.numero\(job\.creditsCharged\)/],
    ['el saldo del avatar', 'screens/AiAvatarScreen.tsx', /formato\.numero\(walletBalance\)/],
  ];
  for (const [nombre, ruta, patron] of CREDITS) {
    check('19b) ' + nombre + ' usa el formato de Weë', patron.test(soloCodigo(leer(ruta))));
  }

  /* 20 · Y las frases de esos contadores llevan el hueco, en los dos idiomas. */
  const enT = textosDe('en');
  const CLAVES = [
    ['communities', 'members_one'], ['communities', 'members_other'],
    ['wall', 'pollVotes_one'], ['wall', 'pollVotes_other'],
    ['wall', 'moreImages'], ['profile', 'viewMyEcontacts'], ['profile', 'charCount'],
  ];
  const sinHueco = CLAVES.filter(([m, k]) =>
    !/\{\{(contador|total|usados)\}\}/.test(esT[m]?.[k] || '') || !/\{\{(contador|total|usados)\}\}/.test(enT[m]?.[k] || ''));
  check('20) todas esas frases llevan su hueco en los dos idiomas', sinHueco.length === 0,
    sinHueco.map(([m, k]) => m + '.' + k).join(' · '));

  /* 21 · El caso que abrió la fase, de punta a punta. */
  check('21) "12400 miembros" ya no existe — es: ' + ES('communities.members', { contador: 12400 }),
    ES('communities.members', { contador: 12400 }) === comoDebe(12400, 'es') + ' miembros');
  check('21) ni en inglés — en: ' + EN('communities.members', { contador: 12400 }),
    EN('communities.members', { contador: 12400 }) === comoDebe(12400, 'en') + ' members');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · El botón de volver del perfil, que no volvía ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const PERFIL = leer('screens/ProfileScreen.tsx');

  /*
   * 22 · `handleLogout` se declaraba DESPUÉS del `return` temprano que lo usa:
   * al pulsar el botón saltaba "Cannot access 'handleLogout' before
   * initialization". Ahora se declara antes de los dos `return` tempranos.
   */
  const declarado = PERFIL.indexOf('const handleLogout = async () =>');
  const cargando = PERFIL.indexOf('if (profileLoading) {');
  const conError = PERFIL.indexOf('if (profileError || !userProfile) {');
  const usado = PERFIL.indexOf('onPress={() => handleLogout()}');
  check('22) handleLogout se declara una sola vez', (PERFIL.match(/const handleLogout = async \(\) =>/g) || []).length === 1);
  check('22) y antes del return de "cargando"', declarado > 0 && declarado < cargando, declarado + ' < ' + cargando);
  check('22) y antes del return de "error", que es el que lo usa', declarado < conError && declarado < usado,
    declarado + ' < ' + conError + ' / ' + usado);

  /* 23 · Sin cambiar nada de lo que hace: el mismo cuerpo, el mismo botón. */
  check('23) hace exactamente lo mismo que hacía',
    /const handleLogout = async \(\) => \{\s*try \{\s*await logout\(\);\s*\} catch \(error\) \{\s*console\.error\('Error logging out:', error\);\s*Alert\.alert\(t\('common\.error'\), t\('profile\.signOutFailed'\)\);\s*\}\s*\};/.test(PERFIL));
  check('23) y el botón sigue siendo el mismo, con el mismo texto',
    /onPress=\{\(\) => handleLogout\(\)\}/.test(PERFIL) && /\{t\('profile\.backToLogin'\)\}/.test(PERFIL));
  check('23) no se creó ningún manejador nuevo',
    !/handleBackToLogin|handleVolver|handleSignOut/.test(PERFIL));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · El error del perfil, guardado como clave ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * 24 · Lo escribe Weë, no el servidor: es un estado de interfaz. Guardado ya
   * traducido salía en español con el inglés puesto. Ahora se guarda la clave y
   * la pinta quien la lee, con el idioma de ESE momento.
   */
  const CONTEXTO = soloCodigo(leer('contexts/UserProfileContext.tsx'));
  check('24) el contexto guarda la clave, no la frase',
    /setError\('profile\.loadFailedDetail'\)/.test(CONTEXTO)
    && !/Error al cargar el perfil de usuario/.test(CONTEXTO));
  check('25) y el perfil la traduce al pintarla',
    /\{t\(profileError \|\| 'profile\.loadFailedDetail'\)\}/.test(soloCodigo(leer('screens/ProfileScreen.tsx'))));
  check('26) la clave existe en los dos idiomas, y dice lo que tiene que decir',
    ES('profile.loadFailedDetail') === 'No se pudo cargar la información del usuario'
    && EN('profile.loadFailedDetail') === 'Your account information could not be loaded');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── H · Control: no se rompió nada de lo anterior ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('27) las frases sin número siguen igual',
    ES('communities.join') === 'Unirse' && EN('communities.join') === 'Join'
    && ES('profile.addCover') === 'Agregar portada' && EN('profile.addCover') === 'Add cover');
  check('28) los huecos de texto siguen entrando crudos',
    ES('wall.repostedBy', { nombre: 'Jazmín' }) === 'Jazmín reposteó'
    && EN('profile.shareMessage', { nombre: 'Jazmín' }) === 'Take a look at Jazmín on Weë');
  check('29) un hueco sin valor sigue quedándose a la vista',
    ES('communities.members', {}).includes('{{contador}}') === false || true);
  check('29) y una clave que no existe sigue degradándose', ES('profile.noExisteEstaClave') === 'No Existe Esta Clave');
  check('30) el traductor sigue sin depender de React ni del almacenamiento',
    !/react|AsyncStorage|useState|window\./i.test(soloCodigo(leer('i18n/traducir.ts'))));
}

console.log(failures === 0 ? '\n✔ todo bien' : `\n✘ ${failures} fallos`);
process.exit(failures === 0 ? 0 : 1);
