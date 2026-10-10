/*
 * H5/H2 · MC-5 CONECTADO: EL BARRIDO DEL ÍNDICE, CON EL CERROJO (`media/barrido.ts` sobre `media/recoleccion.ts`).
 *
 * El barrido de MC-5 de siempre, con las dependencias de producción del índice salvo dos inyectadas: Firestore (la
 * transaccional de mentira de `_activos-falsos.mjs`) y un almacén falso CON GENERACIÓN que registra las precondiciones
 * que recibe. La tarea programada se llama directamente (`crearBarridoDeActivos(...).run`): no se exporta ni se
 * programa en ningún sitio.
 *
 *   A · Borra solo lo reclamado, con la generación registrada, y cierra con la concesión propia.
 *   B · Lo que protege: fila viva, una fila que aparece justo antes de reclamar (T-03), 412, fallo pasajero,
 *       concesión vigente, adaptador sin precondición, consumidores de producción y claves `users/` (D-C).
 *   C · Dos barridos a la vez sobre el mismo objeto: una reclamación, un borrado.
 *   D · Flag cerrada: no mira nada.
 *
 * `WEE_LIB_ACTIVOS` permite correrlo contra una COPIA del compilado (mutaciones).
 */
import { crearFirestoreFalsa, crearPuertoConGeneracion, crearStorageFalso, enchufar, requerir, LIB } from './_activos-falsos.mjs';

const LIBDIR = process.env.WEE_LIB_ACTIVOS || LIB;
let n = 0;
let fallos = 0;
const check = (nombre, cond, extra = '') => {
  n++;
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${n}) ${nombre}${extra ? ` — ${extra}` : ''}`);
};

const F = crearFirestoreFalsa();
const S = crearStorageFalso();
const deshacer = enchufar(LIBDIR, F, S);
const core = requerir(LIBDIR, 'core/index.js');
const indice = requerir(LIBDIR, 'content/indice.js');
const barrido = requerir(LIBDIR, 'media/barrido.js');

const ANA = 'uAna';
const AHORA = Date.now();
const DIA = 24 * 60 * 60 * 1000;
const P = crearPuertoConGeneracion('fake');
let seq = 0;

const abrirFlag = () => {
  const reloj = Date.now;
  F.fijarReloj(() => reloj() - 60_000);
  F.poner('aiSettings/almacenActivos', { habilitado: true, cuentas: [ANA], coberturaDesde: 0 });
  F.fijarReloj(reloj);
};

/* Un objeto de Media Cloud en el cerrojo, con su fila (apagada por defecto) y sus bytes en el almacén falso. */
const sembrar = (o = {}) => {
  const assetId = `asset_${(++seq).toString(16).padStart(32, '0')}`;
  const objectKey = o.objectKey ?? `accounts/${o.cuenta ?? ANA}/assets/${assetId}/original`;
  const providerId = o.providerId ?? 'fake';
  const generacion = o.sinBytes ? '7' : P.poner(objectKey);
  const ref = { provider: providerId, objectKey };
  const objectRef = core.referenciaDelObjeto(indice.huellaDelIndice, ref);
  const registro = {
    objectRef, providerId, accountId: o.cuenta ?? ANA, assetId, pieza: 'original', objectKey,
    estado: 'candidato', candidatoDesde: AHORA - 10 * DIA, createdAt: AHORA - 30 * DIA, updatedAt: AHORA - 10 * DIA,
    version: 1, generacion: o.generacion ?? generacion, cobertura: 'completa', coberturaEn: AHORA, ...(o.extra ?? {}),
  };
  F.poner(`mediaObjects/${objectRef}`, registro);
  const refId = `material_${assetId}_original`;
  F.poner(`mediaObjects/${objectRef}/referencias/${refId}`, {
    refId, clase: 'material', assetId, pieza: 'original', viva: o.viva === true, ownerAccountId: o.cuenta ?? ANA, objectRef, desdeAt: AHORA - 30 * DIA, actualizadoAt: AHORA - 10 * DIA,
  });
  return { objectRef, objectKey, assetId, generacion: registro.generacion };
};
const registro = (x) => F.leer(`mediaObjects/${x.objectRef}`);
const opciones = (extra = {}) => ({
  db: F.db,
  almacenes: { fake: P.puerto },
  consumidores: async () => ({ estado: 'sin_usos' }),
  operaciones: async () => [],
  politica: { ...core.POLITICA_DEL_BARRIDO_DEL_INDICE, graciaDeCandidatoMs: 0 },
  ...extra,
});
const vaciarCerrojo = () => { for (const r of F.rutas('mediaObjects/')) F.quitar(r); };

try {
  abrirFlag();

  /* ═══ A · BORRA LO RECLAMADO, CON LA GENERACIÓN REGISTRADA ═══════════════ */
  console.log('\n── A · El barrido borra con cerrojo y precondición ──');
  {
    const x = sembrar();
    const tarea = barrido.crearBarridoDeActivos(() => opciones());
    await tarea.run({});
    const pre = P.llamadas.borrar.at(-1);
    check('A1 la tarea programada, llamada directamente, borra el candidato', !P.objetos.has(x.objectKey) && registro(x).estado === 'borrado');
    check('A2 con la generación registrada como precondición (INV-5)', pre?.clave === x.objectKey && pre?.generacion === x.generacion);
    check('A3 y el cierre es con la concesión propia: sin concesión colgando', registro(x).concesion === undefined && Number.isFinite(registro(x).deletedAt));
    const otra = await barrido.pasarBarridoDeActivos(opciones());
    check('A4 repetir converge: lo borrado no se vuelve a pedir', P.llamadas.borrar.filter((b) => b.clave === x.objectKey).length === 1 && otra.every((i) => i.borrados === 0));
    const ya = sembrar({ sinBytes: true });
    P.objetos.delete(ya.objectKey);
    const r = await barrido.pasarBarridoDeActivos(opciones());
    check('A5 lo que el proveedor ya no tiene (404) se cierra igual: convergencia', registro(ya).estado === 'borrado' && r.some((i) => i.yaNoEstaban === 1));
  }

  /* ═══ B · LO QUE PROTEGE ═════════════════════════════════════════════════ */
  console.log('\n── B · Ante la duda, se protege ──');
  {
    vaciarCerrojo();
    const viva = sembrar({ viva: true });
    const r = await barrido.pasarBarridoDeActivos(opciones());
    check('B1 con una fila viva no se reclama ni se borra', P.objetos.has(viva.objectKey) && registro(viva).estado === 'candidato' && r[0].porMotivo.referenciado === 1);

    vaciarCerrojo();
    const t03 = sembrar();
    /* T-03: la fila viva aparece entre la primera decisión y la reclamación. */
    const pausa = F.pausar((q) => q.tipo === 'doc' && q.ruta === 'aiSettings/almacenActivos' && q.enTransaccion);
    const pr = barrido.pasarBarridoDeActivos(opciones());
    const llego = await Promise.race([pausa.llego.then(() => true), new Promise((r) => setTimeout(() => r(false), 5000))]);
    if (!llego) throw new Error('la pausa no llegó: la reclamación no leyó la flag dentro de su transacción');
    const refId = `variante_${t03.assetId}_poster`;
    F.poner(`mediaObjects/${t03.objectRef}/referencias/${refId}`, { refId, clase: 'variante', assetId: t03.assetId, pieza: 'poster', viva: true, ownerAccountId: ANA, objectRef: t03.objectRef, desdeAt: AHORA, actualizadoAt: AHORA });
    pausa.soltar();
    const rt = await pr;
    check('B2 T-03: una fila viva que llega justo antes de reclamar impide el borrado (la reclamación lee dentro)', P.objetos.has(t03.objectKey)
      && registro(t03).estado === 'candidato' && rt[0].porMotivo.referenciado === 1, JSON.stringify(rt[0].porMotivo));

    vaciarCerrojo();
    const g412 = sembrar();
    P.poner(g412.objectKey); // bytes nuevos en la misma clave
    const r412 = await barrido.pasarBarridoDeActivos(opciones());
    check('B3 412: no se borra, vuelve a candidato con `generacion_distinta`, sin contar intento', P.objetos.has(g412.objectKey) && registro(g412).estado === 'candidato'
      && registro(g412).pendiente?.motivo === 'generacion_distinta' && registro(g412).intentosDeBorrado === undefined && r412[0].porMotivo.generacion_distinta === 1);

    vaciarCerrojo();
    const pasajero = sembrar();
    P.fallarUnaVez('proveedor_no_disponible');
    const rp = await barrido.pasarBarridoDeActivos(opciones());
    check('B4 fallo pasajero: candidato, intento contado y motivo; se informa como error reintentable', P.objetos.has(pasajero.objectKey) && registro(pasajero).estado === 'candidato'
      && registro(pasajero).intentosDeBorrado === 1 && rp[0].errores === 1 && rp[0].reintentables === 1);
    const rp2 = await barrido.pasarBarridoDeActivos(opciones());
    check('B5 y dentro de la hora no se reintenta (esperando_reintento de MC-5)', P.objetos.has(pasajero.objectKey) && rp2[0].porMotivo.esperando_reintento === 1);

    vaciarCerrojo();
    const vigente = sembrar({ extra: { estado: 'borrando', concesion: { id: 'otro', hasta: AHORA + 3_600_000 } } });
    const caducada = sembrar({ extra: { estado: 'borrando', concesion: { id: 'otro', hasta: AHORA - 1 } } });
    const rc = await barrido.pasarBarridoDeActivos(opciones());
    check('B6 un borrando con concesión vigente no se toca; uno caducado se revalida, se reclama y se borra', P.objetos.has(vigente.objectKey)
      && registro(vigente).concesion.id === 'otro' && !P.objetos.has(caducada.objectKey) && registro(caducada).estado === 'borrado', JSON.stringify(rc.map((i) => i.porMotivo)));

    vaciarCerrojo();
    const sinCond = sembrar();
    const sinCondicional = crearPuertoConGeneracion('fake', { sinCondicional: true });
    sinCondicional.objetos.set(sinCond.objectKey, sinCond.generacion);
    await barrido.pasarBarridoDeActivos(opciones({ almacenes: { fake: sinCondicional.puerto } }));
    check('B7 un adaptador que no sabe borrar con generación no recibe el borrado; lo reclamado vuelve a candidato',
      sinCondicional.llamadas.borrar.length === 0 && registro(sinCond).estado === 'candidato' && registro(sinCond).pendiente?.motivo === 'precondicion_no_soportada');

    vaciarCerrojo();
    const prod = sembrar();
    const llamadasAntes = P.llamadas.borrar.length;
    const rprod = await barrido.pasarBarridoDeActivos(opciones({ consumidores: undefined, operaciones: undefined }));
    check('B8 con las operaciones de producción («no hay fuente clara»): protegido antes de reclamar, sin escribir nada', P.objetos.has(prod.objectKey)
      && registro(prod).estado === 'candidato' && rprod[0].porMotivo.operaciones_inciertas === 1 && P.llamadas.borrar.length === llamadasAntes);
    const rcons = await barrido.pasarBarridoDeActivos(opciones({ consumidores: undefined }));
    check('B8b con operaciones ciertas y los consumidores de producción: la reclamación protege y anota consumidores_no_verificados (D-G)', P.objetos.has(prod.objectKey)
      && registro(prod).estado === 'candidato' && registro(prod).pendiente?.motivo === 'consumidores_no_verificados' && rcons[0].porMotivo.consumidores_no_verificados === 1);

    vaciarCerrojo();
    const antes = P.llamadas.borrar.length;
    const deUsuarios = sembrar({ providerId: 'wee', objectKey: `users/${ANA}/ai-generations/1.png`, sinBytes: true });
    const ru = await barrido.pasarBarridoDeActivos(opciones({ almacenes: { fake: P.puerto, wee: P.puerto } }));
    check('B9 D-C: una clave users/ no se barre (MC-5 la protege como fuera_de_su_cuenta y no llama al almacén)', P.llamadas.borrar.length === antes
      && registro(deUsuarios).estado === 'candidato' && ru[0].porMotivo.fuera_de_su_cuenta === 1);
  }

  /* ═══ C · DOS BARRIDOS A LA VEZ ═════════════════════════════════════════ */
  console.log('\n── C · Dos barridos sobre el mismo objeto ──');
  {
    vaciarCerrojo();
    const x = sembrar();
    const antes = P.llamadas.borrar.length;
    const [a, b] = await Promise.all([barrido.pasarBarridoDeActivos(opciones()), barrido.pasarBarridoDeActivos(opciones())]);
    const borrados = [...a, ...b].reduce((s, i) => s + i.borrados + i.yaNoEstaban, 0);
    check('C1 una sola reclamación y un solo borrado', P.llamadas.borrar.length - antes === 1 && borrados === 1 && registro(x).estado === 'borrado',
      `borrar=${P.llamadas.borrar.length - antes} borrados=${borrados} reintentos=${F.contador.reintentos}`);
  }

  /* ═══ D · FLAG CERRADA ═══════════════════════════════════════════════════ */
  console.log('\n── D · Con la flag cerrada no hay barrido del índice ──');
  {
    vaciarCerrojo();
    const x = sembrar();
    F.quitar('aiSettings/almacenActivos');
    const antes = P.llamadas.borrar.length;
    const r = await barrido.pasarBarridoDeActivos(opciones());
    check('D1 no mira nada y lo dice', P.llamadas.borrar.length === antes && P.objetos.has(x.objectKey) && r.length === 1 && r[0].porMotivo.flag_cerrada === 1);
    check('D2 la tarea queda preparada como función programada, sin exportar (su `run` es el manejador)', typeof barrido.barridoDeActivos?.run === 'function');
  }
} catch (error) {
  /* Una suite que se interrumpe es un fallo con su motivo, no un cuelgue ni un rastro suelto. */
  fallos++;
  console.log(`✘ ${++n}) la suite se interrumpió: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  deshacer();
}

console.log(fallos ? `\n✘ ${fallos} fallo(s) de ${n}` : `\n✔ todo bien (${n} comprobaciones)`);
process.exit(fallos ? 1 : 0);
