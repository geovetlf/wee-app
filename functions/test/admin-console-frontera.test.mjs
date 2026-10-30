/**
 * LAS FRONTERAS DE WEË ADMIN CONSOLE (Unidad 1: solo lectura, solo emuladores).
 *
 *   node test/admin-console-frontera.test.mjs
 *
 * Estática y sin dependencias: solo lee archivos. No necesita instalar nada, así que corre igual en la CI de la raíz.
 * Lo que comprueba (cada punto es una promesa de la consola):
 *   1. es una app aparte: su propio package.json, y la raíz ni la declara ni la trae como dependencia;
 *   2. no importa pantallas, componentes, servicios, contextos ni hooks de la app de usuario: de fuera de su carpeta
 *      solo lee el traductor puro de Weë (`i18n/traducir|resolver|formato|idiomas`);
 *   3. no usa firebase-admin ni Firestore/Storage/Database: no puede leer ni escribir un documento por su cuenta;
 *   4. `httpsCallable` está en un solo archivo y la lista de acciones es EXACTAMENTE la de la Unidad 1;
 *   5. ninguna acción de escritura aparece en el código del cliente;
 *   6. no hay secretos, claves de proveedor, credenciales ni archivos .env con valores;
 *   7. el texto visible pasa por el traductor (ni texto suelto en el JSX ni atributos accesibles escritos a mano);
 *   8. el acceso denegado sustituye a la consola antes de pintar ninguna vista, y el menú espera a que el servidor
 *      confirme el permiso;
 *   9. el script de administrador local se niega fuera de un emulador demo-* de esta máquina;
 *  10. la raíz aísla la carpeta (tsconfig, Metro) y esta suite está en la cadena de `npm test`;
 *  11. Credits no muestra planes, paquetes ni precios (Weë no los tiene) y la referencia es US$ 1 = 100 Credits.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../..');
const CONSOLA = path.join(RAIZ, 'admin-console');
const SRC = path.join(CONSOLA, 'src');

let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const leer = (p) => fs.readFileSync(p, 'utf8');

const andar = (dir, filtro) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  if (['node_modules', 'dist', '.vite'].includes(e.name)) return [];
  const p = path.join(dir, e.name);
  return e.isDirectory() ? andar(p, filtro) : filtro(p) ? [p] : [];
});
const esCodigo = (p) => /\.(ts|tsx|mjs)$/.test(p);
const esPrueba = (p) => /\.test\.(ts|tsx|mjs)$/.test(p) || p.includes(`${path.sep}pruebas${path.sep}`);
const rel = (p) => path.relative(RAIZ, p).split(path.sep).join('/');
const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const ARCHIVOS_SRC = andar(SRC, esCodigo);
const CODIGO_DE_LA_APP = ARCHIVOS_SRC.filter((p) => !esPrueba(p));

/* ── 1 · una app aparte ─────────────────────────────────────────────────── */
{
  const paquete = JSON.parse(leer(path.join(CONSOLA, 'package.json')));
  const raiz = JSON.parse(leer(path.join(RAIZ, 'package.json')));
  check('1a. admin-console tiene su propio package.json (private)', paquete.name === 'wee-admin-console' && paquete.private === true);
  check('1b. la raíz no la declara como workspace ni como dependencia', !raiz.workspaces && !JSON.stringify({ ...raiz.dependencies, ...raiz.devDependencies }).includes('admin-console'));
  const dependencias = Object.keys({ ...paquete.dependencies, ...paquete.devDependencies });
  const prohibidas = ['firebase-admin', 'react-native', 'react-native-web', 'expo', 'google-auth-library', '@google-cloud/firestore', '@google-cloud/storage'];
  check('1c. sin paquetes de servidor ni de la app móvil', prohibidas.every((d) => !dependencias.includes(d) && !dependencias.some((x) => x.startsWith('expo-') || x.startsWith('@react-native'))), dependencias.filter((d) => prohibidas.includes(d)).join(','));
}

/* ── 2 y 3 · imports ────────────────────────────────────────────────────── */
const IMPORTS = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;
const importsDe = (codigo) => [...sinComentarios(codigo).matchAll(IMPORTS)].map((m) => m[1] || m[2] || m[3] || m[4]);

const DE_LA_RAIZ_PERMITIDO = ['i18n/traducir.ts', 'i18n/resolver.ts', 'i18n/formato.ts', 'i18n/idiomas.ts'];
const PAQUETES_PERMITIDOS = [/^react$/, /^react-dom(\/client)?$/, /^react\/jsx-runtime$/, /^firebase\/(app|auth|functions)$/, /^vitest(\/.*)?$/, /^vite$/, /^@vitejs\/plugin-react$/, /^@testing-library\/(react|user-event|jest-dom\/vitest)$/, /^node:/, /^vitest\/config$/];
{
  const malos = [];
  const deFuera = new Set();
  for (const archivo of ARCHIVOS_SRC.concat(path.join(CONSOLA, 'vite.config.ts'))) {
    for (const spec of importsDe(leer(archivo))) {
      if (spec.startsWith('.')) {
        const destino = path.resolve(path.dirname(archivo), spec);
        if (destino.startsWith(CONSOLA + path.sep)) continue;
        const r = rel(destino);
        deFuera.add(r);
        if (!DE_LA_RAIZ_PERMITIDO.some((ok) => r === ok.replace(/\.ts$/, ''))) malos.push(`${rel(archivo)} → ${r}`);
      } else if (!PAQUETES_PERMITIDOS.some((re) => re.test(spec))) {
        malos.push(`${rel(archivo)} → ${spec}`);
      }
    }
  }
  check('2. de fuera de admin-console solo se lee el traductor puro y los paquetes de la lista', malos.length === 0, malos.join(' | '));
  check('2b. y sí lo usa (no hay un traductor paralelo)', [...deFuera].some((r) => r === 'i18n/traducir') && [...deFuera].some((r) => r === 'i18n/resolver'), [...deFuera].join(','));
  const todo = CODIGO_DE_LA_APP.map(leer).join('\n');
  check('3a. nada de firebase-admin, Firestore, Storage ni Realtime Database', !/firebase-admin|firebase\/(firestore|storage|database)|getFirestore|getStorage|getDatabase/.test(sinComentarios(todo)));
  check('3b. Firebase se toca en un solo archivo (firebase.ts)', CODIGO_DE_LA_APP.filter((p) => /from\s*['"]firebase\//.test(sinComentarios(leer(p)))).map(rel).join() === 'admin-console/src/firebase.ts');
}

/* ── 4 y 5 · la lista permitida ─────────────────────────────────────────── */
const ESPERADAS = [
  'creditsAdmin.balance', 'creditsAdmin.costs', 'creditsAdmin.failed', 'creditsAdmin.stats', 'creditsAdmin.userHistory',
  'engineAdmin.status', 'moderationAdmin.history', 'moderationAdmin.list',
];
{
  const acciones = sinComentarios(leer(path.join(SRC, 'api/acciones.ts')));
  const pares = [...acciones.matchAll(/'(\w+\.\w+)':\s*\{\s*callable:\s*'(\w+)',\s*accion:\s*'(\w+)'/g)];
  const claves = pares.map((m) => m[1]).sort();
  check('4a. la lista permitida es exactamente la de la Unidad 1', JSON.stringify(claves) === JSON.stringify(ESPERADAS), claves.join(','));
  check('4b. cada clave es «callable.accion» de verdad', pares.every((m) => m[1] === `${m[2]}.${m[3]}`));
  check('4c. solo tres callables', JSON.stringify([...new Set(pares.map((m) => m[2]))].sort()) === JSON.stringify(['creditsAdmin', 'engineAdmin', 'moderationAdmin']));
  const conHttps = CODIGO_DE_LA_APP.filter((p) => /httpsCallable\s*\(/.test(sinComentarios(leer(p)))).map(rel);
  check('4d. httpsCallable solo está en firebase.ts', conHttps.join() === 'admin-console/src/firebase.ts', conHttps.join());

  const ESCRITURAS = ['setProvider', 'setRouting', 'setSettings', 'seedDefaults', 'resetHealth', 'setCost', 'grantCredits', 'refundCredits', 'spendCredits', 'validatePurchase', 'restorePurchase', 'evalRun', 'mediaCanary', 'deleteAsset', 'aiSettings', 'aiProviders', 'aiRouting'];
  const hallazgos = [];
  for (const archivo of CODIGO_DE_LA_APP) {
    const codigo = sinComentarios(leer(archivo));
    for (const palabra of ESCRITURAS) if (new RegExp(`\\b${palabra}\\b`).test(codigo)) hallazgos.push(`${rel(archivo)}: ${palabra}`);
    if (/accion:\s*'review'|action:\s*'review'|'review'/.test(codigo)) hallazgos.push(`${rel(archivo)}: review`);
  }
  check('5. ninguna acción de escritura aparece en el código del cliente', hallazgos.length === 0, hallazgos.join(' | '));
  check('5b. el cliente pone `action` el último (no se puede sobrescribir)', /datos\.action\s*=\s*definicion\.accion/.test(leer(path.join(SRC, 'api/cliente.ts'))));
}

/* ── 6 · secretos ───────────────────────────────────────────────────────── */
{
  const todos = andar(CONSOLA, (p) => !p.endsWith('package-lock.json') && !/\.(png|ico|svg)$/.test(p));
  const patrones = [
    [/AIza[0-9A-Za-z_-]{20,}/, 'clave de API de Google'],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'clave privada'],
    [/"private_key"\s*:/, 'service account'],
    [/\b(?:sk|pk)-[A-Za-z0-9]{20,}/, 'clave de proveedor'],
    [/\b[A-Z][A-Z0-9_]*(?:API_KEY|SECRET|TOKEN|PASSWORD)\s*[=:]\s*['"]?[A-Za-z0-9_\-/+=]{12,}/, 'secreto asignado'],
  ];
  const hallazgos = [];
  for (const archivo of todos) {
    const texto = leer(archivo);
    for (const [re, que] of patrones) if (re.test(texto)) hallazgos.push(`${rel(archivo)}: ${que}`);
  }
  check('6a. sin claves, credenciales ni secretos en admin-console', hallazgos.length === 0, hallazgos.join(' | '));
  /* Un `.env.local` del desarrollador existe en disco pero git lo ignora; cualquier otro `.env*` sería versionable, y la
     regla 12 de entrega-configuracion solo admite los dos `.env.example` de la raíz y de functions/. */
  const envs = fs.readdirSync(CONSOLA).filter((f) => f.startsWith('.env') && !f.endsWith('.local'));
  const plantilla = path.join(CONSOLA, 'entorno.ejemplo');
  check('6b. sin archivos .env versionables; la plantilla es entorno.ejemplo y solo trae variables VITE_ del emulador', envs.length === 0
    && fs.existsSync(plantilla)
    && !/(^|\/)\.env(\.|$)/.test(rel(plantilla))
    && leer(plantilla).split('\n').filter((l) => l && !l.startsWith('#')).every((l) => /^VITE_(FIREBASE_PROJECT_ID|AUTH_EMULATOR_(HOST|PORT)|FUNCTIONS_EMULATOR_(HOST|PORT))=[\w.\-]*$/.test(l)), envs.join());
  check('6c. el script local no guarda ni trae contraseñas por defecto', !/password\s*[:=]\s*['"][^'"]+['"]/i.test(sinComentarios(leer(path.join(CONSOLA, 'scripts/admin-local.mjs')))));
}

/* ── 7 · el texto visible pasa por el traductor ─────────────────────────── */
export const textosSueltos = (codigo) => {
  const limpio = sinComentarios(codigo);
  const hallazgos = [];
  for (const m of limpio.matchAll(/<[A-Za-z][^<>]*>\s*([^<>{}\n]*[A-Za-zÀ-ÿ][^<>{}\n]*?)\s*<\//g)) hallazgos.push(m[1].trim());
  for (const m of limpio.matchAll(/^\s*([^<>{}\n='"`;()]*[A-Za-zÀ-ÿ]{3,}[^<>{}\n='"`;()]*)$/gm)) {
    /* línea de texto dentro de un elemento JSX en varias líneas: la anterior abre un tag y la siguiente lo cierra */
    const antes = limpio.slice(0, m.index).trimEnd();
    const despues = limpio.slice(m.index + m[0].length).trimStart();
    if (antes.endsWith('>') && !antes.endsWith('=>') && /^<\//.test(despues) && /<[A-Za-z][^<>]*>$/.test(antes.split('\n').slice(-1)[0] || '')) hallazgos.push(m[1].trim());
  }
  for (const m of limpio.matchAll(/\b(?:placeholder|title|aria-label|alt|label)="([^"{]*[A-Za-zÀ-ÿ][^"]*)"/g)) hallazgos.push(`${m[0]}`);
  return hallazgos;
};
{
  check('7a. el detector pilla texto suelto y deja pasar t(…)', textosSueltos('<p>Hola</p>').length === 1
    && textosSueltos('<button title="Cerrar">{t("a")}</button>').length === 1
    && textosSueltos('<p>{t("a")}</p>').length === 0 && textosSueltos('<p className="x">{valor}</p>').length === 0);
  const malos = [];
  for (const archivo of CODIGO_DE_LA_APP.filter((p) => p.endsWith('.tsx'))) for (const h of textosSueltos(leer(archivo))) malos.push(`${rel(archivo)}: ${h}`);
  check('7b. ningún texto visible escrito a mano en los .tsx', malos.length === 0, malos.join(' | '));
  const claves = andar(SRC, (p) => /i18n\/(es|en)\.ts$/.test(p.split(path.sep).join('/')));
  check('7c. el diccionario propio solo existe en es y en (y usa el traductor de Weë)', claves.length === 2 && /crearTraductor/.test(leer(path.join(SRC, 'i18n/i18n.tsx'))));
  /* El idioma (solo es/en, español por defecto) es lo único que la consola guarda en el navegador: nada de sesiones,
     tokens ni datos administrativos en almacenamiento, y sin el AsyncStorage de la app de usuario. */
  const i18n = sinComentarios(leer(path.join(SRC, 'i18n/i18n.tsx')));
  const conAlmacen = CODIGO_DE_LA_APP.filter((p) => /localStorage|sessionStorage|indexedDB|document\.cookie|AsyncStorage/.test(sinComentarios(leer(p)))).map(rel);
  check('7d. solo i18n.tsx toca el almacenamiento del navegador, y solo localStorage', conAlmacen.join() === 'admin-console/src/i18n/i18n.tsx' && !/sessionStorage|indexedDB|document\.cookie|AsyncStorage/.test(i18n));
  check('7e. guarda únicamente la clave del idioma (es|en), con el español por defecto', /CLAVE_DE_IDIOMA\s*=\s*'wee-admin-console\.idioma'/.test(i18n)
    && [...i18n.matchAll(/localStorage\.(?:get|set)Item\(([^,)]+)/g)].every((m) => m[1].trim() === 'CLAVE_DE_IDIOMA')
    && /IDIOMAS_DE_LA_CONSOLA\s*=\s*\['es',\s*'en'\]\s*as const/.test(i18n) && /IDIOMA_POR_DEFECTO[^=]*=\s*'es'/.test(i18n));
  check('7f. el idioma activo se refleja en <html lang> y el navegador no decide el idioma', /document\.documentElement\.lang\s*=\s*idioma/.test(i18n) && !/navigator\./.test(i18n));
}

/* ── 8 · acceso denegado ────────────────────────────────────────────────── */
{
  const consola = sinComentarios(leer(path.join(SRC, 'vistas/Consola.tsx')));
  const iDenegado = consola.indexOf('if (rechazo) return <AccesoDenegado');
  const iVistas = consola.indexOf('<ContextoDeCliente.Provider');
  check('8a. la pantalla de acceso denegado sustituye a la consola ANTES de pintar vistas', iDenegado > 0 && iVistas > iDenegado);
  check('8b. cualquier respuesta «denegado» o «sin-sesion» activa el rechazo', /tipo === 'denegado' \|\| tipo === 'sin-sesion'/.test(consola));
  const denegado = sinComentarios(leer(path.join(SRC, 'vistas/AccesoDenegado.tsx')));
  check('8c. la pantalla de acceso denegado no pide ni recibe datos', !/useCliente|useAccion|llamar\(/.test(denegado));
  const iComprobacion = consola.indexOf('<ComprobacionDePermiso>');
  const iInterior = consola.indexOf('<Interior ');
  check('8d. el menú y las vistas solo se pintan DENTRO de la comprobación de permiso con el servidor', iComprobacion > iVistas && iInterior > iComprobacion
    && /useAccion\('engineAdmin\.status'/.test(consola) && /estado\.fase === 'ok'\) return <>\{children\}<\/>/.test(consola));
}

/* ── 11 · Credits: sin planes ni paquetes, conversión de referencia US$ 1 = 100 ── */
{
  const malos = ARCHIVOS_SRC.filter((p) => !esPrueba(p))
    .filter((p) => /black\s*pro|blackpro|CREDIT_PACKAGES|raiz\.packages|priceUsd|precioUsd/i.test(sinComentarios(leer(p))))
    .map(rel);
  check('11a. el código de la consola no lee ni pinta planes, paquetes ni precios (Black Pro incluido)', malos.length === 0, malos.join(' | '));
  const textos = ['es', 'en'].map((i) => leer(path.join(SRC, `i18n/${i}.ts`))).join('\n');
  check('11b. los diccionarios no tienen claves de paquetes ni planes', !/^\s*(paquetes?|paquete|precioUsd|plan(es)?|packages?)\s*:/m.test(textos) && !/black\s*pro/i.test(textos));
  check('11c. la conversión de referencia es US$ 1 = 100 Credits', /CREDITS_POR_USD_DE_REFERENCIA\s*=\s*100;/.test(leer(path.join(SRC, 'api/modelos.ts'))));
}

/* ── 9 · el script de administrador local ───────────────────────────────── */
{
  const { motivosParaNoUsar } = await import(pathToFileURL(path.join(CONSOLA, 'scripts/admin-local.mjs')).href);
  const bien = { proyecto: 'demo-wee', emulador: '127.0.0.1:9099', env: {} };
  check('9a. con demo-wee en 127.0.0.1 se puede usar', motivosParaNoUsar(bien).length === 0);
  check('9b. se niega con un proyecto real', motivosParaNoUsar({ ...bien, proyecto: 'get-wee' }).length > 0 && motivosParaNoUsar({ ...bien, proyecto: undefined }).length > 0);
  check('9c. se niega con un host que no es de esta máquina', ['identitytoolkit.googleapis.com:443', '10.0.0.4:9099', '0.0.0.0:9099', '127.0.0.1.evil.com:9099'].every((e) => motivosParaNoUsar({ ...bien, emulador: e }).length > 0));
  check('9d. se niega sin puerto', motivosParaNoUsar({ ...bien, emulador: '127.0.0.1' }).length > 0);
  check('9e. se niega si hay credenciales de Google o un proyecto real en el entorno', motivosParaNoUsar({ ...bien, env: { GOOGLE_APPLICATION_CREDENTIALS: '/x.json' } }).length > 0 && motivosParaNoUsar({ ...bien, env: { GCLOUD_PROJECT: 'get-wee' } }).length > 0);
  const codigo = sinComentarios(leer(path.join(CONSOLA, 'scripts/admin-local.mjs')));
  check('9f. no importa firebase-admin y solo habla con el host validado', !/firebase-admin|googleapis\.com\/(?!v1)/.test(codigo.replace(/\/identitytoolkit\.googleapis\.com/g, '')) && !/https:\/\//.test(codigo));
}

/* ── 10 · aislamiento en la raíz ────────────────────────────────────────── */
{
  const tsconfig = JSON.parse(leer(path.join(RAIZ, 'tsconfig.json')));
  check('10a. el tsconfig de la raíz deja fuera admin-console', (tsconfig.exclude || []).includes('admin-console'));
  check('10b. Metro (la app de usuario) no resuelve admin-console', /projectDir\('admin-console'\)/.test(leer(path.join(RAIZ, 'metro.config.js'))));
  const cadena = JSON.parse(leer(path.join(RAIZ, 'functions/package.json'))).scripts.test;
  check('10c. esta suite está en la cadena de `npm test`', cadena.includes('node test/admin-console-frontera.test.mjs'));
  const vite = leer(path.join(CONSOLA, 'vite.config.ts'));
  check('10d. el servidor de desarrollo solo escucha en 127.0.0.1 y solo sirve su carpeta y ../i18n', /host:\s*'127\.0\.0\.1'/.test(vite) && /allow:\s*\[__dirname,\s*path\.resolve\(__dirname,\s*'\.\.\/i18n'\)\]/.test(vite));
}

console.log(failures ? `\n${failures} comprobación(es) fallida(s).` : '\nTodas las comprobaciones pasan.');
process.exit(failures ? 1 : 0);
