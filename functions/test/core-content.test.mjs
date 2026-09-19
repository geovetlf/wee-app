/*
 * WEE CONTENT CORE — MATERIAL, CONTENIDO Y PUBLICACIÓN (fase 11).
 *
 * ── Lo que esto vigila, en una frase ───────────────────────────────────────
 *
 * QUE LOS BYTES SE GUARDEN UNA VEZ. Un material puede estar en dos proyectos,
 * en dos contenidos y en tres publicaciones y sigue siendo un archivo, de una
 * cuenta. Todo lo demás —los tres ciclos de vida, la referencia al almacén en
 * vez de la URL, la procedencia, la visibilidad por publicación— existe para
 * sostener esa frase.
 *
 * ── Y lo que Weë hacía mal, medido, y que aquí no puede volver ─────────────
 *
 *   · un resultado sin id: `creatorJobs.results[].url`;
 *   · publicar descargaba y volvía a subir: tres copias del mismo píxel;
 *   · `Asset.projectId` escalar: un material en un proyecto como máximo;
 *   · `isPrivate` siempre false y sin UI; `isWeel` que nadie leía;
 *   · lo generado era público y no se podía borrar.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

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

const core = (await cargar('functions/src/core/index.ts')).ns;

const DIR = 'functions/src/core/content';
const FUENTES = fs.readdirSync(path.resolve(RAIZ, DIR)).filter((f) => f.endsWith('.ts')).map((f) => `${DIR}/${f}`);
const CODIGO = FUENTES.map((f) => sinComentarios(leer(f))).join('\n');

const CUENTA = 'acc_0018439';
const OTRA = 'acc_0099999';
const REAL = { entityId: '00184391', entityType: 'REAL_PROFILE' };
const WEE = { entityId: '00184392', entityType: 'WEE_PROFILE' };
const PAGE = { entityId: '00184393', entityType: 'PAGE' };
const REF = { provider: 'wee', bucket: 'b', objectKey: 'users/u1/x.png' };

const material = (extra = {}) => ({
  contract: '1.0', assetId: 'asset_0001', ownerAccountId: CUENTA,
  createdByEntityId: REAL.entityId, createdByEntityType: REAL.entityType,
  kind: 'image', status: 'ready', storageRef: REF, mimeType: 'image/png', bytes: 1234,
  width: 1024, height: 1024, provenance: { createdAt: 1 }, createdAt: 1, updatedAt: 1, ...extra,
});
const contenido = (extra = {}) => ({
  contract: '1.0', contentId: 'content_0001', ownerAccountId: CUENTA,
  createdByEntityId: REAL.entityId, createdByEntityType: REAL.entityType,
  type: 'post', status: 'ready', body: 'hola', assetRefs: [{ assetId: 'asset_0001', role: 'primary' }],
  createdAt: 1, updatedAt: 1, ...extra,
});
const publicacion = (extra = {}) => ({
  contract: '1.0', publicationId: 'pub_0001', contentId: 'content_0001', ownerAccountId: CUENTA,
  target: { kind: 'wall' }, publishedByEntityId: REAL.entityId, publishedByEntityType: REAL.entityType,
  visibility: 'public', status: 'published', publishedAt: 2, createdAt: 1, updatedAt: 2, ...extra,
});

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · El material: forma, dueño y estado ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('1) un material bien formado vale', core.materialValido(material()));
  check('2) sin cuenta no hay material',
    !core.materialValido(material({ ownerAccountId: '' })) && !core.materialValido(material({ ownerAccountId: undefined })));
  check('3) los tipos son los seis de siempre, y la miniatura NO es uno',
    core.TIPOS_DE_MATERIAL.join() === 'text,image,video,audio,document,model3d'
    && !core.esTipoDeMaterial('thumbnail') && !core.esTipoDeMaterial('IMAGE'));

  /* 4 · LA URL YA NO ES LA IDENTIDAD. El material no tiene campo `url`. */
  check('4) el material no tiene URL: tiene referencia al almacén',
    !/^\s*url\??: string;/m.test(sinComentarios(leer(`${DIR}/asset.ts`)))
    && /storageRef\?: StorageRef;/.test(leer(`${DIR}/asset.ts`)),
    'la URL de entrega cambia; dónde está el objeto, no');
  check('5) un material listo que no es texto TIENE que tener bytes detrás',
    !core.materialValido(material({ storageRef: undefined }))
    && core.materialValido(material({ kind: 'text', storageRef: undefined, content: 'un poema' })));

  /* 6–8 · La referencia al almacén, agnóstica. */
  check('6) una referencia válida tiene proveedor y clave',
    core.esStorageRef(REF) && core.esStorageRef({ provider: 'gcs', objectKey: 'a/b' })
    && !core.esStorageRef({ provider: 'gcs' }) && !core.esStorageRef({ objectKey: 'a' })
    && !core.esStorageRef({ provider: 'X', objectKey: 'a' }),
    'el proveedor es un nombre corto en minúsculas, no cualquier cosa');
  check('7) y no admite trampas de ruta',
    !core.esStorageRef({ provider: 'gcs', objectKey: '../otro' }) && !core.esStorageRef({ provider: 'gcs', objectKey: '/abs' }));
  check('8) dos referencias son la misma si apuntan al mismo sitio',
    core.mismaReferencia(REF, { ...REF }) && core.mismaReferencia({ provider: 'x', objectKey: 'k' }, { provider: 'x', objectKey: 'k', bucket: undefined })
    && !core.mismaReferencia(REF, { ...REF, objectKey: 'otra' }));
  check('9) el Core no nombra ningún almacén',
    !/cloudinary|firebasestorage|googleapis|s3\b|gcs\b/i.test(CODIGO),
    'el proveedor es texto opaco; quien lo resuelva vive fuera');

  /* 10–12 · Los estados y sus transiciones. */
  check('10) cinco estados, y `deleted` es el único final',
    core.ESTADOS_DE_MATERIAL.join() === 'uploading,processing,ready,failed,deleted'
    && core.ESTADOS_FINALES_DE_MATERIAL.join() === 'deleted');
  check('11) las transiciones tienen sentido: listo puede volver a procesar, borrado no vuelve',
    core.puedePasarA('uploading', 'ready') && core.puedePasarA('ready', 'processing')
    && core.puedePasarA('failed', 'deleted') && !core.puedePasarA('deleted', 'ready') && !core.puedePasarA('failed', 'ready'));
  check('12) NO hay estado `published` en el material: publicar es de la publicación',
    !core.ESTADOS_DE_MATERIAL.includes('published') && !/'published'/.test(sinComentarios(leer(`${DIR}/asset.ts`))));
  check('13) borrado dice cuándo; no borrado no lo dice',
    !core.materialValido(material({ status: 'deleted' }))
    && core.materialValido(material({ status: 'deleted', deletedAt: 5 }))
    && !core.materialValido(material({ deletedAt: 5 })));

  /* 14 · Las variantes son del material, no materiales. */
  check('14) una variante lleva su propia referencia y no tiene dueño propio',
    core.materialValido(material({ variants: [{ kind: 'thumbnail', storageRef: { provider: 'wee', objectKey: 'k/t.png' }, width: 400 }] }))
    && !core.materialValido(material({ variants: [{ kind: 'thumbnail' }] }))
    && !/ownerAccountId/.test((leer(`${DIR}/asset.ts`).match(/export interface AssetVariant \{[\s\S]*?\}/) || [''])[0]));

  check('15) el mime y los bytes se validan por forma',
    !core.materialValido(material({ mimeType: 'no-es-mime' })) && !core.materialValido(material({ bytes: -1 }))
    && !core.materialValido(material({ bytes: 3 * 1024 * 1024 * 1024 })));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Propiedad: la cuenta, y la entidad es contexto ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('16) un material es de su cuenta y de ninguna otra',
    core.materialEsDeLaCuenta(material(), CUENTA) && !core.materialEsDeLaCuenta(material(), OTRA)
    && !core.materialEsDeLaCuenta(material(), '') && !core.materialEsDeLaCuenta(undefined, CUENTA));

  /* 17 · CAMBIAR DE ENTIDAD NO CAMBIA DE DUEÑO. Con la función de Identity. */
  const desdePagina = core.atribuirA(material(), PAGE);
  check('17) publicar desde una Página no mueve el material de cuenta',
    desdePagina.ownerAccountId === CUENTA && desdePagina.publishedByEntityId === PAGE.entityId
    && desdePagina.createdByEntityId === REAL.entityId && desdePagina.assetId === 'asset_0001');
  check('18) y desde el Perfil Weë tampoco, y sigue siendo el MISMO material',
    core.atribuirA(material(), WEE).ownerAccountId === CUENTA
    && core.atribuirA(material(), WEE).storageRef === REF);

  /* 19 · No existe ninguna forma de que una entidad posea. */
  check('19) ninguna entidad puede ser dueña: no hay campo para ello',
    !/ownerEntityId|pageOwner|profileOwner|entityOwner/i.test(CODIGO));
  check('20) y el módulo no sabe de billeteras ni de Credits',
    !/wallet|billetera|credits\b|saldo/i.test(CODIGO));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Reutilización: los bytes se guardan una vez ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 21 · Un material en dos proyectos: filas, no escalar. */
  const filas = [
    { projectId: 'p_anuncio', kind: 'asset', itemId: 'asset_0001', addedAt: 1 },
    { projectId: 'p_marca', kind: 'asset', itemId: 'asset_0001', addedAt: 2 },
    { projectId: 'p_marca', kind: 'asset', itemId: 'asset_0002', addedAt: 3 },
  ];
  check('21) el mismo material está en dos proyectos sin copiarse',
    core.proyectosDe(filas, 'asset', 'asset_0001').join() === 'p_anuncio,p_marca'
    && core.estaEnElProyecto(filas, 'p_marca', 'asset', 'asset_0001'));
  check('22) el material ya NO lleva projectId: la relación va aparte',
    !/projectId/.test(sinComentarios(leer(`${DIR}/asset.ts`)))
    && /export interface ProjectItem/.test(leer('functions/src/core/project.ts')));
  check('23) y no es una lista rígida dentro del material',
    !/projectIds/.test(CODIGO) && !/projectIds/.test(sinComentarios(leer('functions/src/core/project.ts'))));
  check('24) añadir dos veces lo mismo al mismo proyecto es la misma fila',
    core.claveDeElemento(filas[0]) === core.claveDeElemento({ ...filas[0], addedAt: 99 }));

  /* 25 · Un material en dos contenidos. */
  const c1 = contenido({ contentId: 'content_0001' });
  const c2 = contenido({ contentId: 'content_0002', type: 'weel' });
  check('25) el mismo material en dos contenidos, por referencia',
    core.usaElMaterial(c1, 'asset_0001') && core.usaElMaterial(c2, 'asset_0001')
    && c1.assetRefs[0].assetId === c2.assetRefs[0].assetId);
  check('26) el contenido no contiene bytes ni URLs: solo ids',
    !/storageRef|url\b|bytes/i.test((sinComentarios(leer(`${DIR}/content.ts`)).match(/export interface Content extends[\s\S]*?\n\}/) || [''])[0]));

  /* 27 · Retirar del proyecto no toca el material. */
  const sinUno = filas.filter((f) => core.claveDeElemento(f) !== core.claveDeElemento(filas[1]));
  check('27) quitar de un proyecto es quitar una fila, y el material sigue en el otro',
    sinUno.length === 2 && core.proyectosDe(sinUno, 'asset', 'asset_0001').join() === 'p_anuncio'
    && core.materialValido(material()));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Procedencia: de la operación al archivo ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const generado = material({
    provenance: {
      createdAt: 1, generationId: 'gen_1', jobId: 'job_1', stepId: 'imagen', requestId: 'job_1:imagen',
      operationId: 'op_1', capability: 'image.generate', provider: 'p', model: 'm', sourceAssetIds: ['asset_boceto'],
    },
  });
  check('28) un material generado sabe qué operación, trabajo y paso lo produjeron',
    core.materialValido(generado) && generado.provenance.generationId === 'gen_1' && generado.provenance.jobId === 'job_1');
  check('29) y de qué material partió, en cadena', (() => {
    const todos = { asset_0001: generado, asset_boceto: material({ assetId: 'asset_boceto' }) };
    return core.cadenaDeOrigen('asset_0001', (id) => todos[id]).join() === 'asset_boceto';
  })());
  check('30) una versión nueva es OTRO material que apunta al anterior',
    core.materialValido(material({ assetId: 'asset_0002', previousVersionId: 'asset_0001' }))
    && !core.materialValido(material({ previousVersionId: 'asset_0001' })),
    'y nunca a sí mismo');
  check('31) la procedencia no es un segundo libro: no hay Credits ni saldo en ella',
    !/credits|balance|saldo/i.test((sinComentarios(leer(`${DIR}/asset.ts`)).match(/export interface Provenance \{[\s\S]*?\}/) || [''])[0]));
  check('32) un material subido a mano no necesita nada de eso',
    core.materialValido(material({ provenance: { createdAt: 1 } })));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Retirar: la ficha se queda, el objeto no ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const conVariantes = material({ variants: [
    { kind: 'thumbnail', storageRef: { provider: 'wee', objectKey: 'k/t.png' } },
    { kind: 'poster', storageRef: { provider: 'wee', objectKey: 'k/p.jpg' } },
  ] });
  const r = core.retirar(conVariantes, 9);
  check('33) retirar devuelve el material borrado y TODO lo que hay que borrar del almacén',
    r.asset.status === 'deleted' && r.asset.deletedAt === 9 && r.borrar.length === 3
    && core.materialValido(r.asset));
  check('34) la ficha conserva dueño, procedencia y referencia: borrar no es olvidar',
    r.asset.ownerAccountId === CUENTA && r.asset.provenance.createdAt === 1 && r.asset.storageRef === REF);
  check('35) retirar dos veces es un no-op que se distingue', core.retirar(r.asset, 10) === undefined);
  check('36) un material de texto sin objeto no manda a borrar nada',
    core.retirar(material({ kind: 'text', storageRef: undefined, content: 'x' }), 1).borrar.length === 0);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · El contenido: lo que se puede publicar ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('37) un contenido bien formado vale', core.contenidoValido(contenido()));
  check('38) siete tipos, y el Weël es uno de ellos y no un booleano',
    core.TIPOS_DE_CONTENIDO.includes('weel') && core.TIPOS_DE_CONTENIDO.length === 7
    && !/isWeel/.test(CODIGO));
  check('39) un borrador puede estar vacío; uno listo no',
    core.contenidoValido(contenido({ status: 'draft', body: undefined, assetRefs: [] }))
    && !core.contenidoValido(contenido({ body: undefined, assetRefs: [] })));
  check('40) un comentario tiene que contestar a algo',
    !core.contenidoValido(contenido({ type: 'comment' }))
    && core.contenidoValido(contenido({ type: 'comment', inReplyToContentId: 'content_0000' })));
  check('41) el cuerpo está acotado: lo largo va como material',
    !core.contenidoValido(contenido({ body: 'x'.repeat(core.MAXIMO_DE_CUERPO + 1) })));
  check('42) los materiales se enseñan en orden: principal, portada, adjuntos, fuente', (() => {
    const c = contenido({ assetRefs: [
      { assetId: 'a3', role: 'attachment', order: 1 }, { assetId: 'a4', role: 'source' },
      { assetId: 'a1', role: 'primary' }, { assetId: 'a2', role: 'attachment', order: 0 }, { assetId: 'a0', role: 'cover' },
    ] });
    return core.materialesEnOrden(c).map((r) => r.assetId).join() === 'a1,a0,a2,a3,a4';
  })());

  /* 43 · NO hay `published` en el contenido: dos verdades siempre se separan. */
  check('43) el contenido no sabe si está publicado: eso se pregunta a las publicaciones',
    !core.ESTADOS_DE_CONTENIDO.includes('published') && core.ESTADOS_DE_CONTENIDO.join() === 'draft,ready,deleted');

  /* 44 · La costura de moderación, separada de la propiedad. */
  check('44) la moderación es una costura en el contenido y no toca al dueño', (() => {
    const restringido = contenido({ moderationStatus: 'restricted', moderationCaseId: 'caso_1' });
    return core.contenidoValido(restringido) && restringido.ownerAccountId === CUENTA
      && /moderationStatus\?: ModerationStatus/.test(leer(`${DIR}/content.ts`));
  })());
  check('45) y no decide nada: no hay política de moderación en el Core',
    !/banned|shadow|strike|appeal|reportar|denunci/i.test(sinComentarios(leer(`${DIR}/content.ts`))));

  check('46) un contenido es de su cuenta',
    core.contenidoEsDeLaCuenta(contenido(), CUENTA) && !core.contenidoEsDeLaCuenta(contenido(), OTRA));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · La publicación: el acto, desde una cara ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('47) una publicación bien formada vale', core.publicacionValida(publicacion()));
  check('48) publicar es desde una cara: la entidad aquí es OBLIGATORIA',
    !core.publicacionValida(publicacion({ publishedByEntityId: '' }))
    && !core.publicacionValida(publicacion({ publishedByEntityType: 'BIZ_PROFILE' })));
  check('49) y la entidad no es dueña: la publicación sigue siendo de la cuenta', (() => {
    const desdePagina = publicacion({ publishedByEntityId: PAGE.entityId, publishedByEntityType: PAGE.entityType, target: { kind: 'page', id: 'pg_1' }, visibility: 'page' });
    return core.publicacionValida(desdePagina) && desdePagina.ownerAccountId === CUENTA;
  })());

  /* 50–52 · Visibilidad: siete valores, y publicar no es hacer público. */
  check('50) siete visibilidades, no un booleano',
    core.VISIBILIDADES.length === 7 && core.esVisibilidad('connections') && !core.esVisibilidad('isPrivate'));
  check('51) una publicación privada es legítima: es «guardar para mí»',
    core.publicacionValida(publicacion({ visibility: 'private' })));
  check('52) visible para terceros: lo que se puede afirmar sin el grafo, y lo que no',
    core.visibleParaTerceros(publicacion()) === true
    && core.visibleParaTerceros(publicacion({ visibility: 'private' })) === false
    && core.visibleParaTerceros(publicacion({ visibility: 'connections' })) === undefined
    && core.visibleParaTerceros(publicacion({ status: 'unpublished' })) === false,
    'connections depende de una relación que el Core no conoce: undefined, no adivinar');

  /* 53–54 · Destinos. */
  check('53) el destino dice dónde, y algunos exigen cuál',
    core.esDestino({ kind: 'wall' }) && core.esDestino({ kind: 'community', id: 'c1' })
    && !core.esDestino({ kind: 'community' }) && !core.esDestino({ kind: 'wall', id: 'x' }));
  check('54) visibilidad y destino tienen que contar la misma historia',
    !core.publicacionValida(publicacion({ visibility: 'community' }))
    && core.publicacionValida(publicacion({ visibility: 'community', target: { kind: 'community', id: 'c1' } })));

  /* 55–57 · El ciclo de vida propio. */
  check('55) publicar, retirar y volver a publicar', (() => {
    const retirada = core.transicionar(publicacion(), 'unpublished', 3);
    const otraVez = core.transicionar(retirada, 'published', 4);
    return retirada.status === 'unpublished' && otraVez.status === 'published' && otraVez.publishedAt === 4;
  })());
  check('56) y lo que no está en la tabla no pasa',
    core.transicionar(publicacion(), 'scheduled', 3) === undefined
    && core.transicionar(core.transicionar(publicacion(), 'deleted', 3), 'published', 4) === undefined);
  check('57) retirar una publicación no toca el contenido ni el material', (() => {
    const p = core.transicionar(publicacion(), 'deleted', 3);
    return p.contentId === 'content_0001' && core.contenidoValido(contenido()) && core.materialValido(material());
  })());
  check('58) una publicación es de su cuenta',
    core.publicacionEsDeLaCuenta(publicacion(), CUENTA) && !core.publicacionEsDeLaCuenta(publicacion(), OTRA));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── H · El mismo material, dos caras, tres sitios: un archivo ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * LA PRUEBA QUE RESUME LA FASE. Una imagen generada desde el Perfil Real se
   * publica en el muro como Perfil Real, en la sección de Weë Design como
   * Perfil Weë y en una Página como Página. Tres publicaciones, un contenido,
   * un material, una referencia al almacén.
   */
  const unico = material();
  const c = contenido();
  const pubs = [
    publicacion({ publicationId: 'pub_a', target: { kind: 'wall' }, ...REALpub() }),
    publicacion({ publicationId: 'pub_b', target: { kind: 'section', id: 'design' }, publishedByEntityId: WEE.entityId, publishedByEntityType: WEE.entityType }),
    publicacion({ publicationId: 'pub_c', target: { kind: 'page', id: 'pg_1' }, visibility: 'page', publishedByEntityId: PAGE.entityId, publishedByEntityType: PAGE.entityType }),
  ];
  function REALpub() { return { publishedByEntityId: REAL.entityId, publishedByEntityType: REAL.entityType }; }

  check('59) las tres publicaciones valen y apuntan al mismo contenido',
    pubs.every(core.publicacionValida) && pubs.every((p) => p.contentId === c.contentId));
  check('60) el contenido apunta a UN material, y ese material tiene UNA referencia',
    c.assetRefs.length === 1 && c.assetRefs[0].assetId === unico.assetId && core.esStorageRef(unico.storageRef));
  check('61) las tres son de la misma cuenta aunque las firmen tres caras',
    pubs.every((p) => p.ownerAccountId === CUENTA)
    && new Set(pubs.map((p) => p.publishedByEntityType)).size === 3);
  check('62) y retirar la de la Página no toca a las otras dos ni al archivo', (() => {
    const sinPagina = pubs.map((p) => (p.publicationId === 'pub_c' ? core.transicionar(p, 'deleted', 9) : p));
    return sinPagina.filter(core.estaPublicada).length === 2 && core.materialValido(unico);
  })());
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── I · Los eventos del ciclo de vida están reservados, y nadie los emite ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const PEDIDOS = ['ASSET_CREATED', 'ASSET_UPDATED', 'ASSET_PROCESSING', 'ASSET_READY', 'ASSET_FAILED', 'ASSET_DELETED',
    'CONTENT_CREATED', 'CONTENT_UPDATED', 'CONTENT_DELETED',
    'PUBLICATION_CREATED', 'PUBLICATION_UPDATED', 'PUBLICATION_DELETED'];
  const faltan = PEDIDOS.filter((e) => !core.esEventoDeclarado(e));
  check('63) los doce nombres de la fase están reservados', faltan.length === 0, faltan.join(' '));
  check('64) y el módulo de contenido no emite ninguno: sigue siendo contrato',
    !/crearEvento|publish\(|EventPublisher/.test(CODIGO));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── J · Sigue siendo Core ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('65) ni Firebase, ni red, ni disco', !/firebase|firestore|node:fs|node:http|axios|fetch\(|require\(/.test(CODIGO));
  check('66) ni reloj ni dados', !/Date\.now\(|Math\.random\(|new Date\(/.test(CODIGO));
  const fuera = [];
  for (const f of FUENTES) {
    for (const [, dep] of sinComentarios(leer(f)).matchAll(/from ['"]([^'"]+)['"]/g)) {
      if (!dep.startsWith('.')) fuera.push(`${f} → ${dep}`);
    }
  }
  check('67) solo importa del Core', fuera.length === 0, fuera.join(' '));
  check('68) y ningún nombre de proveedor de IA',
    !['gemini', 'seedance', 'seedream', 'deepseek', 'openai', 'claude', 'elevenlabs', 'flux', 'minimax']
      .some((p) => new RegExp(`(?<![a-z])${p}(?![a-z])`, 'i').test(CODIGO)));

  /* 69 · Un solo dueño para cada tipo: nada se redeclara. */
  const dueños = (nombre) => {
    const salida = [];
    const mirar = (dir) => {
      for (const e of fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true })) {
        if (e.isDirectory()) { mirar(`${dir}/${e.name}`); continue; }
        if (e.name.endsWith('.ts') && new RegExp(`export (type|interface) ${nombre}\\b`).test(leer(`${dir}/${e.name}`))) salida.push(`${dir}/${e.name}`);
      }
    };
    mirar('functions/src/core');
    return salida;
  };
  check('69) Asset, Content, Publication y Project se declaran en UN sitio cada uno',
    dueños('Asset').length === 1 && dueños('Content').length === 1 && dueños('Publication').length === 1
    && dueños('Project').length === 1 && dueños('AssetKind').length === 1);
  check('70) el contrato declara versión', core.CONTENT_CORE_CONTRACT_VERSION === '1.0');
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
