/*
 * WEËAI SENCILLO · CREAR PARA PUBLICAR (decisión del dueño, 2026-11-23; boceto aprobado en
 * wee-trabajo/_weeai-sencillo-2026-11-23). Lo que se prometió, comprobado:
 *
 *   A. el servidor: las tres creaciones van por las plantillas de siempre (Design, Studio, Photo) con respuestas
 *      ELEGIDAS que nunca se preguntan; UN paso y UN resultado; un Weël no pasa de 15 s; el precio sin trabajo.
 *   B. la portada: tres puertas (Imagen, Video corto, Editar mi foto); ni Filmmaker, ni Music, ni experiencias.
 *   C. NINGÚN nombre de experiencia a la vista: lo guardado en `aiTools` se pinta como «WeëAI» (app y página pública).
 *   D. «Recrear este estilo» y su aviso al autor (`recreate`), validado por las reglas.
 *   E. i18n: el módulo `publicar` en los 42 diccionarios; la app no calcula Credits.
 *
 *   cd functions && npm run build && node test/weeai-sencillo.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../..');
const require = createRequire(import.meta.url);
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

console.log('\n── A · el servidor ──');
const { TEMPLATES, preguntasDe, duracionParaPublicar, MAX_WEEL_SEC } = require('../lib/creator/templates.js');
const { templatePlanner } = require('../lib/creator/planner.js');

check('A1) Design, Studio y Photo declaran sus respuestas elegidas aparte de la conversación',
  ['design', 'studio', 'photo'].every((id) => (TEMPLATES[id].elegidas || []).some((q) => q.id === 'publicar'))
  && ['design', 'studio', 'photo'].every((id) => !TEMPLATES[id].questions.some((q) => q.id === 'publicar')));
check('A2) las elegidas nunca se preguntan (su `when` es siempre falso)',
  ['design', 'studio', 'photo'].every((id) => TEMPLATES[id].elegidas.every((q) => q.when && q.when({}) === false && q.when({ publicar: 'x' }) === false)));
check('A3) preguntasDe junta las dos listas (es la que valida un presetAnswers)', preguntasDe(TEMPLATES.studio).some((q) => q.id === 'duracion') && preguntasDe(TEMPLATES.studio).some((q) => q.id === 'type'));

const turno = async (experienceId, goal, answers) => templatePlanner.next({ experienceId, goal, answers, gateway: { userId: 'u' } });
const img = await turno('design', 'Mi perro con gafas en el malecón al atardecer, un logo', [{ questionId: 'publicar', optionId: 'vertical' }, { questionId: 'estilo', optionId: 'cine' }]);
check('A4) Imagen: sin preguntas, UN paso image.generate con UNA imagen y la proporción del destino',
  !img.question && img.plan?.steps.length === 1 && img.plan.steps[0].capability === 'image.generate' && img.plan.steps[0].input.count === 1 && img.plan.steps[0].input.aspectRatio === '9:16',
  JSON.stringify(img.plan?.steps));
const vid = await turno('studio', 'Toby saltando una ola, para mis redes', [{ questionId: 'publicar', optionId: 'weel' }, { questionId: 'duracion', text: '30' }]);
check('A5) Video corto: UN paso video.generate, vertical, y un Weël no pasa de 15 s aunque se pida más',
  !vid.question && vid.plan?.steps.length === 1 && vid.plan.steps[0].capability === 'video.generate' && vid.plan.steps[0].input.durationSec === MAX_WEEL_SEC && vid.plan.steps[0].input.aspectRatio === '9:16' && MAX_WEEL_SEC === 15,
  JSON.stringify(vid.plan?.steps));
check('A6) «Que Weë elija» es la duración automática del motor (-1); una publicación no lleva el tope del Weël',
  duracionParaPublicar('auto', true) === -1 && duracionParaPublicar(undefined, false) === -1 && duracionParaPublicar('20', false) === 20 && duracionParaPublicar('20', true) === 15);
const edit = await turno('photo', 'Ponme una chaqueta de cuero', [{ questionId: 'publicar', optionId: 'editar' }]);
check('A7) Editar mi foto: UN paso image.edit con UN resultado (la foto la exige creatorRun: needsInputImage)',
  !edit.question && edit.plan?.steps.length === 1 && edit.plan.steps[0].capability === 'image.edit' && edit.plan.steps[0].input.count === 1);
const sinElegir = await turno('studio', 'Un video para mi restaurante', []);
check('A8) sin elegidas, la conversación de siempre sigue igual (Studio pregunta y planifica como antes)', !!sinElegir.question || (sinElegir.plan?.steps.length ?? 0) > 1);
const indice = leer('functions/src/creator/index.ts');
check('A9) creatorQuote cotiza SIN trabajo: plantilla + estimatePlan, la foto por la puerta común, y no guarda nada',
  /if \(!jobId && data\.experienceId\)/.test(indice) && /templatePlanner\.next\(/.test(indice) && /estimatePlan\(turno\.plan, uid/.test(indice)
  && /const imageUrl = data\.imageUrl \? assertInputImageUrl\(data\.imageUrl, uid\)/.test(indice));
const fuenteDePlantillas = leer('functions/src/creator/templates.ts');
const plantillas = sinComentarios(fuenteDePlantillas.slice(fuenteDePlantillas.indexOf('WEËAI SENCILLO'), fuenteDePlantillas.indexOf('const IDK')));
check('A10) el bloque de «crear para publicar» no nombra un proveedor ni un modelo de video para «crear para publicar»', !/seedance|kling|runway|veo|byteplus/i.test(plantillas));

console.log('\n── B · la portada ──');
const portada = sinComentarios(leer('components/weeai/PortadaWeeAi.tsx'));
check('B1) tres puertas a «crear para publicar», y ninguna experiencia con nombre (ni Filmmaker, ni Music, ni Studio/Design/Chef/Travel/Fashion/Business/Writer)',
  (portada.match(/id: '(imagen|video|editar)'/g) || []).length === 3 && !/Filmmaker|Music|Studio|Design|Chef|Travel|Fashion|Business|Writer|PORTADA_DE_WEEAI|WEE_EXPERIENCES|navigate\('Specialist'/.test(portada));
check('B2) la caja ya no tiene Audio y su «+» no está apagado', !/ondas|kindAudio|deshabilitada: true/.test(portada));

console.log('\n── C · ningún nombre de experiencia a la vista ──');
const util = leer('utils/publicacionDeWeeAi.ts');
const fuente = util.match(/const NOMBRES_DE_EXPERIENCIA = (\/.*\/i);/);
const re = fuente ? new Function(`return ${fuente[1]}`)() : null;
check('C1) el detector ve los nombres antiguos y deja pasar «WeëAI»',
  !!re && ['Creado con Weë Chef en Weë AI', 'Creado con WeëStudio', 'Weë Filmmaker', 'Hecho en WeëFashion', 'Creado con Weë Writer en Weë AI'].every((x) => re.test(x)) && !re.test('Hecho con WeëAI') && !re.test('Weë AI'));
const como = sinComentarios(leer('components/HowIMadeIt.tsx'));
check('C2) «Cómo lo hice» pinta las herramientas como «WeëAI · <qué se hizo>» y esconde el proceso antiguo que nombra una experiencia',
  /herramientaVisible\(post\.aiTools/.test(como) && /nombraUnaExperiencia\(post\.aiProcess/.test(como) && !/nombreDeHoyDeHerramienta|\.map\(\(tool\) => tool\)/.test(como) && !/aiTools \|\| \[\]\)\.filter\(Boolean\)\.map/.test(como));
const { paginaDeLaPublicacion } = require('../lib/public/postPageHtml.js');
let html = '';
try { html = paginaDeLaPublicacion({ id: 'p1', content: 'Hola', aiTools: ['WeëChef', 'Kling'], imageUrls: [] }); } catch (e) { html = String(e); }
check('C3) la página pública también: «WeëAI» y ningún nombre guardado', /<span class="chip">WeëAI<\/span>/.test(html) && !/WeëChef|Kling/.test(html.replace(/<meta[^>]*>/g, '')));
/* CONTROL: si alguien volviera a pintar lo guardado, se vería. */
check('C4) CONTROL: un HowIMadeIt que pintara aiTools tal cual sería detectado',
  !/herramientaVisible\(post\.aiTools/.test("const tools = (post.aiTools || []).filter(Boolean);"));

console.log('\n── D · Recrear este estilo ──');
const reglas = leer('firestore.rules');
check('D1) las reglas admiten el aviso `recreate` con la forma de los de la app', /return \['like', 'comment', 'econtact_request', 'econtact_accepted', 'recreate'\];/.test(reglas));
check('D2) el tipo existe en la app, se pinta y se traduce', /\| 'recreate'/.test(leer('services/notificationService.ts'))
  && /case 'recreate': return 'publicar\.notifRecrear'/.test(leer('screens/NotificationsScreen.tsx')) && /case 'recreate':\n\s*return \{ name:/.test(leer('screens/NotificationsScreen.tsx')));
check('D3) el botón sale solo en lo hecho con WeëAI con la idea a la vista, y abre crear para publicar con la chapa del autor',
  /puedeRecrear\(displayPost\)/.test(leer('components/PostCard.tsx')) && /navigate\('CrearPublicacion'/.test(leer('components/PostCard.tsx'))
  && /!!post\.weeAi && !!\(post\.aiPrompt \|\| ''\)\.trim\(\) && !post\.autonomo/.test(util));

console.log('\n── E · i18n y Credits ──');
const carpetas = fs.readdirSync(path.join(RAIZ, 'i18n/textos')).filter((d) => fs.statSync(path.join(RAIZ, 'i18n/textos', d)).isDirectory());
const faltan = carpetas.filter((d) => !fs.existsSync(path.join(RAIZ, `i18n/textos/${d}/publicar.ts`)) || !/import \{ publicar \} from '\.\/publicar';/.test(leer(`i18n/textos/${d}/index.ts`)));
check('E1) el módulo `publicar` está en los 42 diccionarios y registrado en cada índice', carpetas.length === 42 && faltan.length === 0, faltan.join(', ') || `${carpetas.length} idiomas`);
const hook = sinComentarios(leer('hooks/useCrearPublicacion.ts'));
check('E2) la app nunca suma ni resta Credits: solo enseña la cotización del servidor y compara para avisar', !/spendCredits|refundCredits|completeCredits|balance\s*[-+]=|credits\s*[-+*]/.test(hook) && /quoteBeforeStart/.test(hook));
check('E3) la pantalla usa la caja común de Weë AI (crece sola) y no tiene un campo propio', /<CajaDePrompt\b/.test(leer('screens/CrearPublicacionScreen.tsx')) && !/<TextInput\b/.test(leer('screens/CrearPublicacionScreen.tsx')));
check('E4) la duración no se escribe a mano en la app: sale del espejo de los modelos integrados', /MODELOS_DE_FILMMAKER/.test(util) && !/\[\s*5\s*,\s*10\s*,\s*15\s*\]/.test(util + leer('screens/CrearPublicacionScreen.tsx')));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
