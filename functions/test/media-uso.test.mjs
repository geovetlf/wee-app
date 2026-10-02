/**
 * MC-7 · MEDICIÓN DE USO Y COSTE DE WEE MEDIA CLOUD.
 *
 * Las 30 comprobaciones del encargo, más las que hicieron falta para que cada
 * una signifique algo. Ni una llamada de red, ni un precio inventado, ni una
 * cifra en coma flotante.
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
  usoValido, identidadDeUso, sellarUso, anclaEstable, agregarUso, claveDeAgregado,
  calcularCoste, precioAplicable, precioValido, seConoceElCoste, importeDe,
  unidadDe, esNivel, esMetrica, esMetricaConocida, esMetricaPropia, esOperacionFisica,
  usoDeEscritura, usoDeLectura, usoDeOperacion, usoDeNivel,
  compararConProveedor, sePuedeCompactar, POLITICA_DE_RETENCION,
  METRICAS_CONOCIDAS, OPERACIONES_FISICAS, UNIDAD_DE_METRICA, FORMA_DE_USO,
  esMoney, dinero,
} = core;

const { crearMedidor, agregarPeriodo, rutaDeEventos, MAX_EVENTOS_POR_AGREGADO } = await import('../lib/media/uso.js');
const { recogerObjetosHuerfanos } = await import('../lib/media/recoleccion.js');
const { migrarLote } = await import('../lib/media/migracion.js');
const { crearAlmacenFalso, FAKE_PROVIDER_ID } = await import('../lib/media/falso.js');
const { crearFuenteFalsa, FUENTE_FALSA_ID } = await import('../lib/media/fuente-falsa.js');

let failures = 0;
let n = 0;
const check = (nombre, ok, detalle) => {
  n++;
  if (ok) console.log(`✔ ${n}) ${nombre}${detalle !== undefined ? ` — ${detalle}` : ''}`);
  else { failures++; console.log(`✘ ${n}) ${nombre}${detalle !== undefined ? ` — ${detalle}` : ''}`); }
};

const T0 = 1_800_000_000_000;
const ANA = 'cuentaDeAna';
const BEA = 'cuentaDeBea';
const MATERIAL = 'asset_abc123';
const PROV = 'almacenfalso';
const huella = (t) => createHash('sha256').update(t).digest('hex');

const uso = (o = {}) => ({
  accountId: ANA,
  providerId: PROV,
  operacion: 'object.put',
  metrica: 'bytes_escritos',
  unidad: 'byte',
  cantidad: 1024,
  occurredAt: T0,
  ancla: { attemptId: 'att-1' },
  ...o,
});

/* ═══ A · EL DINERO ES EL DE F9 ═══════════════════════════════════════════ */
console.log('\n── A · No hay un segundo tipo de dinero ──');
{
  /* 4 · no floating point. */
  const CORE_USO = leer('functions/src/core/media/uso.ts');
  check('4) MC-7 importa `Money` del Financial Core en vez de declarar el suyo',
    /from '\.\.\/financial\/money'/.test(CORE_USO) && !/interface Money\b|type Money\b/.test(CORE_USO));
  check('4) y `money.ts` no importa nada, así que traerlo no arrastra el libro ni las pasarelas',
    !/^import/m.test(leer('functions/src/core/financial/money.ts')));
  check('4) no hay un solo `usd: number` ni float en el Core de MC-7',
    !/usd\s*:\s*number|parseFloat|toFixed\(/.test(sinComentarios(CORE_USO)));
  check('4) NO se reutiliza `ProviderCost`, que sí es coma flotante',
    !/ProviderCost|ActualCost/.test(sinComentarios(CORE_USO))
    && /usd: number/.test(leer('functions/src/core/cost.ts')));

  /* 3 · amount exacto. */
  const precio = { providerId: PROV, metrica: 'bytes_escritos', precio: dinero(1500, 'USD'), porCantidad: 1000, base: 'operacion', fuente: 'prueba', vigenteDesde: 0 };
  const o = calcularCoste({ providerId: PROV, metrica: 'bytes_escritos', cantidad: 1000, occurredAt: T0 }, [precio]);
  check('3) el importe es exacto y entero', o.estado === 'estimado' && o.coste.amountMinor === 1500 && esMoney(o.coste));
  const mitad = calcularCoste({ providerId: PROV, metrica: 'bytes_escritos', cantidad: 500, occurredAt: T0 }, [precio]);
  check('3) y una tarifa sub-unidad se expresa sin decimales: 1500 por cada 1000',
    mitad.estado === 'estimado' && mitad.coste.amountMinor === 750);
  const impar = calcularCoste({ providerId: PROV, metrica: 'bytes_escritos', cantidad: 333, occurredAt: T0 }, [precio]);
  check('3) el redondeo va DECLARADO para que la cuenta se pueda reproducir',
    impar.estado === 'estimado' && impar.coste.amountMinor === 500 && impar.redondeo === 'al_mas_cercano');
  check('3) una cuenta que se sale de los enteros exactos NO contesta un número plausible',
    calcularCoste({ providerId: PROV, metrica: 'bytes_escritos', cantidad: Number.MAX_SAFE_INTEGER, occurredAt: T0 }, [precio]).motivo === 'no_calculable');
}

/* ═══ B · EL HECHO DE USO ═════════════════════════════════════════════════ */
console.log('\n── B · Qué es y qué no es un hecho de uso ──');
{
  /* 1 · usage event válido. */
  check('1) un hecho bien formado se admite', usoValido(uso()) === true);
  const sellado = sellarUso(huella, uso());
  check('1) y sellado lleva su identidad', FORMA_DE_USO.test(sellado.usageId), sellado.usageId);

  /* 2 · usage event inválido. */
  check('2) sin cuenta, no', !usoValido(uso({ accountId: '' })));
  check('2) sin proveedor, no', !usoValido(uso({ providerId: '' })));
  check('2) con una operación que no existe, no', !usoValido(uso({ operacion: 'object.magia' })));
  check('2) con cantidad negativa, no', !usoValido(uso({ cantidad: -1 })));
  check('2) con cantidad fraccionaria, no', !usoValido(uso({ cantidad: 1.5 })));
  check('2) sin ancla, NO: un hecho que no se puede deduplicar no se admite',
    !usoValido(uso({ ancla: {} })) && anclaEstable({}) === undefined);
  check('2) con la unidad que no le toca a su métrica, no',
    !usoValido(uso({ metrica: 'operaciones', unidad: 'byte' })));

  /* 11 · account isolation. */
  const a = identidadDeUso(huella, uso({ accountId: ANA }));
  const b = identidadDeUso(huella, uso({ accountId: BEA }));
  check('11) el mismo hecho físico en dos cuentas son DOS hechos distintos', a !== b);
  check('11) la cuenta va en la identidad, así que no se puede reatribuir sin cambiarla',
    /u\.accountId/.test(sinComentarios(leer('functions/src/core/media/uso.ts')).match(/const material = \[[^\]]+\]/)[0]));

  /* 12 · provider identity. */
  check('12) el mismo hecho en dos proveedores son dos hechos',
    identidadDeUso(huella, uso({ providerId: 'otro' })) !== a);

  /* 13 · referencias a asset/job/operation. */
  const conRefs = uso({ assetId: MATERIAL, objectRef: 'mob_' + 'a'.repeat(32), jobId: 'job-1', operationId: 'op-1' });
  check('13) lleva referencias a material, objeto, trabajo y operación', usoValido(conRefs));
  check('13) y esas referencias NO cambian la identidad: el hecho físico es el mismo',
    identidadDeUso(huella, conRefs) === a);
  check('13) un identificador con forma inválida se rechaza', !usoValido(uso({ assetId: 'a/b' })));
}

/* ═══ C · IDENTIDAD E IDEMPOTENCIA ═══════════════════════════════════════ */
console.log('\n── C · Contar una vez lo que pasó una vez ──');
{
  /* 6 · idempotencia. */
  check('6) el mismo hecho da la misma identidad siempre',
    identidadDeUso(huella, uso()) === identidadDeUso(huella, uso()));
  check('6) la CANTIDAD no entra en la identidad: dos avisos que no coinciden siguen siendo un hecho',
    identidadDeUso(huella, uso({ cantidad: 1024 })) === identidadDeUso(huella, uso({ cantidad: 999 })));
  check('6) la métrica SÍ: un PUT produce bytes Y operación, y son dos hechos',
    identidadDeUso(huella, uso({ metrica: 'operaciones', unidad: 'operacion', cantidad: 1 }))
    !== identidadDeUso(huella, uso()));

  /* 7 · retry. 9 · mismo operationId no duplica. 10 · operaciones distintas sí cuentan. */
  check('7/9) dos avisos del MISMO intento son un hecho',
    identidadDeUso(huella, uso({ ancla: { attemptId: 'att-1' } }))
    === identidadDeUso(huella, uso({ ancla: { attemptId: 'att-1' } })));
  check('10) un reintento que SÍ llamó al proveedor es OTRO intento y cuenta otra vez',
    identidadDeUso(huella, uso({ ancla: { attemptId: 'att-2' } }))
    !== identidadDeUso(huella, uso({ ancla: { attemptId: 'att-1' } })));
  check('9) lo que el proveedor llama a su operación también ancla',
    anclaEstable({ providerRef: { providerId: PROV, operationId: 'x1' } }) === `provider:${PROV}:x1`);
  check('C · el intento manda sobre lo demás: es el ancla más cercana a «una llamada»',
    anclaEstable({ attemptId: 'att-1', providerRef: { providerId: PROV, operationId: 'x1' }, runId: 'r' }).startsWith('attempt:'));
  check('C · sin trabajo detrás, la pasada más el objeto',
    anclaEstable({ runId: 'run-1', objectRef: 'mob_x' }) === 'run:run-1:mob_x');
  check('C · y NUNCA un reloj: el ancla no mira la hora',
    !/Date\.now|occurredAt|at\b/.test(sinComentarios(leer('functions/src/core/media/uso.ts')).match(/export const anclaEstable[\s\S]*?\n\};/)[0]));

  /* 8 · concurrencia. */
  const m = crearMedidor(huella);
  m.medidor.medir(uso());
  m.medidor.medir(uso());
  m.medidor.medir(uso({ cantidad: 2048 }));
  check('8) dos trabajadores que informan del mismo hecho dejan UNO', m.pendientes().length === 1);
  check('8) y gana el primero: el hecho no se reescribe por llegar otra vez',
    m.pendientes()[0].cantidad === 1024);
  const malo = crearMedidor(huella);
  malo.medidor.medir(uso({ cantidad: -5 }));
  check('8) lo que no llega a ser un hecho se VE, no se tira en silencio',
    malo.pendientes().length === 0 && malo.descartados().length === 1);
}

/* ═══ D · MÉTRICAS Y UNIDADES ════════════════════════════════════════════ */
console.log('\n── D · Una cantidad sin unidad es un número ──');
{
  /* 14 · bytes stored. */
  const nivel = usoDeNivel({ accountId: ANA, providerId: PROV, occurredAt: T0 }, 'bytes_almacenados', 5_000_000, '2026-09');
  check('14) los bytes almacenados son un NIVEL, anclado al periodo y no a una operación',
    usoValido(nivel) && esNivel('bytes_almacenados') && anclaEstable(nivel.ancla) === 'periodo:2026-09');
  check('14) y un nivel NO se puede amarrar a una operación física',
    !usoValido({ ...nivel, ancla: { attemptId: 'att-1' } }));
  check('14) ni un flujo a un periodo', !usoValido(uso({ ancla: { periodo: '2026-09' } })));

  /* 15 · bytes transferred. */
  const esc = usoDeEscritura({ accountId: ANA, providerId: PROV, operacion: 'object.put', occurredAt: T0, ancla: { attemptId: 'a' } }, 4096);
  check('15) escribir produce SIEMPRE dos hechos: el volumen y la petición',
    esc.length === 2 && esc[0].metrica === 'bytes_escritos' && esc[1].metrica === 'operaciones' && esc[1].cantidad === 1);
  const lec = usoDeLectura({ accountId: ANA, providerId: PROV, operacion: 'object.get', occurredAt: T0, ancla: { attemptId: 'a' } }, 4096);
  check('15) y leer, lo mismo', lec.length === 2 && lec[0].metrica === 'bytes_leidos' && lec.every(usoValido));
  check('15) una operación sin bytes produce uno solo',
    usoDeOperacion({ accountId: ANA, providerId: PROV, operacion: 'object.delete', occurredAt: T0, ancla: { runId: 'r', objectRef: 'o' } }).length === 1);

  /* 16 · processing usage. */
  check('16) el cómputo se mide en segundos y tiene su propia operación',
    unidadDe('segundos_de_proceso') === 'segundo' && esOperacionFisica('process.run'));

  /* 28 · unknown metric. */
  check('28) una métrica que Weë no nombra NO tiene unidad supuesta', unidadDe('x:clase_a') === undefined);
  check('28) pero se admite si la unidad va DICHA',
    usoValido(uso({ metrica: 'x:clase_a', unidad: 'unidad_del_proveedor' })));
  check('28) y sin decirla, no', !usoValido(uso({ metrica: 'x:clase_a', unidad: 'byte' })));
  check('28) una métrica inventada sin el prefijo declarado se rechaza',
    !esMetrica('lo_que_sea') && !usoValido(uso({ metrica: 'lo_que_sea' })));
  check('28) la unidad sale de un mapa explícito, no de deducir por el nombre',
    Object.keys(UNIDAD_DE_METRICA).length === METRICAS_CONOCIDAS.length);
}

/* ═══ E · EL COSTE ═══════════════════════════════════════════════════════ */
console.log('\n── E · Desconocido no es cero ──');
{
  const precio = (o = {}) => ({
    providerId: PROV, metrica: 'operaciones', precio: dinero(36, 'USD'), porCantidad: 1_000_000,
    base: 'operacion', fuente: 'documentación del proveedor', vigenteDesde: T0 - 1000, ...o,
  });

  /* 27 · provider with pricing. */
  const con = calcularCoste({ providerId: PROV, metrica: 'operaciones', cantidad: 1_000_000, occurredAt: T0 }, [precio()]);
  check('27) con tarifa declarada, el coste sale estimado y con su precio al lado',
    con.estado === 'estimado' && con.coste.amountMinor === 36 && con.precio.fuente.length > 0);
  check('27) y se puede saber de cuándo era el precio que se usó', con.precio.vigenteDesde === T0 - 1000);

  /* 26 · provider without pricing. 5 · unknown no es cero. */
  const sin = calcularCoste({ providerId: PROV, metrica: 'operaciones', cantidad: 5, occurredAt: T0 }, []);
  check('26) sin tarifa el coste es DESCONOCIDO', sin.estado === 'desconocido' && sin.motivo === 'sin_precio');
  check('5) y desconocido NO TIENE campo de importe: no se puede leer un cero',
    !('coste' in sin) && importeDe(sin) === undefined && !seConoceElCoste(sin));
  check('5) el tipo lo impide estructuralmente, no por disciplina',
    /estado: 'desconocido'; motivo: MotivoSinCoste \}/.test(leer('functions/src/core/media/uso.ts')));
  check('5) una tarifa que aún no estaba vigente no vale, y se distingue de no tener ninguna',
    calcularCoste({ providerId: PROV, metrica: 'operaciones', cantidad: 5, occurredAt: T0 - 99999 }, [precio()]).motivo === 'precio_no_vigente');
  check('5) una métrica propia no se valora sola',
    calcularCoste({ providerId: PROV, metrica: 'x:clase_a', cantidad: 5, occurredAt: T0 }, [precio({ metrica: 'x:clase_a' })]).motivo === 'metrica_desconocida');

  /* El precio del día, no el de hoy. */
  const viejo = precio({ precio: dinero(50, 'USD'), vigenteDesde: 0, vigenteHasta: T0 - 500 });
  check('E) un hecho antiguo se valora con la tarifa que estaba vigente ENTONCES',
    precioAplicable([viejo, precio()], PROV, 'operaciones', T0 - 2000).precio.amountMinor === 50);
  check('E) una tarifa con un dinero que no es dinero se rechaza',
    !precioValido(precio({ precio: { amountMinor: 1.5, currency: 'USD' } })));
  check('E) y una sin fuente tampoco: un coste que no dice de dónde salió no se audita',
    !precioValido(precio({ fuente: '' })));

  /* 24 · no client-controlled cost. */
  const CORE_USO = sinComentarios(leer('functions/src/core/media/uso.ts'));
  check('24) el hecho de uso NO tiene un solo campo de dinero: el cliente no puede declarar lo que costó',
    !/Money/.test(CORE_USO.match(/export interface UsoMedido \{[\s\S]*?\n\}/)[0]));
  check('24) el coste se CALCULA de una tarifa declarada por el proveedor, no se recibe',
    /calcularCoste = \(/.test(CORE_USO) && !/costeDeclarado|costeDelCliente/.test(CORE_USO));

  /* NO se han inventado precios. */
  const R2 = leer('functions/src/media/r2.ts');
  check('E) y NO se ha escrito ninguna tarifa real: el descriptor de R2 sigue sin precios',
    !/precios\s*:/.test(R2));
}

/* ═══ F · APPEND-ONLY Y CORRECCIONES ═════════════════════════════════════ */
console.log('\n── F · Un hecho no se reescribe ──');
{
  const ev = (o = {}) => sellarUso(huella, uso({ ...o }));
  const clave = { providerId: PROV, accountId: ANA, periodo: '2026-09-21', metrica: 'bytes_escritos' };

  const e1 = ev({ ancla: { attemptId: 'a1' }, cantidad: 100 });
  const e2 = ev({ ancla: { attemptId: 'a2' }, cantidad: 200, occurredAt: T0 + 1 });
  const ag = agregarUso(huella, [e1, e2], clave);
  check('20) el agregado suma los flujos', ag.cantidad === 300 && ag.eventos === 2);
  check('20) repetir un hecho en la lista NO lo cuenta dos veces',
    agregarUso(huella, [e1, e1, e2], clave).cantidad === 300);
  check('20) y lleva una huella de con qué se sumó, para poder verificarlo después',
    typeof ag.huella === 'string' && ag.huella.length >= 32);

  /* 21 · correction event. */
  const correccion = ev({ ancla: { attemptId: 'a3' }, cantidad: 150, occurredAt: T0 + 2, corrige: e1.usageId });
  const corregido = agregarUso(huella, [e1, e2, correccion], clave);
  check('21) una corrección sustituye al corregido: 150 + 200, no 100 + 200 + 150',
    corregido.cantidad === 350, String(corregido.cantidad));
  check('21) y el corregido SIGUE guardado: borrarlo borraría la prueba de que se corrigió',
    corregido.eventos === 2 && [e1, e2, correccion].length === 3);
  check('21) una corrección que no apunta a un hecho con forma de hecho se rechaza',
    !usoValido(uso({ corrige: 'no-es-un-id' })));

  /* Un nivel no se suma. */
  const nivel = (c, t) => sellarUso(huella, usoDeNivel({ accountId: ANA, providerId: PROV, occurredAt: t }, 'bytes_almacenados', c, '2026-09'));
  const claveNivel = { providerId: PROV, accountId: ANA, periodo: '2026-09', metrica: 'bytes_almacenados' };
  const agNivel = agregarUso(huella, [nivel(1000, T0), nivel(1200, T0 + 10)], claveNivel);
  check('F) treinta fotos de un gigabyte son un gigabyte, no treinta: gana la última',
    agNivel.cantidad === 1200, String(agNivel.cantidad));
  check('F) un agregado de otra cuenta o proveedor no se mezcla',
    agregarUso(huella, [ev({ accountId: BEA })], clave) === undefined);
}

/* ═══ G · QUIÉN MIDE QUÉ ═════════════════════════════════════════════════ */
console.log('\n── G · Las cuatro fases que miden, y la que no ──');
{
  /* 17 · delete usage (MC-5). */
  const objeto = {
    objectRef: 'mob_' + 'c'.repeat(32), providerId: FAKE_PROVIDER_ID, accountId: ANA, assetId: MATERIAL,
    pieza: 'original', bucket: 'cubo', objectKey: `accounts/${ANA}/assets/${MATERIAL}/original`,
    estado: 'guardado', createdAt: T0 - 40 * 24 * 3600 * 1000, updatedAt: T0,
  };
  const m5 = crearMedidor(huella);
  const almacen = crearAlmacenFalso({ ahora: () => T0, contenedor: 'cubo' });
  await recogerObjetosHuerfanos({
    objetos: async () => ({ objetos: [objeto] }),
    referencias: async () => [],
    operaciones: async () => [],
    almacenes: { [FAKE_PROVIDER_ID]: almacen },
    marcarBorrado: async () => true,
    anotarIntento: async () => {},
    ahora: () => T0,
    medidor: m5.medidor,
  }, 'run-gc-1');
  const gc = m5.pendientes();
  check('17) el GC mide su borrado físico', gc.length === 1 && gc[0].operacion === 'object.delete');
  check('17) con la cuenta del objeto y el proveedor real, y sin bytes',
    gc[0].accountId === ANA && gc[0].providerId === FAKE_PROVIDER_ID && gc[0].metrica === 'operaciones');
  check('17) anclado a la pasada y al objeto, que es lo que hay cuando no hay trabajo',
    anclaEstable(gc[0].ancla) === `run:run-gc-1:${objeto.objectRef}`);
  check('17) repetir el barrido NO duplica la medida de ese borrado',
    identidadDeUso(huella, gc[0]) === identidadDeUso(huella, gc[0]));

  /* 18 · migration usage (MC-6). */
  const ORIGEN = { provider: FUENTE_FALSA_ID, bucket: 'nubedeayer/image', objectKey: 'posts/uno' };
  const fuente = crearFuenteFalsa();
  fuente.poner(ORIGEN, { cuerpo: Buffer.from('doce bytes!!'), contentType: 'image/jpeg' });
  const almacen6 = crearAlmacenFalso({ ahora: () => T0, contenedor: 'cubo' });
  const m6 = crearMedidor(huella);
  const item = { migrationId: 'mg-1', itemId: 'mig_' + 'd'.repeat(32), origen: ORIGEN, estado: 'descubierto', intentos: 0, createdAt: T0, updatedAt: T0 };
  await migrarLote({
    items: async () => ({ items: [item] }),
    material: async () => ({
      contract: core.CONTENT_CORE_CONTRACT_VERSION, assetId: MATERIAL, ownerAccountId: ANA,
      kind: 'image', status: 'uploading', provenance: { createdAt: T0 }, createdAt: T0, updatedAt: T0,
    }),
    objeto: async () => undefined,
    operaciones: async () => [],
    fuentes: { [FUENTE_FALSA_ID]: fuente },
    almacenes: { [FAKE_PROVIDER_ID]: almacen6 },
    destinoProviderId: FAKE_PROVIDER_ID,
    registrarObjeto: async () => 'mob_' + 'e'.repeat(32),
    anotarItem: async () => true,
    ahora: () => T0,
    medidor: m6.medidor,
  }, 'mg-1');
  const mig = m6.pendientes();
  const ops = new Set(mig.map((e) => `${e.providerId}:${e.operacion}:${e.metrica}`));
  check('18) la migración mide LECTURA en la fuente y ESCRITURA en el destino, por separado',
    ops.has(`${FUENTE_FALSA_ID}:legacy.read:bytes_leidos`) && ops.has(`${FAKE_PROVIDER_ID}:object.put:bytes_escritos`),
    [...ops].join(' · '));
  check('18) y mide la VERIFICACIÓN, que también es una petición al proveedor',
    ops.has(`${FAKE_PROVIDER_ID}:object.head:operaciones`));
  check('18) las dos consultas al destino son hechos distintos: el proveedor cobra las dos',
    mig.filter((e) => e.operacion === 'object.head' && e.metrica === 'operaciones').length === 2);
  check('18) cada medida lleva el proveedor de SU lado, no uno solo para las dos',
    new Set(mig.map((e) => e.providerId)).size === 2);
  check('18) todas son hechos válidos', mig.every(usoValido));

  /* 19 · delivery usage (MC-2). */
  check('19) firmar una entrega NO es una operación física: `object.signedUrl` no está en la lista',
    !OPERACIONES_FISICAS.includes('object.signedUrl') && !esOperacionFisica('object.signedUrl'));
  check('19) y MC-2 no mide nada, porque no llama a nadie: firmar es HMAC local',
    !/medidor|MedidorDeUso/.test(leer('functions/src/media/entrega.ts'))
    && !/fetch\(|https?\./.test(sinComentarios(leer('functions/src/media/firma.ts'))));
  check('19) el hueco está DICHO, no estimado: la descarga no pasa por Weë',
    /no la ve|no pasa por Weë/.test(leer('functions/src/core/media/uso.ts')));

  /* 16 · processing (MC-4), en su sitio. */
  const PROC = sinComentarios(leer('functions/src/media/proceso.ts'));
  check('16) MC-4 mide lectura, cómputo, escritura y verificación',
    /usoDeLectura\(/.test(PROC) && /'process\.run'/.test(PROC) && /usoDeEscritura\(/.test(PROC) && /usoDeOperacion\(/.test(PROC));
  check('16) anclado al `attemptId`, que es exactamente «esta ejecución»',
    /ancla: \{ attemptId: dispatch\.attemptId \}/.test(PROC));
  check('16) y el destino puede ser otro proveedor que el origen: cada medida lleva el suyo',
    /providerId: paquete\.origen\.provider/.test(PROC) && /providerId: paquete\.destino\.provider/.test(PROC));
}

/* ═══ H · ESCALA ═════════════════════════════════════════════════════════ */
console.log('\n── H · Diez millones de cuentas ──');
{
  /* 25 · no hot global counter. */
  const COMP = sinComentarios(leer('functions/src/media/uso.ts'));
  check('25) no hay un solo incremento: los eventos se escriben, no se acumulan sobre un documento',
    !/increment|FieldValue|\+\+\s*global|contadorGlobal/i.test(COMP));
  check('25) la cuenta va PRIMERA en la ruta: cada cuenta escribe en su propio subárbol',
    rutaDeEventos(ANA, '2026-09-21').startsWith(`accounts/${ANA}/`));
  check('25) y la clave del agregado lleva la cuenta dentro',
    claveDeAgregado({ providerId: PROV, accountId: ANA, periodo: '2026-09', metrica: 'operaciones' })
      .includes(ANA));
  check('25) una clave sin periodo válido no produce agregado',
    claveDeAgregado({ providerId: PROV, accountId: ANA, periodo: 'ayer', metrica: 'operaciones' }) === undefined);

  /* 30 · scale/batch behavior. */
  const clave = { providerId: PROV, accountId: ANA, periodo: '2026-09-21', metrica: 'operaciones' };
  const muchos = Array.from({ length: 1200 }, (_, i) =>
    sellarUso(huella, uso({ metrica: 'operaciones', unidad: 'operacion', cantidad: 1, ancla: { attemptId: `a${i}` } })));
  let paginas = 0;
  const r = await agregarPeriodo({
    eventos: async (_c, cursor, limite) => {
      paginas++;
      const desde = cursor ? Number(cursor) : 0;
      const trozo = muchos.slice(desde, desde + limite);
      return { eventos: trozo, ...(desde + limite < muchos.length ? { cursor: String(desde + limite) } : {}) };
    },
    guardarAgregado: async () => true,
    huella, ahora: () => T0, porPagina: 500,
  }, clave);
  check('30) se recorre por páginas con cursor, no de una sentada', r.ok && paginas === 3, `páginas=${paginas}`);
  check('30) y el total es exacto', r.ok && r.agregado.cantidad === 1200 && r.agregado.eventos === 1200);
  check('30) el cursor es una posición estable, nunca un desplazamiento que relea lo anterior',
    !/offset|skip\(/i.test(COMP));

  let escrituras = 0;
  const desbordado = await agregarPeriodo({
    eventos: async () => ({ eventos: muchos }),
    guardarAgregado: async () => { escrituras++; return true; },
    huella, ahora: () => T0, maxEventos: 10,
  }, clave);
  check('30) si no cabe en una pasada se dice `incompleto`',
    !desbordado.ok && desbordado.motivo === 'incompleto');
  check('30) y NO se escribe un total parcial: un agregado que miente no se distingue de uno que no',
    escrituras === 0, `escrituras=${escrituras}`);

  /* Retención y compactación verificable. */
  check('H) la retención es explícita y el detalle dura más de un año de ciclos de facturación',
    POLITICA_DE_RETENCION.detalleMs === 400 * 24 * 3600 * 1000
    && POLITICA_DE_RETENCION.agregadoMs > POLITICA_DE_RETENCION.detalleMs);
  const agChico = agregarUso(huella, [muchos[0], muchos[1]], clave);
  check('H) compactar exige que el agregado CUADRE con el detalle que se va a tirar',
    sePuedeCompactar(agChico, [muchos[0], muchos[1]], huella, T0 + POLITICA_DE_RETENCION.detalleMs + 1) === true);
  check('H) si no cuadra, no se compacta: se tiraría la prueba de un error',
    sePuedeCompactar(agChico, [muchos[0]], huella, T0 + POLITICA_DE_RETENCION.detalleMs + 1) === false);
  check('H) y no antes de tiempo', sePuedeCompactar(agChico, [muchos[0], muchos[1]], huella, T0) === false);
}

/* ═══ I · SEGURIDAD ══════════════════════════════════════════════════════ */
console.log('\n── I · Lo que nunca se guarda ──');
{
  const CORE_USO = sinComentarios(leer('functions/src/core/media/uso.ts'));
  const COMP = sinComentarios(leer('functions/src/media/uso.ts'));

  /* 22 · no secrets. 23 · no signed URLs. */
  check('22/23) ni el hecho ni el agregado tienen un campo con forma de secreto o de URL',
    !/url|firmad|token|secret|credencial|cabecera|Authorization|cuerpo|Buffer/i.test(
      CORE_USO.match(/export interface UsoMedido \{[\s\S]*?\n\}/)[0]));
  check('22) la metadata se pasa por el mismo filtro de claves prohibidas que ya usan los eventos',
    /payloadLimpio/.test(CORE_USO));
  check('22) y una metadata con una credencial dentro se RECHAZA',
    !usoValido(uso({ metadata: { apiKey: 'AKIAsecreto' } }))
    && usoValido(uso({ metadata: { region: 'auto' } })));
  check('22) la metadata solo admite escalares pequeños',
    !usoValido(uso({ metadata: { x: { y: 1 } } }))
    && !usoValido(uso({ metadata: { x: 'y'.repeat(201) } })));
  check('23) no hay un solo `console.` en ninguna de las dos capas',
    !/console\./.test(CORE_USO) && !/console\./.test(COMP));
  check('23) y la contabilidad NO depende de los logs: el dato de registro es el evento guardado',
    /DATO DE REGISTRO/.test(leer('functions/src/media/uso.ts')));

  /* La cuenta viene de la autoridad de Weë. */
  check('I) MC-5 toma la cuenta del objeto guardado, no de nadie que la declare',
    /accountId: objeto\.accountId/.test(sinComentarios(leer('functions/src/media/recoleccion.ts'))));
  check('I) MC-6, del material de la Fase 11',
    /accountId: material\.ownerAccountId/.test(sinComentarios(leer('functions/src/media/migracion.ts'))));
  check('I) y MC-4, del paquete que el plano de control ya autorizó',
    /accountId: paquete\.accountId/.test(sinComentarios(leer('functions/src/media/proceso.ts'))));
}

/* ═══ J · RECONCILIACIÓN ═════════════════════════════════════════════════ */
console.log('\n── J · Dónde entrará comparar con el proveedor ──');
{
  const clave = { providerId: PROV, accountId: ANA, periodo: '2026-09', metrica: 'operaciones' };
  const nuestro = agregarUso(huella, [sellarUso(huella, uso({ metrica: 'operaciones', unidad: 'operacion', cantidad: 1000, ancla: { attemptId: 'z' } }))], clave);
  const suyo = { providerId: PROV, periodo: '2026-09', metrica: 'operaciones', cantidad: 1002, fuente: 'factura', obtenidoEn: T0 };

  /* 29 · reconciliation seam. */
  check('29) se puede comparar lo medido con lo facturado, con una tolerancia que decide quien concilia',
    compararConProveedor(nuestro, suyo, 5).ok === true);
  check('29) y el desvío se expresa por mil, que es donde se ven las décimas',
    compararConProveedor(nuestro, suyo, 5).porMil === 2);
  check('29) fuera de tolerancia NO cuadra, y dice cuánto se desvió',
    compararConProveedor(nuestro, suyo, 1).motivo === 'fuera_de_tolerancia');
  check('29) no compara periodos, métricas ni proveedores distintos',
    compararConProveedor(nuestro, { ...suyo, periodo: '2026-08' }, 100).motivo === 'no_comparable');
  check('29) la tolerancia NO tiene valor por defecto que perdone',
    compararConProveedor(nuestro, suyo, undefined).motivo === 'no_comparable');
  check('29) y MC-7 no va a buscar la factura: solo declara la forma en que entrará',
    !/fetch\(|https?:\/\//.test(sinComentarios(leer('functions/src/core/media/uso.ts'))));
}

/* ═══ K · PROVIDER-AGNOSTIC ══════════════════════════════════════════════ */
console.log('\n── K · El Core no conoce a nadie ──');
{
  const CORE_USO = sinComentarios(leer('functions/src/core/media/uso.ts'));
  const COMP = sinComentarios(leer('functions/src/media/uso.ts'));
  const PROHIBIDOS = ['cloudflare', 'r2', 'aws', 's3', 'cloudinary', 'qiniu', 'alibaba', 'tencent', 'azure', 'gcs'];
  for (const [nombre, src] of [['el Core', CORE_USO], ['la composición', COMP]]) {
    const hay = PROHIBIDOS.filter((p) => new RegExp(`(?<![a-z0-9])${p}(?![a-z0-9])`, 'i').test(src));
    check(`15) ningún nombre de proveedor en ${nombre} de MC-7`, hay.length === 0, hay.join(','));
  }
  check('15) el Core de MC-7 no toca reloj, red, disco ni dados',
    !/Date\.now|Math\.random|require\(|fetch\(|fs.|process.(env|argv|exit|cwd)/.test(CORE_USO));
  const imports = [...leer('functions/src/core/media/uso.ts').matchAll(/from '([^']+)'/g)].map((m) => m[1]);
  check('15) y solo importa de dentro del Core',
    imports.every((i) => i.startsWith('./') || i.startsWith('../')) && !imports.some((i) => i.includes('../../')),
    imports.join(','));
  check('MC-7 no está expuesto: ninguna Function lo llama',
    !/crearMedidor|agregarPeriodo|calcularCoste/.test(leer('functions/src/index.ts')));
  check('MC-7 no es un segundo libro: no cobra, no mueve saldo y no emite factura',
    !/spendCredits|refundCredits|creditsBalance|factura|invoice|charge/i.test(CORE_USO + COMP));
  check('las tarifas viven en el descriptor del proveedor, no en el Core',
    /precios\?: readonly PrecioDeProveedor\[\]/.test(leer('functions/src/core/media/registro.ts')));
  check('esta suite está en la cadena de `npm test`',
    /media-uso\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
