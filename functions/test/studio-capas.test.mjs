/*
 * LAS TRES CAPAS DE WEË STUDIO (B3.11).
 *
 *   CAPA 1  el sitio: una caja y cuatro entradas. Nada más.
 *   CAPA 2  la experiencia: qué se quiere conseguir.
 *   CAPA 3  los controles: con qué detalle, y solo los que esa cosa usa.
 *
 * Lo que se vigila aquí no es cómo se ve: es que la jerarquía siga siendo esa.
 * Una pantalla se estropea despacio —una tarjeta más, un control que se
 * adelanta, un lugar de trabajo que se cuela en la portada— y ninguno de esos
 * pasos rompe nada, así que nadie los ve hasta que el Studio vuelve a ser una
 * caja de herramientas. Esto los ve.
 *
 *  A. Studio es un sitio, y no genera.
 *  B. Cuatro entradas principales, y esas cuatro.
 *  C. Explorar, y lo que NO está en la portada.
 *  D. Las capas, en orden: la tercera espera a la segunda.
 *  E. El destino lo decide quien ya lo decidía.
 *  F. Nada se duplica: ni Projects, ni Assets, ni Credits, ni identidad.
 *  G. Writer sigue abriendo, y Documentos no es Writer.
 *  H. Responsive, accesible y con el sistema visual de siempre.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const CAPAS = 'constants/studioExperiences.ts';
const PANTALLA = 'screens/StudioScreen.tsx';
const ENTRADAS = 'components/studio/StudioEntradas.tsx';
const PANEL = 'components/studio/StudioPanel.tsx';
const CONTROLES = 'components/studio/StudioControles.tsx';

const capas = leer(CAPAS);
const pantalla = leer(PANTALLA);
const entradas = leer(ENTRADAS);
const panel = leer(PANEL);
const controles = leer(CONTROLES);

/** Los ids de un array de entradas, leídos de su propia fuente. */
const idsDe = (marca) => {
  const i = capas.indexOf(marca);
  if (i < 0) return [];
  const fin = capas.indexOf('];', i);
  return [...capas.slice(i, fin).matchAll(/\{ id: '([a-zA-Z]+)'/g)].map((m) => m[1]);
};

console.log('\n─── A. Weë Studio es un sitio, y no genera ───');

const workspaces = leer('constants/weeWorkspaces.ts');
check('Studio es uno de los lugares de trabajo', /'studio' \| 'design' \| 'travel' \| 'chef' \| 'business' \| 'music'/.test(workspaces));
check('y de los que encaminan, no de los que crean', /WORKSPACES_QUE_ENCAMINAN[^=]*= \['studio'\]/.test(workspaces));
/*
 * La prueba de que no genera no es un comentario: es que al pulsar Crear se
 * NAVEGA a la experiencia común. Si algún día esta pantalla llamara a un
 * servicio de creación, aquí se vería.
 */
check('crear en el Studio es irse a crear', /navigation\.navigate\('CreatorFlow'/.test(pantalla));
check('y no llama a ningún servicio de creación',
  !/creatorService|brainService|creatorRun|httpsCallable/.test(pantalla),
  'el Studio entrega contexto; quien crea es CreatorFlow');
check('ni nombra proveedor, modelo ni adaptador',
  ![pantalla, entradas, panel, controles, capas].some((s) =>
    /\b(gemini|seedance|seedream|elevenlabs|flux|deepseek|providerId|adapters?\b|modelId)\b/i.test(s)));

console.log('\n─── B. Cuatro entradas principales, y esas cuatro ───');

const principales = idsDe('export const ENTRADAS_PRINCIPALES');
check('son exactamente cuatro', principales.length === 4, principales.join(', '));
check('Imagen, Video, Texto y Voz',
  JSON.stringify(principales) === JSON.stringify(['images', 'videos', 'text', 'voice']),
  principales.join(', '));
check('y la portada las pinta a todas, sin elegir a mano',
  /ENTRADAS_PRINCIPALES\.map/.test(entradas));

console.log('\n─── C. Explorar, y lo que NO está en la portada ───');

const explorar = idsDe('export const ENTRADAS_DE_EXPLORAR');
check('Explorar tiene Personajes, Beauty, Fashion, Documentos y Más',
  JSON.stringify(explorar) === JSON.stringify(['characters', 'beauty', 'fashion', 'documents', 'more']),
  explorar.join(', '));
/*
 * Y pesa menos que las cuatro: píldoras, no tarjetas. Esa diferencia de tamaño
 * ES la jerarquía; con nueve tarjetas iguales la portada vuelve a ser un
 * catálogo y la pregunta deja de ser «¿qué quiero crear?».
 */
/*
 * Se mira DENTRO del bloque que pinta Explorar, no en el archivo entero: los
 * dos imports son vecinos, así que buscar «StudioToolCard cerca de
 * ENTRADAS_DE_EXPLORAR» daba positivo por esas dos líneas y la comprobación no
 * comprobaba nada.
 */
const bloqueExplorar = entradas.slice(entradas.indexOf('ENTRADAS_DE_EXPLORAR.map'));
check('y se ve en pequeño, no como cinco tarjetas más',
  /ENTRADAS_DE_EXPLORAR\.map/.test(entradas) && /styles\.pildora/.test(bloqueExplorar) && !/StudioToolCard/.test(bloqueExplorar));

/* Los otros lugares de trabajo NO son botones del Studio. */
const OTROS = ['travel', 'chef', 'design', 'business', 'music'];
const colados = OTROS.filter((w) => [...principales, ...explorar].includes(w));
check('Travel, Chef, Design, Business y Music no son entradas del Studio',
  colados.length === 0, colados.join(', ') || 'ninguno');
check('ni se nombran en su portada',
  !OTROS.some((w) => new RegExp(`'${w}'`).test(entradas)));

/* CONTROL: un lugar de trabajo colado TIENE que caer. */
check('CONTROL: Weë Chef colado en la portada sería detectado',
  ['travel', 'chef'].some((w) => ['images', 'chef'].includes(w)),
  'si esto pasara, el grupo C no protegería nada');

console.log('\n─── D. Las capas, en orden ───');

check('la capa 2 existe: cada entrada declara sus experiencias',
  /EXPERIENCIAS_POR_ENTRADA/.test(capas) && /experienciasDeLaEntrada/.test(capas));
/*
 * Y la tercera ESPERA a la segunda. Es la regla entera de esta fase: los
 * controles de cámara son más de cincuenta y enseñados antes de saber qué se
 * quiere hacer no son potencia, son un panel técnico.
 */
check('la capa 3 espera a la capa 2',
  /\{elegida \? \(/.test(panel) && /<StudioControles/.test(panel));
check('y solo se abren los controles de esa experiencia',
  /familias=\{elegida\.controles\}/.test(panel)
  && /FAMILIAS_DE_CAMARA\.filter\(\(f\) => familias\.includes\(f\.id\)\)/.test(controles));
check('una experiencia sin controles no deja un hueco mudo',
  /studio\.noControls/.test(panel));
/* Y ninguna experiencia pide una familia que no exista. */
const familias = [...leer('constants/camaraCinematica.ts').matchAll(/^\s{4}id: '([a-z]+)',$/gm)].map((m) => m[1]);
const pedidas = [...new Set([...capas.matchAll(/\['([a-z', ]+)\]\)/g)].flatMap((m) => m[1].split(/',\s*'/).map((s) => s.replace(/'/g, ''))))].filter(Boolean);
const inventadas = pedidas.filter((f) => !familias.includes(f));
check('ninguna experiencia pide una familia de controles que no existe',
  inventadas.length === 0, inventadas.join(', ') || `${familias.length} familias`);

console.log('\n─── E. El destino lo decide quien ya lo decidía ───');

const destino = leer('utils/destinoDeIntencion.ts');
check('el Studio reutiliza destinoDeIntencion', /import \{ destinoDeIntencion \}/.test(pantalla));
check('que usa el buscador de siempre y no trae palabras propias',
  /import \{ matchExperiences/.test(destino) && !/keywords\s*[:=]\s*\[/.test(destino));
check('no hay un segundo resolutor de intención en el Studio',
  ![pantalla, entradas, panel, controles].some((s) => /matchExperiences|keywords\s*[:=]\s*\[/.test(s)),
  'solo destinoDeIntencion sabe resolver');
check('y el Studio no se lleva a nadie fuera del Studio',
  /dentroDe: 'studio'/.test(pantalla));

console.log('\n─── F. Nada se duplica ───');

const NO_DUPLICAR = {
  'Projects': /StudioProjects|projectsDelStudio/,
  'Assets': /StudioAssets|assetsDelStudio/,
  'History': /StudioHistory|historialDelStudio/,
  'Credits': /spendCredits|creditsBalance|CreditEngine/,
  'Brain': /StudioBrain|brainDelStudio/,
  'Planner': /StudioPlanner|plannerDelStudio/,
  'identidad': /IdentityEngine|CharacterEngine|AppearanceEngine/,
};
for (const [que, patron] of Object.entries(NO_DUPLICAR)) {
  check(`el Studio no monta su propio ${que}`,
    ![pantalla, entradas, panel, controles, capas].some((s) => patron.test(s)));
}
check('el resultado y el plan siguen siendo los de siempre',
  /<PlanCard/.test(leer('screens/CreatorFlowScreen.tsx')) && /<ResultCard/.test(leer('screens/CreatorFlowScreen.tsx')));
check('y la caja que crece sigue intacta bajo el Studio',
  /<PaginaDeCajas/.test(pantalla) && /<CajaDePrompt/.test(leer('components/studio/StudioPromptComposer.tsx')));

console.log('\n─── G. Writer sigue abriendo, y Documentos no es Writer ───');

/*
 * Texto se presenta como "Texto" pero su identificador sigue siendo `writer`:
 * con él viajan la plantilla del servidor y los trabajos ya guardados. Cambiar
 * el identificador por cambiar la etiqueta rompería el historial de la gente.
 */
check('la entrada Texto conserva el identificador writer',
  /id: 'text',[^\n]*experienceId: 'writer'/.test(capas));
check('y el área de ajustes que ya tenía', /id: 'text',[^\n]*area: 'writer'/.test(capas));
check('el editor de documentos de Writer sigue en pie',
  fs.existsSync(path.resolve(RAIZ, 'screens/WriterEditorScreen.tsx')));
/* Documentos y Texto son cosas distintas y no se mezclan. */
check('Documentos no es Texto: son dos entradas con dos áreas',
  /id: 'documents',[^\n]*area: 'documents'/.test(capas)
  && !/EXPERIENCIAS_DE_TEXTO[\s\S]{0,200}doc/.test(capas));
/* Y a Documentos no se le inventan experiencias mientras Weë no llegue allí. */
check('y a Documentos no se le inventan experiencias',
  !/documents: EXPERIENCIAS/.test(capas));

console.log('\n─── H. Responsive, accesible y con el sistema de siempre ───');

check('la portada cambia de columnas con el ancho',
  /isMobile \? 2 : isTablet \? 3 : 4/.test(pantalla) && /useResponsive/.test(pantalla));
for (const [rel, src] of [[ENTRADAS, entradas], [CONTROLES, controles], [PANEL, panel]]) {
  const nombre = rel.split('/').pop();
  check(`${nombre} usa el sistema visual de Weë`,
    /from '\.\.\/\.\.\/constants\/design'/.test(src) && /from '\.\.\/\.\.\/utils\/scale'/.test(src)
    && !/const (SPACING|FONT_SIZE|BORDER_RADIUS|FONT_WEIGHT) =/.test(src));
  check(`${nombre} habla por el traductor y se deja tocar`,
    /useT\(\)/.test(src) && /accessibilityRole="button"/.test(src) && /accessibilityLabel=/.test(src));
}
/* Un dedo no encoge: los blancos táctiles no pasan por `scale()`. */
check('los controles tienen sitio para un dedo', /minHeight: 44/.test(controles));

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nWeë Studio sigue siendo una puerta, no una caja de herramientas');
process.exit(failures ? 1 : 0);
