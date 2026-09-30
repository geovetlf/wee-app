/*
 * EL PERFIL BIZ SE ELIMINÓ, Y WEË BUSINESS SIGUE FUNCIONANDO (fase 10).
 *
 * Son dos cosas distintas que se llamaban casi igual, y confundirlas es el
 * único riesgo real de esta eliminación:
 *
 *   · el PERFIL BIZ era una tercera IDENTIDAD —un documento `users/biz_<x>`
 *     con `profileType: 'biz'`— con la que se publicaba como si fuera una
 *     persona. Eso se ha ido. Weë tiene DOS caras: Perfil Real y Perfil Weë.
 *     Un negocio será una PÁGINA, que es una entidad del Account, no una cara.
 *
 *   · WEË BUSINESS es el PRODUCTO: `businesses/{businessId}`, su catálogo, sus
 *     reseñas, sus seguidores y sus pantallas. No se toca. Sigue entero.
 *
 * Este archivo existe para que nadie devuelva la identidad por error y para que
 * nadie se lleve el producto por delante creyendo que era la identidad.
 *
 * Decisión del usuario, 2026-09-19: eliminación definitiva del legacy Biz
 * Profile. Sustituye a la nota de `CLAUDE.md` que lo daba por tercera identidad.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

/* El modelo de identidad, transpilado y ejecutado — como en `econtact.test.mjs`. */
const ts = require('typescript');
const modelo = await import('data:text/javascript;base64,' + Buffer.from(
  ts.transpileModule(leer('utils/econtactModel.ts'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText,
).toString('base64'));
const {
  tipoDeIdentidad, esIdentidadValida, esIdentidadDePersona, cuentaDeIdentidad,
  nombreDeLista, PREFIJO_PERFIL_WEE,
} = modelo;
const soloCodigo = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

let failures = 0;
const check = (name, cond, extra = '') => {
  if (cond) console.log(`✔ ${name}${extra ? ' — ' + extra : ''}`);
  else { failures++; console.log(`✘ ${name}${extra ? ' — ' + extra : ''}`); }
};

const REAL = 'abc123';
const WEE = 'hidi_abc123';
const BIZ = 'biz_tienda';

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · La identidad ya no existe en el modelo ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('1) solo hay dos tipos de identidad, y "biz" no es uno',
    tipoDeIdentidad(REAL) === 'real' && tipoDeIdentidad(WEE) === 'wee'
    && tipoDeIdentidad(BIZ) === 'real',
    'un uid con guion bajo ni siquiera llega a preguntarse el tipo');

  check('2) un uid de la forma antigua no es una identidad válida',
    !esIdentidadValida(BIZ) && !esIdentidadValida('biz_n1') && !esIdentidadValida('biz_'));
  check('2) ni una identidad de persona', !esIdentidadDePersona(BIZ));

  /*
   * LO IMPORTANTE DE ESTE: un documento que TODAVÍA diga `profileType: 'biz'`
   * —porque está escrito en producción— no lleva a ninguna cuenta. No se
   * interpreta, no se migra sola y no da acceso a nada.
   */
  check('3) un documento con el profileType desaparecido no lleva a ninguna cuenta',
    cuentaDeIdentidad(BIZ, { uid: BIZ, profileType: 'biz', linkedAccountId: REAL }) === null);
  check('3) ni aunque el uid sea el de una persona de verdad',
    cuentaDeIdentidad(REAL, { uid: REAL, profileType: 'biz' }) === null);

  check('4) las dos caras que quedan siguen resolviendo',
    cuentaDeIdentidad(REAL, { uid: REAL, profileType: 'real' }) === REAL
    && cuentaDeIdentidad(WEE, { uid: WEE, profileType: 'hidi', linkedAccountId: REAL }) === REAL);

  check('5) el prefijo guardado del Perfil Weë no se tocó', PREFIJO_PERFIL_WEE === 'hidi_');
  check('5) y la agenda sigue teniendo dos nombres, no tres',
    nombreDeLista(REAL) === 'ËContact' && nombreDeLista(WEE) === 'ẄContact');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Nada en el código la puede volver a crear ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const CONTEXTO = leer('contexts/UserProfileContext.tsx');
  const SERVICIO = leer('services/firestoreService.ts');
  const CAJON = soloCodigo(leer('components/DrawerMenu.tsx'));
  const CABECERA = soloCodigo(leer('components/Header.tsx'));
  const LATERAL = soloCodigo(leer('components/Sidebar.tsx'));

  check('6) el contexto declara exactamente dos tipos de perfil',
    /type ProfileType = 'real' \| 'hidi';/.test(CONTEXTO) && !/'biz'/.test(soloCodigo(CONTEXTO)));
  check('7) y ya no ofrece ninguna puerta al Perfil Biz',
    !/bizProfile|hasBizProfile|switchToBiz|setBizProfile/.test(soloCodigo(CONTEXTO)));

  check('8) el servicio ya no sabe leer ni crear uno',
    !/getBizProfile|createBizProfile/.test(soloCodigo(SERVICIO)));
  check('8) y su tipo guardado admite solo las dos caras',
    /profileType\?: 'real' \| 'hidi';/.test(SERVICIO));

  /*
   * 9 · EL CAJÓN ERA LA FUENTE. Creaba `users/biz_<negocio>` solo, sin que
   * nadie lo pidiera, cada vez que alguien abría el menú teniendo un negocio.
   */
  check('9) el cajón del ☰ ya no fabrica identidades de negocio',
    !/biz_/.test(CAJON) && !/setDoc\(\s*doc\(db, 'users', `biz/.test(CAJON));
  check('10) ninguna de las tres superficies ofrece cambiar a Biz',
    !/switchToBiz|activeBiz|bizActiveTap/.test(CAJON + CABECERA + LATERAL));
  check('10) ni queda su color morado de identidad en la cabecera',
    !/activeProfileType === 'biz'/.test(CABECERA));

  /* 11 · Y no se ha inventado un sustituto con otro nombre. */
  check('11) no apareció ninguna identidad nueva en su lugar',
    !/BIZ_PROFILE|BUSINESS_PROFILE/.test(soloCodigo(CONTEXTO + SERVICIO + CAJON + CABECERA + LATERAL)));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Las reglas ya no la reconocen ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const reglas = leer('firestore.rules');

  check('12) no queda una sola cláusula que trate un `biz_*` como identidad',
    !/matches\('biz_\.\*'\)/.test(reglas));
  check('13) ni las funciones que decidían quién era el dueño del negocio-identidad',
    !/ownsBizProfile|businessIdOf/.test(reglas));
  check('14) `users` ya no admite crear un perfil de ese tipo',
    !/profileType == 'biz'/.test(reglas));

  /*
   * 15 · POR QUÉ IMPORTA MÁS DE LO QUE PARECE. Varias de esas cláusulas no
   * comprobaban DE QUIÉN era el `biz_*`: admitían cualquiera. Quitarlas cierra
   * un agujero real, no solo limpia.
   */
  check('15) el dueño de un post se deriva de la sesión, no de un prefijo',
    /function ownsPost\(\)/.test(reglas) && !/ownsPost\(\)[\s\S]{0,400}?biz_/.test(reglas));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · WEË BUSINESS SIGUE ENTERO ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const reglas = leer('firestore.rules');

  /* El producto: su documento, su catálogo, sus reseñas y sus seguidores. */
  check('16) `businesses/{businessId}` sigue teniendo sus reglas',
    /match \/businesses\/\{businessId\} \{/.test(reglas));
  check('17) y el dueño se deriva del Principal autenticado, como debe',
    /request\.resource\.data\.ownerId == request\.auth\.uid/.test(reglas));
  check('18) el catálogo de productos sigue ahí',
    /match \/products\/\{productId\} \{/.test(reglas));
  check('19) las reseñas también', /match \/reviews\/\{reviewId\} \{/.test(reglas));
  check('20) y los seguidores del negocio, que son otra colección',
    /match \/businessFollows\/\{followId\} \{/.test(reglas));

  /* Las pantallas y el servicio, intactos. */
  const PANTALLAS = ['WeeBizScreen', 'WeeBizProfileScreen', 'WeeBizRegisterScreen',
    'WeeBizProductsScreen', 'WeeBizCategoryScreen'];
  const faltan = PANTALLAS.filter((p) => !fs.existsSync(new URL(`../../screens/${p}.tsx`, import.meta.url)));
  check('21) las cinco pantallas de Weë Business siguen existiendo', faltan.length === 0, faltan.join(' '));
  check('22) y su servicio también',
    fs.existsSync(new URL('../../services/weeBizService.ts', import.meta.url)));

  /*
   * 23 · EL SEGUIMIENTO DE UN NEGOCIO NO ERA LA IDENTIDAD. Vive en
   * `businessFollows`, y el `_biz_` de su id es un separador, no el prefijo
   * de un uid. Se queda tal cual.
   */
  const PERFIL_NEGOCIO = leer('screens/WeeBizProfileScreen.tsx');
  check('23) seguir un negocio se sigue guardando en businessFollows',
    /doc\(db, 'businessFollows', followId\)/.test(PERFIL_NEGOCIO)
    && /\$\{activeUid\}_biz_\$\{businessId\}/.test(PERFIL_NEGOCIO));

  /* 24 · Y el cajón sigue llevando al negocio de quien lo tiene. */
  const CAJON = soloCodigo(leer('components/DrawerMenu.tsx'));
  check('24) el menú sigue llevando al negocio propio',
    /navigation\.navigate\('WeeBizProfile', \{ businessId: myBusiness\.id \}\)/.test(CAJON));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Todos los diccionarios, simétricos ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * Una clave de i18n existe en TODOS los idiomas o en ninguno: el tipo no
   * compila si falta en uno. Quitar dos claves tiene que ser exactamente
   * simétrico, y aquí se comprueba de verdad, locale a locale.
   *
   * Los diccionarios se LEEN de la carpeta y no se cuentan a mano: el número
   * cambia cada vez que entra un idioma, y lo que importa es que ninguno se
   * quede sin su menú.
   */
  const RAIZ = new URL('../../i18n/textos/', import.meta.url);
  const locales = fs.readdirSync(RAIZ).filter((d) => fs.existsSync(new URL(`${d}/menu.ts`, RAIZ)));
  const diccionarios = fs.readdirSync(RAIZ).filter((d) => fs.existsSync(new URL(`${d}/index.ts`, RAIZ)));
  check(`25) los ${diccionarios.length} diccionarios tienen su menú`,
    locales.length === diccionarios.length && diccionarios.length >= 2, locales.join(' '));

  const conBiz = locales.filter((l) => /activeBiz|bizActiveTap/.test(fs.readFileSync(new URL(`${l}/menu.ts`, RAIZ), 'utf8')));
  check('26) en ninguno queda una clave del Perfil Biz', conBiz.length === 0, conBiz.join(' '));

  const sinWee = locales.filter((l) => !/activeWee:/.test(fs.readFileSync(new URL(`${l}/menu.ts`, RAIZ), 'utf8')));
  check('27) y en todos siguen las que sí se usan', sinWee.length === 0, sinWee.join(' '));
}

console.log(failures === 0 ? '\n✔ todo bien' : `\n✘ ${failures} fallos`);
process.exit(failures === 0 ? 0 : 1);
