/*
 * EL DANÉS DE WEË.
 *
 * `da` entra por la misma puerta que los demás —una carpeta, una línea en el
 * registro, una fila en el catálogo—, sin una sola línea de lógica para él. Lo
 * que esta prueba vigila es lo que SOLO puede salir mal en danés:
 *
 * 1 · QUE ESTÉ ENTERO. Un traductor SIN respaldo frente a otro con él: si una
 *     clave faltara, el segundo la sacaría en inglés y el primero no.
 *
 * 2 · EL `one` DANÉS NO ES SOLO EL 1. `Intl.PluralRules('da')` da `one` también
 *     a 0,5 y a 1,5, así que ningún `_one` escribe un «1» a mano.
 *
 * 3 · LAS PALABRAS COMPUESTAS, JUNTAS («profilbillede», no «profil billede»), y
 *     las letras æ ø å, siempre: ni palabras noruegas ni suecas coladas.
 *
 * 4 · LAS DECISIONES DE LA GUÍA (docs/I18N-DANES.md): «du», comillas ”…», «fx»,
 *     «Log ind»/«Log ud», «AI», y el acento solo en los imperativos ambiguos.
 *
 * 5 · QUE `da-DK` FUNCIONE DE PUNTA A PUNTA: del aparato al idioma, a los
 *     formatos (14.30, 1.234,50 kr.) y al `<html lang="da">`.
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
const da = (await cargar('i18n/textos/da/index.ts')).ns.da;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const DA = aplanar(da);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));

const MARCAS = /Weë (?:AI|Studio|Design|Photo|Writer|Music|Beauty|Chef|Home|Business|Travel|Brain|Credits|Inspira|Filmmaker)|WeeTalk|Weëls?|Wäll|ËContact|ẄContact|Credits|Weë/gu;
/* Lo que no es danés y está bien que esté: marcas, huecos y los nombres de función de Weë Business. */
const NOMBRES_DE_PRODUCTO = /Business Plan|Business Coach|Pricing Assistant|Brand Kit|Customer Insights|Business Ideas|Business Profile|My Business|Products & Catalog|YouTube Shorts|YouTube|TikTok|Instagram|Facebook|LinkedIn|Pinterest|Spotify|Google|Apple|World Encode Entity/g;
const sinLoAjeno = (v) => String(v)
  .replace(/\{\{[\w.]+\}\}/g, ' ')
  .replace(/\\[nrt]/g, ' ')
  .replace(NOMBRES_DE_PRODUCTO, ' ')
  .replace(MARCAS, ' ');
/* Fronteras de palabra que saben de letras: `\b` es ASCII y no ve la «å». */
const palabra = (cuerpo, banderas = 'u') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 40)}»`) => xs.slice(0, 5).map(f).join(' | ');

console.log('\n── A · `da-DK` de punta a punta, sin lógica para el danés ──');
{
  const cat = idiomas.idiomaDelCatalogo('da');
  check('1) el catálogo lo ofrece: listo, «Dansk», de izquierda a derecha y sin variantes',
    cat?.listo === true && cat.nombreNativo === 'Dansk' && cat.direccion === 'ltr' && !cat.variantes
    && idiomas.filasDeIdioma().filter((f) => f.idioma === 'da').length === 1,
    JSON.stringify(cat));
  check('2) y su locale principal, `da-DK`, está entre los contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('da-DK'));
  check('3) el registro lo sirve con su propio diccionario, no por un alias',
    registro.DICCIONARIOS.da === da && registro.idiomasConDiccionario().includes('da'));

  const disponibles = registro.idiomasConDiccionario();
  const elegir = (elegido, aparato) => resolver.elegirIdioma(elegido, aparato, disponibles);
  const delAparato = elegir(null, ['da-DK']);
  check('4) un aparato en `da-DK` recibe danés, con sus formatos',
    delAparato.idioma === 'da' && delAparato.locale === 'da-DK' && delAparato.origen === 'aparato', JSON.stringify(delAparato));
  check('5) también si solo dice `da`, o si el danés va primero en su lista',
    elegir(null, ['da']).idioma === 'da' && elegir(null, ['da-DK', 'en-US']).idioma === 'da');
  check('5b) y un noruego o un sueco NO reciben danés por parecido: cada uno el suyo, o inglés',
    elegir(null, ['nb-NO']).idioma === 'en' && elegir(null, ['sv-SE']).idioma === 'sv');
  check('6) la cadena de respaldo: `da-DK` → `da` → inglés',
    resolver.cadenaDeRespaldo('da-DK').join('>') === 'da-DK>da>en', resolver.cadenaDeRespaldo('da-DK').join('>'));
  check('7) lo elegido a mano gana al aparato, en las dos direcciones',
    elegir('es', ['da-DK']).idioma === 'es' && elegir('da', ['es-PE', 'en-US']).idioma === 'da'
    && elegir('da', ['es-PE']).origen === 'elegido');
  check('8) la lengua del texto es `da`: la página se anuncia como `<html lang="da">`',
    resolver.etiquetaDelTexto('da', 'da-DK') === 'da' && resolver.etiquetaDelTexto('en', 'da-DK') === 'en');

  /* Los formatos los escribe `Intl`: se comprueba la FORMA. `\s` casa también el espacio duro que usa CLDR. */
  const dia = Date.UTC(2026, 9, 1, 12, 30);
  const fecha = formato.formatearFecha(dia, 'da-DK');
  const numero = formato.formatearNumero(1234567.89, 'da-DK');
  const coronas = formato.formatearMoneda(1234.5, 'da-DK', 'DKK');
  const porcentaje = formato.formatearPorcentaje(0.6, 'da-DK');
  const hace = formato.formatearTiempoRelativo(dia - 3 * 24 * 3600 * 1000, 'da-DK', dia);
  const lista = formato.formatearLista(['A', 'B', 'C'], 'da-DK');
  const hora = formato.formatearHora(new Date(2026, 9, 1, 14, 30), 'da-DK');
  check('9) la fecha danesa: «1. oktober 2026», con punto tras el día y el mes en minúscula', /^1\. oktober 2026$/.test(fecha), fecha);
  check('10) los números con punto de miles y coma decimal', /^1\.234\.567,89$/.test(numero), numero);
  check('11) la corona detrás, con su espacio y su punto: «1.234,50 kr.»', /^1\.234,50\skr\.$/.test(coronas), coronas);
  check('12) el porcentaje con un espacio delante del signo: «60 %»', /^60\s%$/.test(porcentaje), porcentaje);
  check('13) «hace 3 días» lo escribe Intl, en danés', /for 3 dage siden/.test(hace), hace);
  check('14) las listas se unen con «og», sin coma delante', /^A, B og C$/.test(lista), lista);
  check('14b) la hora con punto: «14.30»', /^14\.30$/.test(hora), hora);
  check('15) la distancia en el sistema métrico',
    formato.sistemaDeMedida('da-DK') === 'metrico' && /km/.test(formato.formatearDistancia(5000, 'da-DK')), formato.formatearDistancia(5000, 'da-DK'));
  check('16) la fecha de nacimiento se pide día · mes · año', formato.ordenDeLaFecha('da-DK').join() === 'day,month,year',
    formato.ordenDeLaFecha('da-DK').join());
  check('16b) los contadores se abrevian a la danesa: «12,4 t»', /^12,4\st\.?$/.test(formato.formatearNumero(12400, 'da-DK', { notation: 'compact', maximumFractionDigits: 1 })),
    formato.formatearNumero(12400, 'da-DK', { notation: 'compact', maximumFractionDigits: 1 }));
}

console.log('\n── B · Entero: sin respaldo, sin huecos, sin nada sin traducir ──');
{
  const solo = traducir.crearTraductor('da-DK', { da }, { modoDesarrollo: false });
  const conRespaldo = traducir.crearTraductor('da-DK', { da, es, en }, { modoDesarrollo: false });
  const valores = { contador: 2, nombre: 'Mette', titulo: 'T', lista: 'L', cantidad: 3, saldo: 10 };
  const distintas = Object.keys(ES).filter((k) => !/_(one|other)$/.test(k) || k.endsWith('_other'))
    .map((k) => k.replace(/_other$/, ''))
    .filter((k) => solo(k, valores) !== conRespaldo(k, valores));
  check('17) sin español ni inglés detrás, el danés dice exactamente lo mismo',
    distintas.length === 0, distintas.slice(0, 5).join(' ') || `${Object.keys(ES).length} claves`);
  const vacias = DA.filter(([, v]) => typeof v !== 'string' || v.trim() === '');
  check('18) ninguna cadena vacía', vacias.length === 0, vacias.slice(0, 5).map(([k]) => k).join(' ') || 'ninguna');

  /* Ninguna palabra española suelta (solo las que NO existen en danés: «en», «de», «for», «med» sí son danesas). */
  const ESPANOL = palabra('los|las|con|una|que|por|más|desde|cuando|puedes|aquí|está|están|tus|mis|nuestro|usted|para|también|ahora', 'iu');
  const conEspanol = DA.filter(([, v]) => ESPANOL.test(sinLoAjeno(v)));
  check('19) ninguna palabra española colada en una frase danesa', conEspanol.length === 0, muestra(conEspanol) || 'limpio');
  /* Ni inglés: palabras que en danés no existen («to», «for», «her» sí son danesas y por eso no están). */
  const INGLES = palabra('the|your|you|and|with|this|please|click|from|will|yet|our|their|here|there|settings|account|create|upload your|share your', 'iu');
  const conIngles = DA.filter(([, v]) => INGLES.test(sinLoAjeno(v)));
  check('19b) ninguna palabra inglesa colada (salvo marcas y nombres de producto)', conIngles.length === 0, muestra(conIngles) || 'limpio');

  /* Lo que se escribe igual en danés que en español o en inglés, con su porqué. */
  const IGUALES = new Map([
    ['aiAvatar.faceOval', '«Oval» es la palabra danesa'],
    ['aiAvatar.accPiercing', '«Piercing» es la palabra danesa'],
    ['business.shortcutAnalyze', '«Analyse», el sustantivo danés'],
    ['business.brandLogo', '«Logo» es la palabra danesa'],
    ['business.typeVideo', '«Video» es la palabra danesa'],
    ['catalogo.musicEj1Subtitle', '«Pop», nombre del género musical'],
    ['catalogo.musicEj2Subtitle', '«Reggaeton», nombre del género musical'],
    ['catalogo.musicEj3Subtitle', '«Rock», nombre del género musical'],
    ['catalogo.studioAcPhotosTitle', '«Fotos», el plural danés de «foto» (Retskrivningsordbogen)'],
    ['catalogo.chefEj1Title', '«Pasta carbonara» es el nombre de un plato: no se traduce'],
    ['catalogo.chefEj4Title', '«Lomo saltado» es el nombre de un plato: no se traduce'],
    ['catalogo.writerEj1Subtitle', '«Science fiction», el nombre danés del género'],
    ['catalogo.writerEj3Subtitle', '«Drama», el género, se escribe igual en danés'],
    ['catalogo.writerEj5Subtitle', '«Motivation» es la palabra danesa'],
    ['chef.nuProtein', '«Protein» es la palabra danesa'],
    ['common.send', '«Send», el imperativo danés de «sende»'],
    ['weeai.send', '«Send», el imperativo danés de «sende»'],
    ['weetalk.send', '«Send», el imperativo danés de «sende»'],
    ['weeai.sendForCredits', '«Send for … Credits» es la frase danesa'],
    ['composer.kindVideo', '«Video» es la palabra danesa'],
    ['creaciones.kindVideo', '«Video» es la palabra danesa'],
    ['studio.grpVideo', '«Video» es la palabra danesa'],
    ['studio.kindVideo', '«Video» es la palabra danesa'],
    ['creaciones.download', '«Download» es el botón danés (glosario § 9.1, pareja de «Upload»)'],
    ['creator.areaStudioPhotos', 'la marca y «Fotos», el plural danés'],
    ['credits.free', '«Gratis» es la palabra danesa'],
    ['credits.balanceAfter', '«Saldo», la palabra de la banca danesa'],
    ['design.valMetal', '«Metal» es la palabra danesa'],
    ['engine.modalityVideo', '«video» es la palabra danesa'],
    ['filmmaker.presetStories', '«Stories», el formato de las redes, como lo dicen en danés quienes publican (Instagram)'],
    ['filmmaker.format', '«Format» es la palabra danesa'],
    ['studio.optFormat', '«Format» es la palabra danesa'],
    ['filmmaker.storyboard', '«Storyboard», el préstamo que usa el cine danés'],
    ['filmmaker.sceneNumber', '«Scene» es la palabra danesa'],
    ['filmmaker.scenes_one', '«scene» es la palabra danesa'],
    ['filmmaker.whereScene', '«Scene» es la palabra danesa'],
    ['filmmaker.references_one', '«reference» es la palabra danesa'],
    ['studio.settingsReferences_one', '«reference» es la palabra danesa'],
    ['studio.reference', '«Reference» es la palabra danesa'],
    ['filmmaker.takeQualityStandard', '«Standard» es la palabra danesa'],
    ['studio.valStandard', '«Standard» es la palabra danesa'],
    ['help.footer', 'la marca, «World Encode Entity» y la versión: solo cambia «version», que en danés se escribe igual'],
    ['moderation.reasonSpam', '«Spam» es la palabra danesa'],
    ['profile.bioLabel', '«Bio», la palabra del glosario (como Instagram en danés)'],
    ['profile.tabLikes', '«Likes», el contador danés (Retskrivningsordbogen: like, likes)'],
    ['projects.emojiLabel', '«Emoji» es la palabra danesa'],
    ['weeai.emojiLabel', '«Emoji» es la palabra danesa'],
    ['settings.engineAdmin', '«Weë AI Engine» es el nombre del producto (el WEË AI ENGINE)'],
    ['settings.sectionInfo', '«Information» es la palabra danesa'],
    ['studio.optTone', '«Tone» es la palabra danesa'],
    ['studio.optType', '«Type» es la palabra danesa'],
    ['studio.valIllustration', '«Illustration» es la palabra danesa'],
    ['studio.valNeutral', '«Neutral» es la palabra danesa'],
    ['studio.voxAccent', '«Accent» es la palabra danesa'],
    ['studio.wrBlogs', '«Blogs» es la palabra danesa'],
    ['studio.wrEssays', '«Essays» es la palabra danesa'],
    ['studio.wrPodcasts', '«Podcasts» es la palabra danesa'],
    ['studio.xpTimelapse', '«Timelapse» es la palabra danesa'],
    ['studio.xpMakeup', '«Makeup» es la palabra danesa'],
    ['studio.xpOutfit', '«Outfit» es la palabra danesa'],
    ['studio.xpStyling', '«Styling» es la palabra danesa'],
    ['studio.camDrone', '«Drone» es la palabra danesa'],
    ['studio.mvTilt', '«Tilt», el término danés del movimiento de cámara'],
    ['weebiz.logo', '«Logo» es la palabra danesa'],
  ]);
  const copiadas = DA.filter(([k, v]) => !IGUALES.has(k) && /\p{L}{3,}/u.test(sinLoAjeno(v)) && (ES[k] === v || EN[k] === v));
  check('20) ninguna cadena copiada tal cual del español o del inglés, salvo las que se escriben igual con su porqué',
    copiadas.length === 0, muestra(copiadas) || `${IGUALES.size} iguales a propósito`);
  const sobranIguales = [...IGUALES.keys()].filter((k) => !(k in Object.fromEntries(DA)));
  check('20b) y la lista de excepciones no nombra claves que no existen', sobranIguales.length === 0, sobranIguales.join(' ') || 'al día');
}

console.log('\n── C · Número: `one` y `other`, y el `one` danés no es solo el 1 ──');
{
  const r = new Intl.PluralRules('da');
  check('21) `Intl` declara `one` y `other` para el danés; el cero es `other` y 1,5 es `one`',
    r.resolvedOptions().pluralCategories.join(',') === 'one,other' && r.select(0) === 'other' && r.select(1) === 'one' && r.select(1.5) === 'one',
    r.resolvedOptions().pluralCategories.join(','));
  const plano = Object.fromEntries(DA);
  const inventadas = Object.keys(plano).filter((k) => /_(zero|two|few|many)$/.test(k));
  check('22) y no hay formas de plural inventadas', inventadas.length === 0, inventadas.join(' ') || 'ninguna');
  const solo = traducir.crearTraductor('da-DK', { da }, { modoDesarrollo: false });
  const pares = Object.keys(plano).filter((k) => k.endsWith('_one') && k.replace(/_one$/, '_other') in plano).map((k) => k.replace(/_one$/, ''));
  const malElegidas = pares.filter((k) => {
    const con = (n) => ({ contador: n, cantidad: n, titulo: 'T', lista: 'L', nombre: 'N' });
    return solo(k, con(1)) !== solo(`${k}_one`, con(1)) || solo(k, con(3)) !== solo(`${k}_other`, con(3));
  });
  check('23) con 1 sale la forma de uno y con 3 la de varios', malElegidas.length === 0 && pares.length > 20,
    malElegidas.slice(0, 3).join(' ') || `${pares.length} pares`);
  /* El `one` danés cubre 0,5 y 1,5: un `_one` que escribe «1» a mano mentiría con «1,5». */
  const unoAMano = DA.filter(([k, v]) => k.endsWith('_one') && /(?<![\p{L}\p{N}])1(?![\p{N},.])/u.test(v.replace(/\{\{[^}]*\}\}/g, '')));
  check('23b) ningún `_one` escribe un «1» a mano: lleva {{contador}}', unoAMano.length === 0, muestra(unoAMano) || 'todos con hueco');
}

console.log('\n── D · Los huecos, intactos ──');
{
  const huecos = (v) => [...new Set([...String(v).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]))].sort().join(',');
  const mal = DA.filter(([k, v]) => {
    const e = ES[k];
    const otra = k.endsWith('_one') ? ES[k.replace(/_one$/, '_other')] : undefined;
    return e !== undefined && huecos(e) !== huecos(v) && (otra === undefined || huecos(otra) !== huecos(v));
  });
  check('24) los mismos huecos que el español, con los mismos nombres', mal.length === 0,
    mal.slice(0, 4).map(([k, v]) => `${k}: es[${huecos(ES[k])}] da[${huecos(v)}]`).join(' | ') || 'idénticos');
  const rotos = DA.filter(([, v]) => /\{\{(?![\w.]+\}\})|(?<!\{\{[\w.]+)\}\}|\{[\w.]+\}(?!\})/.test(v.replace(/\{\{[\w.]+\}\}/g, '')));
  check('25) ninguna llave suelta ni un hueco a medio escribir', rotos.length === 0, rotos.slice(0, 4).map(([k]) => k).join(' ') || 'limpio');
  const bordes = DA.filter(([k, v]) => typeof ES[k] === 'string' && (/^\s/.test(ES[k]) !== /^\s/.test(v) || /\s$/.test(ES[k]) !== /\s$/.test(v)));
  check('26) los espacios del borde, donde los tiene el español (esas piezas se pegan en pantalla)', bordes.length === 0, muestra(bordes) || 'iguales');
  /* Nada pegado a un hueco: ni la forma definida («{{nombre}}en») ni un genitivo («{{nombre}}s»). */
  const pegados = DA.filter(([, v]) => /\}\}[a-zæøå]/u.test(v));
  check('27) ninguna terminación pegada a un {{hueco}}', pegados.length === 0, muestra(pegados) || 'ninguna');
  const porcentajePegado = DA.filter(([, v]) => /\{\{\w+\}\}%|\d%/.test(v));
  check('28) el signo de porcentaje va separado por un espacio: «40 %»', porcentajePegado.length === 0, muestra(porcentajePegado) || 'bien');
}

console.log('\n── E · Danés escrito como danés ──');
{
  const noNfc = DA.filter(([, v]) => v !== v.normalize('NFC'));
  check('29) todo en NFC', noNfc.length === 0, noNfc.slice(0, 4).map(([k]) => k).join(' ') || 'todo');
  const conLetras = DA.filter(([, v]) => /[æøåÆØÅ]/.test(v)).length;
  check('30) el danés lleva sus letras: æ ø å aparecen en buena parte del diccionario', conLetras > DA.length / 5, `${conLetras} de ${DA.length} cadenas`);
  const SIN_LETRAS = palabra('sog|soeg|hjalp|hjaelp|naste|naeste|prov igen|proev|folg|foelg|fallesskab\\p{L}*|faellesskab\\p{L}*|tilfoj|tilfoej|abn|aabn|aendr\\p{L}*|faerdig|fardig|vaelg|laes mere|indlaeser', 'iu');
  const asciificadas = DA.filter(([, v]) => SIN_LETRAS.test(v));
  check('31) ninguna palabra sin su æ, ø u å', asciificadas.length === 0, muestra(asciificadas, ([k, v]) => `${k}: «${v.match(SIN_LETRAS)[0]}»`) || 'limpio');
  /* Ni noruego ni sueco: palabras parecidas que en danés están mal. */
  const VECINAS = palabra('innstillinger|passord|logg inn|lukk|søk|hjelp|tilbake|neste|ferdig|slett|bruker|avbryt|kanskje|melding|och|inte|inställningar|spara|sök', 'iu');
  const vecinas = DA.filter(([, v]) => VECINAS.test(sinLoAjeno(v)) || /[äöÄÖ]/.test(sinLoAjeno(v)));
  check('31b) ninguna palabra noruega o sueca, ni ä u ö', vecinas.length === 0, muestra(vecinas) || 'limpio');
  /* Compuestos juntos: lo que en danés es una palabra no se parte. */
  const PARTIDOS = palabra('profil billede|bruger navn|adgangs kode|e-mail adresse|video redigering|start side|kontakt liste|lyd fil|billed fil|video fil|projekt navn|søge felt|tekst felt|konto indstillinger|notifikations indstillinger|privatlivs politik|indkøbs liste|forside billede', 'iu');
  const partidos = DA.filter(([, v]) => PARTIDOS.test(v));
  check('32) ninguna palabra compuesta partida (særskrivning)', partidos.length === 0, muestra(partidos, ([k, v]) => `${k}: «${v.match(PARTIDOS)[0]}»`) || 'limpio');
  check('32b) control: la regla reconoce la særskrivning y deja pasar lo que está bien',
    ['Skift profil billede', 'Angiv bruger navn'].every((m) => PARTIDOS.test(m))
    && ['Skift profilbillede', 'Angiv brugernavn', 'Upload et billede'].every((b) => !PARTIDOS.test(b)));
  const tresPuntos = DA.filter(([, v]) => /\.\.\./.test(v));
  check('33) los puntos suspensivos son «…», un carácter', tresPuntos.length === 0, tresPuntos.slice(0, 4).map(([k]) => k).join(' ') || 'bien');
  /* Comillas ”…” (guía § 5): ni las españolas «» —que en danés apuntarían al revés— ni “ „. */
  const comillasAjenas = DA.filter(([, v]) => /[«»“„]/.test(v));
  check('33b) comillas danesas de Weë: ”…”', comillasAjenas.length === 0, muestra(comillasAjenas) || 'bien');
  /* «Du», nunca el «De» de cortesía; y sin «venligst». */
  const CORTESIA = /(?<=[\p{L}\p{N},] )(?:De|Dem|Deres)(?![\p{L}])|(?<![\p{L}])venligst(?![\p{L}])/u;
  const cortesia = DA.filter(([, v]) => CORTESIA.test(sinLoAjeno(v)));
  check('33c) se tutea: ningún «De/Dem/Deres» de cortesía ni «venligst»', cortesia.length === 0, muestra(cortesia) || 'du');
  /* Mayúscula de frase: nada de «Rediger Profil» con Cada Palabra En Mayúscula. */
  const MAYUSCULAS_A_PROPOSITO = new Set([
    'brain.slogan' /* «Drøm · Spørg · Skab · Forbind»: cuatro imperativos de marca, cada uno con su mayúscula, como el español */,
    'filmmaker.presetShorts' /* «YouTube Shorts»: nombre de producto */,
    'business.shareProfile', 'business.businessPlan', 'business.businessCoach', 'business.pricing', 'business.brandKit',
    'business.customerInsights', 'business.businessIdeas' /* nombres de producto de Weë Business (decisión del usuario, 2026-09-16) */,
  ]);
  const tituloIngles = DA.filter(([k, v]) => {
    if (MAYUSCULAS_A_PROPOSITO.has(k)) return false;
    const palabras = sinLoAjeno(v).split(/\s+/).filter((w) => /^\p{L}/u.test(w));
    return palabras.length >= 2 && palabras.slice(1).every((w) => /^\p{Lu}\p{Ll}/u.test(w));
  });
  check('33d) mayúscula solo al principio de la frase, no en cada palabra', tituloIngles.length === 0, muestra(tituloIngles) || 'bien');
}

console.log('\n── F · Las decisiones de la guía ──');
{
  /* Acento solo donde el imperativo se leería como otra palabra (guía § 3): «Generér», nunca «Generer». */
  /* Solo cuenta como imperativo lo que en español empieza por un verbo: «Informes» («Rapporter») es un sustantivo. */
  const VERBO_ES = /^(?:Generar|Genera|Copiar|Copia|Reportar|Denunciar|Marcar|Ordenar|Archivar|Comprobar|Importar|Exportar)(?![\p{L}])/u;
  const sinAcento = DA.filter(([k, v]) => VERBO_ES.test(ES[k] || '') && /^(?:Generer|Kopier|Rapporter|Marker|Sorter|Arkiver|Kontroller|Importer|Eksporter)(?![\p{L}])/u.test(v));
  check('34) los imperativos ambiguos llevan su acento: Generér, Kopiér, Rapportér…', sinAcento.length === 0, muestra(sinAcento) || 'bien');
  check('34c) control: «Generer» como botón se caza, y «Rapporter» como sustantivo no',
    VERBO_ES.test('Generar imagen') && !VERBO_ES.test('Informes') && /^(?:Generer)(?![\p{L}])/u.test('Generer billede'));
  const CON_ACENTO_DE_MAS = /^(?:Redigér|Annullér|Blokér|Aktivér|Installér|Publicér)(?![\p{L}])/u;
  const acentoDeMas = DA.filter(([, v]) => CON_ACENTO_DE_MAS.test(v));
  check('34b) y los demás no lo llevan: Rediger, Annuller, Bloker, Aktiver', acentoDeMas.length === 0, muestra(acentoDeMas) || 'bien');
  /* Una sola pareja para entrar y salir: «Log ind» / «Log ud». */
  const OTRA_PAREJA = /(?<![\p{L}])Log (?:på|af)(?![\p{L}])/u;
  const pareja = DA.filter(([, v]) => OTRA_PAREJA.test(v));
  check('35) entrar y salir: «Log ind» / «Log ud», nunca «Log på» / «Log af»', pareja.length === 0, muestra(pareja) || 'bien');
  /* «kunstig intelligens» solo donde el español escribe «Inteligencia Artificial» entero, en un texto que explica (guía § 9.1). */
  const ki = DA.filter(([k, v]) => palabra('KI').test(v) || (/kunstig intelligens/i.test(v) && !/inteligencia artificial/i.test(ES[k] || '')));
  check('36) la IA es «AI», nunca «KI»; «kunstig intelligens» solo donde el español lo escribe entero', ki.length === 0, muestra(ki) || 'AI');
  const feks = DA.filter(([, v]) => /f\.eks\./i.test(v));
  check('37) «fx», no «f.eks.»', feks.length === 0, muestra(feks) || 'fx');
  /* Cancelar no es deshacer: «Annuller» es cancelar y «Fortryd», deshacer. */
  const cancelar = DA.filter(([k, v]) => /^Cancelar$/.test(ES[k] || '') && v !== 'Annuller');
  check('38) «Cancelar» es siempre «Annuller»', cancelar.length === 0, muestra(cancelar) || 'Annuller');
}

console.log('\n── G · La búsqueda y la caja respetan el danés ──');
{
  check('39) para buscar, æ ø å siguen siendo sus letras: «Århus» no es «Arhus»',
    caja.paraBuscar('Århus') === 'århus' && caja.paraBuscar('Århus') !== caja.paraBuscar('Arhus') && caja.paraBuscar('ØL') === 'øl');
  check('40) y la inicial sube con su letra: «ændr» → «Ændr»', caja.conMayusculaInicial('ændr', 'da-DK') === 'Ændr');
  check('40b) y se ordena a la danesa: æ ø å detrás de la z', ['å', 'z', 'ø', 'a', 'æ'].sort(new Intl.Collator('da').compare).join('') === 'azæøå');
}

console.log('\n── H · El dinero y las marcas ──');
{
  /* La moneda no se traduce: «Credits», nunca «kreditter»; «kreditkort», la tarjeta, sí es danés. */
  const MONEDA = /(?<![\p{L}])[Kk]redit(?:ter|terne|ten|s)?(?![\p{L}])/u;
  const moneda = DA.filter(([, v]) => MONEDA.test(v));
  check('41) «Credits» nunca se traduce (kredit, kreditter)', moneda.length === 0, muestra(moneda) || 'limpio');
  const perdidos = DA.filter(([k, v]) => /Credits/.test(ES[k] || '') && !/Credits/.test(v));
  check('42) cada «Credits» del español sigue en su clave danesa', perdidos.length === 0, perdidos.slice(0, 4).map(([k]) => k).join(' ') || 'todos');
  const LISTA = ['Weë', 'Weë AI', 'Weë Studio', 'Weë Chef', 'Weë Design', 'Weë Travel', 'Weë Business', 'Weë Music', 'Weë Inspira',
    'Weëls', 'Wäll', 'Weë Credits', 'ËContact', 'ẄContact', 'Credits', 'WeeTalk', 'Weë Brain', 'Weë Photo', 'Weë Writer', 'Weë Beauty', 'Weë Home'];
  const escapar = (m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const perdidas = [];
  for (const [k, v] of DA) {
    const e = ES[k];
    if (typeof e !== 'string') continue;
    for (const m of LISTA) {
      const re = new RegExp(`(?<![\\p{L}])${escapar(m)}(?![\\p{L}])`, 'u');
      /* En danés la marca puede ir en un compuesto con guion («Weë-profil», «Weë Studio-projekt»): sigue siendo la marca. */
      const reDa = new RegExp(`(?<![\\p{L}])${escapar(m)}(?=-|(?![\\p{L}]))`, 'u');
      if (re.test(e) && !reDa.test(v)) perdidas.push(`${k}: «${m}»`);
    }
  }
  check('43) cada marca del español sigue, intacta, en su clave danesa', perdidas.length === 0, perdidas.slice(0, 6).join(' | ') || 'todas');
  const PEGADA = /(?:Weë|WeeTalk|Wäll|ËContact|ẄContact|Credits|Weë (?:AI|Studio|Design|Photo|Writer|Music|Beauty|Chef|Home|Business|Travel|Brain|Inspira))(?=[a-zæøå])/u;
  const pegadas = DA.filter(([, v]) => PEGADA.test(v.replace(/Weëls?/g, '·')));
  check('44) ninguna marca declinada ni con una terminación pegada («Weës», «WeeTalken»)', pegadas.length === 0, muestra(pegadas) || 'limpio');
  const TRADUCIDA = /Weë (?:Musik|Rejse|Rejser|Kok|Virksomhed|Forretning|Hjerne|Forfatter|Skribent|Foto|Skønhed|Hjem|Kreditter)(?![\p{L}])/u;
  const traducidas = DA.filter(([, v]) => TRADUCIDA.test(v));
  check('45) ninguna experiencia de Weë traducida («Weë Musik», «Weë Rejser»…)', traducidas.length === 0, muestra(traducidas) || 'limpio');
}

console.log('\n── I · Queda escrito ──');
{
  const indice = leer('i18n/textos/da/index.ts');
  check('46) el índice danés dice qué no entra nunca y lo propio del danés',
    /no entra nunca en estos archivos/i.test(indice) && /compuest/i.test(indice) && /æ ø å/.test(indice));
  const guia = fs.existsSync(path.resolve(raiz, 'docs/I18N-DANES.md')) ? leer('docs/I18N-DANES.md') : '';
  check('47) la guía de estilo y el glosario existen y se leen', guia.length > 2000 && /Glosario/i.test(guia) && /Credits/.test(guia));
  const pantallaDeError = leer('components/ErrorBoundary.tsx');
  const filaDa = (pantallaDeError.match(/^ {2}da: \{ titulo: '((?:[^'\\]|\\.)+)', mensaje: '((?:[^'\\]|\\.)+)', boton: '((?:[^'\\]|\\.)+)' \},$/m) || []).slice(1);
  check('48) la pantalla de error también habla danés', filaDa.length === 3 && filaDa.some((f) => /[æøå]/.test(f)), filaDa.join(' · ') || 'sin fila');
}

console.log('\n── J · Del aparato a la pantalla: selector, persistencia, cuenta, bienvenida, ajustes ──');
{
  const disponibles = registro.idiomasConDiccionario();
  const fila = idiomas.filasDeIdioma().find((f) => f.idioma === 'da');
  check('49) el selector ofrece «Dansk» como una fila propia', fila?.clave === 'da' && fila.nombreNativo === 'Dansk', JSON.stringify(fila));
  const pantallas = ['screens/IdiomaScreen.tsx', 'screens/OnboardingScreen.tsx', 'screens/SettingsScreen.tsx'].map((p) => [p, leer(p)]);
  const conLista = pantallas.filter(([, s]) => !/filasDeIdioma\(\)|disponibles\.find/.test(s) || /'da'|Dansk/.test(s)).map(([p]) => p);
  check('50) Idioma, la bienvenida y Configuración leen el catálogo, sin nada escrito para el danés', conLista.length === 0, conLista.join(' ') || 'las tres');
  const guardados = ['da', 'da-DK'].map((g) => resolver.elegirIdioma(g, ['en-US'], disponibles));
  check('51) persistencia: lo guardado al elegir danés vuelve como danés elegido',
    guardados.every((r) => r.idioma === 'da' && r.origen === 'elegido'), JSON.stringify(guardados));
  const lengua = require(path.resolve(here, '../lib/core/language.js'));
  check('52) la cuenta guarda `da-DK` y el servidor lo acepta tal cual',
    lengua.normalizarEtiqueta('da-DK') === 'da-DK' && lengua.idiomaDe('da-DK') === 'da'
    && lengua.contextoDeIdioma({ appLanguage: 'da-DK' }).appLanguage === 'da-DK');
  const aparato = (await cargar('i18n/aparato.ts')).ns;
  const antes = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: { languages: ['da-DK', 'da', 'en-US'], language: 'da-DK' }, configurable: true, writable: true });
  const delNavegador = aparato.localesDelAparato();
  if (antes) Object.defineProperty(globalThis, 'navigator', antes); else delete globalThis.navigator;
  const enLaWeb = resolver.elegirIdioma(null, delNavegador, disponibles);
  check('53) web: un navegador en danés abre Weë en danés, con `da-DK` para los formatos',
    delNavegador[0] === 'da-DK' && enLaWeb.idioma === 'da' && enLaWeb.locale === 'da-DK', `${delNavegador.join(',')} → ${JSON.stringify(enLaWeb)}`);

  /* Accesibilidad: las etiquetas del lector existen en danés y sin «knap» detrás (el rol ya lo dice). */
  const fuentes = [];
  const andar = (d) => {
    for (const e of fs.readdirSync(path.resolve(raiz, d), { withFileTypes: true })) {
      const rel = `${d}/${e.name}`;
      if (e.isDirectory()) andar(rel); else if (/\.tsx$/.test(e.name)) fuentes.push(leer(rel));
    }
  };
  ['components', 'screens', 'navigation'].forEach(andar);
  const clavesAccesibles = new Set(fuentes.flatMap((s) => [...s.matchAll(/accessibilityLabel=\{t\('([a-zA-Z]+\.[A-Za-z0-9_]+)'/g)].map((m) => m[1])));
  const plano = Object.fromEntries(DA);
  const valorDe = (k) => plano[k] ?? plano[`${k}_other`];
  const malasAccesibles = [...clavesAccesibles].filter((k) => valorDe(k) === undefined || /knap(pen)?$/i.test(valorDe(k)));
  check('54) accesibilidad: todas las etiquetas del lector existen en danés y sin «knap»',
    clavesAccesibles.size > 20 && malasAccesibles.length === 0,
    malasAccesibles.slice(0, 5).map((k) => `${k}: «${valorDe(k)}»`).join(' | ') || `${clavesAccesibles.size} etiquetas`);
}

console.log('\n── K · Traducciones defectuosas ──');
{
  const cuenta = (s, re) => (String(s).match(re) || []).length;
  const marcado = DA.filter(([k, v]) => typeof ES[k] === 'string'
    && (cuenta(ES[k], /<\/?[a-zA-Z][^>]*>/g) !== cuenta(v, /<\/?[a-zA-Z][^>]*>/g) || cuenta(ES[k], /\*\*|__|\]\(/g) !== cuenta(v, /\*\*|__|\]\(/g)));
  check('55) ni HTML ni markdown roto', marcado.length === 0, marcado.slice(0, 4).map(([k]) => k).join(' ') || 'intacto');
  const saltos = DA.filter(([k, v]) => {
    const ref = k.endsWith('_one') && ES[k.replace(/_one$/, '_other')] !== undefined ? ES[k.replace(/_one$/, '_other')] : ES[k];
    return typeof ref === 'string' && cuenta(ref, /\n/g) !== cuenta(v, /\n/g);
  });
  check('56) los mismos saltos de línea que el español', saltos.length === 0, saltos.slice(0, 4).map(([k]) => k).join(' ') || 'iguales');

  /* La misma frase española se dice igual en toda la app, salvo cuando el contexto pide otra cosa. */
  const DISTINTAS_A_PROPOSITO = new Set([
    /* «Subir»/«Bajar» reordenan escenas y klip (Flyt op/ned); en Studio son la grúa de la cámara (Kran op/ned). */
    'filmmaker.moveUp', 'filmmaker.moveDown',
    /* «Historias» como formato de redes es «Stories»; studio.wrStories («Historier») son relatos escritos. */
    'filmmaker.presetStories',
    /* «Resumen» en Filmmaker son cifras («3 scener og 8 klip»): «Oversigt»; el de un texto es «Resumé». */
    'filmmaker.summary',
    /* «Ver más» elementos de una lista: «Vis flere»; más de un texto: «Vis mere». */
    'filmmaker.loadMore',
    /* «Cuerpo entero» como encuadre es «Helfigur»; la experiencia de Studio, «Hele kroppen». */
    'filmmaker.focusFullBody',
    /* «Medio»: el largo del pelo concuerda con «frisure» (Halvlang); el de un texto, «Mellemlang». */
    'aiAvatar.hairMedium',
    /* «Listo»: el estado de una creación es «Klar»; el botón, «Færdig». */
    'creaciones.statusReady',
    /* «Todo»: todos los valores nutricionales de Chef (Alle værdier), no el filtro «Alle». */
    'chef.nuAll',
    /* «Media»: la dificultad media de Chef (Mellem), no la pestaña de fotos y vídeos del perfil (Medier). */
    'chef.valMedium',
    /* «Servicios»: el gasto de luz, agua e internet (Regninger), no la categoría de negocios (Ydelser). */
    'business.expenseServices',
    /* «Natural»: el movimiento (Naturligt) no es la luz natural (Naturligt lys). */
    'studio.smNatural',
    /* «Crear» una obra en Weë Studio es «Lav» (guía § 9.1); el + y el plan crean objetos: «Opret». */
    'studio.sendLabel', 'studio.create',
    /* «Mejorar» un texto es «Gør bedre»; una imagen o un vídeo, «Optimer». */
    'writer.improve',
  ]);
  const porFrase = new Map();
  for (const [k, v] of DA) {
    const e = ES[k];
    if (typeof e !== 'string' || /_one$/.test(k) || DISTINTAS_A_PROPOSITO.has(k)) continue;
    if (!porFrase.has(e)) porFrase.set(e, new Map());
    const m = porFrase.get(e);
    m.set(v, [...(m.get(v) || []), k]);
  }
  const inconsistentes = [...porFrase].filter(([, m]) => m.size > 1);
  check('57) la misma frase española se dice igual en toda la app, salvo excepciones con su porqué', inconsistentes.length === 0,
    inconsistentes.slice(0, 4).map(([e, m]) => `«${e.slice(0, 20)}» → ${[...m].map(([v, ks]) => `«${v.slice(0, 16)}» (${ks[0]})`).join(' / ')}`).join(' | ') || 'coherente');
  /* Los rótulos que se ven en toda la app dicen lo del glosario. */
  const ROTULOS = [['Guardar', 'Gem'], ['Cancelar', 'Annuller'], ['Compartir', 'Del'], ['Buscar', 'Søg'], ['Cerrar', 'Luk'], ['Eliminar', 'Slet'],
    ['Continuar', 'Fortsæt'], ['Atrás', 'Tilbage'], ['Siguiente', 'Næste'], ['Listo', 'Færdig'], ['Configuración', 'Indstillinger'], ['Ayuda', 'Hjælp'],
    ['Notificaciones', 'Notifikationer'], ['Reintentar', 'Prøv igen'], ['Inténtalo de nuevo', 'Prøv igen']];
  const rotulosMal = DA.filter(([k, v]) => !DISTINTAS_A_PROPOSITO.has(k) && ROTULOS.some(([e, t]) => ES[k] === e && v !== t));
  check('58) los rótulos comunes dicen siempre lo del glosario', rotulosMal.length === 0,
    rotulosMal.slice(0, 5).map(([k, v]) => `${k}: «${ES[k]}» → «${v}»`).join(' | ') || `${ROTULOS.length} rótulos`);
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
