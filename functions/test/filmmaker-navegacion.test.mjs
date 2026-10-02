/**
 * F1-C · WEË FILMMAKER — CÓMO SE LLEGA A «VARIAS ESCENAS», Y QUÉ NO CAMBIA.
 *
 * La producción vive dentro de Weë Studio: la caja «¿Qué quieres crear?» sigue
 * siendo la única, y «Varias escenas» —dentro de la puerta de vídeo— abre la
 * producción en vez de un clip. Todo lo demás llega adonde llegaba.
 *
 *   A · La ruta `Production`: registrada, con su enlace web y sin barra aparte.
 *   B · Las cuatro puertas —Imagen, Video, Texto, Voz—, intactas, y ninguna quinta.
 *   C · CreatorFlow, el camino de un solo clip, intacto: cada puerta sigue decidiendo su destino como antes.
 *   D · «Varias escenas» abre la producción: la experiencia, el Studio y la pantalla.
 *   E · Studio y Filmmaker, separados.
 */
import path from 'node:path';
import fs from 'node:fs';
import { crearCargador, leer, sinComentarios, RAIZ } from './filmmaker-cliente.mjs';

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const pila = leer('navigation/MainStackNavigator.tsx');
const app = leer('App.tsx');
const studio = leer('screens/StudioScreen.tsx');
const capas = leer('constants/studioExperiences.ts');

/* ═══ A · LA RUTA ══════════════════════════════════════════════════════════ */
console.log('\n── A · La ruta `Production` ──');
check('A1) está registrada en la pila principal con su pantalla', /import ProductionScreen from '\.\.\/screens\/ProductionScreen';/.test(pila)
  && /<Stack\.Screen name="Production" component=\{ProductionScreen\} \/>/.test(pila));
check('A2) con sus parámetros: la producción abierta, o la idea y los controles que trae el Studio',
  /Production: \{ productionId\?: string; intencion\?: string; creativo\?: Record<string, string> \} \| undefined;/.test(pila));
check('A3) y su dirección en la web: studio/produccion, con la producción opcional', /Production: \{\s*path: 'studio\/produccion\/:productionId\?',/.test(app));
/*
 * En la web los parámetros viajan en la dirección. Los controles elegidos —un objeto— viajan como JSON y, al recargar,
 * se vuelven a leer; si no se pueden leer, no viajan. Visto en el navegador: sin esto, la dirección decía
 * «[object Object]» y la luz elegida se perdía al recargar.
 */
const bloqueDeLaRuta = app.slice(app.indexOf('Production: {'), app.indexOf('      Design:'));
check('A3b) y los controles elegidos viajan en la dirección como JSON, y se releen con cuidado',
  /stringify: \{\s*creativo: \(creativo: unknown\) => JSON\.stringify\(creativo \?\? \{\}\),/.test(bloqueDeLaRuta)
  && /creativo: \(creativo: string\) => \{\s*try \{\s*const valor = JSON\.parse\(creativo\);/.test(bloqueDeLaRuta) && /catch \{\s*return undefined;/.test(bloqueDeLaRuta));
check('A3c) y esa dirección solo existe con la puerta de Filmmaker abierta: cerrada, la producción no tiene enlace',
  /import \{ FILMMAKER_EN_LA_APP \} from '\.\/constants\/studioExperiences';/.test(app) && /\.\.\.\(FILMMAKER_EN_LA_APP \? \{ Production: \{/.test(app));
check('A4) al lado de Studio, que sigue igual', /Studio: 'studio',/.test(app) && /<Stack\.Screen name="Studio" component=\{StudioScreen\} \/>/.test(pila));
const global = leer('navigation/NavegacionGlobal.tsx');
check('A5) la barra de abajo se queda como en el Studio: no se esconde ni se inventa un destino para ella',
  !/'Production'/.test(global));
check('A6) la navegación sigue siendo la misma: ni un navegador ni un archivo más', fs.readdirSync(path.resolve(RAIZ, 'navigation')).filter((f) => f.endsWith('.tsx')).length === 7);

/* ═══ B · LAS CUATRO PUERTAS ═══════════════════════════════════════════════ */
console.log('\n── B · Las cuatro puertas, intactas, y ninguna quinta ──');
const cargar = crearCargador({ dobles: { 'react-native': { Platform: { OS: 'web' } } } });
const E = cargar('constants/studioExperiences.ts');
const principales = E.ENTRADAS_PRINCIPALES.map((e) => `${e.id}:${e.area}:${e.experienceId}`);
check('B1) Imagen, Video, Texto y Voz, con su área y su experiencia de siempre',
  JSON.stringify(principales) === JSON.stringify(['images:images:photo', 'videos:videos:studio', 'text:writer:writer', 'voice:voice:music']), principales.join(' · '));
check('B2) ninguna quinta puerta: ni «Varias escenas», ni una de producciones', E.ENTRADAS_PRINCIPALES.length === 4
  && !E.ENTRADAS_PRINCIPALES.concat(E.ENTRADAS_DE_EXPLORAR).some((e) => /multi|produc|filmmaker/i.test(`${e.id}${e.clave}`)));
check('B3) Explorar, igual: Personajes, Beauty, Fashion, Documentos y Más',
  JSON.stringify(E.ENTRADAS_DE_EXPLORAR.map((e) => e.id)) === JSON.stringify(['characters', 'beauty', 'fashion', 'documents', 'more']));
const video = E.experienciasDeLaEntrada('videos');
check('B4) «Varias escenas» vive DENTRO de la puerta de vídeo, entre sus quince', video.length === 15 && video.some((x) => x.id === 'multiScene'));
const soloVideo = ['images', 'text', 'voice'].every((p) => !E.experienciasDeLaEntrada(p).some((x) => x.produccion));
check('B5) y solo ahí: Imagen, Texto y Voz no abren producciones', soloVideo);

/* ═══ C · CREATORFLOW INTACTO ══════════════════════════════════════════════ */
console.log('\n── C · El camino de un solo clip, intacto ──');
const D = cargar('utils/destinoDeIntencion.ts');
const destinos = E.ENTRADAS_PRINCIPALES.map((e) => [e.id, D.destinoDeIntencion('Una idea cualquiera', { declaradaPorLaPuerta: e.experienceId, dentroDe: 'studio' })]);
check('C1) cada puerta sigue llevando a su experiencia de CreatorFlow, declarada por la puerta',
  destinos.every(([id, d]) => d && d.origen === 'puerta' && d.experienceId === E.entradaPorId(id).experienceId && d.contexto.goal === 'Una idea cualquiera'),
  destinos.map(([id, d]) => `${id}→${d?.experienceId}`).join(' · '));
const conectadas = video.filter((x) => !x.pendiente && !x.produccion);
check('C2) las doce experiencias de vídeo conectadas siguen siendo de un clip: ninguna abre la producción', conectadas.length === 12 && conectadas.every((x) => !E.abreLaProduccion(x.id)));
/*
 * LA PUERTA (integración de producción en main, 2026-10-01): el dueño no ha decidido lanzar Filmmaker. Cerrada —que es
 * como está—, «Varias escenas» se enseña como en main: bloqueada con su motivo y en su sitio. Abierta, todo lo de F1-C.
 */
check('C3) con la puerta cerrada, las tres que no se pueden hacer —«Varias escenas» incluida— siguen bloqueadas con su motivo, como en main',
  E.FILMMAKER_EN_LA_APP === false && JSON.stringify(video.filter((x) => x.pendiente).map((x) => `${x.id}:${x.pendiente}`))
  === JSON.stringify(['musicVideo:studio.pendMusic', 'multiScene:studio.pendCompose', 'beforeAfter:studio.pendTwoRefs']));
const videoAbierta = E.conLaPuertaDeFilmmaker(E.EXPERIENCIAS_POR_ENTRADA.videos, true);
check('C3b) con la puerta abierta, solo las dos de siempre', JSON.stringify(videoAbierta.filter((x) => x.pendiente).map((x) => `${x.id}:${x.pendiente}`))
  === JSON.stringify(['musicVideo:studio.pendMusic', 'beforeAfter:studio.pendTwoRefs']));
check('C3c) y cerrada, el orden de la puerta de vídeo es el de main: Videoclip · Varias escenas · Antes y después',
  video.map((x) => x.id).slice(-3).join() === 'musicVideo,multiScene,beforeAfter' && !video.some((x) => x.produccion));
const alCrear = studio.slice(studio.indexOf('const alCrear = useCallback'), studio.indexOf('const alElegir = useCallback'));
check('C4) el Studio sigue yendo a CreatorFlow con el destino de siempre', /const destino = destinoDeIntencion\(texto, \{/.test(alCrear)
  && /navigation\.navigate\('CreatorFlow', contexto\);/.test(alCrear) && /dentroDe: 'studio'/.test(alCrear));
check('C5) `destinoDeIntencion` no se tocó: sigue sin saber nada de producciones', !/Production|produccion|filmmaker/i.test(sinComentarios(leer('utils/destinoDeIntencion.ts'))));
check('C6) CreatorFlow no sabe nada de producciones', !/Production|filmmaker|produccion/i.test(sinComentarios(leer('screens/CreatorFlowScreen.tsx'))));

/* ═══ D · VARIAS ESCENAS ═══════════════════════════════════════════════════ */
console.log('\n── D · «Varias escenas» abre la producción ──');
const multi = videoAbierta.find((x) => x.id === 'multiScene');
check('D1) en el catálogo, la experiencia declara que abre una producción (con la puerta abierta, sin bloqueo)', multi.produccion === true && !multi.pendiente && multi.clave === 'studio.xpMultiScene'
  && E.EXPERIENCIAS_POR_ENTRADA.videos.find((x) => x.id === 'multiScene').produccion === true);
check('D2) la regla la da el catálogo: solo «Varias escenas» abre la producción; y con la puerta cerrada, nada la abre',
  Object.values(E.EXPERIENCIAS_POR_ENTRADA).flat().filter((x) => x.produccion).map((x) => x.id).join() === 'multiScene'
  && !E.abreLaProduccion('multiScene') && !E.abreLaProduccion('scene') && !E.abreLaProduccion(null) && !E.abreLaProduccion(undefined)
  && /export const abreLaProduccion = \(experienciaId\?: string \| null\): boolean =>\s*FILMMAKER_EN_LA_APP && !!experienciaId && Object\.values\(EXPERIENCIAS_POR_ENTRADA\)\.some\(\(xs\) => \(xs \?\? \[\]\)\.some\(\(e\) => e\.id === experienciaId && e\.produccion === true\)\);/.test(capas));
const rama = alCrear.search(/if \(abreLaProduccion\(experiencia\?\.id\)\) \{\s*navigation\.navigate\('Production', \{ intencion: texto, creativo: filtrarCreativo\(controles\) \}\);\s*return;\s*\}/);
check('D3) el Studio la abre con lo escrito y los controles elegidos, y no sigue', rama >= 0);
check('D4) antes de decidir ningún destino de un solo clip', rama >= 0 && rama < alCrear.indexOf('destinoDeIntencion(texto') && rama < alCrear.indexOf("navigation.navigate('CreatorFlow'"));
check('D5) la caja sigue siendo la del Studio: la producción no trae la suya',
  !/<TextInput|CajaDePrompt|StudioPromptComposer/.test(leer('screens/ProductionScreen.tsx'))
  && fs.readdirSync(path.resolve(RAIZ, 'components/studio/produccion')).every((f) => !/<TextInput|CajaDePrompt/.test(leer(`components/studio/produccion/${f}`))));
const pantalla = leer('screens/ProductionScreen.tsx');
check('D6) la pantalla recibe la idea y crea una producción de verdad, con la callable, y abre ESA producción',
  /return <InicioDeProducciones idea=\{route\.params\?\.intencion\} creativo=\{route\.params\?\.creativo\} \/>/.test(pantalla)
  && /onCreada=\{\(id\) => navigation\.replace\('Production', \{ productionId: id \}\)\}/.test(pantalla)
  && /crearProduccion\(\{\s*productionId,\s*production: borradorDesdeLaIdea\(/.test(leer('components/studio/produccion/ProductionNewCard.tsx')));
check('D7) y nunca un plan de un clip: la producción no pasa por CreatorFlow ni por su servicio',
  [pantalla, ...fs.readdirSync(path.resolve(RAIZ, 'components/studio/produccion')).map((f) => leer(`components/studio/produccion/${f}`))]
    .every((s) => !/CreatorFlow|creatorService|creatorRun|creatorChat|brainService/.test(s)));
const borrador = cargar('utils/borradorDeProduccion.ts').borradorDesdeLaIdea({
  productionId: 'abcdefghijklmnopqrstuvwx', idea: 'El día de una panadería', aspectRatio: '16:9', creativo: { 'lighting.type': 'golden_hour', 'shot.type': 'close_up' },
});
check('D8) lo que nace es una producción de F1-A: la idea como intención y los controles como dirección, sin escenas inventadas',
  borrador.intent.freeText === 'El día de una panadería' && borrador.scenes.length === 0 && borrador.metadata.revision === 0
  && borrador.creativeDirection.cinematography.lighting.type === 'golden_hour' && borrador.creativeDirection.cinematography.shot.type === 'close_up');

/* ═══ E · STUDIO Y FILMMAKER, SEPARADOS ════════════════════════════════════ */
console.log('\n── E · Studio y Filmmaker, separados ──');
check('E1) el Studio no importa nada de Filmmaker: ni el servicio, ni el dominio, ni sus piezas',
  !/filmmakerService|services\/filmmaker|studio\/produccion|useProduccion/.test(studio));
check('E2) ni llama a ningún servicio de creación', !/creatorService|brainService|creatorRun|httpsCallable/.test(studio));
check('E3) y Filmmaker no toca el Studio: la producción no importa la pantalla del Studio ni su compositor',
  !/StudioScreen|StudioPromptComposer|StudioPanel/.test(pantalla));
check('E4) esta suite está en la cadena de `npm test`', /filmmaker-navegacion\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n${failures} comprobación(es) fallaron` : `\n✔ Filmmaker F1-C: «Varias escenas» abre la producción, y lo demás llega adonde llegaba (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
