/**
 * MC-9 · UPLOAD REAPER + OBJECT LIST + RECONCILIACIÓN.
 *
 * Lo que se vigila aquí, en una frase: **una ausencia nunca autoriza un
 * borrado**. Casi todas las comprobaciones son de lo que NO se hace cuando no
 * se sabe algo, y la única escritura que esta fase produce sobre el mundo —una
 * ficha para bytes que no la tenían— pasa antes por cuatro puertas.
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

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const core = lib('core/index.js');
const {
  decidirUploadAbandonado, reconciliarCuenta, puedeRecuperarFicha, assetDeLaClave, piezaDeLaClave,
  prefijoDeCuenta, claveEsDeLaCuenta, claveDelObjeto, referenciaDelObjeto, usoValido,
  POLITICA_DE_RECONCILIACION, MOTIVO_DE_SUBIDA_EXPIRADA, TRANSICIONES_DE_MATERIAL, puedePasarA,
  CONTENT_CORE_CONTRACT_VERSION,
} = core;
const { crearAlmacenFalso, FAKE_PROVIDER_ID, CAPACIDADES_DE_FALSO } = lib('media/falso.js');
const { huellaDeMedios } = lib('media/huella.js');
const { reconciliarSubidas, enumerarCuenta } = lib('media/reconciliacion.js');
const { crearMedidor } = lib('media/uso.js');
const { leerListado, MAX_CLAVES_POR_PAGINA, crearAdaptadorDeR2, CAPACIDADES_DE_R2 } = lib('media/r2.js');
const { consultaCanonicaDe, rutaCanonicaDeContenedor } = lib('media/firma.js');

const ANA = 'cuentaDeAna';
const BEA = 'cuentaDeBea';
const MATERIAL = 'asset_abc123';
const T0 = 1_800_000_000_000;
const GRACIA = POLITICA_DE_RECONCILIACION.graciaTrasExpirarMs;
const EDAD = POLITICA_DE_RECONCILIACION.edadMinimaDeHuerfanoMs;
const CLAVE = claveDelObjeto(ANA, MATERIAL);

const material = (o = {}) => ({
  contract: CONTENT_CORE_CONTRACT_VERSION,
  assetId: o.assetId ?? MATERIAL,
  ownerAccountId: o.ownerAccountId ?? ANA,
  kind: 'image',
  status: o.status ?? 'uploading',
  storageRef: o.storageRef === null ? undefined : (o.storageRef ?? {
    provider: FAKE_PROVIDER_ID, bucket: 'cubo', objectKey: o.objectKey ?? claveDelObjeto(o.ownerAccountId ?? ANA, o.assetId ?? MATERIAL),
  }),
  provenance: { createdAt: T0 - 1000 },
  createdAt: T0 - 1000,
  updatedAt: T0 - 1000,
  ...(o.uploadExpiresAt !== undefined ? { uploadExpiresAt: o.uploadExpiresAt } : {}),
});

const ficha = (o = {}) => {
  const accountId = o.accountId ?? ANA;
  const assetId = o.assetId ?? MATERIAL;
  const ref = { provider: FAKE_PROVIDER_ID, bucket: 'cubo', objectKey: o.objectKey ?? claveDelObjeto(accountId, assetId) };
  return {
    objectRef: referenciaDelObjeto(huellaDeMedios, ref), providerId: FAKE_PROVIDER_ID, accountId, assetId,
    pieza: 'original', bucket: 'cubo', objectKey: ref.objectKey, estado: o.estado ?? 'guardado',
    bytes: 100, contentType: 'image/png', createdAt: T0, updatedAt: T0,
  };
};

const entrada = (o = {}) => ({
  material: o.material === null ? undefined : (o.material ?? material({ uploadExpiresAt: T0 - GRACIA - 1 })),
  accountId: o.accountId ?? ANA,
  objeto: o.objeto,
  hayBytes: o.hayBytes,
  operaciones: o.operaciones ?? [],
});

const decidir = (o = {}, at = T0) => decidirUploadAbandonado(entrada(o), POLITICA_DE_RECONCILIACION, at);

/* ═══ A · LA CADUCIDAD DEL PERMISO ES LA AUTORIDAD ════════════════════════ */
console.log('\n── A · Ser viejo no es haber caducado ──');
{
  /* 1 · upload no expirado → protegido. */
  check('1) un permiso que todavía vale PROTEGE',
    decidir({ material: material({ uploadExpiresAt: T0 + 1000 }), hayBytes: false }).motivo === 'permiso_vigente');
  check('1) y la gracia también: un PUT empezado justo antes sigue subiendo',
    decidir({ material: material({ uploadExpiresAt: T0 - 1 }), hayBytes: false }).motivo === 'permiso_vigente');
  check('1) la frontera es exacta',
    decidir({ material: material({ uploadExpiresAt: T0 - GRACIA }), hayBytes: false }).accion === 'expirar'
    && decidir({ material: material({ uploadExpiresAt: T0 - GRACIA + 1 }), hayBytes: false }).motivo === 'permiso_vigente');

  /* La autoridad NO es la antigüedad. */
  check('A · un material ANTIGUO sin caducidad declarada se PROTEGE: no hay autoridad para expirarlo',
    decidir({ material: material({ createdAt: 0, updatedAt: 0 }), hayBytes: false }).motivo === 'sin_caducidad_conocida');
  check('A · y el Core no mira `createdAt` ni `updatedAt` para decidirlo',
    !/createdAt|updatedAt/.test(
      sinComentarios(leer('functions/src/core/media/reconciliacion.ts'))
        .match(/export const decidirUploadAbandonado[\s\S]*?\n\};/)[0]));

  /* 2 · upload expirado sin bytes → terminal. */
  check('2) caducado y sin bytes: EXPIRAR', decidir({ hayBytes: false }).accion === 'expirar');

  /* 3 · upload expirado con bytes → candidato. */
  check('3) caducado y CON bytes: RECONCILIAR, que es otra cosa', decidir({ hayBytes: true }).accion === 'reconciliar');

  /* No saber protege. */
  check('A · si no se supo si hay bytes, se PROTEGE', decidir({ hayBytes: undefined }).motivo === 'fisico_incierto');

  /* 5 · MediaObject existente protege. */
  check('5) con ficha de objeto, esto NO es una subida abandonada: se IGNORA',
    decidir({ objeto: ficha(), hayBytes: true }).motivo === 'ya_confirmado');
  check('5) y un material que ya no está subiendo, tampoco',
    decidir({ material: material({ status: 'ready' }) }).motivo === 'no_esta_subiendo');

  /* Operación viva. */
  check('A · con un trabajo vivo se PROTEGE',
    decidir({ operaciones: ['running'], hayBytes: false }).motivo === 'operacion_en_curso');
  check('A · con trabajos solo terminales, no',
    decidir({ operaciones: ['completed', 'failed'], hayBytes: false }).accion === 'expirar');

  /* Aislamiento y fichas rotas. */
  check('A · un material de otra cuenta no se toca',
    decidir({ accountId: BEA, hayBytes: false }).motivo === 'material_invalido');
  check('A · ni una entrada rota, ni un reloj que no es número',
    decidir({ material: null }).motivo === 'material_invalido'
    && decidirUploadAbandonado(entrada(), POLITICA_DE_RECONCILIACION, NaN).motivo === 'material_invalido');
}

/* ═══ B · EL ESTADO ES EL DE F11, NO UNO NUEVO ═══════════════════════════ */
console.log('\n── B · `uploading → failed` ya existía, y no la producía nadie ──');
{
  check('B · la transición está declarada en la Fase 11', puedePasarA('uploading', 'failed') === true);
  check('B · MC-9 NO declara ningún estado de material nuevo',
    !/AssetStatus =|type EstadoDeMaterial/.test(leer('functions/src/core/media/reconciliacion.ts')));
  check('B · y ahora SÍ tiene productor', /marcarMaterialFallido/.test(leer('functions/src/content/index.ts')));
  check('B · que no borra la identidad: solo cambia el estado y anota el motivo',
    !/\.delete\(\)/.test(
      leer('functions/src/content/index.ts').match(/export const marcarMaterialFallido[\s\S]*?\n\};/)[0]));
  check('B · queda trazable: motivo y fecha',
    /failedReason/.test(leer('functions/src/core/content/asset.ts')) && /failedAt/.test(leer('functions/src/core/content/asset.ts')));
  check('B · el motivo es un literal del Core, no una frase escrita a mano',
    MOTIVO_DE_SUBIDA_EXPIRADA === 'subida_no_confirmada');
  check('B · repetir no pisa el motivo original: `ya_estaba` es un no-op',
    /doc\.status === 'failed'\) return \{ status: 'ya_estaba'/.test(leer('functions/src/content/index.ts')));
  check('B · `deleted` sigue sin llevar a ningún sitio', TRANSICIONES_DE_MATERIAL.deleted.length === 0);
}

/* ═══ C · EL LISTADO ═════════════════════════════════════════════════════ */
console.log('\n── C · Enumerar es lo único que mira desde el otro lado ──');
{
  const almacen = crearAlmacenFalso({ ahora: () => T0, contenedor: 'cubo' });
  const poner = async (clave, cuerpo = 'unos bytes') =>
    almacen.guardar({ destino: { provider: FAKE_PROVIDER_ID, bucket: 'cubo', objectKey: clave }, cuerpo: Buffer.from(cuerpo), contentType: 'image/png' });

  for (let i = 0; i < 7; i++) await poner(claveDelObjeto(ANA, `asset_0000000000000000000000000000000${i}`));
  await poner(claveDelObjeto(BEA, MATERIAL));

  /* 13 · prefijo derivado del Account. */
  check('13) el prefijo lo DERIVA Weë de la cuenta', prefijoDeCuenta(ANA) === `accounts/${ANA}/`);
  check('13) una cuenta con forma inválida no produce prefijo: sin prefijo no se enumera',
    prefijoDeCuenta('../otra') === undefined && prefijoDeCuenta('') === undefined);

  const deps = (o = {}) => ({
    subiendo: async () => ({ materiales: o.materiales ?? [] }),
    fichas: async () => o.fichas ?? [],
    ficha: async () => o.ficha,
    operaciones: async () => [],
    almacenes: o.almacenes ?? { [FAKE_PROVIDER_ID]: almacen },
    providerId: FAKE_PROVIDER_ID,
    marcarFallido: async () => true,
    registrarHuerfano: async () => true,
    ahora: () => o.ahora ?? T0,
    ...(o.politica ? { politica: o.politica } : {}),
    ...(o.medidor ? { medidor: o.medidor } : {}),
  });

  /* 9 · listing paginado. */
  const pag = await enumerarCuenta(deps({ politica: { ...POLITICA_DE_RECONCILIACION, porPagina: 3 } }), ANA);
  check('9) se recorre por páginas con el cursor del proveedor', pag.paginas === 3 && pag.objetos.length === 7, `páginas=${pag.paginas} objetos=${pag.objetos.length}`);
  check('9) y se ve el prefijo ENTERO', pag.completo === true);
  check('12) NO aparece ni un objeto de otra cuenta', pag.objetos.every((o) => claveEsDeLaCuenta(o.objectKey, ANA)));

  /* 10 · listing truncado → no delete. */
  const corto = await enumerarCuenta(deps({ politica: { ...POLITICA_DE_RECONCILIACION, porPagina: 2, maxPaginas: 2 } }), ANA);
  check('10) si se agotan las páginas permitidas, el listado NO está completo',
    corto.completo === false && corto.objetos.length === 4);

  /* 11 · provider sin list → no false success. */
  const mudo = await enumerarCuenta(deps({ almacenes: { [FAKE_PROVIDER_ID]: { ...almacen, listar: undefined } } }), ANA);
  check('11) un proveedor que NO sabe enumerar devuelve «no se supo», nunca una lista vacía válida',
    mudo.completo === false && mudo.objetos.length === 0);

  /* 21 · provider 5xx. */
  almacen.fallarUnaVez('proveedor_no_disponible');
  const roto = await enumerarCuenta(deps(), ANA);
  check('21) un fallo del proveedor deja el listado INCOMPLETO', roto.completo === false);

  /* 24 · límite inválido. 23 · cursor inválido. */
  check('24) un límite que no es un entero positivo se rechaza',
    (await almacen.listar({ prefijo: prefijoDeCuenta(ANA), limite: 0 })).ok === false
    && (await almacen.listar({ prefijo: prefijoDeCuenta(ANA), limite: 1.5 })).ok === false);
  check('23) un cursor que no existe se rechaza, no se ignora',
    (await almacen.listar({ prefijo: prefijoDeCuenta(ANA), limite: 5, cursor: 'inventado' })).ok === false);
  check('C · y un prefijo vacío también: no hay forma de pedir «todo»',
    (await almacen.listar({ prefijo: '', limite: 5 })).ok === false);

  /* 29 · MC-7 seam. */
  const medida = crearMedidor((t) => require('node:crypto').createHash('sha256').update(t).digest('hex'));
  await enumerarCuenta(deps({ medidor: medida.medidor, politica: { ...POLITICA_DE_RECONCILIACION, porPagina: 3 } }), ANA);
  const hechos = medida.pendientes();
  check('29) enumerar se mide como operación física, una por página',
    hechos.length === 3 && hechos.every((h) => h.operacion === 'object.list' && h.metrica === 'operaciones'), `${hechos.length}`);
  check('29) con la cuenta y el proveedor reales, y sin una cifra de dinero',
    hechos.every(usoValido) && hechos.every((h) => h.accountId === ANA && !('precio' in h) && !('coste' in h)));
}

/* ═══ D · LEER LA RESPUESTA DE R2 ════════════════════════════════════════ */
console.log('\n── D · Un XML que no se entiende no es una lista vacía ──');
{
  const xml = (contenido, truncado = false, token = '') => `<?xml version="1.0"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
<Name>cubo</Name><IsTruncated>${truncado}</IsTruncated>${token ? `<NextContinuationToken>${token}</NextContinuationToken>` : ''}
${contenido}</ListBucketResult>`;
  const item = (k, s = 100) => `<Contents><Key>${k}</Key><Size>${s}</Size><LastModified>2026-09-21T10:00:00.000Z</LastModified><ETag>&quot;abc123&quot;</ETag></Contents>`;

  const uno = leerListado(xml(item(CLAVE)));
  check('D · se leen clave, tamaño y fecha', uno.objetos.length === 1 && uno.objetos[0].objectKey === CLAVE && uno.objetos[0].bytes === 100 && uno.objetos[0].modificadoEn > 0);
  check('D · el ETag va a `etiquetaDelProveedor` y NO a `suma`: es opaco',
    uno.objetos[0].etiquetaDelProveedor === 'abc123' && uno.objetos[0].suma === undefined);

  const truncado = leerListado(xml(item(CLAVE), true, 'tok-1'));
  check('10) truncado devuelve cursor: hay más y se sabe', truncado.cursor === 'tok-1');

  /* 22 · provider malformed response. */
  check('22) un XML que se contradice —truncado sin token— se RECHAZA entero',
    leerListado(xml(item(CLAVE), true, '')) === undefined);
  check('22) una respuesta que no es un listado se rechaza',
    leerListado('<Error><Code>AccessDenied</Code></Error>') === undefined
    && leerListado('') === undefined && leerListado(null) === undefined);
  check('22) y un elemento sin clave invalida la respuesta entera, no se salta',
    leerListado(xml('<Contents><Size>10</Size></Contents>')) === undefined);
  check('22) NUNCA sale una lista vacía de un fallo de lectura: sale `undefined`',
    [null, '', '<x/>', xml(item(CLAVE), true, '')].every((v) => leerListado(v) === undefined || leerListado(v).objetos.length > 0));

  const vacio = leerListado(xml(''));
  check('D · un listado legítimamente vacío SÍ es una lista vacía', vacio && vacio.objetos.length === 0 && !vacio.cursor);
  check('D · las entidades XML se desescapan', leerListado(xml(item('accounts/a/assets/b&amp;c/original'))).objetos[0].objectKey.includes('&'));
}

/* ═══ E · LA FIRMA DE UNA CONSULTA ═══════════════════════════════════════ */
console.log('\n── E · La misma cadena que se firma es la que se envía ──');
{
  check('E · la consulta canónica va ordenada por nombre, no por el orden de escritura',
    consultaCanonicaDe([['prefix', 'z'], ['list-type', '2']]) === 'list-type=2&prefix=z');
  check('E · y codificada: una barra en el prefijo no parte la consulta',
    consultaCanonicaDe([['prefix', 'accounts/a/']]) === 'prefix=accounts%2Fa%2F');
  check('E · la ruta del contenedor no es la de un objeto vacío',
    rutaCanonicaDeContenedor('cubo') === '/cubo' && rutaCanonicaDeContenedor('') === undefined);
  const FIRMA = sinComentarios(leer('functions/src/media/firma.ts'));
  check('E · `firmar` firma la consulta que recibe, y sin consulta sigue firmando la vacía',
    /peticion\.consulta \?\? ''/.test(FIRMA));
  const R2 = sinComentarios(leer('functions/src/media/r2.ts'));
  check('E · y el adaptador envía LA MISMA: se compone una vez',
    /const consulta = consultaCanonicaDe\(/.test(R2) && /\?\$\{consulta\}`/.test(R2));
  check('E · sin SDK de AWS', !/aws-sdk|@aws-sdk|client-s3/.test(R2));
  check('E · R2 declara la capacidad y el falso también',
    CAPACIDADES_DE_R2.includes('object.list') && CAPACIDADES_DE_FALSO.includes('object.list'));
  check('E · y el máximo de claves por página es el documentado', MAX_CLAVES_POR_PAGINA === 1000);
  const adaptador = crearAdaptadorDeR2({ fetch: async () => { throw new Error('no debe llamarse'); }, config: () => ({}) });
  check('E · sin configuración válida no se llama a nadie',
    (await adaptador.listar({ prefijo: 'accounts/a/', limite: 10 })).ok === false);
}

/* ═══ F · CRUZAR LOS DOS MUNDOS ══════════════════════════════════════════ */
console.log('\n── F · Ocho situaciones, y una que manda sobre las otras siete ──');
{
  const fisico = (clave, modificadoEn = T0 - EDAD - 1) => ({ objectKey: clave, bytes: 100, contentType: 'image/png', modificadoEn });
  const cruzar = (o = {}, at = T0) => reconciliarCuenta({
    accountId: ANA, providerId: FAKE_PROVIDER_ID,
    objetos: o.objetos ?? [], fichas: o.fichas ?? [], subiendo: o.subiendo ?? [],
    completo: o.completo !== false,
  }, POLITICA_DE_RECONCILIACION, at);

  /* A · conocido. */
  check('F/A) con ficha y con bytes: conocido, y no es candidato a nada',
    cruzar({ objetos: [fisico(CLAVE)], fichas: [ficha()] }).porClase.conocido === 1);

  /* 6/8 · objeto físico sin ficha → candidato. */
  const b = cruzar({ objetos: [fisico(CLAVE)] });
  check('6/8) bytes sin ficha y con edad: `fisico_sin_ficha` y CANDIDATO',
    b.porClase.fisico_sin_ficha === 1 && b.candidatos === 1);

  /* 7 · objeto físico reciente → protegido. */
  const reciente = cruzar({ objetos: [fisico(CLAVE, T0 - 1000)] });
  check('7) unos bytes recién escritos NO son candidatos: su confirmación puede venir de camino',
    reciente.porClase.fisico_sin_ficha === 1 && reciente.candidatos === 0);
  check('7) ni unos sin fecha: sin edad conocida no se cumple la edad mínima',
    cruzar({ objetos: [{ objectKey: CLAVE, bytes: 100 }] }).candidatos === 0);

  /* 10 · listado truncado → nada es candidato. */
  const trunco = cruzar({ objetos: [fisico(CLAVE)], completo: false });
  check('10) con el listado INCOMPLETO no hay ningún candidato, por viejo que sea',
    trunco.completo === false && trunco.candidatos === 0);

  /* C · MediaObject sin físico. 17. */
  const c = cruzar({ fichas: [ficha()] });
  check('17) ficha que dice tener bytes y no aparecen: `ficha_sin_fisico`', c.porClase.ficha_sin_fisico === 1);
  check('17) pero con el listado incompleto eso NO significa nada',
    cruzar({ fichas: [ficha()], completo: false }).porClase.listado_incompleto === 1);
  check('17) y una ficha ya cerrada no se cuenta como ausente',
    cruzar({ fichas: [ficha({ estado: 'borrado' })] }).porClase.ficha_sin_fisico === undefined);

  /* D/E · 18 y 19. */
  check('18) material subiendo y sin bytes: `subiendo_sin_fisico`',
    cruzar({ subiendo: [material()] }).porClase.subiendo_sin_fisico === 1);
  check('19) material subiendo CON bytes: `subiendo_con_fisico`',
    cruzar({ objetos: [fisico(CLAVE)], subiendo: [material()] }).porClase.subiendo_con_fisico === 1);

  /* F · 12 · de otra cuenta. */
  const ajeno = cruzar({ objetos: [fisico(claveDelObjeto(BEA, MATERIAL))] });
  check('12) una clave de OTRA cuenta se marca y NO se trata como huérfana',
    ajeno.porClase.de_otra_cuenta === 1 && ajeno.candidatos === 0 && ajeno.porClase.fisico_sin_ficha === undefined);
  check('12) ni siquiera se cuenta entre los objetos vistos de esta cuenta', ajeno.objetosVistos === 0);

  /* G · ficha inválida. */
  check('F/G) una ficha que apunta fuera de su cuenta es `ficha_invalida`',
    cruzar({ fichas: [ficha({ objectKey: claveDelObjeto(BEA, MATERIAL) })] }).porClase.ficha_invalida === 1);
  check('F · una cuenta o proveedor inválidos no producen informe',
    reconciliarCuenta({ accountId: '../x', providerId: FAKE_PROVIDER_ID, objetos: [], fichas: [], subiendo: [], completo: true }) === undefined
    && reconciliarCuenta({ accountId: ANA, providerId: '', objetos: [], fichas: [], subiendo: [], completo: true }) === undefined);

  /* La última puerta. */
  const candidato = b.hallazgos.find((h) => h.candidato);
  check('F · solo un huérfano de su cuenta, con edad y en listado completo puede recuperar ficha',
    puedeRecuperarFicha(candidato) === true);
  check('F · y ninguna de las otras clases puede',
    [...cruzar({ fichas: [ficha()] }).hallazgos, ...ajeno.hallazgos, ...trunco.hallazgos]
      .every((h) => puedeRecuperarFicha(h) === false));
  check('F · la clave tiene que decir su material y su pieza',
    assetDeLaClave(CLAVE) === MATERIAL && piezaDeLaClave(CLAVE) === 'original'
    && assetDeLaClave('accounts/a/suelto') === undefined);
}

/* ═══ G · EL BARRIDO ENTERO ══════════════════════════════════════════════ */
console.log('\n── G · Reconciliar de verdad, sin borrar nada ──');

const mundo = (o = {}) => {
  const almacen = crearAlmacenFalso({ ahora: () => o.guardadoEn ?? (T0 - EDAD - 1), contenedor: 'cubo' });
  const materiales = o.materiales ?? [material({ uploadExpiresAt: T0 - GRACIA - 1 })];
  const fichasVivas = new Map((o.fichas ?? []).map((f) => [f.objectKey, f]));
  const llamadas = { fallido: [], huerfano: [], ficha: 0, borrar: 0 };
  return {
    almacen, fichasVivas, llamadas,
    deps: {
      subiendo: async () => ({ materiales, ...(o.cursor ? { cursor: o.cursor } : {}) }),
      fichas: async () => [...fichasVivas.values()],
      ficha: async (destino) => { llamadas.ficha++; return o.fichaAlPreguntar ? o.fichaAlPreguntar(llamadas.ficha) : fichasVivas.get(destino.objectKey); },
      operaciones: async () => o.operaciones ?? [],
      almacenes: { [FAKE_PROVIDER_ID]: almacen },
      providerId: FAKE_PROVIDER_ID,
      marcarFallido: async (acc, id, motivo) => { llamadas.fallido.push([acc, id, motivo]); return o.cerrarFalla ? false : true; },
      registrarHuerfano: async (destino, acc, assetId, pieza) => {
        llamadas.huerfano.push({ objectKey: destino.objectKey, acc, assetId, pieza });
        if (fichasVivas.has(destino.objectKey)) return false;
        fichasVivas.set(destino.objectKey, ficha({ objectKey: destino.objectKey, assetId }));
        return true;
      },
      ahora: () => T0,
      ...(o.politica ? { politica: o.politica } : {}),
    },
  };
};

const poner = (m, clave) => m.almacen.guardar({
  destino: { provider: FAKE_PROVIDER_ID, bucket: 'cubo', objectKey: clave }, cuerpo: Buffer.from('bytes'), contentType: 'image/png',
});

{
  /* 2 · expirado sin bytes. */
  const m1 = mundo();
  const r1 = await reconciliarSubidas(m1.deps, ANA);
  check('2) una subida caducada sin bytes se cierra como fallida',
    r1.expirados === 1 && m1.llamadas.fallido.length === 1 && m1.llamadas.fallido[0][2] === MOTIVO_DE_SUBIDA_EXPIRADA);
  check('2) y NO se borra nada: el barrido no tiene con qué', m1.almacen.llamadas.borrar === 0);

  /* 3/19 · expirado con bytes. */
  const m2 = mundo();
  await poner(m2, CLAVE);
  const r2 = await reconciliarSubidas(m2.deps, ANA);
  check('3/19) caducada CON bytes: se cierra el material Y se recupera la ficha del huérfano',
    r2.reconciliados === 1 && r2.fichasRecuperadas === 1, JSON.stringify({ rec: r2.reconciliados, fichas: r2.fichasRecuperadas }));
  check('3) la ficha se crea con el material y la pieza que dice la CLAVE, no lo que diga nadie',
    m2.llamadas.huerfano[0].assetId === MATERIAL && m2.llamadas.huerfano[0].pieza === 'original' && m2.llamadas.huerfano[0].acc === ANA);
  check('28) y MC-9 sigue sin borrar: quien elimina es MC-5', m2.almacen.llamadas.borrar === 0);

  /* 4 · confirmación concurrente gana. */
  const m3 = mundo({ fichaAlPreguntar: (vez) => (vez === 1 ? undefined : ficha()) });
  await poner(m3, CLAVE);
  const r3 = await reconciliarSubidas(m3.deps, ANA);
  check('4) si alguien confirma entre las dos preguntas, el material NO se cierra',
    m3.llamadas.fallido.length === 0 && r3.ignorados + r3.protegidos === 1);

  /* 14/15 · idempotencia y dos reapers a la vez. */
  const m4 = mundo();
  await poner(m4, CLAVE);
  const [a, b] = await Promise.all([reconciliarSubidas(m4.deps, ANA), reconciliarSubidas(m4.deps, ANA)]);
  check('15) dos reapers a la vez no crean dos fichas',
    a.fichasRecuperadas + b.fichasRecuperadas === 1 && m4.fichasVivas.size === 1,
    JSON.stringify({ a: a.fichasRecuperadas, b: b.fichasRecuperadas, fichas: m4.fichasVivas.size }));
  const m5 = mundo();
  await poner(m5, CLAVE);
  await reconciliarSubidas(m5.deps, ANA);
  const otra = await reconciliarSubidas(m5.deps, ANA);
  check('14) repetir el barrido sobre lo mismo no vuelve a crear ficha ni a cerrar nada',
    otra.fichasRecuperadas === 0 && otra.ignorados === 1);

  /* 10 · truncado → no se recupera nada. */
  const m6 = mundo({ politica: { ...POLITICA_DE_RECONCILIACION, porPagina: 1, maxPaginas: 1 } });
  await poner(m6, CLAVE);
  await poner(m6, claveDelObjeto(ANA, 'asset_00000000000000000000000000000002'));
  const r6 = await reconciliarSubidas(m6.deps, ANA);
  check('10) con el listado truncado NO se recupera ninguna ficha ni se cierra ningún material',
    r6.completo === false && r6.fichasRecuperadas === 0 && m6.llamadas.fallido.length === 0);
  check('10) y el material se PROTEGE por no saber si hay bytes', r6.porMotivo.fisico_incierto === 1);

  /* 16 · orphan reconciliado después. */
  const m7 = mundo({ materiales: [] });
  await poner(m7, CLAVE);
  const r7 = await reconciliarSubidas(m7.deps, ANA);
  check('16) un huérfano sin material vivo se reconcilia igual: la clave dice de quién es',
    r7.fichasRecuperadas === 1 && m7.fichasVivas.size === 1);

  /* 12/27 · nada de otra cuenta. */
  const m8 = mundo({ materiales: [] });
  await poner(m8, claveDelObjeto(BEA, MATERIAL));
  const r8 = await reconciliarSubidas(m8.deps, ANA);
  check('12/27) el prefijo derivado ya impide ver lo de otra cuenta: ni aparece ni produce ficha',
    r8.fichasRecuperadas === 0 && m8.llamadas.huerfano.length === 0 && r8.porClase.de_otra_cuenta === undefined);

  /*
   * Y LA DEFENSA DE VERDAD: que el prefijo filtre no basta como garantía,
   * porque quien filtra es el proveedor. Aquí se le hace mentir —devuelve una
   * clave ajena pese al prefijo— para comprobar que el aislamiento no depende
   * de su buena fe.
   */
  const m8b = mundo({ materiales: [] });
  const ajena = claveDelObjeto(BEA, MATERIAL);
  m8b.deps.almacenes[FAKE_PROVIDER_ID] = {
    ...m8b.almacen,
    listar: async () => ({ ok: true, objetos: [{ objectKey: ajena, bytes: 10, modificadoEn: T0 - EDAD - 1 }] }),
  };
  const r8b = await reconciliarSubidas(m8b.deps, ANA);
  check('12/27) si el proveedor DEVUELVE una clave ajena, se marca y no se le hace ficha',
    r8b.porClase.de_otra_cuenta === 1 && r8b.fichasRecuperadas === 0 && m8b.llamadas.huerfano.length === 0);

  /* 20 · provider 404 / sin objeto. 21 · 5xx. */
  const m9 = mundo();
  m9.almacen.fallarUnaVez('proveedor_no_disponible');
  const r9 = await reconciliarSubidas(m9.deps, ANA);
  check('20/21) si el proveedor falla, el listado queda incompleto y no se cierra nada',
    r9.completo === false && m9.llamadas.fallido.length === 0);

  /* Fallo al cerrar. */
  const m10 = mundo({ cerrarFalla: true });
  const r10 = await reconciliarSubidas(m10.deps, ANA);
  check('G · si no se pudo cerrar el material, se cuenta como error y no como cerrado',
    r10.errores === 1 && r10.expirados === 0);

  /* Aislamiento del material. */
  const m11 = mundo({ materiales: [material({ objectKey: claveDelObjeto(BEA, MATERIAL) })] });
  const r11 = await reconciliarSubidas(m11.deps, ANA);
  check('12) un material cuya clave cae fuera de su cuenta no se toca JAMÁS',
    r11.porMotivo.fuera_de_su_cuenta === 1 && m11.llamadas.fallido.length === 0);

  /* Escala. */
  const m12 = mundo({ cursor: 'siguiente' });
  const r12 = await reconciliarSubidas(m12.deps, ANA);
  check('17) el informe devuelve cursor para seguir, nunca un desplazamiento',
    r12.cursor === 'siguiente' && typeof r12.ms === 'number');
}

/* ═══ H · SEGURIDAD Y FRONTERAS ══════════════════════════════════════════ */
console.log('\n── H · Lo que no se acepta y lo que no se registra ──');
{
  const CORE = sinComentarios(leer('functions/src/core/media/reconciliacion.ts'));
  const COMP = sinComentarios(leer('functions/src/media/reconciliacion.ts'));

  /* 30 · Core no conoce R2. */
  const PROHIBIDOS = ['cloudflare', 'r2', 'aws', 's3', 'cloudinary', 'qiniu', 'alibaba', 'tencent', 'sigv4'];
  for (const [nombre, src] of [['el Core', CORE], ['el barrido', COMP]]) {
    const hay = PROHIBIDOS.filter((p) => new RegExp(`(?<![a-z0-9])${p}(?![a-z0-9])`, 'i').test(src));
    check(`30) ningún nombre de proveedor en ${nombre} de MC-9`, hay.length === 0, hay.join(','));
  }
  check('30) el Core de MC-9 no toca reloj, red, disco ni dados',
    !/Date\.now|Math\.random|require\(|fetch\(|fs\.|process\.(env|argv|exit)/.test(CORE));
  const imports = [...leer('functions/src/core/media/reconciliacion.ts').matchAll(/from '([^']+)'/g)].map((m) => m[1]);
  check('30) y solo importa de dentro del Core', imports.every((i) => i.startsWith('./') || i.startsWith('../')) && !imports.some((i) => i.includes('../../')));

  /* 25/26 · no signed URLs, no secrets. */
  check('25) el barrido no firma NADA: no hay URL firmada que persistir',
    !/urlFirmada|urlDeSubida|signedUrl|firmarConsulta/.test(COMP));
  check('26) cero `console.` en las dos capas', !/console\./.test(CORE) && !/console\./.test(COMP));
  check('26) ni una credencial nombrada', !/apiKey|secret|token|password|Authorization/i.test(CORE));
  check('26) y el informe son contadores y motivos: ni una URL, ni un secreto',
    !/url|token|secret|firmad/i.test(CORE.match(/export interface InformeDeReconciliacion \{[\s\S]*?\n\}/)[0]));

  /* 27 · nada del cliente. */
  check('27) el prefijo se deriva y no se recibe: `prefijoDeCuenta` es la única fuente',
    /prefijoDeCuenta\(accountId\)/.test(COMP) && !/peticion\.prefijo|datos\.prefijo/.test(COMP));
  check('27) la petición de listado del adaptador rechaza un prefijo vacío',
    /!peticion\.prefijo/.test(sinComentarios(leer('functions/src/media/r2.ts'))));
  check('27) MC-9 no está expuesto: ninguna Function lo llama',
    !/reconciliarSubidas|enumerarCuenta|marcarMaterialFallido/.test(leer('functions/src/index.ts')));

  /* 28 · MC-5 sigue siendo quien elimina. 13 · sin segundo GC. */
  check('28) MC-9 no llama a `borrar` en ninguna parte', !/\.borrar\(/.test(COMP));
  check('28) ni declara política de borrado propia',
    !/edadMinimaMs|maxIntentos|decidirRecoleccion/.test(CORE + COMP));
  check('28) y lo dice el propio archivo: MC-5 decide y borra', /MC-5 decide/.test(leer('functions/src/media/reconciliacion.ts')));
  check('13) no hay segunda cola, ni trabajador, ni planificador',
    !/QueuePort|onSchedule|scheduler|crearCola|setInterval|setTimeout/i.test(COMP));
  check('13) y reutiliza los estados del Job Engine', /JobState/.test(CORE));

  /* La caducidad la escribe MC-3, no el cliente. */
  const SUB = sinComentarios(leer('functions/src/media/subida.ts'));
  check('27) la caducidad la anota el servidor con lo que dijo el proveedor',
    /anotarPermiso\(accountId, assetId, permiso\.expiraEn\)/.test(SUB));
  check('27) y anotarla no puede romper la concesión: va en su propio `try`',
    /try \{\s*await deps\.anotarPermiso/.test(SUB));
  check('27) solo avanza, nunca acorta un permiso ya entregado',
    /expiraEn <= previo\) return false/.test(leer('functions/src/content/index.ts')));

  check('esta suite está en la cadena de `npm test`',
    /media-reconciliacion\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
