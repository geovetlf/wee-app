/*
 * EN FILIPINO, NINGÚN RESPALDO «USER» DETRÁS DE «SI»/«NI»/«KAY».
 *
 *   node test/respaldo-sin-nombre.test.mjs
 *
 * Cuando una persona no tiene nombre, la app y la página pública rellenaban `{{nombre}}` con un respaldo: «User» en
 * filipino. En tres sitios ese hueco cae detrás de un marcador de persona —«si», «ni», «kay»—, que no admite un
 * sustantivo común (guía de filipino § 12):
 *   · la línea del reposteo de la página pública (`publica.reposteo` + `publica.alguien`): «Nag-repost si User»;
 *   · la del muro (`wall.repostedBy` + `common.user`, en PostCard): «Nag-repost si User»;
 *   · las confirmaciones de ËContact en un perfil (`econtact.*Confirm` + `econtact.somePerson`):
 *     «Tanggihan ang request ni User?», «Bawiin ang request mo kay User?», «Alisin si User sa …?»;
 *   · el aviso de ËContact guardaba un «Alguien» escrito a mano (E);
 *   · y, sin respaldo ninguno, las etiquetas y confirmaciones de la agenda (EContactScreen) y la segunda cabecera de
 *     reposteo de PostCard, que con el nombre vacío dejaban «Tanggapin ang request ni » o «Nag-repost si » (D, 7).
 * Ahora cada una tiene su gemela `<clave>SinNombre` (decisión 6 de la guía): en los otros 16 idiomas es la MISMA frase
 * —allí no cambia nada— y en filipino otra, con el marcador de los sustantivos comunes («May nag-repost»,
 * «Tanggihan ang request ng taong ito?»). Y los respaldos que se pintan solos dejan de ser «User» donde no lo eran en
 * el glosario: `publica.alguien` = «Isang user» (como `common.someone`) y `econtact.somePerson` = «taong ito».
 *
 * Se ejecuta el código de verdad: la página pública (`postPageHtml.ts` con la tabla generada) y el traductor de la app
 * con los diccionarios reales.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
const sinComentarios = (t) => t.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

/* El cargador de siempre: transpila y ejecuta los módulos de verdad, con sus imports relativos. */
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (base) => (fs.existsSync(path.resolve(raiz, base + '.ts')) ? base + '.ts' : base + '/index.ts');
const cargados = new Map();
const cargar = async (ruta) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  let js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const carpeta = path.posix.dirname(ruta.split(path.sep).join('/'));
  for (const [, rel] of js.matchAll(/from ['"](\.[^'"]*)['"]/g)) {
    const url = (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, rel))))).url;
    js = js.split(`from '${rel}'`).join(`from '${url}'`).split(`from "${rel}"`).join(`from "${url}"`);
  }
  const r = { url: comoModulo(js), ns: await import(comoModulo(js)) };
  cargados.set(ruta, r);
  return r;
};

const PAGINA = (await cargar('functions/src/public/postPageHtml.ts')).ns;
const { PAGINA_PUBLICA } = (await cargar('functions/src/shared/textosDelServidor.ts')).ns;
const { DICCIONARIOS } = (await cargar('i18n/diccionarios.ts')).ns;
const { crearTraductor } = (await cargar('i18n/traducir.ts')).ns;

/* «User» como palabra suelta, y un marcador de persona delante de un respaldo (o de cualquier sustantivo común). */
const conUser = (s) => /\bUser\b/.test(s);
const MARCADOR_DELANTE = /(^|[\s¿])(si|ni|kay)\s+(User|Isang user|taong ito|isang|user)\b/i;

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · La página pública ──');
// ════════════════════════════════════════════════════════════════════════════
const POST = { id: 'p1', content: 'Hola', fecha: '3 oct 2026' };
const pagina = (codigo, extra) => PAGINA.paginaDeLaPublicacion({ ...POST, ...extra }, 'https://wee.zone', PAGINA_PUBLICA[codigo]);
const lineaDelReposteo = (html) => (html.match(/<div class="reposteo">([^<]*)<\/div>/) || [])[1];

const filSin = pagina('fil', { autor: { displayName: '' }, reposteadaPor: '' });
check('1) filipino, reposteo sin nombre: «May nag-repost», sin «si» delante de nadie', lineaDelReposteo(filSin) === 'May nag-repost', lineaDelReposteo(filSin));
check('1) y el autor sin nombre es «Isang user»: «Isang user sa Weë» en el título y en la tarjeta',
  filSin.includes('<title>Isang user sa Weë</title>') && filSin.includes('<div class="nombre">Isang user'));
check('1) en toda la página filipina sin nombres no aparece «User» ni un marcador delante de un respaldo',
  !conUser(filSin) && !MARCADOR_DELANTE.test(filSin.replace(/<[^>]+>/g, ' ')));
const filCon = pagina('fil', { autor: { displayName: 'Lucía' }, reposteadaPor: 'Marco' });
check('2) con nombre, lo de siempre: «Nag-repost si Marco» y «Lucía sa Weë»', lineaDelReposteo(filCon) === 'Nag-repost si Marco' && filCon.includes('<title>Lucía sa Weë</title>'));
check('2) y sin reposteo, ninguna línea de reposteo', !lineaDelReposteo(pagina('fil', { autor: { displayName: 'Lucía' } })));
/* En los otros idiomas de la página, la misma línea de siempre, con su respaldo. */
const OTROS = { es: 'Alguien reposteó', en: 'Someone reposted', da: 'Nogen delte igen' };
const cambianOtros = Object.entries(OTROS).filter(([c, esperado]) => lineaDelReposteo(pagina(c, { autor: { displayName: '' }, reposteadaPor: '' })) !== esperado).map(([c]) => c);
check('3) en español, inglés y danés el reposteo sin nombre es el de siempre: «Alguien reposteó»…', cambianOtros.length === 0, cambianOtros.join(' '));
check('3) y la copia española que lleva la página (sin imports) también la tiene', PAGINA.TEXTOS_ES.reposteoSinNombre === PAGINA.TEXTOS_ES.reposteo);
check('3) sin tabla (el español de siempre), «Alguien reposteó»',
  lineaDelReposteo(PAGINA.paginaDeLaPublicacion({ ...POST, reposteadaPor: '' })) === 'Alguien reposteó');
/* El servidor ya no mete el respaldo en el nombre: deja el hueco vacío y la página elige la frase. */
const SERVIDOR = sinComentarios(leer('functions/src/public/postPage.ts'));
check('4) postPage.ts deja vacío el nombre de quien reposteó si no lo tiene (no mete el respaldo)',
  /reposteadaPor = texto\(quienReposteo\?\.displayName\) \|\| '';/.test(SERVIDOR) && !/reposteadaPor = [^;]*tabla\.alguien/.test(SERVIDOR));
/* SABOTAJE: la página de antes —respaldo dentro de la frase con nombre— daría «Nag-repost si User». */
const antes = PAGINA_PUBLICA.fil.reposteo.replace('{{nombre}}', 'User');
check('4) SABOTAJE: la frase de antes, «Nag-repost si User», no pasaría', conUser(antes) && MARCADOR_DELANTE.test(antes));

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · La app: el reposteo del muro y las confirmaciones de ËContact ──');
// ════════════════════════════════════════════════════════════════════════════
const tFil = crearTraductor('fil-PH', DICCIONARIOS, { modoDesarrollo: false });
const GEMELAS = [['wall.repostedBy', 'common.user', {}], ['econtact.rejectConfirm', 'econtact.somePerson', {}],
  ['econtact.withdrawConfirm', 'econtact.somePerson', {}], ['econtact.removeConfirm', 'econtact.somePerson', { lista: 'ËContacts' }]];
/* Lo que lee alguien en filipino cuando la persona no tiene nombre: la gemela, con el respaldo en el hueco (si lo hay). */
const vistoSinNombre = GEMELAS.map(([clave, respaldo, otros]) => [clave, tFil(`${clave}SinNombre`, { nombre: tFil(respaldo), ...otros })]);
const malas = vistoSinNombre.filter(([, v]) => conUser(v) || MARCADOR_DELANTE.test(v) || /\{\{/.test(v)).map(([k, v]) => `${k}: ${v}`);
check('5) filipino sin nombre: ninguna de las cuatro frases lleva «User» ni un marcador delante de un respaldo', malas.length === 0, malas.join(' | '));
check('5) «May nag-repost», «Tanggihan ang request ng taong ito?», «Bawiin ang request mo sa taong ito?», «Alisin ang taong ito sa ËContacts mo?»',
  JSON.stringify(vistoSinNombre.map(([, v]) => v)) === JSON.stringify(['May nag-repost', 'Tanggihan ang request ng taong ito?',
    'Bawiin ang request mo sa taong ito?', 'Alisin ang taong ito sa ËContacts mo?']), vistoSinNombre.map(([, v]) => v).join(' | '));
const conNombre = GEMELAS.map(([clave, , otros]) => tFil(clave, { nombre: 'Ana', ...otros }));
check('5) con nombre, las de siempre: «Nag-repost si Ana», «…ni Ana?», «…kay Ana?», «Alisin si Ana…»',
  JSON.stringify(conNombre) === JSON.stringify(['Nag-repost si Ana', 'Tanggihan ang request ni Ana?', 'Bawiin ang request mo kay Ana?', 'Alisin si Ana sa ËContacts mo?']),
  conNombre.join(' | '));
check('5) y los respaldos filipinos ya no son «User» donde iban detrás de un marcador: `econtact.somePerson` = «taong ito»',
  DICCIONARIOS.fil.econtact.somePerson === 'taong ito' && PAGINA_PUBLICA.fil.alguien === 'Isang user');
/*
 * En los otros 16 idiomas cada gemela es la MISMA frase (allí no cambia nada), salvo donde `econtact.somePerson` no
 * encaja en el caso que pide la frase y la gemela va escrita entera: en alemán «von» pide dativo («von dieser Person»;
 * somePerson es «diese Person») y en ruso las frases «Acción: nombre» (que no declinan el nombre) se escriben
 * declinadas («отправленную этому человеку», «этого человека»). Son esas y solo esas.
 */
const CARPETAS = fs.readdirSync(path.resolve(raiz, 'i18n/textos')).filter((n) => !n.includes('.'));
const UNICOS = [...new Set(Object.values(DICCIONARIOS))];
const ECONTACT = ['accept', 'reject', 'withdraw', 'removeFrom', 'openProfile', 'rejectConfirm', 'withdrawConfirm', 'removeConfirm'];
const TODAS = [['wall', 'repostedBy'], ...ECONTACT.map((k) => ['econtact', k])];
const POR_CASO = { de: { openProfile: 'dieser Person', rejectConfirm: 'dieser Person' },
  ru: { withdraw: 'этому человеку', openProfile: 'этого человека', withdrawConfirm: 'этому человеку' } };
const codigoDe = (d) => Object.keys(DICCIONARIOS).find((c) => DICCIONARIOS[c] === d && !c.includes('-')) ?? '?';
const cambian = [];
for (const d of UNICOS.filter((x) => x !== DICCIONARIOS.fil)) {
  const codigo = codigoDe(d);
  for (const [m, k] of TODAS) {
    const propia = POR_CASO[codigo]?.[k];
    const gemela = d[m][`${k}SinNombre`];
    const bien = propia ? gemela !== d[m][k] && gemela.includes(propia) && !/\{\{\s*nombre\s*\}\}/.test(gemela) : gemela === d[m][k];
    if (!bien) cambian.push(`${codigo}:${m}.${k}`);
  }
}
check(`6) en los otros ${UNICOS.length - 1} diccionarios cada <clave>SinNombre es la MISMA frase, salvo las cinco de caso (de «von dieser Person», ru declinadas)`,
  CARPETAS.length === 17 && UNICOS.length === 17 && cambian.length === 0, cambian.slice(0, 5).join(' '));

/* Las pantallas eligen la gemela cuando no hay nombre. */
const TARJETA = sinComentarios(leer('components/PostCard.tsx'));
check('7) PostCard: sin nombre de quien reposteó, `wall.repostedBySinNombre` (y con nombre, `wall.repostedBy`)',
  /repostAuthor\?\.displayName\s*\?\s*t\('wall\.repostedBy', \{ nombre: repostAuthor\.displayName \}\)\s*:\s*t\('wall\.repostedBySinNombre', \{ nombre: t\('common\.user'\) \}\)/.test(TARJETA)
  && !/t\('wall\.repostedBy', \{ nombre: repostAuthor\?\.displayName \|\| t\('common\.user'\) \}\)/.test(TARJETA));
/* Y es UNA línea para las dos cabeceras de reposteo (la de mientras carga el original y la de ya cargado). */
check('7) PostCard: las dos cabeceras de reposteo pintan la MISMA línea, `lineaDelReposteo`; ninguna llama a `wall.repostedBy` por su cuenta',
  (TARJETA.match(/const lineaDelReposteo = /g) || []).length === 1 && (TARJETA.match(/\{lineaDelReposteo\}/g) || []).length === 2
  && (TARJETA.match(/t\('wall\.repostedBy'/g) || []).length === 1);
const TARJETA_SEGUNDA_ANTES = TARJETA.replace(/(\{isRepost && repostAuthor && \([\s\S]*?)\{lineaDelReposteo\}/, "$1{t('wall.repostedBy', { nombre: repostAuthor.displayName })}");
check('7) SABOTAJE: con la segunda cabecera de antes (el nombre vacío dejaba «Nag-repost si »), la comprobación falla',
  TARJETA_SEGUNDA_ANTES !== TARJETA && (TARJETA_SEGUNDA_ANTES.match(/\{lineaDelReposteo\}/g) || []).length !== 2
  && tFil('wall.repostedBy', { nombre: '' }) === 'Nag-repost si ');
const PERFIL = sinComentarios(leer('screens/UserProfileScreen.tsx'));
check('7) UserProfileScreen: las tres confirmaciones pasan por la gemela cuando el perfil no tiene nombre',
  /const conNombre = !!userProfile\?\.displayName;/.test(PERFIL)
  && /t\(conNombre \? clave : `\$\{clave\}SinNombre`, \{ nombre: quien, \.\.\.valores \}\)/.test(PERFIL)
  && ['rejectConfirm', 'withdrawConfirm', 'removeConfirm'].every((k) => PERFIL.includes(`confirmacion('econtact.${k}'`))
  && !/t\('econtact\.(rejectConfirm|withdrawConfirm|removeConfirm)', \{ nombre: quien/.test(PERFIL));
/* SABOTAJE: la tarjeta de antes no pasaría. */
const TARJETA_ANTES = TARJETA.replace(/repostAuthor\?\.displayName\s*\?[\s\S]*?t\('wall\.repostedBySinNombre', \{ nombre: t\('common\.user'\) \}\)/,
  "t('wall.repostedBy', { nombre: repostAuthor?.displayName || t('common.user') })");
check('7) SABOTAJE: con la tarjeta de antes la comprobación falla', TARJETA_ANTES !== TARJETA && !/wall\.repostedBySinNombre/.test(TARJETA_ANTES));

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · La agenda (EContactScreen): perfil sin nombre ──');
// ════════════════════════════════════════════════════════════════════════════
/*
 * Las etiquetas del lector de pantalla y las confirmaciones de cada fila llevaban `perfil.displayName` a pelo: con el
 * nombre vacío decían «Tanggapin ang request ni » (y «Aceptar a » en español). Ahora, como el perfil, el hueco lo
 * rellena `econtact.somePerson` y la frase es la gemela `<clave>SinNombre`.
 */
const AGENDA = sinComentarios(leer('screens/EContactScreen.tsx'));
const VALORES = { lista: 'ËContacts', etiqueta: 'Weë profile' };
/* Cómo se lee cada frase de la agenda sin nombre en un idioma: lo mismo que hace la pantalla. */
const sinNombreEn = (t) => ECONTACT.map((k) => [k, t(`econtact.${k}SinNombre`, { nombre: t('econtact.somePerson'), ...VALORES })]);
const HUECO_ROTO = /(^|\s)(ni|si|kay|a|de|von|an|à|di|för|fra|til)\s*[?？]?\s*$|\s{2}|\{\{|\(\s*\)|:\s*[?？]?\s*$/i;
const rotas = [];
for (const codigo of CARPETAS) {
  const t = crearTraductor(codigo, DICCIONARIOS, { modoDesarrollo: false });
  for (const [k, v] of sinNombreEn(t)) if (!v.trim() || HUECO_ROTO.test(v)) rotas.push(`${codigo}:${k} «${v}»`);
}
check('9) en los 17 idiomas, ninguna etiqueta ni confirmación de la agenda sin nombre acaba en un marcador vacío («ni », «si », «kay », «a »…)',
  rotas.length === 0, rotas.slice(0, 4).join(' | '));
const filAgenda = Object.fromEntries(sinNombreEn(tFil));
check('9) filipino: «Tanggapin ang request ng taong ito», «Bawiin ang request mo sa taong ito», «Alisin ang taong ito sa ËContacts mo», «Buksan ang Weë profile ng taong ito»',
  filAgenda.accept === 'Tanggapin ang request ng taong ito' && filAgenda.reject === 'Tanggihan ang request ng taong ito'
  && filAgenda.withdraw === 'Bawiin ang request mo sa taong ito' && filAgenda.removeFrom === 'Alisin ang taong ito sa ËContacts mo'
  && filAgenda.openProfile === 'Buksan ang Weë profile ng taong ito', JSON.stringify(filAgenda));
check('9) y en filipino ninguna lleva «si»/«ni»/«kay» delante de «taong ito» ni «User»',
  Object.values(filAgenda).every((v) => !conUser(v) && !MARCADOR_DELANTE.test(v)));
/* Con nombre, las de siempre en filipino y en español. */
const tEs = crearTraductor('es', DICCIONARIOS, { modoDesarrollo: false });
check('10) con nombre la frase no cambia: «Tanggapin ang request ni Ana», «Aceptar a Ana», «Abrir el Perfil Weë de Ana»',
  tFil('econtact.accept', { nombre: 'Ana' }) === 'Tanggapin ang request ni Ana' && tEs('econtact.accept', { nombre: 'Ana' }) === 'Aceptar a Ana'
  && tEs('econtact.openProfile', { nombre: 'Ana', etiqueta: 'Perfil Weë' }) === 'Abrir el Perfil Weë de Ana');
check('10) y sin nombre, en español, la misma frase con «esta persona»: «Aceptar a esta persona»',
  tEs('econtact.acceptSinNombre', { nombre: tEs('econtact.somePerson') }) === 'Aceptar a esta persona');
/* La pantalla: las ocho frases pasan por `frase`, y el nombre que se pinta en la fila no cambia. */
const OCHO = ['openProfile', 'accept', 'reject', 'rejectConfirm', 'removeFrom', 'removeConfirm', 'withdraw', 'withdrawConfirm'];
check('11) EContactScreen: con nombre, la frase de siempre; sin nombre, la gemela con `econtact.somePerson` en el hueco',
  /const quien = nombre \|\| t\('econtact\.somePerson'\);/.test(AGENDA)
  && /t\(nombre \? clave : `\$\{clave\}SinNombre`, \{ nombre: quien, \.\.\.valores \}\)/.test(AGENDA)
  && OCHO.every((k) => AGENDA.includes(`frase('econtact.${k}'`)));
check('11) ninguna frase de la agenda recibe ya el nombre a pelo',
  !/t\('econtact\.(openProfile|accept|reject|rejectConfirm|removeFrom|removeConfirm|withdraw|withdrawConfirm)', \{[^}]*\bnombre\b/.test(AGENDA)
  && /const nombre = perfil\.displayName;/.test(AGENDA));
/* Y el nombre de la fila, sin nombre, no queda vacío: el genérico de la app para un nombre suelto, en el idioma de quien mira. */
check('11) la fila de un perfil sin nombre pinta `common.user`, no un hueco vacío',
  /const nombreDeLaFila = nombre \|\| t\('common\.user'\);/.test(AGENDA) && /\{nombreDeLaFila\}\s*<\/Text>/.test(AGENDA) && !/\{nombre\}\s*<\/Text>/.test(AGENDA));
const filasMalas = CARPETAS.map((codigo) => [codigo, crearTraductor(codigo, DICCIONARIOS, { modoDesarrollo: false })('common.user')])
  .filter(([, v]) => !v.trim() || /\{\{|undefined|null/.test(v) || v === 'common.user');
check('11) y `common.user` existe y no está vacío en los 17 idiomas (filipino «User», el glosario: «Usuario» → «User»)',
  filasMalas.length === 0 && tFil('common.user') === 'User', filasMalas.map(([c, v]) => `${c}:«${v}»`).join(' '));
check('11) la accesibilidad sigue ahí: la fila es un botón con su etiqueta y cada acción recibe la suya',
  /accessibilityRole="button"\s*accessibilityLabel=\{frase\('econtact\.openProfile', \{ etiqueta: cara \}\)\}/.test(AGENDA)
  && /accessibilityLabel=\{etiqueta\}/.test(AGENDA) && (AGENDA.match(/etiqueta=\{frase\('econtact\./g) || []).length === 4);
/* SABOTAJE: la etiqueta de antes, con el nombre vacío, acababa en «ni ». */
check('11) SABOTAJE: la etiqueta de antes con el nombre vacío —«Tanggapin ang request ni »— no pasaría',
  HUECO_ROTO.test(tFil('econtact.accept', { nombre: '' })) && HUECO_ROTO.test(tEs('econtact.accept', { nombre: '' })));

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · El aviso de ËContact: sin respaldo escrito a mano ──');
// ════════════════════════════════════════════════════════════════════════════
/*
 * `econtactService.avisar` guardaba `senderName: mio?.displayName || 'Alguien'`: un español escrito a mano, guardado en
 * el aviso de OTRA persona. Nadie lo enseña —la pantalla y el push leen el perfil de `senderId`—, y el genérico lo pone
 * quien lee, en su idioma, con `common.someone` y `notifications.<clave>SinNombre`. Ahora se guarda el nombre o nada.
 */
const SERVICIO = sinComentarios(leer('services/econtactService.ts'));
const sinRespaldoAMano = (codigo) => !/['"`]Alguien['"`]/.test(codigo) && /const nombre = mio\?\.displayName \|\| '';/.test(codigo);
check('12) econtactService ya no escribe «Alguien» a mano: guarda el nombre de verdad o nada', sinRespaldoAMano(SERVICIO));
check('12) y las reglas admiten un `senderName` vacío (texto de hasta 200, sin mínimo)',
  /aviso\.senderName is string && aviso\.senderName\.size\(\) <= 200/.test(leer('firestore.rules')));
/* Quien lee un aviso de ËContact de alguien sin nombre: la frase sin nombre, con `common.someone`, en SU idioma. */
const PANTALLA_AVISOS = sinComentarios(leer('screens/NotificationsScreen.tsx'));
check('12) la pantalla de Notificaciones resuelve el aviso de ËContact por el perfil, con su frase sin nombre',
  /case 'econtact_request': return 'notifications\.econtactRequest';/.test(PANTALLA_AVISOS)
  && /case 'econtact_accepted': return 'notifications\.econtactAccepted';/.test(PANTALLA_AVISOS)
  && /t\(remitente\?\.displayName \? clave : `\$\{clave\}SinNombre`/.test(PANTALLA_AVISOS) && !/item\.senderName/.test(PANTALLA_AVISOS));
const avisosRotos = [];
for (const codigo of CARPETAS) {
  const t = crearTraductor(codigo, DICCIONARIOS, { modoDesarrollo: false });
  for (const clave of ['notifications.econtactRequest', 'notifications.econtactAccepted']) {
    const v = t(`${clave}SinNombre`, { nombre: t('common.someone') });
    if (!v.trim() || /\{\{|\s{2}|(^|\s)(si|ni|kay)\s+(Isang user|User)\b/.test(v) || (codigo !== 'es' && /\bAlguien\b/.test(v))) avisosRotos.push(`${codigo}:${clave} «${v}»`);
  }
}
check('12) en los 17 idiomas, el aviso de ËContact sin nombre se lee entero y en su idioma (sin «Alguien» fuera del español)',
  avisosRotos.length === 0, avisosRotos.slice(0, 4).join(' | '));
check('12) filipino: «May gustong magdagdag sa iyo sa ËContact» y «Tinanggap ang ËContact request mo»',
  tFil('notifications.econtactRequestSinNombre', { nombre: tFil('common.someone') }) === 'May gustong magdagdag sa iyo sa ËContact'
  && tFil('notifications.econtactAcceptedSinNombre', { nombre: tFil('common.someone') }) === 'Tinanggap ang ËContact request mo');
/* SABOTAJE: el servicio de antes no pasaría. */
const SERVICIO_ANTES = SERVICIO.replace("mio?.displayName || ''", "mio?.displayName || 'Alguien'");
check('12) SABOTAJE: con el servicio de antes (`|| \'Alguien\'`) la comprobación falla', SERVICIO_ANTES !== SERVICIO && !sinRespaldoAMano(SERVICIO_ANTES));
/*
 * Lo mismo con el aviso de COMENTARIO (`hooks/useComentarios.ts`), que guardaba «Usuario» a mano: el nombre o nada, y
 * ningún aviso que cree la app guarda ya un respaldo escrito en un idioma.
 */
const COMENTARIOS = sinComentarios(leer('hooks/useComentarios.ts'));
const comentarioNeutral = (codigo) => /userProfile\.displayName \|\| '',/.test(codigo) && !/['"`]Usuario['"`]/.test(codigo);
check('13) el aviso de comentario guarda el nombre o nada, sin «Usuario» escrito a mano', comentarioNeutral(COMENTARIOS));
const ESCRITORES = ['services/econtactService.ts', 'hooks/useComentarios.ts'];
const conRespaldo = ESCRITORES.filter((p) => /displayName \|\| ['"`][^'"`]+['"`]/.test(sinComentarios(leer(p))));
check('13) ninguno de los que crean avisos guarda un respaldo con texto (`displayName || \'…\'`)', conRespaldo.length === 0, conRespaldo.join(' '));
check('13) y el aviso de comentario sin nombre se lee en el idioma de quien lo recibe: «May nagkomento sa post mo», «Alguien comentó en tu publicación»',
  tFil('notifications.commentSinNombre', { nombre: tFil('common.someone') }) === 'May nagkomento sa post mo'
  && tEs('notifications.commentSinNombre', { nombre: tEs('common.someone') }) === 'Alguien comentó en tu publicación');
check('13) SABOTAJE: con `|| \'Usuario\'` la comprobación falla',
  !comentarioNeutral(COMENTARIOS.replace("userProfile.displayName || '',", "userProfile.displayName || 'Usuario',")));

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · Lo que se guarda, neutro; lo que se pinta suelto, con su genérico ──');
// ════════════════════════════════════════════════════════════════════════════
/*
 * La auditoría final de i18n: un nombre de respaldo TRADUCIDO se guardaba en las conversaciones (`participantsData`,
 * desde PostCard y PostDetail) y un «Usuario» escrito a mano en conversaciones y reseñas de Weë Business: el idioma de
 * quien lo creó, congelado en un dato que leen otros. Ahora se guarda el nombre o '' y, donde se pinta suelto, el
 * genérico de la app (`common.user`) en el idioma de quien mira. Y compartir un perfil sin nombre tiene su frase.
 */
const POSTCARD = sinComentarios(leer('components/PostCard.tsx'));
const DETALLE = sinComentarios(leer('screens/PostDetailScreen.tsx'));
const NEGOCIO = sinComentarios(leer('screens/WeeBizProfileScreen.tsx'));
const MENSAJES = sinComentarios(leer('services/messagesService.ts'));
check('14) lo que se GUARDA en una conversación o una reseña es el nombre o nada: ni `t(\'common.user\')` ni «Usuario»',
  /displayName: postAuthor\.displayName \|\| '',/.test(POSTCARD) && /displayName: postAuthor\.displayName \|\| '',/.test(DETALLE)
  && /displayName: userProfile\?\.displayName \|\| '',/.test(NEGOCIO) && /userName: userProfile\?\.displayName \|\| '',/.test(NEGOCIO)
  && !/displayName: postAuthor\.displayName \|\| t\(/.test(POSTCARD + DETALLE) && !/['"`]Usuario['"`]/.test(NEGOCIO)
  && /displayName: data\.displayName \|\| '',/.test(MENSAJES));
const PINTADOS = [['screens/InboxScreen.tsx', /\{otherData\.displayName \|\| t\('common\.user'\)\}/], ['screens/ConversationScreen.tsx', /\{other\.displayName \|\| t\('common\.user'\)\}/],
  ['screens/UserProfileScreen.tsx', /\{userProfile\.displayName \|\| t\('common\.user'\)\}/], ['components/SelectorDeEContacts.tsx', /\{persona\.perfil\.displayName \|\| t\('common\.user'\)\}/],
  ['components/SelectorDeEContacts.tsx', /accessibilityLabel=\{persona\.perfil\.displayName \|\| t\('common\.user'\)\}/], ['screens/WeeBizProfileScreen.tsx', /\{rev\.userName \|\| t\('common\.user'\)\}/]];
const sinGenerico = PINTADOS.filter(([p, re]) => !re.test(sinComentarios(leer(p)))).map(([p]) => p);
check('14) y donde un nombre se pinta suelto (bandeja, chat, perfil ajeno, selector de menciones, reseña), sin él, `common.user`',
  sinGenerico.length === 0, sinGenerico.join(' '));
/* Compartir el perfil de alguien sin nombre: «@» + nada se leía roto en todos los idiomas (y «ni @» en filipino). */
const PERFIL_AJENO = sinComentarios(leer('screens/UserProfileScreen.tsx'));
check('15) compartir un perfil sin nombre elige `profile.shareOtherMessageSinNombre`',
  /t\(nombre \? 'profile\.shareOtherMessage' : 'profile\.shareOtherMessageSinNombre', \{ nombre, bio \}\)/.test(PERFIL_AJENO));
const compartirMal = [];
for (const codigo of CARPETAS) {
  const t = crearTraductor(codigo, DICCIONARIOS, { modoDesarrollo: false });
  const v = t('profile.shareOtherMessageSinNombre', { bio: 'Hola' });
  if (!v.trim() || /@|\{\{|\s{2}\S|(^|\s)(si|ni|kay)\s/.test(v.replace(/\n\n/g, ' ')) || !/Weë/.test(v) || !v.endsWith('Hola')) compartirMal.push(`${codigo}:«${v}»`);
}
check('15) en los 17 idiomas la frase sin nombre no lleva «@», ni un hueco, ni un marcador suelto; nombra Weë y lleva la biografía',
  compartirMal.length === 0, compartirMal.slice(0, 3).join(' | '));
check('15) filipino: «Tingnan ang profile na ito sa Weë!»; español: «¡Mira este perfil en Weë!»',
  tFil('profile.shareOtherMessageSinNombre', { bio: 'x' }).startsWith('Tingnan ang profile na ito sa Weë!') && tEs('profile.shareOtherMessageSinNombre', { bio: 'x' }).startsWith('¡Mira este perfil en Weë!'));

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Marcas ──');
// ════════════════════════════════════════════════════════════════════════════
check('8) las marcas siguen intactas: «Weë» en el título filipino y «ËContact» en la confirmación', filSin.includes('sa Weë') && vistoSinNombre[3][1].includes('ËContacts'));

check('esta suite está en la cadena de `npm test`', /respaldo-sin-nombre\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
