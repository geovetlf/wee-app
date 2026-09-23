/*
 * EL PUENTE DE WEË STUDIO A LA EXPERIENCIA COMÚN (B3.12).
 *
 * B3.11 dejó la UX hecha y una deuda escrita: lo que alguien elegía en Weë
 * Studio —la experiencia, los controles de cámara, las referencias— se veía en
 * pantalla y NO viajaba. Al pulsar Crear salía `{ experienceId, goal }` y el
 * resto se quedaba en la pantalla anterior.
 *
 * Lo que se vigila aquí es que no vuelva a pasar, y que no se arregle por el
 * camino fácil: metiendo todo en un texto y perdiendo la estructura.
 *
 *  A. El contrato transporta, y es UNO.
 *  B. Lo que se ve es lo que viaja.
 *  C. Los valores creativos se comprueban contra el Core. Cierra al fallar.
 *  D. El texto de la persona no se destruye.
 *  E. Las referencias van por donde iban.
 *  F. La experiencia y la compatibilidad histórica no se pierden.
 *  G. Nada se duplica, y no aparece una segunda arquitectura.
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

const CONTRATO = 'constants/weeWorkspaces.ts';
const CAMARA = 'constants/camaraCinematica.ts';
const STUDIO = 'screens/StudioScreen.tsx';
const FLUJO = 'screens/CreatorFlowScreen.tsx';

const contrato = leer(CONTRATO);
const camara = leer(CAMARA);
const studio = leer(STUDIO);
const flujo = leer(FLUJO);

console.log('\n─── A. El contrato transporta, y es UNO ───');

check('el contexto lleva la experiencia', /experienceId\?: string;/.test(contrato));
check('y de qué lugar de trabajo se vino', /workspace\?: WorkspaceId;/.test(contrato));
check('y lo que la persona escribió', /goal\?: string;/.test(contrato));
check('y lo elegido en los controles', /creative\?: Readonly<Record<string, string>>;/.test(contrato));
check('y los materiales, con su clase', /adjuntos\?: readonly Adjunto\[\];/.test(contrato));

/*
 * Y no hay un segundo nombre para lo mismo. Un `studioContext`, un
 * `creativeParams` o un `StudioBridge` al lado de `ContextoDeExperiencia`
 * serían dos contratos, y dos contratos del mismo dato se separan.
 */
const NOMBRES_PARALELOS = /StudioContext|StudioBridge|StudioCreativeParams|StudioCameraParams|StudioLightingParams|creativeParams/;
check('y nadie inventa un segundo nombre para lo mismo',
  ![contrato, camara, studio, flujo].some((s) => NOMBRES_PARALELOS.test(s)));

/* CONTROL: un contrato paralelo TIENE que caer. */
check('CONTROL: un contrato paralelo sería detectado',
  NOMBRES_PARALELOS.test('interface StudioCreativeParams {}'),
  'si esto pasara, el grupo A no protegería nada');

console.log('\n─── B. Lo que se ve es lo que viaja ───');

/*
 * Las fichas del Studio se pintan de `controles` y de `adjuntos`, y eso MISMO
 * es lo que se manda. No hay un estado de interfaz por un lado y un contexto
 * por otro: dos copias del mismo dato se separan, y entonces la persona ve una
 * cosa y Weë recibe otra.
 */
check('el Studio pinta sus fichas de lo elegido',
  /Object\.entries\(controles\)\.map/.test(studio) && /adjuntos\.map\(\(a, i\) =>/.test(studio));
check('y manda ESO, no una copia',
  /const creative = filtrarCreativo\(controles\);/.test(studio)
  && /adjuntos\.length \? \{ adjuntos \} : \{\}/.test(studio));
check('y la experiencia común las vuelve a pintar de lo que llegó',
  /filtrarCreativo\(params\.creative\)/.test(flujo) && /params\.adjuntos/.test(flujo));
check('con la MISMA ficha, no con una copia suya',
  /<FichaDeContexto/.test(flujo) && /<FichaDeContexto/.test(studio));

/* CONTROL: un contador aparte del que viaja sería detectado. */
check('CONTROL: un estado de interfaz separado del contexto sería detectado',
  !/const creative = filtrarCreativo\(controles\);/.test('const creative = { ...otraCosa };'),
  'si esto pasara, el grupo B no protegería nada');

console.log('\n─── C. Los valores se comprueban contra el Core, y cierra al fallar ───');

check('existe el filtro', /export const filtrarCreativo = \(crudo: unknown\): SeleccionCreativa/.test(camara));
check('que solo deja pasar rutas del vocabulario del Core',
  /const permitidos = VALORES_CREATIVOS\[ruta\];/.test(camara));
check('y valores que esa ruta acepta', /!permitidos\.includes\(valor\)/.test(camara));
/*
 * Y NO aproxima. Un valor que el Core no conoce se deja fuera —`continue`—, no
 * se transforma en el más parecido: aproximar sería inventar lo que alguien
 * quiso decir, y eso lo sabe Weë Brain, no una tabla del frontend.
 */
check('lo que no encaja se deja fuera, no se aproxima',
  (camara.match(/continue;/g) || []).length >= 2
  && !/similar|aproxim|masParecido|fallback/i.test(camara.slice(camara.indexOf('filtrarCreativo'))));
check('se filtra en las DOS puntas del puente',
  /filtrarCreativo\(controles\)/.test(studio) && /filtrarCreativo\(params\.creative\)/.test(flujo));

/*
 * Y sigue sin inventarse nada del lenguaje creativo.
 *
 * Se mira si `camera.roll` está DECLARADO —como ruta, como vocabulario o como
 * destino de un comando—, no si la palabra aparece: el sitio donde aparece hoy
 * es el comentario que explica por qué `/dutchangle` sigue pendiente, y esa
 * explicación es justo lo que no se quiere perder. Buscar la palabra a secas
 * obligaría a borrar la deuda para que el guard pasara, que es exactamente al
 * revés de lo que hace falta.
 */
const rutasDeclaradas = (() => {
  const i = camara.indexOf('export const RUTAS_CREATIVAS = [');
  return [...camara.slice(i, camara.indexOf(']', i)).matchAll(/'([^']+)'/g)].map((m) => m[1]);
})();
const rutasConVocabulario = [...camara.matchAll(/^\s{2}'([a-zA-Z.]+)': \[/gm)].map((m) => m[1]);
const rutasDeComandos = [...camara.matchAll(/c\('[^']+', '[^']+', '[^']+', '([^']+)'/g)].map((m) => m[1]);
check('no se inventó camera.roll como ruta del lenguaje creativo',
  ![...rutasDeclaradas, ...rutasConVocabulario, ...rutasDeComandos].includes('camera.roll'),
  `${rutasDeclaradas.length} rutas declaradas`);
/*
 * Y la deuda sigue escrita donde se explica: en el motivo de `/dutchangle`. Ahí
 * SÍ tiene que aparecer el nombre —es lo que haría falta el día que se decida—,
 * y por eso la comprobación de arriba mira las rutas declaradas y no el texto.
 */
check('y la deuda sigue escrita donde se explica',
  /camera\.roll/.test(camara) && /dutchangle/.test(camara));
for (const alias of ['/dutchangle', '/cinematic', '/portrait']) {
  const comandos = [...camara.matchAll(/c\('([^']+)',/g)].map((m) => m[1]);
  check(`${alias} sigue pendiente, no inventado`, !comandos.includes(alias));
}

/* CONTROL: un valor fuera del vocabulario TIENE que quedarse fuera. */
const VALORES = (() => {
  const i = camara.indexOf("'movement.type': [");
  return [...camara.slice(i, camara.indexOf(']', i)).matchAll(/'([^']+)'/g)].map((m) => m[1]).slice(1);
})();
check('CONTROL: un valor inventado no pasaría el filtro',
  !VALORES.includes('teleport'), `${VALORES.length} movimientos válidos`);

console.log('\n─── D. El texto de la persona no se destruye ───');

/*
 * El goal se compone: delante de qué va, en medio lo que la persona escribió
 * TAL CUAL, y detrás con qué. Lo suyo no se recorta, no se reescribe y no se
 * mete dentro de otra cosa.
 */
check('lo escrito viaja entero, en medio de lo demás',
  /\[nombre \? `\$\{nombre\}:` : '', texto, conPalabras \? `· \$\{conPalabras\}` : ''\]/.test(studio));
check('y el texto sale de lo que hay en la caja, sin tocarlo',
  /const texto = prompt\.trim\(\);/.test(studio) && !/prompt\.replace|prompt\.slice|prompt\.substring/.test(studio));
/*
 * Y elegir una experiencia ya NO escribe dentro de la caja. Mezclaba en un solo
 * texto la experiencia —que es un dato— con lo que alguien quería decir, y
 * luego no había forma de volver a separarlos.
 */
check('elegir una experiencia ya no escribe en la caja',
  /const clave = eleccion\.herramienta\?\.clave;/.test(studio)
  && !/eleccion\.experiencia\?\.clave \?\? eleccion\.herramienta\?\.clave/.test(studio));
/*
 * Decir lo elegido con palabras NO sustituye a la estructura: las dos viajan.
 * Esto lo comprueba: si un día alguien quitara `creative` y dejara solo la
 * frase, aquí se vería.
 */
check('las palabras acompañan a la estructura, no la sustituyen',
  /creativoEnPalabras\(creative, t\)/.test(studio)
  && /\.\.\.\(Object\.keys\(creative\)\.length \? \{ creative \} : \{\}\)/.test(studio));

console.log('\n─── E. Las referencias van por donde iban ───');

check('los materiales llevan su clase', /clase: 'referencia'/.test(studio));
check('y se eligen con el selector de siempre', /ImagePicker\.launchImageLibraryAsync/.test(studio));
/*
 * Y la primera entra además por donde ya entraban las fotos: `imageUri`, que
 * `CreatorFlow` sube con `creatorUploads` al Storage de Weë. No hay un segundo
 * almacén ni una segunda subida.
 */
check('la primera foto entra por el camino de siempre',
  /adjuntos\[0\] \? \{ imageUri: adjuntos\[0\]\.uri \} : \{\}/.test(studio));
check('y quien sube sigue siendo creatorUploads',
  /uploadCreatorImage/.test(flujo) && !/uploadCreatorImage|getDownloadURL|uploadBytes/.test(studio));
check('el Studio no monta almacén propio',
  !/firebase\/storage|assetsService|StudioAssets/.test(studio));

console.log('\n─── F. La experiencia y el historial no se pierden ───');

check('la experiencia viaja', /experienceId: destino\.experienceId/.test(studio));
check('y de dónde se vino', /workspace: 'studio'/.test(studio));
/*
 * Y LO QUE SE MANDA ES ESE OBJETO, no uno escrito a mano al lado.
 *
 * Esta comprobación existe porque faltaba: sin ella, alguien podía dejar el
 * contexto construido —y todas las comprobaciones de arriba en verde— y navegar
 * con `{ goal }` a secas. El objeto seguiría ahí, sin usar, y el puente estaría
 * roto en silencio. Lo encontró un sabotaje, no una lectura.
 */
check('y se navega CON ese objeto, no con uno escrito al lado',
  /const contexto: ContextoDeExperiencia = \{/.test(studio)
  && /navigation\.navigate\('CreatorFlow', contexto\);/.test(studio));
/*
 * Y SIN PUERTA NO SE INVENTA NINGUNA.
 *
 * Esta comprobación existe porque el fallo existió: había un `'images'` por
 * defecto, así que quien estaba en la portada sin haber abierto nada y escribía
 * algo que no encajaba con ninguna palabra acababa en Weë Photo. Inventarle a
 * alguien la sección por la que pasó es peor que decirle que no hay destino.
 *
 * Lo encontró recorrer Documentos en el navegador, no leer el código.
 */
check('y sin puerta abierta no se inventa una',
  /declaradaPorLaPuerta: experiencia\?\.experienceId \?\? \(entrada \? entradaPorId\(entrada\)\?\.experienceId : undefined\)/.test(studio)
  && !/entradaPorId\(panel \?\? \('images'/.test(studio));
const experiencias = leer('constants/weeExperiences.ts');
check('writer sigue resolviéndose entre todas',
  /HIDDEN_AS_SECTION: string\[\] = \[[^\]]*'writer'[^\]]*\]/.test(experiencias)
  && /getExperienceById = \(id: string\)[\s\S]{0,80}ALL_EXPERIENCES\.find/.test(experiencias));
for (const id of ['photo', 'home', 'beauty', 'writer']) {
  check(`${id} sigue en el registro`, new RegExp(`id: '${id}'`).test(experiencias));
}
check('y la experiencia común sigue leyendo el identificador de siempre',
  /getExperienceById\(params\.experienceId \|\| ''\)/.test(flujo));

console.log('\n─── G. Nada se duplica, y no hay una segunda arquitectura ───');

const PARALELO = /StudioPlanner|StudioWorkflow|StudioBrain|StudioCreativeEngine|StudioJob|StudioCredits|StudioRouter|StudioGenerator|StudioPlanCard/;
check('no aparece ninguna pieza paralela', ![studio, flujo, contrato, camara].some((s) => PARALELO.test(s)));
check('el Studio sigue sin llamar a ningún servicio de creación',
  !/creatorService|brainService|httpsCallable/.test(studio));
check('y sigue sin nombrar proveedor, modelo ni adaptador',
  ![studio, flujo, contrato, camara].some((s) => /\b(gemini|seedance|seedream|elevenlabs|flux|deepseek|providerId|adapters?\b|modelId)\b/i.test(s)));
/* Quien planifica y quien cobra siguen donde estaban. */
check('el plan y el resultado siguen siendo los de siempre',
  /<PlanCard/.test(flujo) && /<ResultCard/.test(flujo) && !/StudioPlanCard/.test(flujo));
check('y el dinero sigue moviéndose donde se movía',
  /creditsShortfall/.test(flujo) && !/spendCredits|creditsBalance/.test(studio));
/* Y `count` no se toca: no viaja dentro de creative. */
check('count no se cuela dentro de creative',
  !/creative[^\n]*count|count[^\n]*creative/.test(studio) && !/'count'/.test(camara));

/* CONTROL: una pieza paralela TIENE que caer. */
check('CONTROL: un StudioPlanner sería detectado',
  PARALELO.test('const StudioPlanner = () => {}'),
  'si esto pasara, el grupo G no protegería nada');

console.log('\n─── H. Y el filtro, EJECUTADO ───');

/*
 * Todo lo de arriba lee texto. Leer texto prueba que el código DICE lo que
 * tiene que decir; no prueba que lo HAGA. Así que aquí el filtro se transpila y
 * se ejecuta contra los casos que de verdad pueden llegar por la navegación:
 * una ruta que el Core no tiene, un valor que esa ruta no acepta, un número
 * donde iba una cadena, un `null`, un array, y `__proto__`.
 *
 * El módulo es una hoja —no importa nada— así que se carga tal cual.
 */
const { createRequire } = await import('node:module');
const require_ = createRequire(import.meta.url);
const ts = require_('typescript');
const js = ts.transpileModule(camara, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const { filtrarCreativo, creativoEnPalabras } = mod.exports;

const CASOS = [
  ['lo válido pasa entero', { 'shot.type': 'close_up', 'lighting.type': 'golden_hour' }, { 'shot.type': 'close_up', 'lighting.type': 'golden_hour' }],
  ['una ruta que el Core no tiene se cae', { 'camera.roll': '15deg' }, {}],
  ['un valor que la ruta no acepta se cae', { 'movement.type': 'teleport' }, {}],
  ['lo bueno sobrevive a lo malo', { 'shot.type': 'hero', 'movement.type': 'teleport' }, { 'shot.type': 'hero' }],
  ['un número no es un valor', { 'shot.type': 3 }, {}],
  ['null no rompe nada', null, {}],
  ['un array tampoco', ['close_up'], {}],
  ['undefined tampoco', undefined, {}],
  ['una cadena suelta tampoco', 'close_up', {}],
  ['no se cuela __proto__', { __proto__: { malo: 1 }, 'shot.type': 'wide' }, { 'shot.type': 'wide' }],
  ['count NO es una ruta creativa', { count: '3' }, {}],
];
for (const [nombre, entrada, esperado] of CASOS) {
  const salida = filtrarCreativo(entrada);
  check(nombre, JSON.stringify(salida) === JSON.stringify(esperado), JSON.stringify(salida));
}

/* Y las palabras salen del catálogo traducido, nunca de la ruta cruda. */
const t = (c) => ({ 'studio.shtCloseUp': 'Primer plano', 'studio.ltGolden': 'Hora dorada' }[c] ?? c);
check('lo elegido se dice con palabras, no con rutas',
  creativoEnPalabras({ 'shot.type': 'close_up', 'lighting.type': 'golden_hour' }, t) === 'primer plano, hora dorada');
check('y un valor sin nombre no se dice a medias',
  creativoEnPalabras({ 'shot.type': 'inventado' }, t) === '');

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nLo que se elige en Weë Studio llega entero');
process.exit(failures ? 1 : 0);
