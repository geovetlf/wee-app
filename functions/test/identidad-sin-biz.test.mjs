/*
 * EL PERFIL BIZ SE ELIMINÓ, Y WEEBIZ SE RETIRÓ DEFINITIVAMENTE (fase 10; 2026-11-03; 2026-11-06).
 *
 * Son dos retiradas distintas:
 *
 *   · el PERFIL BIZ era una tercera IDENTIDAD —un documento `users/biz_<x>`
 *     con `profileType: 'biz'`— con la que se publicaba como si fuera una
 *     persona. Eso se ha ido (decisión del usuario, 2026-09-19). Weë tiene DOS
 *     caras: Perfil Real y Perfil Weë. Un negocio será una PÁGINA, que es una
 *     entidad del Account, no una cara.
 *
 *   · WEEBIZ era el directorio de negocios del proyecto anterior. El dueño lo
 *     retiró de Weë el 2026-11-03 y, de forma definitiva y global, el
 *     2026-11-06: no es un módulo pendiente, existente ni recuperable, y no se
 *     reconstruye. De él solo quedan los DATOS históricos de producción, que sus
 *     reglas siguen protegiendo (D, 16-20) hasta una auditoría aparte.
 *
 * Este archivo existe para que no vuelva ni la identidad (A-C, E) ni el
 * directorio (D, 21-24d) ni su nombre en el código, los textos, la web o la
 * documentación operativa (F, 28-31c).
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
console.log('\n── D · WeeBiz retirado de Weë; sus datos guardados siguen protegidos por sus reglas ──');
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

  /*
   * 21-24 · El directorio WeeBiz (pantallas, servicio, catálogo y la fila del menú) retirado por decisión del dueño el 2026-11-03: era del proyecto antiguo.
   * Las reglas de arriba se quedan: hay datos guardados y retirarlas exige otra decisión.
   */
  const PANTALLAS = ['WeeBizScreen', 'WeeBizProfileScreen', 'WeeBizRegisterScreen', 'WeeBizProductsScreen', 'WeeBizCategoryScreen'];
  const quedan = PANTALLAS.filter((p) => fs.existsSync(new URL(`../../screens/${p}.tsx`, import.meta.url)));
  check('21) las cinco pantallas de WeeBiz se retiraron', quedan.length === 0, quedan.join(' '));
  check('22) y su servicio también', !fs.existsSync(new URL('../../services/weeBizService.ts', import.meta.url)));
  const CAJON = soloCodigo(leer('components/DrawerMenu.tsx'));
  check('24) el menú ya no lleva a ningún negocio', !/WeeBiz|myBusiness|weeBizService/.test(CAJON));

  /*
   * 24b-24d · Retirada completa (2026-11-06): ni ruta ni enlace —una dirección antigua (/WeeBiz, /WeeBizProfile…) cae
   * en el comportamiento normal de ruta desconocida—, ni catálogo de categorías ni módulo de textos, ni la sección
   * «Registra tu negocio» de la landing.
   */
  const NAVEGACION = ['App.tsx', 'navigation/MainStackNavigator.tsx', 'navigation/TabNavigator.tsx', 'navigation/HomeStackNavigator.tsx',
    'navigation/ProfileStackNavigator.tsx', 'navigation/EspacioProfesionalNavigator.tsx', 'navigation/enlaces.ts'].map((f) => soloCodigo(leer(f))).join('\n');
  check('24b) ninguna pila ni el linking registran una ruta de WeeBiz', !/WeeBiz|weeBizService|weebizCategories/.test(NAVEGACION));
  const existe = (f) => fs.existsSync(new URL('../../' + f, import.meta.url));
  check('24c) ni su catálogo de categorías ni su módulo de textos existen',
    !existe('constants/weebizCategories.ts') && !existe('i18n/textos/es/weebiz.ts') && !existe('i18n/textos/en/weebiz.ts'));
  const LANDING = leer('public/landing.html').replace(/<!--[\s\S]*?-->/g, '');
  check('24d) la landing ya no anuncia el directorio de negocios', !/weebiz|biz-card|Registra tu negocio/i.test(LANDING));
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

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · El nombre WeeBiz no vuelve: ni código, ni web, ni textos, ni documentación operativa (2026-11-06) ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * Decisión del dueño (2026-11-06): WeeBiz desaparece de todo Weë y no se trata como módulo pendiente, existente
   * ni recuperable. Aquí se recorre el árbol entero de lo que se usa a diario y se exige:
   *   · CERO apariciones (comentarios incluidos) en el código de la app, los textos de los 42 idiomas, la web
   *     pública, las páginas legales, las herramientas, la configuración y las instrucciones para agentes;
   *   · en la documentación operativa, solo frases que digan que está RETIRADO (ninguna que lo describa vivo);
   *   · y en ningún sitio, ni código ni documentación, la idea de que «Weë Business, el producto» sigue en pie.
   * EXCEPCIONES, explícitas y con su porqué (cualquier otra aparición falla):
   */
  const EXCEPCIONES = {
    'ops/integracion/capacidades.mjs': 'registro de funcionalidades retiradas (RETIRADAS.weebiz): es la prueba de que se retiró',
    'ops/integracion/semantica.patch': 'parche histórico fechado de la integración (instantánea, no instrucciones)',
    'ops/integracion/conflictos.patch': 'parche histórico fechado de la integración (instantánea, no instrucciones)',
    'ops/revision/baseline.json': 'instantánea fechada del revisor (corte 5be63ff), protegida por el harness',
    'docs/I18N-GROENLANDES.md': 'tablas fechadas de la revisión del groenlandés (historia del diccionario)',
    'docs/I18N-ISLANDES.md': 'tablas fechadas de la revisión del islandés (historia del diccionario)',
    'docs/I18N-INVENTARIO-GLOBAL.md': 'inventario fechado de la oleada i18n (dice que el módulo se quitó)',
    'docs/I18N-L2-L3-PREPARACION.md': 'plan fechado de la oleada i18n (dice que el módulo se retira)',
    'docs/i18n/auditoria/mn.md': 'acta fechada de auditoría del mongol',
    'docs/i18n/auditoria/ro.md': 'acta fechada de auditoría del rumano',
  };
  /* Lo que no es fuente: dependencias, compilados, los registros de revisión por idioma (historia con `obsoleta`) y las pruebas. */
  const FUERA = /(^|\/)(node_modules|\.git|dist|web-build|\.expo|demo-medios|android|ios)(\/|$)|^(functions\/lib|functions\/test|functions\/test-L5|i18n\/revision)\//;
  const RE = /weebiz|wee[ _-]?biz\b|weë ?biz\b/i;
  const raiz = new URL('../../', import.meta.url);
  const recorrer = (rel) => {
    const abs = new URL(rel, raiz);
    if (!fs.existsSync(abs)) return [];
    if (fs.statSync(abs).isFile()) return [rel];
    return fs.readdirSync(abs).flatMap((n) => {
      const r = (rel ? rel.replace(/\/$/, '') + '/' : '') + n;
      if (FUERA.test(r)) return [];
      const st = fs.statSync(new URL(r, raiz));
      if (st.isDirectory()) return recorrer(r + '/');
      return /\.(tsx?|jsx?|mjs|cjs|json|html|md|css|txt|xml|webmanifest|patch|ya?ml|rules)$/.test(n) && st.size < 5e6 ? [r] : [];
    });
  };
  const apariciones = (f) => leer(f).split(/\r?\n/).map((l, i) => ({ l, n: i + 1 })).filter(({ l }) => RE.test(l));

  const CERO = ['App.tsx', 'app.json', 'firebase.json', 'package.json', 'functions/package.json', 'index.ts', 'navigation/', 'screens/',
    'components/', 'services/', 'hooks/', 'contexts/', 'constants/', 'utils/', 'types/', 'i18n/', 'public/', 'legal/', 'scripts/', 'ops/', '.claude/'];
  const enCero = CERO.flatMap(recorrer).filter((f) => !EXCEPCIONES[f])
    .flatMap((f) => apariciones(f).map(({ n }) => `${f}:${n}`));
  check('28) ninguna aparición del nombre en código, textos, web, legales, herramientas, configuración ni instrucciones para agentes',
    enCero.length === 0, enCero.slice(0, 12).join(' · '));

  const DOCS = ['CLAUDE.md', 'README.md', 'AGENTS.md', 'docs/'].flatMap(recorrer).filter((f) => f.endsWith('.md') && !EXCEPCIONES[f]);
  const vivas = DOCS.flatMap((f) => apariciones(f).filter(({ l }) => !/retir/i.test(l)).map(({ n }) => `${f}:${n}`));
  check('29) en la documentación operativa solo aparece para decir que está retirado', vivas.length === 0, vivas.slice(0, 12).join(' · '));
  check('29b) CLAUDE.md lo da por retirado definitivamente y sin reconstrucción',
    /WeeBiz\*\*[^\n]*retirado definitivamente[^\n]*no se reconstruye/.test(leer('CLAUDE.md')));

  const PRODUCTO_VIVO = /Weë Business,? el producto|Weë Business sigue (existiendo|entero|en pie)|pantallas `?WeeBiz\*`?, `?weeBizService/i;
  const conProducto = [...DOCS, ...CERO.flatMap(recorrer).filter((f) => !EXCEPCIONES[f])].filter((f) => PRODUCTO_VIVO.test(leer(f)));
  check('30) ningún sitio presenta Weë Business / WeeBiz como un producto que sigue en pie', conProducto.length === 0, conProducto.join(' · '));

  /* Controles: la búsqueda encuentra lo que debe, y no confunde el húngaro «biztonság» (seguridad) con el nombre. */
  check('31) control: la búsqueda reconoce las variantes y no el húngaro',
    ['WeeBiz', 'weeBizService', 'weebiz.title', 'Wee Biz', 'Weë Biz', 'WEE_BIZ', 'wee-biz'].every((s) => RE.test(s)) && !RE.test('a Weë biztonságát'));
  check('31b) control: el recorrido ve de verdad el código y la documentación',
    recorrer('screens/').length > 50 && recorrer('i18n/').length > 500 && DOCS.length > 20);
  check('31c) control: las excepciones existen (si una desaparece, se quita de la lista)',
    Object.keys(EXCEPCIONES).every((f) => fs.existsSync(new URL(f, raiz))), Object.keys(EXCEPCIONES).filter((f) => !fs.existsSync(new URL(f, raiz))).join(' '));
}

console.log(failures === 0 ? '\n✔ todo bien' : `\n✘ ${failures} fallos`);
process.exit(failures === 0 ? 0 : 1);
