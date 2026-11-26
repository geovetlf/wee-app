/*
 * LA CONFIGURACIÓN, LA BILLETERA Y SUS DIRECCIONES DENTRO DE WEË VERSIÓN CREATOR (2026-11-05).
 *
 *   1) Configuración propia de creator (`screens/AjustesCreatorScreen.tsx`): sin nada social, con idioma,
 *      ayuda, privacidad, acerca de, el panel del motor para administración y cerrar sesión por el `logout`
 *      de siempre. La configuración de la versión app (`SettingsScreen`) no se usa en creator.
 *   2) Lo que abre (Idioma, Help, EngineAdmin) está registrado en la pila de creator: se abre en su marco.
 *   3) Billetera de creator sin «Recargar» ni compras; la tienda pedida desde creator acaba en la billetera.
 *   4) `/creator/ajustes` y `/creator/billetera`: se resuelven por dirección (navegación directa y recarga)
 *      con la misma configuración de enlaces que usa App.tsx, y las direcciones de la versión app no cambian.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leer = (rel) => readFileSync(join(RAIZ, rel), 'utf8');
let fallos = 0;
const check = (nombre, ok, detalle = '') => {
  console.log(`${ok ? '✔' : '✘'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallos++;
};

const ajustes = leer('screens/AjustesCreatorScreen.tsx');
const nav = leer('navigation/EspacioProfesionalNavigator.tsx');
const billetera = leer('screens/WalletCreatorScreen.tsx');
const app = leer('App.tsx');
const espacio = leer('constants/espacioProfesional.ts');

/* 1) Configuración propia, sin lo social. */
check('1) la pila de creator ya no importa la configuración de la versión app', !/SettingsScreen/.test(nav));
check('1b) Settings de creator pinta AjustesCreatorScreen', /return <AjustesCreatorScreen \/>;/.test(nav) && /name="Settings" component=\{AjustesDeCreator\}/.test(nav));
for (const social of ['settings.myCommunities', 'settings.privateReplies', 'CommunitiesManagement', 'settings.location', 'settings.pushNotifications', 'settings.sectionContent']) {
  check(`1c) sin «${social}»`, !ajustes.includes(social));
}
for (const clave of ['settings.language', 'settings.help', 'settings.privacyPolicy', 'settings.about', 'settings.signOut']) {
  check(`1d) conserva «${clave}»`, ajustes.includes(`'${clave}'`));
}
check('1e) el panel del motor, solo para administración (misma bandera que la versión app)', /ENGINE_ADMIN_FLAG/.test(ajustes) && /engineAdmin\s*\?/.test(ajustes) && ajustes.includes("'Weë AI Engine'"));
check('1f) cerrar sesión es el logout de AuthContext, con confirmación', /const \{ user, logout \} = useAuth\(\);/.test(ajustes) && /await logout\(\);/.test(ajustes) && /confirmAction\(/.test(ajustes));
check('1g) ninguna autenticación propia', !/firebase\/auth|signOut\(|getAuth\(/.test(ajustes));
check('1h) sin sesión ofrece iniciarla en vez de «cerrar sesión»', /navigate\('Login'\)/.test(ajustes));

/* 2) Lo que abre, dentro del marco. */
for (const ruta of ['Idioma', 'Help', 'EngineAdmin']) {
  check(`2) «${ruta}» está en la pila de creator`, new RegExp(`name="${ruta}" component=`).test(nav));
}
check('2b) la entrada Configuración sigue encendida en sus pantallas', /ruta === 'Settings' \|\| ruta === 'Idioma' \|\| ruta === 'Help' \|\| ruta === 'EngineAdmin'/.test(espacio));

/* 3) Billetera sin recargas. */
check('3) la billetera de creator no tiene «Recargar»', !/credits\.topUp/.test(billetera));
check('3b) ni lleva a la tienda ni valida compras', !/navigate\('CreditStore'\)|validatePurchase|CompraPorImporte/.test(billetera));
check('3c) la tienda pedida desde creator acaba en la billetera', /name="CreditStore" component=\{SinTiendaEnCreator\}/.test(nav) && /navigation\.replace\('Wallet'\)/.test(nav));
check('3d) la billetera es de la cuenta: sin sesión pide iniciarla', /conCuentaEnCreator\(WalletCreatorScreen\)/.test(nav));

/* 4) Direcciones: las tres líneas de App.tsx solo viven en el bloque de creator. */
const inicio = app.indexOf('EspacioProfesional: {');
const bloque = inicio >= 0 ? app.slice(inicio, app.indexOf('} }),', inicio)) : '';
check('4) el bloque de creator declara ajustes y billetera', /Settings: 'ajustes'/.test(bloque) && /Wallet: 'billetera'/.test(bloque));
check('4b) «ajustes» y «billetera» no aparecen fuera del bloque', app.split("'ajustes'").length === 2 && app.split("'billetera'").length === 2);
check('4c) la versión app conserva /settings y /wallet', /\n\s+Settings: 'settings',/.test(app) && /Wallet: \{ path: 'wallet', alias: \['Wallet'\] \}/.test(app));
check('4d) el bloque de creator sigue siendo solo de la web', /!VERSION_PROFESIONAL_EN_LA_WEB \? \{\} : \{ EspacioProfesional: \{/.test(app));

/* Navegación directa y recarga: la misma resolución que hace React Navigation al abrir o recargar la dirección. */
const requerir = createRequire(join(RAIZ, 'package.json'));
let getStateFromPath;
try { ({ getStateFromPath } = requerir('@react-navigation/core')); } catch (e) { check('4e) @react-navigation/core disponible', false, String(e.message).split('\n')[0]); }
if (getStateFromPath) {
  const pantallas = Object.fromEntries([...bloque.matchAll(/^\s+(\w+): '([^']*)',?$/gm)].map((m) => [m[1], m[2]]));
  const config = { screens: { EspacioProfesional: { path: 'creator', screens: pantallas }, Settings: 'settings', Wallet: { path: 'wallet' } } };
  const destino = (ruta) => {
    const e = getStateFromPath(ruta, config);
    const r = e?.routes?.[0];
    return r ? [r.name, r.state?.routes?.[0]?.name].filter(Boolean).join('>') : 'nada';
  };
  check('4e) /creator/ajustes abre la configuración de creator', destino('/creator/ajustes') === 'EspacioProfesional>Settings', destino('/creator/ajustes'));
  check('4f) /creator/billetera abre la billetera de creator', destino('/creator/billetera') === 'EspacioProfesional>Wallet', destino('/creator/billetera'));
  check('4g) /settings sigue siendo la configuración de la versión app', destino('/settings') === 'Settings', destino('/settings'));
  check('4h) /wallet sigue siendo la billetera de la versión app', destino('/wallet') === 'Wallet', destino('/wallet'));
  check('4i) /creator sigue abriendo el Inicio de creator', destino('/creator') === 'EspacioProfesional>WeeCreator', destino('/creator'));
}
check('4j) recargar /creator/ajustes deja el Inicio debajo: «atrás» no sale a la versión app', /navigation\.reset\(\{ index: 1, routes: \[\{ name: RUTA_DE_INICIO \}/.test(nav));

/* Las claves que lee la configuración existen en español e inglés. */
const claves = [...new Set([...ajustes.matchAll(/t\('([a-zA-Z]+)\.([a-zA-Z]+)'/g)].map((m) => `${m[1]}.${m[2]}`))];
for (const idioma of ['es', 'en']) {
  const faltan = claves.filter((c) => {
    const [mod, clave] = c.split('.');
    try { return !new RegExp(`\\b${clave}\\s*:`).test(leer(`i18n/textos/${idioma}/${mod}.ts`)); } catch { return true; }
  });
  check(`5) las claves existen en ${idioma}`, faltan.length === 0, faltan.join(', ') || `${claves.length} claves`);
}

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
