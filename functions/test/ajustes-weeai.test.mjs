/*
 * LOS AJUSTES DE UNA CREACIÓN CAMBIAN CON LO QUE SE ESTÁ CREANDO.
 *
 * Decisión de producto (2026-09-15): en Weë Studio los ajustes dejan de ser una
 * lista fija. Mientras no se sabe qué quiere hacer la persona se preguntan solo
 * las cosas que valen para cualquier creación; en cuanto hay un video aparece
 * "Duración" —y jamás antes, solo por estar dentro del Studio—. Las opciones se
 * deslizan en horizontal en vez de envolverse, para que ninguna quede escondida
 * en un teléfono de 360.
 *
 * Lo que se vigila aquí:
 *
 *  A. la TABLA, ejecutada: qué grupos salen en cada contexto, y en qué orden;
 *  B. las REGLAS, ejecutadas: de dónde sale el contexto y de dónde la duración,
 *     sin llamar a nadie —esto no gasta Credits ni toca ninguna API—;
 *  C. la HOJA: filas que se deslizan, píldoras que se tocan y una sola marcada;
 *  D. que lo use Weë Studio y que las demás experiencias sigan sin tocar.
 *
 * Cada grupo lleva su control, para que un verde no pueda ser un verde vacío.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ts = require('typescript');

/* Se ejecuta el módulo de verdad: se transpila, se le quitan los imports de tipos y se llama. */
const ejecutar = (ruta, devuelve) => {
  const js = ts.transpileModule(leer(ruta), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const cuerpo = js
    .replace(/^\s*import[^;]*;\s*$/gm, '')
    .replace(/^(\s*)export (const|function|let|var) /gm, '$1$2 ');
  return new Function(`${cuerpo}\n return ${devuelve};`)();
};

console.log('\n─── A. La tabla, ejecutada ───');

const { GRUPOS_DE_AJUSTES, ajustesDe } = ejecutar('constants/ajustesContextuales.ts', '{ GRUPOS_DE_AJUSTES, ajustesDe }');
const ids = (contexto) => ajustesDe(contexto).map((g) => g.id);

check('1) sin saber qué se crea, solo lo que vale para todo',
  ids('general').join(' · ') === 'format · quality · style · references', ids('general').join(' · '));
check('2) una imagen pregunta lo suyo, en su orden',
  ids('imagen').join(' · ') === 'format · quality · resolution · style · variations · references', ids('imagen').join(' · '));
check('3) un video pregunta lo suyo, con la duración la segunda',
  ids('video').join(' · ') === 'format · duration · quality · motion · style · references', ids('video').join(' · '));
check('4) "Duración" no aparece en ningún otro contexto',
  ['general', 'imagen', 'voz', 'texto', 'documento'].every((c) => !ids(c).includes('duration')));
check('5) y las duraciones son las que Weë sabe hacer',
  GRUPOS_DE_AJUSTES.find((g) => g.id === 'duration').opciones.map((o) => o.id).join(' · ') === 'auto · 5s · 10s · 15s');
check('6) cada grupo abre con "Automático", salvo el que no se elige aquí',
  GRUPOS_DE_AJUSTES.every((g) => g.opciones.length === 0 || g.opciones[0].id === 'auto'),
  GRUPOS_DE_AJUSTES.filter((g) => g.opciones.length && g.opciones[0].id !== 'auto').map((g) => g.id).join(' · ') || 'todos');
check('7) la tabla guarda CLAVES, no frases',
  GRUPOS_DE_AJUSTES.every((g) => /^studio\./.test(g.clave) && g.opciones.every((o) => /^studio\./.test(o.clave))));

/* Y las claves existen en los dos idiomas. */
const claves = new Set(GRUPOS_DE_AJUSTES.flatMap((g) => [g.clave, ...g.opciones.map((o) => o.clave)]));
for (const idioma of ['es', 'en']) {
  const diccionario = leer(`i18n/textos/${idioma}/studio.ts`);
  const faltan = [...claves].filter((c) => !new RegExp(`^\\s*${c.replace('studio.', '')}:`, 'm').test(diccionario));
  check(`8) todas las claves existen en ${idioma}`, faltan.length === 0, faltan.join(' · '));
}

/* CONTROL: si un grupo perdiera sus contextos, dejaría de salir y se vería. */
check('CONTROL: un grupo sin contexto no sale en ninguno',
  ajustesDe('imagen', [{ id: 'fantasma', clave: 'studio.optFormat', contextos: [], opciones: [] }]).length === 0,
  'si esto pasara, el grupo A no protegería nada');

console.log('\n─── B. Las reglas, ejecutadas ───');

const { contextoDeCreacion, duracionEnElTexto } = ejecutar('utils/contextoDeCreacion.ts', '{ contextoDeCreacion, duracionEnElTexto }');

check('9) al entrar, sin puerta ni texto, no se sabe', contextoDeCreacion(null, '') === 'general');
check('9) y "Más herramientas" tampoco lo dice', contextoDeCreacion('more', '') === 'general');
check('10) la puerta manda: Videos es video', contextoDeCreacion('videos', 'un cartel para la tienda') === 'video');
check('10) y cada puerta lleva a lo suyo',
  ['images', 'voice', 'writer', 'documents'].map((p) => contextoDeCreacion(p, '')).join(' · ') === 'imagen · voz · texto · documento');
check('11) sin puerta, lo escrito basta para un video', contextoDeCreacion(null, 'Quiero un video de 10 segundos') === 'video');
check('11) y para una imagen', contextoDeCreacion(null, 'Un cartel para la cafetería') === 'imagen');
check('11) pero una frase cualquiera no inventa medio', contextoDeCreacion(null, 'algo bonito para mi negocio') === 'general');

check('12) "de 10 segundos" deja la duración en 10 s', duracionEnElTexto('Quiero un video de 10 segundos') === '10s');
check('12) "15s" también', duracionEnElTexto('un clip de 15s') === '15s');
check('12) y un número raro se lleva a la más cercana', duracionEnElTexto('un video de 7 segundos') === '5s' && duracionEnElTexto('un video de 12 segundos') === '10s');
check('12) sin número, no se sugiere nada', duracionEnElTexto('un video corto') === null && duracionEnElTexto('') === null);

/* CONTROL: la regla tiene que poder decir que no. */
check('CONTROL: una frase sin nada no devuelve contexto ni duración',
  contextoDeCreacion(null, 'hola') === 'general' && duracionEnElTexto('hola') === null,
  'si esto pasara, el grupo B no protegería nada');

console.log('\n─── C. La hoja: se desliza, se toca y se ve lo elegido ───');

const hoja = leer('components/creator/AjustesContextuales.tsx');
check('13) cada fila de opciones es un carrusel horizontal',
  /<ScrollView\s+horizontal/.test(hoja) && /showsHorizontalScrollIndicator=\{false\}/.test(hoja));
check('13) y ninguna fila se envuelve', !/flexWrap/.test(hoja));
check('14) la fila se desplaza sola, de borde a borde de la hoja',
  /marginHorizontal: -SPACING\.xl/.test(hoja) && /paddingHorizontal: SPACING\.xl/.test(hoja));
/* 40 de alto y sin `scale()`: en web encogería un 10 % y un dedo no encoge. */
check('15) las píldoras se tocan cómodo, sin encoger en web',
  /const ALTO_DE_PILDORA = 40;/.test(hoja) && !/const ALTO_DE_PILDORA = scale\(/.test(hoja)
  && (hoja.match(/minHeight: ALTO_DE_PILDORA/g) || []).length === 2);
check('16) el amarillo es solo de la elegida',
  /puesta \? theme\.colors\.glow : theme\.colors\.surface/.test(hoja) && /puesta \? theme\.colors\.accent : theme\.colors\.border/.test(hoja));
check('16) y la elegida se dice también en voz alta', /accessibilityState=\{\{ selected: puesta \}\}/.test(hoja));
check('17) lo elegido a mano manda sobre lo sugerido',
  /elegido\[grupo\.id\] \?\? sugerido\?\.\[grupo\.id\] \?\? grupo\.opciones\[0\]\.id/.test(hoja));
check('18) la hoja reserva la barra del sistema, como la de Crear',
  /Math\.max\(insets\.bottom, SPACING\.lg\)/.test(hoja));
check('19) y no llama a nadie: esto no gasta Credits',
  !/services\/|firebase|fetch\(|credits/i.test(hoja) && !/services\/|firebase|fetch\(/i.test(leer('utils/contextoDeCreacion.ts')));

/* CONTROL: si las filas volvieran a envolverse, se vería. */
check('CONTROL: una fila envuelta sería detectada', /flexWrap/.test("opciones: { flexWrap: 'wrap' }"),
  'si esto pasara, el grupo C no protegería nada');

console.log('\n─── D. Lo usa el Studio; las demás, sin tocar ───');

const studio = leer('screens/StudioScreen.tsx');
check('20) Weë Studio abre sus ajustes con el contexto', /<AjustesContextuales/.test(studio) && /contexto=\{contexto\}/.test(studio));
check('20) que sale de la puerta y de lo escrito', /contextoDeCreacion\(area, prompt\)/.test(studio));
check('21) y al entrar no se da por hecho que sea una imagen',
  /useState<AreaDeStudio \| null>\(null\)/.test(studio) && !/useState<AreaDeStudio>\('images'\)/.test(studio));
check('22) la sugerencia de duración solo existe en video',
  /if \(contexto !== 'video'\) return undefined;/.test(studio) && /duracionEnElTexto\(prompt\)/.test(studio));
check('23) y el panel dice cuántas referencias van', /referencias=\{referencias\.length\}/.test(studio));

/*
 * WEË DESIGN PASA A LA MISMA HOJA (B3.10 §5), Y ESTA COMPROBACIÓN CAMBIA CON
 * ELLA EN VEZ DE DESAPARECER.
 *
 * Antes decía "Weë Design sigue con su panel de siempre", porque cuando se
 * escribió esta hoja Design se quedó fuera a propósito. Tenía su propia copia,
 * `studio/PromptSettings`, que era esta misma hoja con otro catálogo, y para
 * usarla Design tenía que declararse área "imágenes" del Studio —que no lo es—.
 * Dos copias de una hoja no son dos decisiones: son una decisión y otra que se
 * quedará atrás.
 *
 * Lo que hay que proteger ahora es lo contrario y es más: que Design use la
 * hoja común SIN heredar lo que no es suyo. Sus grupos son los suyos, su pista
 * es la suya —en Design los ajustes NO cambian con lo que se escribe, así que
 * decir que cambian sería mentir— y sus referencias se cuentan igual que en el
 * Studio.
 */
const design = leer('screens/DesignScreen.tsx');
check('24) Weë Design abre la MISMA hoja que el Studio',
  /<AjustesContextuales/.test(design) && !/PromptSettings/.test(design));
check('24) con SU catálogo, no con el del Studio',
  /grupos=\{AJUSTES\}/.test(design) && /siempreSePregunta\(AJUSTES_DE_DESIGN\)/.test(design));
check('24) y con SU pista: aquí los ajustes no cambian con lo escrito',
  /pista=\{t\('design\.settingsHint'\)\}/.test(design));
check('24) y ya no se disfraza de área del Studio',
  !/area="images"/.test(design), 'Weë Design no es un área de Weë Studio');
check('24) y dice cuántas referencias van, como el Studio',
  /referencias=\{referencias\.length\}/.test(design));

/* CONTROL: si Design volviera a heredar el catálogo del Studio, se vería. */
check('CONTROL: Design con el catálogo del Studio sería detectado',
  !/grupos=\{AJUSTES\}/.test('<AjustesContextuales contexto="imagen" elegido={ajustes} />'),
  'si esto pasara, esta comprobación no protegería nada');
/*
 * Y Weë Brain la usa desde el 2026-09-16, con UN solo grupo: si busca en
 * internet o no. Es la misma hoja, no una pantalla nueva ni un sistema nuevo;
 * lo que cambia es el catálogo, que es justo para lo que está el `grupos`.
 */
const brain = leer('screens/BrainChatScreen.tsx');
check('24) Weë Brain abre la MISMA hoja, con su único grupo',
  /<AjustesContextuales/.test(brain) && /grupos=\{AJUSTES_DE_BRAIN\}/.test(brain));
check('24) y ese grupo guarda claves, no frases',
  /clave: 'brain\.searchGroup'/.test(brain) && !/clave: '(Buscar|Search)/.test(brain));
check('24) buscar en internet ya no tiene botón propio en la fila',
  !/globe/.test(brain), 'se mudó a los ajustes');

for (const rel of ['screens/SpecialistScreen.tsx', 'screens/BusinessScreen.tsx']) {
  check(`24) ${rel} sin tocar por esto`, !/AjustesContextuales|ajustesContextuales/.test(leer(rel)));
}

/* CONTROL: la comprobación de "sin tocar" tiene que poder fallar. */
check('CONTROL: una experiencia que lo usara se detectaría',
  /AjustesContextuales/.test("import AjustesContextuales from '../components/creator/AjustesContextuales';"),
  'si esto pasara, el grupo D no protegería nada');

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nLos ajustes preguntan lo que toca, y solo lo que toca');
process.exit(failures ? 1 : 0);
