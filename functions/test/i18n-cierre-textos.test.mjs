/**
 * CIERRE DE TEXTOS: LO QUE LA INTERFAZ DICE TIENE QUE SER VERDAD, ESTAR EN SU IDIOMA Y EN SU REGISTRO.
 *
 *   node test/i18n-cierre-textos.test.mjs
 *
 * Cuatro defectos que ninguna suite veía, cada uno con su guarda:
 *
 *  A · La ubicación prometía «contenido y experiencias cerca de ti», que Weë no tiene. Hoy sirve para UNA cosa:
 *      sugerir lugares cercanos y tu zona cuando agregas una ubicación a una publicación (AgregarUbicacionScreen), lo
 *      mismo que dice el permiso del sistema (app.json). En los 16 idiomas.
 *  B · Dos errores del cliente se pintaban con su `message` español: el de una pareja de ËContact que no vale
 *      (utils/econtactModel.ts) y el de votar sin conexión (services/firestoreService.ts#voteInPollById). Ahora
 *      llevan su CLAVE y se dicen en el idioma de quien mira, también en los 14 que no son español ni inglés.
 *  C · El ruso trata de «вы»; el módulo de Mis creaciones mezclaba «ты».
 *  D · En portugués, «Weë AI» (y «Weë») es masculino: «o Weë AI». Había textos en femenino.
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

const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const transpilar = (fuente) => ts.transpileModule(fuente, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const rutaDe = (base) => (fs.existsSync(path.resolve(raiz, base + '.ts')) ? base + '.ts' : base + '/index.ts');
const cargados = new Map();
const cargar = async (ruta) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  let js = transpilar(leer(ruta));
  const carpeta = path.posix.dirname(ruta.split(path.sep).join('/'));
  for (const [, rel] of js.matchAll(/from ['"](\.[^'"]*)['"]/g)) {
    const url = (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, rel))))).url;
    js = js.split(`from '${rel}'`).join(`from '${url}'`).split(`from "${rel}"`).join(`from "${url}"`);
  }
  const r = { url: comoModulo(js), ns: await import(comoModulo(js)) };
  cargados.set(ruta, r);
  return r;
};

const { crearTraductor } = (await cargar('i18n/traducir.ts')).ns;
const { DICCIONARIOS } = (await cargar('i18n/diccionarios.ts')).ns;
const servidor = (await cargar('i18n/servidor.ts')).ns;
const UNICOS = [];
for (const [codigo, d] of Object.entries(DICCIONARIOS)) if (!UNICOS.some(([, otro]) => otro === d)) UNICOS.push([codigo, d]);
const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' && v ? aplanar(v, pre + k + '.') : [[pre + k, String(v)]]));
const PLANO = new Map(UNICOS.map(([c, d]) => [c, Object.fromEntries(aplanar(d))]));
const valor = (codigo, clave) => PLANO.get(codigo)[clave];
const LOCALE = { es: 'es-PE', en: 'en-US', de: 'de-DE', fr: 'fr-FR', it: 'it-IT', pt: 'pt-BR', 'pt-PT': 'pt-PT', ru: 'ru-RU', ko: 'ko-KR', zh: 'zh-CN', 'zh-TW': 'zh-TW', ja: 'ja-JP', tr: 'tr-TR', sv: 'sv-SE', da: 'da-DK', hi: 'hi-IN' };

check('0) los 16 diccionarios de la app', UNICOS.length === 16 && UNICOS.every(([c]) => c in LOCALE), UNICOS.map(([c]) => c).join(' '));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── A · La ubicación dice lo que hace, y nada más ──');
// ═════════════════════════════════════════════════════════════════════════════
{
  /*
   * LA PROMESA RETIRADA, en cada idioma, tal como la decía el texto anterior. No vuelve en ninguna clave: si un día
   * Weë enseña contenido cercano, se escribe un texto nuevo para esa función, no se resucita este.
   */
  const RETIRADA = {
    es: 'contenido y experiencias cerca de ti', en: 'content and experiences near you', de: 'Inhalte und Erlebnisse in deiner Nähe',
    fr: 'des contenus et des expériences près de toi', it: 'contenuti ed esperienze vicino a te', pt: 'conteúdos e experiências perto de você',
    'pt-PT': 'conteúdos e experiências perto de ti', ru: 'контент и возможности рядом с вами', ko: '가까운 콘텐츠와 경험',
    zh: '附近的内容和体验', 'zh-TW': '附近的內容和體驗', ja: '近くのコンテンツや体験', tr: 'Yakınındaki içerikleri ve deneyimleri',
    sv: 'innehåll och upplevelser nära dig', da: 'indhold og oplevelser i nærheden', hi: 'आस-पास का कॉन्टेंट और अनुभव',
  };
  const vuelve = [];
  for (const [codigo] of UNICOS) {
    for (const [clave, v] of Object.entries(PLANO.get(codigo))) if (v.includes(RETIRADA[codigo])) vuelve.push(`${codigo}:${clave}`);
  }
  check('1) la promesa de «contenido y experiencias cerca» no está en ningún texto de ningún idioma', vuelve.length === 0, vuelve.join(' ') || '16 idiomas');
  const sinTexto = UNICOS.filter(([c]) => !valor(c, 'settings.locationOff')?.trim()).map(([c]) => c);
  check('2) settings.locationOff existe en los 16', sinTexto.length === 0, sinTexto.join(' '));
  check('3) en español dice lo que hace: lugares cercanos y tu zona al agregar una ubicación a una publicación',
    /sugerirte lugares cercanos y tu zona cuando agregas una ubicación a una publicación\./.test(valor('es', 'settings.locationOff'))
    && /Tu ubicación exacta nunca se muestra públicamente\.$/.test(valor('es', 'settings.locationOff')));
  check('3) y en inglés, lo mismo', /suggest nearby places and your area when you add a location to a post\./.test(valor('en', 'settings.locationOff')));
  /* Lo mismo que el permiso que enseña el sistema operativo. */
  const permiso = JSON.parse(leer('app.json')).expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-location')?.[1]?.locationWhenInUsePermission || '';
  check('4) y lo mismo que el permiso del sistema (app.json)', /sugerirte lugares cercanos y tu zona cuando agregas una ubicación a una publicación/.test(permiso), permiso);
  /*
   * LA FUNCIÓN ES ESA Y NO OTRA. La ubicación solo la leen Configuración (el interruptor) y Agregar ubicación. Si
   * mañana otra pantalla la usa —un feed cercano, Weë Travel—, esta comprobación falla para que alguien vuelva a
   * mirar el texto del interruptor, que hoy no puede prometer eso.
   */
  const lista = (dir) => fs.readdirSync(path.resolve(raiz, dir), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? lista(`${dir}/${e.name}`) : /\.tsx?$/.test(e.name) ? [`${dir}/${e.name}`] : []));
  const usan = ['screens', 'components', 'hooks', 'navigation', 'services', 'utils']
    .flatMap(lista).filter((f) => /\buseLocation\(\)/.test(sinComentarios(leer(f)))).sort();
  check('5) la ubicación solo la usan Configuración y Agregar ubicación (si cambia, se revisa el texto)',
    JSON.stringify(usan) === JSON.stringify(['screens/AgregarUbicacionScreen.tsx', 'screens/SettingsScreen.tsx']), usan.join(' · '));
  check('5) y Agregar ubicación la usa para ordenar lugares por cercanía y la zona de la publicación',
    /lugaresCercanos/.test(leer('screens/AgregarUbicacionScreen.tsx')) && /setUbicacion\(aPublica\(/.test(leer('screens/AgregarUbicacionScreen.tsx')));
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Los errores del cliente llevan su clave y se dicen en el idioma de quien mira ──');
// ═════════════════════════════════════════════════════════════════════════════
{
  /* El modelo se ejecuta SUELTO, como en econtact.test.mjs: sin imports, o no se podría. */
  const fuenteModelo = leer('utils/econtactModel.ts');
  const modelo = await import(comoModulo(transpilar(fuenteModelo)));
  check('6) el modelo de ËContact sigue sin importar nada', !/^import /m.test(fuenteModelo));
  const lanza = (f) => { try { f(); return null; } catch (e) { return e; } };
  const mismo = lanza(() => modelo.idDeContacto('uidAna', 'uidAna'));
  const noPersona = lanza(() => modelo.idDeContacto('uidAna', 'biz_n1'));
  const solicitud = lanza(() => modelo.nuevaSolicitud('hidi_uidAna', 'hidi_uidAna', () => 'T'));
  check('7) conectar un perfil consigo mismo lanza un error CON CLAVE', mismo instanceof modelo.ErrorDeEContact && mismo.clave === 'econtact.errSameProfile', mismo?.clave);
  check('7) también al fabricar la solicitud', solicitud instanceof modelo.ErrorDeEContact && solicitud.clave === 'econtact.errSameProfile');
  check('7) y una identidad que no es de persona, la clave de siempre', noPersona instanceof modelo.ErrorDeEContact && noPersona.clave === 'econtact.errNotAPerson');
  check('7) una pareja válida sigue dando su id', modelo.idDeContacto('uidBeto', 'uidAna') === 'uidAna_uidBeto');
  check('8) ni el modelo ni el voto lanzan ya una frase escrita a mano',
    !/throw new Error\('[^']*\s[^']*'\)/.test(sinComentarios(fuenteModelo))
    && /throw new ErrorConClave\('wall\.pollVoteOffline', /.test(leer('services/firestoreService.ts'))
    && !/voteInPollById[\s\S]{0,400}throw new Error\(/.test(sinComentarios(leer('services/firestoreService.ts'))));
  check('8) el servicio de ËContact usa la clase del modelo, sin otra propia',
    /\bErrorDeEContact,/.test(leer('services/econtactService.ts')) && !/class ErrorDeEContact/.test(leer('services/econtactService.ts')));

  /* Lo que ve cada idioma: el texto de SU diccionario, nunca la frase española del `message`. */
  const voto = new servidor.ErrorConClave('wall.pollVoteOffline', 'No se pudo conectar con Weë para registrar tu voto.');
  const mal = [];
  for (const [codigo] of UNICOS) {
    const t = crearTraductor(LOCALE[codigo], DICCIONARIOS);
    const ctx = { t, locale: LOCALE[codigo] };
    for (const [error, clave] of [[voto, 'wall.pollVoteOffline'], [mismo, 'econtact.errSameProfile'], [noPersona, 'econtact.errNotAPerson']]) {
      const visto = servidor.mensajeDelServidor(error, ctx);
      if (!visto || visto !== valor(codigo, clave) || (codigo !== 'es' && visto === error.message)) mal.push(`${codigo} ${clave}: ${visto}`);
    }
  }
  check('9) en los 16 idiomas, el voto sin conexión y la pareja que no vale se leen con su clave', mal.length === 0, mal.slice(0, 4).join(' | ') || '16 × 3');
  check('9) las dos claves nuevas están en los 16 diccionarios, y ninguna vacía',
    UNICOS.every(([c]) => valor(c, 'wall.pollVoteOffline')?.trim() && valor(c, 'econtact.errSameProfile')?.trim()));
  /* CONTROLES: lo de antes sigue igual. */
  const tDe = crearTraductor('de-DE', DICCIONARIOS);
  const tEs = crearTraductor('es-PE', DICCIONARIOS);
  const tEn = crearTraductor('en-US', DICCIONARIOS);
  const desconocido = new Error('Algo que dijo el servidor y nadie tradujo.');
  check('10) CONTROL: un mensaje del servidor que no se reconoce no se enseña en alemán, y en español sí',
    servidor.mensajeDelServidor(desconocido, { t: tDe, locale: 'de-DE' }) === undefined
    && servidor.mensajeDelServidor(desconocido, { t: tEs, locale: 'es-PE' }) === desconocido.message);
  check('10) CONTROL: el que se reconoce se sigue traduciendo por su forma',
    servidor.mensajeDelServidor(new Error('Ya has votado en esta encuesta.'), { t: tEn, locale: 'en-US' }) === valor('en', 'social.encYaVotaste'));
  check('11) SABOTAJE: una clave que no existe no sale como clave: sale nada',
    servidor.mensajeDelServidor(new servidor.ErrorConClave('wall.noExiste', 'x'), { t: tDe, locale: 'de-DE' }) === undefined);
  check('11) SABOTAJE: un error SIN clave con esa misma frase en español no se enseña en alemán (era lo de antes)',
    servidor.mensajeDelServidor(new Error(voto.message), { t: tDe, locale: 'de-DE' }) === undefined);
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── C · El ruso trata de «вы» ──');
// ═════════════════════════════════════════════════════════════════════════════
{
  const RU = PLANO.get('ru');
  /* Lo que no es la interfaz hablándole a la persona, con su porqué. */
  const NO_ES_LA_INTERFAZ = {
    'catalogo.musicEj5Title': 'título de una canción de ejemplo («Luz en ti»): es una obra, no la app hablando',
  };
  const TY = /(?<![\p{L}])(ты|тебя|тебе|тобой|тобою|твой|твоя|твоё|твое|твои|твоего|твоей|твоих|твоим|твоему|твоими|твою)(?![\p{L}])/iu;
  const conTy = Object.entries(RU).filter(([k, v]) => TY.test(v) && !NO_ES_LA_INTERFAZ[k]).map(([k]) => k);
  check('12) ningún texto ruso tutea a la persona', conTy.length === 0, conTy.join(' ') || `${Object.keys(RU).length} textos`);
  /*
   * Imperativos en singular: una palabra cuyo plural de cortesía (+те) también está en el catálogo. La voz de la
   * persona hablándole a Weë sí va en singular, como se le habla a un asistente.
   */
  const VOZ_DE_LA_PERSONA = { 'business.helpMeGrow': '«Ayúdame a crecer»: lo que la persona le pide a Weë' };
  const palabras = new Set(Object.values(RU).join(' ').match(/\p{L}+/gu));
  const imperativos = Object.entries(RU).filter(([k]) => !VOZ_DE_LA_PERSONA[k] && !NO_ES_LA_INTERFAZ[k]).flatMap(([k, v]) =>
    [...v.matchAll(/(?<![\p{L}])(\p{L}+?[йиь])(ся|сь)?(?![\p{L}])/gu)]
      .filter((m) => [m[1] + 'те' + (m[2] ? 'сь' : ''), m[1] + 'те' + (m[2] ? 'ся' : '')].some((p) => palabras.has(p) || palabras.has(p.toLowerCase())
        || palabras.has(p.charAt(0).toUpperCase() + p.slice(1))))
      .map((m) => `${k}: ${m[0]}`));
  check('13) ni imperativos en singular dirigidos a la persona', imperativos.length === 0, imperativos.slice(0, 5).join(' | ') || 'ninguno');
  const creaciones = Object.entries(RU).filter(([k]) => k.startsWith('creaciones.'));
  check('14) Mis creaciones, entero en «вы» y sin «(а)» para la persona',
    creaciones.length > 40 && creaciones.every(([, v]) => !TY.test(v) && !/\(а\)/.test(v)) && /вы /.test(RU['creaciones.intro']));
  check('14) CONTROL: el detector ve un «ты» y no lo confunde con una palabra que empieza igual', TY.test('Всё, что ты создал') && !TY.test('Тыква'));
  /*
   * LA MISMA PANTALLA, CON EL MISMO NOMBRE. «Mis creaciones» se abre desde el menú (creaciones.title) y desde Weë AI
   * (weeai.myCreations). En ruso se llamaba «Мои творения» en un sitio y «Мои работы» en el otro; el catálogo dice
   * «работы» (también en projects y en los avisos de Filmmaker).
   */
  const distinto = UNICOS.filter(([c]) => valor(c, 'creaciones.title') !== valor(c, 'weeai.myCreations'))
    .map(([c]) => `${c}: «${valor(c, 'creaciones.title')}» ≠ «${valor(c, 'weeai.myCreations')}»`);
  check('14b) «Mis creaciones» se llama igual en el menú y en Weë AI, en los 16 idiomas', distinto.length === 0, distinto.join(' | ') || '16');
  check('14b) y en ruso ningún texto dice ya «творения»', !Object.values(RU).some((v) => /творени/i.test(v)));
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── D · En portugués, «o Weë AI» ──');
// ═════════════════════════════════════════════════════════════════════════════
{
  /*
   * La concordancia que domina el catálogo es la masculina («o Weë», «o Weë AI», «no Weë AI»), y es la que queda.
   * Tampoco queda la preposición sin artículo («Peça a Weë»): en Brasil se lee como un femenino al que le falta la
   * crase, así que se escribe «ao Weë», como ya decía la Ayuda («Conte ao Weë»).
   */
  const FEMENINO = /(?<![\p{L}])(?:[Aa]|da|na|à|pela|uma) Weë(?![\p{L}])/u;
  const MASCULINO = /(?<![\p{L}])(?:[Oo]|[Dd]o|[Nn]o|[Aa]o|[Pp]elo) Weë AI(?![\p{L}])/gu;
  for (const codigo of ['pt', 'pt-PT']) {
    const textos = Object.entries(PLANO.get(codigo));
    const fem = textos.filter(([, v]) => FEMENINO.test(v)).map(([k, v]) => `${k}: «${v.match(FEMENINO)[0]}»`);
    const masc = textos.reduce((n, [, v]) => n + (v.match(MASCULINO) || []).length, 0);
    check(`15) ${codigo}: «Weë AI» y «Weë» sin artículo femenino`, fem.length === 0, fem.slice(0, 4).join(' | ') || `${masc} en masculino`);
    check(`15) ${codigo}: y en masculino donde lleva artículo`, masc >= 10, String(masc));
  }
  check('15) CONTROL: el detector ve «na Weë AI» y «Peça a Weë», y deja pasar «ao Weë»',
    FEMENINO.test('Criado com Ana na Weë AI') && FEMENINO.test('Peça a Weë que melhore') && !FEMENINO.test('Peça ao Weë que melhore'));
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── Z · Mis creaciones: un solo nombre y su plural de verdad (cierre) ──');
// ═════════════════════════════════════════════════════════════════════════════
{
  /*
   * La MISMA pantalla tiene tres puertas —el menú de Weë AI (`weeai.myCreations`), la de Weë Studio
   * (`studio.creationsTitle`) y su propio título (`creaciones.title`)— y en español las tres dicen «Mis creaciones».
   * En ko, zh y zh-TW la de Studio decía otra cosa (작업물 / 创作 frente a 창작물 / 作品): una persona veía dos nombres
   * para un mismo sitio. En cada idioma, las tres iguales.
   */
  const distintos = UNICOS.filter(([c]) => new Set([valor(c, 'weeai.myCreations'), valor(c, 'studio.creationsTitle'), valor(c, 'creaciones.title')]).size !== 1)
    .map(([c]) => `${c}: ${valor(c, 'weeai.myCreations')} | ${valor(c, 'studio.creationsTitle')} | ${valor(c, 'creaciones.title')}`);
  check('Z1) DENTRO de cada idioma, las tres puertas de la pantalla usan el mismo nombre (el de ese idioma)', distintos.length === 0, distintos.join(' · '));
  /*
   * Y ese nombre SE TRADUCE: la misma clave en todos los idiomas, y cada uno dice el suyo con el idioma activo.
   * «Mis creaciones» es solo el texto español; ningún otro idioma puede quedarse con él.
   */
  const enEspanol = UNICOS.filter(([c]) => c !== 'es' && ['weeai.myCreations', 'studio.creationsTitle', 'creaciones.title'].some((k) => valor(c, k) === 'Mis creaciones'))
    .map(([c]) => c);
  check('Z1b) ningún idioma que no sea el español dice «Mis creaciones»: cada uno muestra su traducción', enEspanol.length === 0, enEspanol.join(' '));
  const conIdiomaActivo = Object.fromEntries(['es', 'en', 'fr', 'pt', 'de'].map((c) => [c, crearTraductor(LOCALE[c], DICCIONARIOS)('creaciones.title')]));
  check('Z1c) con el idioma activo, el traductor de la app pinta la traducción de esa misma clave',
    conIdiomaActivo.es === 'Mis creaciones' && conIdiomaActivo.en === 'My creations' && conIdiomaActivo.fr === 'Mes créations'
    && conIdiomaActivo.pt === 'Minhas criações' && conIdiomaActivo.de === 'Meine Kreationen', JSON.stringify(conIdiomaActivo));
  /* Lo que se pinta sale de la clave, nunca de un texto fijo: el menú, la barra lateral de Weë AI y la propia pantalla. */
  const pintanLaClave = [
    ['components/creator/CreatorSidebar.tsx', /t\('creaciones\.title'\)/],
    ['screens/MisCreacionesScreen.tsx', /title=\{`🖼️ \$\{t\('creaciones\.title'\)\}`\}/],
    ['constants/weeMenu.ts', /creations: \{ id: 'creations', icono: 'galeria', clave: 'creaciones\.title'/],
    ['components/creator/FilaDeCreaciones.tsx', /t\('studio\.creationsTitle'\)/],
    ['screens/WeeCreatorScreen.tsx', /t\('weeai\.myCreations'\)/],
  ].filter(([f, re]) => !re.test(sinComentarios(leer(f)))).map(([f]) => f);
  check('Z1d) cada sitio que lo enseña lo pide por su clave con t()', pintanLaClave.length === 0, pintanLaClave.join(' '));
  const fijo = ['components/DrawerMenu.tsx', 'components/Sidebar.tsx', 'components/creator/CreatorSidebar.tsx', 'screens/MisCreacionesScreen.tsx',
    'screens/WeeCreatorScreen.tsx', 'screens/SpecialistScreen.tsx', 'components/creator/FilaDeCreaciones.tsx', 'navigation/MainStackNavigator.tsx']
    /* Los `console.*` son registro para quien desarrolla, no interfaz: se quitan antes de mirar. */
    .filter((f) => /['"`>][^'"`<>\n]*Mis creaciones[^'"`<>\n]*['"`<]|MENU_ITEM\.creations\.label/
      .test(sinComentarios(leer(f)).replace(/console\.(?:log|warn|error|info|debug)\([^\n]*/g, '')));
  check('Z1e) y ninguno lo pinta fijo en español', fijo.length === 0, fijo.join(' '));
  /*
   * El contador lo resuelve el traductor con `{ contador }` (Intl.PluralRules): elegir `_one`/`_other` a mano con
   * `=== 1` dejaba sin usar el `_few`/`_many` del ruso («5 работы» en vez de «5 работ»).
   */
  const pantalla = sinComentarios(leer('screens/MisCreacionesScreen.tsx'));
  check('Z2) la pantalla pide creaciones.count con { contador } y no elige la variante a mano',
    /t\('creaciones\.count', \{ contador: estado\.items\.length \}\)/.test(pantalla) && !/creaciones\.count_(one|other|few|many)/.test(pantalla));
  const ru = crearTraductor('ru-RU', DICCIONARIOS);
  check('Z3) y en ruso 1 / 3 / 5 / 21 salen con su forma', [1, 3, 5, 21].map((n) => ru('creaciones.count', { contador: n })).join(' · ')
    === ['1 работа', '3 работы', '5 работ', '21 работа'].join(' · '), [1, 3, 5, 21].map((n) => ru('creaciones.count', { contador: n })).join(' · '));
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
