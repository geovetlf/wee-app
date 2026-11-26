/*
 * APARCADA FUERA DE LA CADENA (2026-11-05, E2). Prueba infraestructura PRESERVADA y pendiente de integración
 * (SentidoDeLaPagina, escriturasDeLaInterfaz, textoDePersona, fuentes multiescritura), que hoy no está conectada a la
 * app: sus fallos actuales son esperables mientras no se conecte. Las aserciones del envoltorio components/Ionicons.tsx y
 * de hooks/useLayoutRTL.ts se quitaron al retirarse esas dos copias.
 *
 * RTL Y ESCRITURAS — lo que se puede comprobar sin abrir un navegador. La pantalla se mira aparte (capturas medidas).
 *
 *  A · un solo sitio cambia el sentido de la página, y lo hace desde el dato del idioma;
 *  B · la regla bidi: el texto de interfaz sigue a la página, el de una persona conserva el suyo;
 *  C · las caras nuevas no tocan a Inter y cada archivo trae su licencia;
 *  D · el cero persa se distingue del punto: se MIDE en el archivo de la fuente;
 *  E · propiedades lógicas e iconos, y los componentes corregidos.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leer = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');
let fallos = 0;
const check = (n, c, x = '') => { console.log((c ? '✔ ' : '✘ ') + n + (x ? ' — ' + x : '')); if (!c) fallos++; };
const lista = (d) => fs.readdirSync(path.join(raiz, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? lista(`${d}/${e.name}`) : /\.tsx?$/.test(e.name) ? [`${d}/${e.name}`] : []));
const CODIGO = ['components', 'screens', 'navigation'].flatMap(lista);

console.log('── A · el sentido de la página ──');
const sentido = leer('components/SentidoDeLaPagina.tsx');
check('A1) `<html dir>` sale de `direccion`, el dato del idioma', /documentElement\.dir = direccion/.test(sentido) && /useIdioma\(\)/.test(sentido));
check('A2) ningún código de idioma escrito a mano', !/'(ar|fa|he|ur)'/.test(sentido));
const escriben = [...CODIGO, 'App.tsx', 'contexts/IdiomaContext.tsx', 'hooks/useDireccion.ts'].filter((f) => /documentElement\.dir\b|forceRTL/.test(leer(f).replace(/\/\*[\s\S]*?\*\//g, '')));
check('A3) es el ÚNICO archivo que escribe `dir` o llama a `forceRTL`', escriben.join() === 'components/SentidoDeLaPagina.tsx', escriben.join());
check('A4) envuelve la app dentro del proveedor de idioma', /<IdiomaProvider>\s*\n\s*<SentidoDeLaPagina>/.test(leer('App.tsx')) && /<\/SentidoDeLaPagina>\s*\n\s*<\/IdiomaProvider>/.test(leer('App.tsx')));
check('A5) y da la dirección a React Native Web por su propio contexto: sin eso, las propiedades lógicas no se reflejan', /<View \{\.\.\.propsDeSentido\}/.test(sentido));

console.log('── B · la regla bidi ──');
const web = leer('utils/escriturasDeLaInterfaz.web.ts');
check('B1) el texto de interfaz sigue a la página, salvo el contenido de una persona', /html\[dir="rtl"\] div\[dir="auto"\]:not\(\[data-contenido\]\)/.test(web));
check('B2) solo actúa en RTL: todas las reglas de sentido llevan html[dir="rtl"]', (web.match(/direction: rtl/g) || []).length === 2 && !/^\s*(div|span|input)\[dir/m.test(web));
check('B3) un campo se orienta por lo que se escribe; solo su texto de ayuda sigue a la página', /input\[dir="auto"\]:placeholder-shown/.test(web));
const persona = ['components/CommentCard.tsx', 'screens/PostDetailScreen.tsx', 'screens/ConversationScreen.tsx'];
check('B5) publicaciones, comentarios y mensajes se marcan como texto de una persona', persona.every((f) => leer(f).includes('{...TEXTO_DE_PERSONA}')));

console.log('── C · las caras ──');
const tipos = leer('constants/typography.ts');
check('C1) Inter sigue siendo la familia de Weë', /regular: 'Inter_400Regular'/.test(tipos) && /bold: 'Inter_700Bold'/.test(tipos));
check('C2) cada cara nueva lleva `unicode-range`: lo latino no cambia de archivo', /unicode-range:\$\{escritura\.rango\}/.test(web) && !/U\+0000|U\+0041/.test(web));
const D = 'assets/fonts/multiescritura';
const FAM = ['Vazirmatn', 'NotoSansHebrew', 'NotoSansKhmer', 'NotoSansDevanagari'];
const PESOS = ['400Regular', '500Medium', '600SemiBold', '700Bold'];
check('C3) las cuatro familias en los cuatro pesos que usa Weë', FAM.every((f) => PESOS.every((p) => fs.existsSync(path.join(raiz, D, `${f}_${p}.ttf`)) && web.includes(`${f}_${p}.ttf`))));
check('C4) cada familia trae su licencia OFL', FAM.every((f) => /SIL Open Font License/i.test(leer(`${D}/OFL-${f}.txt`))));
check('C5) el nativo no carga ninguna de estas fuentes', !/require\(/.test(leer('utils/escriturasDeLaInterfaz.ts')));
// C6 corregida (2026-11-06, decisiones del dueño, T): el eslogan SE LOCALIZA por idioma (decisión definitiva del
// 2026-11-04: Imagine · Create · Connect / Imagina · Crea · Conecta…); solo «Weë» queda intacto. La comprobación anterior
// exigía el lema fijo en español dentro de Header.tsx y contradecía esa decisión. El detalle por idioma lo fija
// functions/test/eslogan-localizado.test.mjs; aquí solo se mira que la firma sale del diccionario y que «Weë» no se traduce.
{
  const header = leer('components/Header.tsx');
  const esNav = leer('i18n/textos/es/nav.ts');
  const enNav = leer('i18n/textos/en/nav.ts');
  const eslogan = (txt) => (txt.match(/^ {2}brandSlogan: '([^']*)'/m) || [])[1] || '';
  check('C6) el eslogan de marca se localiza por idioma y «Weë» queda intacto',
    /t\('nav\.brandSlogan'\)/.test(header) && !/LEMA_DE_MARCA\s*=\s*'/.test(header)
    && eslogan(esNav) === 'Imagina · Crea · Conecta' && eslogan(enNav) === 'Imagine · Create · Connect'
    && !/Weë|Wee/i.test(eslogan(esNav) + eslogan(enNav)) && /documentTitle: 'Weë - \{\{eslogan\}\}'/.test(esNav),
    `es «${eslogan(esNav)}» · en «${eslogan(enNav)}»`);
}

console.log('── D · el cero persa ──');
const caja = (ruta, cp) => {
  const b = fs.readFileSync(ruta); const t = {};
  for (let i = 0; i < b.readUInt16BE(4); i++) { const o = 12 + i * 16; t[b.toString('latin1', o, o + 4)] = b.readUInt32BE(o + 8); }
  const n = b.readUInt16BE(t.cmap + 2); let sub = -1;
  for (let i = 0; i < n; i++) { const o = t.cmap + b.readUInt32BE(t.cmap + 8 + i * 8); if (b.readUInt16BE(o) === 4) sub = o; }
  const sc = b.readUInt16BE(sub + 6) / 2, fin = sub + 14, ini = fin + sc * 2 + 2, del = ini + sc * 2, ro = del + sc * 2; let g = 0;
  for (let i = 0; i < sc; i++) if (cp >= b.readUInt16BE(ini + i * 2) && cp <= b.readUInt16BE(fin + i * 2)) { const r = b.readUInt16BE(ro + i * 2), d = b.readInt16BE(del + i * 2); g = r === 0 ? (cp + d) & 0xffff : (b.readUInt16BE(ro + i * 2 + r + (cp - b.readUInt16BE(ini + i * 2)) * 2) + d) & 0xffff; break; }
  const largo = b.readInt16BE(t.head + 50); const o0 = largo ? b.readUInt32BE(t.loca + g * 4) : b.readUInt16BE(t.loca + g * 2) * 2; const s = t.glyf + o0;
  return { w: b.readInt16BE(s + 6) - b.readInt16BE(s + 2), h: b.readInt16BE(s + 8) - b.readInt16BE(s + 4) };
};
for (const peso of ['400Regular', '700Bold']) {
  const ruta = path.join(raiz, D, `Vazirmatn_${peso}.ttf`);
  const cero = caja(ruta, 0x06f0), punto = caja(ruta, 0x2e);
  check(`D1) ${peso}: el «۰» mide al menos 1,8 veces el punto, en ancho y en alto`, cero.w >= punto.w * 1.8 && cero.h >= punto.h * 1.8, `${cero.w}×${cero.h} frente a ${punto.w}×${punto.h}`);
}
check('D2) el rango árabe incluye los dígitos persas', /U\+0600-06FF/.test(web));
const formato = leer('i18n/formato.ts');
check('D3) ningún dígito persa se convierte a mano: los pone Intl', !/[۰-۹]/.test(formato) && /Intl\.NumberFormat/.test(formato));

console.log('── E · propiedades lógicas, iconos y componentes ──');
const EXCEPCIONES = /components\/studio\/produccion\/|components\/creator\/TarjetaTresD\.tsx/;
const fisicas = CODIGO.filter((f) => !EXCEPCIONES.test(f) && /(?<![\w.])(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/.test(leer(f)));
check('E1) ninguna propiedad física de margen, relleno o borde fuera de las coordenadas de contenido', fisicas.length === 0, fisicas.slice(0, 5).join(', '));
// E2 y E3 (envoltorio components/Ionicons.tsx) retiradas en E2 (2026-11-05) junto con esa copia: invertir iconos es
// cosa de IconoDireccional/useDireccion (functions/test/rtl-flechas.test.mjs).
const ajustes = leer('screens/SettingsScreen.tsx');
check('E4) en Ajustes, título y control nunca se tocan', /settingItem: \{[^}]*gap: 12,/.test(ajustes));
check('E5) la etiqueta de la tarjeta Weëls no se corta a una línea', /styles\.sampleLabel\} numberOfLines=\{3\}/.test(leer('components/WeelsRow.tsx')));
const conAreaLogica = CODIGO.filter((f) => /hitSlop={{[^}]*b(start|end):/.test(leer(f)) || /AREA_TACTIL = {[^}]*b(start|end):/.test(leer(f)));
check('E6) ningún área de toque usa start o end: hitSlop solo entiende left y right', conAreaLogica.length === 0, conAreaLogica.join(', '));

console.log('── F · la fila «Weë AI Engine» ──');
check('F1) ya no se muestra por ser un build de desarrollo a quien no ha entrado', /useState<boolean>\(false\)/.test(ajustes) && /if \(!user \|\| user\.isAnonymous\) return;/.test(ajustes));
check('F2) la marca es por cuenta, no por aparato', /`\$\{ENGINE_ADMIN_FLAG\}\.\$\{user\.uid\}`/.test(ajustes) && /`\$\{ENGINE_ADMIN_FLAG\}\.\$\{uid\}`/.test(leer('screens/EngineAdminScreen.tsx')));
const servidor = leer('functions/src/engine/admin.ts');
check('F3) el servidor sigue exigiendo administración antes de cualquier acción', /async \(request\) => \{\s*\n\s*assertAdmin\(request\.auth as any\);/.test(servidor));

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
