/*
 * NINGÚN `accessibilityRole` QUE ANDROID NO CONOZCA, SIN PROTEGER POR PLATAFORMA.
 *
 * `navigation`, `main`, `banner`… son roles de la web. React Native en Android solo admite los de su lista
 * (`ReactAccessibilityDelegate.AccessibilityRole`) y con cualquier otro falla al crear la vista: la app no arranca. La web
 * lo tolera, así que solo se ve en un teléfono (visto por el dueño, 2026-11-15). El patrón del proyecto para un rol de
 * web es `accessibilityRole={Platform.OS === 'web' ? ('navigation' as never) : undefined}` (components/BarraInferior.tsx).
 *
 *   node test/roles-nativos.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* La lista se lee de React Native, no se escribe aquí. Si el paquete no está a mano, la de RN 0.81 como respaldo. */
const RESPALDO = 'none button dropdownlist togglebutton link search image imagebutton keyboardkey text adjustable summary header alert checkbox combobox menu menubar menuitem progressbar radio radiogroup scrollbar spinbutton switch tab tablist timer list grid pager scrollview horizontalscrollview viewgroup webview drawerlayout slidingdrawer iconmenu toolbar';
const JAVA = path.join(RAIZ, 'node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/uimanager/ReactAccessibilityDelegate.java');
let admitidos = new Set(RESPALDO.split(' '));
let origen = 'respaldo (RN 0.81)';
if (fs.existsSync(JAVA)) {
  const fuente = fs.readFileSync(JAVA, 'utf8');
  const ini = fuente.indexOf('enum AccessibilityRole');
  const cuerpo = fuente.slice(ini, fuente.indexOf(';', ini));
  const leidos = [...cuerpo.matchAll(/^\s{4}([A-Z_]+),?$/gm)].map((m) => m[1].toLowerCase());
  if (leidos.length > 20) { admitidos = new Set(leidos); origen = 'node_modules/react-native'; }
}
check('1) la lista de roles de Android se conoce', admitidos.has('button') && admitidos.has('header') && !admitidos.has('navigation'), `${admitidos.size} roles · ${origen}`);

const archivos = [];
const andar = (d) => {
  for (const e of fs.readdirSync(path.join(RAIZ, d), { withFileTypes: true })) {
    const rel = `${d}/${e.name}`;
    if (e.isDirectory()) andar(rel);
    else if (/\.tsx$/.test(e.name) && !/\.web\.tsx$/.test(e.name)) archivos.push(rel);
  }
};
['components', 'screens', 'navigation'].forEach(andar);
archivos.push('App.tsx');

/* Un rol literal sin proteger: `accessibilityRole="x"`, `={'x'}` o `={'x' as never}`. El protegido empieza por `Platform.OS`. */
const LITERAL = /accessibilityRole=(?:"([A-Za-z]+)"|\{\s*\(?\s*'([A-Za-z]+)')/g;
const malos = [];
let vistos = 0;
for (const rel of archivos) {
  const lineas = fs.readFileSync(path.join(RAIZ, rel), 'utf8').split('\n');
  lineas.forEach((l, i) => {
    for (const m of l.matchAll(LITERAL)) {
      vistos++;
      const rol = (m[1] || m[2]).toLowerCase();
      if (!admitidos.has(rol)) malos.push(`${rel}:${i + 1} «${rol}»`);
    }
  });
}
check(`2) ningún rol literal fuera de la lista en ${archivos.length} archivos (${vistos} roles mirados)`, malos.length === 0, malos.slice(0, 8).join(' | ') || 'limpio');

/* Los roles de web que el proyecto usa van protegidos por plataforma. */
const protegidos = archivos.filter((rel) => /accessibilityRole=\{Platform\.OS === 'web' \? \('navigation' as never\) : undefined\}/.test(fs.readFileSync(path.join(RAIZ, rel), 'utf8')));
check('3) los atajos del Home y la barra inferior llevan `navigation` solo en la web',
  protegidos.includes('components/inicio/PestanasDeInicio.tsx') && protegidos.includes('components/BarraInferior.tsx'), protegidos.join(' '));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
