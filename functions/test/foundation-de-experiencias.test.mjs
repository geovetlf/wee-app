/*
 * LA BASE COMPARTIDA DE LAS EXPERIENCIAS DE WEË AI (B3.10).
 *
 * B3.8 y B3.9 midieron el frontend y encontraron lo mismo tres veces: piezas
 * iguales escritas dos veces en carpetas distintas, que se separan solas en
 * cuanto una de las dos cambia. B3.10 las junta y pone la base sobre la que se
 * construirán Weë Design (B3.11) y el hub de Weë Studio (B3.12).
 *
 * Lo que se vigila aquí no es cómo se ve nada: es que no vuelva a haber dos.
 *
 *  A. El contrato: cada experiencia tiene un sitio, y uno solo.
 *  B. Weë Studio encamina, no crea.
 *  C. Weë Writer sigue abriendo aunque ya no tenga puerta propia.
 *  D. Las piezas que se juntaron no vuelven a separarse.
 *  E. El destino de una intención no es un router nuevo.
 *  F. El contexto se declara una vez y se transporta, no se interpreta.
 *  G. El frontend no decide proveedor, modelo, ruta ni dinero.
 *  H. El sistema de diseño sigue siendo uno.
 *
 * Cada grupo lleva su CONTROL: una versión rota a propósito que TIENE que
 * caer. Un guard que no se puede falsificar no protege nada.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const existe = (p) => fs.existsSync(path.resolve(RAIZ, p));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const CONTRATO = 'constants/weeWorkspaces.ts';
const DESTINO = 'utils/destinoDeIntencion.ts';
const AVISO = 'components/creator/AvisoDeCreacion.tsx';
const FILA = 'components/creator/FilaDeCreaciones.tsx';

const contrato = leer(CONTRATO);
const experiencias = leer('constants/weeExperiences.ts');

/* Los identificadores declarados en el registro, leídos de su propio archivo. */
const IDS = [...experiencias.matchAll(/^\s{4}id: '([a-z0-9]+)',$/gm)].map((m) => m[1]);
/* Y los que el contrato coloca, con su sitio. */
const COLOCADOS = Object.fromEntries(
  [...contrato.matchAll(/^\s{2}([a-z0-9]+): '([a-z]+)',$/gm)].map((m) => [m[1], m[2]])
);

console.log('\n─── A. Cada experiencia tiene un sitio, y uno solo ───');

check('1) el registro sigue teniendo las once', IDS.length === 11, IDS.join(', '));
check('2) el contrato declara los seis lugares de trabajo',
  /export type WorkspaceId = 'studio' \| 'design' \| 'travel' \| 'chef' \| 'business' \| 'music';/.test(contrato));

const sinSitio = IDS.filter((id) => id !== 'brain' && !COLOCADOS[id]);
check('3) ninguna experiencia se queda sin sitio', sinSitio.length === 0, sinSitio.join(', ') || 'todas colocadas');

/* Weë Brain no es un lugar de trabajo: es la puerta de todos. */
check('4) Weë Brain no está colocado en ninguno', !COLOCADOS.brain);

/*
 * Y los sitios que declara este contrato tienen que decir lo MISMO que
 * `EXPERIENCE_AREA`, que es la tabla que dice cómo se presenta una experiencia
 * que vive dentro de otra sección. Una dice DÓNDE ESTÁ y la otra CÓMO SE
 * PRESENTA; si se contradicen, alguien lee "Weë Studio" en una sección de Weë
 * Design y nadie se entera hasta que lo ve un usuario.
 */
const areas = Object.fromEntries(
  [...experiencias.matchAll(/^\s{2}([a-z0-9]+): \{ section: '([a-z]+)'/gm)].map((m) => [m[1], m[2]])
);
const discrepan = Object.entries(areas).filter(([id, section]) => COLOCADOS[id] !== section);
check('5) el sitio y la cabecera dicen lo mismo de las mismas', discrepan.length === 0,
  discrepan.map(([id, s]) => `${id}: ${s} vs ${COLOCADOS[id]}`).join(', ') || `${Object.keys(areas).length} comprobadas`);

/* CONTROL: si una tabla se moviera sin la otra, tendría que verse. */
const areasFalsas = { ...areas, home: 'studio' };
check('CONTROL: una experiencia mudada en una sola tabla sería detectada',
  Object.entries(areasFalsas).some(([id, s]) => COLOCADOS[id] !== s),
  'si esto pasara, el grupo A no protegería nada');

console.log('\n─── B. Weë Studio encamina, no crea ───');

check('6) el contrato dice cuáles encaminan, y el Studio está', /WORKSPACES_QUE_ENCAMINAN[^=]*= \['studio'\]/.test(contrato));
check('7) y lo dice como una regla que se puede comprobar, no como un comentario',
  /export const encamina = \(workspace: WorkspaceId\): boolean/.test(contrato));

console.log('\n─── C. Weë Writer sigue abriendo ───');

/*
 * Writer deja de tener puerta propia en el menú (B3.10 §1.1) pero NO deja de
 * existir: hay trabajos guardados con `experienceId: 'writer'` y tienen que
 * seguir abriéndose donde abrían. Es la misma decisión que ya se tomó con Weë
 * Photo, Weë Beauty y Weë Home, y se comprueba igual.
 */
check('8) writer sigue en el registro de identificadores', IDS.includes('writer'));
check('9) y sigue sin puerta en el menú', /HIDDEN_AS_SECTION: string\[\] = \[[^\]]*'writer'[^\]]*\]/.test(experiencias));
check('10) y el contrato dice que vive en Weë Studio', COLOCADOS.writer === 'studio');
check('11) y se resuelve entre TODAS, no entre las visibles',
  /getExperienceById = \(id: string\)[^\n]*\n\s*ALL_EXPERIENCES\.find/.test(experiencias));
check('12) y quien busque por sus palabras la encuentra igual',
  /matchExperiences[\s\S]{0,400}ALL_EXPERIENCES\.filter/.test(experiencias));
check('13) `experienciasDe` busca entre todas, para que Writer salga en el Studio',
  /experienciasDe = \(workspace: WorkspaceId\): WeeExperience\[\] =>\s*\n\s*ALL_EXPERIENCES\.filter/.test(contrato));

/* CONTROL: una lista que solo mirase las visibles perdería a Writer. */
check('CONTROL: resolver solo entre las visibles sería detectado',
  !/WEE_EXPERIENCES\.find\(\(e\) => e\.id === id\)/.test(experiencias),
  'si esto pasara, un trabajo guardado de Writer dejaría de abrir');

console.log('\n─── D. Las piezas que se juntaron no vuelven a separarse ───');

/* Las tres que se retiraron, con quién se quedó su trabajo. */
const RETIRADAS = {
  'components/studio/PromptSettings.tsx': 'components/creator/AjustesContextuales.tsx',
  'components/studio/StudioCreations.tsx': FILA,
  'components/design/DesignCreations.tsx': FILA,
};
for (const [ida, quedo] of Object.entries(RETIRADAS)) {
  check(`14) ${ida.split('/').pop()} se fue`, !existe(ida));
  check(`14) y su trabajo lo hace ${quedo.split('/').pop()}`, existe(quedo));
}

/* Y nadie la importa: un import a un archivo que no está rompe el arranque. */
const fuentes = [];
const recorrer = (dir) => {
  for (const f of fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true })) {
    if (f.isDirectory()) recorrer(`${dir}/${f.name}`);
    else if (/\.tsx?$/.test(f.name)) fuentes.push(`${dir}/${f.name}`);
  }
};
for (const dir of ['components', 'screens', 'hooks', 'navigation', 'constants', 'services', 'utils']) recorrer(dir);

const huerfanos = fuentes.filter((rel) =>
  Object.keys(RETIRADAS).some((ida) => leer(rel).includes(ida.replace(/^components\//, '').replace(/\.tsx$/, '')))
);
check('15) nadie importa una pieza retirada', huerfanos.length === 0, huerfanos.join(', ') || 'ninguno');

/*
 * Y "Creando…/Creación lista" se escribe una vez. Estaba copiado renglón por
 * renglón en Weë Studio y en Weë Design: los mismos dos iconos, el mismo botón
 * de cerrar, las mismas sombras. Dos copias no son dos decisiones.
 */
const conAvisoPropio = fuentes.filter((rel) => {
  const src = leer(rel);
  return rel !== AVISO && /t\('studio\.creating'\)/.test(src) && /t\('studio\.ready'\)/.test(src);
});
check('16) el aviso de la creación está escrito una sola vez', conAvisoPropio.length === 0,
  conAvisoPropio.join(', ') || 'solo en AvisoDeCreacion');

/* Igual la fila de creaciones: una cabecera con "Ver todas →" y una sola. */
const conFilaPropia = fuentes.filter((rel) => {
  const src = leer(rel);
  return rel !== FILA && /t\('studio\.creationsTitle'\)/.test(src) && /t\('studio\.seeAll'\)/.test(src);
});
check('17) la fila de creaciones está escrita una sola vez', conFilaPropia.length === 0,
  conFilaPropia.join(', ') || 'solo en FilaDeCreaciones');

/* Y la hoja de ajustes: un solo panel, con el catálogo que le pase quien la abra. */
const conPanelPropio = fuentes.filter((rel) => {
  const src = leer(rel);
  return rel !== 'components/creator/AjustesContextuales.tsx' && /<Modal[^>]*animationType="slide"/.test(src) && /AjusteDeStudio|GrupoDeAjustes/.test(src);
});
check('18) la hoja de ajustes está escrita una sola vez', conPanelPropio.length === 0,
  conPanelPropio.join(', ') || 'solo en AjustesContextuales');

/* CONTROL: una segunda copia del aviso TIENE que caer. */
const copia = { rel: 'screens/SeccionNueva.tsx', src: "t('studio.creating')\nt('studio.ready')" };
check('CONTROL: una segunda copia del aviso sería detectada',
  /t\('studio\.creating'\)/.test(copia.src) && /t\('studio\.ready'\)/.test(copia.src),
  'si esto pasara, el grupo D no protegería nada');

console.log('\n─── E. El destino de una intención no es un router nuevo ───');

const destino = leer(DESTINO);
/*
 * En Weë ya hay dos cosas que resuelven intención: Weë Brain en el servidor
 * (`suggestedExperience`) y `matchExperiences` con las palabras del registro.
 * Este archivo elige entre las dos. No añade un tercero.
 */
check('19) usa el buscador que ya existe', /import \{ matchExperiences/.test(destino));
check('20) y no trae palabras clave propias', !/keywords\s*[:=]\s*\[/.test(destino));
check('21) lo que dijo Weë Brain manda sobre las palabras',
  /if \(sugeridaPorBrain && cabeEn\(sugeridaPorBrain, dentroDe\)\)[\s\S]{0,120}'brain'/.test(destino));
check('22) y cuando nada encaja no se inventa un destino', /return null;/.test(destino) && !/\|\| 'brain'/.test(destino));
/*
 * Y se guarda QUIÉN decidió, para poder medir si acierta. Tres orígenes desde
 * B3.11, y el orden entre ellos es la regla que de verdad carga peso:
 *
 *   brain     ha leído la frase entera. Gana siempre.
 *   puerta    la persona entró por Imágenes o por Beauty: es un acto, no una
 *             lectura, así que le gana a las palabras. Y pierde contra Brain,
 *             porque quien entró por Imágenes y escribió «una canción» está
 *             pidiendo otra cosa y solo Brain puede notarlo.
 *   palabras  el último recurso, y el único gratis.
 */
check('23) se guarda quién decidió, para poder medir si acierta',
  /export type OrigenDelDestino = 'brain' \| 'puerta' \| 'palabras';/.test(destino));
/*
 * El orden no cambia: Brain, puerta, palabras. Lo que cambió en B3.15 es a
 * quién se le aplica el filtro de lugar de trabajo, y por eso la comprobación
 * ya no puede buscar `cabeEn` en las tres.
 *
 * `dentroDe` está para que ADIVINAR no se vaya de paseo —quien escribe «una
 * receta» en Weë Studio no acaba en Weë Chef por una palabra—. Lo que una
 * puerta DECLARA no es una lectura que pueda fallar: es una decisión escrita a
 * mano en el catálogo, y filtrarla hacía que el catálogo se contradijera solo.
 */
check('23) y Brain le gana a la puerta, que le gana a las palabras',
  destino.indexOf('sugeridaPorBrain && cabeEn') < destino.indexOf('declaradaPorLaPuerta && workspaceDe')
  && destino.indexOf('declaradaPorLaPuerta && workspaceDe') < destino.indexOf('matchExperiences(goal, idioma)'));
check('23) el filtro de sitio protege a las palabras, no a la declaración',
  /candidatas: WeeExperience\[\] = matchExperiences\(goal, idioma\)\.filter\(\(e\) => cabeEn\(e\.id, dentroDe\)\)/.test(destino)
  && /if \(declaradaPorLaPuerta && workspaceDe\(declaradaPorLaPuerta\)\)/.test(destino));

/* CONTROL: una lista de palabras propia sería un segundo router. */
check('CONTROL: un router con palabras propias sería detectado',
  /keywords\s*[:=]\s*\[/.test("const keywords = ['video', 'foto'];"),
  'si esto pasara, el grupo E no protegería nada');

console.log('\n─── F. El contexto se transporta, no se interpreta ───');

check('24) la forma del contexto se declara una vez', /export interface ContextoDeExperiencia \{/.test(contrato));
const flujo = leer('screens/CreatorFlowScreen.tsx');
/*
 * Y sin `as`: el contexto ES el tipo de la ruta (`MainStackParamList.CreatorFlow`). Antes la ruta declaraba a mano
 * una forma más pequeña —sin `editorDocId`, `creative`, `adjuntos` ni `workspace`— y la pantalla la tapaba con
 * `(route.params || {}) as ContextoDeExperiencia`; ahora el compilador comprueba lo que la pantalla lee.
 */
check('25) y el flujo la lee de ahí en vez de declararla suelta, sin `as`: es el tipo de la ruta',
  /const params: ContextoDeExperiencia = route\.params \?\? \{\};/.test(flujo)
  && /useRoute<RouteProp<MainStackParamList, 'CreatorFlow'>>\(\)/.test(flujo)
  && !/route\.params[^;\n]*\)\s*as\s/.test(flujo)
  && /^\s*CreatorFlow: ContextoDeExperiencia;$/m.test(leer('navigation/MainStackNavigator.tsx'))
  && /import \{ ContextoDeExperiencia \} from '\.\.\/constants\/weeWorkspaces';/.test(flujo));
check('26) el contrato distingue de qué clase es cada material',
  /export type ClaseDeAdjunto =/.test(contrato) && /'fotoDeLaPersona'/.test(contrato) && /'referencia'/.test(contrato));
check('27) y no monta un almacén paralelo', !/getDownloadURL|uploadBytes|firebase\/storage/.test(contrato));

/* CONTROL: un contexto declarado otra vez dentro de una pantalla sería detectado. */
check('CONTROL: una segunda declaración del contexto sería detectada',
  /route\.params \|\| \{\}\) as \{/.test('const params = (route.params || {}) as {\n  experienceId?: string;\n};'),
  'si esto pasara, el grupo F no protegería nada');

console.log('\n─── G. El frontend no decide proveedor, modelo, ruta ni dinero ───');

/*
 * La regla de arquitectura de B3.10 §23, comprobada: una capa de UX encima de
 * la arquitectura de Weë, no una segunda arquitectura. El frontend nunca elige
 * con qué se hace algo ni cuánto cuesta.
 */
const PROHIBIDO = /\b(gemini|seedance|seedream|elevenlabs|flux|deepseek|nano.?banana|providerId|adapters?\b|modelId)\b/i;
for (const rel of [CONTRATO, DESTINO, AVISO, FILA]) {
  check(`28) ${rel.split('/').pop()} no nombra proveedor ni modelo`, !PROHIBIDO.test(leer(rel)));
}
check('29) ni decide Credits', ![CONTRATO, DESTINO, AVISO, FILA].some((rel) => /spendCredits|creditsBalance|creditCost/.test(leer(rel))));

/* CONTROL: un proveedor colado en la base tendría que verse. */
check('CONTROL: un proveedor nombrado en la base sería detectado',
  PROHIBIDO.test("const modelo = 'gemini-2.5-flash';"),
  'si esto pasara, el grupo G no protegería nada');

console.log('\n─── H. El sistema de diseño sigue siendo uno ───');

for (const rel of [AVISO, FILA]) {
  const src = leer(rel);
  check(`30) ${rel.split('/').pop()} usa el sistema de Weë`, /from '\.\.\/\.\.\/constants\/design'/.test(src) && /from '\.\.\/\.\.\/utils\/scale'/.test(src));
  /* Ni espaciados a mano ni colores sueltos: los que hay son los de la lámina. */
  check(`30) y no declara su propia escala`, !/const (SPACING|FONT_SIZE|BORDER_RADIUS|FONT_WEIGHT) =/.test(src));
  check(`30) y habla por el traductor`, /useT|useIdioma/.test(src));
}

/* CONTROL: una escala propia sería un segundo sistema de diseño. */
check('CONTROL: una escala propia sería detectada',
  /const (SPACING|FONT_SIZE|BORDER_RADIUS|FONT_WEIGHT) =/.test('const SPACING = { sm: 8 };'),
  'si esto pasara, el grupo H no protegería nada');

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nLa base de las experiencias es una sola');
process.exit(failures ? 1 : 0);
