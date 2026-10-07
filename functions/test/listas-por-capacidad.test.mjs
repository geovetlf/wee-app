/**
 * UNA LISTA DE CUENTAS POR CAPACIDAD (misión «cierre final de gobernanza y cost accounting de World 3D», 2026-10-06).
 *
 * La puerta del runtime (`aiSettings/runtime`, `runtime/puerta.ts`) llevaba UNA lista para todas: la del canario de
 * Weë Brain, la del vídeo y la del mundo eran la misma, y sin ella brainChat y generateVideo dejaban pasar a todo el
 * mundo. Ahora cada capacidad lleva la suya (`porCapacidad`), obligatoria para las tres puertas, sin comodín y sin
 * respaldo de ninguna otra. La misma puerta, la misma lectura, la misma función: no hay un sistema de permisos nuevo.
 *
 *   A · Las diez de la misión: cada lista funciona, vacía o ausente no pasa nadie, la del mundo no abre el vídeo ni al
 *       revés, una configuración no amplía otra capacidad, el comodín no existe, y todo lo dudoso cierra.
 *   B · La configuración no cambia la regla: claves de más, `listaObligatoria`, igualdad exacta, listas rotas.
 *   C · Las tres puertas, en su código: cada una su capacidad, la cuenta de la sesión, ninguna excepción.
 *   D · Volver atrás: la forma de antes cierra en el código de ahora, y la de ahora cierra en el código de antes.
 *   E · Lo guardado, leído de Firestore: un minuto de memoria, y una lectura que falla cierra.
 *   F · Lo que sigue cerrado: nada abierto, ninguna escritura en producción, ningún otro documento.
 *
 * Sin red, sin Firebase, sin proveedor. $0.
 *
 *   node functions/test/listas-por-capacidad.test.mjs     (usa el compilado: `npm run build` antes)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '../..');
const lib = (p) => require(path.resolve(AQUI, '../lib/', p));
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const { decidirRuntime, leerPuerta, PUERTA_CERRADA } = lib('runtime/puerta.js');
const { configuracionDeLaPuerta, olvidarLaPuerta, COLECCION_DE_LA_PUERTA, DOCUMENTO_DE_LA_PUERTA } = lib('runtime/configuracion.js');

/* Las tres puertas del conductor: su capacidad y su producto, como las declaran en su código. */
const BRAIN = { capability: 'text.generate', experienceId: 'brain' };
const VIDEO = { capability: 'video.generate', experienceId: 'studio' };
const MUNDO = { capability: 'world.generate', experienceId: 'studio' };
const PUERTAS = { brain: BRAIN, video: VIDEO, mundo: MUNDO };
const ANA = 'cuentaAna0001';
const BEA = 'cuentaBea0001';
const CIRO = 'cuentaCiro001';
const decide = (config, puerta, userId) => decidirRuntime(config, { ...puerta, userId });
const pasa = (config, puerta, userId) => decide(config, puerta, userId).runtime === 'core';
const con = (porCapacidad, extra = {}) => ({ habilitado: true, porCapacidad, ...extra });
/** Quién pasa por cada puerta con esta configuración, para comparar de un vistazo. */
const mapa = (config, cuentas = [ANA, BEA, CIRO]) => Object.fromEntries(Object.entries(PUERTAS).map(([nombre, p]) => [nombre, cuentas.filter((c) => pasa(config, p, c))]));
const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ═══ A · LAS DIEZ DE LA MISIÓN ═════════════════════════════════════════════ */
console.log('── A · Una lista por capacidad: las diez de la misión ──');
{
  const brain = con({ 'text.generate': { cuentas: [ANA] } });
  check('A1) la lista de brainChat funciona: solo su cuenta pasa, y solo por su puerta',
    iguales(mapa(brain), { brain: [ANA], video: [], mundo: [] }) && decide(brain, BRAIN, BEA).motivo === 'cuenta_fuera_de_la_prueba');

  const video = con({ 'video.generate': { cuentas: [BEA] } });
  check('A2) la lista del vídeo funciona: solo su cuenta pasa, y solo por su puerta',
    iguales(mapa(video), { brain: [], video: [BEA], mundo: [] }) && decide(video, VIDEO, ANA).motivo === 'cuenta_fuera_de_la_prueba');

  const mundo = con({ 'world.generate': { cuentas: [CIRO] } });
  check('A3) la lista del mundo funciona: solo su cuenta pasa, y solo por su puerta',
    iguales(mapa(mundo), { brain: [], video: [], mundo: [CIRO] }) && decide(mundo, MUNDO, ANA).motivo === 'cuenta_fuera_de_la_prueba');

  const vacias = con({ 'text.generate': { cuentas: [] }, 'video.generate': { cuentas: [] }, 'world.generate': { cuentas: [] } });
  check('A4) la lista VACÍA no deja pasar a nadie, en ninguna de las tres',
    iguales(mapa(vacias), { brain: [], video: [], mundo: [] })
    && Object.values(PUERTAS).every((p) => decide(vacias, p, ANA).motivo === 'sin_lista_de_cuentas'));

  const sinLista = con({ 'text.generate': {}, 'video.generate': { experiencias: ['studio'] }, 'world.generate': { experiencias: ['studio'] } });
  check('A5) la lista AUSENTE tampoco: una capacidad sin lista, sin entrada, o un documento sin `porCapacidad`, no deja pasar a nadie',
    iguales(mapa(sinLista), { brain: [], video: [], mundo: [] })
    && Object.values(PUERTAS).every((p) => decide(sinLista, p, ANA).motivo === 'sin_lista_de_cuentas')
    && Object.values(PUERTAS).every((p) => decide(con({}), p, ANA).motivo === 'capacidad_no_migrada')
    && Object.values(PUERTAS).every((p) => decide({ habilitado: true }, p, ANA).motivo === 'capacidad_no_migrada'));

  const soloMundo = con({ 'world.generate': { cuentas: [ANA] }, 'video.generate': { cuentas: [BEA] } });
  check('A6) una cuenta en el MUNDO y no en el VÍDEO: el mundo sí, el vídeo no',
    pasa(soloMundo, MUNDO, ANA) && !pasa(soloMundo, VIDEO, ANA) && decide(soloMundo, VIDEO, ANA).motivo === 'cuenta_fuera_de_la_prueba');
  check('A7) y una cuenta en el VÍDEO y no en el MUNDO: al revés',
    pasa(soloMundo, VIDEO, BEA) && !pasa(soloMundo, MUNDO, BEA) && decide(soloMundo, MUNDO, BEA).motivo === 'cuenta_fuera_de_la_prueba');

  /* A8 · Configurar una puerta no mueve las otras: para cada cuenta, lo que deciden brain y vídeo es el mismo con o sin la entrada del mundo, y con la del mundo llena o vacía. */
  const base = con({ 'text.generate': { cuentas: [ANA] }, 'video.generate': { cuentas: [BEA] } });
  const conElMundo = (cuentas) => con({ ...base.porCapacidad, 'world.generate': { cuentas } });
  const decisiones = (config) => [ANA, BEA, CIRO].map((c) => [decide(config, BRAIN, c), decide(config, VIDEO, c)]);
  check('A8) una configuración NO amplía otra capacidad: poner, vaciar o llenar la lista del mundo no cambia nada de lo que deciden brainChat y generateVideo, y al revés',
    iguales(decisiones(base), decisiones(conElMundo([ANA, BEA, CIRO]))) && iguales(decisiones(base), decisiones(conElMundo([])))
    && iguales([ANA, BEA, CIRO].map((c) => decide(conElMundo([CIRO]), MUNDO, c)), [ANA, BEA, CIRO].map((c) => decide(con({ ...conElMundo([CIRO]).porCapacidad, 'text.generate': { cuentas: [ANA, BEA, CIRO] } }), MUNDO, c))));

  const comodines = [
    con({ 'world.generate': { cuentas: ['*'] } }),
    con({ 'world.generate': { cuentas: [ANA, '*'] } }),
    con({ '*': { cuentas: [ANA] } }),
    con({ 'world.*': { cuentas: [ANA] } }),
    con({ '*.generate': { cuentas: [ANA] } }),
    con({ 'world.generate': { cuentas: ['cuenta*'] } }),
    con({ 'world.generate': { cuentas: ['.*'] } }),
  ];
  check('A9) el COMODÍN no existe: «*» o un patrón en una cuenta o en una capacidad hacen ilegible el documento y la puerta se CIERRA para todos, también para la cuenta nombrada',
    comodines.every((c) => Object.values(PUERTAS).every((p) => [ANA, BEA, CIRO].every((u) => decide(c, p, u).runtime === 'legacy')))
    && comodines.every((c) => decide(c, MUNDO, ANA).motivo === 'configuracion_ilegible'));
  check('A9) y una cuenta llamada «todos» es solo una cuenta: no abre para nadie más',
    iguales(mapa(con({ 'world.generate': { cuentas: ['todos', 'all', 'everyone'] } })), { brain: [], video: [], mundo: [] }));

  const dudosas = [undefined, null, 'abierta', 42, [], {}, { habilitado: 'true' }, { habilitado: true, porCapacidad: [] }, { habilitado: true, porCapacidad: 'world.generate' },
    con({ 'world.generate': null }), con({ 'world.generate': { cuentas: null } }), con({ 'world.generate': { cuentas: ANA } }), con({ 'world.generate': { cuentas: [ANA, 7] } }),
    con({ 'world.generate': { cuentas: [ANA, ''] } }), con({ 'world.generate': { cuentas: [ANA], experiencias: 'studio' } }), con({ 'WORLD.GENERATE': { cuentas: [ANA] } }),
    con({ 'world.generate': { cuentas: Array.from({ length: 257 }, (_, i) => `c${i}`) } })];
  check('A10) FALLA CERRADO: sin documento, ilegible, a medias o con una lista rota, ninguna de las tres deja pasar a nadie',
    dudosas.every((c) => Object.values(PUERTAS).every((p) => [ANA, BEA, CIRO].every((u) => decide(c, p, u).runtime === 'legacy'))),
    dudosas.filter((c) => Object.values(PUERTAS).some((p) => [ANA, BEA, CIRO].some((u) => decide(c, p, u).runtime !== 'legacy'))).map((c) => JSON.stringify(c)).join(' '));
}

/* ═══ B · LA CONFIGURACIÓN NO CAMBIA LA REGLA ═══════════════════════════════ */
console.log('\n── B · La configuración no quita la obligación ni abre más ──');
{
  const mundo = con({ 'world.generate': { cuentas: [ANA] } });
  check('B1) `listaObligatoria: false` —arriba o dentro de una capacidad— no se lee: sin lista sigue sin pasar nadie',
    decide({ ...con({ 'world.generate': {} }), listaObligatoria: false }, MUNDO, ANA).motivo === 'sin_lista_de_cuentas'
    && decide(con({ 'world.generate': { listaObligatoria: false } }), MUNDO, ANA).motivo === 'sin_lista_de_cuentas'
    && decide(con({ 'text.generate': { listaObligatoria: false } }), BRAIN, ANA).motivo === 'sin_lista_de_cuentas');
  const conExtras = { ...con({ 'world.generate': { cuentas: [ANA], todas: true, abiertaPara: 'todos', cuentasExtra: [BEA] } }), comodin: true, todas: true };
  check('B2) una clave que no conoce se ignora y NUNCA abre más: la misma decisión que sin ella',
    iguales(mapa(conExtras), mapa(mundo)) && iguales(mapa(conExtras), { brain: [], video: [], mundo: [ANA] }));
  check('B3) la cuenta se compara por IGUALDAD exacta: ni mayúsculas, ni prefijos, ni espacios',
    !pasa(mundo, MUNDO, 'cuentaana0001') && !pasa(mundo, MUNDO, 'cuentaAna000') && !pasa(mundo, MUNDO, `${ANA}1`) && !pasa(mundo, MUNDO, ` ${ANA}`) && pasa(mundo, MUNDO, ANA));
  check('B4) una cuenta repetida es la misma cuenta, y la lista leída no gana ni pierde ninguna',
    iguales(leerPuerta(con({ 'world.generate': { cuentas: [ANA, ANA, BEA] } })).config.porCapacidad['world.generate'].cuentas, [ANA, BEA]));
  check('B5) `habilitado: false` cierra las TRES a la vez, con sus listas intactas: volver atrás es un booleano',
    iguales(mapa({ ...con({ 'text.generate': { cuentas: [ANA] }, 'video.generate': { cuentas: [ANA] }, 'world.generate': { cuentas: [ANA] } }), habilitado: false }), { brain: [], video: [], mundo: [] }));
  const acotada = con({ 'world.generate': { cuentas: [ANA], experiencias: ['studio'] } });
  check('B6) los productos también son por capacidad: los del mundo no tocan a Weë Brain',
    pasa(acotada, MUNDO, ANA) && decide(acotada, { ...MUNDO, experienceId: 'chef' }, ANA).motivo === 'experiencia_no_migrada'
    && decide(con({ 'world.generate': { cuentas: [ANA] } }), { capability: 'world.generate' }, ANA).runtime === 'core');
  const cerradaUna = con({ 'video.generate': { cuentas: [ANA], habilitado: false }, 'world.generate': { cuentas: [ANA] } });
  check('B7) `habilitado: false` DENTRO de una capacidad la cierra a ella sola, con su lista intacta; y un `habilitado` que no es booleano no se adivina: el documento entero cierra',
    decide(cerradaUna, VIDEO, ANA).motivo === 'deshabilitada' && pasa(cerradaUna, MUNDO, ANA)
    && pasa(con({ 'video.generate': { cuentas: [ANA], habilitado: true } }), VIDEO, ANA)
    && [con({ 'video.generate': { cuentas: [ANA], habilitado: 'no' } }), con({ 'video.generate': { cuentas: [ANA], habilitado: 0 } })]
      .every((c) => Object.values(PUERTAS).every((p) => decide(c, p, ANA).runtime === 'legacy') && decide(c, VIDEO, ANA).motivo === 'configuracion_ilegible'));
  check('B8) y el documento leído es lo guardado, congelado: nadie lo cambia por el camino',
    Object.isFrozen(leerPuerta(mundo).config) && Object.isFrozen(leerPuerta(mundo).config.porCapacidad) && Object.isFrozen(leerPuerta(mundo).config.porCapacidad['world.generate'].cuentas));
}

/* ═══ C · LAS TRES PUERTAS, EN SU CÓDIGO ═══════════════════════════════════ */
console.log('\n── C · Cada puerta declara su capacidad y lleva la cuenta de la sesión ──');
{
  const fuentes = {
    brain: sinComentarios(leer('functions/src/creator/brain.ts')),
    video: sinComentarios(leer('functions/src/creator/video.ts')),
    mundo: sinComentarios(leer('functions/src/creator/mundo.ts')),
  };
  check('C1) cada puerta declara SU capacidad en su código: text.generate, video.generate y world.generate',
    /const CAPACIDAD_DEL_CANARY: CapabilityId = 'text\.generate';/.test(fuentes.brain)
    && /const CAPACIDAD_DEL_CANARY: CapabilityId = 'video\.generate';/.test(fuentes.video)
    && /const CAPACIDAD_DEL_CANARY: CapabilityId = 'world\.generate';/.test(fuentes.mundo));
  check('C2) y solo manda al Core esa: brainChat y generateVideo comparan con su capacidad aunque la puerta diga «core» para otra',
    /const porElCore = puerta\.runtime === 'core' && capacidad === CAPACIDAD_DEL_CANARY;/.test(fuentes.brain)
    && /const porElCore = puerta\.runtime === 'core' && normalizado\.capability === CAPACIDAD_DEL_CANARY;/.test(fuentes.video)
    && /capability: CAPACIDAD_DEL_CANARY,\s*userId: uid,\s*experienceId: EXPERIENCIA_DE_STUDIO,\s*\}\);/.test(fuentes.mundo));
  check('C3) la cuenta es la de la SESIÓN (`request.auth.uid`), nunca un dato de la petición',
    Object.values(fuentes).every((s) => /const uid = request\.auth\.uid;/.test(s) && /decidirRuntime\([\s\S]{0,200}?userId: uid/.test(s)));
  check('C4) ninguna puerta pide excepciones: ni `listaObligatoria`, ni otra lectura de la configuración',
    Object.values(fuentes).every((s) => !/listaObligatoria|LISTA_DE_CUENTAS_OBLIGATORIA/.test(s) && (s.match(/configuracionDeLaPuerta\(/g) || []).length === 1));
  const puerta = sinComentarios(leer('functions/src/runtime/puerta.ts'));
  check('C5) y la puerta no tiene lista global ni respaldo: decide con la entrada de SU capacidad y con ninguna otra',
    !/config\.cuentas|config\.experiencias|config\.capacidades/.test(puerta)
    && /const suya = propio\(config\.porCapacidad, contexto\.capability\) \? config\.porCapacidad\[contexto\.capability\] : undefined;/.test(puerta)
    && /if \(!suya\.cuentas\?\.length\) return \{ runtime: 'legacy', motivo: 'sin_lista_de_cuentas' \};/.test(puerta));
  const todo = (dir) => fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? todo(`${dir}/${e.name}`) : e.name.endsWith('.ts') ? [`${dir}/${e.name}`] : []));
  const fuera = todo('functions/src').filter((f) => !f.startsWith('functions/src/runtime/'));
  const leen = fuera.filter((f) => /decidirRuntime\(|configuracionDeLaPuerta\(/.test(sinComentarios(leer(f)))).sort();
  /*
   * Y NADIE LA ESCRIBE, en todo functions/src (también runtime/): el documento solo se nombra con sus dos constantes, que
   * viven en runtime/configuracion.ts, y ahí se usan una vez y para LEER. Ni la ruta a mano ('aiSettings' + 'runtime',
   * con cualquier comilla y en varias líneas), ni otro archivo con las constantes.
   */
  const codigo = todo('functions/src').map((f) => [f, sinComentarios(leer(f))]);
  const conLasConstantes = codigo.filter(([, s]) => /COLECCION_DE_LA_PUERTA|DOCUMENTO_DE_LA_PUERTA/.test(s)).map(([f]) => f);
  const aMano = codigo.filter(([, s]) => /['"`]aiSettings\/runtime['"`]|['"`]aiSettings['"`]\s*\)\s*\.\s*doc\(\s*['"`]runtime['"`]/.test(s)).map(([f]) => f);
  const configuracion = codigo.find(([f]) => f === 'functions/src/runtime/configuracion.ts')?.[1] ?? '';
  /* Cada vez que se nombra la colección de la puerta, con el documento y el método que se le llama después. */
  const usoEnConfiguracion = [...configuracion.matchAll(/\.collection\(COLECCION_DE_LA_PUERTA\)\s*\.doc\(DOCUMENTO_DE_LA_PUERTA\)\s*\.(\w+)\(/g)].map((m) => m[1]);
  const nombraLaColeccion = (configuracion.match(/COLECCION_DE_LA_PUERTA/g) || []).length;
  const nombraElDocumento = (configuracion.match(/DOCUMENTO_DE_LA_PUERTA/g) || []).length;
  check('C6) tres puertas y ninguna más leen esta configuración —recorriendo todo functions/src fuera del runtime—, y NADIE la escribe: el documento solo se nombra en runtime/configuracion.ts, una vez, para leerlo',
    JSON.stringify(leen) === JSON.stringify(['functions/src/creator/brain.ts', 'functions/src/creator/mundo.ts', 'functions/src/creator/video.ts'])
    && JSON.stringify(conLasConstantes) === JSON.stringify(['functions/src/runtime/configuracion.ts']) && aMano.length === 0
    /* Definidas una vez (export const …) y usadas una vez, juntas y para LEER (`.get()`): nada más las nombra. */
    && JSON.stringify(usoEnConfiguracion) === JSON.stringify(['get']) && nombraLaColeccion === 2 && nombraElDocumento === 2
    && !/\.(set|update|create|delete)\(/.test(configuracion),
    JSON.stringify({ leen, conLasConstantes, aMano, usoEnConfiguracion, nombraLaColeccion, nombraElDocumento }));
}

/* ═══ D · VOLVER ATRÁS ══════════════════════════════════════════════════════ */
console.log('\n── D · La forma de antes cierra aquí, y la de ahora cierra en el código de antes ──');
{
  /*
   * LA PUERTA DE ANTES, copiada de e190f1d (functions/src/runtime/puerta.ts) en lo que decide: una lista para todas
   * (`cuentas`), opcional salvo para el mundo (`listaObligatoria`). Es lo que corre hoy en una Function desplegada que
   * no se haya vuelto a desplegar con esta puerta. Se usa para probar que un documento escrito para la puerta de ahora
   * nunca abre una puerta de antes para todos.
   */
  const lista = (v, forma) => (Array.isArray(v) && v.length <= 256 && v.every((x) => typeof x === 'string' && forma.test(x)) ? [...new Set(v)] : undefined);
  const puertaDeAntes = (crudo, { capability, userId, experienceId, listaObligatoria }) => {
    if (crudo === null || typeof crudo !== 'object' || Array.isArray(crudo) || typeof crudo.habilitado !== 'boolean') return 'legacy';
    const capacidades = lista(crudo.capacidades, /^[a-z0-9]+\.[a-z0-9_]+$/);
    if (!capacidades) return 'legacy';
    const cuentas = crudo.cuentas === undefined ? undefined : lista(crudo.cuentas, /^[A-Za-z0-9_.:-]{1,160}$/);
    if (crudo.cuentas !== undefined && !cuentas) return 'legacy';
    const experiencias = crudo.experiencias === undefined ? undefined : lista(crudo.experiencias, /^[A-Za-z0-9_.:-]{1,160}$/);
    if (crudo.experiencias !== undefined && !experiencias) return 'legacy';
    if (!crudo.habilitado || !capacidades.includes(capability)) return 'legacy';
    if (listaObligatoria === true && !cuentas?.length) return 'legacy';
    if (cuentas && !cuentas.includes(userId)) return 'legacy';
    if (experiencias && (!experienceId || !experiencias.includes(experienceId))) return 'legacy';
    return 'core';
  };
  const antes = { habilitado: true, capacidades: ['text.generate', 'video.generate', 'world.generate'] };
  check('D0) (la copia es fiel: la puerta de antes abría brainChat y el vídeo a TODOS sin lista, y el mundo no)',
    puertaDeAntes(antes, { ...BRAIN, userId: CIRO }) === 'core' && puertaDeAntes(antes, { ...VIDEO, userId: CIRO }) === 'core'
    && puertaDeAntes(antes, { ...MUNDO, userId: CIRO, listaObligatoria: true }) === 'legacy');

  const deAntes = [
    antes,
    { ...antes, cuentas: [ANA] },
    { ...antes, cuentas: [ANA], experiencias: ['studio'] },
    { habilitado: true, capacidades: ['world.generate'], cuentas: [ANA], experiencias: ['studio'] },
    { ...con({ 'world.generate': { cuentas: [ANA] } }), cuentas: [ANA] },
    { ...con({ 'world.generate': { cuentas: [ANA] } }), capacidades: ['world.generate'] },
    { ...con({ 'world.generate': { cuentas: [ANA] } }), experiencias: ['studio'] },
  ];
  check('D1) un documento con la forma de ANTES —o que la mezcla con la de ahora— se da por ilegible y CIERRA las tres puertas: leerlo a medias sería volver a «sin lista, todos»',
    deAntes.every((c) => Object.values(PUERTAS).every((p) => [ANA, BEA, CIRO].every((u) => decide(c, p, u).runtime === 'legacy')) && decide(c, MUNDO, ANA).motivo === 'configuracion_ilegible'));

  const deAhora = [
    con({ 'text.generate': { cuentas: [ANA] } }),
    con({ 'video.generate': { cuentas: [ANA] }, 'world.generate': { cuentas: [ANA] } }),
    con({ 'text.generate': { cuentas: [ANA] }, 'video.generate': { cuentas: [ANA] }, 'world.generate': { cuentas: [ANA], experiencias: ['studio'] } }),
  ];
  check('D2) y al revés: un documento de AHORA, leído por la puerta de antes (una Function sin volver a desplegar), no abre nada para nadie',
    deAhora.every((c) => [ANA, BEA, CIRO].every((u) => puertaDeAntes(c, { ...BRAIN, userId: u }) === 'legacy' && puertaDeAntes(c, { ...VIDEO, userId: u }) === 'legacy'
      && puertaDeAntes(c, { ...MUNDO, userId: u, listaObligatoria: true }) === 'legacy')));
  check('D3) `habilitado: false` manda PRIMERO, sea cual sea la forma: el documento cerrado de producción (RUNTIME §21.3, `{ habilitado: false, capacidades: [] }`) se lee «deshabilitada», no «ilegible» —el registro sigue distinguiendo cerrada de rota—',
    Object.values(PUERTAS).every((p) => decide({ habilitado: false, capacidades: [] }, p, ANA).motivo === 'deshabilitada')
    && decide({ habilitado: false, porCapacidad: 'roto' }, MUNDO, ANA).motivo === 'deshabilitada'
    && decide({ habilitado: true, capacidades: [] }, MUNDO, ANA).motivo === 'configuracion_ilegible');
  check('D4) `PUERTA_CERRADA` es la forma de ahora, legible, inmutable y cerrada para las tres',
    Object.isFrozen(PUERTA_CERRADA) && leerPuerta(PUERTA_CERRADA).ok === true && PUERTA_CERRADA.habilitado === false
    && Object.values(PUERTAS).every((p) => decide(PUERTA_CERRADA, p, ANA).motivo === 'deshabilitada'));
}

/* ═══ E · LO GUARDADO, LEÍDO DE FIRESTORE ══════════════════════════════════ */
console.log('\n── E · `aiSettings/runtime`, leído como lo leen las puertas ──');
{
  let reloj = 1_700_000_000_000;
  const ahora = () => reloj;
  const db = (valor, { revienta = false } = {}) => {
    const lecturas = [];
    return {
      lecturas,
      collection(c) { return { doc(d) { return { async get() { lecturas.push(`${c}/${d}`); if (revienta) throw new Error('firestore caído'); return { exists: valor !== undefined, data: () => valor }; } }; } }; },
    };
  };
  olvidarLaPuerta();
  const guardado = db(con({ 'world.generate': { cuentas: [ANA] }, 'video.generate': { cuentas: [BEA] } }));
  const leido = await configuracionDeLaPuerta(guardado, ahora);
  check('E1) se lee `aiSettings/runtime` y decide por capacidad: el mundo para su cuenta, el vídeo para la suya, brainChat para nadie',
    guardado.lecturas[0] === `${COLECCION_DE_LA_PUERTA}/${DOCUMENTO_DE_LA_PUERTA}` && iguales(mapa(leido), { brain: [], video: [BEA], mundo: [ANA] }));
  await configuracionDeLaPuerta(guardado, ahora);
  check('E2) una lectura por minuto, no una por petición', guardado.lecturas.length === 1);
  reloj += 60_001;
  olvidarLaPuerta();
  const caido = db(undefined, { revienta: true });
  const sinLeer = await configuracionDeLaPuerta(caido, ahora);
  check('E3) si Firestore no contesta, la puerta queda CERRADA para las tres', sinLeer === undefined && iguales(mapa(sinLeer), { brain: [], video: [], mundo: [] }));
  olvidarLaPuerta();
  const borrado = await configuracionDeLaPuerta(db(undefined), ahora);
  check('E4) y sin documento, también', iguales(mapa(borrado), { brain: [], video: [], mundo: [] }));
  olvidarLaPuerta();
}

/* ═══ F · LO QUE SIGUE CERRADO ═════════════════════════════════════════════ */
console.log('\n── F · Nada abierto, nada escrito en producción ──');
{
  check('F1) la puerta sigue cerrada por defecto en el código, con su forma de ahora',
    /PUERTA_CERRADA: ConfiguracionDePuerta = Object\.freeze\(\{ habilitado: false, porCapacidad: Object\.freeze\(\{\}\) \}\);/.test(leer('functions/src/runtime/puerta.ts')));
  check('F2) `aiSettings` sigue siendo solo del servidor', /match \/aiSettings\/\{settingId\} \{\s*allow read, write: if false;/.test(leer('firestore.rules')));
  const scripts = fs.readdirSync(path.join(RAIZ, 'scripts')).filter((f) => /\.(m?js|ts)$/.test(f));
  check('F3) ningún script escribe la puerta: abrirla es un paso del runbook, a mano y con autorización del dueño',
    scripts.every((f) => !/aiSettings\/runtime['"`]\)\.(set|update)|doc\(['"`]runtime['"`]\)\.(set|update)/.test(leer(`scripts/${f}`))));
  check('F4) esta suite está en la cadena de `npm test`', /listas-por-capacidad\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} de ${n} fallaron` : `\n✔ ${n}/${n}`);
process.exit(failures ? 1 : 0);
