/**
 * WEË PAGES — LOS TIPOS DE PÁGINA, SUS SECCIONES Y LA REGLA DE NO VENDER (2026-11-23).
 *
 * Pedido del dueño: «al crear tiene que salir qué tipo de página sería, por ejemplo libro, película, personaje, negocio».
 * Lo que se vigila aquí, ejecutando el código y no solo mirándolo:
 *
 *  1. Los siete tipos de siempre conservan su id (hay páginas guardadas con ellos), en el cliente y en el servidor.
 *  2. Cada tipo del catálogo tiene su título, su descripción, sus campos, sus secciones y su grupo en español e inglés.
 *  3. El servidor acepta los tipos nuevos, con sus campos, secciones, imágenes, enlaces y color; cliente y servidor
 *     piden lo mismo.
 *  4. Los enlaces a tiendas solo admiten https (y «amazon.com/…» se completa), igual en el cliente y en el servidor.
 *  5. No hay venta dentro de Weë: ni Credits, ni pagos, ni precios en las páginas.
 *  6. «Presentada por» publica la referencia pública de la cara, nunca la cuenta.
 *
 * Se ejecuta sobre `lib/` (npm run build) y sobre el código fuente; no necesita emuladores.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const RAIZ = new URL('../../', import.meta.url);
const leer = (r) => fs.readFileSync(new URL(r, RAIZ), 'utf8');
let fallos = 0;
const check = (nombre, ok, detalle = '') => { console.log(`${ok ? 'OK ' : 'NO '} ${nombre}${!ok && detalle ? ` — ${detalle}` : ''}`); if (!ok) fallos++; };
const lanza = (fn, motivo) => { try { fn(); return false; } catch (e) { return e?.motivo === motivo; } };
const modulo = async (ruta) => {
  const js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
};

const P = require('../lib/social/pages.js');
const C = await modulo('constants/pageTypes.ts');
const E = await modulo('utils/enlaceDeObra.ts');
const es = (await modulo('i18n/textos/es/pages.ts')).pages;
const en = (await modulo('i18n/textos/en/pages.ts')).pages;
const DE_SIEMPRE = ['character', 'company', 'influencer', 'institution', 'brand', 'organization', 'other'];
const NUEVOS = ['book', 'film', 'comic', 'music', 'painting', 'illustration', 'photography', 'crafts', 'sculpture', 'fashion', 'food', 'design', 'services'];
const idsCliente = C.TIPOS_DE_PAGINA.map((t) => t.id);

/* 1. Los ids de siempre */
check('1a) el servidor conserva los siete ids de siempre', DE_SIEMPRE.every((id) => P.TIPOS_DE_PAGINA.includes(id)));
check('1b) el catálogo del cliente también', DE_SIEMPRE.every((id) => idsCliente.includes(id)));
check('1c) están todos los tipos de obra pedidos', NUEVOS.every((id) => idsCliente.includes(id) && P.TIPOS_DE_PAGINA.includes(id)), NUEVOS.filter((id) => !idsCliente.includes(id)).join(','));
check('1d) cliente y servidor tienen exactamente los mismos tipos', JSON.stringify([...idsCliente].sort()) === JSON.stringify([...P.TIPOS_DE_PAGINA].sort()));
check('1e) los campos de antes no cambian de nombre', P.CAMPOS_POR_TIPO.character.join() === 'characterType,biography,origin,nature' && P.CAMPOS_POR_TIPO.company.join() === 'industry,businessDescription'
  && P.CAMPOS_POR_TIPO.influencer.join() === 'contentCategory,biography,socialLinks,topics' && P.CAMPOS_POR_TIPO.brand.join() === 'industry,brandDescription,visualIdentity');
check('1f) «company» se rotula Negocio (sin cambiar su id)', es.type_company === 'Negocio' && en.type_company === 'Business');
check('1g) una página guardada con un tipo de antes se sigue validando', DE_SIEMPRE.every((type) => P.validarPagina({ type, name: 'X', handle: 'xx_1' }, (u) => u).type === type));

/* 2. Claves en español e inglés (el resto de idiomas lo exige el tipo de TypeScript) */
const faltan = [];
for (const t of C.TIPOS_DE_PAGINA) {
  const claves = [t.claveTitulo, t.claveDescripcion, ...t.campos.map((c) => c.clave), ...t.campos.flatMap((c) => (c.opciones ?? []).map((o) => o.clave)), ...t.secciones.map((s) => C.SECCIONES_DE_PAGINA[s].clave)];
  for (const k of claves) for (const [n, d] of [['es', es], ['en', en]]) if (!d[k.replace(/^pages\./, '')]) faltan.push(`${n}:${k}`);
  if (!t.icono || !t.secciones.length) faltan.push(`${t.id}:icono/secciones`);
}
for (const g of C.GRUPOS_DE_PAGINA) if (g.clave) for (const [n, d] of [['es', es], ['en', en]]) if (!d[g.clave.replace(/^pages\./, '')]) faltan.push(`${n}:${g.clave}`);
for (const c of C.COLORES_DE_OBRA) for (const [n, d] of [['es', es], ['en', en]]) if (!d[c.clave.replace(/^pages\./, '')]) faltan.push(`${n}:${c.clave}`);
check('2a) cada tipo, campo, sección, grupo y color tiene su clave en es y en', faltan.length === 0, faltan.slice(0, 8).join(' · '));
check('2b) todos los tipos están en algún grupo del selector', C.TIPOS_DE_PAGINA.every((t) => C.GRUPOS_DE_PAGINA.some((g) => g.id === t.grupo)));
check('2c) el catálogo guarda CLAVES, no frases', C.TIPOS_DE_PAGINA.every((t) => /^pages\.type_/.test(t.claveTitulo) && /^pages\.desc_/.test(t.claveDescripcion)));

/* 3. El servidor acepta los tipos nuevos y pide lo mismo que el cliente */
const foto = (u) => { if (!u.startsWith('https://ok/')) throw new P.PageError('foto'); return u; };
const iguales = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
check('3a) cada tipo pide los mismos campos en el cliente y en el servidor', C.TIPOS_DE_PAGINA.every((t) => iguales(t.campos.map((c) => c.id), P.CAMPOS_POR_TIPO[t.id])),
  C.TIPOS_DE_PAGINA.filter((t) => !iguales(t.campos.map((c) => c.id), P.CAMPOS_POR_TIPO[t.id])).map((t) => t.id).join(','));
check('3b) las mismas secciones y los mismos colores en los dos lados', iguales(C.IDS_DE_SECCION, P.SECCIONES_DE_PAGINA) && iguales(C.COLORES_DE_OBRA.map((c) => c.id), P.COLORES_DE_OBRA));
const libro = P.validarPagina({
  type: 'book', name: 'Jay Reeds and the Heart of Etter', handle: 'jayreeds.saga',
  details: { genre: 'Space western', year: '2026', format: 'Novela', industry: 'no toca' },
  sections: [{ id: 'synopsis', enabled: true }, { id: 'sample', enabled: false }, { id: 'whereToBuy', enabled: true }],
  links: [{ label: 'Amazon', url: 'amazon.com/dp/123' }], gallery: ['https://ok/a.png', 'https://ok/b.png'], workColor: 'wine', presenter: 'hidi_cuenta',
}, foto);
check('3c) un libro se valida con sus campos, secciones, imágenes, enlace y color', libro.type === 'book' && libro.details.genre === 'Space western' && !('industry' in libro.details)
  && libro.sections.length === 3 && libro.sections[1].enabled === false && libro.links[0].url === 'https://amazon.com/dp/123' && libro.gallery.length === 2 && libro.workColor === 'wine');
check('3d) todos los tipos nuevos se aceptan', NUEVOS.every((type) => P.validarPagina({ type, name: 'Obra', handle: 'obra_1' }, foto).type === type));
check('3e) una sección desconocida o repetida se rechaza', lanza(() => P.validarSecciones([{ id: 'muro' }]), 'seccion') && lanza(() => P.validarSecciones([{ id: 'gallery' }, { id: 'gallery' }]), 'seccion'));
check('3f) un color que no es del catálogo se rechaza', lanza(() => P.validarPagina({ type: 'book', name: 'X', handle: 'xx_1', workColor: '#ff0000' }, foto), 'color'));
check('3g) las imágenes de la obra pasan por la misma regla de fotos y tienen tope', lanza(() => P.validarPagina({ type: 'book', name: 'X', handle: 'xx_1', gallery: ['https://otro/x.png'] }, foto), 'foto')
  && lanza(() => P.validarPagina({ type: 'book', name: 'X', handle: 'xx_1', gallery: Array.from({ length: P.MAX_IMAGENES + 1 }, (_, i) => `https://ok/${i}.png`) }, foto), 'foto'));
check('3h) el presentador NO sale de la validación pura (lo resuelve savePage y publica solo su referencia)', !('presenter' in libro) && !Object.values(libro).includes('hidi_cuenta'));

/* 4. Enlaces: solo https, en los dos lados */
const casos = [
  ['amazon.com/dp/123', 'https://amazon.com/dp/123'],
  ['https://www.etsy.com/shop/barro', 'https://www.etsy.com/shop/barro'],
  ['http://tienda.com', null], ['javascript:alert(1)', null], ['mailto:a@b.com', null], ['ftp://x.com', null], ['https://localhost', null], ['tienda con espacios.com', null], ['https://user:pw@x.com', null],
];
const servidor = (v) => { try { return P.normalizarEnlace(v); } catch (e) { return e?.motivo === 'enlace' ? null : 'otro'; } };
check('4a) el servidor solo admite https y completa lo que no lleva esquema', casos.every(([v, r]) => servidor(v) === r), casos.filter(([v, r]) => servidor(v) !== r).map(([v]) => v).join(' · '));
check('4b) el cliente aplica la misma regla', casos.every(([v, r]) => E.normalizarEnlaceDeObra(v) === r), casos.filter(([v, r]) => E.normalizarEnlaceDeObra(v) !== r).map(([v]) => v).join(' · '));
check('4c) como mucho los enlaces del tope, cada uno https', lanza(() => P.validarEnlaces(Array.from({ length: P.MAX_ENLACES + 1 }, () => ({ url: 'a.com' }))), 'enlace')
  && lanza(() => P.validarEnlaces([{ label: 'x', url: 'http://a.com' }]), 'enlace'));
const plantilla = leer('components/pages/PlantillaDePagina.tsx');
check('4d) la plantilla abre la tienda de un toque, sin aviso, y solo si es https', /onPress=\{\(\) => \{ if \(e\.url\.startsWith\('https:\/\/'\)\) void Linking\.openURL\(e\.url\); \}\}/.test(plantilla)
  && !/confirmAction|Alert\.alert/.test(plantilla));

/* 5. Nada se vende dentro de Weë */
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const archivos = ['functions/src/social/pages.ts', 'services/pagesService.ts', 'screens/WeePagesScreen.tsx', 'screens/WeePageScreen.tsx', 'components/pages/PlantillaDePagina.tsx', 'components/pages/CabeceraDePagina.tsx', 'constants/pageTypes.ts'];
const venta = /spendCredits|creditsService|useWallet|purchase|in-app|mercadopago|stripe|\bprice\b|\bprecio\b|formatearMoneda|formato\.moneda|checkout/i;
const conVenta = archivos.filter((f) => venta.test(sinComentarios(leer(f))) || /\bIAP\b/.test(sinComentarios(leer(f))));
check('5a) ni Credits, ni pagos, ni precios en las páginas', conVenta.length === 0, conVenta.join(', '));
check('5b) un campo de precio que llegue no se guarda', !('price' in P.validarPagina({ type: 'painting', name: 'Marea VI', handle: 'marea_6', price: 300, details: { price: '300' } }, foto))
  && !('price' in P.validarPagina({ type: 'painting', name: 'Marea VI', handle: 'marea_6', details: { price: '300' } }, foto).details));
check('5c) el PDF del libro está preparado sin venta (solo muestra o descarga gratis, pendiente)', /pdfSoon/.test(leer('screens/WeePagesScreen.tsx')) && /gratis/.test(es.pdfSoon) && !/vender|venta|pago/i.test(es.pdfSoon.replace('Nunca se vende', '')));

/* 6. «Presentada por»: la referencia pública, nunca la cuenta */
const ENT = 'ent_0123456789abcdefghjkmnpqrs';
check('6a) una cara con entidad se publica por su entidad', P.referenciaDelPresentador({ uid: 'hidi_ana', entityId: ENT }, 'ana') === ENT);
check('6b) un alter ego sin entidad NO se publica (su uid lleva la cuenta)', P.referenciaDelPresentador({ uid: 'hidi_ana' }, 'ana') === null);
check('6c) el Perfil Real sin entidad se nombra como ya se enlaza (su uid)', P.referenciaDelPresentador({ uid: 'ana' }, 'ana') === 'ana');
const srv = sinComentarios(leer('functions/src/social/pages.ts'));
check('6d) savePage comprueba que la cara es de la cuenta y guarda solo presenterRef', /cuentaDelPerfilLeido\(db, pedido, perfil\)\) !== cuenta\) throw new PageError\('presentador'\)/.test(srv) && /presenterRef,/.test(srv) && !/presenter:/.test(srv.replace(/presenter\?: unknown/, '')));
check('6e) el editor elige entre el Perfil Real, los alter egos o nadie', /useUserProfile\(\)/.test(leer('screens/WeePagesScreen.tsx')) && /alterEgos/.test(leer('screens/WeePagesScreen.tsx')) && /'pages\.presenterNone'/.test(leer('screens/WeePagesScreen.tsx')));
check('6f) la página abre el perfil de quien la presenta por su referencia pública', /navigate\('UserProfile', \{ userId: presenterRef \}\)/.test(leer('screens/WeePageScreen.tsx')) && /getByPublicRef\(presenterRef\)/.test(leer('screens/WeePageScreen.tsx')));

/* 7. La plantilla negra: obra en EB Garamond, interfaz en Manrope */
check('7a) la obra se pinta con EB Garamond (useFuenteDeObra) y la interfaz con Manrope', /useFuenteDeObra\(\)/.test(plantilla) && /useFuenteDeObra\(\)/.test(leer('components/pages/CabeceraDePagina.tsx')) && /FAMILIA_WEEAI/.test(leer('constants/estiloWeePage.ts')));
check('7b) una sección vacía no se publica', /if \(!s\.enabled\) return false;/.test(plantilla) && /muestra: false/.test(plantilla));

console.log(fallos ? `\n${fallos} comprobación(es) fallaron` : '\nWeë Pages: tipos de obra, secciones, enlaces https y nada a la venta');
process.exit(fallos ? 1 : 0);
