/*
 * DOS CIERRES PEQUEÑOS (fase 5J).
 *
 * A · LA FILA QUE LLEVA AL PANEL DEL MOTOR. Su subtítulo resume lo que hay
 *     dentro y se había quedado en español. En `engine` estaban sus cuatro
 *     trozos —proveedores, cadenas, ajustes, solo administración— pero ninguno
 *     era esta frase, y pegarlos habría sido justo lo que no se hace: en otro
 *     idioma la oración no se ordena igual. Una clave, entera, en el módulo del
 *     panel y no en `settings`, que es donde vive lo que describe.
 *
 * B · EL BOTÓN DE ACEPTAR DEL PERFIL AJENO. La fase 5I migró su etiqueta de
 *     accesibilidad y dejó atrás LO QUE SE LEE, tres líneas más abajo: el mismo
 *     botón diciendo una cosa al lector de pantalla y otra en pantalla. Ahora
 *     los dos leen de `econtact.acceptLabel` —la misma clave, sin crear otra—.
 *
 * LO QUE NO HACE ESTA FASE: añadir etiquetas de accesibilidad que no existían.
 * El perfil tiene tres y las tres ya estaban migradas; aquí se comprueba que
 * siguen ahí, no se inventa ninguna.
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

const AJUSTES = soloCodigo(leer('screens/SettingsScreen.tsx'));
const PERFIL_CRUDO = leer('screens/UserProfileScreen.tsx');
const PERFIL = soloCodigo(PERFIL_CRUDO);

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · La fila del panel del motor ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 1 · La frase ya no está escrita a mano. */
  check('1) el subtítulo ya no está en español dentro de la pantalla',
    !/Proveedores, cadenas de fallback y ajustes/.test(AJUSTES));

  /* 2 · Y sale de una clave del módulo del panel. */
  check('2) sale de engine.rowSubtitle, el módulo del panel',
    /'Weë AI Engine',\s*\n\s*t\('engine\.rowSubtitle'\),/.test(AJUSTES));

  /* 3, 4, 5 y 6 · La clave existe y dice lo que tiene que decir. */
  check('3) existe en español', !!esT.engine?.rowSubtitle);
  check('4) y en inglés', !!enT.engine?.rowSubtitle);
  check('5) en español: ' + ES('engine.rowSubtitle'),
    ES('engine.rowSubtitle') === 'Proveedores, cadenas de fallback y ajustes (solo administración)');
  check('6) en inglés: ' + EN('engine.rowSubtitle'),
    EN('engine.rowSubtitle') === 'Providers, fallback chains and settings (administrators only)');

  /*
   * 7 · SIN DUPLICAR. No se creó `settings.engineDescription` ni nada parecido,
   * y la frase existe una sola vez en todo el diccionario.
   */
  check('7) no se creó una clave gemela en settings',
    !esT.settings?.engineDescription && !esT.settings?.engineSubtitle && !esT.settings?.engineAdminHint);
  check('7) y la frase existe una sola vez en todo el diccionario',
    Object.values(esT).filter((m) => Object.values(m).includes(ES('engine.rowSubtitle'))).length === 1
    && Object.values(enT).filter((m) => Object.values(m).includes(EN('engine.rowSubtitle'))).length === 1);

  /* Y no se compuso pegando las cuatro piezas que ya existían. */
  check('7) no se pegó a partir de engine.providers + engine.chains + …',
    !/t\('engine\.providers'\)\s*\+/.test(AJUSTES) && !/engine\.adminOnly'\)\}?\s*\)/.test(AJUSTES));

  /*
   * CONTROL: la fila es la misma fila. Mismo icono, mismo título —que es marca
   * y se queda escrito igual—, misma condición de visibilidad y mismo destino.
   */
  check('7) control: icono, título, condición y destino no cambiaron',
    /\{engineAdmin &&\s*\n\s*renderSettingItem\(\s*\n\s*'hardware-chip-outline',\s*\n\s*'Weë AI Engine',/.test(AJUSTES)
    && /\(navigation as any\)\.navigate\('EngineAdmin'\)/.test(AJUSTES));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · El botón de aceptar del perfil ajeno ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 8 · Lo que se lee ya no está escrito a mano. */
  check('8) el texto del botón ya no está en español',
    !/>Aceptar \{nombreLista\}</.test(PERFIL));

  /*
   * 9 · Y LO QUE SE LEE Y LO QUE SE OYE SON LA MISMA CLAVE. Es el mismo botón:
   * si discreparan, un lector de pantalla diría una cosa distinta de la que hay
   * escrita.
   */
  check('9) el texto y la etiqueta salen de econtact.acceptLabel',
    (PERFIL.match(/t\('econtact\.acceptLabel', \{ lista: nombreLista \}\)/g) || []).length === 2);
  /*
   * Desde la fase 5M existe un módulo `profile`, pero es el de la pantalla del
   * perfil PROPIO —la portada— y no tiene nada que ver con este botón. Lo que
   * esta comprobación defiende es lo de siempre, y ahora mirando más lejos: que
   * nadie se inventó una clave para el botón de aceptar en NINGÚN módulo, y que
   * este perfil ajeno no va a buscar textos al módulo del perfil propio.
   */
  const INVENTADAS = ['acceptText', 'acceptButton', 'acceptEcontact', 'acceptList', 'acceptAgenda'];
  const coladas = Object.entries(esT).flatMap(([modulo, m]) =>
    Object.keys(m).filter((k) => INVENTADAS.includes(k)).map((k) => modulo + '.' + k));
  /*
   * En la fase 6 esta pantalla se migró entera y sus textos propios —el título,
   * el error, los huecos vacíos— sí viven en `profile`, que es su dominio. Lo
   * que sigue sin poder pasar es que alguien invente una clave para ESTE botón.
   */
  const DEL_PERFIL_AJENO = ['profile.otherTitle', 'profile.otherLoadFailed', 'profile.seeFullProfile',
    'profile.emptyCategory', 'profile.actionFailed', 'profile.loading', 'profile.posts', 'profile.loadingPosts'];
  const deMas = [...PERFIL.matchAll(/t\('(profile\.[A-Za-z0-9_]+)'/g)]
    .map((m) => m[1]).filter((c) => !DEL_PERFIL_AJENO.includes(c));
  check('9) y no se creó ninguna clave nueva para esto',
    coladas.length === 0 && deMas.length === 0, coladas.concat(deMas).join(' · '));

  /* 10 y 11 · Lo que se lee en cada idioma. */
  check('10) en español: ' + ES('econtact.acceptLabel', { lista: 'ËContact' }),
    ES('econtact.acceptLabel', { lista: 'ËContact' }) === 'Aceptar ËContact');
  check('11) en inglés: ' + EN('econtact.acceptLabel', { lista: 'ËContact' }),
    EN('econtact.acceptLabel', { lista: 'ËContact' }) === 'Accept ËContact');

  /*
   * 12 y 13 · EL NOMBRE DE LA AGENDA CAMBIA CON LA IDENTIDAD PUESTA y entra por
   * hueco. Se prueba con lo que más podría romperse.
   */
  const NOMBRES = ['ËContact', 'ẄContact', 'Jazmín', 'SombraOscura', '100%', 'Yes', 'Cancelar'];
  const rotos = NOMBRES.filter((n) =>
    ES('econtact.acceptLabel', { lista: n }) !== `Aceptar ${n}` || EN('econtact.acceptLabel', { lista: n }) !== `Accept ${n}`);
  check('12) la interpolación funciona con cualquier nombre', rotos.length === 0, rotos.join(' | '));
  check('13) y el nombre sale intacto: ' + EN('econtact.acceptLabel', { lista: 'ẄContact' }),
    EN('econtact.acceptLabel', { lista: 'ẄContact' }) === 'Accept ẄContact'
    && !/t\(nombreLista\)/.test(PERFIL));

  /*
   * 14 · NO SE AÑADIÓ NINGUNA ETIQUETA NUEVA. El perfil tenía tres y sigue
   * teniendo tres: las dos de ËContact y la del botón de estado.
   */
  check('14) el perfil sigue teniendo exactamente tres etiquetas de accesibilidad',
    (PERFIL_CRUDO.match(/accessibilityLabel=/g) || []).length === 3
    && (PERFIL_CRUDO.match(/accessibilityHint=/g) || []).length === 0);
  check('14) y las tres siguen saliendo de donde las dejó la fase 5I',
    /accessibilityLabel=\{t\('econtact\.acceptLabel', \{ lista: nombreLista \}\)\}/.test(PERFIL)
    && /accessibilityLabel=\{t\('econtact\.rejectRequestLabel', \{ lista: nombreLista \}\)\}/.test(PERFIL)
    && /accessibilityLabel=\{porEstado\.etiqueta\}/.test(PERFIL)
    && /etiqueta: t\('econtact\.requestSent'\),/.test(PERFIL));

  /* 15 y 16 · Ni las acciones ni la navegación se movieron. */
  check('15) las acciones de los botones son las mismas',
    /onPress=\{\(\) => intentar\(econtact\.aceptar\)\}/.test(PERFIL)
    && /econtact\.rechazar/.test(PERFIL) && /econtact\.cancelar/.test(PERFIL) && /econtact\.eliminar/.test(PERFIL)
    && /onPress=\{porEstado\.onPress\}/.test(PERFIL));
  check('16) y la navegación tampoco',
    /disabled=\{trabajando\}/.test(PERFIL) && /accessibilityRole="button"/.test(PERFIL));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Sin sistemas paralelos ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 17 · Un solo traductor, el de siempre. */
  check('17) sin traductores propios ni ternarios de idioma',
    !/i18next|react-intl|idioma === 'en'|locale === 'en'/.test(AJUSTES + PERFIL)
    && /from '\.\.\/contexts\/IdiomaContext'/.test(leer('screens/SettingsScreen.tsx'))
    && /from '\.\.\/contexts\/IdiomaContext'/.test(leer('screens/UserProfileScreen.tsx')));

  /* Y lo que cerraron las fases anteriores sigue en pie. */
  check('17) lo que cerró la 5H sigue donde estaba',
    /confirmAction\(t\('settings\.signOut'\), t\('menu\.signOutConfirm'\), t\('settings\.signOut'\), true, t\)/.test(AJUSTES)
    && /confirmAction\(titulo, mensaje, t\('common\.yes'\), true, t\)/.test(PERFIL));
  check('17) y lo que cerró la 5I, también',
    /\{t\('engine\.adminOnly'\)\}/.test(soloCodigo(leer('screens/EngineAdminScreen.tsx')))
    && /accessibilityLabel=\{t\('settings\.seedDefaults'\)\}/.test(leer('screens/EngineAdminScreen.tsx')));

  /* El módulo del motor sigue completo y cuadrado en los dos idiomas. */
  const claves = Object.keys(esT.engine || {});
  check('17) el módulo engine sigue cuadrado en los dos idiomas',
    claves.length === Object.keys(enT.engine || {}).length && claves.every((k) => enT.engine[k]),
    String(claves.length));
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
