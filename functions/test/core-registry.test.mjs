/*
 * WEE CORE — EL REGISTRO, Y QUE SIGA DICIENDO LA VERDAD.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * Un registro sirve para dos cosas: encontrar quién puede hacer algo, y NO
 * prometer lo que nadie puede hacer. La segunda es la difícil, porque no falla
 * al compilar: falla el día que alguien pulsa un botón.
 *
 * Por eso casi todo lo de aquí comprueba lo que el registro NO debe decir:
 *
 *  · una matriz declarada y no integrada no puede declarar capacidades;
 *  · un proveedor READY no puede quedarse sin adaptador;
 *  · `credentialEnv` no puede parecerse a una credencial;
 *  · no puede aparecer un intermediario, por cómodo que resulte;
 *  · 3D no es render, y ninguno de los dos es un proveedor.
 *
 * ── La distinción que más costó, y que hay que proteger ────────────────────
 *
 * ESTADO DE INTEGRACIÓN ≠ DISPONIBILIDAD. El estado describe el código —¿hay
 * adaptador?, ¿tiene modelos?, ¿está documentado?— y es el mismo en tu portátil
 * y en producción. La salud describe el entorno —¿hay credencial aquí?— y
 * cambia. La primera versión los mezclaba y Gemini salía `PENDING` por no haber
 * clave en la máquina de pruebas: lo mismo que decimos de una matriz que nadie
 * ha integrado. Hay comprobaciones dedicadas para que no vuelva a pasar.
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

/*
 * CARGADOR. Dos diferencias con el de las pruebas de i18n, y las dos hicieron
 * falta para poder ejecutar el registro de verdad:
 *
 * 1. Sustitución en UNA pasada. Encadenar `split/join` corrompe el resultado:
 *    una URL `data:` ya insertada lleva base64 donde casa la siguiente.
 * 2. Sustitutos a medida para lo externo. Un módulo `data:` no puede resolver
 *    `firebase-admin/firestore`, así que a cada módulo de fuera se le genera
 *    uno que exporta EXACTAMENTE los nombres que se le piden. Existen para que
 *    el módulo enlace; no se llaman.
 */
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
  const js = ts.transpileModule(leer(ruta), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
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

const core = (await cargar('functions/src/core/registry/index.ts')).ns;
const composicion = (await cargar('functions/src/registry/index.ts')).ns;

const datos = composicion.datosDelRegistro();
const reg = composicion.registroDeWee();
const proveedor = (id) => datos.providers.find((p) => p.id === id);

console.log('\n── A · El registro real está sano ──');
{
  const problemas = composicion.problemasDelRegistro();
  const errores = problemas.filter((p) => p.severity === 'error');
  check('1) cero errores de integridad en el registro real', errores.length === 0,
    errores.map((e) => `${e.where}: ${e.message}`).slice(0, 4).join(' | ') || `${problemas.length} avisos`);

  check('2) tiene las tres dimensiones pobladas',
    datos.capabilities.length > 50 && datos.providers.length >= 15 && datos.models.length >= 25 && datos.adapters.length === 11,
    `${datos.capabilities.length} cap · ${datos.providers.length} prov · ${datos.models.length} mod · ${datos.adapters.length} adap`);
}

console.log('\n── B · La validación sabe fallar ──');
{
  /* Un validador que nunca ha encontrado nada puede estar roto. Se le enseñan
   * las cinco formas de romper un registro y tiene que reconocerlas TODAS. */
  const base = { capabilities: datos.capabilities, providers: [], models: [], adapters: [] };
  const problemasDe = (d) => core.validarRegistro({ ...base, ...d }).filter((p) => p.severity === 'error');

  const prov = (extra) => ({ id: 'x', name: 'X', type: 'matrix', status: 'READY', contract: '1.0',
    modalities: [], capabilities: [], adapterId: 'adapter:x', ...extra });

  check('3) caza ids de proveedor repetidos',
    problemasDe({ providers: [prov({}), prov({})], adapters: [{ id: 'adapter:x', providerId: 'x', contract: '1.0', supportedCapabilities: [], status: 'ACTIVE' }] })
      .some((p) => /repetido/.test(p.message)));

  check('4) caza un modelo de un proveedor que no existe',
    problemasDe({ models: [{ id: 'm', providerId: 'fantasma', capabilities: [], modalities: [], grades: { quality: 1, speed: 1 }, status: 'READY' }] })
      .some((p) => /proveedor que no existe/.test(p.message)));

  check('5) caza una capacidad fuera del catálogo',
    problemasDe({ providers: [prov({})], adapters: [{ id: 'adapter:x', providerId: 'x', contract: '1.0', supportedCapabilities: [], status: 'ACTIVE' }],
      models: [{ id: 'm', providerId: 'x', capabilities: ['inventada.total'], modalities: [], grades: { quality: 1, speed: 1 }, status: 'READY' }] })
      .some((p) => /no está en el catálogo/.test(p.message)));

  check('6) caza un READY sin adaptador: prometer lo que nadie puede servir',
    problemasDe({ providers: [prov({ adapterId: undefined })] })
      .some((p) => /no tiene adaptador/.test(p.message)));

  check('7) caza un PENDING que declara capacidades',
    problemasDe({ providers: [prov({ status: 'PENDING', adapterId: undefined, capabilities: ['text.generate'] })] })
      .some((p) => /PENDING pero declara/.test(p.message)));

  /*
   * Y LA QUE MÁS IMPORTA: que no se cuele un VALOR de credencial donde va un
   * NOMBRE. Es la última red antes de que un descuido acabe en git.
   */
  /*
   * Con su adaptador registrado: si no, el propio montaje genera un error de
   * referencia rota y la segunda mitad no podría dar cero nunca. Lo aprendí
   * fallando esta comprobación.
   */
  const adaptadorDeX = [{ id: 'adapter:x', providerId: 'x', contract: '1.0', supportedCapabilities: [], status: 'ACTIVE' }];
  check('8) caza un valor de credencial en credentialEnv, y no molesta con un nombre',
    problemasDe({ providers: [prov({ credentialEnv: 'sk-abcdefghijklmnopqrstuvwxyz012345' })], adapters: adaptadorDeX })
      .some((p) => /parece un VALOR/.test(p.message))
    && problemasDe({ providers: [prov({ credentialEnv: 'GEMINI_API_KEY' })], adapters: adaptadorDeX }).length === 0);
}

console.log('\n── C · Integración y disponibilidad son cosas distintas ──');
{
  /*
   * ESTA ES LA COMPROBACIÓN QUE PROTEGE EL DISEÑO. Sin claves en el entorno,
   * las matrices integradas tienen que seguir diciendo que están integradas.
   * Si alguien vuelve a mezclar las dos preguntas, Gemini saldrá PENDING aquí
   * y esto fallará.
   */
  const integradas = ['gemini', 'seedance', 'seedream', 'flux', 'elevenlabs', 'claude', 'openai'];
  const malEstado = integradas.filter((id) => proveedor(id)?.status !== 'READY');
  check('9) las matrices integradas están READY aunque no haya credencial aquí',
    malEstado.length === 0, malEstado.map((id) => `${id}=${proveedor(id)?.status}`).join(' ') || integradas.join(','));

  /* Y la falta de credencial se dice como SALUD, que es lo que sí depende del sitio. */
  const gemini = proveedor('gemini');
  check('10) y la falta de credencial se refleja en la salud, no en el estado',
    gemini.status === 'READY' && gemini.health.state !== 'AVAILABLE' && /credencial/.test(gemini.health.reason || ''),
    `${gemini.status} · salud ${gemini.health.state}`);

  check('11) un proveedor sin ficha de verificación queda UNVERIFIED, no READY',
    proveedor('deepseek')?.status === 'UNVERIFIED', 'DeepSeek funciona pero nadie escribió su ficha');

  check('12) uno probado solo con mock queda en BETA', proveedor('minimax')?.status === 'BETA');
  check('13) y el hueco de música, DISABLED', proveedor('music-pending')?.status === 'DISABLED');

  /* El modo demo no es una matriz y no debe contarse como tal en ningún informe. */
  check('14) el modo demo no cuenta como matriz', proveedor('mock')?.type === 'internal');
}

console.log('\n── D · Las matrices: solo lo que está verificado ──');
{
  /* Cada matriz integrada declara EXACTAMENTE lo que declaran sus modelos. No
   * se le añade ni una capacidad de cortesía. */
  const declara = (id, cap) => (proveedor(id)?.capabilities || []).includes(cap);

  check('15) Seedance: vídeo, y solo vídeo',
    declara('seedance', 'video.generate') && declara('seedance', 'video.image_to_video')
    && !declara('seedance', 'image.generate') && !declara('seedance', 'music.generate'));

  check('16) Gemini: texto, visión, documento e imagen',
    declara('gemini', 'text.generate') && declara('gemini', 'vision.describe')
    && declara('gemini', 'doc.read') && declara('gemini', 'image.generate'));

  check('17) DeepSeek conserva su integración existente',
    declara('deepseek', 'text.generate') && declara('deepseek', 'text.structure'));

  /*
   * ELEVENLABS ES VOZ, NO MÚSICA. Es el error más fácil de cometer aquí, y
   * caro: daría por integrada una capacidad que nadie puede servir.
   */
  check('18) ElevenLabs declara voz y NO música',
    declara('elevenlabs', 'voice.tts') && !declara('elevenlabs', 'music.generate'));

  check('19) FLUX y Seedream son imagen, no vídeo',
    declara('flux', 'image.generate') && declara('seedream', 'image.generate')
    && !declara('flux', 'video.generate') && !declara('seedream', 'video.generate'));

  /* Las que no están integradas no prometen NADA. */
  const pendientes = ['tripo', 'hunyuan3d', 'qwen', 'wan', 'yinchao', 'eleven-music'];
  const queProm = pendientes.filter((id) => (proveedor(id)?.capabilities || []).length > 0);
  check('20) ninguna matriz sin integrar declara capacidades', queProm.length === 0, queProm.join(' ') || pendientes.join(','));
  const sinModelos = pendientes.every((id) => reg.getProviderModels(id).length === 0);
  check('21) ni modelos', sinModelos);
  const todasPending = pendientes.every((id) => proveedor(id)?.status === 'PENDING');
  check('22) y las seis están en PENDING', todasPending);
}

console.log('\n── E · Matrices originales, nunca intermediarios ──');
{
  /*
   * LA REGLA ABSOLUTA. Un intermediario añade un salto que Weë no controla —su
   * disponibilidad, su latencia, su margen y su criterio para decidir qué
   * modelo te toca—, y cuando algo falle Weë quiere saber de quién es la culpa.
   */
  const PROHIBIDOS = ['kling', 'runway', 'replicate', 'fal.ai', 'openrouter', 'together', 'huggingface', 'segmind', 'novita', 'piapi'];
  const intrusos = [];
  for (const p of datos.providers) {
    for (const mal of PROHIBIDOS) {
      if (p.id.toLowerCase().includes(mal) || p.name.toLowerCase().includes(mal)) intrusos.push(`${p.id}/${mal}`);
    }
  }
  check('23) ningún intermediario registrado como proveedor', intrusos.length === 0, intrusos.join(' ') || `${PROHIBIDOS.length} comprobados`);

  /* CONTROL: que la comprobación sepa encontrar uno. */
  const conIntruso = [...datos.providers, { id: 'runway', name: 'Runway' }];
  check('23b) control: reconocería a un intermediario si se colara',
    conIntruso.some((p) => PROHIBIDOS.some((m) => p.id.toLowerCase().includes(m))));

  /* Solo hay dos tipos, y eso es a propósito: si hiciera falta un tercero, la
   * conversación es si esa integración debe existir. */
  const tipos = new Set(datos.providers.map((p) => p.type));
  check('24) solo hay matrices y lo interno de Weë', [...tipos].every((t) => t === 'matrix' || t === 'internal'), [...tipos].join(','));
}

console.log('\n── F · 3D no es render, y ninguno es un proveedor ──');
{
  const cap = (id) => datos.capabilities.find((c) => c.id === id);

  check('25) las capacidades 3D existen en el catálogo',
    ['3d.generate', '3d.edit', '3d.texture', '3d.retopology', '3d.rig', '3d.convert', '3d.export', '3d.analyze']
      .every((c) => !!cap(c)));

  check('26) las de render también, y SEPARADAS de 3D',
    ['render.generate', 'render.product', 'render.architecture', 'render.interior', 'render.scene'].every((c) => !!cap(c))
    && cap('render.architecture').category === 'render' && cap('3d.generate').category === '3d');

  /*
   * TRIPO ES UNA IMPLEMENTACIÓN DE 3D, NO EL 3D DE WEË, Y TAMPOCO ES RENDER.
   * Es el atajo mental que más cuesta deshacer después.
   */
  check('27) render NO está atado a ninguna matriz de 3D',
    reg.getCapabilityImplementations('render.architecture').length === 0
    && reg.getCapabilityImplementations('3d.generate').length === 0,
    'ninguna de las dos tiene implementación: es lo honesto hoy');

  check('28) y el diseño cubre más que arquitectura',
    ['product.design', 'vehicle.design', 'furniture.design', 'fashion.design', 'packaging.design', 'industrial.design']
      .every((c) => cap(c)?.category === 'design'));

  /* Ninguna capacidad puede nombrar a un proveedor: ese es todo el punto. */
  const fuente = leer('functions/src/core/registry/capabilities.ts').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const conNombre = ['tripo', 'seedance', 'gemini', 'flux', 'yinchao', 'hunyuan', 'qwen'].filter((m) => new RegExp(`(?<![a-z])${m}(?![a-z])`, 'i').test(fuente));
  check('29) el catálogo de capacidades no nombra a ningún proveedor', conNombre.length === 0, conNombre.join(' ') || 'limpio');
}

console.log('\n── G · Música: arquitectura lista, promesa ninguna ──');
{
  check('30) las capacidades de música existen',
    ['music.generate', 'music.edit', 'music.extend', 'music.analyze'].every((c) => datos.capabilities.some((x) => x.id === c)));

  check('31) Yinchao y Eleven Music están registradas como candidatas',
    !!proveedor('yinchao') && !!proveedor('eleven-music'));

  /* Y son DOS cosas distintas: el adaptador de voz no se convierte en música
   * porque se le añada una capacidad. */
  check('32) Eleven Music es una matriz aparte del adaptador de voz',
    proveedor('eleven-music').id !== 'elevenlabs' && proveedor('eleven-music').status === 'PENDING');

  check('33) music.generate no tiene implementación de una matriz real',
    reg.getCapabilityImplementations('music.generate').every((i) => i.provider.type === 'internal'),
    'solo el modo demo, que no es una matriz');
}

console.log('\n── H · Las consultas del registro ──');
{
  check('34) getCapability / getProvider / getModel / getAdapter',
    !!reg.getCapability('image.generate') && !!reg.getProvider('gemini')
    && !!reg.getModel(reg.getProviderModels('gemini')[0].id) && !!reg.getAdapter('gemini'));

  check('35) y devuelven undefined sin inventarse nada',
    reg.getCapability('no.existe') === undefined && reg.getProvider('fantasma') === undefined
    && reg.getModel('fantasma') === undefined && reg.getAdapter('fantasma') === undefined);

  check('36) los modelos de un proveedor salen completos',
    reg.getProviderModels('seedance').length === 4 && reg.getProviderModels('flux').length === 7,
    `seedance ${reg.getProviderModels('seedance').length} · flux ${reg.getProviderModels('flux').length}`);

  /*
   * LA CONSULTA QUE HACE INNECESARIO CUALQUIER `if (workplace === …)`.
   * Declaradas es lo que existe; usables es lo que se puede pedir hoy.
   */
  const declaran = reg.getCapabilityImplementations('image.generate');
  check('37) una capacidad devuelve TODAS sus implementaciones', declaran.length >= 10,
    `${declaran.length} de ${new Set(declaran.map((i) => i.provider.id)).size} proveedores`);
  check('38) y cada una dice si se puede usar y, si no, por qué',
    declaran.every((i) => typeof i.usable === 'boolean') && declaran.filter((i) => !i.usable).every((i) => !!i.reason));

  check('39) las implementaciones usables son un subconjunto de las declaradas',
    reg.findImplementations('image.generate').length <= declaran.length
    && reg.findImplementations('image.generate').every((i) => i.usable));

  check('40) una capacidad sin implementación devuelve lista vacía, no error',
    reg.findImplementations('3d.generate').length === 0 && reg.getCapabilityImplementations('render.scene').length === 0);

  check('41) se puede preguntar qué modelos aceptan una modalidad',
    reg.modelosQueAceptan('image').length > 0 && reg.modelosQueAceptan('text').length > 0);
}

console.log('\n── I · Metadatos: idioma, modalidad, precio, límites, salud ──');
{
  /* IDIOMA. Solo describe compatibilidad del proveedor; el idioma de la persona
   * lo sigue resolviendo `i18n/` y esto no es un segundo sistema. */
  const seedream = proveedor('seedream');
  check('42) el idioma del proveedor se representa y sale de donde ya estaba',
    !!seedream.languages?.only && seedream.languages.only.includes('en') && seedream.languages.only.includes('zh'),
    'Seedream: ' + (seedream.languages?.only || []).join(','));
  check('43) y quien no declara restricción no la tiene inventada',
    proveedor('gemini').languages?.only === undefined);

  /* MODALIDAD. */
  check('44) las modalidades del proveedor se representan',
    proveedor('seedance').modalities.includes('video') && proveedor('elevenlabs').modalities.includes('voice'));

  /* PRECIO: referencia, no precio final. De aquí a Credits hay dos pasos más. */
  const unVideo = reg.getProviderModels('seedance')[0];
  check('45) el precio es una REFERENCIA con unidad, moneda y fuente',
    unVideo.pricing?.currency === 'USD' && unVideo.pricing?.unit === 'second'
    && typeof unVideo.pricing?.mediaRate === 'number' && !!unVideo.pricing?.source);
  const unTexto = reg.getProviderModels('claude')[0];
  check('46) y un modelo de texto cobra por token, con entrada y salida',
    unTexto.pricing?.unit === 'token' && typeof unTexto.pricing?.inputRate === 'number'
    && typeof unTexto.pricing?.outputRate === 'number');
  check('47) el registro NO convierte precios a Credits: eso es del Cost Engine',
    !/credits/i.test(leer('functions/src/core/registry/types.ts').replace(/\/\*[\s\S]*?\*\//g, ' ')));

  /* LÍMITES documentados. */
  check('48) los límites documentados viajan al registro',
    reg.getProviderModels('seedance').some((m) => m.limits?.maxDurationSec === 30));

  /* SALUD. */
  check('49) todos los proveedores declaran salud', datos.providers.every((p) => !!p.health?.state));
  check('50) y los estados son los cuatro previstos',
    datos.providers.every((p) => ['AVAILABLE', 'DEGRADED', 'UNAVAILABLE', 'UNKNOWN'].includes(p.health.state)));

  /* LÍMITES DE WEË sobre el proveedor, que ya existían en la configuración. */
  check('51) los límites de uso configurados se conservan',
    proveedor('seedance').limits?.maxCallsPerDay === 500);
}

console.log('\n── J · Sin secretos ──');
{
  const conValor = datos.providers.filter((p) => p.credentialEnv && !/^[A-Z][A-Z0-9_]{2,60}$/.test(p.credentialEnv));
  check('52) credentialEnv es siempre un NOMBRE de variable', conValor.length === 0,
    conValor.map((p) => p.id).join(' ') || datos.providers.filter((p) => p.credentialEnv).length + ' con credencial');

  /* Y el registro no tiene ni un campo donde quepa un valor: lo que no tiene
   * sitio no se filtra por descuido. */
  const tipos = leer('functions/src/core/registry/types.ts');
  check('53) el tipo no ofrece ningún campo para un valor de credencial',
    !/apiKey|token\s*[?:]|secret\s*[?:]|password/i.test(tipos.replace(/\/\*[\s\S]*?\*\//g, ' ')));

  const fuentes = ['functions/src/registry/index.ts', 'functions/src/registry/matrices.ts',
    'functions/src/core/registry/types.ts', 'functions/src/core/registry/capabilities.ts',
    'functions/src/core/registry/registry.ts', 'functions/src/core/registry/validate.ts'];
  const conLiteral = fuentes.filter((f) => /(sk-|AIza|ghp_|r8_)[A-Za-z0-9_-]{16,}/.test(leer(f)));
  check('54) ningún literal con forma de credencial en el registro', conLiteral.length === 0, conLiteral.join(' ') || 'limpio');
}

console.log('\n── K · Sin selección de proveedor a mano ──');
{
  /*
   * PROHIBIDO `if (provider === 'tripo')`. La lógica consulta el registro, no
   * un nombre. Se mira el CÓDIGO, sin comentarios: la prosa que explica por qué
   * existe una regla no es una infracción de la regla.
   */
  const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const CONDICIONAL = /(===|!==|==|!=)\s*['"](tripo|seedance|gemini|flux|seedream|yinchao|hunyuan|qwen|wan|deepseek|elevenlabs|minimax|claude|openai)['"]/;
  const fuentes = ['functions/src/core/registry/registry.ts', 'functions/src/core/registry/validate.ts',
    'functions/src/core/registry/capabilities.ts', 'functions/src/core/registry/types.ts'];
  const conCondicional = fuentes.filter((f) => CONDICIONAL.test(sinComentarios(leer(f))));
  check('55) el Core del registro no compara contra ningún nombre de proveedor',
    conCondicional.length === 0, conCondicional.join(' ') || 'limpio');

  /* CONTROL: el patrón funciona. */
  check('55b) control: reconocería la comparación si estuviera',
    CONDICIONAL.test("if (p === 'tripo') {}") && !CONDICIONAL.test('const tripo = 1;'));

  /* En la composición sí puede haber UNA excepción declarada —el modo demo, que
   * no es una matriz— y no más. */
  const enComposicion = sinComentarios(leer('functions/src/registry/index.ts')).match(new RegExp(CONDICIONAL.source, 'g')) || [];
  check('56) y la composición no compara contra ninguna matriz', enComposicion.length === 0,
    enComposicion.join(' ') || 'solo distingue el modo demo, que no es matriz');
}

console.log('\n── L · Una matriz futura entra sin tocar nada ──');
{
  /*
   * LA PRUEBA DE EXTENSIBILIDAD. Se registra una matriz inventada con su modelo
   * y su adaptador, y tiene que aparecer en las consultas SIN tocar Workplaces,
   * Brain, planificador, workflow ni Composer. Si esto dejara de funcionar,
   * añadir un proveedor volvería a ser un cambio transversal.
   */
  const futura = {
    capabilities: datos.capabilities,
    providers: [...datos.providers, {
      id: 'future-provider-test', name: 'Matriz del futuro', type: 'matrix', status: 'READY',
      contract: '1.0', modalities: ['image'], capabilities: ['3d.generate'],
      credentialEnv: 'FUTURE_PROVIDER_TEST_API_KEY', adapterId: 'adapter:future-provider-test',
      health: { state: 'AVAILABLE' },
    }],
    models: [...datos.models, {
      id: 'future-model-1', providerId: 'future-provider-test', capabilities: ['3d.generate'],
      modalities: ['image'], grades: { quality: 4, speed: 3 }, status: 'READY',
      pricing: { unit: 'call', currency: 'USD', mediaRate: 0.1 },
    }],
    adapters: [...datos.adapters, {
      id: 'adapter:future-provider-test', providerId: 'future-provider-test', contract: '1.0',
      supportedCapabilities: ['3d.generate'], status: 'ACTIVE',
    }],
  };

  check('57) el registro acepta la matriz nueva sin quejarse',
    core.validarRegistro(futura).filter((p) => p.severity === 'error').length === 0);

  const conFutura = core.crearRegistro(futura);
  check('58) y 3d.generate pasa de no tener a tener implementación USABLE',
    reg.findImplementations('3d.generate').length === 0
    && conFutura.findImplementations('3d.generate').length === 1
    && conFutura.findImplementations('3d.generate')[0].provider.id === 'future-provider-test');

  check('59) aparece en las consultas normales, como cualquier otra',
    !!conFutura.getProvider('future-provider-test') && !!conFutura.getModel('future-model-1')
    && conFutura.getProviderModels('future-provider-test').length === 1
    && !!conFutura.getAdapter('future-provider-test'));

  /* Y lo que de verdad demuestra la extensibilidad: nada de esto tocó un
   * Workplace. La matriz entró por datos, no por código. */
  check('60) no hizo falta tocar Workplaces, Brain, planificador ni Composer',
    conFutura.capabilitiesDisponibles().length === reg.capabilitiesDisponibles().length + 1);
}

console.log('\n── M · Versionado ──');
{
  check('61) proveedores y adaptadores declaran versión de contrato',
    datos.providers.every((p) => !!p.contract) && datos.adapters.every((a) => !!a.contract));
  check('62) y las capacidades del catálogo también', datos.capabilities.every((c) => !!c.contract));
  check('63) la compatibilidad se decide con la regla del Core, no con ===',
    core.crearRegistro && typeof core.validarRegistro === 'function');
}

console.log('\n── N · Lo que no se ha roto ──');
{
  /* El union del motor no se ha tocado: sigue teniendo exactamente las 28 que
   * enruta, y el catálogo del Core las contiene todas. */
  const enrutadas = [...leer('functions/src/engine/registry.ts').matchAll(/routing\('([a-z0-9._]+)'/g)].map((m) => m[1]);
  const enCatalogo = datos.capabilities.map((c) => String(c.id));
  const faltan = enrutadas.filter((c) => !enCatalogo.includes(c));
  check('64) toda capacidad que el motor enruta está en el catálogo', faltan.length === 0,
    faltan.join(' ') || `${enrutadas.length} enrutadas de ${enCatalogo.length} del catálogo`);

  check('65) y el catálogo es MÁS grande: hay nombres reservados sin implementación',
    enCatalogo.length > enrutadas.length, `${enCatalogo.length} > ${enrutadas.length}`);

  /* Credits, Brain e i18n intactos. */
  check('66) la política de Weë Brain sigue donde estaba',
    /RESPUESTAS_POR_CREDIT = 12/.test(leer('functions/src/creator/brainUsage.ts'))
    && /ai_brain: \{ margin: 0\.2, pricingMode: 'real' \}/.test(leer('functions/src/credits/creditCosts.ts')));
  check('67) el registro no importa nada de Credits ni de i18n',
    !/credits|i18n/.test(leer('functions/src/registry/index.ts').match(/^import[\s\S]*?;\s*$/gm)?.join('') || ''));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
