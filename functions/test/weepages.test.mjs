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
/* 2026-11-23: los tipos de OBRA se suman; los siete de siempre siguen, con su id y en su sitio (weepages-tipos.test los vigila a fondo). */
check('1a) los siete tipos de siempre siguen, con su id, delante de los de obra', JSON.stringify(P.TIPOS_DE_PAGINA.slice(0, 7)) === JSON.stringify(['character', 'company', 'influencer', 'institution', 'brand', 'organization', 'other']) && P.TIPOS_DE_PAGINA.includes('book'));
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
check('2b) el dueño es la cuenta de la sesión y editar exige serlo', /ownerAccountId: cuenta/.test(srv) && /duenaDeLaPagina\(propiedad\.data\(\), antes\.data\(\)\) !== cuenta\) throw new PageError\('ajena'\)/.test(srv));

/*
 * F1 del plan de alter egos (2026-11-23): el documento PÚBLICO de la Página no dice de qué cuenta es. La propiedad va
 * a `pages/{pageId}/private/ownership` (solo la lee su cuenta) y «mis Páginas» a `accounts/{cuenta}/pages`.
 */
const SENTINELA_BORRAR = Symbol('borrar');
const publicoGuardado = P.documentoPublico({ ...P.validarPagina(base, foto), ownerAccountId: 'cuentaAna' }, { status: 'published', ownerAccountId: 'cuentaAna' }, SENTINELA_BORRAR);
check('F1a) el documento público no lleva la cuenta: el campo antiguo se BORRA al guardar', publicoGuardado.ownerAccountId === SENTINELA_BORRAR
  && !Object.values(publicoGuardado).includes('cuentaAna') && publicoGuardado.status === 'published' && publicoGuardado.name === 'Jay Reeds');
check('F1b) la dueña sale del privado; una Página antigua se reconoce por su campo público', P.duenaDeLaPagina({ ownerAccountId: 'ana' }, { ownerAccountId: 'otra' }) === 'ana'
  && P.duenaDeLaPagina(undefined, { ownerAccountId: 'ana' }) === 'ana' && P.duenaDeLaPagina(null, {}) === null);
check('F1c) las rutas privadas: la propiedad y el índice de la cuenta', P.RUTA_DE_LA_PROPIEDAD('p1') === 'pages/p1/private/ownership' && P.RUTA_DEL_INDICE('ana', 'p1') === 'accounts/ana/pages/p1');
const srvCodigo = srv.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
check('F1d) savePage escribe la cuenta SOLO en el privado, y el público pasa por documentoPublico', (srvCodigo.match(/ownerAccountId: cuenta/g) || []).length === 2
  && /tx\.set\(refPropiedad, \{ ownerAccountId: cuenta/.test(srvCodigo) && /tx\.set\(ref, documentoPublico\(/.test(srvCodigo) && /FieldValue\.delete\(\)/.test(srvCodigo));
check('F1e) las fotos nuevas solo valen de la carpeta de ESA Página, no de la de la cuenta', /direccionDeLaPagina\(url, pageId\)/.test(srvCodigo) && !/direccionDeLaCuenta/.test(srvCodigo));
const H = require('../lib/engine/http.js');
{
  const cubo = 'demo-wee.appspot.com';
  process.env.STORAGE_BUCKET = cubo;
  const url = (ruta) => `https://firebasestorage.googleapis.com/v0/b/${cubo}/o/${encodeURIComponent(ruta)}?alt=media&token=abc-123`;
  const enSuCarpeta = H.direccionDeLaPagina(url('pages/p1/logo-abcd.png'), 'p1');
  const deOtra = H.direccionDeLaPagina(url('pages/p2/logo-abcd.png'), 'p1');
  const deLaCuenta = H.direccionDeLaPagina(url('users/ana/creator-inputs/x.png'), 'p1');
  const truco = H.direccionDeLaPagina(url('pages/p1/../../users/ana/x.png'), 'p1');
  check('F1f) direccionDeLaPagina: su carpeta sí; otra Página, la cuenta o una ruta con trucos, no',
    enSuCarpeta.ok && enSuCarpeta.path === 'pages/p1/logo-abcd.png' && !deOtra.ok && !deLaCuenta.ok && !truco.ok,
    JSON.stringify([enSuCarpeta, deOtra, deLaCuenta, truco]));
}
check('2c) el @usuario se reserva en la misma transacción', /pageHandles/.test(srv) && /handle-ocupado/.test(srv) && /runTransaction/.test(srv));
check('2d) seguir exige una identidad de la sesión (Real o Weë) y no toca econtacts', /cuentaDelPerfilLeido\(db, identidad/.test(srv) && /pageFollows/.test(srv) && !/collection\('econtacts'\)/.test(srv));
check('2e) solo se siguen páginas publicadas', /no-publicada/.test(srv));
check('2f) la página no vive en users ni crea perfiles', !/collection\('users'\)\.doc\([^)]*\)\.set|profileType/.test(srv.replace(/\/\*[\s\S]*?\*\//g, '')));
check('2g) ni Credits ni IA', !/spendCredits|engine\/router|generate/.test(srv));

/* 3. Reglas: nada se escribe desde el cliente; el borrador solo lo lee su cuenta */
const reglas = leer('firestore.rules');
const bloque = (n) => (reglas.match(new RegExp(`match /${n}/\\{[^}]+\\} \\{([\\s\\S]*?)\\n    \\}`)) || [])[1] || '';
check('3a) pages: lectura pública si está publicada, borrador solo su cuenta', /status == 'published'/.test(bloque('pages')) && /ownerAccountId == request\.auth\.uid/.test(bloque('pages')));
check('3b) pages, pageHandles y pageFollows cerradas a escritura', ['pages', 'pageHandles', 'pageFollows'].every((n) => /allow write: if false;/.test(bloque(n))));
check('F1g) el borrador se lee también por el privado (get), y el privado solo lo lee su cuenta', /get\(propiedadDeLaPagina\(\)\)\.data\.ownerAccountId == request\.auth\.uid/.test(bloque('pages'))
  && /match \/private\/\{docId\} \{\s*allow get: if isAuthenticated\(\) && docId == 'ownership'\s*&& resource\.data\.ownerAccountId == request\.auth\.uid;\s*allow list, write: if false;/.test(bloque('pages')));
check('F1h) el índice de Páginas de la cuenta lo lee solo ella y no lo escribe nadie', /match \/pages\/\{pageId\} \{\s*allow read: if isAuthenticated\(\) && request\.auth\.uid == accountId;\s*allow write: if false;/.test(reglas));
const almacen = leer('storage.rules');
const reglaFotos = (almacen.match(/match \/pages\/\{pageId\}\/\{archivo\} \{([\s\S]*?)\n    \}/) || [])[1] || '';
check('F1i) Storage: la carpeta de la Página comprueba la propiedad en pages/{pageId}/private/ownership', /firestore\.get\(propiedad\)\.data\.ownerAccountId == request\.auth\.uid/.test(almacen)
  && /\/databases\/\(default\)\/documents\/pages\/\$\(pageId\)\/private\/ownership/.test(almacen)
  && /allow create: if request\.auth != null[\s\S]*esDuenaDeLaPagina\(pageId\)[\s\S]*image\/\.\*/.test(reglaFotos)
  && /allow update, delete: if false;/.test(reglaFotos) && /allow read: if request\.auth != null && esDuenaDeLaPagina\(pageId\);/.test(reglaFotos));

/* 4. Cliente: escribe solo por las funciones */
const servicio = leer('services/pagesService.ts');
check('4a) el servicio no escribe en Firestore', !/setDoc|addDoc|updateDoc|deleteDoc/.test(servicio) && /'savePage'/.test(servicio) && /'followPage'/.test(servicio));
check('4b) las páginas de la cuenta se leen por ownerAccountId (las mismas desde las dos caras)', /where\('ownerAccountId', '==', accountUid\)/.test(servicio));
const pantalla = leer('screens/WeePagesScreen.tsx');
const publica = leer('screens/WeePageScreen.tsx');
check('4c) el composer usa la cuenta, no la cara', /pagesService\.mias\(user\.uid\)/.test(pantalla));
check('F1j) «mis Páginas» salen del índice privado (y de las antiguas por su campo)', /collection\(db, 'accounts', accountUid, 'pages'\)/.test(servicio));
check('F1k) el logo y la portada suben a la carpeta de la Página, no a la de la cuenta', /`pages\/\$\{pageId\}\/\$\{cual\}-/.test(servicio)
  && /pagesService\.prepararFotos\(editando\)/.test(pantalla) && /pagesService\.subirFoto\(pageId, uri, cual\)/.test(pantalla) && !/uploadCreatorImage/.test(pantalla));
check('F1l) «es mía» ya no se deduce del documento público: la dueña sale del privado', /doc\(db, 'pages', pageId, 'private', 'ownership'\)/.test(servicio));
check('4d) seguir usa la identidad ACTIVA', /useIdentidadActiva/.test(publica) && /pagesService\.seguir\(pagina\.id, identidad/.test(publica));
check('4e) el editor pinta los tipos del catálogo, agrupados, y sus campos por tipo', /TIPOS_DE_PAGINA\.(map|filter)/.test(pantalla) && /GRUPOS_DE_PAGINA\.map/.test(pantalla) && /tipo\.campos\.map/.test(pantalla));
check('4f) vista previa (la plantilla real) con Atrás, Guardar borrador y Publicar', /'pages\.saveDraft'/.test(pantalla) && /'pages\.publish'/.test(pantalla) && /'common\.back'/.test(pantalla) && /<PlantillaDePagina/.test(pantalla));
const catalogo = leer('constants/pageTypes.ts');
check('4g) el catálogo del cliente pide los mismos campos que valida el servidor', P.TIPOS_DE_PAGINA.every((t) => {
  const desde = catalogo.indexOf(`tipo('${t}'`);
  const hasta = catalogo.indexOf('tipo(', desde + 5);
  const bloqueTipo = desde < 0 ? '' : catalogo.slice(desde, hasta > 0 ? hasta : undefined);
  return P.CAMPOS_POR_TIPO[t].every((c) => bloqueTipo.includes(`'${c}'`));
}));

/* 4b. Escenas de la historia e Impulsar */
check('4h) las escenas se abren y se ven a pantalla completa', /pagina\.scenes/.test(leer('components/pages/PlantillaDePagina.tsx')) && /alAbrirEscena=\{setEscena\}/.test(publica) && /<Modal visible=\{!!escena\}/.test(publica) && /<Video source=\{\{ uri: escena\.videoURL \}\}/.test(publica));
check('4i) «Añadir escena» abre el Filmmaker de siempre (no hay otro creador)', /esMia && \([\s\S]{0,120}navigation\.navigate\('Production'/.test(publica));
/* Desde la migración de la demo YC, «Impulsar» abre la experiencia de Boost (screens/BoostScreen.tsx, vigilada por boost-interfaz.test). */
check('4j) «Impulsar» solo lo ve el dueño y no cobra ni inventa precio', /esMia && \([\s\S]{0,900}navigate\('Boost', \{ tipo: 'page', id: pagina\.id \}\)/.test(publica) && !/spendCredits|creditsService/.test(publica) && !/spendCredits|creditsService/.test(leer('screens/BoostScreen.tsx')));

/* 5. Navegación */
check('5a) WeëPages está en el catálogo del menú', /pages: \{ id: 'pages', icono: 'documento', clave: 'menu\.pages'/.test(leer('constants/weeMenu.ts')));
check('5b) y en el ☰ del teléfono, como fila propia del orden nuevo (tras Proyectos)', /pages: goPages/.test(leer('components/DrawerMenu.tsx')) && /const goPages = conCuenta\('WeePages'\)/.test(leer('components/DrawerMenu.tsx'))
  && /'projects', 'pages'\]/.test(leer('constants/weeMenu.ts')));
check('5c) y en la barra lateral de escritorio, del mismo catálogo', /pages: \{ onPress: conCuenta\('WeePages'\)/.test(leer('components/Sidebar.tsx')) && /WEE_MENU\.map\(/.test(leer('components/Sidebar.tsx')));
check('5d) las dos rutas existen', /name="WeePages"/.test(leer('navigation/MainStackNavigator.tsx')) && /name="WeePage"/.test(leer('navigation/MainStackNavigator.tsx')));

console.log(fallos ? `\n${fallos} comprobación(es) fallaron` : '\nWeëPages: entidades de la cuenta, escritas solo por el servidor');
process.exit(fallos ? 1 : 0);
