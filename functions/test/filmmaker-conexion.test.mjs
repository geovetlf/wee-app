/*
 * CONEXIÓN DE LAS PANTALLAS CON LA PRODUCCIÓN REAL (Filmmaker, 2026-11-18). node test/filmmaker-conexion.test.mjs
 *   A · universo → petición de imágenes (solo lo real, estilo elegido, una referencia).  B · pantalla → orquestación (nada cableado a medias).
 */
import { crearCargador, leer, sinComentarios } from './filmmaker-cliente.mjs';
let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };
const cargar = crearCargador({ dobles: { 'firebase/functions': { httpsCallable: () => async () => ({ data: {} }) }, '../config/firebase': { functions: {} } } });
const I = cargar('utils/imagenesDelUniverso.ts');
const universo = { siguiente: 4, aprobado: false, mundo: ' un volcán atrás ', elementos: [
  { id: 'e1', tipo: 'character', nombre: 'Jay', linea: 'Vaquero futurista', grupo: 'main', voz: 'auto' },
  { id: 'e2', tipo: 'place', nombre: 'Desierto', linea: '', grupo: 'other', voz: 'auto' },
  { id: 'e3', tipo: 'character', nombre: 'Muestra', linea: 'x', grupo: 'main', voz: 'auto', ejemplo: true }] };

console.log('── A · Petición de imágenes del universo ──');
const ok = I.peticionDeUniverso(universo, { estilo: 'scifi', tipo: 'short', referencia: 'https://x/u/creator-inputs/a.jpg', aspecto: '16:9' });
check('A1) con estilo, elementos y una referencia sale la petición del universo con lámina', ok.ok && ok.peticion.modo === 'universo' && ok.peticion.lamina === true && ok.peticion.estilo === 'scifi');
check('A2) el ejemplo NUNCA se genera; personaje y lugar sí, con su clase', ok.peticion.elementos.length === 2 && ok.peticion.elementos[0].clase === 'personaje' && ok.peticion.elementos[1].clase === 'lugar' && !ok.peticion.elementos.some((e) => e.id === 'e3'));
check('A3) el mundo viaja recortado y la descripción cae al nombre si no hay línea', ok.peticion.mundo === 'un volcán atrás' && ok.peticion.elementos[1].descripcion === 'Desierto');
check('A4) sin estilo no hay petición (el estilo lo elige la persona)', I.peticionDeUniverso(universo, { estilo: null, referencia: 'u' }).falta === 'estilo');
check('A5) sin referencia no hay petición (una imagen basta, pero hace falta una)', I.peticionDeUniverso(universo, { estilo: 'scifi', referencia: null }).falta === 'referencia');
check('A6) un universo solo de ejemplos no pide nada', I.peticionDeUniverso({ ...universo, elementos: [universo.elementos[2]] }, { estilo: 'scifi', referencia: 'u' }).falta === 'nada');
check('A7) 4:5 y 9:16 piden vertical, 1:1 cuadrado, el resto apaisado (los formatos que admite el lote)', I.formatoDeImagen('4:5') === '9:16' && I.formatoDeImagen('1:1') === '1:1' && I.formatoDeImagen('21:9') === '16:9');

console.log('── B · La pantalla usa la orquestación ──');
const P = sinComentarios(leer('screens/FilmmakerCrearScreen.tsx'));
const U = sinComentarios(leer('components/filmmaker/UniversoDeFilmmaker.tsx'));
check('B1) crear la producción pasa por `useProduccionDeFilmmaker.asegurar` con referencias, universo y estilo (no por el camino de primera generación)', P.includes('pf.asegurar(') && P.includes('references: listas(refs.referencias)') && !/crearProduccion\(/.test(P));
check('B2) los capítulos se guardan como escenas y planos tras cada cambio (con espera), sin cobrar nada', P.includes('setTimeout(() => {') && P.includes('tandas });') && !/spendCredits|creditsService/.test(P));
check('B3) las imágenes del universo usan el hook probado y la fila se monta solo con la capacidad abierta; si no, su línea de «Pronto»', P.includes('useImagenesDeFilmmaker()') && U.includes('imagenes?.abierta && peticionDeImagenes') && U.includes('uniRegenerateClosed'));
check('B4) los retratos y la lámina se pintan con la imagen cuando la petición salió «lista»', U.includes("estado === 'lista'") && U.includes('styles.lamina'));

console.log(failures ? `\n${failures} FALLO(S)` : `\nTodo en verde (${n}).`);
process.exit(failures ? 1 : 0);
