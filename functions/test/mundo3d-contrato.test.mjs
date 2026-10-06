/**
 * FASE 1 · `world.generate` HABLA WEË, NO fal (misión «cerrar los gaps de world.generate», 2026-10-05).
 *
 * El contrato canónico (`functions/src/core/mundo3d.ts`) y su frontera con el proveedor, probados con el código de
 * verdad y sin red:
 *
 *   A · El contrato vive solo: se carga, valida y construye la entrada del motor sin que exista ningún proveedor.
 *   B · Es estricto: un nombre de campo de un proveedor no entra por la puerta.
 *   C · El adaptador TRADUCE: de la entrada de Weë al esquema de fal, con datos, y nada más viaja.
 *   D · Un cambio de esquema del proveedor se queda en el adaptador: el contrato y la petición no se mueven.
 *   E · El compositor y la app no conocen a fal: ni un tipo, ni un campo, ni un import.
 *   F · El espejo de la app es el mismo contrato, byte a byte y en comportamiento.
 *   G · Los datos del mapeo se sostienen para todos los modelos declarados.
 *
 *   node functions/test/mundo3d-contrato.test.mjs     (usa el compilado para el adaptador: `npm run build` antes)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { crearCargador, leer, sinComentarios, archivosDeLaApp, RAIZ } from './filmmaker-cliente.mjs';

const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib/', p));
const ts = createRequire(path.resolve(RAIZ, 'package.json'))('typescript');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const seccion = (letra, fn) => {
  try { return fn(); } catch (e) { check(`${letra}) la sección termina sin lanzar`, false, String(e && e.stack ? e.stack : e).split('\n').slice(0, 3).join(' · ')); }
  return undefined;
};
const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const cargar = crearCargador();
const C = cargar('functions/src/core/mundo3d.ts');
const ESPEJO = cargar('services/filmmaker/espejo/core/mundo3d.ts');

const CUENTA = 'u1';
const enStorage = (ruta) => `https://firebasestorage.googleapis.com/v0/b/get-wee.appspot.com/o/${encodeURIComponent(ruta)}?alt=media&token=t`;
const FOTO = enStorage(`users/${CUENTA}/creator-inputs/faro.png`);
const ASSET = 'asset_0123456789abcdef0123456789abcdef';
const PETICION = { contract: '1.0', modo: 'desde_imagen', imagen: { tipo: 'storage', url: FOTO }, descripcion: '  Un faro   al atardecer ', espacio: 'interior', elementos: [' faro ', 'barca'], projectId: 'proyecto_7' };

/** Lo que nunca puede verse en el contrato ni en la app: nombres y campos de proveedores. */
const DE_UN_PROVEEDOR = /\b(fal|hunyuan|tencent)\b|\blabels_fg\d\b|\bexport_drc\b|\bimage_url\b|\bworld_file\b|\bclasses\b|providerModelId|queue\.fal|fal\.run|fal\.ai/i;
const CAMPOS_DE_FAL = ['image_url', 'labels_fg1', 'labels_fg2', 'classes', 'export_drc', 'world_file'];

/* ── el cierre de imports de un archivo, sin ejecutarlo ── */
const cierreDeImports = (rel) => {
  const vistos = new Set();
  const pendientes = [path.resolve(RAIZ, rel)];
  while (pendientes.length) {
    const abs = pendientes.pop();
    if (vistos.has(abs)) continue;
    vistos.add(abs);
    const info = ts.preProcessFile(fs.readFileSync(abs, 'utf8'), true, true);
    for (const imp of info.importedFiles) {
      if (!imp.fileName.startsWith('.')) { vistos.add(`EXTERNO:${imp.fileName}`); continue; }
      const base = path.resolve(path.dirname(abs), imp.fileName);
      const f = [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')].find((x) => fs.existsSync(x));
      if (f) pendientes.push(f);
    }
  }
  return [...vistos].map((v) => (v.startsWith('EXTERNO:') ? v : path.relative(RAIZ, v).split(path.sep).join('/'))).sort();
};

/* ═══ A · EL CONTRATO VIVE SOLO ═══════════════════════════════════════════ */
console.log('\n── A · El contrato funciona sin ningún proveedor ──');
seccion('A', () => {
  const cierre = cierreDeImports('functions/src/core/mundo3d.ts');
  check('A1) su cierre de imports es del Core y nada más: ni el motor, ni un adaptador, ni Firebase, ni nada de fuera',
    cierre.every((f) => f.startsWith('functions/src/core/')) && !cierre.some((f) => /engine|providers|creator|runtime|firebase/.test(f)), cierre.join(', '));
  check('A2) y en el texto no hay ni un nombre de proveedor ni un campo de fal',
    !DE_UN_PROVEEDOR.test(sinComentarios(leer('functions/src/core/mundo3d.ts'))));

  const r = C.leerPeticionDeMundo3D(PETICION, CUENTA);
  check('A3) una petición de la app se lee y se normaliza sin nadie más: espacios de más fuera, todo congelado',
    r.ok && r.peticion.descripcion === 'Un faro al atardecer' && iguales(r.peticion.elementos, ['faro', 'barca'])
    && r.peticion.espacio === 'interior' && r.peticion.projectId === 'proyecto_7' && Object.isFrozen(r.peticion) && Object.isFrozen(r.peticion.imagen),
    JSON.stringify(r));
  const e = C.entradaDeMundo3D(r.peticion, FOTO);
  check('A4) y de ella sale la entrada del motor, en palabras de Weë: modo, foto, espacio, elementos, descripción',
    iguales(Object.keys(e).sort(), ['descripcion', 'elementos', 'espacio', 'imagen', 'modo']) && e.espacio === 'interior' && e.imagen === FOTO);
  const sinSaber = C.entradaDeMundo3D(C.leerPeticionDeMundo3D({ contract: '1.0', modo: 'desde_imagen', imagen: { tipo: 'storage', url: FOTO } }, CUENTA).peticion, FOTO);
  check('A5) con «No sé» decide WEË, no un proveedor: exterior, y nada en especial delante (sin descripción no se inventa)',
    sinSaber.espacio === C.ESPACIO_POR_DEFECTO && C.ESPACIO_POR_DEFECTO === 'exterior' && iguales(sinSaber.elementos, []) && !('descripcion' in sinSaber));
  const leida = C.leerEntradaDeMundo3D({ ...e, goal: 'lo añade el motor', image_url: 'https://evil.test/x.png' }, CUENTA);
  check('A6) un adaptador vuelve a leer la entrada con el MISMO contrato: lo que el motor añada se ignora y no se traduce',
    leida.ok && iguales(leida.entrada, e));
  check('A7) la capacidad es la del catálogo del Core, y lo que sale son PAPELES con el vocabulario del Content Core',
    C.CAPACIDAD_DE_MUNDO === 'world.generate' && iguales(C.PAPELES_DE_SALIDA_DE_MUNDO, ['world', 'preview'])
    && C.TIPO_DE_MATERIAL_DEL_MUNDO === 'world' && C.VARIANTE_DE_LA_VISTA_PREVIA === 'preview');
});

/* ═══ B · ESTRICTO ════════════════════════════════════════════════════════ */
console.log('\n── B · Un campo de un proveedor no entra por la puerta ──');
seccion('B', () => {
  const con = (extra) => C.leerPeticionDeMundo3D({ ...PETICION, ...extra }, CUENTA);
  const intrusos = ['image_url', 'labels_fg1', 'labels_fg2', 'classes', 'export_drc', 'model', 'modelId', 'provider', 'prompt', 'quality', 'seed', 'jurisdicciones', 'country', 'endpoint'];
  const rechazos = intrusos.map((k) => con({ [k]: k === 'export_drc' ? true : 'x' }));
  check('B1) cualquier campo que no es del contrato invalida la petición entera, y se dice cuál: ni nombres de fal, ni modelo, ni prompt, ni jurisdicción',
    rechazos.every((x, i) => !x.ok && x.motivo === 'campo_desconocido' && x.campo === intrusos[i]), rechazos.map((x) => x.campo ?? x.motivo).join(','));
  const casos = [
    [con({ contract: '2.0' }), 'contrato_no_valido'],
    [con({ contract: 1 }), 'contrato_no_valido'],
    [con({ contract: '0.9' }), 'contrato_no_valido'],
    [con({ modo: 'desde_texto' }), 'modo_no_soportado'],
    [con({ imagen: undefined }), 'falta_imagen'],
    [con({ imagen: { tipo: 'storage', url: 'https://evil.test/foto.png' } }), 'imagen_sin_subir'],
    [con({ imagen: { tipo: 'storage', url: enStorage('users/otra/x.png') } }), 'imagen_ajena'],
    [con({ imagen: { tipo: 'storage', url: enStorage('users/u1X/x.png') } }), 'imagen_ajena'],
    [con({ imagen: { tipo: 'storage', url: FOTO, image_url: FOTO } }), 'campo_desconocido'],
    [con({ imagen: { tipo: 'material', assetId: '../x' } }), 'material_no_valido'],
    [con({ descripcion: 'x'.repeat(301) }), 'descripcion_no_valida'],
    [con({ espacio: 'costa' }), 'espacio_no_valido'],
    [con({ elementos: ['a', 'b', 'c'] }), 'elementos_no_validos'],
    [con({ elementos: ['x'.repeat(61)] }), 'elementos_no_validos'],
    [con({ elementos: ['ok', '   '] }), 'elementos_no_validos'],
    [con({ projectId: 'a/b' }), 'proyecto_no_valido'],
    [C.leerPeticionDeMundo3D('hola', CUENTA), 'forma_no_valida'],
  ];
  check('B2) y cada forma de equivocarse tiene su motivo: contrato, modo, foto ausente, de fuera, ajena (prefijo entero), material, texto, espacio, elementos, proyecto',
    casos.every(([x, m]) => !x.ok && x.motivo === m), casos.filter(([x, m]) => x.ok || x.motivo !== m).map(([x, m]) => `${m}≠${x.motivo}`).join(' '));
  /* Revisión de arquitectura (2026-10-06): la versión se lee con la regla de siempre (`contratoCompatible`), no con «===». */
  check('B2b) la versión de la petición se acepta si el servidor la ENTIENDE (mismo mayor, menor que no pase del suyo): un servidor 1.x sigue sirviendo a una app 1.0',
    con({ contract: '1.0' }).ok && /!contratoCompatible\(MUNDO3D_CONTRACT_VERSION, crudo\.contract\)/.test(leer('functions/src/core/mundo3d.ts'))
    && !/crudo\.contract !== MUNDO3D_CONTRACT_VERSION/.test(leer('functions/src/core/mundo3d.ts')) && C.TIPO_DE_MATERIAL_DEL_MUNDO === 'world');
  const material = C.leerPeticionDeMundo3D({ contract: '1.0', modo: 'desde_imagen', imagen: { tipo: 'material', assetId: ASSET } }, CUENTA);
  check('B3) una foto que ya es material de la cuenta viaja por su id, nunca por su dirección',
    material.ok && iguales(material.peticion.imagen, { tipo: 'material', assetId: ASSET }));
  check('B4) la dirección se lee con las tres formas del Storage de Weë, igual que el motor (`parseStorageUrl`)', (() => {
    const http = lib('engine/http.js');
    const formas = [FOTO, `gs://get-wee.appspot.com/users/${CUENTA}/a b.png`, `https://storage.googleapis.com/get-wee.appspot.com/users/${CUENTA}/c.png?x=1`,
      'https://evil.test/v0/b/get-wee.appspot.com/o/users%2Fu1%2Fz.png', 'https://example.com/foto.png', 'data:image/png;base64,AAAA'];
    return formas.every((u) => iguales(C.rutaEnElStorageDeWee(u), (() => { try { return http.parseStorageUrl(u); } catch { return null; } })()));
  })());
});

/** El adaptador compilado, leyendo OTRA tabla de mapeo: es exactamente lo que pasaría si cambiaran los datos. */
const adaptadorCon = (tabla) => {
  const fuente = fs.readFileSync(path.resolve(RAIZ, 'functions/lib/engine/providers/fal.js'), 'utf8');
  const modulo = { exports: {} };
  const base = require(path.resolve(RAIZ, 'functions/lib/engine/providers/fal-modelos.js'));
  const requerir = (spec) => (spec === './fal-modelos' ? { ...base, ENTRADA_DE_WEE_POR_MODELO: tabla }
    : require(spec.startsWith('.') ? path.resolve(RAIZ, 'functions/lib/engine/providers', spec) : spec));
  new Function('exports', 'require', 'module', '__filename', '__dirname', fuente)(modulo.exports, requerir, modulo, 'fal.js', path.resolve(RAIZ, 'functions/lib/engine/providers'));
  return modulo.exports;
};

/* ═══ C · EL ADAPTADOR TRADUCE ════════════════════════════════════════════ */
console.log('\n── C · De la entrada de Weë al esquema de fal, con datos ──');
const F = lib('engine/providers/fal.js');
const M = lib('engine/providers/fal-modelos.js');
const HW = M.HUNYUAN_WORLD_IMAGEN_A_MUNDO;
seccion('C', () => {
  const entrada = (extra = {}) => ({ modo: 'desde_imagen', imagen: FOTO, espacio: 'exterior', elementos: [], ...extra });
  const exterior = F.cuerpoParaFal(HW, 'world.generate', entrada(), CUENTA);
  const interior = F.cuerpoParaFal(HW, 'world.generate', entrada({ espacio: 'interior', elementos: ['faro', 'barca'], descripcion: 'Mi faro' }), CUENTA);
  check('C1) abierto/cerrado se traduce a su vocabulario (outdoor/indoor) y lo que destaca, a sus dos capas de primer plano',
    exterior.classes === 'outdoor' && interior.classes === 'indoor' && interior.labels_fg1 === 'faro' && interior.labels_fg2 === 'barca');
  check('C2) «nada en especial» viaja vacío porque la fuente del modelo lo documenta así (y queda dicho que en fal no está verificado)',
    exterior.labels_fg1 === '' && exterior.labels_fg2 === '' && /NO VERIFICADO en fal/.test(M.ENTRADA_DE_WEE_POR_MODELO[HW.id].labels_fg1.vacio.fuente));
  check('C3) y nada más viaja: ni la descripción (este modelo no tiene entrada de texto), ni export_drc (sin documentar), ni la foto como URL de fuera',
    iguales(Object.keys(interior).sort(), ['classes', 'image_url', 'labels_fg1', 'labels_fg2']) && interior.image_url === FOTO);
  const conMediaTraduccion = adaptadorCon({ [HW.id]: { ...M.ENTRADA_DE_WEE_POR_MODELO[HW.id], classes: { de: 'espacio', valores: { exterior: 'outdoor' } } } });
  let rechazo = null;
  try { conMediaTraduccion.cuerpoParaFal(HW, 'world.generate', entrada({ espacio: 'interior' }), CUENTA); } catch (e) { rechazo = e; }
  check('C4) un valor de Weë sin traducción no viaja inventado: un campo obligatorio sin valor falla ANTES de llamar a nadie',
    rechazo?.name === 'ProviderError' && rechazo.status === 400 && rechazo.retryable === false, rechazo?.message ?? 'no lanzó');
});

/* ═══ D · UN CAMBIO DE ESQUEMA SE QUEDA EN EL ADAPTADOR ═══════════════════ */
console.log('\n── D · Si fal cambia su esquema, solo cambia su mapeo ──');
seccion('D', () => {
  /* Un fal hipotético que renombra sus campos: otro modelo con otro esquema y SU mapeo. Lo demás, igual. */
  const OTRO = {
    ...HW, id: 'fal-ai/hunyuan_world/image-to-world-v2',
    gobierno: {
      ...HW.gobierno, providerModelId: 'fal-ai/hunyuan_world/image-to-world-v2',
      inputSchema: [
        { nombre: 'input_image', tipo: 'image_url', requerido: true },
        { nombre: 'scene_kind', tipo: 'enum', valores: ['open', 'closed'], requerido: true },
        { nombre: 'foreground', tipo: 'string', requerido: false },
      ],
    },
  };
  const MAPEO = {
    input_image: { de: 'imagen' },
    scene_kind: { de: 'espacio', valores: { exterior: 'open', interior: 'closed' } },
    foreground: { de: 'elementos', posicion: 0 },
  };
  const tabla = M.ENTRADA_DE_WEE_POR_MODELO;
  const entrada = { modo: 'desde_imagen', imagen: FOTO, espacio: 'interior', elementos: ['faro'] };
  let cuerpo = null; let error = null;
  const nuevo = adaptadorCon({ ...tabla, [OTRO.id]: MAPEO });
  try { cuerpo = nuevo.cuerpoParaFal(OTRO, 'world.generate', entrada, CUENTA); } catch (e) { error = e; }
  check('D1) con el esquema nuevo y SU mapeo, la MISMA entrada de Weë produce el cuerpo nuevo',
    !error && iguales(cuerpo, { input_image: FOTO, scene_kind: 'closed', foreground: 'faro' }), error?.message ?? JSON.stringify(cuerpo));
  const peticion = C.leerPeticionDeMundo3D({ contract: '1.0', modo: 'desde_imagen', imagen: { tipo: 'storage', url: FOTO }, espacio: 'interior', elementos: ['faro'] }, CUENTA);
  check('D2) y la petición de la app y la entrada del motor no cambian ni un carácter: lo de antes y lo de después se piden igual',
    peticion.ok && iguales(C.entradaDeMundo3D(peticion.peticion, FOTO), { modo: 'desde_imagen', imagen: FOTO, espacio: 'interior', elementos: ['faro'] }));
  const fuentes = fs.readdirSync(path.resolve(RAIZ, 'functions/src'), { recursive: true }).map((f) => `functions/src/${String(f).split(path.sep).join('/')}`).filter((f) => f.endsWith('.ts'));
  const SOLO_DE_FAL = CAMPOS_DE_FAL.filter((c) => c !== 'image_url');
  const conCamposDeFal = fuentes.filter((f) => SOLO_DE_FAL.some((c) => new RegExp(`\\b${c}\\b`).test(sinComentarios(leer(f))))).sort();
  check('D3) los nombres de los campos de fal solo existen en los DATOS de sus modelos: ni el código del adaptador los escribe',
    iguales(conCamposDeFal, ['functions/src/engine/providers/fal-modelos.ts']), conCamposDeFal.join(', '));
  /* `image_url` es vocabulario de varios proveedores (cada uno en SU adaptador) y el nombre de un tipo de campo de esquema. */
  const fuera = fuentes.filter((f) => !f.startsWith('functions/src/engine/providers/') && /\bimage_url\b/.test(sinComentarios(leer(f)))).sort();
  check('D4) y el `image_url` de los esquemas de proveedor no sale de los adaptadores (salvo como tipo de campo en `engine/types.ts`)',
    iguales(fuera, ['functions/src/engine/types.ts']) && /tipo: 'string' \| 'number' \| 'integer' \| 'boolean' \| 'image_url'/.test(leer('functions/src/engine/types.ts')), fuera.join(', '));
});

/* ═══ E · EL COMPOSITOR Y LA APP NO CONOCEN A fal ═════════════════════════ */
console.log('\n── E · Ni el compositor ni la app saben quién hace el mundo ──');
seccion('E', () => {
  const composer = ['utils/crearMundo3D.ts', 'services/escena3d.ts'];
  const cierre = [...new Set(composer.flatMap(cierreDeImports))].filter((f) => !f.startsWith('EXTERNO:'));
  check('E1) el cierre de imports del compositor no toca el motor, ningún adaptador ni el código del servidor',
    !cierre.some((f) => f.startsWith('functions/') || /providers|engine\//.test(f)), cierre.filter((f) => f.startsWith('functions/')).join(', '));
  check('E2) ni un tipo, un campo o un nombre de proveedor en el compositor, en su puerta ni en el contrato espejado',
    [...composer, 'services/filmmaker/espejo/core/mundo3d.ts'].every((f) => !DE_UN_PROVEEDOR.test(sinComentarios(leer(f)))));
  const app = archivosDeLaApp().filter((f) => !f.startsWith('services/filmmaker/espejo/'));
  const tocanFal = app.filter((f) => /from ['"][^'"]*functions\/src|from ['"][^'"]*providers\/fal|\bFalProvider\b|falAdapter/.test(leer(f)));
  check('E3) y ningún archivo de la app importa del servidor ni de un adaptador', tocanFal.length === 0, tocanFal.join(', '));
});

/* ═══ F · EL ESPEJO ES EL MISMO CONTRATO ══════════════════════════════════ */
console.log('\n── F · La app y el servidor leen el MISMO contrato ──');
seccion('F', () => {
  check('F1) el espejo de la app es el del Core, impreso por el generador (no una copia a mano)',
    /GENERADO por scripts\/espejo-filmmaker\.mjs desde functions\/src\/core\/mundo3d\.ts/.test(leer('services/filmmaker/espejo/core/mundo3d.ts')));
  const entradas = [PETICION, { ...PETICION, labels_fg1: 'x' }, { ...PETICION, imagen: { tipo: 'storage', url: enStorage('users/otra/x.png') } }, { ...PETICION, espacio: undefined, elementos: undefined }, null];
  check('F2) y decide igual sobre las mismas peticiones', entradas.every((p) => iguales(C.leerPeticionDeMundo3D(p, CUENTA), ESPEJO.leerPeticionDeMundo3D(p, CUENTA))));
  check('F3) la puerta de la app lo reexporta tal cual', /export \* from '\.\/filmmaker\/espejo\/core\/mundo3d';/.test(leer('services/escena3d.ts')));
  /* Los derechos que llegan a la app: sin las licencias (su nombre y su dirección nombran al modelo) ni la revisión interna. */
  const DERECHOS = Object.freeze({ revision: 'APPROVED', usoComercial: 'RESTRICTED', atribucion: true,
    licencias: Object.freeze([Object.freeze({ nombre: 'Licencia de un tercero', url: 'https://example.com/licencia' })]),
    jurisdiccionesBloqueadas: Object.freeze(['EU', 'GB']) });
  const visibles = C.derechosVisibles(DERECHOS);
  check('F4) los derechos VISIBLES: uso comercial, atribución y dónde no se puede mostrar; ni licencias ni revisión, y sin tocar los del material',
    iguales(visibles, { usoComercial: 'RESTRICTED', atribucion: true, jurisdiccionesBloqueadas: ['EU', 'GB'] })
    && !('licencias' in visibles) && !('revision' in visibles) && visibles.jurisdiccionesBloqueadas !== DERECHOS.jurisdiccionesBloqueadas
    && iguales(C.derechosVisibles({ ...DERECHOS, jurisdiccionesBloqueadas: [] }), { usoComercial: 'RESTRICTED', atribucion: true })
    && iguales(ESPEJO.derechosVisibles(DERECHOS), visibles), JSON.stringify(visibles));
});

/* ═══ G · LOS DATOS DEL MAPEO SE SOSTIENEN ════════════════════════════════ */
console.log('\n── G · El mapeo de cada modelo, comprobado ──');
seccion('G', () => {
  const CAMPOS_DE_WEE = ['modo', 'imagen', 'descripcion', 'espacio', 'elementos'];
  const problemas = [];
  for (const modelo of M.MODELOS_FAL) {
    const mapeo = M.ENTRADA_DE_WEE_POR_MODELO[modelo.id];
    if (!mapeo) { problemas.push(`${modelo.id}: sin mapeo`); continue; }
    const esquema = modelo.gobierno.inputSchema;
    for (const [campo, origen] of Object.entries(mapeo)) {
      if (!esquema.some((c) => c.nombre === campo)) problemas.push(`${campo}: no está en el esquema`);
      if (!CAMPOS_DE_WEE.includes(origen.de)) problemas.push(`${campo}: ${origen.de} no es de Weë`);
      if (origen.vacio && !/\S/.test(origen.vacio.fuente)) problemas.push(`${campo}: vacío sin fuente`);
    }
    for (const c of esquema.filter((x) => x.requerido)) if (!mapeo[c.nombre]) problemas.push(`${c.nombre}: obligatorio sin origen`);
    const principales = modelo.gobierno.outputSchema.filter((c) => c.tipo === 'file' && (c.papel ?? 'principal') === 'principal');
    if (principales.length !== 1) problemas.push(`${modelo.id}: ${principales.length} archivos principales`);
  }
  check('G1) cada modelo de fal: su mapeo solo nombra campos de su esquema y de Weë, cubre todo lo obligatorio, documenta cada vacío y declara UN archivo principal',
    problemas.length === 0, problemas.join(' | '));
  check('G2) el mundo de hoy NO declara vista previa: no se le inventa',
    HW.gobierno.outputSchema.every((c) => c.papel !== 'preview') && HW.gobierno.outputSchema.length === 1);
  check('G3) esta suite está en la cadena de `npm test`', /mundo3d-contrato\.test\.mjs/.test(leer('functions/package.json')));
});

console.log(failures ? `\n✘ ${failures} de ${n} fallaron` : `\n✔ ${n}/${n}`);
process.exit(failures ? 1 : 0);
