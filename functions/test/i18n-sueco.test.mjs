/*
 * EL SUECO DE WEË.
 *
 * `sv` entra por la misma puerta que los demás —una carpeta, una línea en el
 * registro, una fila en el catálogo—, sin una sola línea de lógica para él. Lo
 * que esta prueba vigila es lo que SOLO puede salir mal en sueco:
 *
 * 1 · QUE ESTÉ ENTERO. Un traductor SIN respaldo frente a otro con él: si una
 *     clave faltara, el segundo la sacaría en inglés y el primero no.
 *
 * 2 · LAS PALABRAS COMPUESTAS, JUNTAS. «profilbild», no «profil bild»: la
 *     särskrivning es el error que más delata una traducción al sueco.
 *
 * 3 · LAS LETRAS å ä ö, SIEMPRE. Sin ellas no es otra ortografía: son otras
 *     palabras («sok» no existe, «sök» sí).
 *
 * 4 · LAS CIFRAS Y EL PLURAL. «40 %», con su espacio; y el sustantivo cambia
 *     con la cifra: «1 kommentar», «3 kommentarer».
 *
 * 5 · QUE `sv-SE` FUNCIONE DE PUNTA A PUNTA: del aparato al idioma, a los
 *     formatos y al `<html lang="sv">`, sin que la ubicación toque nada.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── El cargador diminuto de `i18n.test.mjs`: transpila y ejecuta, sin empaquetador. ── */
const ts = require('typescript');
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (base) => (fs.existsSync(path.resolve(raiz, base + '.ts')) ? base + '.ts' : base + '/index.ts');
const cargados = new Map();
const cargar = async (ruta) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  let js = ts.transpileModule(leer(ruta), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const carpeta = path.posix.dirname(ruta.split(path.sep).join('/'));
  for (const [, rel] of js.matchAll(/from ['"](\.[^'"]*)['"]/g)) {
    const url = (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, rel))))).url;
    js = js.split(`from '${rel}'`).join(`from '${url}'`).split(`from "${rel}"`).join(`from "${url}"`);
  }
  const url = comoModulo(js);
  const resultado = { url, ns: await import(url) };
  cargados.set(ruta, resultado);
  return resultado;
};

const idiomas = (await cargar('i18n/idiomas.ts')).ns;
const resolver = (await cargar('i18n/resolver.ts')).ns;
const traducir = (await cargar('i18n/traducir.ts')).ns;
const formato = (await cargar('i18n/formato.ts')).ns;
const caja = (await cargar('i18n/caja.ts')).ns;
const registro = (await cargar('i18n/diccionarios.ts')).ns;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;
const sv = (await cargar('i18n/textos/sv/index.ts')).ns.sv;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const SV = aplanar(sv);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));

const MARCAS = /Weë (?:AI|Studio|Design|Photo|Writer|Music|Beauty|Chef|Home|Business|Travel|Brain|Credits|Inspira)|WeeTalk|Weëls?|Wäll|ËContact|ẄContact|Credits|Weë/gu;
const sinLoAjeno = (v) => String(v)
  .replace(/\{\{[\w.]+\}\}/g, ' ')
  .replace(/\\[nrt]/g, ' ')
  .replace(MARCAS, ' ');
/* Fronteras de palabra que saben de letras: `\b` es ASCII y no ve la «å». */
const palabra = (cuerpo, banderas = 'u') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);

console.log('\n── A · `sv-SE` de punta a punta, sin lógica para el sueco ──');
{
  const cat = idiomas.idiomaDelCatalogo('sv');
  check('1) el catálogo lo ofrece: listo, «Svenska», de izquierda a derecha y sin variantes',
    cat?.listo === true && cat.nombreNativo === 'Svenska' && cat.direccion === 'ltr' && !cat.variantes
    && idiomas.filasDeIdioma().filter((f) => f.idioma === 'sv').length === 1,
    JSON.stringify(cat));
  check('2) y su locale principal, `sv-SE`, está entre los contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('sv-SE'));
  check('3) el registro lo sirve con su propio diccionario, no por un alias',
    registro.DICCIONARIOS.sv === sv && registro.idiomasConDiccionario().includes('sv'));

  const disponibles = registro.idiomasConDiccionario();
  const elegir = (elegido, aparato) => resolver.elegirIdioma(elegido, aparato, disponibles);
  const delAparato = elegir(null, ['sv-SE']);
  check('4) un aparato en `sv-SE` recibe sueco, con sus formatos',
    delAparato.idioma === 'sv' && delAparato.locale === 'sv-SE' && delAparato.origen === 'aparato', JSON.stringify(delAparato));
  check('5) también si solo dice `sv`, si el sueco va primero en su lista, o desde Finlandia (`sv-FI`)',
    elegir(null, ['sv']).idioma === 'sv' && elegir(null, ['sv-SE', 'en-US']).idioma === 'sv' && elegir(null, ['sv-FI']).idioma === 'sv');
  check('6) la cadena de respaldo: `sv-SE` → `sv` → inglés',
    resolver.cadenaDeRespaldo('sv-SE').join('>') === 'sv-SE>sv>en', resolver.cadenaDeRespaldo('sv-SE').join('>'));
  check('7) lo elegido a mano gana al aparato, en las dos direcciones',
    elegir('es', ['sv-SE']).idioma === 'es' && elegir('sv', ['es-PE', 'en-US']).idioma === 'sv'
    && elegir('sv', ['es-PE']).origen === 'elegido');
  check('8) la lengua del texto es `sv`: la página se anuncia como `<html lang="sv">`',
    resolver.etiquetaDelTexto('sv', 'sv-SE') === 'sv' && resolver.etiquetaDelTexto('en', 'sv-SE') === 'en');

  /* Los formatos los escribe `Intl`: se comprueba la FORMA. `\s` casa también el espacio fino que usa CLDR. */
  const dia = Date.UTC(2026, 8, 30, 12);
  const fecha = formato.formatearFecha(dia, 'sv-SE');
  const numero = formato.formatearNumero(1234567.89, 'sv-SE');
  const coronas = formato.formatearMoneda(1500, 'sv-SE', 'SEK');
  const porcentaje = formato.formatearPorcentaje(0.6, 'sv-SE');
  const hace = formato.formatearTiempoRelativo(dia - 3 * 24 * 3600 * 1000, 'sv-SE', dia);
  const lista = formato.formatearLista(['A', 'B', 'C'], 'sv-SE');
  check('9) la fecha sueca: «30 september 2026», en minúscula', /30 september 2026/.test(fecha), fecha);
  check('10) los números con espacio de miles y coma decimal', /^1\s234\s567,89$/.test(numero), numero);
  check('11) la corona detrás, con su espacio', /^1\s500,00\skr$/.test(coronas), coronas);
  check('12) el porcentaje con un espacio delante del signo: «60 %»', /^60\s%$/.test(porcentaje), porcentaje);
  check('13) «hace 3 días» lo escribe Intl, en sueco', /för 3 dagar sedan/.test(hace), hace);
  check('14) las listas se unen con «och»', /A, B och C/.test(lista), lista);
  check('15) la distancia en el sistema métrico',
    formato.sistemaDeMedida('sv-SE') === 'metrico' && /km/.test(formato.formatearDistancia(5000, 'sv-SE')), formato.formatearDistancia(5000, 'sv-SE'));
  check('16) la fecha de nacimiento se pide día · mes · año', formato.ordenDeLaFecha('sv-SE').join() === 'day,month,year',
    formato.ordenDeLaFecha('sv-SE').join());
}

console.log('\n── B · Entero: sin respaldo, sin huecos, sin nada sin traducir ──');
{
  const solo = traducir.crearTraductor('sv-SE', { sv }, { modoDesarrollo: false });
  const conRespaldo = traducir.crearTraductor('sv-SE', { sv, es, en }, { modoDesarrollo: false });
  const valores = { contador: 2, nombre: 'Astrid', titulo: 'T', lista: 'L', cantidad: 3, saldo: 10 };
  const distintas = Object.keys(ES).filter((k) => !/_(one|other)$/.test(k) || k.endsWith('_other'))
    .map((k) => k.replace(/_other$/, ''))
    .filter((k) => solo(k, valores) !== conRespaldo(k, valores));
  check('17) sin español ni inglés detrás, el sueco dice exactamente lo mismo',
    distintas.length === 0, distintas.slice(0, 5).join(' ') || `${Object.keys(ES).length} claves`);
  const vacias = SV.filter(([, v]) => typeof v !== 'string' || v.trim() === '');
  check('18) ninguna cadena vacía', vacias.length === 0, vacias.slice(0, 5).map(([k]) => k).join(' ') || 'ninguna');

  /*
   * Ninguna palabra española suelta. Solo las que NO existen en sueco: «de»,
   * «en», «del» y «sin» también son suecas («ellos», «un», «parte», «su»).
   */
  const ESPANOL = palabra('los|las|con|una|que|por|más|desde|cuando|puedes|aquí|está|están|tus|mis|nuestro|usted|para', 'iu');
  const conEspanol = SV.filter(([, v]) => ESPANOL.test(sinLoAjeno(v)));
  check('19) ninguna palabra española colada en una frase sueca', conEspanol.length === 0,
    conEspanol.slice(0, 5).map(([k, v]) => `${k}: «${v.slice(0, 34)}»`).join(' | ') || 'limpio');

  /* Lo que se escribe igual en sueco que en español o en inglés, con su porqué. */
  const IGUALES = new Map([
    ['profile.tabMedia', '«Media» es la palabra sueca de la pestaña (X y Bluesky en sueco)'],
    ['onboarding.genderMale', '«Man» es la palabra sueca (coincide con el inglés)'],
    ['engine.modalityText', '«text» es la palabra sueca'],
    ['engine.modalityVideo', '«video» es la palabra sueca'],
    ['aiAvatar.faceOval', '«Oval» es la palabra sueca'],
    ['design.valModern', '«Modern» es la palabra sueca'],
    ['chef.nuProtein', '«Protein» es la palabra sueca'],
    ['creaciones.kindVideo', '«Video» es la palabra sueca'],
    ['creaciones.kindText', '«Text» es la palabra sueca'],
    ['communities.one', '«Community»: la palabra que usan YouTube, Meta, TikTok y Microsoft en sueco (guía § 9.1)'],
    ['menu.communities', '«Communities», su plural sueco (guía § 9.1)'],
    ['search.communities', '«Communities», su plural sueco (guía § 9.1)'],
    ['moderation.reasonSpam', '«Spam» es la palabra sueca'],
    ['settings.sectionInfo', '«Information» es la palabra sueca'],
    ['settings.engineAdmin', '«Weë AI Engine» es el nombre del producto (el WEË AI ENGINE)'],
    ['help.footer', 'la marca, «World Encode Entity» y la versión: solo cambia «version», que en sueco se escribe igual'],
    ['composer.kindVideo', '«Video» es la palabra sueca'],
    ['composer.kindText', '«Text» es la palabra sueca'],
    ['credits.free', '«Gratis» es la palabra sueca'],
    ['credits.balanceAfter', '«Saldo» es la palabra sueca de la banca'],
    ['studio.optFormat', '«Format» es la palabra sueca'],
    ['studio.valNeutral', '«Neutral» es la palabra sueca'],
    ['studio.voxAccent', '«Accent» es la palabra sueca'],
    ['studio.grpVideo', '«Video» es la palabra sueca'],
    ['studio.kindVideo', '«Video» es la palabra sueca'],
    ['studio.grpText', '«Text» es la palabra sueca'],
    ['studio.textTitle', '«Text» es la palabra sueca'],
    ['studio.xpTimelapse', '«Timelapse» es la palabra sueca'],
    ['studio.xpOutfit', '«Outfit» es la palabra sueca'],
    ['studio.xpStyling', '«Styling» es la palabra sueca'],
    ['business.typeVideo', '«Video» es la palabra sueca'],
    ['business.formatTikTok', 'el nombre de la red'],
    ['business.shareCommunities', '«Communities», el plural sueco (guía § 9.1)'],
    ['business.shareProfile', '«Business Profile» es nombre de producto (decisión del usuario, 2026-09-16)'],
    ['business.businessPlan', 'nombre de función de Weë Business (decisión del usuario, 2026-09-16)'],
    ['business.businessCoach', 'nombre de función de Weë Business (decisión del usuario, 2026-09-16)'],
    ['business.pricing', 'nombre de función de Weë Business (decisión del usuario, 2026-09-16)'],
    ['business.brandKit', 'nombre de función de Weë Business (decisión del usuario, 2026-09-16)'],
    ['business.customerInsights', 'nombre de función de Weë Business (decisión del usuario, 2026-09-16)'],
    ['business.businessIdeas', 'nombre de función de Weë Business (decisión del usuario, 2026-09-16)'],
    ['catalogo.musicEj1Subtitle', '«Pop», nombre del género musical'],
    ['catalogo.musicEj2Subtitle', '«Reggaeton», nombre del género musical'],
    ['catalogo.musicEj3Subtitle', '«Rock», nombre del género musical'],
    ['catalogo.musicEj5Subtitle', '«Ballad» es la palabra sueca'],
    ['catalogo.chefEj4Title', '«Lomo saltado» es el nombre de un plato: no se traduce'],
    ['catalogo.writerEj3Subtitle', '«Drama», el género, se escribe igual en sueco'],
    ['catalogo.writerEj5Subtitle', '«Motivation» es la palabra sueca'],
  ]);
  const copiadas = SV.filter(([k, v]) => !IGUALES.has(k) && /\p{L}{3,}/u.test(sinLoAjeno(v)) && (ES[k] === v || EN[k] === v));
  check('20) ninguna cadena copiada tal cual del español o del inglés, salvo las que se escriben igual con su porqué',
    copiadas.length === 0, copiadas.slice(0, 6).map(([k, v]) => `${k}: «${v.slice(0, 30)}»`).join(' | ') || `${IGUALES.size} iguales a propósito`);
}

console.log('\n── C · Número: `one` y `other`, y aquí sí cambia la palabra ──');
{
  const r = new Intl.PluralRules('sv');
  check('21) `Intl` declara `one` y `other` para el sueco, y el cero es `other` («0 kommentarer»)',
    r.resolvedOptions().pluralCategories.join(',') === 'one,other' && r.select(0) === 'other' && r.select(1) === 'one',
    r.resolvedOptions().pluralCategories.join(','));
  const plano = Object.fromEntries(SV);
  const inventadas = Object.keys(plano).filter((k) => /_(zero|two|few|many)$/.test(k));
  check('22) y no hay formas de plural inventadas', inventadas.length === 0, inventadas.join(' ') || 'ninguna');
  /* El traductor elige bien: con 1 sale la forma `_one` y con 3, la `_other`. */
  const solo = traducir.crearTraductor('sv-SE', { sv }, { modoDesarrollo: false });
  const pares = Object.keys(plano).filter((k) => k.endsWith('_one') && k.replace(/_one$/, '_other') in plano).map((k) => k.replace(/_one$/, ''));
  const malElegidas = pares.filter((k) => {
    const con = (n) => ({ contador: n, cantidad: n, titulo: 'T', lista: 'L', nombre: 'N' });
    return solo(k, con(1)) !== solo(`${k}_one`, con(1)) || solo(k, con(3)) !== solo(`${k}_other`, con(3));
  });
  check('23) con 1 sale la forma de uno y con 3 la de varios', malElegidas.length === 0 && pares.length > 20,
    malElegidas.slice(0, 3).join(' ') || `${pares.length} pares`);
}

console.log('\n── D · Los huecos, intactos ──');
{
  const huecos = (v) => [...new Set([...String(v).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]))].sort().join(',');
  const mal = SV.filter(([k, v]) => {
    const e = ES[k];
    const otra = k.endsWith('_one') ? ES[k.replace(/_one$/, '_other')] : undefined;
    return e !== undefined && huecos(e) !== huecos(v) && (otra === undefined || huecos(otra) !== huecos(v));
  });
  check('24) los mismos huecos que el español, con los mismos nombres', mal.length === 0,
    mal.slice(0, 4).map(([k, v]) => `${k}: es[${huecos(ES[k])}] sv[${huecos(v)}]`).join(' | ') || 'idénticos');
  const rotos = SV.filter(([, v]) => /\{\{(?![\w.]+\}\})|(?<!\{\{[\w.]+)\}\}|\{[\w.]+\}(?!\})/.test(v.replace(/\{\{[\w.]+\}\}/g, '')));
  check('25) ninguna llave suelta ni un hueco a medio escribir', rotos.length === 0, rotos.slice(0, 4).map(([k]) => k).join(' ') || 'limpio');
  const bordes = SV.filter(([k, v]) => typeof ES[k] === 'string' && (/^\s/.test(ES[k]) !== /^\s/.test(v) || /\s$/.test(ES[k]) !== /\s$/.test(v)));
  check('26) los espacios del borde, donde los tiene el español (esas piezas se pegan en pantalla)', bordes.length === 0,
    bordes.slice(0, 4).map(([k, v]) => `${k}: «${v}»`).join(' | ') || 'iguales');
  /* Nada pegado a un hueco: ni un genitivo («{{nombre}}s») ni una forma definida. */
  const pegados = SV.filter(([, v]) => /\}\}[a-zåäö]/u.test(v));
  check('27) ninguna terminación pegada a un {{hueco}}', pegados.length === 0,
    pegados.slice(0, 5).map(([k, v]) => `${k}: «${v.slice(0, 40)}»`).join(' | ') || 'ninguna');
  const porcentajePegado = SV.filter(([, v]) => /\{\{\w+\}\}%|\d%/.test(v));
  check('28) el signo de porcentaje va separado por un espacio: «40 %»', porcentajePegado.length === 0,
    porcentajePegado.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 40)}»`).join(' | ') || 'bien');
}

console.log('\n── E · Sueco escrito como sueco ──');
{
  const noNfc = SV.filter(([, v]) => v !== v.normalize('NFC'));
  check('29) todo en NFC', noNfc.length === 0, noNfc.slice(0, 4).map(([k]) => k).join(' ') || 'todo');
  const conLetras = SV.filter(([, v]) => /[åäöÅÄÖ]/.test(v)).length;
  check('30) el sueco lleva sus letras: å ä ö aparecen en buena parte del diccionario', conLetras > SV.length / 4,
    `${conLetras} de ${SV.length} cadenas`);
  const SIN_LETRAS = palabra('sok|soker|installningar|losenord|forsok|anvandare\\p{L}*|oppna\\p{L}*|lagg till|fortsatt|hjalp|nasta|foregaende|valj|mojlig\\p{L}*|forhandsgranska|tillganglig\\p{L}*|bekrafta|anmal\\p{L}*|tjanst\\p{L}*|forslag|oversikt', 'iu');
  const asciificadas = SV.filter(([, v]) => SIN_LETRAS.test(v));
  check('31) ninguna palabra sin su å, ä u ö', asciificadas.length === 0,
    asciificadas.slice(0, 5).map(([k, v]) => `${k}: «${v.match(SIN_LETRAS)[0]}»`).join(' | ') || 'limpio');
  /* SÄRSKRIVNING: lo que en sueco es una palabra se escribe junto. */
  const PARTIDOS = palabra('profil bild|användar namn|lösen ord|e-post adress|inloggnings uppgifter|sök fält|text ruta|video klipp|konto inställningar|bild text|kontakt lista|start sida|hem sida|ljud fil|bild fil|video fil|projekt namn|mall bibliotek', 'iu');
  const partidos = SV.filter(([, v]) => PARTIDOS.test(v));
  check('32) ninguna palabra compuesta partida (särskrivning)', partidos.length === 0,
    partidos.slice(0, 5).map(([k, v]) => `${k}: «${v.match(PARTIDOS)[0]}»`).join(' | ') || 'limpio');
  check('32b) control: la regla reconoce la särskrivning y deja pasar lo que está bien',
    ['Byt profil bild', 'Ange användar namn'].every((m) => PARTIDOS.test(m))
    && ['Byt profilbild', 'Ange användarnamn', 'Ladda upp en bild'].every((b) => !PARTIDOS.test(b)));
  const tresPuntos = SV.filter(([, v]) => /\.\.\./.test(v));
  check('33) los puntos suspensivos son «…», un carácter', tresPuntos.length === 0, tresPuntos.slice(0, 4).map(([k]) => k).join(' ') || 'bien');
  /* Las comillas suecas son ”…”, las dos iguales; ni «» ni “”. */
  const comillasAjenas = SV.filter(([, v]) => /[«»“]/.test(v));
  check('33b) comillas suecas: ”…”', comillasAjenas.length === 0,
    comillasAjenas.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 40)}»`).join(' | ') || 'bien');
  /* «Du», nunca el «ni» de cortesía. */
  const NI = palabra('ni|Ni|er|Er|era|Era', 'u');
  const conNi = SV.filter(([, v]) => NI.test(sinLoAjeno(v)));
  check('33c) se tutea: ningún «ni» de cortesía', conNi.length === 0,
    conNi.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 40)}»`).join(' | ') || 'du');
  /* Mayúscula de frase: nada de «Redigera Profil» con Cada Palabra En Mayúscula. */
  /* Los nombres de producto de Weë Business se escriben con sus mayúsculas (decisión del usuario, 2026-09-16). */
  const MAYUSCULAS_A_PROPOSITO = new Set(['business.shareProfile', 'business.businessPlan', 'business.businessCoach',
    'business.pricing', 'business.brandKit', 'business.customerInsights', 'business.businessIdeas']);
  const tituloIngles = SV.filter(([k, v]) => {
    if (MAYUSCULAS_A_PROPOSITO.has(k)) return false;
    const palabras = sinLoAjeno(v).split(/\s+/).filter((w) => /^\p{L}/u.test(w));
    return palabras.length >= 2 && palabras.slice(1).every((w) => /^\p{Lu}\p{Ll}/u.test(w));
  });
  check('33d) mayúscula solo al principio de la frase, no en cada palabra', tituloIngles.length === 0,
    tituloIngles.slice(0, 5).map(([k, v]) => `${k}: «${v.slice(0, 30)}»`).join(' | ') || 'bien');
}

console.log('\n── F · La búsqueda y la caja respetan el sueco ──');
{
  /* å ä ö son letras propias: «Åre» no es «Are». Plegar para buscar no las toca. */
  check('34) para buscar, å ä ö siguen siendo sus letras', caja.paraBuscar('Åre') === 'åre' && caja.paraBuscar('Åre') !== caja.paraBuscar('Are')
    && caja.paraBuscar('ÖL') === 'öl');
  check('35) y la inicial sube con su letra: «ärende» → «Ärende»', caja.conMayusculaInicial('ärende', 'sv-SE') === 'Ärende');
}

console.log('\n── G · El dinero y las marcas ──');
{
  /* La moneda no se traduce: «Credits», nunca «krediter»; «kreditkort», la tarjeta, sí es sueco. */
  const MONEDA = /(?<![\p{L}])[Kk]redit(?:er|erna|en)?(?![\p{L}])/u;
  const moneda = SV.filter(([, v]) => MONEDA.test(v));
  check('36) «Credits» nunca se traduce (kredit, krediter)', moneda.length === 0,
    moneda.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 30)}»`).join(' | ') || 'limpio');
  const perdidos = SV.filter(([k, v]) => /Credits/.test(ES[k] || '') && !/Credits/.test(v));
  check('37) cada «Credits» del español sigue en su clave sueca', perdidos.length === 0, perdidos.slice(0, 4).map(([k]) => k).join(' ') || 'todos');

  const LISTA = ['Weë', 'Weë AI', 'Weë Studio', 'Weë Chef', 'Weë Design', 'Weë Travel', 'Weë Business', 'Weë Music', 'Weë Inspira',
    'Weëls', 'Wäll', 'Weë Credits', 'ËContact', 'ẄContact', 'Credits', 'WeeTalk', 'Weë Brain', 'Weë Photo', 'Weë Writer', 'Weë Beauty', 'Weë Home'];
  const escapar = (m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const perdidas = [];
  for (const [k, v] of SV) {
    const e = ES[k];
    if (typeof e !== 'string') continue;
    for (const m of LISTA) {
      const re = new RegExp(`(?<![\\p{L}])${escapar(m)}(?![\\p{L}])`, 'u');
      /* En sueco la marca puede ir en un compuesto con guion («Weë-konto»): sigue siendo la marca. */
      const reSv = new RegExp(`(?<![\\p{L}])${escapar(m)}(?=-|(?![\\p{L}]))`, 'u');
      if (re.test(e) && !reSv.test(v)) perdidas.push(`${k}: «${m}»`);
    }
  }
  check('38) cada marca del español sigue, intacta, en su clave sueca', perdidas.length === 0, perdidas.slice(0, 6).join(' | ') || 'todas');
  /* Una marca no se declina: ni «Weës», ni «WeeTalken», ni «Creditsen». */
  const PEGADA = /(?:Weë|WeeTalk|Wäll|ËContact|ẄContact|Credits|Weë (?:AI|Studio|Design|Photo|Writer|Music|Beauty|Chef|Home|Business|Travel|Brain|Inspira))(?=[a-zåäö])/u;
  const pegadas = SV.filter(([, v]) => PEGADA.test(v.replace(/Weëls?/g, '·')));
  check('39) ninguna marca declinada ni con una terminación pegada', pegadas.length === 0,
    pegadas.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 40)}»`).join(' | ') || 'limpio');
  const TRADUCIDA = /Weë (?:Musik|Resa|Resor|Kock|Företag|Hjärna|Skribent|Foto|Skönhet|Hem|Krediter)(?![\p{L}])/u;
  const traducidas = SV.filter(([, v]) => TRADUCIDA.test(v));
  check('40) ninguna experiencia de Weë traducida («Weë Musik», «Weë Resor»…)', traducidas.length === 0,
    traducidas.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 30)}»`).join(' | ') || 'limpio');
}

console.log('\n── H · Queda escrito ──');
{
  const indice = leer('i18n/textos/sv/index.ts');
  check('41) el índice sueco dice qué no entra nunca y lo propio del sueco',
    /no entra nunca en estos archivos/i.test(indice) && /compuestas/i.test(indice) && /å ä ö/.test(indice));
  const guia = fs.existsSync(path.resolve(raiz, 'docs/I18N-SUECO.md')) ? leer('docs/I18N-SUECO.md') : '';
  check('42) la guía de estilo y el glosario existen y se leen', guia.length > 2000 && /Glosario/i.test(guia) && /Credits/.test(guia));
  const pantallaDeError = leer('components/ErrorBoundary.tsx');
  const filaSv = (pantallaDeError.match(/^ {2}sv: \{ titulo: '((?:[^'\\]|\\.)+)', mensaje: '((?:[^'\\]|\\.)+)', boton: '((?:[^'\\]|\\.)+)' \},$/m) || []).slice(1);
  check('43) la pantalla de error también habla sueco', filaSv.length === 3 && filaSv.some((f) => /[åäö]/.test(f)), filaSv.join(' · ') || 'sin fila');
}

console.log('\n── I · Del aparato a la pantalla: selector, persistencia, cuenta, bienvenida, ajustes ──');
{
  const disponibles = registro.idiomasConDiccionario();
  const fila = idiomas.filasDeIdioma().find((f) => f.idioma === 'sv');
  check('44) el selector ofrece «Svenska» como una fila propia', fila?.clave === 'sv' && fila.nombreNativo === 'Svenska', JSON.stringify(fila));
  const pantallas = ['screens/IdiomaScreen.tsx', 'screens/OnboardingScreen.tsx', 'screens/SettingsScreen.tsx'].map((p) => [p, leer(p)]);
  const conLista = pantallas.filter(([, s]) => !/filasDeIdioma\(\)|disponibles\.find/.test(s) || /'sv'|Svenska/.test(s)).map(([p]) => p);
  check('45) Idioma, la bienvenida y Configuración leen el catálogo, sin nada escrito para el sueco', conLista.length === 0, conLista.join(' ') || 'las tres');
  const guardados = ['sv', 'sv-SE'].map((g) => resolver.elegirIdioma(g, ['en-US'], disponibles));
  check('46) persistencia: lo guardado al elegir sueco vuelve como sueco elegido',
    guardados.every((r) => r.idioma === 'sv' && r.origen === 'elegido'), JSON.stringify(guardados));
  const lengua = require(path.resolve(here, '../lib/core/language.js'));
  check('47) la cuenta guarda `sv-SE` y el servidor lo acepta tal cual',
    lengua.normalizarEtiqueta('sv-SE') === 'sv-SE' && lengua.idiomaDe('sv-SE') === 'sv'
    && lengua.contextoDeIdioma({ appLanguage: 'sv-SE' }).appLanguage === 'sv-SE');
  const aparato = (await cargar('i18n/aparato.ts')).ns;
  const antes = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: { languages: ['sv-SE', 'sv', 'en-US'], language: 'sv-SE' }, configurable: true, writable: true });
  const delNavegador = aparato.localesDelAparato();
  if (antes) Object.defineProperty(globalThis, 'navigator', antes); else delete globalThis.navigator;
  const enLaWeb = resolver.elegirIdioma(null, delNavegador, disponibles);
  check('48) web: un navegador en sueco abre Weë en sueco, con `sv-SE` para los formatos',
    delNavegador[0] === 'sv-SE' && enLaWeb.idioma === 'sv' && enLaWeb.locale === 'sv-SE', `${delNavegador.join(',')} → ${JSON.stringify(enLaWeb)}`);

  /* Accesibilidad: las etiquetas del lector de pantalla existen en sueco y sin «knapp» detrás (el rol ya lo dice). */
  const fuentes = [];
  const andar = (d) => {
    for (const e of fs.readdirSync(path.resolve(raiz, d), { withFileTypes: true })) {
      const rel = `${d}/${e.name}`;
      if (e.isDirectory()) andar(rel); else if (/\.tsx$/.test(e.name)) fuentes.push(leer(rel));
    }
  };
  ['components', 'screens', 'navigation'].forEach(andar);
  const clavesAccesibles = new Set(fuentes.flatMap((s) => [...s.matchAll(/accessibilityLabel=\{t\('([a-zA-Z]+\.[A-Za-z0-9_]+)'/g)].map((m) => m[1])));
  const plano = Object.fromEntries(SV);
  const valorDe = (k) => plano[k] ?? plano[`${k}_other`];
  const malasAccesibles = [...clavesAccesibles].filter((k) => valorDe(k) === undefined || /knapp(en)?$/i.test(valorDe(k)));
  check('49) accesibilidad: todas las etiquetas del lector existen en sueco y sin «knapp»',
    clavesAccesibles.size > 20 && malasAccesibles.length === 0,
    malasAccesibles.slice(0, 5).map((k) => `${k}: «${valorDe(k)}»`).join(' | ') || `${clavesAccesibles.size} etiquetas`);
}

console.log('\n── J · Traducciones defectuosas ──');
{
  const cuenta = (s, re) => (String(s).match(re) || []).length;
  const marcado = SV.filter(([k, v]) => typeof ES[k] === 'string'
    && (cuenta(ES[k], /<\/?[a-zA-Z][^>]*>/g) !== cuenta(v, /<\/?[a-zA-Z][^>]*>/g) || cuenta(ES[k], /\*\*|__|\]\(/g) !== cuenta(v, /\*\*|__|\]\(/g)));
  check('50) ni HTML ni markdown roto', marcado.length === 0, marcado.slice(0, 4).map(([k]) => k).join(' ') || 'intacto');
  const saltos = SV.filter(([k, v]) => {
    const ref = k.endsWith('_one') && ES[k.replace(/_one$/, '_other')] !== undefined ? ES[k.replace(/_one$/, '_other')] : ES[k];
    return typeof ref === 'string' && cuenta(ref, /\n/g) !== cuenta(v, /\n/g);
  });
  check('51) los mismos saltos de línea que el español', saltos.length === 0, saltos.slice(0, 4).map(([k]) => k).join(' ') || 'iguales');

  /* La misma frase española se dice igual en toda la app, salvo cuando el contexto pide otra cosa. */
  const DISTINTAS_A_PROPOSITO = new Set([
    /* «Todo»: todos los valores nutricionales de Chef (Alla värden), no el filtro «Alla». */
    'chef.nuAll',
    /* «Media»: la dificultad media de Chef (Medelsvår), no la pestaña de fotos y vídeos del perfil (Media). */
    'chef.valMedium',
    /* «Listo»: el título de un aviso es «Klart»; el botón, «Klar» (guía § 8). */
    'aiAvatar.doneTitle',
    /* «No disponible»: concuerda con un sustantivo neutro (ett-género: «Inte tillgängligt»); lo demás, «Inte tillgänglig». */
    'composer.notAvailable',
    /* «Eliminar» una creación borra su archivo para siempre: «Radera», no «Ta bort» (guía § 9.1). */
    'creaciones.delete',
    /* «Natural»: el movimiento (Naturligt) no es la luz natural (Naturligt ljus). */
    'studio.smNatural',
    /* «Servicios»: el gasto de luz, agua e internet (Räkningar), no la categoría de negocios de servicios (Tjänster). */
    'business.expenseServices',
  ]);
  const porFrase = new Map();
  for (const [k, v] of SV) {
    const e = ES[k];
    if (typeof e !== 'string' || /_one$/.test(k) || DISTINTAS_A_PROPOSITO.has(k)) continue;
    if (!porFrase.has(e)) porFrase.set(e, new Map());
    const m = porFrase.get(e);
    m.set(v, [...(m.get(v) || []), k]);
  }
  const inconsistentes = [...porFrase].filter(([, m]) => m.size > 1);
  check('52) la misma frase española se dice igual en toda la app, salvo excepciones con su porqué', inconsistentes.length === 0,
    inconsistentes.slice(0, 4).map(([e, m]) => `«${e.slice(0, 20)}» → ${[...m].map(([v, ks]) => `«${v.slice(0, 16)}» (${ks[0]})`).join(' / ')}`).join(' | ') || 'coherente');
  /* Los rótulos que se ven en toda la app dicen lo del glosario. */
  const ROTULOS = [['Guardar', 'Spara'], ['Cancelar', 'Avbryt'], ['Compartir', 'Dela'], ['Buscar', 'Sök'], ['Cerrar', 'Stäng']];
  const rotulosMal = SV.filter(([k, v]) => ROTULOS.some(([e, t]) => ES[k] === e && v !== t));
  check('53) los rótulos comunes dicen siempre lo del glosario', rotulosMal.length === 0,
    rotulosMal.slice(0, 5).map(([k, v]) => `${k}: «${ES[k]}» → «${v}»`).join(' | ') || `${ROTULOS.length} rótulos`);
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
