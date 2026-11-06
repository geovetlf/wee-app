/*
 * RTL DE PRUEBA Y ENLACES DIRECTOS (aceptación de la migración YC, 2026-11-03). Sin emuladores: fuentes.
 *
 * 1. El modo de prueba RTL (EXPO_PUBLIC_PRUEBA_RTL=ar) solo existe en desarrollo y pone el árabe —que el catálogo ya
 *    declara `rtl`— y la dirección sale del idioma, no de un CSS forzado. Desde la integración del proyecto i18n global
 *    (2026-11-05) el árabe tiene diccionario completo y registrado, y el modo de prueba lo carga antes de pintar.
 * 2. En React Native Web, `start`/`end` absolutos se resuelven con I18nManager (LTR en la web), así que las piezas
 *    absolutas de las superficies migradas usan `alInicio`/`alFinal` del hook común.
 * 3. Las rutas nuevas (Wall, Specialist, Boost, WeëPages) tienen dirección propia: se abren y se recargan en frío.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const require = createRequire(import.meta.url);
const ts = require('typescript');
let fallos = 0;
const check = (nombre, ok, detalle = '') => {
  if (!ok) fallos++;
  console.log(`${ok ? '✔' : '✘'} ${nombre}${!ok && detalle ? ` — ${detalle}` : ''}`);
};

console.log('\n── A · El modo de prueba RTL ──');
const ctx = sinComentarios(leer('contexts/IdiomaContext.tsx'));
check('1) solo con __DEV__ y solo para `ar`', /const PRUEBA_RTL = typeof __DEV__ !== 'undefined' && __DEV__ && process\.env\.EXPO_PUBLIC_PRUEBA_RTL === 'ar';/.test(ctx));
check('2) pone el idioma árabe (no un dir forzado sin idioma)', /PRUEBA_RTL \? \{ \.\.\.resuelto, idioma: 'ar' as const, locale: 'ar' \} : resuelto/.test(ctx));
check('3) la dirección del documento sale del idioma', /document\.documentElement\.dir = sentido/.test(ctx) && /direccionDe\(resuelto\.idioma\)/.test(ctx));
const idiomas = leer('i18n/idiomas.ts');
check('4) el árabe está declarado rtl en el catálogo', /['"]?ar['"]?\s*:[\s\S]{0,400}?direccion:\s*'rtl'|codigo:\s*'ar'[\s\S]{0,400}?direccion:\s*'rtl'/.test(idiomas));
/* Antes de la integración i18n global no había diccionario árabe y esta comprobación exigía que no lo hubiera a medias. Ahora lo hay
 * completo (lo garantiza el tipo FormaDelDiccionario y i18n-arabe.test.mjs): se exige que esté registrado y que el modo de prueba lo cargue. */
check('5) el árabe es un diccionario completo y registrado, y el modo de prueba lo carga antes del primer pintado', fs.existsSync(path.join(RAIZ, 'i18n/textos/ar/index.ts')) && /^\s*ar: \{ \.\.\.ar,/m.test(leer('i18n/diccionarios.ts')) && /if \(PRUEBA_RTL\) await conTope\(almacen\.preparar\('ar'\)/.test(ctx));

console.log('\n── B · Posiciones absolutas que se invierten de verdad ──');
const js = ts.transpileModule(leer('hooks/useDireccion.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', 'require', js)(mod, mod.exports, (m) => (m.includes('IdiomaContext') ? { useIdioma: () => ({ direccion: 'rtl' }) } : require(m)));
const rtl = mod.exports.estilosDeDireccion('rtl');
const ltr = mod.exports.estilosDeDireccion('ltr');
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
check('6) alInicio/alFinal dan el lado físico en LTR', igual(ltr.alInicio(0), { left: 0 }) && igual(ltr.alFinal(8), { right: 8 }));
check('7) y lo invierten en RTL', igual(rtl.alInicio('20%'), { right: '20%' }) && igual(rtl.alFinal(0), { left: 0 }));
const kit = sinComentarios(leer('components/sectores/PiezasDeSector.tsx'));
const muro = sinComentarios(leer('components/wall/PublicacionInmersiva.tsx'));
check('8) el kit de sectores ya no usa start/end absolutos', !/\b(start|end): (0|`|scale)/.test(kit.replace(/start: \{ x|end: \{ x/g, '')) && (kit.match(/dir\.alFinal\(0\)/g) || []).length === 2 && (kit.match(/dir\.alInicio\(/g) || []).length === 2);
check('9) el Wall coloca pie y carril con el hook', /dir\.alInicio\(0\), dir\.alFinal\(scale\(72\)\)/.test(muro) && /dir\.alFinal\(scale\(8\)\)/.test(muro) && !/\b(start|end): scale/.test(muro));

console.log('\n── C · Las flechas que señalan, reflejadas ──');
for (const [rel, n] of [['screens/WallScreen.tsx', 1], ['components/boost/MarcoDeBoost.tsx', 1] /* la flecha de volver de Boost vive en su marco común (docs/BOOST.md) */, ['components/creator/CabeceraDeSeccion.tsx', 2], ['components/wall/PublicacionInmersiva.tsx', 1]]) {
  const src = sinComentarios(leer(rel));
  const flechas = src.match(/<Ionicons name="(arrow|chevron)-(back|forward)"[^>]*\/>/g) || [];
  check(`10) ${rel}: sus ${n} flecha(s) llevan dir.espejo`, flechas.length >= n && flechas.every((f) => /style=\{dir\.espejo\}/.test(f)), flechas.filter((f) => !/dir\.espejo/.test(f)).join(' '));
}

console.log('\n── D · Enlaces directos ──');
const app = leer('App.tsx');
check('11) initialRouteName Main: la pila conserva el Home debajo de un enlace directo', /initialRouteName: 'Main'/.test(app));
for (const [ruta, camino] of [['Specialist', 'weeai/seccion/:id'], ['Wall', 'wall'], ['Boost', 'boost/:tipo/:id'], ['WeePages', 'pages'], ['WeePage', 'page/:pageId']]) {
  check(`12) ${ruta} → /${camino}, con el nombre antiguo como alias`, new RegExp(`${ruta}: \\{ path: '${camino.replace(/[/:]/g, (c) => '\\' + c)}', alias: \\['${ruta}'\\] \\}`).test(app));
}
check('13) WeeBiz ya no tiene dirección (retirado el 2026-11-03)', !/WeeBiz/.test(sinComentarios(app)));

console.log('\n── E · Portadas fieles a la referencia, sin partir palabras ──');
const design = sinComentarios(leer('components/sectores/PortadaDesign.tsx'));
const studio = sinComentarios(leer('components/studio/PortadaStudio.tsx'));
check('14) Design: creación rápida con velo suave y «Explora» teñida, como su referencia', /<RejillaDeAccesos\s+suaves/.test(design) && /<TarjetasDescritas\s+tintadas/.test(design));
check('15) Studio: creación rápida suave; «Más herramientas» blanca y en una línea', /<RejillaDeAccesos\s+suaves/.test(studio) && /<TarjetasDescritas\s+tarjetas=/.test(studio) && /const enLinea = !c\.descripcion && porFila < 3 && !grandes;/.test(kit));
check('16) por debajo de 360 px, una tarjeta descrita por fila (no se parten nombres ni se cortan descripciones)', /const porFila = width < 360 \? 1 : columnas;/.test(kit) && /width: \x60\$\{100 \/ porFila\}%\x60/.test(kit));

console.log('\n── F · Cobertura de flechas en TODA la app (2026-11-04) ──');
// Un solo icono direccional común: refleja solo nombres que señalan y solo en RTL; en LTR es el Ionicons de siempre.
const icoSrc = leer('components/IconoDireccional.tsx');
const icoJs = ts.transpileModule(icoSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React } }).outputText;
const icoMod = { exports: {} };
new Function('module', 'exports', 'require', icoJs)(icoMod, icoMod.exports, (m) => (m === 'react' ? { createElement: () => null } : m.includes('useDireccion') ? { useDireccion: () => rtl } : {}));
const esDir = icoMod.exports.esIconoDireccional;
check('17) IconoDireccional reconoce las flechas que señalan', ['arrow-back', 'arrow-forward', 'chevron-back', 'chevron-forward', 'arrow-forward-outline', 'chevron-back-circle', 'caret-forward'].every(esDir));
check('18) y deja intactos los que no señalan', !['chevron-up', 'chevron-down', 'arrow-up', 'arrow-down', 'heart', 'checkmark', 'play-forward', undefined, 42].some(esDir));
check('19) refleja solo en RTL (`dir.esRTL`) y con el `espejo` del hook, sin transform propio', /dir\.esRTL && esIconoDireccional\(resto\.name\)/.test(icoSrc) && /reflejar \? \[dir\.espejo, style\] : style/.test(icoSrc) && !/scaleX/.test(sinComentarios(icoSrc)));
check('20) el hook da las flechas de texto en los dos sentidos', igual(ltr.flecha, { adelante: '→', siguiente: '›' }) && igual(rtl.flecha, { adelante: '←', siguiente: '‹' }));

// Recorre todo el cliente: ninguna flecha de Ionicons escrita a mano sin reflejo, ninguna flecha de texto fija.
const CARPETAS = ['components', 'screens', 'navigation', 'constants', 'hooks', 'utils'];
const fuentes = [];
const recorrer = (rel) => {
  for (const e of fs.readdirSync(path.join(RAIZ, rel), { withFileTypes: true })) {
    const r = `${rel}/${e.name}`;
    if (e.isDirectory()) recorrer(r);
    else if (/\.tsx?$/.test(e.name)) fuentes.push(r);
  }
};
CARPETAS.forEach(recorrer);
fuentes.push('App.tsx');
const NOMBRE_DIR = /['"](?:arrow|chevron|caret)-(?:back|forward|left|right)(?:-outline|-sharp|-circle(?:-outline|-sharp)?)?['"]/;
const sinReflejo = [];
let comunes = 0;
const literalesSueltos = [];
const flechasDeTexto = [];
// Literales permitidos fuera de una etiqueta de icono, cada uno con su porqué (y comprobado en 24).
const PERMITIDOS = {
  'components/Header.tsx': 'mapa WEB_ICONS: fallback de texto sin uso; la flecha web se refleja con dir.espejo',
  'constants/camaraCinematica.ts': '«pan» describe un movimiento de cámara, no un sentido de navegación',
  'screens/BrainChatScreen.tsx': 'va al Chip de creator/ui.tsx, que pinta con IconoDireccional',
  'components/sectores/PortadaFashion.tsx': 'va a TarjetaDestacada, que refleja flechas y cheurones con dir.espejo',
  'screens/OnboardingScreen.tsx': 'getButtonIcon() se pinta con IconoDireccional',
};
for (const rel of fuentes) {
  if (rel === 'components/IconoDireccional.tsx') continue;
  const src = sinComentarios(leer(rel));
  for (const tag of src.match(/<Ionicons\b[\s\S]*?\/>/g) || []) {
    if (NOMBRE_DIR.test(tag) && !/dir\.espejo/.test(tag)) sinReflejo.push(`${rel}: ${tag.replace(/\s+/g, ' ').slice(0, 80)}`);
  }
  comunes += (src.match(/<IconoDireccional\b/g) || []).length;
  const fuera = src.replace(/<(?:Ionicons|IconoDireccional)\b[\s\S]*?\/>/g, '');
  if (NOMBRE_DIR.test(fuera) && !PERMITIDOS[rel]) literalesSueltos.push(rel);
  // Una flecha de texto vale solo si su propio Text se refleja (la del Header web).
  if (/\.tsx$/.test(rel) && /[→←›‹]\s*<\/Text>/.test(src.replace(/dir\.espejo\]\}>[←→]<\/Text>/g, ''))) flechasDeTexto.push(rel);
}
check('21) ninguna flecha de Ionicons sin reflejo en todo el cliente', sinReflejo.length === 0, sinReflejo.join(' | '));
check(`22) las flechas pasan por el icono común (${comunes} usos; suelo 74, el barrido del 2026-11-04)`, comunes >= 74);
check('23) ningún nombre de flecha suelto fuera de los permitidos con motivo', literalesSueltos.length === 0, literalesSueltos.join(', '));
const ui = sinComentarios(leer('components/creator/ui.tsx'));
const onboarding = sinComentarios(leer('screens/OnboardingScreen.tsx'));
check('24) los permitidos siguen cumpliendo su motivo', /<IconoDireccional name=\{icon as any\}/.test(ui) && (onboarding.match(/<IconoDireccional name=\{getButtonIcon\(\)\}/g) || []).length === 2 && /style=\{\[\{ fontSize: 20, color: textColor \}, dir\.espejo\]\}>←<\/Text>/.test(sinComentarios(leer('components/Header.tsx'))) && /ctaIcono\) \? dir\.espejo/.test(kit));
check('25) ninguna flecha de texto fija delante de </Text>: se escribe con dir.flecha', flechasDeTexto.length === 0, flechasDeTexto.join(', '));

console.log(fallos ? `\n✘ ${fallos} fallos` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
