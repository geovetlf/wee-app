/**
 * LÍNEA B1 (local-first) · políticas de la capa local, comprobadas sobre el texto de los ficheros:
 *   · guardar en local NO consume Credits (ningún import ni llamada a créditos);
 *   · los proyectos locales NO entran en mediaObjects ni en el índice de referencias;
 *   · la capa no depende de Firebase ni de functions/src (funciona sin conexión);
 *   · no se pide ningún permiso de almacenamiento general (READ/WRITE_EXTERNAL_STORAGE);
 *   · app.json declara compartir los documentos de iOS: la carpeta WEE se ve en Archivos (decisión del
 *     dueño, línea I). Por eso los documentos de la app solo pueden tener archivos del usuario.
 *
 * No importa código: lee los ficheros. Así comprueba lo que de verdad está escrito.
 *
 *   node functions/test/local-first-politicas.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CAPA = [
  'services/almacenLocal/puertoDeArchivos.ts',
  'services/almacenLocal/sobrePuerto.ts',
  'services/almacenLocal/puertoDeRuta.ts',
  'services/almacenLocal/puertoSAF.ts',
  'services/almacenLocal/puertoDirectorioWeb.ts',
  'services/almacenLocal/registroIdb.ts',
  'services/almacenLocal/puertosDeUbicacion.ts',
  'services/almacenLocal/ubicacion.ts',
  'services/almacenLocal/ubicacion.web.ts',
  'utils/ubicacionWee.ts',
  'utils/catalogoLocal.ts',
  'utils/bundleLocal.ts',
  'services/almacenLocal/almacenDeMetadatos.ts',
  'services/almacenLocal/almacenEnrutado.ts',
  'services/almacenLocal/entrega.ts',
  'services/almacenLocal/entrega.web.ts',
  'utils/seccionDelDispositivo.ts',
];

let fallos = 0;
const check = (nombre, cond, extra = '') => {
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${nombre}${extra ? ` — ${extra}` : ''}`);
};
const leer = (relativa) => fs.readFileSync(path.join(RAIZ, relativa), 'utf8');
/** Las líneas de código: sin comentarios de cabecera ni de línea. */
const codigo = (texto) =>
  texto
    .split('\n')
    .filter((linea) => !/^\s*(\/\/|\*|\/\*)/.test(linea))
    .join('\n');

const fuentes = CAPA.map((ruta) => ({ ruta, texto: leer(ruta), codigo: codigo(leer(ruta)) }));

check('Q1) la capa existe completa', fuentes.every((f) => f.texto.length > 0), `${fuentes.length} ficheros`);

const importan = (f, patron) => f.codigo.split('\n').some((linea) => /^\s*import\b/.test(linea) && patron.test(linea));
const usan = (f, patron) => patron.test(f.codigo);

check('Q2) guardar en local no consume Credits: ningún import de créditos ni de pagos', fuentes.every((f) => !importan(f, /credit|payment|pago/i)));
check('Q3) ni se llama a funciones de Credits ni de pagos', fuentes.every((f) => !usan(f, /spendCredits|refundCredits|creditsService|getCreditsBalance|validatePurchase|creditCosts/)));
check('Q4) los proyectos locales NO entran en mediaObjects ni en el índice de referencias', fuentes.every((f) => !usan(f, /mediaObjects|indiceDeReferencias|mediaReferences|referenceIndex/i)));
check('Q5) la capa funciona sin conexión: ningún import de Firebase ni de functions/src', fuentes.every((f) => !importan(f, /firebase|functions\/src/)));
check('Q6) no se pide ningún permiso de almacenamiento general de Android', fuentes.every((f) => !usan(f, /READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|MANAGE_EXTERNAL_STORAGE/)));
check('Q7) el Android usa el Storage Access Framework (la persona elige la carpeta)', leer('services/almacenLocal/ubicacion.ts').includes('requestDirectoryPermissionsAsync'));
check('Q8) iOS guarda en la sandbox de la app, sin selector de carpetas', leer('services/almacenLocal/ubicacion.ts').includes('documentDirectory') && !usan(fuentes[7], /DocumentPicker|showDirectoryPicker/));
check('Q9) el navegador: OPFS se etiqueta como privado, nunca como carpeta del sistema', leer('services/almacenLocal/ubicacion.web.ts').includes('ESPACIO PRIVADO') || leer('services/almacenLocal/ubicacion.web.ts').includes('PRIVADO'));

const infoPlist = JSON.parse(leer('app.json')).expo.ios.infoPlist;
check(
  'Q10) app.json declara UIFileSharingEnabled y LSSupportsOpeningDocumentsInPlace en true (decisión del dueño: la carpeta WEE se ve en Archivos)',
  infoPlist.UIFileSharingEnabled === true && infoPlist.LSSupportsOpeningDocumentsInPlace === true,
);
check('Q11) la nube queda desactivada por defecto en los ajustes de almacenamiento', leer('utils/ubicacionWee.ts').includes("nube: 'desactivada'"));
check('Q12) la capa no toca app.json ni .claude ni la identidad: no importa nada de identity/edad/jurisdicción', fuentes.every((f) => !importan(f, /identity|jurisdiccion|elegibilidad|edad/i)));

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
