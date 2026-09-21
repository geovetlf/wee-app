/**
 * MC-6 · MIGRACIÓN / IMPORTACIÓN DE MEDIOS HISTÓRICOS.
 *
 * Las 28 comprobaciones que pidió el encargo, más las que hicieron falta para
 * que cada una signifique algo. Ni una llamada de red, ni una credencial, ni un
 * byte real: la fuente y el almacén son de mentira, y eso está probado abajo.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '../..');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const core = await import('../lib/core/index.js');
const {
  decidirMigracion, verificarCopia, hechosDelDestino, destinoDeMigracion, identidadDeItem,
  claseDeVeredicto, operacionesDeMigracion, esMigracionTerminal, errorDeMigracionSaneado,
  esenciaDelTipo, informeDeMigracionVacio, POLITICA_DE_MIGRACION, ESTADOS_DE_MIGRACION,
  FORMA_DE_ITEM_DE_MIGRACION, CONTENT_CORE_CONTRACT_VERSION,
} = core;

const { migrarLote } = await import('../lib/media/migracion.js');
const { crearFuenteFalsa, FUENTE_FALSA_ID } = await import('../lib/media/fuente-falsa.js');
const { crearAlmacenFalso, FAKE_PROVIDER_ID } = await import('../lib/media/falso.js');
const { crearFuenteCloudinary, CLOUDINARY_SOURCE_ID, urlDeEntrega } = await import('../lib/media/cloudinary.js');

let failures = 0;
let n = 0;
const check = (nombre, ok, detalle) => {
  n++;
  if (ok) console.log(`✔ ${n}) ${nombre}${detalle !== undefined ? ` — ${detalle}` : ''}`);
  else { failures++; console.log(`✘ ${n}) ${nombre}${detalle !== undefined ? ` — ${detalle}` : ''}`); }
};

const T0 = 1_800_000_000_000;
const CUENTA = 'cuentaDeAna';
const OTRA_CUENTA = 'cuentaDeBeto';
const MATERIAL = 'asset_abc123';
const huella = (t) => createHash('sha256').update(t).digest('hex');

const material = (o = {}) => ({
  contract: CONTENT_CORE_CONTRACT_VERSION,
  assetId: MATERIAL,
  ownerAccountId: CUENTA,
  kind: 'image',
  status: 'uploading',
  provenance: { createdAt: T0 - 1000 },
  createdAt: T0 - 1000,
  updatedAt: T0 - 1000,
  ...o,
});

const ORIGEN = Object.freeze({ provider: FUENTE_FALSA_ID, bucket: 'nubedeayer/image', objectKey: 'posts/uno/dos' });

const entrada = (o = {}) => ({
  origen: ORIGEN,
  material: material(),
  objeto: undefined,
  origenDice: { bytes: 1024, contentType: 'image/jpeg' },
  fuenteReconocida: true,
  fuenteDisponible: true,
  destinoProviderId: FAKE_PROVIDER_ID,
  destinoContenedor: 'cubo',
  destinoPuedeGuardar: true,
  operaciones: [],
  intentos: 0,
  ...o,
});

const decidir = (o = {}, at = T0) => decidirMigracion(entrada(o), POLITICA_DE_MIGRACION, at);

/* ═══ A · LA IDENTIDAD NO LA PONE EL LEGACY ═══════════════════════════════ */
console.log('\n── A · Quién decide de quién es esto ──');
{
  /* 1 · misma fuente no duplica Asset. */
  const d1 = decidir();
  const d2 = decidir();
  check('1) la misma fuente hacia el mismo material da el MISMO destino, siempre',
    d1.accion === 'copiar' && d2.accion === 'copiar' && d1.destino.objectKey === d2.destino.objectKey,
    d1.destino?.objectKey);
  check('1) y ese destino lo deriva el material, no el recurso histórico',
    d1.destino.objectKey === `accounts/${CUENTA}/assets/${MATERIAL}/original`);

  /* La regla que sostiene todo MC-6. */
  check('1) SIN material no se migra nada: el legacy no crea identidad',
    decidir({ material: undefined }).motivo === 'sin_material');
  check('1) y eso es «requiere decisión», no «no migrable»',
    claseDeVeredicto(decidir({ material: undefined })) === 'requiere_decision');

  /* 2 · misma fuente no duplica MediaObject. */
  const a = identidadDeItem(huella, ORIGEN, d1.destino);
  const b = identidadDeItem(huella, ORIGEN, d1.destino);
  check('2) la identidad del item es determinista: repetir pide la MISMA ficha', a === b && FORMA_DE_ITEM_DE_MIGRACION.test(a), a);
  check('2) y cambia si cambia el origen',
    identidadDeItem(huella, { ...ORIGEN, objectKey: 'otro' }, d1.destino) !== a);
  check('2) o si cambia el destino',
    identidadDeItem(huella, ORIGEN, { ...d1.destino, objectKey: `accounts/${CUENTA}/assets/asset_xyz/original` }) !== a);
  check('2) una huella que no sirve no produce identidad: se dice que no',
    identidadDeItem(() => 'no-es-hex', ORIGEN, d1.destino) === undefined);

  /* NO DUPLICAR REGISTROS: dos proveedores, un material. */
  const dosDestinos = [FAKE_PROVIDER_ID, 'otroalmacen'].map((p) =>
    destinoDeMigracion(material(), p, 'cubo'));
  check('NO se crean dos materiales porque haya dos proveedores: la clave es la misma',
    dosDestinos[0].objectKey === dosDestinos[1].objectKey && dosDestinos[0].provider !== dosDestinos[1].provider);
}

/* ═══ B · SEGURIDAD: NADA VIENE DE FUERA ═════════════════════════════════ */
console.log('\n── B · El destino se deriva; no se acepta ──');
{
  /* 12 · account isolation. */
  check('12) la clave cae SIEMPRE dentro de la carpeta de su cuenta',
    decidir().destino.objectKey.startsWith(`accounts/${CUENTA}/`));
  check('12) un material de otra cuenta escribe en la carpeta de ESA otra, nunca en la primera',
    decidir({ material: material({ ownerAccountId: OTRA_CUENTA }) }).destino.objectKey
      === `accounts/${OTRA_CUENTA}/assets/${MATERIAL}/original`);
  check('12) una cuenta con forma inválida no produce destino: no se escribe en ningún sitio',
    destinoDeMigracion(material({ ownerAccountId: '../../otra' }), FAKE_PROVIDER_ID) === undefined);
  check('12) ni un material con forma inválida',
    destinoDeMigracion(material({ assetId: 'a/b' }), FAKE_PROVIDER_ID) === undefined);

  /* 21 · URL externa no confiable. */
  check('21) un origen que NINGUNA fuente reconoce se bloquea: una URL no es una fuente',
    decidir({ fuenteReconocida: false }).motivo === 'fuente_no_reconocida');
  check('21) y eso es NO MIGRABLE: no se arregla esperando',
    claseDeVeredicto(decidir({ fuenteReconocida: false })) === 'no_migrable');

  /* 13 · la credencial de la fuente nunca llega al Core. */
  const CORE_MIG = leer('functions/src/core/media/migracion.ts');
  check('13) el Core no nombra ninguna credencial, ni la pide, ni la recibe',
    !/credencial|credential|apiKey|api_key|secret|token|password|Authorization/i.test(sinComentarios(CORE_MIG)));
  check('13) la entrada de la decisión no tiene un solo campo por el que colarla',
    !/url|URL|cuerpo|Buffer|cabecera|header/i.test(
      sinComentarios(CORE_MIG).match(/export interface EntradaDeMigracion \{[\s\S]*?\n\}/)[0]));

  /* El item guardado tampoco. */
  check('13) ni el item que se guarda',
    !/url|firmad|token|secret|cabecera|cuerpo/i.test(
      sinComentarios(CORE_MIG).match(/export interface ItemDeMigracion \{[\s\S]*?\n\}/)[0]));
}

/* ═══ C · TAMAÑO Y TIPO: SIN PUERTA TRASERA ══════════════════════════════ */
console.log('\n── C · Una migración no entra por una puerta más ancha ──');
{
  /* 11 · tamaño excedido. */
  const enorme = POLITICA_DE_MIGRACION.subida.maxBytes + 1;
  check('11) lo que pasa del tope de la Fase 11 se BLOQUEA, no se copia en silencio',
    decidir({ origenDice: { bytes: enorme, contentType: 'image/jpeg' } }).motivo === 'demasiado_grande');
  check('11) y el tope del proveedor, cuando es menor, manda',
    decidirMigracion(entrada({ topeDelProveedor: 500, origenDice: { bytes: 1024, contentType: 'image/jpeg' } }),
      POLITICA_DE_MIGRACION, T0).motivo === 'demasiado_grande');
  check('11) MC-6 no declara ningún límite de bytes propio',
    !/maxBytes\s*[:=]\s*\d/.test(sinComentarios(leer('functions/src/core/media/migracion.ts'))));

  /* 10 · MIME inválido. */
  check('10) un tipo que no tiene forma de tipo se BLOQUEA',
    decidir({ origenDice: { bytes: 10, contentType: 'no-es-un-tipo' } }).motivo === 'tipo_no_aceptable');
  check('10) y uno ausente también',
    decidir({ origenDice: { bytes: 10 } }).motivo === 'tipo_no_aceptable');

  check('C · sin tamaño no se copia: no se puede respetar un tope que no se conoce',
    decidir({ origenDice: { contentType: 'image/jpeg' } }).motivo === 'tamano_desconocido');
  check('C · y un recurso que la fuente no describe tampoco',
    decidir({ origenDice: undefined }).motivo === 'origen_no_esta');
}

/* ═══ D · VERIFICACIÓN FÍSICA ════════════════════════════════════════════ */
console.log('\n── D · Un 200 no es una migración ──');
{
  const mismo = { bytes: 100, contentType: 'image/png' };

  /* 6 · verificación correcta. */
  check('6) mismo tamaño y mismo tipo verifica, y lo dice a qué nivel',
    verificarCopia(mismo, { ...mismo }).ok === true
    && verificarCopia(mismo, { ...mismo }).nivel === 'tamano_y_tipo');

  /* 7 · verificación incorrecta. */
  check('7) un tamaño distinto NO verifica',
    verificarCopia(mismo, { bytes: 99, contentType: 'image/png' }).motivo === 'tamano_distinto');
  check('7) un tipo distinto NO verifica',
    verificarCopia(mismo, { bytes: 100, contentType: 'image/gif' }).motivo === 'tipo_distinto');
  check('7) y si no hay nada al otro lado, tampoco',
    verificarCopia(mismo, undefined).motivo === 'no_esta');

  /* 8 · checksum disponible. */
  const conSuma = { bytes: 100, contentType: 'image/png', suma: { algoritmo: 'sha256', valor: 'AABB' } };
  check('8) con suma del MISMO algoritmo, verifica al nivel más alto',
    verificarCopia(conSuma, { ...conSuma, suma: { algoritmo: 'sha256', valor: 'aabb' } }).nivel === 'suma');
  check('8) y una suma distinta falla aunque el tamaño coincida',
    verificarCopia(conSuma, { ...conSuma, suma: { algoritmo: 'sha256', valor: 'ffff' } }).motivo === 'suma_distinta');

  /* 9 · checksum no disponible. */
  check('9) sin suma no se inventa una: se baja de nivel y se dice',
    verificarCopia(mismo, { ...mismo }).nivel === 'tamano_y_tipo');
  check('9) sumas de algoritmos DISTINTOS no se comparan entre sí',
    verificarCopia({ ...mismo, suma: { algoritmo: 'md5', valor: 'aa' } },
      { ...mismo, suma: { algoritmo: 'crc32c', valor: 'bb' } }).nivel === 'tamano_y_tipo');
  check('9) sin tipo en un lado, el nivel baja a tamaño',
    verificarCopia({ bytes: 100 }, { bytes: 100, contentType: 'image/png' }).nivel === 'tamano');
  check('9) y sin NADA comparable NO se da por bueno: falla cerrado',
    verificarCopia({ contentType: 'image/png' }, { contentType: 'image/png' }).motivo === 'nada_que_comparar');
  check('9) el tipo SOLO no verifica: un archivo truncado conserva su tipo',
    verificarCopia({ contentType: 'image/png' }, { contentType: 'image/png' }).ok === false);

  check('D · el tipo se compara sin sus parámetros y sin mayúsculas',
    esenciaDelTipo('IMAGE/JPEG; charset=x') === 'image/jpeg'
    && verificarCopia({ bytes: 5, contentType: 'image/jpeg' }, { bytes: 5, contentType: 'image/jpeg; q=1' }).ok);
  check('D · los hechos del destino salen de lo que el almacén dice, sin tocarlo',
    hechosDelDestino({ ref: ORIGEN, bytes: 7, contentType: 'image/png' }).bytes === 7
    && hechosDelDestino(undefined) === undefined);
}

/* ═══ E · ESTADOS: MÍNIMOS Y SIN REDUNDANCIA ═════════════════════════════ */
console.log('\n── E · Seis estados, y tres que no se crearon ──');
{
  check('E · son exactamente seis', ESTADOS_DE_MIGRACION.length === 6, ESTADOS_DE_MIGRACION.join(','));
  check('E · NO se declaran `planned`, `copying` ni `verifying`: eso ya es `running` del Job Engine',
    !ESTADOS_DE_MIGRACION.some((e) => /planned|planificado|copying|copiando|verifying|verificando/i.test(e)));
  check('E · `copiado` sí existe: es el hueco entre el PUT y la comprobación',
    ESTADOS_DE_MIGRACION.includes('copiado'));
  check('E · `bloqueado` NO es terminal: es «hoy no»',
    !esMigracionTerminal('bloqueado') && esMigracionTerminal('completado')
    && esMigracionTerminal('saltado') && esMigracionTerminal('fallido'));

  /* 26 · la migración no interfiere con el GC. */
  check('26) una migración viva habla al barrido en el vocabulario del Job Engine',
    operacionesDeMigracion('copiado').includes('running')
    && operacionesDeMigracion('descubierto').includes('running'));
  check('26) y una terminada deja de protegerlo',
    operacionesDeMigracion('completado').length === 0 && operacionesDeMigracion(undefined).length === 0);
  const { decidirRecoleccion, POLITICA_DE_RECOLECCION } = core;
  const objetoViejo = {
    objectRef: 'mob_' + 'a'.repeat(32), providerId: FAKE_PROVIDER_ID, accountId: CUENTA,
    assetId: MATERIAL, pieza: 'original', objectKey: `accounts/${CUENTA}/assets/${MATERIAL}/original`,
    estado: 'guardado', createdAt: T0 - 40 * 24 * 3600 * 1000, updatedAt: T0,
  };
  check('26) MC-5 protege de verdad un objeto con una migración en curso, sin saber qué es una migración',
    decidirRecoleccion({
      objeto: objetoViejo, referencias: [], referenciasCompletas: true,
      operaciones: operacionesDeMigracion('copiado'),
    }, POLITICA_DE_RECOLECCION, T0).motivo === 'operacion_en_curso');
  check('26) y lo recogería si la migración hubiera terminado — la protección es real, no un efecto lateral',
    decidirRecoleccion({
      objeto: objetoViejo, referencias: [], referenciasCompletas: true,
      operaciones: operacionesDeMigracion('completado'),
    }, POLITICA_DE_RECOLECCION, T0).accion === 'borrar');
}

/* ═══ F · EL TRASLADO DE VERDAD (con mentiras por debajo) ════════════════ */
console.log('\n── F · Copiar, reanudar, y no copiar dos veces ──');

const mundo = (o = {}) => {
  const fuente = crearFuenteFalsa({ estado: o.estadoDeFuente ?? 'UNVERIFIED' });
  const almacen = crearAlmacenFalso({ ahora: () => T0, contenedor: 'cubo' });
  const cuerpo = o.cuerpo ?? Buffer.from('unos bytes historicos');
  fuente.poner(ORIGEN, {
    cuerpo,
    contentType: o.contentType ?? 'image/jpeg',
    ...(o.sumaDeOrigen ? { suma: o.sumaDeOrigen } : {}),
    ...(o.bytesDeclarados !== undefined ? { bytesDeclarados: o.bytesDeclarados } : {}),
  });
  const items = new Map();
  const item = {
    migrationId: 'mg_1', itemId: 'mig_' + 'b'.repeat(32), origen: ORIGEN,
    estado: 'descubierto', intentos: 0, createdAt: T0, updatedAt: T0, ...(o.item ?? {}),
  };
  items.set(item.itemId, item);
  const objetos = new Map();
  const llamadas = { registrar: 0, anotar: 0, material: 0, coste: [] };
  return {
    fuente, almacen, items, objetos, llamadas, item,
    deps: {
      items: async (cursor, limite) => ({ items: [...items.values()].slice(0, limite), ...(o.cursor ? { cursor: o.cursor } : {}) }),
      material: async () => { llamadas.material++; return 'material' in o ? o.material : material(); },
      objeto: async (destino) => objetos.get(destino.objectKey),
      operaciones: async () => o.operaciones ?? [],
      fuentes: o.fuentes ?? { [FUENTE_FALSA_ID]: fuente },
      almacenes: o.almacenes ?? { [FAKE_PROVIDER_ID]: almacen },
      destinoProviderId: o.destinoProviderId ?? FAKE_PROVIDER_ID,
      registrarObjeto: async (destino, accountId, assetId) => {
        llamadas.registrar++;
        const ref = 'mob_' + createHash('sha256').update(destino.objectKey).digest('hex').slice(0, 32);
        objetos.set(destino.objectKey, {
          objectRef: ref, providerId: destino.provider, accountId, assetId, pieza: 'original',
          bucket: destino.bucket, objectKey: destino.objectKey, estado: 'guardado',
          createdAt: T0, updatedAt: T0,
        });
        return ref;
      },
      anotarItem: async (x) => { llamadas.anotar++; items.set(x.itemId, x); return true; },
      ahora: () => T0,
      ...(o.anotarOperacionFisica ? { anotarOperacionFisica: (...a) => llamadas.coste.push(a) } : {}),
    },
  };
};

{
  /* El camino feliz, que también verifica. */
  const m = mundo({ anotarOperacionFisica: true });
  const r = await migrarLote(m.deps, 'mg_1');
  check('F · un recurso histórico se copia, se verifica y se completa',
    r.copiados === 1 && r.completados === 1 && r.fallidos === 0, JSON.stringify({ c: r.copiados, v: r.completados }));
  check('F · y NO se da por migrado por el 200: se preguntó al destino y se comparó',
    r.verificados === 1 && r.porNivel['tamano_y_tipo'] === 1);
  check('F · la ficha MC-1 se registra DESPUÉS de verificar, no antes',
    m.llamadas.registrar === 1 && [...m.items.values()][0].estado === 'completado');
  check('F · el objeto quedó en la carpeta de su cuenta',
    m.objetos.has(`accounts/${CUENTA}/assets/${MATERIAL}/original`));
  check('F · y la costura de coste de MC-7 ve la lectura y la escritura, sin inventar cifra',
    m.llamadas.coste.length === 2 && m.llamadas.coste.every((c) => typeof c[2] === 'number' && !('precio' in c)),
    JSON.stringify(m.llamadas.coste.map((c) => [c[0], c[1]])));

  /* 18 · recurso ya migrado. */
  const r2 = await migrarLote(m.deps, 'mg_1');
  check('18) repetir sobre lo ya migrado no transfiere nada y lo salta',
    r2.saltados === 1 && r2.copiados === 0 && r2.porMotivo['ya_migrado'] === 1);
  check('18) y la fuente no se volvió a leer', m.fuente.llamadas.leer === 1);

  /* 3 · retry después de crash · 24 · fallo después del PUT antes de registrar · 25 · reanudación. */
  const m2 = mundo();
  /* Se copia por fuera y NO se registra: exactamente lo que deja un proceso muerto a mitad. */
  await m2.almacen.guardar({
    destino: { provider: FAKE_PROVIDER_ID, bucket: 'cubo', objectKey: `accounts/${CUENTA}/assets/${MATERIAL}/original` },
    cuerpo: Buffer.from('unos bytes historicos'), contentType: 'image/jpeg', siNoExiste: true,
  });
  const r3 = await migrarLote(m2.deps, 'mg_1');
  check('24) tras un PUT sin registrar, se VERIFICA en vez de volver a transferir',
    r3.completados === 1 && m2.fuente.llamadas.leer === 0, `leer=${m2.fuente.llamadas.leer}`);
  check('3/25) reanudar no cobra dos veces la transferencia', r3.copiados === 0 && r3.bytesCopiados === 0);

  /* 16/17 · concurrencia e idempotencia concurrente. */
  const m3 = mundo();
  const [c1, c2] = await Promise.all([migrarLote(m3.deps, 'mg_1'), migrarLote(m3.deps, 'mg_1')]);
  const copiadosTotales = c1.copiados + c2.copiados;
  const yaEstaban = c1.yaEstaban + c2.yaEstaban;
  check('16/17) dos pasadas a la vez NO dejan dos objetos: una copia, la otra encuentra',
    copiadosTotales === 1 && yaEstaban === 1, JSON.stringify({ copiadosTotales, yaEstaban }));
  check('16/17) y las dos acaban completando, sin contradecirse',
    c1.completados === 1 && c2.completados === 1 && m3.objetos.size === 1);

  /* 4 · timeout · 5 · destino caído · 23 · error de escritura. */
  const m4 = mundo();
  m4.deps.almacenes[FAKE_PROVIDER_ID] = {
    ...m4.almacen,
    capacidades: m4.almacen.capacidades,
    guardar: async () => ({ ok: false, error: { code: 'PROVIDER_UNAVAILABLE', source: 'storage:x', details: { reason: 'timeout' } } }),
  };
  const r4 = await migrarLote(m4.deps, 'mg_1');
  check('4/5/23) un destino caído no completa nada, cuenta el error y anota el intento',
    r4.errores === 1 && r4.completados === 0 && [...m4.items.values()][0].intentos === 1);
  check('5) y el item queda reintentable, no fallido',
    [...m4.items.values()][0].estado === 'descubierto');

  /* Hasta agotarse. */
  const m5 = mundo({ item: { intentos: POLITICA_DE_MIGRACION.maxIntentos - 1 } });
  m5.deps.almacenes[FAKE_PROVIDER_ID] = {
    ...m5.almacen,
    guardar: async () => ({ ok: false, error: { code: 'PROVIDER_ERROR', source: 'storage:x' } }),
  };
  await migrarLote(m5.deps, 'mg_1');
  check('4/5) agotados los intentos, el item queda FALLIDO y deja de intentarlo',
    [...m5.items.values()][0].estado === 'fallido');

  /* 22 · error de lectura de la fuente. */
  const m6 = mundo();
  m6.fuente.guion('fallo');
  const r6 = await migrarLote(m6.deps, 'mg_1');
  check('22) un error de LECTURA de la fuente no escribe nada en el destino',
    r6.errores + r6.bloqueados === 1 && m6.objetos.size === 0 && r6.copiados === 0);

  /* 19 · recurso no migrable. */
  const m7 = mundo({ fuentes: {} });
  const r7 = await migrarLote(m7.deps, 'mg_1');
  check('19) un origen sin fuente registrada se bloquea y no se toca',
    r7.bloqueados === 1 && r7.porMotivo['fuente_no_reconocida'] === 1 && m7.objetos.size === 0);

  const m8 = mundo({ estadoDeFuente: 'DISABLED' });
  const r8 = await migrarLote(m8.deps, 'mg_1');
  check('19) una fuente APAGADA no se llama ni una vez',
    r8.bloqueados === 1 && m8.fuente.llamadas.leer === 0);

  /* 20 · recurso ambiguo. */
  const m9 = mundo({ material: undefined });
  const r9 = await migrarLote(m9.deps, 'mg_1');
  check('20) sin material de la Fase 11 se bloquea, y el motivo lo dice',
    r9.bloqueados === 1 && r9.porMotivo['sin_material'] === 1);
  check('20) el material retirado se SALTA: migrar sus bytes lo resucitaría',
    decidir({ material: material({ status: 'deleted', deletedAt: T0 }) }).motivo === 'retirado');

  /* 7 · verificación incorrecta, de punta a punta. */
  const m10 = mundo({ bytesDeclarados: 999999 });
  const r10 = await migrarLote(m10.deps, 'mg_1');
  check('7) si lo que llega no cuadra con lo que la fuente dijo, NO se completa',
    r10.completados === 0 && r10.fallidos === 1 && r10.porMotivo['tamano_distinto'] === 1);
  check('7) y NO se registra la ficha del objeto: no se afirma lo que no se comprobó',
    m10.llamadas.registrar === 0);

  /* La segunda pregunta. */
  const m11 = mundo();
  let vez = 0;
  m11.deps.material = async () => (++vez === 1 ? material() : material({ status: 'deleted', deletedAt: T0 }));
  const r11 = await migrarLote(m11.deps, 'mg_1');
  check('F · se vuelve a preguntar antes de transferir: un cambio a mitad evita la copia',
    r11.copiados === 0 && m11.fuente.llamadas.leer === 0 && r11.saltados === 1);

  /* 14/15 · escala. */
  const m12 = mundo({ cursor: 'siguiente' });
  const r12 = await migrarLote(m12.deps, 'mg_1');
  check('ESCALA · el informe devuelve cursor para seguir, nunca un desplazamiento',
    r12.cursor === 'siguiente' && typeof r12.ms === 'number');
}

/* ═══ G · LA FUENTE REAL: APAGADA Y SIN RED ══════════════════════════════ */
console.log('\n── G · Cloudinary vive en un solo archivo, y está apagado ──');
{
  /* Sin configuración, apagada. */
  const apagada = crearFuenteCloudinary({});
  check('LEGACY · sin configuración válida la fuente está DISABLED', apagada.estado === 'DISABLED');
  check('LEGACY · y apagada no resuelve ninguna URL',
    (await apagada.leer(ORIGEN)).motivo === 'sin_acceso'
    && (await apagada.describir(ORIGEN)).motivo === 'sin_acceso');

  /* Configurada, sigue sin verificar. */
  let pedidas = [];
  const traer = async (url) => { pedidas.push(url); return { ok: true, status: 200, bytes: 12, contentType: 'image/jpeg', cuerpo: Buffer.alloc(12) }; };
  const viva = crearFuenteCloudinary({ nube: 'laNubeDeWee'.toLowerCase(), traer });
  check('LEGACY · configurada sube a UNVERIFIED, NUNCA sola a READY', viva.estado === 'UNVERIFIED');

  const suya = { provider: CLOUDINARY_SOURCE_ID, bucket: 'lanubedewee/image', objectKey: 'posts/a/b', version: 'v123' };
  const ajena = { provider: CLOUDINARY_SOURCE_ID, bucket: 'nubeDeOtro/image'.toLowerCase(), objectKey: 'posts/a/b' };
  check('LEGACY · reconstruye la URL de entrega de SU nube',
    urlDeEntrega(suya, 'lanubedewee') === 'https://res.cloudinary.com/lanubedewee/image/upload/v123/posts/a/b');
  check('LEGACY · y se NIEGA a servir la nube de otro, aunque tenga la forma correcta',
    urlDeEntrega(ajena, 'lanubedewee') === undefined
    && (await viva.leer(ajena)).motivo === 'sin_acceso');
  check('LEGACY · una clave con salto de carpeta no produce URL',
    urlDeEntrega({ ...suya, objectKey: '../../otro' }, 'lanubedewee') === undefined);

  const d = await viva.describir(suya);
  check('LEGACY · describe con lo que la respuesta dio', d.ok && d.hechos.bytes === 12 && d.hechos.contentType === 'image/jpeg');
  check('LEGACY · y NO declara suma: un ETag opaco no es una suma', d.ok && d.hechos.suma === undefined);

  const perdida = crearFuenteCloudinary({ nube: 'lanubedewee', traer: async () => ({ ok: false, status: 404 }) });
  check('LEGACY · un 404 es «no existe», no un fallo', (await perdida.describir(suya)).motivo === 'no_existe');
  const prohibida = crearFuenteCloudinary({ nube: 'lanubedewee', traer: async () => ({ ok: false, status: 403 }) });
  check('LEGACY · un 403 es «sin acceso»', (await prohibida.describir(suya)).motivo === 'sin_acceso');
  const rota = crearFuenteCloudinary({ nube: 'lanubedewee', traer: async () => { throw new Error(`fallo con https://res.cloudinary.com/lanubedewee/image/upload/secreto`); } });
  const rr = await rota.describir(suya);
  check('LEGACY · una excepción NO filtra su mensaje: podría llevar la URL dentro',
    !rr.ok && rr.motivo === 'fallo' && !JSON.stringify(rr.error).includes('cloudinary.com'));

  /* 14 · Cloudinary solo en su adapter. */
  const andar = (dir) => fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? andar(`${dir}/${e.name}`) : e.name.endsWith('.ts') ? [`${dir}/${e.name}`] : []);
  const nombran = andar('functions/src/media')
    .filter((f) => /cloudinary|res\.cloudinary\.com/i.test(sinComentarios(leer(f))));
  check('14) dentro de Media Cloud, este proveedor se nombra en UN solo archivo',
    nombran.length === 1 && nombran[0].endsWith('/cloudinary.ts'), nombran.join(','));
  check('14) y su identidad es la MISMA que ya usa la Fase 11 en `StorageRef.provider`',
    CLOUDINARY_SOURCE_ID === /export const PROVEEDOR_CLOUDINARY = '([^']+)'/.exec(leer('functions/src/content/index.ts'))[1]);
  check('14) el adaptador no puede llamar solo: la red entra por parámetro',
    !/fetch\(|undici|node-fetch|https?\.request|XMLHttpRequest/.test(sinComentarios(leer('functions/src/media/cloudinary.ts'))));
}

/* ═══ H · PROVIDER-AGNOSTIC Y OBSERVABILIDAD ═════════════════════════════ */
console.log('\n── H · El Core no conoce a nadie, y el informe no filtra nada ──');
{
  const CORE_MIG = sinComentarios(leer('functions/src/core/media/migracion.ts'));
  const COMP_MIG = sinComentarios(leer('functions/src/media/migracion.ts'));

  /* 15 · provider-agnostic Core. */
  const PROHIBIDOS = ['cloudinary', 'r2', 'cloudflare', 'aws', 's3', 'sigv4', 'qiniu', 'alibaba', 'tencent',
    'backblaze', 'wasabi', 'gcs', 'azure'];
  const enCore = PROHIBIDOS.filter((p) => new RegExp(`(?<![a-z0-9])${p}(?![a-z0-9])`, 'i').test(CORE_MIG));
  check('15) ningún nombre de proveedor ni de fuente aparece en el Core de MC-6', enCore.length === 0, enCore.join(','));
  const enComp = PROHIBIDOS.filter((p) => new RegExp(`(?<![a-z0-9])${p}(?![a-z0-9])`, 'i').test(COMP_MIG));
  check('15) ni en el traslado: los adaptadores llegan por sus identidades', enComp.length === 0, enComp.join(','));

  /* El Core sigue siendo puro. */
  check('15) el Core de MC-6 no toca reloj, red, disco ni dados',
    !/Date\.now|Math\.random|require\(|fetch\(|fs\.|process\./.test(CORE_MIG));
  const imports = [...leer('functions/src/core/media/migracion.ts').matchAll(/from '([^']+)'/g)].map((m) => m[1]);
  check('15) y solo importa de dentro del Core',
    imports.every((i) => i.startsWith('./') || i.startsWith('../')) && !imports.some((i) => i.includes('../../')),
    imports.join(','));

  /* 27/28 · nada de URLs firmadas ni secretos. */
  check('27/28) no hay un solo `console.` en ninguna de las tres capas',
    !/console\./.test(CORE_MIG) && !/console\./.test(COMP_MIG)
    && !/console\./.test(sinComentarios(leer('functions/src/media/cloudinary.ts'))));
  check('27) el traslado no firma NADA: no hay una sola URL firmada que persistir',
    !/urlFirmada|urlDeSubida|signedUrl|firmar/i.test(COMP_MIG));

  const informe = informeDeMigracionVacio('mg_1');
  check('28) el informe son contadores y motivos: ni una URL, ni una clave, ni un identificador ajeno',
    Object.entries(informe).every(([k, v]) =>
      k === 'migrationId' || k === 'cursor' || typeof v === 'number' || typeof v === 'object'),
    Object.keys(informe).join(','));
  check('28) y no tiene un solo campo con forma de secreto',
    !/url|token|secret|credencial|clave|key|cabecera/i.test(Object.keys(informe).join(',')));

  /* El error se sanea con el saneador que ya existe, no con una segunda lista. */
  const sucio = { code: 'PROVIDER_ERROR', source: 'legacy:x', details: { apiKey: 'AKIAsecreto', reason: 'x' } };
  const limpio = errorDeMigracionSaneado(sucio, 'legacy:x');
  check('28) un error de la fuente se sanea antes de guardarse',
    !JSON.stringify(limpio).includes('AKIAsecreto') && limpio.details.reason === 'x', JSON.stringify(limpio.details));
  check('28) y se reutiliza el saneador del Gateway, sin una segunda lista de palabras',
    /sanearMeta/.test(CORE_MIG));

  /* No hay segundo sistema de trabajos. */
  check('MC-6 no declara una segunda cola, ni trabajador, ni planificador',
    !/cola|queue|worker|scheduler|onSchedule|setInterval|setTimeout/i.test(COMP_MIG));
  check('MC-6 no está expuesto: ninguna Function lo llama',
    !/migrarLote|decidirMigracion|crearFuenteCloudinary/.test(leer('functions/src/index.ts')));
  check('y reutiliza los estados del Job Engine en vez de declarar otros',
    /JobState/.test(CORE_MIG) && !/type EstadoDeEjecucion|'running'\s*\|/.test(CORE_MIG));
  check('esta suite está en la cadena de `npm test`',
    /media-migracion\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
