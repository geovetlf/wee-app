/*
 * PERFIL REAL = APP CLARA; PERFIL WEË = APP OSCURA. SIEMPRE.
 *
 * El tema sigue al perfil en un solo sitio (`components/TemaDelPerfil.tsx`), montado dentro del proveedor del perfil.
 * Antes dependía de que cada selector llamara a `setThemeMode`, y al cerrar sesión desde el Perfil Weë la app se quedaba
 * oscura con el Perfil Real (visto por el dueño en su teléfono, 2026-11-15).
 *
 *   node test/tema-del-perfil.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const pieza = leer('components/TemaDelPerfil.tsx');
const app = leer('App.tsx');
const tema = leer('contexts/ThemeContext.tsx');

check('1) el tema sale del perfil activo: Weë oscuro, Real claro',
  /setThemeMode\(activeProfileType === 'hidi' \? 'dark' : 'light'\)/.test(pieza));
check('2) y se vuelve a decidir cada vez que cambia el perfil, venga de donde venga',
  /useEffect\(\(\) => \{[\s\S]*?\}, \[activeProfileType\]\)/.test(pieza));
check('3) la pieza está montada dentro del proveedor del perfil',
  /<UserProfileProvider>[\s\S]*<TemaDelPerfil \/>[\s\S]*<\/UserProfileProvider>/.test(app));
check('4) la app arranca clara y el tema no se guarda en el dispositivo',
  /useState<ThemeMode>\('light'\)/.test(tema) && !/AsyncStorage/.test(tema));
check('5) nadie pide el tema del sistema: el modo oscuro del teléfono no cambia la app',
  ['components', 'screens', 'navigation', 'App.tsx'].every((d) => {
    const mirar = (p) => (fs.statSync(p).isDirectory()
      ? fs.readdirSync(p).every((f) => mirar(path.join(p, f)))
      : !/\.tsx?$/.test(p) || !/setThemeMode\('system'\)/.test(fs.readFileSync(p, 'utf8')));
    return mirar(path.join(RAIZ, d));
  }));

check('6) en la web la página declara su esquema de color: clara = «only light», para que el navegador no la oscurezca por su cuenta',
  tema.includes("document.documentElement.style.colorScheme = theme.dark ? 'dark' : 'only light'"));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
