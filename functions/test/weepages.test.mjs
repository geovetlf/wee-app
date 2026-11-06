/**
 * WeëPages — las Páginas públicas de una cuenta (functions/src/social/pages.ts y su cliente).
 *
 * Lo que se vigila: la Página es una ENTIDAD de la cuenta y no una tercera cara (nada en `users`, ningún `profileType`
 * nuevo); solo el servidor la escribe y valida dueño, tipo, campos, @usuario y fotos; seguir es de una identidad y no
 * toca ËContact/ẄContact; y la entrada está en los dos menús.
 *
 * Se ejecuta sobre `lib/` (npm run build) y sobre el código fuente; no necesita emuladores.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const RAIZ = new URL('../../', import.meta.url);
const leer = (r) => fs.readFileSync(new URL(r, RAIZ), 'utf8');
let fallos = 0;
const check = (nombre, ok, detalle = '') => { console.log(`${ok ? 'OK ' : 'NO '} ${nombre}${!ok && detalle ? ` — ${detalle}` : ''}`); if (!ok) fallos++; };
const lanza = (fn, motivo) => { try { fn(); return false; } catch (e) { return e?.motivo === motivo; } };

const P = require('../lib/social/pages.js');
const foto = (u) => { if (!u.startsWith('https://ok/')) { const e = new P.PageError('foto'); throw e; } return u; };
const base = { type: 'character', name: 'Jay Reeds', handle: '@Jay.Reeds' };

/* 1. Validación pura (la misma que corre en el servidor) */
check('1a) los siete tipos y ninguno más', JSON.stringify(P.TIPOS_DE_PAGINA) === JSON.stringify(['character', 'company', 'influencer', 'institution', 'brand', 'organization', 'other']));
check('1b) cada tipo tiene sus campos propios', P.TIPOS_DE_PAGINA.every((t) => Array.isArray(P.CAMPOS_POR_TIPO[t])) && P.CAMPOS_POR_TIPO.character.includes('nature') && P.CAMPOS_POR_TIPO.company.includes('industry'));
check('1c) el @usuario se normaliza (sin @, en minúsculas)', P.validarPagina(base, foto).handle === 'jay.reeds');
check('1d) un @usuario inválido se rechaza', lanza(() => P.normalizarHandle('a'), 'handle') && lanza(() => P.normalizarHandle('mal usuario'), 'handle') && lanza(() => P.normalizarHandle('.punto'), 'handle'));
check('1e) sin nombre no hay página', lanza(() => P.validarPagina({ ...base, name: '  ' }, foto), 'nombre'));
check('1f) un tipo desconocido se rechaza', lanza(() => P.validarPagina({ ...base, type: 'biz' }, foto), 'tipo'));
check('1g) la web se completa con https y una rota se rechaza', P.normalizarWeb('jayreeds.com') === 'https://jayreeds.com/' && lanza(() => P.normalizarWeb('javascript:alert(1)'), 'web'));
check('1h) solo se guardan los campos del TIPO elegido', (() => {
  const l = P.validarPagina({ ...base, details: { nature: 'fictional', industry: 'no toca', biography: 'x' } }, foto);
  return l.details.nature === 'fictional' && l.details.biography === 'x' && !('industry' in l.details);
})());
check('1i) «ficción o real» solo admite sus dos valores', lanza(() => P.validarPagina({ ...base, details: { nature: 'quizá' } }, foto), 'naturaleza'));
check('1j) la foto la decide el servidor (carpeta de la cuenta)', lanza(() => P.validarPagina({ ...base, logoURL: 'https://otro/x.png' }, foto), 'foto')
  && P.validarPagina({ ...base, logoURL: 'https://ok/x.png' }, foto).logoURL === 'https://ok/x.png');
check('1k) un campo demasiado largo se rechaza', lanza(() => P.validarPagina({ ...base, name: 'x'.repeat(61) }, foto), 'larga'));

/* 2. Servidor: dueño, @usuario único, seguir por identidad */
const srv = leer('functions/src/social/pages.ts');
check('2a) se exportan savePage y followPage', /export \{ savePage, followPage \} from '\.\/social\/pages'/.test(leer('functions/src/index.ts')));
check('2b) el dueño es la cuenta de la sesión y editar exige serlo', /ownerAccountId: cuenta/.test(srv) && /get\('ownerAccountId'\) !== cuenta\) throw new PageError\('ajena'\)/.test(srv));
check('2c) el @usuario se reserva en la misma transacción', /pageHandles/.test(srv) && /handle-ocupado/.test(srv) && /runTransaction/.test(srv));
check('2d) seguir exige una identidad de la sesión (Real o Weë) y no toca econtacts', /cuentaDeIdentidad\(identidad/.test(srv) && /pageFollows/.test(srv) && !/collection\('econtacts'\)/.test(srv));
check('2e) solo se siguen páginas publicadas', /no-publicada/.test(srv));
check('2f) la página no vive en users ni crea perfiles', !/collection\('users'\)\.doc\([^)]*\)\.set|profileType/.test(srv.replace(/\/\*[\s\S]*?\*\//g, '')));
check('2g) ni Credits ni IA', !/spendCredits|engine\/router|generate/.test(srv));

/* 3. Reglas: nada se escribe desde el cliente; el borrador solo lo lee su cuenta */
const reglas = leer('firestore.rules');
const bloque = (n) => (reglas.match(new RegExp(`match /${n}/\\{[^}]+\\} \\{([\\s\\S]*?)\\n    \\}`)) || [])[1] || '';
check('3a) pages: lectura pública si está publicada, borrador solo su cuenta', /status == 'published'/.test(bloque('pages')) && /ownerAccountId == request\.auth\.uid/.test(bloque('pages')));
check('3b) pages, pageHandles y pageFollows cerradas a escritura', ['pages', 'pageHandles', 'pageFollows'].every((n) => /allow write: if false;/.test(bloque(n))));

/* 4. Cliente: escribe solo por las funciones */
const servicio = leer('services/pagesService.ts');
check('4a) el servicio no escribe en Firestore', !/setDoc|addDoc|updateDoc|deleteDoc/.test(servicio) && /'savePage'/.test(servicio) && /'followPage'/.test(servicio));
check('4b) las páginas de la cuenta se leen por ownerAccountId (las mismas desde las dos caras)', /where\('ownerAccountId', '==', accountUid\)/.test(servicio));
const pantalla = leer('screens/WeePagesScreen.tsx');
const publica = leer('screens/WeePageScreen.tsx');
check('4c) el composer usa la cuenta, no la cara', /pagesService\.mias\(user\.uid\)/.test(pantalla));
check('4d) seguir usa la identidad ACTIVA', /useIdentidadActiva/.test(publica) && /pagesService\.seguir\(pagina\.id, identidad/.test(publica));
check('4e) el composer pinta los siete tipos del catálogo y sus campos por tipo', /TIPOS_DE_PAGINA\.map/.test(pantalla) && /tipo\.campos\.map/.test(pantalla));
check('4f) vista previa con Atrás, Guardar borrador y Publicar', /'pages\.saveDraft'/.test(pantalla) && /'pages\.publish'/.test(pantalla) && /'common\.back'/.test(pantalla) && /<CabeceraDePagina/.test(pantalla));
const catalogo = leer('constants/pageTypes.ts');
check('4g) el catálogo del cliente pide los mismos campos que valida el servidor', P.TIPOS_DE_PAGINA.every((t) => {
  const bloqueTipo = catalogo.slice(catalogo.indexOf(`id: '${t}'`), catalogo.indexOf('}', catalogo.indexOf(`id: '${t}'`) + 200) + 400);
  return P.CAMPOS_POR_TIPO[t].every((c) => bloqueTipo.includes(`'${c}'`));
}));

/* 4b. Escenas de la historia e Impulsar */
check('4h) las escenas se abren y se ven a pantalla completa', /pagina\.scenes/.test(publica) && /<Modal visible=\{!!escena\}/.test(publica) && /<Video source=\{\{ uri: escena\.videoURL \}\}/.test(publica));
check('4i) «Añadir escena» abre el Filmmaker de siempre (no hay otro creador)', /esMia && \([\s\S]{0,120}navigation\.navigate\('Production'/.test(publica));
/* Desde la migración de la demo YC, «Impulsar» abre la experiencia de Boost (screens/BoostScreen.tsx, vigilada por boost-interfaz.test). */
check('4j) «Impulsar» solo lo ve el dueño y no cobra ni inventa precio', /esMia && \([\s\S]{0,900}navigate\('Boost', \{ tipo: 'page', id: pagina\.id \}\)/.test(publica) && !/spendCredits|creditsService/.test(publica) && !/spendCredits|creditsService/.test(leer('screens/BoostScreen.tsx')));

/* 5. Navegación */
check('5a) WeëPages está en el catálogo del menú', /pages: \{ id: 'pages', icono: 'documento', clave: 'menu\.pages'/.test(leer('constants/weeMenu.ts')));
check('5b) y en el ☰ del teléfono, junto a la agenda', /fila\('pages', goPages\)/.test(leer('components/DrawerMenu.tsx')) && /navigateRoot\('WeePages'\)/.test(leer('components/DrawerMenu.tsx')));
check('5c) y en la barra lateral de escritorio', /<Opcion id="pages"/.test(leer('components/Sidebar.tsx')));
check('5d) las dos rutas existen', /name="WeePages"/.test(leer('navigation/MainStackNavigator.tsx')) && /name="WeePage"/.test(leer('navigation/MainStackNavigator.tsx')));

console.log(fallos ? `\n${fallos} comprobación(es) fallaron` : '\nWeëPages: entidades de la cuenta, escritas solo por el servidor');
process.exit(fallos ? 1 : 0);
