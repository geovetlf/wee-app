/*
 * EL IDIOMA ES DE LA PERSONA, NO DEL TELÉFONO.
 *
 * Weë ya sabía resolver el idioma —`i18n/resolver.ts` lo hacía desde el primer
 * día— y ya tenía dónde guardarlo en el aparato. Lo que faltaba era que esa
 * elección PERTENECIERA A LA CUENTA: que se pregunte al registrarse y que
 * quien entra desde otro aparato se encuentre Weë como la dejó.
 *
 * ── Qué vigila este archivo, y por qué cada cosa ────────────────────────────
 *
 * Hay dos clases de comprobación aquí y conviene no confundirlas:
 *
 *   · Las que EJECUTAN el código —la prioridad, las variantes, el respaldo—.
 *     Esas prueban comportamiento de verdad: entra un caso, sale un idioma.
 *
 *   · Las que LEEN EL CÓDIGO FUENTE —el registro pregunta, el puente escribe
 *     en el perfil real, Configuración enseña la variante—. Esas no prueban
 *     que la pantalla se pinte: prueban que el CABLEADO siga ahí. Son una red
 *     contra el borrado accidental, no un sustituto de abrir la app.
 *
 * ── La regla que protege todo lo demás ──────────────────────────────────────
 *
 * La prioridad del §5, y se comprueba ejecutándola:
 *
 *     1. lo que la persona acaba de elegir
 *     2. lo que tenía guardado
 *     3. lo que pide el aparato
 *     4. inglés
 *
 * El punto 3 por debajo del 2 es el que de verdad importa: un teléfono que
 * cambia de idioma —o una cuenta que se abre en el ordenador de otro— NO puede
 * reemplazar lo que alguien eligió a mano.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* El mismo cargador diminuto que el resto de las pruebas de i18n. */
const ts = require('typescript');
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (base) => (fs.existsSync(path.resolve(RAIZ, base + '.ts')) ? base + '.ts' : base + '/index.ts');
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
const diccionarios = (await cargar('i18n/diccionarios.ts')).ns;

const DISPONIBLES = diccionarios.idiomasConDiccionario();
const elegir = (elegido, delAparato) => resolver.elegirIdioma(elegido, delAparato, DISPONIBLES);
const t = (locale) => traducir.crearTraductor(locale, diccionarios.DICCIONARIOS);

console.log('\n── A · Detección inicial: qué idioma sale de fábrica ──');
{
  /*
   * Sin nada elegido, manda el aparato. Es el caso de quien abre Weë por
   * primera vez, y también el de quien ya tenía cuenta y nunca tocó el idioma.
   */
  const brasil = elegir(null, ['pt-BR', 'pt', 'en']);
  check('1) sin nada guardado, manda lo que pide el aparato',
    brasil.idioma === 'pt' && brasil.origen === 'aparato', `${brasil.locale} · ${brasil.origen}`);

  const aleman = elegir(null, ['de-AT', 'de']);
  check('2) y respeta el orden de preferencia del navegador',
    aleman.idioma === 'de' && aleman.locale === 'de-AT', `${aleman.locale}`);

  /* Un idioma que Weë todavía no habla: se salta y sigue buscando. */
  const nordico = elegir(null, ['is-IS', 'fr-CA']);
  check('3) un idioma que Weë no habla no bloquea: sigue por la lista',
    nordico.idioma === 'fr', `${nordico.idioma}`);

  const perdido = elegir(null, ['is-IS']);
  check('4) y si no hay ninguno conocido, el respaldo es inglés',
    perdido.idioma === 'en' && perdido.origen === 'reserva', `${perdido.origen}`);
}

console.log('\n── B · La prioridad: lo elegido gana SIEMPRE ──');
{
  /*
   * EL CORAZÓN DE LA TAREA. Alguien eligió coreano; su teléfono sigue diciendo
   * alemán y su navegador sigue pidiendo alemán. Da igual las veces que se
   * pregunte al aparato: gana el coreano.
   */
  const suyo = elegir('ko', ['de-DE', 'de']);
  check('5) lo elegido a mano gana a lo que pide el aparato',
    suyo.idioma === 'ko' && suyo.origen === 'elegido', `${suyo.idioma} · ${suyo.origen}`);

  /* Y el aparato puede cambiar mañana: la elección sigue en pie. */
  const despues = elegir('ko', ['fr-FR', 'it-IT', 'en-US']);
  check('6) un aparato que cambia de idioma NO reemplaza la elección',
    despues.idioma === 'ko' && despues.origen === 'elegido', `${despues.idioma}`);

  /*
   * Al revés también tiene que fallar: si lo guardado ya no es un idioma que
   * Weë hable —porque se retiró—, no se queda colgado; vuelve al aparato.
   */
  const retirado = elegir('is', ['it-IT']);
  check('7) un idioma guardado que ya no existe cae al aparato, no al vacío',
    retirado.idioma === 'it' && retirado.origen === 'aparato', `${retirado.idioma}`);

  /*
   * Y el orden completo del §5 en una línea: elegido > guardado > aparato >
   * inglés. Los dos primeros son el mismo campo en momentos distintos, así que
   * lo que se comprueba es que ninguno de los dos pierda contra el aparato.
   */
  check('8) sin elección, el aparato; con elección, la elección',
    elegir(null, ['ru-RU']).origen === 'aparato' && elegir('ru', ['en-US']).origen === 'elegido');
}

console.log('\n── C · Las variantes NO se colapsan en un solo locale ──');
{
  /*
   * Lo que se guarda es un LOCALE COMPLETO, y aquí está el motivo: si la
   * preferencia fuera solo el idioma —'pt', 'zh'— estas cuatro filas serían
   * dos y media Weë hablaría la norma equivocada a medio mundo.
   */
  const sondaPT = 'settings.title';
  const br = t('pt-BR')(sondaPT);
  const pt = t('pt-PT')(sondaPT);
  check('9) pt-BR y pt-PT dan diccionarios DISTINTOS',
    br !== pt && !!br && !!pt, `«${br}» vs «${pt}»`);
  check('10) pt-BR es el brasileño y pt-PT el europeo',
    br === 'Configurações' && pt === 'Definições', `${br} · ${pt}`);

  /* Sonda del chino: 保存 en el continente y 儲存 en Taiwán. Es una diferencia
   * de PALABRA, no de trazo, así que un conversor mecánico no la produce. */
  const sondaZH = 'common.save';
  const cn = t('zh-CN')(sondaZH);
  const tw = t('zh-TW')(sondaZH);
  check('11) zh-CN y zh-TW dan diccionarios DISTINTOS',
    cn !== tw && !!cn && !!tw, `«${cn}» vs «${tw}»`);

  /*
   * Y los alias que de verdad dicen los aparatos. Un teléfono portugués dice
   * `pt-PT`, pero uno angoleño dice `pt-AO` y uno taiwanés `zh-Hant-TW`. Si la
   * preferencia guardada trae uno de esos, tiene que caer donde debe.
   */
  const europeos = ['pt-PT', 'pt-AO', 'pt-MZ', 'pt-CV', 'pt-GW', 'pt-ST', 'pt-TL', 'pt-MO'];
  const malEuropeos = europeos.filter((l) => t(l)(sondaPT) !== pt);
  check('12) los ocho locales europeos guardados sirven portugués de Portugal',
    malEuropeos.length === 0, malEuropeos.join(' ') || europeos.join(' '));

  const tradicionales = ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-TW'];
  const malTrad = tradicionales.filter((l) => t(l)(sondaZH) !== tw);
  check('13) y los del chino tradicional sirven 繁體',
    malTrad.length === 0, malTrad.join(' ') || tradicionales.join(' '));

  check('14) mientras `pt` y `zh` a secas siguen siendo la norma base',
    t('pt')(sondaPT) === br && t('zh')(sondaZH) === cn);

  /*
   * Y que el SELECTOR las ofrezca por separado: de nada sirve que el motor
   * sepa distinguirlas si en la lista solo aparece una fila.
   */
  const claves = idiomas.filasDeIdioma().map((f) => f.clave);
  const faltan = ['pt-BR', 'pt-PT', 'zh-CN', 'zh-TW'].filter((c) => !claves.includes(c));
  check('15) el selector ofrece las cuatro variantes como filas propias',
    faltan.length === 0, faltan.join(' ') || claves.join(' '));

  /* Cada una con su nombre, o la lista no sirve para elegir. */
  const nombres = idiomas.filasDeIdioma().filter((f) => ['pt-BR', 'pt-PT', 'zh-CN', 'zh-TW'].includes(f.clave));
  check('16) y cada variante se llama distinto de su hermana',
    new Set(nombres.map((n) => n.nombreNativo)).size === 4,
    nombres.map((n) => n.nombreNativo).join(' · '));

  /* Que el locale guardado sepa decir de qué variante es. Es lo que usan el
   * registro y Configuración para marcar la fila y escribir el subtítulo. */
  check('17) un locale guardado sabe a qué variante pertenece',
    idiomas.varianteDelLocale('pt-AO')?.locale === 'pt-PT'
    && idiomas.varianteDelLocale('zh-Hant-TW')?.locale === 'zh-TW'
    && idiomas.varianteDelLocale('de-DE') === undefined);
}

console.log('\n── D · Dónde vive la preferencia ──');
{
  const perfil = leer('services/firestoreService.ts');
  check('18) el perfil del usuario tiene campo de idioma, y es opcional',
    /language\?: string;/.test(perfil), 'UserProfile.language?');

  /*
   * OPCIONAL NO ES UN DETALLE DE TIPOS: es la regla de los usuarios que ya
   * existen. Que falte significa "nunca eligió", y entonces manda su aparato.
   * Si algún día se pone obligatorio, habría que rellenar a todo el mundo.
   */
  check('19) y el comentario dice que faltar SIGNIFICA algo',
    /nunca eligi/i.test(perfil) && /language\?: string/.test(perfil));

  const preferencia = leer('i18n/preferencia.ts');
  check('20) la copia del aparato sigue existiendo y guarda un locale entero',
    /AsyncStorage\.setItem/.test(preferencia) && /guardarIdiomaElegido/.test(preferencia));

  /*
   * NO SE MONTA UN SEGUNDO SISTEMA. La tarea lo pedía y es fácil incumplirlo
   * sin querer: basta con que alguien guarde el idioma por su cuenta en otra
   * clave. Solo puede haber UN sitio que escriba una preferencia de idioma en
   * el almacenamiento del aparato.
   *
   * OJO CON LO QUE SE MIDE. La primera versión de esto buscaba «AsyncStorage» a
   * secas en cada archivo y señalaba dos inocentes: `IdiomaContext`, que lo
   * NOMBRA en un comentario para decir que las pantallas no lo usan, y
   * `SettingsScreen`, que guarda otra preferencia que no tiene nada que ver.
   * Lo que hay que buscar no es la librería: es una CLAVE DE IDIOMA guardada
   * fuera de su sitio.
   */
  const carpetas = ['contexts', 'screens', 'components', 'services', 'i18n', 'hooks', 'utils'];
  const archivos = [];
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) recorrer(rel);
      else if (/\.tsx?$/.test(e.name)) archivos.push(rel);
    }
  };
  carpetas.forEach(recorrer);

  /* Una clave de almacenamiento que hable de idioma: 'wee.idioma…', 'language…' */
  const CLAVE_DE_IDIOMA = /(?:get|set|remove)Item\(\s*['"`][^'"`]*(?:idioma|language|locale|lang)[^'"`]*['"`]/i;
  const intrusos = archivos.filter((f) => f !== 'i18n/preferencia.ts' && CLAVE_DE_IDIOMA.test(leer(f)));
  check('21) solo `i18n/preferencia.ts` guarda una preferencia de idioma',
    intrusos.length === 0, intrusos.join(' ') || `${archivos.length} archivos mirados`);

  /* CONTROL: que esta comprobación sepa encontrar uno. Si el patrón se rompiera
   * —y un patrón que nunca casa dice «limpio» sin haber mirado—, esto falla. */
  check('21b) control: el patrón reconoce una clave de idioma cuando la ve',
    CLAVE_DE_IDIOMA.test("AsyncStorage.getItem('wee.idioma.preferencia')")
    && CLAVE_DE_IDIOMA.test('localStorage.setItem("userLanguage", x)')
    && !CLAVE_DE_IDIOMA.test("AsyncStorage.getItem('wee.engineAdmin')"));
}

console.log('\n── E · El registro pregunta el idioma ──');
{
  const onboarding = leer('screens/OnboardingScreen.tsx');

  check('22) el registro ofrece la lista de idiomas',
    /filasDeIdioma\(\)/.test(onboarding) && /showLanguageModal/.test(onboarding));

  /*
   * NO DETECTA POR SU CUENTA. Ya lo hizo el proveedor al arrancar, y una
   * pantalla que vuelva a preguntarle al aparato es una segunda respuesta
   * esperando no coincidir con la primera.
   */
  check('23) y NO vuelve a detectar: usa el locale ya resuelto',
    /useIdioma\(\)/.test(onboarding) && !/localesDelAparato|navigator\.language/.test(onboarding));

  check('24) elegir en el registro cambia Weë en el acto',
    /cambiarIdioma\(item\.clave\)/.test(onboarding));

  /*
   * Y AL TERMINAR SE GUARDA EN LA CUENTA. Se guarda el LOCALE, no el idioma:
   * `language: idioma` dejaría 'pt' y perdería Portugal.
   */
  check('25) al completar el registro, el locale se guarda en el perfil',
    /language: locale,/.test(onboarding));
  check('26) y lo que se guarda es el locale, no el idioma a secas',
    !/language: idioma[,\s]/.test(onboarding));

  /* La fila marcada compara la variante: si comparara el idioma, con el
   * portugués puesto se marcarían Brasil y Portugal a la vez. */
  check('27) la marca de selección distingue las dos normas de un idioma',
    /varianteDelLocale\(locale\)/.test(onboarding));
}

console.log('\n── F · Configuración → Idioma ──');
{
  const ajustes = leer('screens/SettingsScreen.tsx');
  check('28) Configuración tiene fila de idioma y lleva a la pantalla',
    /t\('settings\.language'\)/.test(ajustes) && /navigate\('Idioma'\)/.test(ajustes));

  /*
   * Y ENSEÑA LA VARIANTE. Con portugués europeo puesto, un subtítulo que diga
   * «Português» es indistinguible del brasileño: la pantalla estaría mintiendo
   * a medias.
   */
  check('29) y el subtítulo dice la VARIANTE, no el idioma',
    /varianteDelLocale\(locale\)\?\.nombreNativo/.test(ajustes));

  const pantalla = leer('screens/IdiomaScreen.tsx');
  check('30) la pantalla de idioma sale de la misma lista que el registro',
    /filasDeIdioma\(\)/.test(pantalla));
  check('31) y cambiar allí aplica y guarda por el mismo camino',
    /cambiarIdioma\(fila\.clave\)/.test(pantalla));

  const contexto = leer('contexts/IdiomaContext.tsx');
  check('32) cambiar de idioma repinta en el acto y guarda después',
    /setResuelto\(nuevo\)/.test(contexto) && /guardarIdiomaElegido/.test(contexto));
  check('33) y no reinicia la app ni cierra la sesión para hacerlo',
    !/reload\(\)|Updates\.reloadAsync|signOut/.test(contexto));
}

console.log('\n── G · La cuenta y el aparato, cosidos ──');
{
  const puente = leer('components/SincronizarIdioma.tsx');

  check('34) existe el puente entre el perfil y el idioma',
    /useUserProfile\(\)/.test(puente) && /useIdioma\(\)/.test(puente));

  /* 1 · De la cuenta al aparato: entrar en otro dispositivo recupera lo suyo. */
  check('35) al entrar, el idioma del perfil se pone',
    /cambiarIdioma\(suyo\)/.test(puente) && /realProfile\?\.language/.test(puente));

  /*
   * 2 · Del aparato a la cuenta, PERO SOLO SI FUE UNA ELECCIÓN. Sin esta
   * guarda, abrir Weë en un teléfono prestado en alemán le escribiría alemán
   * a la cuenta de otro.
   */
  check('36) solo se escribe en la cuenta lo que se ELIGIÓ, no lo detectado',
    /origen !== 'elegido'/.test(puente));

  /*
   * Y SE ESCRIBE EN EL PERFIL REAL. `updateProfile` del contexto escribe en la
   * cara activa: usarlo dejaría el idioma dentro del Perfil Weë de quien lo
   * cambió estando ahí.
   */
  check('37) el idioma se guarda en el perfil real, no en la cara activa',
    /usersService\.update\(idDelPerfil, \{ language: locale \}\)/.test(puente)
    && !/updateProfile\(/.test(puente));

  /* Y está montado donde puede ver el perfil. */
  const app = leer('App.tsx');
  const dentro = app.indexOf('<SincronizarIdioma />');
  check('38) y está montado dentro del proveedor del perfil',
    dentro > app.indexOf('<UserProfileProvider>') && dentro < app.indexOf('</UserProfileProvider>'));
}

console.log('\n── H · Quien ya tenía cuenta no nota nada ──');
{
  /*
   * LA COMPROBACIÓN MÁS IMPORTANTE DE TODAS, porque el riesgo de esta tarea no
   * era no funcionar: era cambiarle el idioma a gente que no pidió nada.
   *
   * Un perfil sin `language` tiene que comportarse EXACTAMENTE como antes.
   */
  const sinNada = elegir(null, ['it-IT', 'it']);
  check('39) un usuario sin preferencia sigue con la detección de siempre',
    sinNada.idioma === 'it' && sinNada.origen === 'aparato', `${sinNada.idioma} · ${sinNada.origen}`);

  const puente = leer('components/SincronizarIdioma.tsx');
  check('40) y el puente se calla si el perfil no trae idioma',
    /if \(!suyo\) return;/.test(puente));

  /* No hay relleno masivo por detrás: nadie escribe `language` a un perfil que
   * no lo tenga salvo que su dueño elija o termine un registro. */
  const escrituras = ['components/SincronizarIdioma.tsx', 'screens/OnboardingScreen.tsx']
    .filter((f) => /language:/.test(leer(f)));
  check('41) solo dos sitios escriben el idioma: el registro y una elección',
    escrituras.length === 2, escrituras.join(' · '));

  /*
   * Y el respaldo por clave sigue intacto: aunque alguien tenga guardado un
   * locale raro, una clave que falte se busca en su idioma base y después en
   * inglés. Esto es lo que impide que una preferencia exótica deje pantallas
   * en blanco.
   */
  check('42) la cadena de respaldo de un locale guardado sigue siendo la de siempre',
    JSON.stringify(resolver.cadenaDeRespaldo('pt-AO')) === JSON.stringify(['pt-AO', 'pt', 'en']));
}

console.log('\n── I · El aparato nombra el idioma dos veces, y la segunda concreta ──');
{
  /*
   * `navigator.languages` encabeza muy a menudo con el idioma a secas y lo
   * concreta justo después: ['pt', 'pt-PT'], ['zh', 'zh-TW']. Quedarse con la
   * primera línea le servía BRASILEÑO a Portugal y SIMPLIFICADO a Taiwán —la
   * norma equivocada entera, no un texto peor—, y desde que el locale se
   * guarda en la cuenta esa pérdida se volvía permanente.
   *
   * Aquí se comprueban las dos mitades de la regla, y la segunda importa tanto
   * como la primera: CONCRETAR lo que el aparato pidió, y NO INVENTAR lo que
   * no pidió.
   */
  const delAparato = (lista) => elegir(null, lista);

  /* A–D · Los cuatro casos obligatorios, con el diccionario que acaban dando. */
  const A = delAparato(['pt', 'pt-PT']);
  check('43) A · ["pt","pt-PT"] → pt-PT, y sirve el europeo',
    A.locale === 'pt-PT' && t(A.locale)('settings.title') === 'Definições', A.locale);

  const B = delAparato(['pt', 'pt-BR']);
  check('44) B · ["pt","pt-BR"] → pt-BR, y sirve el brasileño',
    B.locale === 'pt-BR' && t(B.locale)('settings.title') === 'Configurações', B.locale);

  const C = delAparato(['zh', 'zh-TW']);
  check('45) C · ["zh","zh-TW"] → zh-TW, y sirve 繁體',
    C.locale === 'zh-TW' && t(C.locale)('common.save') === '儲存', C.locale);

  const D = delAparato(['zh', 'zh-CN']);
  check('46) D · ["zh","zh-CN"] → zh-CN, y sirve 简体',
    D.locale === 'zh-CN' && t(D.locale)('common.save') === '保存', D.locale);

  /*
   * E–F · LA OTRA MITAD, y la que evita que esto se convierta en otra cosa.
   * Un código a secas NO se asciende a una variante que nadie pidió: `pt` sigue
   * dando brasileño y `zh` simplificado, que es lo decidido y documentado.
   */
  const E = delAparato(['pt']);
  check('47) E · ["pt"] a secas sigue siendo pt → brasileño',
    E.locale === 'pt' && t(E.locale)('settings.title') === 'Configurações', E.locale);

  const F = delAparato(['zh']);
  check('48) F · ["zh"] a secas sigue siendo zh → 简体',
    F.locale === 'zh' && t(F.locale)('common.save') === '保存', F.locale);

  /*
   * G · La regla es genérica: no sabe qué idiomas tienen variantes declaradas
   * ni le hace falta. Con los alias que de verdad dicen los aparatos —Angola,
   * un Taiwán que se anuncia por escritura— y con un idioma de una sola norma,
   * donde lo único que afina es el locale de los FORMATOS.
   */
  const G1 = delAparato(['pt', 'pt-AO']);
  check('49) G · ["pt","pt-AO"] → pt-AO, y Angola recibe el europeo',
    G1.locale === 'pt-AO' && t(G1.locale)('settings.title') === 'Definições', G1.locale);

  const G2 = delAparato(['zh', 'zh-Hant-TW']);
  check('50) G · ["zh","zh-Hant-TW"] → zh-Hant-TW, y sirve 繁體',
    G2.locale === 'zh-Hant-TW' && t(G2.locale)('common.save') === '儲存', G2.locale);

  const G3 = delAparato(['es', 'es-ES', 'es-PE']);
  check('51) G · ["es","es-ES",…] → es-ES: el español no tiene normas, pero sí región',
    G3.locale === 'es-ES' && G3.idioma === 'es', G3.locale);

  /*
   * Y LOS CONTROLES DE QUE NO SE PASA DE LISTO. Son tres formas distintas de
   * estropear esto, y las tres tienen que seguir cerradas.
   */
  check('52) control · una variante explícita a la cabeza no la pisa nadie',
    delAparato(['pt-BR', 'pt-PT']).locale === 'pt-BR'
    && delAparato(['zh-TW', 'zh-CN']).locale === 'zh-TW');
  check('53) control · otro idioma NO concreta este',
    delAparato(['en', 'pt-PT']).locale === 'en'
    && delAparato(['pt', 'en-GB']).locale === 'pt');
  check('54) control · sin nada que concretar, todo sigue igual',
    delAparato(['de']).locale === 'de' && delAparato(['ru']).locale === 'ru');

  /* H · Lo que ya funcionaba con la región en la primera línea, sigue igual. */
  const ANTES = [
    [['pt-BR', 'pt', 'en'], 'pt-BR'],
    [['pt-PT', 'pt', 'en'], 'pt-PT'],
    [['zh-CN', 'zh'], 'zh-CN'],
    [['zh-TW', 'zh'], 'zh-TW'],
    [['pt-AO'], 'pt-AO'],
    [['zh-Hant-TW'], 'zh-Hant-TW'],
    [['de-AT', 'de'], 'de-AT'],
    [['es-PE'], 'es-PE'],
    [['it-IT', 'it'], 'it-IT'],
  ];
  const rotas = ANTES.filter(([lista, esperado]) => delAparato(lista).locale !== esperado);
  check('55) H · las preferencias regionales de antes dan lo mismo que antes',
    rotas.length === 0, rotas.map(([l]) => JSON.stringify(l)).join(' ') || `${ANTES.length} listas`);

  /* Y las prioridades generales, que esto no podía tocar. */
  check('56) H · la elección manual y el respaldo siguen mandando igual',
    elegir('ko', ['pt', 'pt-PT']).idioma === 'ko'
    && elegir('ko', ['pt', 'pt-PT']).origen === 'elegido'
    && delAparato(['is-IS']).origen === 'reserva');

  /*
   * I–J · LOS DICCIONARIOS NO SE HAN TOCADO. Este arreglo vive entero en
   * `resolver.ts`; si alguien hubiera "ayudado" cambiando una traducción para
   * que cuadrara, se vería aquí.
   */
  const claves = (idiomaODir) => {
    const dir = path.resolve(RAIZ, 'i18n/textos', idiomaODir);
    let n = 0;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.ts') && x !== 'index.ts')) {
      n += [...leer(`i18n/textos/${idiomaODir}/${f}`).matchAll(/^ {2}[A-Za-z][A-Za-z0-9_]*:/gm)].length;
    }
    return n;
  };
  /*
   * El número baja cuando se RETIRA una clave del producto entero —los once
   * diccionarios a la vez—, y solo entonces: 2 242 → 2 240 al eliminarse el
   * Perfil Biz (`menu.activeBiz`, `menu.bizActiveTap`). Y sube cuando se AÑADE
   * a los once a la vez: 2 240 → 2 299 en la Fase 11, con el módulo `creaciones`
   * («Mis creaciones», incluidas las cuatro claves de la descarga) y las dos
   * claves de la foto única de WeeTalk (`weetalk.photoOnce`, `weetalk.photoOpened`).
   * 2 301 → 2 318 en la Fase 12-A/B: entra el módulo `moderation` (24 claves) y
   * salen las siete de `wall.report*`, que daban las gracias por un reporte que no
   * existía y prometían una revisión que nadie hacía.
   * 2 318 → 2 319 en B3.10: `design.settingsHint`. Weë Design pasa a la hoja de
   * ajustes común y necesita su propia línea bajo el título, porque allí los
   * ajustes NO cambian con lo que se escribe —siempre se diseña algo que se ve—
   * y la frase del Studio, «cambian según lo que estés creando», no sería cierta.
   * 2 319 → 2 423 en B3.11, con las tres capas de Weë Studio: 54 claves de las
   * entradas y las experiencias (Texto, Personajes, Beauty, Fashion, Retrato,
   * Timelapse…) y 50 de la biblioteca de cámara y cinemática, que es el
   * vocabulario creativo de Weë dicho en palabras de la persona —«Acercarse» en
   * vez de `push_in`—. Las 104 entran en los once diccionarios a la vez.
   * 2 423 → 2 424 en B3.12: `studio.reference`, el nombre corto de una
   * referencia en su ficha. `referenceLabel` no servía: es el botón que la
   * añade —«Añadir una imagen de referencia»—, no cómo se llama después.
   * 2 424 → 2 427 en B3.14: los tres motivos de las experiencias de vídeo que
   * todavía no se pueden hacer. Cada uno dice qué pieza concreta del motor
   * falta —componer varias escenas, componer música, llevar dos referencias—
   * en vez de un «pronto», que no ayuda a decidir qué hacer ahora.
   * 2 427 → 2 682 en F1-C: entra el módulo `filmmaker` («Varias escenas», 255 claves)
   * en los once diccionarios a la vez —la producción, el storyboard, el panel
   * Director y una frase por cada código de F1-A y F1-B—. No sale ninguna: el
   * motivo `studio.pendCompose` se queda, porque juntar varias escenas en un solo
   * vídeo sigue sin poder hacerse.
   * 2 682 → 2 732 en F1-D: 50 claves `filmmaker.take*` —la toma de UNA unidad: su
   * sección, las tres calidades, el precio, lo que de verdad se genera, «en
   * proceso», el vídeo en su plano y una frase por cada motivo por el que no se
   * puede— en los once diccionarios a la vez. No sale ninguna: «Generar» de la
   * producción entera sigue sin estar, y dice lo mismo.
   */
  const CLAVES_PT = 2732;
  check(`57) I · pt-BR intacto: ${CLAVES_PT} claves y sigue siendo brasileño`,
    claves('pt') === CLAVES_PT
    && t('pt')('settings.title') === 'Configurações'
    && t('pt-BR')('settings.title') === 'Configurações', `${claves('pt')} claves`);
  check(`58) J · pt-PT intacto: ${CLAVES_PT} claves y sigue siendo europeo`,
    claves('pt-PT') === CLAVES_PT
    && t('pt-PT')('settings.title') === 'Definições', `${claves('pt-PT')} claves`);

  /* Y el arreglo está donde dijo que estaba, y en ningún otro sitio. */
  check('59) la corrección vive entera en el resolver',
    /concretarConLaLista/.test(leer('i18n/resolver.ts'))
    && !/concretarConLaLista/.test(leer('contexts/IdiomaContext.tsx'))
    && !/concretarConLaLista/.test(leer('screens/OnboardingScreen.tsx'))
    && !/concretarConLaLista/.test(leer('components/SincronizarIdioma.tsx')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
