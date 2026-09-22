/**
 * WEË CONTINUITY — C7: LO QUE UNA IMPLEMENTACIÓN CONCRETA PUEDE INTENTAR.
 *
 * ── Lo que la auditoría encontró, y que decide toda esta suite ──────────────
 *
 * Ningún adaptador de Weë tiene hoy un control que preserve un aspecto
 * concreto. Ninguno tiene «conserva el rostro». Lo que hay —donde hay algo— es
 * CONDICIONAMIENTO POR REFERENCIA: se pasan imágenes y el modelo se parece a
 * ellas. Sirve, pero no distingue un rostro de una fachada y no promete nada.
 *
 * Por eso lo máximo que aquí se declara es `partial`. Y por eso una frase en el
 * prompt —«keep the identity and features of the person»— se clasifica como
 * `unsupported`: pedirle por escrito a un modelo que no cambie una cara no es
 * un mecanismo, es una esperanza, y contarla como soporte sería la mentira más
 * cara del sistema.
 *
 * Usa el compilado: `npm run build` antes de `npm test`.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0;
let n = 0;
const check = (name, cond, extra = '') => {
  n++;
  console.log((cond ? '✔ ' : '✘ ') + `${n} · ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const core = lib('core/index.js');
const { traducirContinuidad, cubreLoExigido, aspectosQueSostiene, materialDeLaEntrada } = lib('engine/continuidad.js');
const { revisarAntesDeEjecutar, continuidadValida } = core;

/* Los mecanismos REALES, leídos del código de cada adaptador. */
const CONDICIONAMIENTO = { referenciasDeImagen: 8, referenciasDeVideo: 0, controlesDedicados: [], admiteFuerza: false };
const UNA_SOLA = { referenciasDeImagen: 1, referenciasDeVideo: 0, controlesDedicados: [], admiteFuerza: false };
const SOLO_PROMPT = { referenciasDeImagen: 0, referenciasDeVideo: 0, controlesDedicados: [], soloPorPrompt: true, admiteFuerza: false };
const SIN_NADA = { referenciasDeImagen: 0, referenciasDeVideo: 0, controlesDedicados: [], admiteFuerza: false };

const HAY = { imagenes: 3, videos: 0 };
const NO_HAY = { imagenes: 0, videos: 0 };

const REQ = {
  preserve: ['identity.face', 'architecture.geometry', 'product.identity'],
  mayChange: ['outfit.clothing', 'lighting.type'],
  anchors: [{ elementId: 'el_luna_0001', version: 4 }, { elementId: 'el_casa_0001', version: 2 }],
  strength: 'strict',
};
const de = (a, t) => t.aspects.find((x) => x.aspect === a);

console.log('\n── A · 1 · Sin requisito, nada cambia ──');

check('§1 · sin continuidad no hay traducción, y el adaptador se comporta igual',
  traducirContinuidad(undefined, CONDICIONAMIENTO, HAY) === undefined
  && traducirContinuidad({ preserve: [] }, CONDICIONAMIENTO, HAY) === undefined);
check('§49 · y la ficha de salida solo crece cuando hubo requisito',
  /\.\.\.\(continuidad\s*\?\s*\{/.test(sinComentarios(leer('functions/src/engine/providers/flux.ts'))));

console.log('\n── B · 2..4 · Lo que se puede intentar, y hasta dónde ──');

const conRef = traducirContinuidad(REQ, CONDICIONAMIENTO, HAY);
check('§2/3/4 · con condicionamiento y material, cada aspecto exigido sale PARCIAL, no soportado',
  conRef.aspects.length === 3 && conRef.aspects.every((a) => a.support === 'partial' && a.reason === 'reference_conditioning'),
  conRef.aspects.map((a) => `${a.aspect}:${a.support}`).join(' '));
check('§2 · y `partial` NO es `supported`: una referencia no promete un rostro',
  de('identity.face', conRef).support !== 'supported');
check('§4 · los aspectos son independientes: uno no arrastra a otro',
  new Set(conRef.aspects.map((a) => a.aspect)).size === 3);
check('§20 · lo LIBERADO no se traduce: no se le pide nada al proveedor por ello',
  !conRef.aspects.some((a) => a.aspect === 'outfit.clothing' || a.aspect === 'lighting.type'));

console.log('\n── C · 12..14 · Lo no soportado nunca se ignora ──');

const soloTexto = traducirContinuidad(REQ, SOLO_PROMPT, HAY);
check('§12/13 · una frase en el prompt NO es soporte: sale `unsupported` con su motivo',
  soloTexto.aspects.every((a) => a.support === 'unsupported' && a.reason === 'prompt_only'),
  soloTexto.aspects.map((a) => a.reason).join(','));
check('§13 · y lo exigido que no se sostiene se NOMBRA, no se calla',
  soloTexto.noCubiertos.join(',') === 'identity.face,architecture.geometry,product.identity');
const sinMecanismo = traducirContinuidad(REQ, SIN_NADA, HAY);
check('§12 · sin hueco donde meter una referencia, tampoco hay soporte',
  sinMecanismo.aspects.every((a) => a.reason === 'no_mechanism') && sinMecanismo.noCubiertos.length === 3);
const sinMaterial = traducirContinuidad(REQ, CONDICIONAMIENTO, NO_HAY);
check('§14 · hay mecanismo pero no llegó material: se distingue, y no se ejecuta como si hubiera',
  sinMaterial.aspects.every((a) => a.support === 'unsupported' && a.reason === 'missing_material')
  && sinMaterial.noCubiertos.length === 3);
check('§13 · `cubreLoExigido` es falso en los tres casos, y cierto cuando sí se sostiene',
  !cubreLoExigido(soloTexto) && !cubreLoExigido(sinMecanismo) && !cubreLoExigido(sinMaterial)
  && cubreLoExigido(conRef));

console.log('\n── D · 5..7 · La fuerza no se baja ──');

check('§5 · `strict` viaja tal cual, y se dice que nadie sabe traducirla',
  conRef.strength === 'strict' && conRef.fuerzaSinTraducir === true);
check('§6/7 · lo mismo con `standard` y `relaxed`: se transportan, no se fingen',
  traducirContinuidad({ preserve: ['identity.face'], strength: 'standard' }, CONDICIONAMIENTO, HAY).strength === 'standard'
  && traducirContinuidad({ preserve: ['identity.face'], strength: 'relaxed' }, CONDICIONAMIENTO, HAY).strength === 'relaxed');
check('§5 · y si un día alguien la tradujera, se notaría',
  traducirContinuidad({ preserve: ['identity.face'], strength: 'strict' },
    { ...CONDICIONAMIENTO, admiteFuerza: true }, HAY).fuerzaSinTraducir === false);
check('ningún adaptador declara hoy saber traducir la fuerza',
  /admiteFuerza: false/.test(leer('functions/src/engine/providers/flux.ts')));

console.log('\n── E · 8..10/28 · Referencias: ni se tocan ni derivan ──');

check('§8/9/16/28 · el adaptador NO ve ni toca `elementId` ni `version`: no hay dónde',
  !/elementId|\.version\b/.test(sinComentarios(leer('functions/src/engine/continuidad.ts')))
  && !/elementId/.test(sinComentarios(leer('functions/src/engine/providers/flux.ts'))));
check('§10 · y las referencias se CUENTAN de la entrada, no se buscan',
  materialDeLaEntrada({ imageUrl: 'a', referenceImages: ['b', 'c'], referenceUrls: ['d'] }).imagenes === 4
  && materialDeLaEntrada(undefined).imagenes === 0);
check('§10 · con más referencias que huecos, se dice cuántas se quedan fuera',
  traducirContinuidad(REQ, UNA_SOLA, { imagenes: 3 }).referenciasDescartadas === 2
  && traducirContinuidad(REQ, UNA_SOLA, { imagenes: 3 }).referenciasUsadas === 1);

console.log('\n── F · 11/19 · Lo espacial y lo que no existe ──');

const esp = traducirContinuidad({ preserve: ['spatial.relationships'], spatial: [{ subject: 'a_0001', relation: 'next_to', object: 'b_0001' }] }, CONDICIONAMIENTO, HAY);
check('§11/19 · una relación espacial NO se convierte en prompt ni se declara soportada',
  de('spatial.relationships', esp).support === 'partial'
  && !/next_to|al lado de|spatial/i.test(sinComentarios(leer('functions/src/engine/providers/flux.ts'))),
  'ningún adaptador tiene mecanismo espacial: la referencia es lo único que hay');
check('§19 · y no se inventa un control dedicado para nada',
  aspectosQueSostiene(traducirContinuidad({ preserve: ['identity.face'] }, SIN_NADA, HAY)).length === 0);
check('un control dedicado, SI algún día existiera, sí diría `supported`',
  de('identity.face', traducirContinuidad({ preserve: ['identity.face'] },
    { ...CONDICIONAMIENTO, controlesDedicados: ['identity.face'] }, HAY)).support === 'supported');

console.log('\n── G · 33 · El caso dorado ──');

const dorado = traducirContinuidad(REQ, CONDICIONAMIENTO, HAY);
check('§33.1 · recibe exactamente los requisitos que le dieron', continuidadValida(REQ) && dorado.aspects.length === REQ.preserve.length);
check('§33.2 · conserva las referencias: no las cuenta como suyas ni las modifica',
  REQ.anchors.map((a) => `${a.elementId}@${a.version}`).join(' ') === 'el_luna_0001@4 el_casa_0001@2');
check('§33.3/33.4 · declara el mapping SOLO donde existe, y no inventa capacidades',
  dorado.aspects.every((a) => a.support === 'partial') && !dorado.aspects.some((a) => a.support === 'supported'));
check('§33.5 · y no cambia la semántica: los tres aspectos salen con su nombre exacto',
  dorado.aspects.map((a) => a.aspect).join(',') === REQ.preserve.join(','));

console.log('\n── H · 6/17..19 · Traducción ≠ validación, y lo incompleto no se traduce ──');

check('§6/27 · traducir no valida: aquí no hay `pass`, ni parecido, ni puntuación',
  !/pass|similarity|score|matches_reference/i.test(sinComentarios(leer('functions/src/engine/continuidad.ts'))));
check('§17/18/19 · sin `preserve` no hay nada que traducir: lo incompleto no llega como resuelto',
  traducirContinuidad({ mayChange: ['outfit.clothing'] }, CONDICIONAMIENTO, HAY) === undefined
  && traducirContinuidad({ preserve: [] }, CONDICIONAMIENTO, HAY) === undefined);
check('y lo que sostiene alimenta la comprobación PREVIA de C2, sin conectarla',
  revisarAntesDeEjecutar({ preserve: ['identity.face'] },
    { preserves: aspectosQueSostiene(conRef) }).ok === true
  && revisarAntesDeEjecutar({ preserve: ['identity.face'] },
    { preserves: aspectosQueSostiene(soloTexto) }).status === 'pre_execution_rejected');

console.log('\n── I · 21..30 · Lo que un adaptador NO hace ──');

{
  const TR = sinComentarios(leer('functions/src/engine/continuidad.ts'));
  check('§21/22 · no elige proveedor ni modelo', !/ADAPTERS|crearRouter|elegirModelo|providerId|modelId/.test(TR));
  check('§23 · no enruta ni hace respaldo', !/fallback|router|Router|siguienteProveedor/.test(TR));
  check('§24 · no reintenta', !/retry|reintent/i.test(TR));
  check('§25 · no cobra', !/credit|Credit|spend|refund/i.test(TR));
  check('§26 · no crea trabajos', !/crearTrabajo|JobStore|Job\b/.test(TR));
  check('§27 · no valida el resultado generado', !/validar|verdict|veredicto/i.test(TR));
  check('§28 · no crea materiales', !/crearMaterial|persistRemoteFile|Asset/.test(TR));
  check('§29/30 · no llama a Brain ni al Planner', !/Brain|Planner|planificar|pensar/.test(TR));
  check('y no lee nada: ni red, ni disco, ni base de datos',
    !/fetch\(|firestore|firebase|getFirestore|await /.test(TR));
}

console.log('\n── J · 35 · El Core sigue sin saber de proveedores ──');

{
  const PROVEEDORES = /(?<![a-z])(gemini|seedance|seedream|deepseek|openai|claude|anthropic|elevenlabs|minimax|flux|bytedance|byteplus)(?![a-z])/i;
  for (const f of ['core/continuity.ts', 'core/continuity-intent.ts', 'core/continuity-check.ts', 'core/planner.ts', 'core/gateway.ts']) {
    check(`35) \`${f}\` no nombra a ningún proveedor`, !PROVEEDORES.test(leer(`functions/src/${f}`)), f);
  }
  check('§35 · y la traducción, que SÍ está del lado del adaptador, tampoco nombra a ninguno',
    !PROVEEDORES.test(leer('functions/src/engine/continuidad.ts')),
    'el mecanismo lo declara cada adaptador, no este archivo');
  check('§36 · no hay un registro paralelo de continuidad',
    !/ContinuityRegistry|registroDeContinuidad/.test(leer('functions/src/engine/continuidad.ts')));
}

console.log('\n── K · 50/51 · C6 no se rompe, y su bug no vuelve ──');

check('§51 · el Gateway sigue entregando las pistas ENTERAS al adaptador',
  /\.\.\.\(execution\.hints \? \{ hints: execution\.hints \} : \{\}\)/.test(sinComentarios(leer('functions/src/engine/gateway.ts'))));
check('§51 · y el adaptador las lee de ahí, no de un canal nuevo',
  /request\.hints\?\.continuity/.test(leer('functions/src/engine/providers/flux.ts')));
check('§50 · C1..C6 intactos: ninguno sabe de traducción',
  ['core/continuity.ts', 'core/shot.ts', 'core/continuity-check.ts', 'core/continuity-intent.ts']
    .every((f) => !/traducirContinuidad|MecanismoDeContinuidad/.test(leer(`functions/src/${f}`))));
check('§37/38 · el Router no cambió y `revisarAntesDeEjecutar` sigue sin conectarse',
  !/continuity|revisarAntesDeEjecutar/.test(leer('functions/src/core/router.ts'))
  && !/revisarAntesDeEjecutar/.test(leer('functions/src/router/politica.ts')));
check('esta suite está en la cadena de `npm test`', /continuidad-adapter\.test\.mjs/.test(leer('functions/package.json')));

console.log('\n── L · 52..55 · Los tres adaptadores que SÍ tienen mecanismo ──');

const CABLEADOS = ['flux', 'seedance', 'gemini'];
for (const nombre of CABLEADOS) {
  const src = leer(`functions/src/engine/providers/${nombre}.ts`);
  check(`${nombre}: declara su mecanismo y lo traduce, sin tocar el prompt`,
    /mecanismoDeContinuidad/.test(src) && /traducirContinuidad\(/.test(src)
    && /request\.hints\?\.continuity/.test(src));
  check(`${nombre}: declara CERO controles dedicados, porque no tiene ninguno`,
    /controlesDedicados: \[\]/.test(src) && /admiteFuerza: false/.test(src));
  check(`${nombre}: no ve anclajes ni versiones de elemento`,
    !/elementId/.test(sinComentarios(src)));
}

check('seedance: los huecos dependen de la CAPACIDAD, no solo del modelo',
  /capability === 'video\.reference'/.test(leer('functions/src/engine/providers/seedance.ts')),
  'un texto a video no tiene dónde meter una referencia');
check('gemini: su tope de referencias sale de una sola constante',
  /MAX_REFERENCIAS_DE_IMAGEN = 4/.test(leer('functions/src/engine/providers/gemini.ts'))
  && /referenciasDeImagen: .*MAX_REFERENCIAS_DE_IMAGEN/.test(leer('functions/src/engine/providers/gemini.ts'))
  && /urls\.slice\(0, MAX_REFERENCIAS_DE_IMAGEN\)/.test(leer('functions/src/engine/providers/gemini.ts')),
  'el tope declarado y el tope aplicado salen del mismo sitio');
check('gemini: la frase de identidad SIGUE en el prompt, y NO cuenta como soporte',
  /'image\.identity_edit': 'Keep the identity/.test(leer('functions/src/engine/providers/gemini.ts')),
  'está medida, no borrada: lo que se niega es que sea un mecanismo');

{
  /* Los que no tienen mecanismo no fingen tenerlo: no se cablean. */
  const SIN_MECANISMO = ['claude', 'deepseek', 'openai', 'elevenlabs', 'music', 'minimax', 'seedream'];
  const mentirosos = SIN_MECANISMO.filter((nombre) => {
    try { return /traducirContinuidad/.test(leer(`functions/src/engine/providers/${nombre}.ts`)); }
    catch { return false; }
  });
  check('§54 · los adaptadores sin mecanismo NO declaran uno', mentirosos.length === 0,
    mentirosos.length ? mentirosos.join(',') : 'ninguno finge');
}

console.log('\n── M · 56 · EL HUECO, medido y no tapado ──');

{
  /*
   * NADIE convierte hoy un `elementId@version` en una URL de referencia. El
   * mecanismo parcial existe, pero no hay quien lo alimente desde un anclaje:
   * el material que llega sale de la foto que subió la persona, no del elemento
   * guardado. Esto NO se arregla aquí —C7 traduce, no materializa— pero se mide,
   * para que el día que alguien lo construya este guard se caiga y lo diga.
   */
  const FUENTES = ['functions/src/creator/inputs.ts', 'functions/src/engine/video.ts', 'functions/src/engine/gateway.ts'];
  const materializa = FUENTES.filter((f) => /elementId/.test(sinComentarios(leer(f))));
  check('§56 · HUECO CONOCIDO: nadie materializa un anclaje en material de referencia',
    materializa.length === 0,
    materializa.length ? 'YA LO HACE: ' + materializa.join(',') : 'la traducción parcial no se puede ejercer de punta a punta todavía');
  check('§56 · y por eso, con anclajes pero sin material, la respuesta honrada es missing_material',
    traducirContinuidad(REQ, CONDICIONAMIENTO, NO_HAY).aspects.every((a) => a.reason === 'missing_material'),
    'no se ejecuta como si hubiera referencias');
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
