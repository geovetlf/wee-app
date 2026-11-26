/*
 * EL PERFIL DE OTRA PERSONA ENSEÑA SUS PUBLICACIONES (screens/UserProfileScreen.tsx). Sin emuladores: fuentes.
 *
 * La ruta del perfil puede traer la referencia pública (`ent_…`), que no es el `userId` con el que se guardan las
 * publicaciones. Buscar con ella dejaba el perfil con «3 publicaciones» y la pestaña vacía.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');
let fallos = 0;
const check = (nombre, ok, detalle = '') => {
  if (!ok) fallos++;
  console.log(`${ok ? '✔' : '✘'} ${nombre}${!ok && detalle ? ` — ${detalle}` : ''}`);
};

const P = leer('screens/UserProfileScreen.tsx');
check('1) se busca con el uid del perfil resuelto, nunca con una referencia ent_', /const autor = userProfile\?\.uid \?\? \(userId && !userId\.startsWith\('ent_'\) \? userId : null\);/.test(P));
check('2) publicaciones, reposts y me gusta usan esa identidad', /getByUserId\(autor\)/.test(P) && /getUserReposts\(autor\)/.test(P) && /getUserLikedPostsWithData\(autor\)/.test(P));
check('3) y se vuelve a cargar cuando el perfil llega', /\}, \[userId, userProfile\?\.uid\]\);/.test(P));
check('4) control: ya no queda ninguna búsqueda con el id crudo de la ruta', !/getByUserId\(userId\)|getUserReposts\(userId\)|getUserLikedPostsWithData\(userId\)/.test(P));

const SEMILLA = leer('scripts/demo/datos.mjs');
check('5) la portada del Perfil Weë de referencia va en el campo que pinta el perfil (bannerURL)', /bannerURL: urlDe\('l-jayreeds-cover\.webp'\)/.test(SEMILLA));

console.log(fallos ? `\n✘ ${fallos} fallos` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
