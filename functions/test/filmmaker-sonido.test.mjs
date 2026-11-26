/*
 * «PERSONALIZAR VOZ Y SONIDOS» de Weë Filmmaker (2026-11-17): lo que se promete.
 *   node test/filmmaker-sonido.test.mjs
 *
 *   A · La herencia personaje → escena → cuadro (lógica pura) y los filtros.
 *   B · Honestidad: todo lo que no está conectado sale cerrado con motivo, el catálogo es de ejemplo y el precio no se inventa.
 *   C · i18n: es y en con las mismas claves, todas usadas existen, sin texto escrito a mano en los componentes.
 */
import { crearCargador, leer, sinComentarios } from './filmmaker-cliente.mjs';

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };
const cargar = crearCargador();
const U = cargar('utils/sonidoDeFilmmaker.ts');
const C = cargar('constants/filmmakerSonido.ts');
const ES = cargar('i18n/textos/es/filmmakerSonido.ts').filmmakerSonido;
const EN = cargar('i18n/textos/en/filmmakerSonido.ts').filmmakerSonido;

console.log('── A · Herencia y filtros ──');
check('A1) sin nada fijado suena «auto» (Weë elige)', U.resolverVoz({}).id === 'auto' && U.resolverVoz({}).origen === 'auto');
check('A2) el personaje fija la voz por defecto y la escena la hereda', U.resolverVoz({ personaje: 'ej_es_aurora' }).origen === 'character' && U.resolverVoz({ personaje: 'ej_es_aurora', escena: null }).id === 'ej_es_aurora');
check('A3) la escena puede cambiarla y el cuadro la hereda de la escena', U.resolverVoz({ personaje: 'a', escena: 'b', cuadro: null }).id === 'b' && U.resolverVoz({ personaje: 'a', escena: 'b', cuadro: null }).origen === 'scene');
check('A4) el cuadro manda sobre todo', U.resolverVoz({ personaje: 'a', escena: 'b', cuadro: 'c' }).id === 'c');
check('A5) lo que hereda un nivel: el personaje de nadie, la escena del personaje, el cuadro de escena+personaje',
  U.herenciaDe('character', { personaje: 'a' }) === null && U.herenciaDe('scene', { personaje: 'a', escena: 'b' }).id === 'a' && U.herenciaDe('shot', { personaje: 'a', escena: 'b' }).origen === 'scene' && U.herenciaDe('shot', { personaje: 'a' }).origen === 'character' && U.herenciaDe('shot', {}).origen === 'auto');
check('A6) el personaje en «auto» se hereda como «auto», no como una voz', U.herenciaDe('scene', { personaje: 'auto' }).origen === 'auto');
const v = C.VOCES_PREDETERMINADAS;
check('A7) filtrar por idioma y por tono; sin filtro, todas', U.filtrarVoces(v, U.SIN_FILTRO).length === v.length && U.filtrarVoces(v, { idioma: 'es', tono: null }).every((x) => x.idioma === 'es') && U.filtrarVoces(v, { idioma: 'es', tono: 'deep' }).length === 1);
check('A8) un filtro sin resultado devuelve lista vacía (la pantalla muestra «Quitar filtros»)', U.filtrarVoces(v, { idioma: 'fr', tono: 'narrator' }).length === 0);
check('A9) los ids del catálogo son únicos y todos tienen idioma y tono válidos', new Set(v.map((x) => x.id)).size === v.length && v.every((x) => U.IDIOMAS_DE_VOZ.includes(x.idioma) && U.TONOS_DE_VOZ.includes(x.tono)));
check('A10) vozPorId: «auto», null o un id desconocido no devuelven voz', U.vozPorId(v, 'auto') === null && U.vozPorId(v, null) === null && U.vozPorId(v, 'zzz') === null && U.vozPorId(v, v[0].id).id === v[0].id);

console.log('── B · Honestidad ──');
check('B1) muestra, subida, música y efectos están CERRADOS (nada simulado)', C.MUESTRA_DE_VOZ_ABIERTA === false && C.SUBIR_VOZ_ABIERTO === false && C.MUSICA_DE_ESCENA_ABIERTA === false && C.EFECTOS_DE_SONIDO_ABIERTOS === false);
check('B2) el precio no se inventa: null mientras no esté medido', C.PRECIO_DE_VOZ_EN_CREDITS === null);
check('B3) el catálogo es de ejemplo y cada voz lo declara', C.CATALOGO_DE_VOCES_REAL === false && v.every((x) => x.ejemplo === true));
const comp = sinComentarios(leer('components/filmmaker/sonido/SelectorDeVoz.tsx'));
check('B4) cada fila cerrada muestra su motivo (subida, música, efectos, muestra)', ['uploadClosed', 'musicClosed', 'effectsClosed', 'sampleClosed'].every((k) => comp.includes(k) || leer('constants/filmmakerSonido.ts').includes(k)));
check('B5) el componente no llama a servidor, Credits ni IA', !/functions|httpsCallable|creditsService|spendCredits|fetch\(|expo-av|expo-audio/.test(comp));
check('B6) el componente se engancha con una API simple: contexto, valor, herencia, onCambiar', /contexto: ContextoDeVoz/.test(comp) && /valor: string \| null/.test(comp) && /onCambiar: \(voz: string \| null\) => void/.test(comp));
check('B7) la subida no simula clonación: ninguna rama abre un selector de archivos', !/DocumentPicker|ImagePicker|launchImageLibrary|<input/.test(comp));

console.log('── C · i18n ──');
const k = (o) => Object.keys(o).sort();
check('C1) es y en tienen exactamente las mismas claves', JSON.stringify(k(ES)) === JSON.stringify(k(EN)));
const fuentes = [comp, sinComentarios(leer('constants/filmmakerSonido.ts'))].join('\n');
const usadas = [...new Set([...fuentes.matchAll(/filmmakerSonido\.([A-Za-z]+)/g)].map((m) => m[1]))];
check('C2) toda clave usada existe (con variante _one/_other si es plural)', usadas.every((x) => x in ES || `${x}_other` in ES), usadas.filter((x) => !(x in ES) && !(`${x}_other` in ES)).join(','));
check('C3) toda clave del diccionario se usa (nada muerto)', k(ES).every((x) => usadas.includes(x.replace(/_(one|other)$/, ''))), k(ES).filter((x) => !usadas.includes(x.replace(/_(one|other)$/, ''))).join(','));
check('C4) sin texto de interfaz escrito a mano en el componente (solo t(...))', !/>\s*[A-Za-zÁÉÍÓÚáéíóúñ¿¡][^<{]{2,}\s*</.test(comp.replace(/=>/g, '')));
check('C5) RTL: sin left/right/marginLeft/paddingRight/textAlign left, y con useDireccion', !/marginLeft|marginRight|paddingLeft|paddingRight|left:|right:|textAlign: 'left'|textAlign: 'right'/.test(comp) && /useDireccion/.test(comp) && /dir\.contenedor/.test(comp));
check('C6) «Weë» siempre con diéresis en los textos', ![...Object.values(ES), ...Object.values(EN)].some((s) => /\bWee\b|\bWEE\b/.test(s)));

console.log(`\n${failures === 0 ? 'TODO VERDE' : 'FALLAN ' + failures} (${n} comprobaciones)`);
process.exit(failures === 0 ? 0 : 1);
