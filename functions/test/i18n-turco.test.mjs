/*
 * EL TURCO DE WEË.
 *
 * `tr` entra por la misma puerta que los demás —una carpeta, una línea en el
 * registro, una fila en el catálogo—, sin una sola línea de lógica para él. Lo
 * que esta prueba vigila es lo que SOLO puede salir mal en turco:
 *
 * 1 · QUE ESTÉ ENTERO. Un traductor SIN respaldo frente a otro con él: si una
 *     clave faltara, el segundo la sacaría en inglés y el primero no.
 *
 * 2 · LA CAJA. La mayúscula de «i» es «İ» y la minúscula de «I» es «ı». Nada se
 *     pasa a mayúsculas o minúsculas sin su locale, y la búsqueda trata las
 *     cuatro íes como una.
 *
 * 3 · LOS SUFIJOS. El turco pega las terminaciones y su vocal depende de la
 *     palabra anterior: detrás de un {{hueco}} no se puede saber, así que ahí no
 *     va ninguna; detrás de una marca, solo con apóstrofo y la forma de la guía.
 *
 * 4 · LAS CIFRAS. «%60», con el signo delante; y tras un número el sustantivo va
 *     en singular: «3 gönderi», nunca «3 gönderiler».
 *
 * 5 · QUE `tr-TR` FUNCIONE DE PUNTA A PUNTA: del aparato al idioma, a los
 *     formatos y al `<html lang="tr">`, sin que la ubicación toque nada.
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
const tr = (await cargar('i18n/textos/tr/index.ts')).ns.tr;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const TR = aplanar(tr);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));

const MARCAS = /Weë (?:AI|Studio|Design|Photo|Writer|Music|Beauty|Chef|Home|Business|Travel|Brain|Credits|Inspira)|WeeTalk|Weëls|Wäll|ËContact|ẄContact|Credits|Weë/gu;
const sinLoAjeno = (v) => String(v)
  .replace(/\{\{[\w.]+\}\}/g, ' ')
  .replace(/\\[nrt]/g, ' ')
  .replace(MARCAS, ' ');
/* Fronteras de palabra que saben de letras: `\b` es ASCII y no ve la «ş» ni la «ı». */
const palabra = (cuerpo, banderas = 'u') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);

console.log('\n── A · `tr-TR` de punta a punta, sin lógica para el turco ──');
{
  const cat = idiomas.idiomaDelCatalogo('tr');
  check('1) el catálogo lo ofrece: listo, «Türkçe», de izquierda a derecha y sin variantes',
    cat?.listo === true && cat.nombreNativo === 'Türkçe' && cat.direccion === 'ltr' && !cat.variantes
    && idiomas.filasDeIdioma().filter((f) => f.idioma === 'tr').length === 1,
    JSON.stringify(cat));
  check('2) y su locale principal, `tr-TR`, está entre los contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('tr-TR'));
  check('3) el registro lo sirve con su propio diccionario, no por un alias',
    registro.DICCIONARIOS.tr === tr && registro.idiomasConDiccionario().includes('tr'));

  const disponibles = registro.idiomasConDiccionario();
  const elegir = (elegido, aparato) => resolver.elegirIdioma(elegido, aparato, disponibles);
  const delAparato = elegir(null, ['tr-TR']);
  check('4) un aparato en `tr-TR` recibe turco, con sus formatos',
    delAparato.idioma === 'tr' && delAparato.locale === 'tr-TR' && delAparato.origen === 'aparato', JSON.stringify(delAparato));
  check('5) también si solo dice `tr`, o si el turco va primero en su lista',
    elegir(null, ['tr']).idioma === 'tr' && elegir(null, ['tr-TR', 'en-US']).idioma === 'tr');
  check('6) la cadena de respaldo: `tr-TR` → `tr` → inglés',
    resolver.cadenaDeRespaldo('tr-TR').join('>') === 'tr-TR>tr>en', resolver.cadenaDeRespaldo('tr-TR').join('>'));
  check('7) lo elegido a mano gana al aparato, en las dos direcciones',
    elegir('es', ['tr-TR']).idioma === 'es' && elegir('tr', ['es-PE', 'en-US']).idioma === 'tr'
    && elegir('tr', ['es-PE']).origen === 'elegido');
  check('8) la lengua del texto es `tr`: la página se anuncia como `<html lang="tr">`',
    resolver.etiquetaDelTexto('tr', 'tr-TR') === 'tr' && resolver.etiquetaDelTexto('en', 'tr-TR') === 'en');

  /* Los formatos los escribe `Intl`: se comprueba la FORMA, no la cadena exacta de una versión de CLDR. */
  const dia = Date.UTC(2026, 8, 30, 12);
  const fecha = formato.formatearFecha(dia, 'tr-TR');
  const numero = formato.formatearNumero(1234567.89, 'tr-TR');
  const liras = formato.formatearMoneda(1500, 'tr-TR', 'TRY');
  const porcentaje = formato.formatearPorcentaje(0.6, 'tr-TR');
  const hace = formato.formatearTiempoRelativo(dia - 3 * 24 * 3600 * 1000, 'tr-TR', dia);
  const lista = formato.formatearLista(['A', 'B', 'C'], 'tr-TR');
  check('9) la fecha turca: «30 Eylül 2026»', /30 Eylül 2026/.test(fecha), fecha);
  check('10) los números con punto de miles y coma decimal', /1\.234\.567,89/.test(numero), numero);
  check('11) la lira con su signo y dos decimales', /₺/.test(liras) && /1\.500,00/.test(liras), liras);
  check('12) el porcentaje con el signo DELANTE: «%60»', /^%60$/.test(porcentaje.replace(/\s/g, '')), porcentaje);
  check('13) «hace 3 días» lo escribe Intl, en turco', /3 gün önce/.test(hace), hace);
  check('14) las listas se unen con «ve»', /A, B ve C/.test(lista), lista);
  check('15) la distancia en el sistema métrico',
    formato.sistemaDeMedida('tr-TR') === 'metrico' && /km/.test(formato.formatearDistancia(5000, 'tr-TR')), formato.formatearDistancia(5000, 'tr-TR'));
  check('16) la fecha de nacimiento se pide día · mes · año', formato.ordenDeLaFecha('tr-TR').join() === 'day,month,year',
    formato.ordenDeLaFecha('tr-TR').join());
}

console.log('\n── B · Entero: sin respaldo, sin huecos, sin nada sin traducir ──');
{
  const solo = traducir.crearTraductor('tr-TR', { tr }, { modoDesarrollo: false });
  const conRespaldo = traducir.crearTraductor('tr-TR', { tr, es, en }, { modoDesarrollo: false });
  const valores = { contador: 2, nombre: 'Ayşe', titulo: 'T', lista: 'L', cantidad: 3, saldo: 10 };
  const distintas = Object.keys(ES).filter((k) => !/_(one|other)$/.test(k) || k.endsWith('_other'))
    .map((k) => k.replace(/_other$/, ''))
    .filter((k) => solo(k, valores) !== conRespaldo(k, valores));
  check('17) sin español ni inglés detrás, el turco dice exactamente lo mismo',
    distintas.length === 0, distintas.slice(0, 5).join(' ') || `${Object.keys(ES).length} claves`);
  const vacias = TR.filter(([, v]) => typeof v !== 'string' || v.trim() === '');
  check('18) ninguna cadena vacía', vacias.length === 0, vacias.slice(0, 5).map(([k]) => k).join(' ') || 'ninguna');

  /*
   * Ninguna palabra española suelta. Se buscan solo palabras que NO existen en
   * turco: «de», «en», «o», «mi», «para» y «el» son también palabras turcas
   * («de» y, «en» el más, «o» él, «mi» la pregunta, «para» dinero, «el» mano).
   */
  const ESPANOL = palabra('los|las|del|con|una|que|por|más|desde|cuando|puedes|aquí|está|están|tus|mis|nuestro|usted', 'iu');
  const conEspanol = TR.filter(([, v]) => ESPANOL.test(sinLoAjeno(v)));
  check('19) ninguna palabra española colada en una frase turca', conEspanol.length === 0,
    conEspanol.slice(0, 5).map(([k, v]) => `${k}: «${v.slice(0, 34)}»`).join(' | ') || 'limpio');

  /* Lo que se escribe igual en turco que en español o en inglés, con su porqué. */
  const IGUALES = new Map([
    ['filmmaker.presetShorts', '«YouTube Shorts» es el nombre de la plataforma, que no se traduce, y ya dice que es vídeo (con «videosu» se corta en su casilla)'],
    ['composer.kindVideo', '«Video» es la palabra turca (glosario § 10.1)'],
    ['engine.modalityVideo', '«video» es la palabra turca (glosario § 10.1)'],
    ['studio.grpVideo', '«Video» es la palabra turca (glosario § 10.1)'],
    ['studio.kindVideo', '«Video» es la palabra turca (glosario § 10.1)'],
    ['business.typeVideo', '«Video» es la palabra turca (glosario § 10.1)'],
    ['business.brandLogo', '«Logo» es la palabra turca (está en el diccionario de la TDK)'],
    ['business.shareProfile', '«Business Profile» es nombre de producto y no se traduce (decisión del usuario, 2026-09-16; constants/businessModules.ts)'],
    /* Los nombres de las funciones de Weë Business son de producto, como Weë Studio (decisión del usuario, 2026-09-16). */
    ['business.businessPlan', 'nombre de función de Weë Business (decisión del usuario, 2026-09-16)'],
    ['business.businessCoach', 'nombre de función de Weë Business (decisión del usuario, 2026-09-16)'],
    ['business.pricing', 'nombre de función de Weë Business (decisión del usuario, 2026-09-16)'],
    ['business.brandKit', 'nombre de función de Weë Business (decisión del usuario, 2026-09-16)'],
    ['business.customerInsights', 'nombre de función de Weë Business (decisión del usuario, 2026-09-16)'],
    ['business.businessIdeas', 'nombre de función de Weë Business (decisión del usuario, 2026-09-16)'],
    ['aiAvatar.faceOval', '«Oval» es la palabra turca'],
    ['aiAvatar.accPiercing', '«Piercing» es la palabra turca'],
    ['design.valModern', '«Modern» es la palabra turca'],
    ['design.valMetal', '«Metal» es la palabra turca'],
    ['chef.nuProtein', '«Protein» es la palabra turca'],
    ['chef.swVegan', '«Vegan» es la palabra turca'],
    ['chef.valVegan', '«Vegan» es la palabra turca'],
    ['creaciones.kindVideo', '«Video» es la palabra turca (glosario § 10.1)'],
    ['moderation.reasonSpam', '«Spam» es lo que dicen Instagram y X en turco'],
    ['settings.engineAdmin', '«Weë AI Engine» es el nombre del producto (el WEË AI ENGINE), igual en casi todos los idiomas'],
    ['catalogo.musicEj1Subtitle', '«Pop», nombre del género musical, igual en turco'],
    ['catalogo.musicEj2Subtitle', '«Reggaeton», nombre del género musical, igual en turco'],
    ['catalogo.musicEj3Subtitle', '«Rock», nombre del género musical, igual en turco'],
    ['catalogo.chefEj4Title', '«Lomo saltado» es el nombre de un plato: no se traduce, como «sushi»'],
  ]);
  const copiadas = TR.filter(([k, v]) => !IGUALES.has(k) && /\p{L}{3,}/u.test(sinLoAjeno(v)) && (ES[k] === v || EN[k] === v));
  check('20) ninguna cadena copiada tal cual del español o del inglés, salvo las que se escriben igual con su porqué',
    copiadas.length === 0, copiadas.slice(0, 6).map(([k, v]) => `${k}: «${v.slice(0, 30)}»`).join(' | ') || `${IGUALES.size} iguales a propósito`);
}

console.log('\n── C · Número: `one` y `other`, y el sustantivo en singular tras la cifra ──');
{
  const r = new Intl.PluralRules('tr');
  check('21) `Intl` declara `one` y `other` para el turco',
    r.resolvedOptions().pluralCategories.join(',') === 'one,other', r.resolvedOptions().pluralCategories.join(','));
  const plano = Object.fromEntries(TR);
  const inventadas = Object.keys(plano).filter((k) => /_(zero|two|few|many)$/.test(k));
  check('22) y no hay formas de plural inventadas', inventadas.length === 0, inventadas.join(' ') || 'ninguna');
  /* «3 gönderi», no «3 gönderiler»: tras una cifra el turco no pluraliza. */
  const PLURAL_TRAS_CIFRA = /\{\{(?:contador|cantidad|numero|total|n|dias|noches|credits)\}\}\s+\p{L}+(?:lar|ler)(?![\p{L}])/u;
  const pluralizadas = TR.filter(([, v]) => PLURAL_TRAS_CIFRA.test(v));
  check('23) tras una cifra, el sustantivo va en singular', pluralizadas.length === 0,
    pluralizadas.slice(0, 5).map(([k, v]) => `${k}: «${v.slice(0, 40)}»`).join(' | ') || 'todas');
}

console.log('\n── D · Los huecos, intactos y sin nada pegado ──');
{
  const huecos = (v) => [...new Set([...String(v).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]))].sort().join(',');
  const mal = TR.filter(([k, v]) => {
    const e = ES[k];
    const otra = k.endsWith('_one') ? ES[k.replace(/_one$/, '_other')] : undefined;
    return e !== undefined && huecos(e) !== huecos(v) && (otra === undefined || huecos(otra) !== huecos(v));
  });
  check('24) los mismos huecos que el español, con los mismos nombres', mal.length === 0,
    mal.slice(0, 4).map(([k, v]) => `${k}: es[${huecos(ES[k])}] tr[${huecos(v)}]`).join(' | ') || 'idénticos');
  const rotos = TR.filter(([, v]) => /\{\{(?![\w.]+\}\})|(?<!\{\{[\w.]+)\}\}|\{[\w.]+\}(?!\})/.test(v.replace(/\{\{[\w.]+\}\}/g, '')));
  check('25) ninguna llave suelta ni un hueco a medio escribir', rotos.length === 0, rotos.slice(0, 4).map(([k]) => k).join(' ') || 'limpio');
  const bordes = TR.filter(([k, v]) => typeof ES[k] === 'string' && (/^\s/.test(ES[k]) !== /^\s/.test(v) || /\s$/.test(ES[k]) !== /\s$/.test(v)));
  check('26) los espacios del borde, donde los tiene el español (esas piezas se pegan en pantalla)', bordes.length === 0,
    bordes.slice(0, 4).map(([k, v]) => `${k}: «${v}»`).join(' | ') || 'iguales');
  /*
   * NINGÚN SUFIJO PEGADO A UN HUECO. «{{nombre}}'in», «{{topluluk}}'ta»: la
   * vocal y la consonante del sufijo dependen de cómo acaba lo que entre, y eso
   * no se sabe al traducir. La frase se reescribe (§ 5 de la guía).
   */
  const SUFIJO_EN_HUECO = /\}\}['’]?[a-zçğıöşüâîû]/u;
  const pegados = TR.filter(([, v]) => SUFIJO_EN_HUECO.test(v));
  check('27) ningún sufijo pegado a un {{hueco}}', pegados.length === 0,
    pegados.slice(0, 5).map(([k, v]) => `${k}: «${v.slice(0, 40)}»`).join(' | ') || 'ninguno');
  check('27b) control: la regla reconoce los sufijos pegados y deja pasar lo que está bien',
    ["{{nombre}}'in gönderisi", '{{nombre}}in', '{{comunidad}}’da'].every((m) => SUFIJO_EN_HUECO.test(m))
    && ['{{nombre}} adlı kişi', 'Ad: {{nombre}}', '{{contador}} gönderi', '%{{descuento}} indirim', '«{{busqueda}}» için sonuç yok']
      .every((b) => !SUFIJO_EN_HUECO.test(b)));
  const porcentajeDetras = TR.filter(([, v]) => /\{\{\w+\}\}\s?%|\d\s?%/.test(v));
  check('28) el signo de porcentaje va DELANTE de la cifra', porcentajeDetras.length === 0,
    porcentajeDetras.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 40)}»`).join(' | ') || 'bien');
}

console.log('\n── E · Turco escrito como turco ──');
{
  const noNfc = TR.filter(([, v]) => v !== v.normalize('NFC'));
  check('29) todo en NFC', noNfc.length === 0, noNfc.slice(0, 4).map(([k]) => k).join(' ') || 'todo');
  /* Palabras sin sus letras: lo que queda al escribir con un teclado sin ç ğ ı ö ş ü. */
  const SIN_LETRAS = palabra('olustur\\p{L}*|paylas\\p{L}*|duzenle\\p{L}*|giris\\p{L}*|cikis\\p{L}*|guncelle\\p{L}*|gorsel\\p{L}*|sifre\\p{L}*|kullanici\\p{L}*|basari\\p{L}*|goruntule\\p{L}*|yukle\\p{L}*|secenek\\p{L}*|degistir\\p{L}*|tesekkur\\p{L}*|lutfen|simdi|bugun|gonderi\\p{L}*|begen\\p{L}*|kesfet\\p{L}*|sablon\\p{L}*|calisma\\p{L}*|ozellik\\p{L}*|icerik\\p{L}*|iletisim\\p{L}*|islem\\p{L}*', 'iu');
  const asciificadas = TR.filter(([, v]) => SIN_LETRAS.test(v));
  check('30) ninguna palabra sin sus letras turcas', asciificadas.length === 0,
    asciificadas.slice(0, 5).map(([k, v]) => `${k}: «${v.match(SIN_LETRAS)[0]}»`).join(' | ') || 'limpio');
  /* La mayúscula de «i» es «İ»: «İptal», «İndir», «İleri»… nunca «Iptal». */
  const I_SIN_PUNTO = /(?<![\p{L}])I(?:ptal|ndir|leri|çerik|letişim|stek|şlem|zin|sim|lk|ş(?![\p{L}])|kinci|çin|nternet|mza|nceleme|şaret|çe|zle)/u;
  const sinPunto = TR.filter(([, v]) => I_SIN_PUNTO.test(v));
  check('31) la «i» mayúscula lleva su punto: «İ»', sinPunto.length === 0,
    sinPunto.slice(0, 5).map(([k, v]) => `${k}: «${v.match(I_SIN_PUNTO)[0]}»`).join(' | ') || 'limpio');
  const tresPuntos = TR.filter(([, v]) => /\.\.\./.test(v));
  check('32) los puntos suspensivos son «…», un carácter', tresPuntos.length === 0, tresPuntos.slice(0, 4).map(([k]) => k).join(' ') || 'bien');
  /* La partícula interrogativa se escribe separada: «Emin misin?», nunca «Eminmisin?». */
  const particula = TR.filter(([, v]) => /\p{L}(?:misin|mısın|musun|müsün|miyim|mıyım|miyiz|mıyız)\?/u.test(v));
  check('33) la partícula «mi» va separada de la palabra', particula.length === 0,
    particula.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 40)}»`).join(' | ') || 'bien');
}

console.log('\n── F · La caja: mayúsculas, minúsculas y búsqueda con las reglas del turco ──');
{
  check('34) la inicial sube con el locale: «istanbul» → «İstanbul», «ırmak» → «Irmak»',
    caja.conMayusculaInicial('istanbul', 'tr-TR') === 'İstanbul' && caja.conMayusculaInicial('ırmak', 'tr-TR') === 'Irmak'
    && caja.conMayusculaInicial('istanbul', 'en-US') === 'Istanbul');
  const iguales = ['İstanbul', 'ISTANBUL', 'istanbul', 'ıstanbul', 'Istanbul'].map(caja.paraBuscar);
  check('35) para buscar, las cuatro íes son una: «istanbul» encuentra «İstanbul»',
    iguales.every((v) => v === iguales[0]) && caja.paraBuscar('ŞİŞLİ') === caja.paraBuscar('şişli')
    && caja.paraBuscar('Çağla') === 'çağla' && !/̇/.test(caja.paraBuscar('İzmir')), iguales.join(' '));
  /*
   * NINGÚN `toUpperCase()` NI `toLowerCase()` SIN LOCALE en lo que se pinta o se
   * busca. Los que quedan tocan IDENTIFICADORES —extensiones, slugs, códigos—
   * o datos guardados, y van en una lista cerrada con su porqué.
   */
  const PERMITIDOS = new Map([
    ['screens/HomeScreen.tsx', 'el slug de una comunidad (ASCII) convertido en título cuando no hay nombre'],
    ['screens/OnboardingScreen.tsx', 'el nombre ESPAÑOL del catálogo de países, que también sirve para buscar; lo que se enseña va con su locale'],
    ['components/creator/PlanCard.tsx', 'un código de resolución («1080p») escrito en mayúsculas'],
    ['utils/feedFilters.ts', 'se buscan signos y palabras clave técnicas en el texto de una publicación, no se enseña nada'],
    ['utils/pollDraft.ts', 'compara dos opciones de la misma encuesta; se compila sola en encuestas.test y no puede importar'],
    ['utils/sectionFeed.ts', 'normaliza con NFD para comparar con palabras clave técnicas en ASCII'],
    ['services/assetDownload.ts', 'la extensión de un archivo'],
    ['services/videoDownload.ts', 'la extensión de un archivo'],
    ['services/communityService.ts', 'el slug ASCII de una comunidad'],
    ['services/firestoreService.ts', 'la clave del recuento de hashtags populares, que es también lo que se enseña: plegarla cambiaría cómo se escribe'],
    ['services/projectsService.ts', 'la heurística española «mi …» de la sugerencia de nombre'],
    ['services/weeBizService.ts', 'el campo guardado `nameLower` y su búsqueda por prefijo: cambiarlo exige migrar los negocios guardados'],
    ['constants/camaraCinematica.ts', 'el alias técnico de un comando de cámara'],
    ['constants/weeExperiences.ts', 'las palabras clave de las experiencias: se comparan con lo que se escribe, no se enseñan'],
    ['utils/mensajesDeFilmmaker.ts', 'convierte el código de error del servidor (ASCII, snake_case) en el sufijo de su clave i18n: no se enseña'],
    ['services/filmmaker/espejo/core/continuity.ts', 'espejo generado del dominio: normaliza claves técnicas prohibidas (ASCII), no texto visible'],
    ['services/filmmaker/espejo/core/language.ts', 'espejo generado del dominio: canonicaliza etiquetas de idioma BCP-47 (identificadores ASCII)'],
    ['services/filmmaker/espejo/core/shot.ts', 'espejo generado del dominio: normaliza claves técnicas prohibidas (ASCII), no texto visible'],
  ]);
  const listar = (d, r = []) => {
    for (const e of fs.readdirSync(path.resolve(raiz, d), { withFileTypes: true })) {
      const rel = `${d}/${e.name}`;
      if (e.isDirectory()) listar(rel, r); else if (/\.tsx?$/.test(e.name)) r.push(rel);
    }
    return r;
  };
  const capa = ['screens', 'components', 'hooks', 'utils', 'services', 'contexts', 'constants', 'navigation'].flatMap((d) => listar(d));
  const conCaja = capa.filter((rel) => /\.to(?:Upper|Lower)Case\(\)/.test(leer(rel)));
  const sueltos = conCaja.filter((rel) => !PERMITIDOS.has(rel));
  check('36) ningún `toUpperCase()`/`toLowerCase()` sin locale fuera de la lista cerrada', sueltos.length === 0,
    sueltos.join(' ') || `${conCaja.length} archivos, todos con su porqué`);
  check('36b) y la lista no guarda excepciones que ya no existen',
    [...PERMITIDOS.keys()].every((rel) => conCaja.includes(rel)), [...PERMITIDOS.keys()].filter((rel) => !conCaja.includes(rel)).join(' ') || 'vigentes');
  /*
   * NINGÚN RÓTULO EN MAYÚSCULAS POR ESTILO. `textTransform: 'uppercase'` pasa a
   * mayúsculas sin locale en iOS («STIL», «KOMPOZISYON»): los rótulos van con
   * `TextoEnMayusculas`, que usa `toLocaleUpperCase`. Un archivo que nadie
   * importa no llega a ninguna pantalla y no cuenta.
   */
  const pantallas = ['screens', 'components', 'navigation'].flatMap((d) => listar(d));
  const todos = [...capa, 'App.tsx'];
  const importado = (rel) => {
    const nombre = path.basename(rel).replace(/\.tsx?$/, '');
    return todos.some((otro) => otro !== rel && new RegExp(`from ['"][./]+(?:[\\w/]+/)?${nombre}['"]`).test(leer(otro)));
  };
  const conTransformacion = pantallas.filter((rel) => rel !== 'components/TextoEnMayusculas.tsx'
    && /textTransform:\s*'(?:uppercase|lowercase|capitalize)'/.test(leer(rel)) && importado(rel));
  check('36c) ningún rótulo cambia de caja por estilo: se escribe con `TextoEnMayusculas`', conTransformacion.length === 0,
    conTransformacion.join(' ') || `${pantallas.filter((rel) => /<TextoEnMayusculas/.test(leer(rel))).length} archivos con rótulos en mayúsculas`);
  const buscadores = ['screens/SearchScreen.tsx', 'screens/InboxScreen.tsx', 'screens/CommunitiesManagementScreen.tsx'];
  check('37) los buscadores comparan con `paraBuscar`, a los dos lados',
    buscadores.every((rel) => /paraBuscar\(/.test(leer(rel))) && /paraBuscar\(user\.displayName\)/.test(leer('services/firestoreService.ts'))
    && /paraBuscar\(post\.content\)/.test(leer('services/firestoreService.ts')));
}

console.log('\n── G · El dinero y las marcas ──');
{
  /* La moneda no se traduce: «Credits», nunca «Kredi», «Krediler», «Jeton» ni «Puan». «kredi kartı» sí existe. */
  const MONEDA = /(?<![\p{L}])(?:[Kk]redi(?:ler|leri|lerin|ni|n|niz|ye|den|de)?(?![\p{L}])(?! kart)|[Jj]eton\p{L}*|[Pp]uan\p{L}*)/u;
  const moneda = TR.filter(([, v]) => MONEDA.test(v));
  check('38) «Credits» nunca se traduce (Kredi, Jeton, Puan)', moneda.length === 0,
    moneda.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 30)}»`).join(' | ') || 'limpio');
  const perdidos = TR.filter(([k, v]) => /Credits/.test(ES[k] || '') && !/Credits/.test(v));
  check('39) cada «Credits» del español sigue en su clave turca', perdidos.length === 0, perdidos.slice(0, 4).map(([k]) => k).join(' ') || 'todos');

  const LISTA = ['Weë', 'Weë AI', 'Weë Studio', 'Weë Chef', 'Weë Design', 'Weë Travel', 'Weë Business', 'Weë Music', 'Weë Inspira',
    'Weëls', 'Wäll', 'Weë Credits', 'ËContact', 'ẄContact', 'Credits', 'WeeTalk', 'Weë Brain', 'Weë Photo', 'Weë Writer', 'Weë Beauty', 'Weë Home'];
  const escapar = (m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const perdidas = [];
  for (const [k, v] of TR) {
    const e = ES[k];
    if (typeof e !== 'string') continue;
    for (const m of LISTA) {
      const re = new RegExp(`(?<![\\p{L}])${escapar(m)}(?![\\p{L}])`, 'u');
      /* En turco la marca puede llevar un sufijo tras apóstrofo («Weë'de»): eso sigue siendo la marca. */
      const reTr = new RegExp(`(?<![\\p{L}])${escapar(m)}(?=['’]|(?![\\p{L}]))`, 'u');
      if (re.test(e) && !reTr.test(v)) perdidas.push(`${k}: «${m}»`);
    }
  }
  check('40) cada marca del español sigue, intacta, en su clave turca', perdidas.length === 0, perdidas.slice(0, 6).join(' | ') || 'todas');
  /* Una marca nunca lleva una terminación pegada sin apóstrofo: «Weëde», «WeeTalkta». */
  const PEGADA = /(?:Weë|WeeTalk|Weëls|Wäll|ËContact|ẄContact|Credits|Weë (?:AI|Studio|Design|Photo|Writer|Music|Beauty|Chef|Home|Business|Travel|Brain|Inspira))(?=[a-zçğıöşü])/u;
  /* «Weëls» y su singular «Weël» son la marca entera, no «Weë» con algo pegado. */
  const pegadas = TR.filter(([, v]) => PEGADA.test(v.replace(/Weëls?/g, '·')));
  check('41) ninguna marca con una terminación pegada sin apóstrofo', pegadas.length === 0,
    pegadas.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 40)}»`).join(' | ') || 'limpio');
  const TRADUCIDA = /Weë (?:Stüdyo|Tasarım|Fotoğraf|Yazar|Müzik|Güzellik|Şef|Ev|İş|Seyahat|Gezi|Beyin|Zihin|Yapay Zek[aâ]|Kredi)(?![\p{L}])/u;
  const traducidas = TR.filter(([, v]) => TRADUCIDA.test(v));
  check('42) ninguna experiencia de Weë traducida («Weë Stüdyo», «Weë Müzik»…)', traducidas.length === 0,
    traducidas.slice(0, 4).map(([k, v]) => `${k}: «${v.slice(0, 30)}»`).join(' | ') || 'limpio');
}

console.log('\n── H · Queda escrito ──');
{
  const indice = leer('i18n/textos/tr/index.ts');
  check('43) el índice turco dice qué no entra nunca y lo propio del turco',
    /no entra nunca en estos archivos/i.test(indice) && /sufijo/i.test(indice) && /İ/.test(indice));
  const guia = fs.existsSync(path.resolve(raiz, 'docs/I18N-TURCO.md')) ? leer('docs/I18N-TURCO.md') : '';
  check('44) la guía de estilo y el glosario existen y se leen', guia.length > 2000 && /Glosario/i.test(guia) && /Credits/.test(guia));
  const pantallaDeError = leer('components/ErrorBoundary.tsx');
  const filaTr = (pantallaDeError.match(/^ {2}tr: \{ titulo: '((?:[^'\\]|\\.)+)', mensaje: '((?:[^'\\]|\\.)+)', boton: '((?:[^'\\]|\\.)+)' \},$/m) || []).slice(1);
  check('45) la pantalla de error también habla turco', filaTr.length === 3 && filaTr.some((f) => /[çğıöşüİ]/.test(f)),
    filaTr.join(' · ') || 'sin fila');
}

console.log('\n── I · Del aparato a la pantalla: selector, persistencia, cuenta, bienvenida, ajustes ──');
{
  const disponibles = registro.idiomasConDiccionario();
  const fila = idiomas.filasDeIdioma().find((f) => f.idioma === 'tr');
  check('46) el selector ofrece «Türkçe» como una fila propia', fila?.clave === 'tr' && fila.nombreNativo === 'Türkçe', JSON.stringify(fila));
  const pantallas = ['screens/IdiomaScreen.tsx', 'screens/OnboardingScreen.tsx', 'screens/SettingsScreen.tsx'].map((p) => [p, leer(p)]);
  const conLista = pantallas.filter(([, s]) => !/filasDeIdioma\(\)|disponibles\.find/.test(s) || /'tr'|Türkçe/.test(s)).map(([p]) => p);
  check('47) Idioma, la bienvenida y Configuración leen el catálogo, sin nada escrito para el turco', conLista.length === 0, conLista.join(' ') || 'las tres');
  const guardados = ['tr', 'tr-TR'].map((g) => resolver.elegirIdioma(g, ['en-US'], disponibles));
  check('48) persistencia: lo guardado al elegir turco vuelve como turco elegido',
    guardados.every((r) => r.idioma === 'tr' && r.origen === 'elegido'), JSON.stringify(guardados));
  const lengua = require(path.resolve(here, '../lib/core/language.js'));
  check('49) la cuenta guarda `tr-TR` y el servidor lo acepta tal cual',
    lengua.normalizarEtiqueta('tr-TR') === 'tr-TR' && lengua.idiomaDe('tr-TR') === 'tr'
    && lengua.contextoDeIdioma({ appLanguage: 'tr-TR' }).appLanguage === 'tr-TR');
  const aparato = (await cargar('i18n/aparato.ts')).ns;
  const antes = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: { languages: ['tr-TR', 'tr', 'en-US'], language: 'tr-TR' }, configurable: true, writable: true });
  const delNavegador = aparato.localesDelAparato();
  if (antes) Object.defineProperty(globalThis, 'navigator', antes); else delete globalThis.navigator;
  const enLaWeb = resolver.elegirIdioma(null, delNavegador, disponibles);
  check('50) web: un navegador en turco abre Weë en turco, con `tr-TR` para los formatos',
    delNavegador[0] === 'tr-TR' && enLaWeb.idioma === 'tr' && enLaWeb.locale === 'tr-TR', `${delNavegador.join(',')} → ${JSON.stringify(enLaWeb)}`);

  /* Accesibilidad: las etiquetas del lector de pantalla están en turco y sin «düğmesi» detrás (el rol ya lo dice). */
  const fuentes = [];
  const andar = (d) => {
    for (const e of fs.readdirSync(path.resolve(raiz, d), { withFileTypes: true })) {
      const rel = `${d}/${e.name}`;
      if (e.isDirectory()) andar(rel); else if (/\.tsx$/.test(e.name)) fuentes.push(leer(rel));
    }
  };
  ['components', 'screens', 'navigation'].forEach(andar);
  const clavesAccesibles = new Set(fuentes.flatMap((s) => [...s.matchAll(/accessibilityLabel=\{t\('([a-zA-Z]+\.[A-Za-z0-9_]+)'/g)].map((m) => m[1])));
  const plano = Object.fromEntries(TR);
  const valorDe = (k) => plano[k] ?? plano[`${k}_other`];
  const malasAccesibles = [...clavesAccesibles].filter((k) => valorDe(k) === undefined || /düğmesi$/i.test(valorDe(k)));
  check('51) accesibilidad: todas las etiquetas del lector existen en turco y sin «düğmesi»',
    clavesAccesibles.size > 20 && malasAccesibles.length === 0,
    malasAccesibles.slice(0, 5).map((k) => `${k}: «${valorDe(k)}»`).join(' | ') || `${clavesAccesibles.size} etiquetas`);
}

console.log('\n── J · Traducciones defectuosas ──');
{
  const cuenta = (s, re) => (String(s).match(re) || []).length;
  const marcado = TR.filter(([k, v]) => typeof ES[k] === 'string'
    && (cuenta(ES[k], /<\/?[a-zA-Z][^>]*>/g) !== cuenta(v, /<\/?[a-zA-Z][^>]*>/g) || cuenta(ES[k], /\*\*|__|\]\(/g) !== cuenta(v, /\*\*|__|\]\(/g)));
  check('52) ni HTML ni markdown roto', marcado.length === 0, marcado.slice(0, 4).map(([k]) => k).join(' ') || 'intacto');
  const saltos = TR.filter(([k, v]) => {
    const ref = k.endsWith('_one') && ES[k.replace(/_one$/, '_other')] !== undefined ? ES[k.replace(/_one$/, '_other')] : ES[k];
    return typeof ref === 'string' && cuenta(ref, /\n/g) !== cuenta(v, /\n/g);
  });
  check('53) los mismos saltos de línea que el español', saltos.length === 0, saltos.slice(0, 4).map(([k]) => k).join(' ') || 'iguales');

  /*
   * LA MISMA FRASE ESPAÑOLA SE DICE IGUAL EN TODA LA APP. Cuando el contexto
   * pide otra cosa —un botón y un estado, la luz y el movimiento—, la clave va
   * en `DISTINTAS_A_PROPOSITO` con su porqué; si no, es una inconsistencia.
   */
  const DISTINTAS_A_PROPOSITO = new Set([
    /* «Personas» como estilo de avatar son personas; en el Chef, «Personas» es cuántos comen. */
    'avatar.stylePeople',
    /* «Subir»/«Bajar» en Filmmaker reordenan escenas y planos (Yukarı/Aşağı taşı); en Studio son la grúa de la cámara (Yükselme/Alçalma). */
    'filmmaker.moveUp', 'filmmaker.moveDown',
    /* «Voz» en Filmmaker es la pista del narrador dentro del bloque «Ses»: «Seslendirme», para no tener «Ses» dentro de «Ses». */
    'filmmaker.audioVoice',
    /* «Medio»: el largo del pelo (Orta boy), no un nivel (Orta). */
    'aiAvatar.hairMedium',
    /* «Listo»: el botón es «Bitti»; el título de un aviso, «Tamamlandı»; el estado de una creación, «Hazır» (glosario § 10.6). */
    'aiAvatar.doneTitle', 'creaciones.statusReady',
    /* «Publicaciones» y «Reseñas» bajo una cifra del perfil van en singular, como en Instagram: «12 Gönderi», «4 Değerlendirme». */
    'profile.posts', 'weebiz.reviews',
    /* «Materiales»: la partida de coste de un precio (Malzeme), no las opciones de material de Weë Design (Malzemeler). */
    'business.pricingMaterials',
    /* «Logo»: el campo del logo del negocio en su ficha (İşletme logosu). */
    'weebiz.logo',
    /* «Servicios»: el gasto de luz, agua e internet (Faturalar), no la categoría de negocios de servicios (Hizmetler). */
    'business.expenseServices',
    /* «Todo»: todos los valores nutricionales (Tüm değerler), no el filtro «Tümü». */
    'chef.nuAll',
    /* «Media»: la pestaña de fotos y vídeos del perfil (Medya), no la dificultad media de Chef (Orta zorluk). */
    'profile.tabMedia',
    /* «No disponible»: un producto que no hay (Mevcut değil), no una función que no se puede usar (Kullanılamıyor). */
    'weebiz.notAvailable',
    /* «Publicar» una creación: «Weë'de paylaş», porque en esa pantalla «Paylaş» a secas es compartir fuera. */
    'creaciones.publish',
    /* «Natural» y «Suave»: la luz (Doğal ışık, Yumuşak ışık) y el movimiento (Doğal, Akıcı) no son la calma (Sakin). */
    'studio.smNatural', 'studio.ltSoft', 'studio.smSmooth',
    /* «Normal»: el objetivo estándar (Standart), no la velocidad normal (Orta). */
    'studio.lnsStandard',
    /* «Seguir»: seguir a un negocio (Takip et), no el movimiento de cámara que va detrás del sujeto (Takip). */
    'weebiz.follow',
  ]);
  const porFrase = new Map();
  for (const [k, v] of TR) {
    const e = ES[k];
    if (typeof e !== 'string' || /_one$/.test(k) || DISTINTAS_A_PROPOSITO.has(k)) continue;
    if (!porFrase.has(e)) porFrase.set(e, new Map());
    const m = porFrase.get(e);
    m.set(v, [...(m.get(v) || []), k]);
  }
  const inconsistentes = [...porFrase].filter(([, m]) => m.size > 1);
  check('54) la misma frase española se dice igual en toda la app, salvo excepciones con su porqué', inconsistentes.length === 0,
    inconsistentes.slice(0, 4).map(([e, m]) => `«${e.slice(0, 20)}» → ${[...m].map(([v, ks]) => `«${v.slice(0, 16)}» (${ks[0]})`).join(' / ')}`).join(' | ') || 'coherente');
  /* Y los rótulos que se ven en toda la app dicen siempre lo del glosario. */
  const ROTULOS = [['Guardar', 'Kaydet'], ['Cancelar', 'İptal'], ['Eliminar', 'Sil'], ['Compartir', 'Paylaş'], ['Editar', 'Düzenle'],
    ['Configuración', 'Ayarlar'], ['Notificaciones', 'Bildirimler'], ['Buscar', 'Ara'], ['Cerrar', 'Kapat'], ['Atrás', 'Geri']];
  const rotulosMal = TR.filter(([k, v]) => ROTULOS.some(([e, t]) => ES[k] === e && v !== t));
  check('55) los rótulos comunes dicen siempre lo del glosario', rotulosMal.length === 0,
    rotulosMal.slice(0, 5).map(([k, v]) => `${k}: «${ES[k]}» → «${v}»`).join(' | ') || `${ROTULOS.length} rótulos`);
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
