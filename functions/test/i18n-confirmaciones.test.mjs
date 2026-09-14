/*
 * UNA CONFIRMACIÓN SE LEE COMO UNA SOLA FRASE (fase 5H).
 *
 * `confirmAction` pinta cuatro piezas: el título, el mensaje y las dos
 * etiquetas. Tres las trae quien llama; la de cancelar la ponía la utilidad, en
 * español y escrita a mano. Traducir SOLO esa habría dejado diálogos así:
 *
 *     Cerrar sesión · ¿Quieres salir de Weë? · [Cancel] [Cerrar sesión]
 *
 * —una palabra inglesa dentro de una frase española—, que es peor que no
 * traducir nada. Por eso esta fase cierra la utilidad Y SUS CINCO LLAMANTES.
 *
 * CÓMO LLEGA EL IDIOMA. `utils/notify.ts` es una utilidad pura: no tiene
 * contexto del que sacarlo y no va a tenerlo. El traductor entra por parámetro,
 * igual que en `utils/pollView.ts`. Ni global mutable, ni singleton, ni
 * AsyncStorage, ni React dentro de la utilidad.
 *
 * DOS COSAS QUE NO CAMBIAN Y AQUÍ SE DEFIENDEN:
 *
 *   · EN WEB LAS ETIQUETAS NO SE USAN. `window.confirm` pone sus propios
 *     botones, en el idioma del navegador, y no deja cambiarlos. Se deja tal
 *     cual: sustituirlo por una ventana propia sería rediseñar, no traducir;
 *
 *   · LOS NOMBRES DE LAS PERSONAS entran por hueco y salen sin tocar.
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

const AVISO = soloCodigo(leer('utils/notify.ts'));
const LLAMANTES = {
  lateral: 'components/Sidebar.tsx',
  ajustes: 'screens/SettingsScreen.tsx',
  agenda: 'screens/EContactScreen.tsx',
  perfil: 'screens/UserProfileScreen.tsx',
  motor: 'screens/EngineAdminScreen.tsx',
};
const C = Object.fromEntries(Object.entries(LLAMANTES).map(([k, p]) => [k, soloCodigo(leer(p))]));

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · La utilidad sigue siendo pura ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 1 · El traductor entra por la puerta, declarado. */
  check('1) confirmAction recibe el traductor de forma explícita',
    /type Traducir = \(clave: string, valores\?: Record<string, string \| number>\) => string;/.test(AVISO)
    && /^\s*t: Traducir,$/m.test(AVISO));

  /* 2 y 3 · Y no se coló ninguna otra forma de llegar al idioma. */
  check('2) no hay ningún acceso global al idioma desde notify.ts',
    !/IdiomaContext|AsyncStorage|crearTraductor|globalThis|let traductor|idiomaActual/.test(AVISO));
  check('3) ni React, ni hooks, ni estado',
    !/from 'react'|useT\(|useState|useEffect|useContext/.test(AVISO)
    && /^import \{ Alert, Platform \} from 'react-native';$/m.test(AVISO));

  /* 4 · La etiqueta de cancelar viene del diccionario. */
  check('4) "Cancelar" sale de common.cancel',
    /\{ text: t\('common\.cancel'\), style: 'cancel', onPress: \(\) => resolve\(false\) \}/.test(AVISO)
    && !/'Cancelar'/.test(AVISO));

  /*
   * 5 · EL "Sí" POR DEFECTO ERA UN CAMINO MUERTO. Los cinco llamantes pasaban
   * su propia etiqueta, así que nunca se pintó. En vez de traducir código que
   * no se ejecuta, `confirmLabel` pasó a ser obligatorio: TypeScript obliga a
   * los cinco y el español desaparece del archivo. Quien quiera decir "Sí"
   * tiene `common.yes`, que es transversal.
   */
  check('5) el "Sí" por defecto se fue, y confirmLabel es obligatorio',
    !/'Sí'/.test(AVISO) && /^\s*confirmLabel: string,$/m.test(AVISO)
    && !/confirmLabel = /.test(AVISO));

  /* 10 · Ni una traducción escrita a mano en la utilidad. */
  check('10) no hay traducción manual ni ternario de idioma',
    !/idioma === |locale === |\? 'Yes' :|\? 'Cancel' :/.test(AVISO));

  /*
   * 12 y 20 · EL COMPORTAMIENTO ES EL MISMO: el orden de los botones, el
   * estilo de cada uno, lo que resuelve cada `onPress` y la rama de web.
   */
  check('12) el orden y el estilo de los dos botones no cambiaron',
    /style: 'cancel', onPress: \(\) => resolve\(false\)[\s\S]{0,140}style: destructive \? 'destructive' : 'default', onPress: \(\) => resolve\(true\)/.test(AVISO));
  check('20) la cancelación sigue resolviendo false, y la confirmación true',
    (AVISO.match(/resolve\(false\)/g) || []).length === 1 && (AVISO.match(/resolve\(true\)/g) || []).length === 1);
  check('12) y la rama de web sigue siendo window.confirm, intacta',
    /if \(isWeb\) \{\s*\n\s*return Promise\.resolve\(window\.confirm\(`\$\{title\}\\n\\n\$\{message\}`\)\);/.test(AVISO));
  check('12) notify() tampoco cambió',
    /export const notify = \(title: string, message\?: string\): void => \{/.test(AVISO)
    && /window\.alert\(message \? `\$\{title\}\\n\\n\$\{message\}` : title\)/.test(AVISO));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Las claves: las nuevas y las de siempre ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const NUEVAS = [['common', 'yes'], ['menu', 'signOutConfirm'], ['econtact', 'somePerson'],
    ['settings', 'seedDefaults'], ['settings', 'seedDefaultsConfirm'], ['settings', 'seed']];
  const REUSADAS = [['common', 'cancel'], ['menu', 'signOut'], ['settings', 'signOut'],
    ['econtact', 'rejectTitle'], ['econtact', 'rejectConfirm'], ['econtact', 'withdrawTitle'],
    ['econtact', 'withdrawConfirm'], ['econtact', 'removeTitle'], ['econtact', 'removeConfirm']];
  const TODAS = [...NUEVAS, ...REUSADAS];

  /* 6 y 7 · Lo reutilizado se reutiliza; lo nuevo es lo mínimo. */
  check('6) common.cancel se reutiliza, no se duplica',
    esT.common.cancel === 'Cancelar' && enT.common.cancel === 'Cancel'
    && Object.values(esT).filter((m) => Object.values(m).includes('Cancelar')).length === 1);
  check('7) common.yes se creó porque no existía, y es transversal',
    esT.common.yes === 'Sí' && enT.common.yes === 'Yes'
    && !esT.confirm && !esT.notify
    && Object.values(esT).filter((m) => Object.values(m).includes('Sí')).length === 1);

  /* 8, 9 y 10 · Completas en los dos idiomas. */
  const faltanEs = TODAS.filter(([m, k]) => !esT[m]?.[k]).map(([m, k]) => m + '.' + k);
  check('8) las 15 claves existen en español', faltanEs.length === 0, faltanEs.join(' '));
  const faltanEn = TODAS.filter(([m, k]) => !enT[m]?.[k]).map(([m, k]) => m + '.' + k);
  check('9) y en inglés', faltanEn.length === 0, faltanEn.join(' '));
  const vacias = TODAS.filter(([m, k]) => !String(enT[m][k] ?? '').trim() || !String(esT[m][k] ?? '').trim())
    .map(([m, k]) => m + '.' + k);
  check('10) ninguna está vacía', vacias.length === 0, vacias.join(' '));
  const copiadas = TODAS.filter(([m, k]) => esT[m][k] === enT[m][k]).map(([m, k]) => m + '.' + k);
  check('10) y todas están traducidas de verdad', copiadas.length === 0, copiadas.join(' '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Los cinco llamantes, sin una palabra suelta ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 11 · Ninguna de las cinco llamadas lleva ya un literal español. */
  const conLiteral = Object.entries(C)
    .filter(([, s]) => /confirmAction\([^)]*'[A-ZÁÉÍÓÚÑ¿][^']*'/.test(s))
    .map(([k]) => k);
  check('11) ninguna llamada pasa un texto español escrito a mano', conLiteral.length === 0, conLiteral.join(' '));

  /* Y las cinco pasan el traductor. */
  const sinT = Object.entries(C).filter(([, s]) => !/confirmAction\([^;]*, t\)/.test(s)).map(([k]) => k);
  check('11) y las cinco le pasan el traductor', sinT.length === 0, sinT.join(' '));

  /* 12, 13 y 14 · El cierre de sesión, entero, en los dos sitios. */
  check('12) el título del cierre de sesión está traducido',
    /confirmAction\(t\('menu\.signOut'\), /.test(C.lateral)
    && /confirmAction\(t\('settings\.signOut'\), /.test(C.ajustes));
  check('13) el mensaje, también, y es el mismo en los dos',
    /t\('menu\.signOutConfirm'\)/.test(C.lateral) && /t\('menu\.signOutConfirm'\)/.test(C.ajustes)
    && !/'¿Quieres salir de Weë\?'/.test(C.lateral + C.ajustes));
  check('14) y la etiqueta de confirmar',
    /t\('menu\.signOut'\), true, t\)/.test(C.lateral) && /t\('settings\.signOut'\), true, t\)/.test(C.ajustes));

  /* Lo que se lee, en los dos idiomas, sin mezclas. */
  const dialogo = (t, clave) => [t(clave), t('menu.signOutConfirm'), t('common.cancel'), t(clave)].join(' · ');
  check('14) en español: ' + dialogo(ES, 'menu.signOut'),
    dialogo(ES, 'menu.signOut') === 'Cerrar sesión · ¿Quieres salir de Weë? · Cancelar · Cerrar sesión');
  check('14) en inglés: ' + dialogo(EN, 'menu.signOut'),
    dialogo(EN, 'menu.signOut') === 'Sign out · Do you want to leave Weë? · Cancel · Sign out'
    && !/Cerrar|Cancelar|¿/.test(dialogo(EN, 'menu.signOut')));
  check('14) y el de Configuración dice lo mismo',
    ES('settings.signOut') === ES('menu.signOut') && EN('settings.signOut') === EN('menu.signOut'));

  /* 15 · ËContact: su título y su mensaje ya venían traducidos; faltaba el "Sí". */
  check('15) ËContact pasa common.yes y conserva sus claves',
    /confirmAction\(titulo, mensaje, t\('common\.yes'\), true, t\)/.test(C.agenda)
    && /t\('econtact\.rejectTitle'\)/.test(C.agenda) && /t\('econtact\.rejectConfirm', \{ nombre \}\)/.test(C.agenda));

  /*
   * 16 · EL PERFIL DE OTRA PERSONA escribía a mano las MISMAS frases que la
   * agenda ya tenía en el diccionario. Ahora lee de ellas: una sola fuente.
   */
  check('16) el perfil reutiliza las claves de la agenda, no crea otras',
    /t\('econtact\.rejectTitle'\), t\('econtact\.rejectConfirm', \{ nombre: quien \}\)/.test(C.perfil)
    && /t\('econtact\.withdrawTitle'\), t\('econtact\.withdrawConfirm', \{ nombre: quien \}\)/.test(C.perfil)
    && /t\('econtact\.removeTitle', \{ lista: nombreLista \}\), t\('econtact\.removeConfirm', \{ nombre: quien, lista: nombrePlural \}\)/.test(C.perfil));
  /*
   * Se mira LA LLAMADA, no el archivo entero: el perfil tiene además etiquetas
   * de accesibilidad en español —"Rechazar solicitud de …"— que son de otro
   * bloque y esta fase no toca. Lo que aquí se defiende es que ninguna de las
   * tres confirmaciones lleve ya un texto escrito a mano.
   */
  const llamadas = [...C.perfil.matchAll(/preguntarYHacer\([^;]*?\),?\s*$/gm)].map((m) => m[0]);
  check('16) y ninguna de las tres confirmaciones lleva texto escrito a mano',
    llamadas.length === 3 && !llamadas.some((l) => /'[A-ZÁÉÍÓÚÑ¿]|`[^`]*[a-záéíóúñ]{3,}/.test(l)),
    String(llamadas.length));

  /*
   * 17 · El panel del motor. Se mira SU CONFIRMACIÓN: el resto del panel está
   * en español —es una pantalla de administración que nunca se migró— y esta
   * fase no la toca. Queda anotada como pendiente.
   */
  const seed = (C.motor.match(/const seed = async \(\) => \{[\s\S]*?\n  \};/) || [''])[0];
  check('17) la confirmación del panel del motor pide sus tres claves',
    /confirmAction\(t\('settings\.seedDefaults'\), t\('settings\.seedDefaultsConfirm'\), t\('settings\.seed'\), false, t\)/.test(seed)
    && !/'Sembrar/.test(seed));
  check('17) y dicen lo que hace de verdad: escribe lo que falta, no borra',
    /no existan\. No borra nada\./.test(esT.settings.seedDefaultsConfirm)
    && /do not exist yet\. It deletes nothing\./.test(enT.settings.seedDefaultsConfirm),
    EN('settings.seedDefaults') + ' / ' + EN('settings.seed'));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Los nombres de las personas no se traducen ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 18 · El nombre entra por hueco y sale exactamente como entró. */
  const NOMBRES = ['Jazmín', 'SombraOscura', 'Giacomo Gonzales', 'Yes', 'Cancelar', '100% real'];
  const rotos = NOMBRES.filter((n) =>
    !ES('econtact.rejectConfirm', { nombre: n }).includes(n) || !EN('econtact.rejectConfirm', { nombre: n }).includes(n));
  check('18) el nombre viaja intacto en los dos idiomas', rotos.length === 0, rotos.join(' | '));
  check('18) y el perfil se lo pasa crudo, sin traducirlo',
    /const quien = userProfile\?\.displayName \|\| t\('econtact\.somePerson'\);/.test(C.perfil)
    && !/t\(userProfile\?\.displayName\)/.test(C.perfil));
  check('18) y el nombre de la agenda sigue viniendo de la identidad activa',
    /nombreLista \} = econtact;/.test(C.perfil) && !/t\(nombreLista\)/.test(C.perfil));

  const ejemplo = EN('econtact.removeConfirm', { nombre: 'Jazmín', lista: 'ËContacts' });
  check('18) ejemplo: ' + ejemplo, ejemplo === 'Remove Jazmín from your ËContacts?');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Ni la lógica, ni la navegación, ni un sistema paralelo ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 19 · Los callbacks de los cinco siguen siendo los mismos. */
  check('19) los callbacks no cambiaron',
    /onPress=\{handleLogout\}/.test(C.lateral) && /const ok = await confirmAction\(/.test(C.ajustes)
    && /await ejecutar\(identidad, hacer\)/.test(C.agenda)
    && /await hacer\(\)/.test(C.perfil)
    && /await run\('seed', \(\) => aiEngineService\.seedDefaults\(false\)/.test(C.motor));
  check('19) y lo que se hace al cancelar, tampoco',
    /if \(!ok\) return;/.test(C.ajustes) && /if \(!ok\) return;/.test(C.motor));

  /* 21 · Nada técnico se tocó. */
  check('21) los códigos y las operaciones técnicas están intactos',
    /aiEngineService\.seedDefaults\(false\)/.test(C.motor)
    && /econtact\.rechazar/.test(C.perfil) && /econtact\.cancelar/.test(C.perfil) && /econtact\.eliminar/.test(C.perfil));

  /* 22 · Un solo sistema de traducción, el de siempre. */
  const paralelos = Object.entries(C)
    .filter(([, s]) => /i18next|react-intl|idioma === 'en'|locale === 'en'|TRADUCCIONES\s*=/.test(s))
    .map(([k]) => k);
  check('22) nadie se montó un traductor propio', paralelos.length === 0, paralelos.join(' '));
  check('22) y los cinco lo piden al contexto de siempre',
    Object.values(LLAMANTES).every((p) => /from '\.\.\/contexts\/IdiomaContext'/.test(leer(p))));

  /* 23 y 24 · La navegación y el negocio, donde estaban. */
  check('23) la navegación no cambió',
    /rootNav\.dispatch\(/.test(C.ajustes) && /navigation\.navigate\('UserProfile', \{ userId: identidad \}\)/.test(C.agenda));
  check('24) y la lógica de negocio tampoco: nadie escribe datos nuevos',
    !/updateDoc|setDoc|runTransaction/.test(Object.values(C).join('\n')));

  /* CONTROL de fase: no se tocó nada de lo ya cerrado. */
  check('24) control: ni LoginScreen, ni la cabecera, ni el registro',
    /\{t\('auth\.welcome'\)\}/.test(leer('screens/LoginScreen.tsx'))
    && /\{t\('menu\.signIn'\)\}/.test(leer('components/Header.tsx'))
    && /Registr/.test(leer('screens/RegisterScreen.tsx')));
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
