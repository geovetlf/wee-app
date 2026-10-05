/*
 * WEË 3D — CICLO DE VIDA, VERSIONES Y REUTILIZACIÓN DE LOS MATERIALES 3D (`functions/src/core/content/linaje.ts`).
 *
 * Un mundo generado en Weë Studio tiene que poder usarse —sin copiarse— en Weë Design y en Filmmaker, editarse sin
 * perder lo anterior y llevar a todo lo que salga de él la licencia que lo restringe. Se prueba sobre los contratos que
 * YA existen —el material (`Asset`), el núcleo 3D (`Escena3D`), los proyectos (`ProjectItem`), los Elements, los planos
 * y la producción de Filmmaker— y con el módulo puro que los une. Sin red, sin proveedores, sin Firestore, sin reloj. $0.
 *
 *   A · El mundo es un material          G · La procedencia
 *   B · Versionar: V1 → editar → V2       H · La vista previa, separada del archivo principal
 *   C · Recuperar una versión             I · La escena referencia materiales y no es otra capa
 *   D · Reutilizar es referenciar         J · Filmmaker: material 3D → escena → plano → línea de tiempo
 *   E · Varios proyectos, un material     K · Sin duplicación innecesaria
 *   F · Los derechos solo se endurecen    L · Fronteras
 *
 *   node functions/test/ciclo-de-vida-3d.test.mjs     (usa el compilado: `npm run build` antes)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const lib = (rel) => require(path.join(RAIZ, 'functions/lib', rel));

const L = lib('core/content/linaje.js');
const A = lib('core/content/asset.js');
const V = lib('core/content/vista.js');
const E3 = lib('core/escena3d.js');
const P = lib('core/project.js');
const EL = lib('core/element.js');
const SH = lib('core/shot.js');
const core = lib('core/index.js');
const M = lib('filmmaker/modelo.js');
const FV = lib('filmmaker/validacion.js');
const RQ = lib('filmmaker/requisitos.js');

let failures = 0; let n = 0;
const check = (name, cond, detail = '') => {
  n++;
  if (cond) console.log(`✔ ${name}`);
  else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); }
};
/** Una sección que lanza no tumba la suite: su excepción es una comprobación fallida, con el motivo. */
const seccion = (titulo, fn) => {
  console.log(`\n── ${titulo} ──`);
  try { fn(); } catch (e) { check(`${titulo}: la sección termina sin lanzar`, false, String(e?.stack ?? e).split('\n').slice(0, 3).join(' · ')); }
};
const lanza = (f) => { try { f(); return null; } catch (e) { return e.message; } };
/** JSON canónico (claves ordenadas a cualquier profundidad): dos objetos iguales dan la misma cadena. */
const canonico = (v) => (Array.isArray(v) ? `[${v.map(canonico).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonico(v[k])}`).join(',')}}`
    : JSON.stringify(v));
const congelar = (x) => { if (x && typeof x === 'object') { Object.values(x).forEach(congelar); Object.freeze(x); } return x; };
/** Mismos derechos, como conjuntos: cada uno al menos tan estricto como el otro. */
const equivalentes = (a, b) => L.almenosTanEstrictos(a, b) && L.almenosTanEstrictos(b, a);
const clavesDe = (v, salida = []) => {
  if (Array.isArray(v)) v.forEach((x) => clavesDe(x, salida));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { salida.push(k); clavesDe(x, salida); }
  return salida;
};
const textosDe = (v, salida = []) => {
  if (Array.isArray(v)) v.forEach((x) => textosDe(x, salida));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => textosDe(x, salida));
  else if (typeof v === 'string') salida.push(v);
  return salida;
};

/* ── Los materiales de una cuenta, como los guarda el Content Core ─────────── */

const CUENTA = 'uAnaCuenta0000000000000001';
const OTRA = 'uOtraCuenta000000000000002';
/** Un id con la forma que el almacén de Weë sabe leer (`asset_` + 32 hex). */
const id = (k) => `asset_${k.toString(16).padStart(32, '0')}`;
const objeto = (assetId, pieza = 'original', cuenta = CUENTA) =>
  ({ provider: 'wee', bucket: 'wee-pruebas', objectKey: `users/${cuenta}/ai-generations/${assetId}-${pieza}` });
const T = E3.TRANSFORMACION_NEUTRA;

/* Una licencia ajena con restricción territorial: la forma exacta que deja el gobierno de un modelo en lo que genera. */
const LIC_MUNDO = { nombre: 'Licencia comunitaria del modelo de mundos (2025-07-27)', url: 'https://example.org/licencias/mundos' };
const LIC_SERVICIO = { nombre: 'Términos del servicio que lo sirve', url: 'https://example.org/terminos' };
const LIC_OBJETOS = { nombre: 'Licencia del modelo de objetos', url: 'https://example.org/licencias/objetos' };
const DERECHOS_DEL_MUNDO = { revision: 'REVIEW_REQUIRED', usoComercial: 'RESTRICTED', atribucion: true, licencias: [LIC_MUNDO, LIC_SERVICIO], jurisdiccionesBloqueadas: ['EU', 'GB', 'KR'] };
const DERECHOS_DEL_OBJETO = { revision: 'APPROVED', usoComercial: 'ALLOWED', atribucion: false, licencias: [LIC_OBJETOS], jurisdiccionesBloqueadas: ['CN'] };

const material = (extra) => congelar({ contract: '1.0', ownerAccountId: CUENTA, status: 'ready', createdByEntityId: '00000001', createdByEntityType: 'REAL_PROFILE', ...extra });

/* La foto de la persona: el punto de partida del mundo. */
const FOTO = material({
  assetId: id(1), kind: 'image', mimeType: 'image/png', storageRef: objeto(id(1)), width: 2048, height: 1024,
  provenance: { createdAt: 10 }, createdAt: 10, updatedAt: 10,
});
/* EL MUNDO (V1): un material de clase `world`, con su vista previa y su miniatura como VARIANTES, su procedencia y sus derechos. */
const MUNDO = material({
  assetId: id(2), kind: 'world', mimeType: 'application/octet-stream', bytes: 48_000_000, storageRef: objeto(id(2)),
  variants: [
    { kind: 'preview', storageRef: objeto(id(2), 'preview'), mimeType: 'image/png', width: 2048, height: 1024 },
    { kind: 'thumbnail', storageRef: objeto(id(2), 'thumbnail'), mimeType: 'image/webp', width: 400, height: 200 },
  ],
  provenance: {
    createdAt: 20, generationId: 'gen_0001', jobId: 'job_0001', stepId: 'mundo', requestId: 'req_0001',
    capability: 'world.generate', provider: 'p3d', model: 'm3d-1', cost: { provider: { usd: 0.3 } }, sourceAssetIds: [FOTO.assetId],
  },
  derechos: DERECHOS_DEL_MUNDO, name: 'Playa al atardecer', tags: ['playa'], metadata: { experienceId: 'studio' },
  createdAt: 20, updatedAt: 20,
});
/* Un objeto 3D (una silla) de otro modelo, con otra licencia. */
const SILLA = material({
  assetId: id(9), kind: 'model3d', mimeType: 'model/gltf-binary', bytes: 2_000_000, storageRef: objeto(id(9)),
  provenance: { createdAt: 15, capability: 'image.generate' }, derechos: DERECHOS_DEL_OBJETO, name: 'Silla de playa',
  createdAt: 15, updatedAt: 15,
});

/** Lo que trae quien crea un material nuevo a partir de otros. Sus bytes, su id y su operación. */
const datos = (k, ahora, extra = {}) => ({
  ownerAccountId: CUENTA, assetId: id(k), status: 'ready', ahora, storageRef: objeto(id(k)), mimeType: 'application/octet-stream',
  variants: [{ kind: 'preview', storageRef: objeto(id(k), 'preview'), mimeType: 'image/png' }],
  operacion: { generationId: `gen_${k}`, jobId: `job_${k}`, stepId: 'editar', requestId: `req_${k}`, capability: 'world.generate' },
  metadata: { experienceId: 'studio' }, createdByEntityId: '00000002', createdByEntityType: 'WEE_PROFILE',
  ...extra,
});
const conEstado = (a, status, extra = {}) => congelar({ ...a, status, ...extra });

const ANTES = canonico(MUNDO);
const r2 = L.nuevaVersion(MUNDO, datos(3, 30));
const V2 = r2.ok ? congelar(r2.asset) : undefined;

/* ═══ A · EL MUNDO ES UN MATERIAL ═══════════════════════════════════════════ */
seccion('A · El mundo es un material', () => {
  check('A1) un mundo es un material como otro cualquiera: válido, de la cuenta, de clase `world` (y el objeto, `model3d`)',
    A.materialValido(MUNDO) && A.materialEsDeLaCuenta(MUNDO, CUENTA) && A.esTipoDeMaterial('world') && MUNDO.kind === 'world'
    && A.materialValido(SILLA) && SILLA.kind === 'model3d');
  check('A2) dice de dónde salió sin un campo nuevo: es un derivado de la foto de la persona, hecho con Weë',
    V.origenDe(MUNDO) === 'derivado' && V.generacionVisible(MUNDO.provenance)?.capacidad === 'world.generate'
    && canonico(V.generacionVisible(MUNDO.provenance)?.partioDe) === canonico([FOTO.assetId]) && V.origenDe(FOTO) === 'subido');
  const vista = V.vistaDeMaterial(MUNDO);
  check('A3) se lista a su dueña en «Mis creaciones» con su tipo, y lo que se cuenta de cómo se hizo no lleva proveedor, modelo ni coste',
    V.seListaAlDueno(MUNDO.status) && vista.tipo === 'world' && vista.estado === 'disponible'
    && canonico(Object.keys(vista.generacion).sort()) === canonico(['capacidad', 'creadoEn', 'hechoConWee', 'partioDe']));
  check('A4) sus derechos viajan en el contrato que ya existe: unos mal escritos invalidan el material',
    A.derechosValidos(MUNDO.derechos) && !A.materialValido({ ...MUNDO, derechos: { ...DERECHOS_DEL_MUNDO, jurisdiccionesBloqueadas: ['eu'] } }));
});

/* ═══ B · VERSIONAR: V1 → EDITAR → V2 ═══════════════════════════════════════ */
seccion('B · Versionar: V1 → editar → V2', () => {
  check('B1) «mejora este mundo» da OTRO material: válido, de la misma clase, con su propio id y sus propios bytes',
    r2.ok && A.materialValido(V2) && V2.kind === 'world' && V2.assetId === id(3)
    && !A.mismaReferencia(V2.storageRef, MUNDO.storageRef) && V2.createdAt === 30 && V2.updatedAt === 30);
  check('B2) apunta a la anterior y la lleva la primera en su procedencia: «versión de» y «salió de», con los campos que ya había',
    V2.previousVersionId === MUNDO.assetId && V2.provenance.sourceAssetIds[0] === MUNDO.assetId && V.vistaDeMaterial(V2).vieneDe === MUNDO.assetId);
  check('B3) es la misma cosa, mejorada: hereda el nombre, las etiquetas y los derechos (no las variantes, que son de sus bytes)',
    V2.name === MUNDO.name && canonico(V2.tags) === canonico(MUNDO.tags) && equivalentes(V2.derechos, MUNDO.derechos)
    && V2.variants.length === 1 && !V2.variants.some((v) => MUNDO.variants.some((w) => A.mismaReferencia(v.storageRef, w.storageRef))));
  check('B4) la versión anterior no se toca: la misma ficha, byte a byte (y entraba congelada)', canonico(MUNDO) === ANTES);
  check('B5) la clase no la elige quien llama: una versión de un mundo es un mundo aunque se pida otra cosa',
    L.nuevaVersion(MUNDO, { ...datos(3, 30), kind: 'image' }).asset?.kind === 'world');
  check('B6) es determinista: los mismos datos dan la misma ficha', canonico(L.nuevaVersion(MUNDO, datos(3, 30))) === canonico(r2));
  const motivo = (r) => (r.ok ? 'ok' : r.motivo);
  const casos = [
    ['de un material retirado', L.nuevaVersion(conEstado(MUNDO, 'deleted', { deletedAt: 25 }), datos(3, 30)), 'fuente_no_lista'],
    ['de uno que aún se está preparando', L.nuevaVersion(conEstado(MUNDO, 'processing'), datos(3, 30)), 'fuente_no_lista'],
    ['de uno que falló', L.nuevaVersion(conEstado(MUNDO, 'failed', { storageRef: undefined }), datos(3, 30)), 'fuente_no_lista'],
    ['de uno con derechos que no se entienden', L.nuevaVersion(conEstado(MUNDO, 'ready', { derechos: { ...DERECHOS_DEL_MUNDO, jurisdiccionesBloqueadas: ['eu'] } }), datos(3, 30)), 'fuente_invalida'],
    ['de otra cuenta', L.nuevaVersion(MUNDO, { ...datos(3, 30), ownerAccountId: OTRA }), 'fuente_ajena'],
    ['con los bytes de la anterior', L.nuevaVersion(MUNDO, { ...datos(3, 30), storageRef: MUNDO.storageRef }), 'objeto_compartido'],
    ['con su vista previa como archivo', L.nuevaVersion(MUNDO, { ...datos(3, 30), storageRef: MUNDO.variants[0].storageRef }), 'objeto_compartido'],
    ['con su objeto en otra versión del almacén', L.nuevaVersion(MUNDO, { ...datos(3, 30), storageRef: { ...MUNDO.storageRef, version: '7' } }), 'objeto_compartido'],
    ['con el id de la anterior', L.nuevaVersion(MUNDO, { ...datos(3, 30), assetId: MUNDO.assetId }), 'id_ocupado'],
    ['lista y sin bytes', L.nuevaVersion(MUNDO, { ...datos(3, 30), storageRef: undefined, variants: undefined }), 'material_invalido'],
    ['de nada', L.nuevaVersion(undefined, datos(3, 30)), 'sin_fuentes'],
    ['con unos derechos de la operación que no se entienden', L.nuevaVersion(MUNDO, { ...datos(3, 30), derechosDeLaOperacion: { revision: 'OK' } }), 'derechos_invalidos'],
  ];
  const mal = casos.filter(([, r, esperado]) => motivo(r) !== esperado).map(([nombre, r, esperado]) => `${nombre}: ${motivo(r)} ≠ ${esperado}`);
  check(`B7) y no se crea nada cuando no se debe (${casos.length} formas), cada una con su motivo literal`, mal.length === 0, mal.join(' · '));
});

/* ═══ C · RECUPERAR UNA VERSIÓN ═════════════════════════════════════════════ */
/* V1(20) → V2(30) → V3(40) → V4(50, preparándose) · y una rama: V1 → V2b(35). */
const V3 = congelar(L.nuevaVersion(V2, datos(4, 40)).asset);
const V2b = congelar(L.nuevaVersion(MUNDO, datos(5, 35)).asset);
const V4 = congelar(L.nuevaVersion(V3, datos(6, 50, { status: 'processing' })).asset);
const LINEA = [MUNDO, V2, V3, V2b, V4];
seccion('C · Recuperar una versión', () => {
  const linea = L.lineaDeVersiones(V3.assetId, [...LINEA, FOTO, SILLA]);
  check('C1) la línea sale de cualquier versión: la raíz es la primera y se numeran por fecha (1…5), con la rama dentro',
    linea?.raizId === MUNDO.assetId && canonico(linea.versiones.map((v) => v.assetId)) === canonico([MUNDO, V2, V2b, V3, V4].map((a) => a.assetId))
    && canonico(linea.versiones.map((v) => v.numero)) === canonico([1, 2, 3, 4, 5]) && linea.incompleta === false);
  const desde = [MUNDO, V2b, V4].map((a) => canonico(L.lineaDeVersiones(a.assetId, [...LINEA].reverse())));
  check('C2) desde la 1, desde la rama o desde la última, y lea en el orden que lea: la misma línea', desde.every((x) => x === canonico(linea)));
  const dos = L.versionNumero(linea, 2);
  const ficha = LINEA.find((a) => a.assetId === dos?.assetId);
  check('C3) «la versión 2» se recupera entera, con sus propios bytes', dos?.assetId === V2.assetId && A.materialValido(ficha)
    && !A.mismaReferencia(ficha.storageRef, MUNDO.storageRef) && L.versionNumero(linea, 9) === undefined);
  check('C4) la vigente es la más nueva que está LISTA (la 4.ª); la última, la que se está preparando',
    linea.vigenteId === V3.assetId && linea.ultimaId === V4.assetId);
  check('C5) a quien usa la 1 se le avisa de que hay una más nueva; a quien usa la vigente, no; nadie se mueve solo',
    L.versionMasNueva(linea, MUNDO.assetId) === V3.assetId && L.versionMasNueva(linea, V3.assetId) === undefined
    && L.versionMasNueva(linea, FOTO.assetId) === undefined);
  const intrusa = congelar({ ...V2, assetId: id(77), ownerAccountId: OTRA, storageRef: objeto(id(77), 'original', OTRA), variants: undefined });
  check('C6) una ficha de otra cuenta que dijera «vengo de tu mundo» no entra en tu línea, ni lo que no es versión (la foto)',
    !L.lineaDeVersiones(MUNDO.assetId, [...LINEA, intrusa, FOTO]).versiones.some((v) => v.assetId === intrusa.assetId || v.assetId === FOTO.assetId));
  const sinLaDos = L.lineaDeVersiones(V3.assetId, [MUNDO, V3, V4]);
  check('C7) si falta una anterior entre lo leído, la línea lo DICE (incompleta) y no inventa la que falta',
    sinLaDos.incompleta === true && sinLaDos.raizId === V3.assetId && !sinLaDos.versiones.some((v) => v.assetId === V2.assetId));
  const x = congelar({ ...SILLA, assetId: id(80), storageRef: objeto(id(80)), previousVersionId: id(81) });
  const y = congelar({ ...SILLA, assetId: id(81), storageRef: objeto(id(81)), previousVersionId: id(80) });
  check('C8) una cadena que se cierra sobre sí misma no cuelga nada: termina y se marca incompleta',
    L.lineaDeVersiones(x.assetId, [x, y])?.incompleta === true && L.lineaDeVersiones(x.assetId, [x, y]).versiones.length === 2);
  const retirada = L.lineaDeVersiones(MUNDO.assetId, [MUNDO, conEstado(V2, 'deleted', { deletedAt: 60 }), conEstado(V3, 'deleted', { deletedAt: 60 }), V2b, V4]);
  check('C9) retirar una versión no renumera nada (la ficha se queda) y la vigente pasa a la más nueva que sigue lista',
    retirada.versiones.length === 5 && retirada.versiones[1].numero === 2 && retirada.versiones[1].status === 'deleted' && retirada.vigenteId === V2b.assetId);
  check('C10) de un id que no está, no hay línea', L.lineaDeVersiones(id(999), LINEA) === undefined);
});

/* ═══ D · REUTILIZAR ES REFERENCIAR ═════════════════════════════════════════ */
seccion('D · Reutilizar es referenciar', () => {
  const tabla = L.CONSECUENCIA_DE_OPERACION;
  const crean = Object.keys(tabla).filter((k) => tabla[k] === 'nueva_version' || tabla[k] === 'material_derivado').sort();
  check('D1) solo DOS operaciones crean un material, y las dos cambian lo que hay en los bytes: editar (versión) y derivar',
    canonico(crean) === canonico(['derivar', 'editar']) && tabla.editar === 'nueva_version' && tabla.derivar === 'material_derivado');
  const usar = ['anadir_a_proyecto', 'insertar_en_escena', 'colocar_en_escena', 'anadir_a_elemento', 'referenciar_en_produccion', 'publicar', 'volver_a_una_version'];
  check('D2) ponerlo en un proyecto, en una escena, en un Element o en una producción, moverlo, publicarlo o volver a una versión: una referencia',
    usar.every((k) => tabla[k] === 'referencia') && tabla.convertir_formato === 'variante' && tabla.renombrar === 'misma_ficha'
    && tabla.llevar_a_otra_cuenta === 'no_admitido' && Object.keys(tabla).length === 12 && Object.isFrozen(tabla));
  const salon = E3.crearEscena3D({ sceneId: 'salon-b', modo: 'design', ownerAccountId: CUENTA, projectId: 'proyDesignB', ahora: 1 });
  const conMundo = E3.agregarNodo3D(salon, { nodeId: 'fondo', papel: 'environment', assetId: MUNDO.assetId, transform: T }, 2);
  const movido = E3.moverNodo3D(conMundo, 'fondo', { posicion: [0, -1, 0], rotacion: [0, 0, 0, 1], escala: [2, 2, 2] }, 3);
  check('D3) meter el mundo en una escena de Weë Design y moverlo cambia la ESCENA, no el material',
    canonico(MUNDO) === ANTES && movido.nodos[0].assetId === MUNDO.assetId && movido.nodos[0].transform.escala[0] === 2 && E3.validarEscena3D(movido).length === 0);
  const playa = { contract: '1.0', elementId: 'elem_playa', type: 'scene', version: 1, status: 'active', name: 'Playa', ownerAccountId: CUENTA,
    refs: [{ assetId: MUNDO.assetId, role: 'primary', kind: 'world' }], createdAt: 1, updatedAt: 1 };
  const ficha = (a) => ({ assetId: a.assetId, ownerAccountId: a.ownerAccountId, kind: a.kind, status: a.status });
  check('D4) un Element («la playa») apunta al mundo por id y el enlace se comprueba con la regla de siempre (dueño, estado, clase)',
    EL.elementoValido(playa) && EL.puedeReferenciar(playa.refs[0], ficha(MUNDO), CUENTA).ok
    && EL.puedeReferenciar({ ...playa.refs[0], kind: 'image' }, ficha(MUNDO), CUENTA).reason === 'kind_mismatch'
    && EL.puedeReferenciar(playa.refs[0], ficha(MUNDO), OTRA).reason === 'not_found');
  const vuelta = { ...movido, nodos: movido.nodos.map((x) => ({ ...x, assetId: V2.assetId })) };
  const deVuelta = { ...vuelta, nodos: vuelta.nodos.map((x) => ({ ...x, assetId: MUNDO.assetId })) };
  check('D5) volver a la versión anterior en una escena es volver a apuntarla: ninguna ficha nueva, ninguna borrada',
    E3.validarEscena3D(vuelta).length === 0 && E3.validarEscena3D(deVuelta).length === 0
    && canonico(E3.materialesDeLaEscena3D(deVuelta)) === canonico([MUNDO.assetId]) && canonico(MUNDO) === ANTES && A.materialValido(V2));
});

/* ═══ E · VARIOS PROYECTOS, UN MATERIAL ═════════════════════════════════════ */
/* El mismo mundo en Weë Studio (proyecto A), en Weë Design (proyecto B) y en Filmmaker (producción C). */
const ESCENA_STUDIO = (() => {
  let s = E3.crearEscena3D({ sceneId: 'mundo-a', modo: 'world', ownerAccountId: CUENTA, projectId: 'proyStudioA', ahora: 1, entorno: { worldAssetId: MUNDO.assetId } });
  s = E3.agregarNodo3D(s, { nodeId: 'silla', papel: 'object', assetId: SILLA.assetId, transform: T }, 2);
  s = E3.agregarNodo3D(s, { nodeId: 'sol', papel: 'light', transform: T }, 3);
  return E3.fijarCamara3D(s, { cameraId: 'principal', posicion: [0, 2, 8], objetivo: [0, 0, 0], fovGrados: 55 }, 4);
})();
const ESCENA_DESIGN = E3.agregarNodo3D(
  E3.agregarNodo3D(E3.crearEscena3D({ sceneId: 'salon-b', modo: 'design', ownerAccountId: CUENTA, projectId: 'proyDesignB', ahora: 1 }),
    { nodeId: 'fondo', papel: 'environment', assetId: MUNDO.assetId, transform: T }, 2),
  { nodeId: 'silla', papel: 'object', assetId: SILLA.assetId, transform: T }, 3);
const PRODUCCION = {
  ...M.produccionVacia({ title: 'Paseo por la playa', aspectRatio: '16:9', resolution: '1080p', id: 'prodFilmC0001' }),
  references: [{ id: 'ref-mundo', kind: 'world', role: 'location', assetId: MUNDO.assetId }],
  locations: [{ id: 'loc-playa', name: 'Playa', setting: 'exterior', referenceIds: ['ref-mundo'] }],
  scenes: [{
    id: 'sc-0001', order: 0, title: 'Llegada', locationId: 'loc-playa',
    shots: [
      { id: 'sh-0101', order: 0, durationSec: 5, description: 'La cámara entra en la playa' },
      { id: 'sh-0102', order: 1, durationSec: 4, description: 'Plano general del atardecer' },
    ],
  }],
};
const FILAS = [
  { projectId: 'proyStudioA', kind: 'asset', itemId: MUNDO.assetId, addedAt: 5 },
  { projectId: 'proyStudioA', kind: 'asset', itemId: MUNDO.assetId, addedAt: 6 },
  { projectId: 'proyDesignB', kind: 'asset', itemId: MUNDO.assetId, addedAt: 7 },
  { projectId: 'proyDesignB', kind: 'asset', itemId: SILLA.assetId, addedAt: 8 },
];
/* Cada consumidor dice lo que usa con SU función de siempre; aquí solo se juntan. */
const referenciasDe = ({ escenas = [], filas = [], producciones = [], elementos = [], planos = [] }) => [
  ...filas.map((f) => ({ consumidor: 'proyecto', consumidorId: f.projectId, assetIds: [f.itemId], projectId: f.projectId })),
  ...escenas.map((e) => ({ consumidor: 'escena3d', consumidorId: e.sceneId, assetIds: E3.materialesDeLaEscena3D(e), ...(e.projectId ? { projectId: e.projectId } : {}) })),
  ...producciones.map((p) => ({ consumidor: 'produccion', consumidorId: p.id, assetIds: p.references.flatMap((r) => (r.assetId ? [r.assetId] : [])), projectId: p.id })),
  ...elementos.map((e) => ({ consumidor: 'elemento', consumidorId: e.elementId, assetIds: e.refs.map((r) => r.assetId) })),
  ...planos.map((s) => ({ consumidor: 'plano', consumidorId: s.shotId, assetIds: s.producedAssetId ? [s.producedAssetId] : [], projectId: s.projectId })),
];
seccion('E · Varios proyectos, un material', () => {
  const refs = referenciasDe({ escenas: [ESCENA_STUDIO, ESCENA_DESIGN], filas: FILAS, producciones: [PRODUCCION] });
  check('E1) el mundo está en tres proyectos de tres experiencias: Studio A, Design B y Filmmaker C',
    canonico(L.proyectosQueUsan(MUNDO.assetId, refs)) === canonico(['prodFilmC0001', 'proyDesignB', 'proyStudioA']));
  const usos = L.usosDelMaterial(MUNDO.assetId, refs);
  check('E2) dónde se usa, sin repetir (la fila repetida del proyecto A cuenta una vez): 2 escenas, 1 producción y 2 proyectos',
    usos.length === 5 && usos.filter((u) => u.consumidor === 'escena3d').length === 2 && usos.filter((u) => u.consumidor === 'produccion').length === 1
    && usos.filter((u) => u.consumidor === 'proyecto').length === 2);
  const delMundo = new Set(refs.flatMap((r) => r.assetIds).filter((x) => LINEA.some((a) => a.assetId === x)));
  check('E3) y en los tres sitios es EL MISMO id: un material, un objeto, cero copias',
    delMundo.size === 1 && delMundo.has(MUNDO.assetId) && L.materialesQueCompartenObjeto([FOTO, MUNDO, SILLA]).length === 0);
  check('E4) añadirlo dos veces al mismo proyecto es la misma fila (la clave de siempre) y el proyecto no posee: la fila apunta',
    P.claveDeElemento(FILAS[0]) === P.claveDeElemento(FILAS[1])
    && canonico([...P.proyectosDe(FILAS, 'asset', MUNDO.assetId)].sort()) === canonico(['proyDesignB', 'proyStudioA']));
  const studioEnV2 = { ...ESCENA_STUDIO, entorno: { worldAssetId: V2.assetId } };
  const conV2 = referenciasDe({ escenas: [studioEnV2, ESCENA_DESIGN], producciones: [PRODUCCION] });
  const linea = L.lineaDeVersiones(MUNDO.assetId, LINEA);
  const porVersion = L.usosPorVersion(linea, conV2);
  check('E5) Studio pasa a la versión 2 y Design sigue en la 1: cada uso apunta a SU versión, y el aviso de «hay una más nueva» es por uso',
    porVersion[V2.assetId].map((u) => u.consumidorId).join() === 'mundo-a'
    && canonico(porVersion[MUNDO.assetId].map((u) => u.consumidorId).sort()) === canonico(['prodFilmC0001', 'salon-b'])
    && L.versionMasNueva(linea, MUNDO.assetId) === V3.assetId && E3.validarEscena3D(studioEnV2).length === 0);
});

/* ═══ F · LOS DERECHOS SOLO SE ENDURECEN ════════════════════════════════════ */
seccion('F · Los derechos solo se endurecen', () => {
  check('F1) sin derechos de nadie, no hay derechos (un material sin licencia ajena declarada)',
    L.combinarDerechos([]).ok && L.combinarDerechos([]).derechos === undefined && L.combinarDerechos([undefined, undefined]).derechos === undefined);
  const juntos = L.combinarDerechos([MUNDO.derechos, SILLA.derechos]);
  check('F2) mundo + silla: la revisión y el uso más estrictos, la atribución si alguno la exige, TODAS las licencias y TODAS las jurisdicciones',
    juntos.ok && juntos.derechos.revision === 'REVIEW_REQUIRED' && juntos.derechos.usoComercial === 'RESTRICTED' && juntos.derechos.atribucion === true
    && juntos.derechos.licencias.length === 3 && canonico(juntos.derechos.jurisdiccionesBloqueadas) === canonico(['CN', 'EU', 'GB', 'KR'])
    && A.derechosValidos(juntos.derechos));
  check('F3) es canónico: A con B da lo mismo que B con A, y juntar algo consigo mismo no cambia nada',
    canonico(juntos) === canonico(L.combinarDerechos([SILLA.derechos, MUNDO.derechos]))
    && equivalentes(L.combinarDerechos([MUNDO.derechos, MUNDO.derechos]).derechos, MUNDO.derechos));
  const d = (extra) => ({ revision: 'APPROVED', usoComercial: 'ALLOWED', atribucion: false, licencias: [], ...extra });
  const gana = (a, b, campo) => L.combinarDerechos([d(a), d(b)]).derechos[campo];
  check('F4) en cada dimensión gana lo más estricto (lo que no se sabe pesa más que una restricción conocida)',
    gana({ revision: 'APPROVED' }, { revision: 'BLOCKED_GLOBAL' }, 'revision') === 'BLOCKED_GLOBAL'
    && gana({ usoComercial: 'RESTRICTED' }, { usoComercial: 'UNCLEAR' }, 'usoComercial') === 'UNCLEAR'
    && gana({ usoComercial: 'UNCLEAR' }, { usoComercial: 'NOT_ALLOWED' }, 'usoComercial') === 'NOT_ALLOWED'
    && gana({ atribucion: false }, { atribucion: 'UNKNOWN' }, 'atribucion') === 'UNKNOWN'
    && gana({ atribucion: 'UNKNOWN' }, { atribucion: true }, 'atribucion') === true);
  const muchas = (k) => Array.from({ length: k }, (_, i) => ({ nombre: `L${i}`, url: `https://example.org/l/${i}` }));
  /* 64 códigos de dos letras (AA…CL), el tope del contrato: con uno más ya no caben. */
  const sesentaYCuatro = Array.from({ length: 64 }, (_, i) => String.fromCharCode(65 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26)));
  check('F5) falla CERRADO: unos derechos que no se entienden no se tratan como ausentes, y lo que no cabe no se recorta',
    L.combinarDerechos([MUNDO.derechos, { ...DERECHOS_DEL_MUNDO, jurisdiccionesBloqueadas: ['eu'] }]).motivo === 'derechos_invalidos'
    && L.combinarDerechos([null]).motivo === 'derechos_invalidos'
    && L.combinarDerechos([d({ licencias: muchas(6) }), d({ licencias: muchas(11).slice(6) })]).motivo === 'no_representables'
    && L.combinarDerechos([d({ jurisdiccionesBloqueadas: sesentaYCuatro })]).ok === true
    && L.combinarDerechos([d({ jurisdiccionesBloqueadas: ['EU'] }), d({ jurisdiccionesBloqueadas: sesentaYCuatro })]).motivo === 'no_representables');
  const video = L.materialDerivado('video', [MUNDO, SILLA], datos(20, 70, { mimeType: 'video/mp4', durationSec: 8, variants: undefined, operacion: { capability: 'video.generate' } }));
  check('F6) lo que sale del mundo hereda sus restricciones: una versión las conserva y un derivado las suma a las de sus otras fuentes',
    video.ok && canonico(video.asset.derechos) === canonico(juntos.derechos) && L.derechosNoSeRelajan(V2.derechos, [MUNDO.derechos])
    && L.derechosNoSeRelajan(video.asset.derechos, [MUNDO.derechos, SILLA.derechos]));
  const laxa = L.nuevaVersion(MUNDO, datos(21, 71, { derechosDeLaOperacion: d({}) }));
  const estricta = L.nuevaVersion(MUNDO, datos(22, 72, { derechosDeLaOperacion: d({ revision: 'BLOCKED_GLOBAL', jurisdiccionesBloqueadas: ['US'] }) }));
  check('F7) la operación puede ENDURECER (otra licencia, otro territorio) pero no puede soltar nada: no hay entrada que quite lo heredado',
    laxa.ok && equivalentes(laxa.asset.derechos, MUNDO.derechos) && estricta.ok && estricta.asset.derechos.revision === 'BLOCKED_GLOBAL'
    && canonico(estricta.asset.derechos.jurisdiccionesBloqueadas) === canonico(['EU', 'GB', 'KR', 'US']));
  const sinEU = { ...DERECHOS_DEL_MUNDO, jurisdiccionesBloqueadas: ['GB', 'KR'] };
  const relajados = [
    ['sin la UE', sinEU], ['aprobado', { ...DERECHOS_DEL_MUNDO, revision: 'APPROVED' }], ['uso libre', { ...DERECHOS_DEL_MUNDO, usoComercial: 'ALLOWED' }],
    ['sin atribución', { ...DERECHOS_DEL_MUNDO, atribucion: false }], ['con una licencia menos', { ...DERECHOS_DEL_MUNDO, licencias: [LIC_MUNDO] }],
    ['sin derechos', undefined], ['mal escritos', { ...DERECHOS_DEL_MUNDO, revision: 'OK' }],
  ];
  const pasan = relajados.filter(([, h]) => L.derechosNoSeRelajan(h, [MUNDO.derechos])).map(([nombre]) => nombre);
  check(`F8) la invariante de la línea muerde: un hijo más libre que su fuente no pasa (${relajados.length} formas)`, pasan.length === 0, pasan.join(', '));
  const deLaEscena = L.derechosDeLosMateriales(E3.materialesDeLaEscena3D(ESCENA_STUDIO), [FOTO, MUNDO, SILLA]);
  check('F9) una escena tiene los derechos de lo que usa, juntos: la de Studio no puede enseñarse en la UE, el Reino Unido, Corea ni China',
    deLaEscena.ok && canonico(deLaEscena.derechos.jurisdiccionesBloqueadas) === canonico(['CN', 'EU', 'GB', 'KR']));
  const falta = L.derechosDeLosMateriales(E3.materialesDeLaEscena3D(ESCENA_STUDIO), [MUNDO]);
  const retirado = L.derechosDeLosMateriales([MUNDO.assetId], [conEstado(MUNDO, 'deleted', { deletedAt: 90 })]);
  check('F10) sin haber leído todo lo que usa no se afirma nada (material_desconocido); y lo retirado sigue obligando',
    !falta.ok && falta.motivo === 'material_desconocido' && canonico(falta.desconocidos) === canonico([SILLA.assetId])
    && retirado.ok && equivalentes(retirado.derechos, MUNDO.derechos));
});

/* ═══ G · LA PROCEDENCIA ════════════════════════════════════════════════════ */
seccion('G · La procedencia', () => {
  check('G1) la versión lleva la operación que la hizo (generación, trabajo, paso, petición, capacidad) y de qué salió, con su fecha',
    V2.provenance.generationId === 'gen_3' && V2.provenance.jobId === 'job_3' && V2.provenance.stepId === 'editar' && V2.provenance.requestId === 'req_3'
    && V2.provenance.capability === 'world.generate' && canonico(V2.provenance.sourceAssetIds) === canonico([MUNDO.assetId]) && V2.provenance.createdAt === 30);
  const colada = L.nuevaVersion(MUNDO, datos(23, 73, { operacion: { capability: 'world.generate', sourceAssetIds: [], createdAt: 1 } }));
  check('G2) nadie pisa las fuentes ni la fecha desde fuera: las pone el linaje, no la operación',
    colada.ok && canonico(colada.asset.provenance.sourceAssetIds) === canonico([MUNDO.assetId]) && colada.asset.provenance.createdAt === 73);
  const conReferencia = L.nuevaVersion(V2, datos(24, 74), [FOTO]);
  check('G3) lo que además se usó para editar (una foto de referencia) entra en la procedencia, detrás de la versión anterior',
    conReferencia.ok && canonico(conReferencia.asset.provenance.sourceAssetIds) === canonico([V2.assetId, FOTO.assetId]) && conReferencia.asset.previousVersionId === V2.assetId);
  const video = L.materialDerivado('video', [V2, SILLA], datos(25, 75, { mimeType: 'video/mp4', durationSec: 8, variants: undefined, operacion: { capability: 'video.generate' } })).asset;
  const todos = [FOTO, MUNDO, SILLA, V2, video];
  const buscar = (x) => todos.find((a) => a.assetId === x);
  check('G4) del vídeo se vuelve hasta la foto: vídeo → mundo v2 → mundo v1 → foto (la cadena de origen que ya existía)',
    canonico([...A.cadenaDeOrigen(video.assetId, buscar)].sort()) === canonico([MUNDO.assetId, V2.assetId, FOTO.assetId, SILLA.assetId].sort()));
  check('G5) lo que se le cuenta a una persona dice de qué partió, sin proveedor, modelo ni coste',
    canonico(V.generacionVisible(video.provenance).partioDe) === canonico([V2.assetId, SILLA.assetId])
    && !clavesDe(V.generacionVisible(video.provenance)).some((k) => ['provider', 'model', 'cost', 'jobId'].includes(k)));
  const extraida = L.materialDerivado('model3d', [V2], datos(26, 76, { mimeType: 'model/gltf-binary' })).asset;
  const lineaIds = L.lineaDeVersiones(MUNDO.assetId, [...LINEA, extraida]).versiones.map((v) => v.assetId);
  check('G6) «lo que se hizo a partir de este mundo», en cualquiera de sus versiones: el objeto extraído y el vídeo, nunca sus versiones',
    canonico(L.derivadosDe(lineaIds, [...LINEA, extraida, video, FOTO, SILLA])) === canonico([video.assetId, extraida.assetId].sort())
    && !L.derivadosDe([MUNDO.assetId], [...LINEA, extraida]).includes(V2.assetId));
});

/* ═══ H · LA VISTA PREVIA, SEPARADA DEL ARCHIVO PRINCIPAL ═══════════════════ */
seccion('H · La vista previa, separada del archivo principal', () => {
  const vista = V.representacionPara(MUNDO, 'vista');
  const original = V.representacionPara(MUNDO, 'original');
  const mini = V.representacionPara(MUNDO, 'miniatura');
  check('H1) la vista previa es una VARIANTE del mundo: otro objeto, con su tipo, y se dice que no es el original',
    vista?.esElOriginal === false && vista.variante === 'preview' && vista.mimeType === 'image/png' && !A.mismaReferencia(vista.ref, MUNDO.storageRef));
  check('H2) el archivo principal se pide aparte y es el de verdad; la miniatura de una rejilla, la más pequeña',
    original?.esElOriginal === true && A.mismaReferencia(original.ref, MUNDO.storageRef) && mini?.variante === 'thumbnail');
  const retirada = A.retirar(MUNDO, 100);
  check('H3) la vista previa no sobrevive al mundo: retirarlo devuelve sus tres objetos para borrar',
    retirada.borrar.length === 3 && MUNDO.variants.every((v) => retirada.borrar.some((r) => A.mismaReferencia(r, v.storageRef))));
  check('H4) cada versión tiene SU vista previa (la de la v2 no es la de la v1)',
    !A.mismaReferencia(V.representacionPara(V2, 'vista').ref, vista.ref));
  const previa = L.materialDerivado('image', [MUNDO], datos(30, 80, { mimeType: 'image/png', variants: undefined }));
  const conPrevia = E3.crearEscena3D({ sceneId: 'mundo-previa', modo: 'world', ownerAccountId: CUENTA, ahora: 1,
    entorno: { worldAssetId: MUNDO.assetId, previewAssetId: previa.asset?.assetId } });
  check('H5) si la vista previa llega como material aparte (el `previewAssetId` del núcleo 3D), es un derivado del mundo con SUS restricciones',
    previa.ok && previa.asset.kind === 'image' && canonico(previa.asset.provenance.sourceAssetIds) === canonico([MUNDO.assetId])
    && L.derechosNoSeRelajan(previa.asset.derechos, [MUNDO.derechos])
    && canonico(E3.materialesDeLaEscena3D(conPrevia)) === canonico([MUNDO.assetId, previa.asset.assetId].sort()));
  const sinPrevia = congelar({ ...MUNDO, assetId: id(31), storageRef: objeto(id(31)), variants: undefined });
  check('H6) un mundo sin vista previa no se disfraza: para «ver» se ofrece el original y se dice (la interfaz sabe que pesa)',
    V.representacionPara(sinPrevia, 'vista')?.esElOriginal === true);
});

/* ═══ I · LA ESCENA REFERENCIA MATERIALES Y NO ES OTRA CAPA ═════════════════ */
seccion('I · La escena referencia materiales y no es otra capa', () => {
  check('I1) la escena de Studio es válida: entorno (el mundo), objeto (la silla), luz y cámara',
    E3.validarEscena3D(ESCENA_STUDIO).length === 0 && ESCENA_STUDIO.nodos.length === 2 && ESCENA_STUDIO.camaras.length === 1
    && canonico(E3.materialesDeLaEscena3D(ESCENA_STUDIO)) === canonico([MUNDO.assetId, SILLA.assetId].sort()));
  const PROHIBIDAS = ['storageRef', 'objectKey', 'bucket', 'url', 'delivery', 'derechos', 'provenance', 'variants', 'mimeType', 'bytes'];
  check('I2) guarda IDS y nada del material: ni bytes, ni referencias de almacén, ni URL, ni derechos copiados',
    !clavesDe(ESCENA_STUDIO).some((k) => PROHIBIDAS.includes(k)) && !textosDe(ESCENA_STUDIO).some((t) => /^https?:/.test(t)));
  check('I3) una URL en lugar de un id no entra (la regla del núcleo, intacta)',
    /un id, nunca una URL/.test(lanza(() => E3.agregarNodo3D(ESCENA_STUDIO, { nodeId: 'u', papel: 'object', assetId: 'https://cdn.example/x.glb', transform: T }, 5)) || ''));
  const ids = new Set(E3.materialesDeLaEscena3D(ESCENA_STUDIO));
  check('I4) todo lo que la escena usa existe como material de la cuenta: la escena compone, el material es otra cosa',
    [...ids].every((x) => [MUNDO, SILLA].some((a) => a.assetId === x && A.materialEsDeLaCuenta(a, ESCENA_STUDIO.ownerAccountId))));
  const previz = E3.agregarNodo3D(
    E3.crearEscena3D({ sceneId: 'previz-c', modo: 'filmmaker', ownerAccountId: CUENTA, projectId: 'prodFilmC0001', ahora: 1, entorno: { worldAssetId: MUNDO.assetId } }),
    { nodeId: 'luna', papel: 'character', elementId: 'elem_luna', transform: T }, 2);
  check('I5) el MISMO núcleo sirve a Filmmaker: su perfil admite personajes y referencia el mismo mundo por id',
    E3.validarEscena3D(previz).length === 0 && E3.materialesDeLaEscena3D(previz).includes(MUNDO.assetId));
});

/* ═══ J · FILMMAKER: MATERIAL 3D → ESCENA → PLANO → LÍNEA DE TIEMPO ═════════ */
seccion('J · Filmmaker: material 3D → escena → plano → línea de tiempo', () => {
  const valida = FV.validarProduccion(PRODUCCION, { stage: 'ready' });
  check('J1) una producción que usa el mundo como escenario es válida y está lista: el contrato admite un material `world`',
    valida.valid, valida.problems.filter((x) => x.severity === 'error').map((x) => `${x.path}:${x.code}`).join(' '));
  const linea = RQ.lineaDeTiempo(PRODUCCION);
  check('J2) la línea de tiempo sale de las escenas y los planos: 9 s, dos tramos en orden, la escena entera',
    linea?.totalSec === 9 && linea.segments.map((s) => s.shotId).join() === 'sh-0101,sh-0102' && linea.scenes[0].endSec === 9);
  const req = RQ.requisitosDeProduccion(PRODUCCION);
  check('J3) el mundo llega a cada plano por su lugar: material → referencia → lugar → escena → plano',
    req.ok && req.requirements.shots.length === 2
    && req.requirements.shots.every((s) => (s.input.location?.definition?.referenceIds ?? []).includes('ref-mundo')));
  const ficha = { assetId: MUNDO.assetId, ownerAccountId: CUENTA, kind: 'world', status: 'ready' };
  check('J4) y el servidor de producciones lo dejaría pasar con la regla que ya usa (dueño, estado y clase)',
    EL.puedeReferenciar({ assetId: MUNDO.assetId, kind: 'world', role: 'reference' }, ficha, CUENTA).ok
    && EL.puedeReferenciar({ assetId: MUNDO.assetId, kind: 'image', role: 'reference' }, ficha, CUENTA).reason === 'kind_mismatch');
  const toma = L.materialDerivado('video', [MUNDO], datos(40, 90, { mimeType: 'video/mp4', durationSec: 5, variants: undefined, operacion: { capability: 'video.generate', jobId: 'fm.toma.1' } }));
  const plano = { contract: '1.0', shotId: 'sh-0101', projectId: 'prodFilmC0001', version: 1, order: 0, state: 'generated', sceneId: 'sc-0001',
    ownerAccountId: CUENTA, producedAssetId: toma.asset?.assetId, createdAt: 1, updatedAt: 2 };
  check('J5) la toma del plano es un material derivado del mundo, con sus restricciones, y el plano la apunta por id',
    toma.ok && SH.planoValido(plano) && L.derechosNoSeRelajan(toma.asset.derechos, [MUNDO.derechos])
    && canonico(toma.asset.provenance.sourceAssetIds) === canonico([MUNDO.assetId]));
  const refs = referenciasDe({ producciones: [PRODUCCION], planos: [plano] });
  check('J6) y quién usa qué se sigue sabiendo: el mundo, la producción; la toma, el plano; las dos en el mismo proyecto',
    L.usosDelMaterial(MUNDO.assetId, refs).map((u) => u.consumidor).join() === 'produccion'
    && L.usosDelMaterial(toma.asset.assetId, refs).map((u) => u.consumidor).join() === 'plano'
    && canonico(L.proyectosQueUsan(toma.asset.assetId, refs)) === canonico(['prodFilmC0001']));
});

/* ═══ K · SIN DUPLICACIÓN INNECESARIA ═══════════════════════════════════════ */
seccion('K · Sin duplicación innecesaria', () => {
  const playa = { elementId: 'elem_playa', refs: [{ assetId: MUNDO.assetId }] };
  const refs = referenciasDe({ escenas: [ESCENA_STUDIO, ESCENA_DESIGN], filas: FILAS, producciones: [PRODUCCION], elementos: [playa] });
  check('K1) tres proyectos, dos escenas, un Element y una producción: seis usos del mundo y SIGUE habiendo un material y un objeto',
    L.usosDelMaterial(MUNDO.assetId, refs).length === 6 && L.materialesQueCompartenObjeto([FOTO, MUNDO, SILLA, ...LINEA.slice(1)]).length === 0);
  const copia = congelar({ ...MUNDO, assetId: id(50), variants: undefined });
  const otraVersionDelObjeto = congelar({ ...MUNDO, assetId: id(51), variants: undefined, storageRef: { ...MUNDO.storageRef, version: '2' } });
  check('K2) una copia que apuntara a los bytes del mundo se detecta —también con otra versión del objeto, porque se borra por clave—',
    canonico(L.materialesQueCompartenObjeto([MUNDO, copia])) === canonico([[MUNDO.assetId, copia.assetId]])
    && L.materialesQueCompartenObjeto([MUNDO, otraVersionDelObjeto]).length === 1);
  check('K3) …y no cuenta lo retirado, ni un material que se apunta dos veces a sí mismo',
    L.materialesQueCompartenObjeto([MUNDO, conEstado(copia, 'deleted', { deletedAt: 9 })]).length === 0
    && L.materialesQueCompartenObjeto([congelar({ ...MUNDO, variants: [{ kind: 'preview', storageRef: MUNDO.storageRef }] })]).length === 0);
  check('K4) y el linaje no la deja nacer: un derivado que reutiliza la vista previa del mundo como archivo propio se rechaza',
    L.materialDerivado('image', [MUNDO], { ...datos(52, 95), storageRef: MUNDO.variants[0].storageRef, variants: undefined }).motivo === 'objeto_compartido');
  const CAMPOS_DE_ASSET = ['contract', 'assetId', 'ownerAccountId', 'createdByEntityId', 'createdByEntityType', 'publishedByEntityId',
    'publishedByEntityType', 'kind', 'status', 'storageRef', 'content', 'mimeType', 'bytes', 'width', 'height', 'durationSec', 'variants',
    'provenance', 'previousVersionId', 'name', 'tags', 'metadata', 'derechos', 'createdAt', 'updatedAt', 'deletedAt', 'uploadExpiresAt',
    'failedReason', 'failedAt'];
  const nuevos = [V2, V3, V4, V2b].flatMap((a) => Object.keys(a)).filter((k) => !CAMPOS_DE_ASSET.includes(k));
  check('K5) lo que nace del linaje es un `Asset` y nada más: ni un campo nuevo, ni una ficha de otra forma',
    nuevos.length === 0 && [V2, V3, V4, V2b].every((a) => A.materialValido(a)), [...new Set(nuevos)].join(', '));
});

/* ═══ L · FRONTERAS ═════════════════════════════════════════════════════════ */
seccion('L · Fronteras', () => {
  const fuente = leer('functions/src/core/content/linaje.ts');
  const sinComentarios = fuente.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const imports = [...sinComentarios.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
  check('L1) es Core: solo importa del Core (el material, la identidad y los contratos), y nada de escenas, proyectos ni Filmmaker',
    imports.length > 0 && imports.every((x) => ['../contracts', '../identity', './asset'].includes(x)));
  check('L2) puro: sin base de datos, sin red, sin disco, sin reloj y sin dados',
    !/firebase|firestore|node:fs|node:http|axios|fetch\(|require\(/.test(sinComentarios) && !/Date\.now\(|Math\.random\(|new Date\(/.test(sinComentarios));
  check('L3) sin proveedores: ni un nombre ni un id de modelo (ni en el código ni en los comentarios)',
    !/\bfal\b|hunyuan|tencent|gemini|seedance|seedream|flux|tripo|elevenlabs|openai|anthropic|replicate|https?:\/\//i.test(fuente));
  check('L4) no declara un segundo material, ni otros derechos, ni otra referencia de almacén: usa los que había',
    !/export (interface|type) (Asset|AssetKind|AssetStatus|AssetVariant|Provenance|StorageRef|DerechosDelMaterial)\b/.test(fuente)
    && !/_CONTRACT_VERSION\s*=/.test(fuente) && !/collection|colecci[oó]n\(/i.test(sinComentarios));
  check('L5) una sola puerta: sale por el Content Core y el Core entero',
    core.nuevaVersion === L.nuevaVersion && core.combinarDerechos === L.combinarDerechos && core.lineaDeVersiones === L.lineaDeVersiones
    && core.CONSECUENCIA_DE_OPERACION === L.CONSECUENCIA_DE_OPERACION && /export \* from '\.\/linaje';/.test(leer('functions/src/core/content/index.ts')));
  check('L6) y el núcleo 3D sigue siendo UNO: no aparece otro grafo de escena ni otro compositor',
    fs.readdirSync(path.join(RAIZ, 'functions/src/core')).filter((f) => /escena3d|scene3d|composer|compositor/i.test(f)).join() === 'escena3d.ts'
    && fs.readdirSync(path.join(RAIZ, 'functions/src/core/content')).filter((f) => /escena|scene|mundo|world/i.test(f)).length === 0);
  check('esta suite está en la cadena de `npm test`', /ciclo-de-vida-3d\.test\.mjs/.test(leer('functions/package.json')));
});

console.log(failures ? `\n✘ ${failures} fallo(s) de ${n}` : `\n✔ ciclo de vida 3D: ${n} comprobaciones ($0)`);
process.exit(failures ? 1 : 0);
