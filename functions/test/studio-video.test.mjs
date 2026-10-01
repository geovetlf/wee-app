/*
 * WEË STUDIO Y EL VÍDEO: LO QUE ES REAL, Y LO QUE SE DICE QUE NO LO ES (B3.14).
 *
 * La auditoría midió tres cosas y las tres mandan aquí:
 *
 *  1. `video.generate`, `video.image_to_video` y `video.reference` los sirve
 *     Seedance de verdad. `video.compose`, `video.montage` y `video.vertical`
 *     solo los soporta `mock`, y el router excluye a `mock`. No hay proveedor.
 *
 *  2. Doce de las quince experiencias de vídeo ya llegaban a `video.generate`
 *     por el plan de siempre. No hacía falta construir nada para ellas.
 *
 *  3. Una estaba rota en silencio: «Pizarra animada» lleva la palabra
 *     «animada» en su propio NOMBRE, la plantilla la leía como «animar una
 *     foto», y el plan salía pidiendo una foto que nadie tenía. El nombre de la
 *     experiencia contaminaba lo que Weë entendía.
 *
 * Lo que se vigila: que las doce sigan siendo reales, que las que no se pueden
 * hacer sigan diciendo por qué no, y que nadie convierta una en otra inventando
 * una capacidad.
 *
 * F1-C (autorizado): «Varias escenas» ya no es una de las bloqueadas. No es un
 * clip: abre la producción de Weë Filmmaker, que se construye escena a escena y
 * todavía no genera nada. Quedan dos bloqueadas, con sus motivos.
 *
 *  A. Quince, sin repetidas, y cada una en su sitio.
 *  B. Las doce conectadas hacen un vídeo. (EJECUTADO)
 *  C. Ninguna pide una foto que nadie subió. (EJECUTADO)
 *  D. Las dos bloqueadas se ven, no se abren, y dicen qué falta.
 *  D2. «Varias escenas» abre la producción, y nunca un plan de un solo clip.
 *  E. Lo que no tiene proveedor sigue sin tenerlo. (MEDIDO)
 *  F. Nada inventado, nada duplicado.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const lib = (p) => require_(path.resolve(here, '../lib/' + p));

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const capas = leer('constants/studioExperiences.ts');
const panel = leer('components/studio/StudioPanel.tsx');
const studio = leer('screens/StudioScreen.tsx');

const bloqueVideo = capas.slice(
  capas.indexOf('export const EXPERIENCIAS_DE_VIDEO'),
  capas.indexOf('/** TEXTO.')
);
const ids = [...bloqueVideo.matchAll(/x\('([a-zA-Z]+)'/g)].map((m) => m[1]);
/* El trozo de cada una, del suyo al siguiente: recortar por caracteres cruzaba. */
const trozoDe = (id) => {
  const i = bloqueVideo.indexOf(`x('${id}'`);
  if (i < 0) return '';
  const siguiente = ids.slice(ids.indexOf(id) + 1).map((o) => bloqueVideo.indexOf(`x('${o}'`)).find((j) => j > i);
  return bloqueVideo.slice(i, siguiente > 0 ? siguiente : bloqueVideo.length);
};
const pendienteDe = (id) => trozoDe(id).match(/pendiente: '([a-zA-Z.]+)'/)?.[1];
/* F1-C: la que no es un clip sino una producción de Weë Filmmaker. No es «conectada» —no hace un vídeo— ni «bloqueada». */
const produccionDe = (id) => /produccion: true/.test(trozoDe(id));
const tipoDe = (id) => {
  const t = trozoDe(id);
  if (/PARA_REDES/.test(t)) return 'social';
  if (/ENSENAR_ALGO/.test(t)) return 'promo';
  if (/CONTAR_ALGO/.test(t)) return 'story';
  return undefined;
};

console.log('\n─── A. Quince, sin repetidas, y cada una en su sitio ───');

check('son quince', ids.length === 15, `${ids.length}`);
check('y ninguna repetida', new Set(ids).size === ids.length);
/* Y ninguna se repite tampoco entre entradas: una experiencia vive en un sitio. */
const todos = [...capas.matchAll(/^\s+(?:\{ \.\.\.)?x\('([a-zA-Z]+)'/gm)].map((m) => m[1]);
const repetidosEntreEntradas = todos.filter((id, i) => todos.indexOf(id) !== i);
check('ni entre entradas distintas', repetidosEntreEntradas.length === 0,
  repetidosEntreEntradas.join(', ') || `${todos.length} experiencias en total`);

/* Weë Studio no enseña los otros lugares de trabajo como entrada principal. */
const entradas = [...capas.matchAll(/\{ id: '([a-z]+)',/g)].map((m) => m[1]);
check('Travel, Chef, Design, Business y Music no son entradas del Studio',
  !['travel', 'chef', 'design', 'business', 'music'].some((w) => entradas.includes(w)),
  entradas.join(', '));

console.log('\n─── B. Las doce conectadas hacen un vídeo. EJECUTADO ───');

const { TEMPLATES } = lib('creator/templates.js');
/*
 * Los objetivos REALES que produce Weë Studio: «<experiencia>: <lo escrito>».
 * Se usa esa forma a propósito, porque es donde apareció el fallo: el nombre de
 * la experiencia viaja dentro del objetivo y la plantilla lo lee.
 */
const GOALS = {
  travelTime: 'Viaje: Tres días en Cusco',
  timelapse: 'Timelapse: La construcción de mi casa',
  map: 'Mapa explicativo: Cómo llegar a mi local',
  whiteboard: 'Pizarra animada: Cómo funciona el ahorro',
  cinematicVideo: 'Cinematográfico: Mi restaurante al atardecer · drone, acercarse',
  character: 'Personaje: Mi personaje en un mercado',
  productVideo: 'Producto: Una botella de perfume girando',
  socialVideo: 'Redes: Una taza de café para Instagram',
  storyVideo: 'Historia: Un niño que encuentra un mapa',
  ad: 'Anuncio: Mi cafetería de especialidad',
  scene: 'Crear una escena: Un callejón con neón bajo la lluvia',
  cameraMove: 'Movimiento de cámara: Un dron que se acerca al personaje',
  musicVideo: 'Videoclip: Una canción de rock en la ciudad',
  multiScene: 'Varias escenas: El día de una panadería',
  beforeAfter: 'Antes y después: Mi sala antes y después',
};

const conectadas = ids.filter((id) => !pendienteDe(id) && !produccionDe(id));
check('doce están conectadas, una abre la producción y dos no',
  conectadas.length === 12 && ids.filter(produccionDe).length === 1 && ids.filter((id) => pendienteDe(id)).length === 2,
  `${conectadas.length} conectadas · ${ids.filter(produccionDe).length} producción · ${ids.filter((id) => pendienteDe(id)).length} bloqueadas`);

const planDe = (id) => {
  const respuestas = {};
  const tipo = tipoDe(id);
  if (tipo) respuestas.type = tipo;
  const donde = trozoDe(id).match(/questionId: 'where', optionId: '([a-z]+)'/)?.[1];
  if (donde) respuestas.where = donde;
  /* Lo que no contesta la experiencia lo deduce la plantilla, como en producción. */
  return TEMPLATES.studio.buildPlan(GOALS[id], { ...TEMPLATES.studio.infer(GOALS[id]), ...respuestas });
};

for (const id of conectadas) {
  const caps = planDe(id).steps.map((s) => s.capability);
  check(`${id}: el plan genera un vídeo`, caps.includes('video.generate'), caps.join(' + '));
}

console.log('\n─── C. Ninguna pide una foto que nadie subió. EJECUTADO ───');

/*
 * `animate` es un plan distinto —`vision.describe` + `video.image_to_video`—
 * que EXIGE una foto. Ninguna experiencia de vídeo del Studio la pide, así que
 * ninguna puede acabar ahí. Aquí estaba el fallo y aquí se queda vigilado.
 */
for (const id of conectadas) {
  const caps = planDe(id).steps.map((s) => s.capability);
  check(`${id}: y no pide una foto para animarla`,
    !caps.includes('video.image_to_video') && !caps.includes('vision.describe'),
    caps.join(' + '));
}

/* CONTROL: el fallo, reconstruido. Sin la respuesta, «animada» volvía a colarse. */
const rota = TEMPLATES.studio.buildPlan(GOALS.whiteboard, TEMPLATES.studio.infer(GOALS.whiteboard));
check('CONTROL: sin contestar, «Pizarra animada» volvía a pedir una foto',
  rota.steps.some((s) => s.capability === 'video.image_to_video'),
  rota.steps.map((s) => s.capability).join(' + '));

/* Y el plan conectado sigue siendo UN vídeo, no N: `count` son propuestas. */
const planRedes = planDe('socialVideo');
const pasoDeVideo = planRedes.steps.find((s) => s.capability === 'video.generate');
check('un paso de vídeo no se convierte en varias escenas',
  pasoDeVideo.input.count === undefined, `count = ${pasoDeVideo.input.count}`);
check('y lo que declara es duración y formato, que es lo que el motor acepta',
  typeof pasoDeVideo.input.durationSec === 'number' && typeof pasoDeVideo.input.aspectRatio === 'string',
  `${pasoDeVideo.input.durationSec}s · ${pasoDeVideo.input.aspectRatio}`);
check('Redes sale vertical porque la experiencia lo dijo', pasoDeVideo.input.aspectRatio === '9:16');

console.log('\n─── D. Las dos bloqueadas se ven, no se abren, y dicen qué falta ───');

const BLOQUEADAS = { musicVideo: 'studio.pendMusic', beforeAfter: 'studio.pendTwoRefs' };
for (const [id, clave] of Object.entries(BLOQUEADAS)) {
  check(`${id} está bloqueada con su motivo`, pendienteDe(id) === clave, pendienteDe(id) ?? 'sin motivo');
}
check('y ninguna otra lo está', ids.filter((id) => pendienteDe(id)).length === 2);

/* El panel las apaga, las sella y NO las abre. */
check('el panel no abre lo que está pendiente',
  /onPress=\{pendiente \? \(\) => setExplicando\(pendiente\) : onPress\}/.test(panel));
check('las apaga y lo dice también para quien no las ve',
  /opacity: OPACITY\.disabled/.test(panel) && /accessibilityState=\{\{ disabled: !!pendiente \}\}/.test(panel));
check('y cuenta qué pieza falta, no un «pronto» a secas',
  /t\(explicando\)/.test(panel));
/*
 * Los motivos dicen algo concreto, en todos los idiomas. Los que haya: se leen
 * de `i18n/textos/`, así que el que entre mañana ya queda comprobado.
 */
const DICCIONARIOS_ESCRITOS = fs.readdirSync(path.resolve(RAIZ, 'i18n/textos'), { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(path.resolve(RAIZ, 'i18n/textos', e.name, 'index.ts')))
  .map((e) => e.name);
for (const clave of ['pendMusic', 'pendCompose', 'pendTwoRefs']) {
  const faltan = DICCIONARIOS_ESCRITOS
    .filter((l) => !new RegExp(`^  ${clave}:`, 'm').test(leer(`i18n/textos/${l}/studio.ts`)));
  check(`${clave} está en los ${DICCIONARIOS_ESCRITOS.length} diccionarios`, faltan.length === 0,
    faltan.join(', ') || DICCIONARIOS_ESCRITOS.join(' '));
}

/* CONTROL: desbloquear una sin arreglar lo que falta TIENE que verse. */
check('CONTROL: quitarle el motivo a una bloqueada sería detectado',
  !/pendiente: 'studio\.pendMusic'/.test(bloqueVideo.replace("pendiente: 'studio.pendMusic'", '')),
  'si esto pasara, el grupo D no protegería nada');

console.log('\n─── D2. «Varias escenas» abre la producción, y nunca un plan de un solo clip ───');

/*
 * F1-C. «Varias escenas» no es un clip: lo escrito abre la producción de Weë
 * Filmmaker. Se vigila que sea ELLA y solo ella, que ya no tenga motivo de
 * bloqueo, y que el Studio la lleve a la producción ANTES de decidir un destino
 * de CreatorFlow: así ninguna elección de «Varias escenas» puede acabar en un
 * plan de un solo clip. El Studio solo navega: la producción la crea su pantalla.
 */
check('multiScene abre la producción, y ya no tiene motivo de bloqueo',
  produccionDe('multiScene') && !pendienteDe('multiScene') && ids.filter(produccionDe).join(',') === 'multiScene',
  ids.filter(produccionDe).join(',') || 'ninguna');
check('el catálogo lo dice con una sola regla, que no lee palabras de lo escrito',
  /export const abreLaProduccion = \(experienciaId\?: string \| null\): boolean =>/.test(capas) && !/matchExperiences|keywords/.test(capas));
const alCrear = studio.slice(studio.indexOf('const alCrear = useCallback'), studio.indexOf('const alElegir = useCallback'));
const aLaProduccion = alCrear.search(/if \(abreLaProduccion\(experiencia\?\.id\)\) \{\s*navigation\.navigate\('Production', \{ intencion: texto, creativo: filtrarCreativo\(controles\) \}\);\s*return;\s*\}/);
check('el Studio la lleva a la producción con lo escrito, y se para ahí',
  aLaProduccion >= 0, 'navigate(\'Production\', { intencion, creativo }) y return');
check('antes de elegir un destino de CreatorFlow: un plan de un solo clip no llega a decidirse',
  aLaProduccion >= 0 && aLaProduccion < alCrear.indexOf('destinoDeIntencion(texto') && aLaProduccion < alCrear.indexOf("navigation.navigate('CreatorFlow'"));
check('y el Studio no crea la producción ni habla con su servicio: solo navega',
  !/filmmakerService|crearProduccion|productions'/.test(studio));
/* CONTROL: una segunda experiencia que abriera la producción TIENE que caer. */
check('CONTROL: una segunda experiencia que abriera la producción sería detectada',
  /produccion: true/.test("{ ...x('scene', 'studio.xpScene', 'film-outline'), produccion: true }"),
  'si esto pasara, el grupo D2 no protegería nada');

console.log('\n─── E. Lo que no tiene proveedor sigue sin tenerlo. MEDIDO ───');

/*
 * No se lee una lista de «lo que se puede»: se mira quién lo SIRVE. Un
 * `routing` con cadena vacía no basta para decir que algo no funciona —el
 * router cae a cualquier adaptador que lo soporte—, así que se pregunta a los
 * adaptadores, que es donde está la verdad.
 */
const registry = leer('functions/src/engine/registry.ts');
const seedance = leer('functions/src/engine/providers/seedance.ts');
/*
 * El mock que importa es el del ENGINE: es el que está en `ADAPTERS` y el que el
 * router mira. El del gateway es otro archivo, de la capa de compatibilidad, y
 * leerlo daba un falso negativo. Lo encontró el propio guard al ponerse rojo.
 */
const mock = leer('functions/src/engine/providers/mock.ts');
const soporta = (src, cap) => new RegExp(`'${cap.replace('.', '\\.')}'`).test(src);

for (const cap of ['video.generate', 'video.image_to_video', 'video.reference']) {
  check(`${cap} lo sirve un proveedor real`, soporta(seedance, cap));
}
for (const cap of ['video.compose', 'video.montage', 'video.vertical']) {
  check(`${cap} NO lo sirve ningún proveedor real`, !soporta(seedance, cap) && soporta(mock, cap),
    'solo mock, y el router lo excluye');
}
check('y el router excluye a mock', /a\.id !== 'mock' && a\.supports\(capability\)/.test(leer('functions/src/engine/router.ts')));

/* CONTROL: si alguien le diera cadena a video.compose sin proveedor, seguiría sin haberlo. */
check('CONTROL: una cadena no crea un proveedor',
  !soporta(seedance, 'video.compose'),
  'lo que decide es el adaptador, no la tabla de rutas');

console.log('\n─── F. Nada inventado, nada duplicado ───');

/* Ninguna capacidad de vídeo inventada para contentar a la interfaz. */
const INVENTADAS = /video\.(travel_time|cinematic|product|camera_movement|timelapse|whiteboard|story|social|multi_scene|before_after)/;
check('no se inventó ninguna capacidad de vídeo',
  ![capas, panel, studio, leer('components/studio/StudioControles.tsx')].some((s) => INVENTADAS.test(s)));
const PARALELO = /VideoEngine\b|VideoPlanner|VideoRouter|VideoJobEngine|VideoCredits|CameraEngine|CinematicEngine|CompositionEngine|VideoResultCard/;
check('ni un segundo motor de vídeo', ![capas, panel, studio].some((s) => PARALELO.test(s)));
check('ni proveedor o modelo en el frontend',
  ![capas, panel, studio].some((s) => /\b(seedance|gemini|seedream|elevenlabs|flux|providerId|modelId)\b/i.test(s)));
check('el Studio sigue sin llamar a ningún servicio de creación',
  !/creatorService|brainService|httpsCallable/.test(studio));

/* El camino de ejecución del vídeo es el de siempre, entero. */
const ejecutor = leer('functions/src/creator/index.ts');
check('el vídeo sigue pasando por el Weë Video Engine de siempre',
  /run = toGatewayRun\(await videoEngine\.generate\(videoRequestFromStep\(next\.capability, input\), stepCtx\)\);/.test(ejecutor));
check('con la reserva y la liquidación de siempre',
  /await holdCredits\(/.test(ejecutor) && /await settleCredits\(/.test(ejecutor));
check('y el material al Asset Core de siempre', /await materialesDeResultado\(/.test(ejecutor));

/* Y la deuda de B3.12 sigue abierta y sin fingir. */
const tipos = leer('functions/src/creator/types.ts');
check('la estructura creativa sigue sin tener sitio en el plan',
  !/hints/.test(tipos) && !/creative/.test(tipos),
  'llega por el objetivo, no como parámetro');

/* CONTROL: una capacidad inventada TIENE que caer. */
check('CONTROL: una video.cinematic inventada sería detectada',
  INVENTADAS.test("step('clip', 'video.cinematic', '…')"),
  'si esto pasara, el grupo F no protegería nada');

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nDoce experiencias de vídeo son reales, una abre la producción y dos dicen por qué no');
process.exit(failures ? 1 : 0);
