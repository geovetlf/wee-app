/**
 * LÍNEA I («Mis proyectos») · los textos de la sección «En este dispositivo», comprobados sobre el texto
 * de los ficheros (no importa código):
 *   · cada clave `biblioteca.*` que usa la pantalla existe en el español (el TIPO de `t` es un string, así
 *     que un error tipográfico solo lo detecta esta prueba);
 *   · cada clave del español la usa la pantalla, salvo las reservadas (con la nube desactivada);
 *   · la pantalla no escribe a mano ningún texto visible: todo sale de `t(...)`;
 *   · «Mis proyectos» monta la sección.
 *
 *   node functions/test/local-first-seccion-textos.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leer = (relativa) => fs.readFileSync(path.join(RAIZ, relativa), 'utf8');

let fallos = 0;
const check = (nombre, cond, extra = '') => {
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${nombre}${extra ? ` — ${extra}` : ''}`);
};

const PANTALLA = ['components/creator/SeccionDelDispositivo.tsx', 'hooks/useSeccionDelDispositivo.ts', 'utils/seccionDelDispositivo.ts'];
const fuentes = Object.fromEntries(PANTALLA.map((ruta) => [ruta, leer(ruta)]));
const usadasEnLaPantalla = new Set(
  Object.values(fuentes).flatMap((texto) => [...texto.matchAll(/biblioteca\.([A-Za-z_]+)/g)].map((m) => m[1])),
);

const claveDelEspanol = [...leer('i18n/textos/es/biblioteca.ts').matchAll(/^ {2}(\w+):/gm)].map((m) => m[1]);
/** Las variantes de plural (`archivos_one`, `archivos_other`) se usan como su base, `archivos`. */
const baseDe = (clave) => clave.replace(/_(one|other|few|many)$/, '');
const existenEnEspanol = new Set(claveDelEspanol.map(baseDe));

/** Claves que la pantalla NO usa a propósito. Cada una con su motivo. */
const RESERVADAS = {
  // La nube está desactivada en esta línea (AJUSTES_DE_ALMACENAMIENTO.nube): nada puede quedar «solo en la nube».
  estadoSoloEnLaNube: 'reservada: la nube está desactivada, así que ningún proyecto puede estar solo en ella',
};

const faltan = [...usadasEnLaPantalla].filter((clave) => !existenEnEspanol.has(clave));
check('T1) todas las claves `biblioteca.*` que usa la pantalla existen en el español', faltan.length === 0, faltan.join(' '));

const sobran = claveDelEspanol.map(baseDe).filter((clave, i, lista) => lista.indexOf(clave) === i).filter((clave) => !usadasEnLaPantalla.has(clave) && !RESERVADAS[clave]);
check('T2) cada clave del español la usa la pantalla, o está reservada con su motivo', sobran.length === 0, sobran.join(' '));

const cantidadDeReservadas = Object.keys(RESERVADAS).filter((clave) => existenEnEspanol.has(clave)).length;
check('T3) las reservadas existen de verdad en el español (si no, la excepción sobra)', cantidadDeReservadas === Object.keys(RESERVADAS).length);

/*
 * Texto visible escrito a mano: un fragmento de JSX entre `>` y `<` que tenga letras. Lo que
 * va en `{...}` (incluido `t(...)`) no cuenta. Se ignoran los separadores de diseño (« · »).
 */
const textoSueltoEnJsx = (texto) =>
  [...texto.matchAll(/>([^<>{}\n]*[A-Za-zÀ-ÿ][^<>{}\n]*)</g)].map((m) => m[1].trim()).filter((t) => t && t !== '·');
/* Solo el componente tiene JSX: el hook y el controlador son TypeScript puro, sin texto visible. */
const sueltos = textoSueltoEnJsx(fuentes['components/creator/SeccionDelDispositivo.tsx']).map((t) => `«${t}»`);
check('T4) la pantalla no escribe texto visible a mano: todo sale de t(...)', sueltos.length === 0, sueltos.join(' | '));

const cadenasSueltas = [...fuentes['components/creator/SeccionDelDispositivo.tsx'].matchAll(/(?:placeholder|accessibilityLabel|title)=\{?['"]([A-Za-zÀ-ÿ][^'"]{2,})['"]/g)].map((m) => m[1]);
check('T5) ningún placeholder ni etiqueta de acceso viene escrito a mano', cadenasSueltas.length === 0, cadenasSueltas.join(' | '));

const proyectos = leer('screens/ProjectsScreen.tsx');
check('T6) «Mis proyectos» monta la sección del dispositivo, después de los proyectos de la cuenta',
  proyectos.includes("import SeccionDelDispositivo from '../components/creator/SeccionDelDispositivo'") && proyectos.includes('<SeccionDelDispositivo />') && proyectos.indexOf('<SeccionDelDispositivo />') > proyectos.indexOf('projects.map'));

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
