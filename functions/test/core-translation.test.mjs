/*
 * WEË TRANSLATION — EL SITIO RESERVADO, Y QUE SIGA VACÍO.
 *
 * ── Qué se preparó ─────────────────────────────────────────────────────────
 *
 *   CAPACIDAD → MODELO → PROVEEDOR → ADAPTADOR → matriz de traducción
 *
 * Weë Translation todavía NO existe. Lo que existe es el sitio donde encajará:
 * dos capacidades declaradas, el contrato de una petición de traducción y una
 * función que responde si un par de idiomas cabe en lo que un proveedor
 * declara. Nada más.
 *
 * ── Qué vigila esto ────────────────────────────────────────────────────────
 *
 * Casi todo lo de aquí comprueba que el sitio sigue VACÍO: que ninguna matriz
 * de traducción se ha colado, que ninguna capacidad promete lo que nadie puede
 * servir, y que no hay un segundo catálogo ni un router escondido. Un sitio
 * reservado que empieza a llenarse solo es peor que no haberlo reservado.
 *
 * Y una cosa más, que es la que de verdad se rompe en silencio: que preparar
 * esto NO cambió nada de lo que ya funcionaba.
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

const ts = require('typescript');
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (b) => (fs.existsSync(path.resolve(RAIZ, b + '.ts')) ? b + '.ts' : b + '/index.ts');
const nombresPedidos = (js, dep) => {
  const nombres = new Set();
  const escapado = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const [, clausula] of js.matchAll(new RegExp(`import\\s+([^;]*?)\\s+from\\s*['"]${escapado}['"]`, 'g'))) {
    for (const [, dentro] of clausula.matchAll(/\{([^}]*)\}/g)) {
      for (const parte of dentro.split(',')) {
        const nombre = parte.trim().split(/\s+as\s+/)[0].trim();
        if (nombre) nombres.add(nombre);
      }
    }
  }
  return [...nombres];
};
const sustituto = (nombres) =>
  comoModulo(
    'const nada = new Proxy(function () {}, { get: () => nada, apply: () => nada, construct: () => nada });\n' +
      'export default nada;\n' + nombres.map((n) => `export const ${n} = nada;`).join('\n') + '\n',
  );
const cargados = new Map();
const cargar = async (ruta) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  const js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const carpeta = path.posix.dirname(ruta.split(path.sep).join('/'));
  const RE = /(from\s*)(['"])([^'"]+)\2/g;
  const mapa = new Map();
  for (const [, , , dep] of js.matchAll(RE)) {
    if (mapa.has(dep)) continue;
    mapa.set(dep, dep.startsWith('.')
      ? (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, dep))))).url
      : sustituto(nombresPedidos(js, dep)));
  }
  const url = comoModulo(js.replace(RE, (_f, pre, q, dep) => `${pre}${q}${mapa.get(dep)}${q}`));
  const resultado = { url, ns: await import(url) };
  cargados.set(ruta, resultado);
  return resultado;
};

const core = (await cargar('functions/src/core/index.ts')).ns;
const composicion = (await cargar('functions/src/registry/index.ts')).ns;
const registro = composicion.registroDeWee();
const datos = composicion.datosDelRegistro();
const cap = (id) => core.CAPABILITY_CATALOG.find((c) => c.id === id);
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

console.log('\n── A · El sitio existe: dos capacidades declaradas ──');
{
  check('1) translation.text y translation.detect están en el catálogo', !!cap('translation.text') && !!cap('translation.detect'));
  check('2) con categoría propia: traducir no es una variante de generar texto',
    cap('translation.text').category === 'translation' && cap('translation.detect').category === 'translation');
  check('3) y su familia se deduce sola, sin tabla nueva', core.familiaDeCapacidad('translation.text') === 'translation');
  /*
   * DECLARED y no PENDING: PENDING significa «hay una matriz candidata
   * identificada», y aquí no hay ninguna. Decir lo contrario sería prometer.
   */
  check('4) están DECLARED: un nombre reservado, no una promesa',
    cap('translation.text').status === 'DECLARED' && cap('translation.detect').status === 'DECLARED');
  check('5) el contrato de entrada y salida es honesto: texto a texto, por ahora',
    cap('translation.text').accepts.join() === 'text' && cap('translation.text').produces === 'text');
  check('6) y la nota dice en qué fase llega lo que falta',
    /Fase 20/.test(cap('translation.text').note || '') && /Fase 10/.test(cap('translation.detect').note || ''));
}

console.log('\n── B · Y sigue VACÍO: nadie la sirve todavía ──');
{
  check('7) ninguna capacidad de traducción tiene implementación',
    registro.getCapabilityImplementations('translation.text').length === 0 && registro.getCapabilityImplementations('translation.detect').length === 0);
  check('8) ni usable, ni declarada, ni de muestra: cero',
    registro.findImplementations('translation.text').length === 0 && !registro.capabilitiesDisponibles().includes('translation.text'));
  check('9) ningún modelo del registro declara traducir', datos.models.every((m) => !m.capabilities.some((c) => String(c).startsWith('translation.'))));
  check('10) ningún proveedor del registro declara traducir', datos.providers.every((p) => !p.capabilities.some((c) => String(c).startsWith('translation.'))));
  /*
   * El modo demo se mide aparte, y no es un descuido. Su adaptador contesta
   * `supports: () => true`, así que declara TODA capacidad del catálogo —las
   * de traducción también, igual que las 42 declaradas antes que ellas—. No
   * abre ninguna puerta: quien decide si algo se puede ejecutar es el MODELO,
   * y ningún modelo suyo cubre traducción (comprobación 9). Por eso 7 y 8 dan
   * cero implementaciones.
   */
  const deMatrices = datos.adapters.filter((a) => datos.providers.find((p) => p.id === a.providerId)?.type === 'matrix');
  check('11) ningún adaptador de una matriz declara traducir',
    deMatrices.every((a) => !a.supportedCapabilities.some((c) => String(c).startsWith('translation.'))), `${deMatrices.length} adaptadores de matriz`);

  /*
   * LA COMPROBACIÓN QUE DE VERDAD IMPORTA: que no se haya colado un TRADUCTOR.
   *
   * Y la regla es por CAPACIDAD, no por empresa. Hunyuan 3D es de Tencent y
   * Qwen y Wan son de Alibaba, y las tres llevan registradas desde la Fase 1
   * como matrices PENDING de 3D, imagen y vídeo, con cero capacidades. Buscar
   * «tencent» o «alibaba» las señalaría a ellas y no diría nada de lo que se
   * quiere impedir: que alguien integre traducción sin pasar por la Fase 20.
   */
  const conTraduccion = datos.providers.filter((p) => p.capabilities.some((c) => String(c).startsWith('translation.')));
  check('12) ningún proveedor registrado sirve traducción', conTraduccion.length === 0, conTraduccion.map((p) => p.id).join(' ') || `${datos.providers.length} comprobados`);
  const PRODUCTOS_DE_TRADUCCION = ['google translate', 'amazon translate', 'tencent translate', 'baidu translate', 'alibaba translate', 'deepl', 'systran', 'papago', 'youdao', 'lingvanex', 'modernmt'];
  const porNombre = datos.providers.filter((p) => PRODUCTOS_DE_TRADUCCION.some((m) => p.name.toLowerCase().includes(m) || p.id.toLowerCase().includes(m.replace(/ /g, '-'))));
  check('12b) ni figura por nombre ningún servicio de traducción', porNombre.length === 0, porNombre.map((p) => p.id).join(' ') || `${PRODUCTOS_DE_TRADUCCION.length} comprobados`);
  check('12c) control: reconocería uno si se colara',
    [...datos.providers, { id: 'deepl', name: 'DeepL' }].some((p) => PRODUCTOS_DE_TRADUCCION.some((m) => p.id.toLowerCase().includes(m))));
  check('13) y ninguna matriz que hoy está PENDING ha pasado a READY o BETA de rebote',
    ['tripo', 'hunyuan3d', 'qwen', 'wan', 'yinchao', 'eleven-music'].every((id) => datos.providers.find((p) => p.id === id)?.status === 'PENDING'));

  /* Tampoco en el código del Core: ni el nombre, ni una credencial, ni un endpoint. */
  const fuentesCore = ['functions/src/core/language.ts', 'functions/src/core/registry/capabilities.ts', 'functions/src/core/brain.ts', 'functions/src/core/gateway.ts'];
  const conNombre = fuentesCore.filter((f) => PRODUCTOS_DE_TRADUCCION.some((m) => new RegExp(`(?<![a-z])${m.replace(/ /g, '\\s?')}(?![a-z])`, 'i').test(sinComentarios(leer(f)))));
  check('14) el Core no nombra a ninguna matriz de traducción', conNombre.length === 0, conNombre.join(' ') || 'limpio');
  check('15) ni hay endpoints, claves o SDK de traducción en ninguna parte nueva',
    !/https?:\/\//.test(sinComentarios(leer('functions/src/core/language.ts')))
    && !/TRANSLAT[A-Z_]*_API_KEY|translate\.(googleapis|amazonaws|tencentcloudapi)/i.test(leer('functions/src/core/language.ts') + leer('functions/src/core/registry/capabilities.ts')));
  check('16) y no se añadió ninguna dependencia', !/translat/i.test(leer('functions/package.json').replace(/core-translation\.test\.mjs/g, '')));
}

console.log('\n── C · El contrato de una petición de traducción ──');
{
  const fuente = leer('functions/src/core/language.ts');
  check('17) existe el contrato, con el destino como lo único obligatorio',
    /export interface TranslationRequest/.test(fuente) && /targetLanguage: LanguageTag;/.test(fuente) && /sourceLanguage\?: LanguageTag;/.test(fuente));
  check('18) representa lo que la Fase 10 necesitará: origen, destino, detectado, locale, tipo, modo y terminología',
    ['sourceLanguage', 'targetLanguage', 'detectedLanguage', 'locale', 'contentType', 'mode', 'terminology'].every((c) => new RegExp(`\\b${c}[?]?:`).test(fuente)));
  check('19) lo detectado se guarda APARTE de lo declarado: son dos hechos distintos',
    /detectedLanguage\?: LanguageTag;/.test(fuente) && /Nunca se asume igual al origen/.test(fuente));
  check('20) reutiliza LanguageTag del Core, así que todo pasa por normalizarEtiqueta',
    !/sourceLanguage\?: string/.test(fuente) && !/targetLanguage: string/.test(fuente));
  /* Se mira DENTRO del bloque del tipo, no en todo el archivo: `contextoDeIdioma` vive más abajo y sí habla de `appLanguage`, como debe. */
  const bloqueTraduccion = fuente.slice(fuente.indexOf('export interface TranslationRequest'), fuente.indexOf('export const admiteElPar'));
  check('21) y NO duplica LanguageContext: son cosas distintas y conviven',
    /export interface LanguageContext/.test(fuente) && /export interface TranslationRequest/.test(fuente) && !/appLanguage/.test(bloqueTraduccion));
  /*
   * La calidad NO se declara aquí: ya viaja con la ejecución. Dos sitios para
   * pedir lo mismo es como acaban contradiciéndose.
   */
  check('22) la calidad no se repite: vive donde ya vivía, en las pistas de ejecución',
    !/quality\?:/.test(bloqueTraduccion) && /quality\?: 'standard' \| 'high' \| 'max'/.test(leer('functions/src/core/gateway.ts')));

  check('23) el tipo de contenido distingue lo que se trata distinto, sin repetir Modality ni AssetKind',
    ['plain', 'document', 'subtitles', 'speech'].every((v) => new RegExp(`'${v}'`).test(fuente))
    && !/export type TranslationModality|type TranslationAssetKind/.test(fuente));
  check('24) y el modo distingue literal, natural y adaptado', ['literal', 'natural', 'localized'].every((v) => new RegExp(`'${v}'`).test(fuente)));

  /*
   * LA MARCA NO SE TRADUCE. Es la regla del §8 de CLAUDE.md, y sin un sitio
   * donde decirlo la primera traducción automática convertiría «Credits» en
   * «Créditos».
   */
  check('25) hay dónde decir qué NO se traduce nunca: las marcas de Weë',
    /doNotTranslate\?: readonly string\[\]/.test(fuente) && /marca/i.test(fuente.slice(fuente.indexOf('TranslationTerminology'), fuente.indexOf('export interface TranslationRequest'))));
  check('26) y dónde fijar cómo se dice cada término', /glossary\?: Readonly<Record<string, string>>/.test(fuente));
}

console.log('\n── D · Elegir por idioma: lo que el registro YA sabía ──');
{
  /* Sin declaración, no se puede afirmar restricción: se acepta. */
  check('27) un proveedor que no declara idiomas no se descarta', core.admiteElPar(undefined, 'es', 'ja') === true && core.admiteElPar({}, 'es', 'ja') === true);
  check('28) uno que declara los suyos admite lo que declara y rechaza lo que no',
    core.admiteElPar({ only: ['en', 'zh'] }, 'en', 'zh') === true && core.admiteElPar({ only: ['en', 'zh'] }, 'en', 'ja') === false);
  /*
   * Por LENGUA, no por etiqueta: quien declara `pt` sirve `pt-BR`. Comparar la
   * etiqueta completa dejaría fuera a media Weë.
   */
  check('29) se compara por lengua, no por etiqueta: quien declara pt sirve pt-BR',
    core.admiteElPar({ only: ['pt', 'en'] }, 'en', 'pt-BR') === true && core.admiteElPar({ only: ['pt'] }, 'en', 'zh-Hant-TW') === false);
  check('30) entrada y salida se miran por separado cuando el proveedor las distingue',
    core.admiteElPar({ inputLanguages: ['ja'], outputLanguages: ['en'] }, 'ja', 'en') === true
    && core.admiteElPar({ inputLanguages: ['ja'], outputLanguages: ['en'] }, 'es', 'en') === false);
  check('31) sin origen conocido —hay que detectarlo— solo se juzga el destino',
    core.admiteElPar({ only: ['en', 'es'] }, undefined, 'es') === true);
  /* Y NO elige: solo responde. Elegir es de otra capa. */
  check('32) la función responde sí o no; no ordena, no puntúa, no elige',
    typeof core.admiteElPar({ only: ['en'] }, 'en', 'en') === 'boolean'
    && !/sort|score|puntu|mejor|cheapest|best/i.test(sinComentarios(leer('functions/src/core/language.ts'))));

  /* Lo demás que un Translation Router necesitará YA está en el registro. */
  const tipos = leer('functions/src/core/registry/types.ts');
  check('33) el registro ya sabe idiomas por modelo y por proveedor',
    /inputLanguages\?: readonly string\[\]/.test(tipos) && /qualityByLanguage\?: Readonly<Record<string, number>>/.test(tipos));
  check('34) ya sabe calidad, velocidad y latencia medida', /latencyMsP50\?: number/.test(tipos) && /quality: 1 \| 2 \| 3 \| 4 \| 5/.test(tipos));
  check('35) ya sabe disponibilidad y límites', /interface ProviderHealthInfo/.test(tipos) && /maxCallsPerDay\?: number/.test(tipos));
}

console.log('\n── E · Cobrar sin saber cómo factura el proveedor ──');
{
  /*
   * Los proveedores de traducción cobran por CARACTERES o por PÁGINA. Las dos
   * unidades ya existían en el Core desde la Fase 0, así que un proveedor de
   * pago por uso encaja sin tocar Credits ni pricing.
   */
  const coste = leer('functions/src/core/cost.ts');
  const tipos = leer('functions/src/core/registry/types.ts');
  check('36) la unidad de los proveedores de traducción ya existe: caracteres y página',
    /'kchar'/.test(coste) && /'page'/.test(coste) && /'kchar'/.test(tipos) && /'page'/.test(tipos));
  check('37) y la tarifa se declara como REFERENCIA publicada, no como precio de Weë',
    /interface PricingReference/.test(tipos) && /De dónde salió esta tarifa. Sin fuente, no se registra/.test(tipos));
  check('38) el camino a Credits sigue siendo el de siempre, sin nada nuevo',
    /COSTE REAL DEL PROVEEDOR → MARGEN → CREDITS/.test(leer('docs/CORE.md')));
  /* Y no se ha inventado ningún precio ni ninguna suscripción. */
  check('39) no se añadió ningún precio de traducción a ninguna parte',
    !/translation/i.test(leer('functions/src/credits/creditCosts.ts')) && !/translation/i.test(leer('functions/src/credits/aiPricing.ts')));
  check('40) ni se asumió suscripción: nada declara cuotas fijas',
    !/subscription|suscripci[oó]n|monthly|mensual/i.test(sinComentarios(leer('functions/src/core/language.ts'))));
}

console.log('\n── F · El sitio del futuro Translation Router ──');
{
  /*
   * No hace falta un router de traducción aparte: el puerto que ya usa el
   * Gateway sirve. Un Translation Router es un `ImplementationResolver` que
   * responde a las capacidades de traducción.
   */
  check('41) el puerto donde encajará existe, y es el que ya usa el Gateway',
    /export interface ImplementationResolver/.test(leer('functions/src/core/gateway.ts'))
    && /resolver\(capability: CoreCapabilityId, trace: TraceContext\): Promise<ImplementationRef \| undefined>/.test(leer('functions/src/core/gateway.ts')));
  check('42) y Weë Brain ya sabe llegar al Gateway por él, sin saber de traducción',
    /pensadorSobreGateway/.test(leer('functions/src/brain/index.ts')));
  /* Lo que NO se ha hecho: ningún router, ninguna elección, ninguna puntuación. */
  check('43) NO se implementó ningún Translation Router',
    !fs.existsSync(path.resolve(RAIZ, 'functions/src/translation'))
    && !/TranslationRouter|translationRouter|elegirTraductor/.test(leer('functions/src/core/language.ts') + leer('functions/src/core/gateway.ts') + leer('functions/src/core/brain.ts')));
  check('44) ni lógica de traducción dentro del Gateway o de Brain',
    !/translat/i.test(sinComentarios(leer('functions/src/core/gateway.ts'))) && !/translat/i.test(sinComentarios(leer('functions/src/core/brain.ts'))));
  check('45) ni dentro del motor o de sus adaptadores',
    !fs.readdirSync(path.resolve(RAIZ, 'functions/src/engine/providers')).some((f) => /translat/i.test(f)));
}

console.log('\n── G · Preparar esto NO cambió nada de lo que ya funcionaba ──');
{
  /*
   * Las 28 que el motor enruta siguen siendo exactamente las mismas, y 22 de
   * ellas son ROUTABLE: las otras seis las declara el propio motor con cadena
   * vacía o con su único eslabón apagado (las dos de música). Es así desde la
   * Fase 1 y no lo cambia nada de esto.
   */
  const enrutadas = [...leer('functions/src/engine/registry.ts').matchAll(/routing\('([a-z0-9._]+)'/g)].map((m) => m[1]);
  const routable = core.CAPABILITY_CATALOG.filter((c) => c.status === 'ROUTABLE').map((c) => String(c.id));
  /* Más world.generate (misión fal, 2026-10-05): enrutada y ROUTABLE, aunque hoy ningún modelo suyo sea elegible. */
  check('46) el motor sigue enrutando las mismas 28 capacidades y world.generate, con las mismas 22 ROUTABLE y world.generate',
    enrutadas.length === 29 && routable.length === 23 && routable.every((c) => enrutadas.includes(c)) && routable.includes('world.generate'),
    `${enrutadas.length} enrutadas · ${routable.length} ROUTABLE`);
  check('47) y ninguna de traducción es enrutable', !routable.some((c) => c.startsWith('translation.')));
  check('48) el catálogo creció en dos y nada más (y después, en world.generate)', core.CAPABILITY_CATALOG.length === 69, `${core.CAPABILITY_CATALOG.length} capacidades`);
  /* Más fal (excepción controlada, 2026-10-05): un proveedor, un modelo y un adaptador. */
  check('49) los proveedores, modelos y adaptadores de siempre siguen igual, más fal',
    datos.providers.length === 18 && datos.models.length === 33 && datos.adapters.length === 12 && datos.providers.some((p) => p.id === 'fal'),
    `${datos.providers.length} prov · ${datos.models.length} mod · ${datos.adapters.length} adap`);
  check('50) el registro real sigue sin errores de integridad', composicion.problemasDelRegistro().filter((p) => p.severity === 'error').length === 0);
  /* Y las matrices que sí estaban pendientes siguen exactamente donde estaban. */
  const pendientes = ['tripo', 'hunyuan3d', 'qwen', 'wan', 'yinchao', 'eleven-music'];
  check('51) las seis matrices pendientes siguen PENDING y sin prometer nada',
    pendientes.every((id) => datos.providers.find((p) => p.id === id)?.status === 'PENDING')
    && pendientes.every((id) => (datos.providers.find((p) => p.id === id)?.capabilities || []).length === 0));
  check('52) la adaptación de idioma que YA existía sigue sin cobrarse: no es Weë Translation',
    /billable: false/.test(leer('functions/src/core/language.ts')) && /nunca se le cobra|no se cobra/i.test(leer('functions/src/engine/promptLanguage.ts')));
  check('53) y Credits, precios y la política de Weë Brain no se tocaron',
    /RESPUESTAS_POR_CREDIT = 12/.test(leer('functions/src/creator/brainUsage.ts')) && /ai_brain: \{ margin: 0\.2, pricingMode: 'real' \}/.test(leer('functions/src/credits/creditCosts.ts')));
}

console.log('\n── H · Y mañana entra sin rehacer nada ──');
{
  /*
   * LA PRUEBA DE EXTENSIBILIDAD: se registra una matriz de traducción inventada
   * —con su modelo, su adaptador y sus idiomas— y `translation.text` tiene que
   * pasar de cero implementaciones a una usable SIN tocar el Core, ni el
   * Gateway, ni Brain, ni ningún Workplace.
   */
  const futura = {
    capabilities: core.CAPABILITY_CATALOG,
    providers: [...datos.providers, {
      id: 'future-translation-test', name: 'Matriz de traducción del futuro', type: 'matrix', status: 'READY', contract: '1.0',
      modalities: ['text'], capabilities: ['translation.text', 'translation.detect'],
      credentialEnv: 'FUTURE_TRANSLATION_TEST_API_KEY', adapterId: 'adapter:future-translation-test',
      languages: { only: ['es', 'en', 'ja'], note: 'lo que declara su documentación' },
      health: { state: 'AVAILABLE' },
    }],
    models: [...datos.models, {
      id: 'future-translation-1', providerId: 'future-translation-test', capabilities: ['translation.text', 'translation.detect'],
      modalities: ['text'], grades: { quality: 4, speed: 5 }, status: 'READY',
      languages: { only: ['es', 'en', 'ja'], note: 'según su documentación', qualityByLanguage: { es: 0.94 } },
      /* Pago por uso, por caracteres: la unidad ya existía. */
      pricing: { unit: 'kchar', currency: 'USD', mediaRate: 0.008, source: 'documentación oficial' },
    }],
    adapters: [{ id: 'adapter:future-translation-test', providerId: 'future-translation-test', contract: '1.0', supportedCapabilities: ['translation.text', 'translation.detect'], status: 'ACTIVE' }, ...datos.adapters],
  };
  check('54) el registro acepta la matriz de traducción sin quejarse', core.validarRegistro(futura).filter((p) => p.severity === 'error').length === 0,
    core.validarRegistro(futura).filter((p) => p.severity === 'error').map((e) => e.message).join(' | '));
  const conFutura = core.crearRegistro(futura);
  const impl = conFutura.findImplementations('translation.text');
  check('55) y translation.text pasa de no tener a tener implementación USABLE',
    registro.findImplementations('translation.text').length === 0 && impl.length === 1 && impl[0].provider.id === 'future-translation-test');
  check('56) el Gateway la ejecutaría sin tocar una línea suya', core.puedeEjecutarse(impl[0]).ok === true);
  check('57) el par de idiomas se puede decidir con lo que el registro guarda',
    core.admiteElPar(impl[0].model.languages, 'ja', 'es') === true && core.admiteElPar(impl[0].model.languages, 'ja', 'ko') === false);
  check('58) y su tarifa de pago por uso viaja como referencia, lista para el sistema de Credits',
    impl[0].model.pricing.unit === 'kchar' && impl[0].model.pricing.currency === 'USD' && !!impl[0].model.pricing.source);
  check('59) nada de esto tocó Workplaces, Brain, planificador ni Composer',
    conFutura.capabilitiesDisponibles().length === registro.capabilitiesDisponibles().length + 2);
  /* Y una capacidad hermana —documentos, subtítulos— entra igual: añadir un valor. */
  check('60) mañana translation.document entra como una hermana más, sin romper el contrato',
    core.CAPABILITY_CATALOG.filter((c) => c.category === 'translation').length === 2
    && /voz y vídeo entran como capacidades hermanas/.test(leer('functions/src/core/registry/capabilities.ts')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
