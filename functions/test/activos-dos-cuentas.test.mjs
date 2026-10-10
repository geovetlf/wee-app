/*
 * A-2 · DOS CUENTAS Y UNA MISMA CLAVE FÍSICA DE STORAGE (revisión del 10 de octubre, ruta con índice).
 *
 * LA PREGUNTA: ¿puede una clave del Storage de Weë estar referenciada por dos cuentas? No se presupone que no.
 *
 * LO QUE SE PRUEBA, con el código compilado de `content/` y `core/` sobre los falsos de `_activos-falsos.mjs`:
 *
 *   I   · Invariante de creación: ninguna ruta de creación (desde URL, para subida, versión, variante) deja a una cuenta
 *         apuntar a un objeto que vive bajo `users/<otra cuenta>/`. Una dirección ajena no crea ficha, ni versión, ni variante.
 *   II  · Estados CONTRADICTORIOS (una ficha viva de la cuenta A sobre un objeto de B, que no debería existir): la retirada
 *         de B no lo borra; el borrado MC-5 tampoco; y la reconciliación de B no lo clasifica como huérfano.
 *   III · Las marcas pendientes de OTRAS cuentas no se tocan cuando el objeto desaparece por la cuenta dueña.
 *   IV  · Idempotencia: repetir la retirada no borra ni cambia nada.
 *
 * Qué NO prueba este fichero: la concurrencia real (transacciones de Firestore con emulador), que va en
 * `activos-concurrencia.emulator.mjs`, ni las rutas de Cloudinary, que se documentan en la revisión.
 *
 * Necesita `functions/lib` recién compilado: `npm run build` antes.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearFirestoreFalsa, crearStorageFalso, enchufar, requerir, LIB } from './_activos-falsos.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
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
const content = requerir(LIBDIR, 'content/index.js');
const versiones = requerir(LIBDIR, 'content/versiones.js');
const indice = requerir(LIBDIR, 'content/indice.js');
const recon = requerir(LIBDIR, 'content/indice-reconciliacion.js');
const core = requerir(LIBDIR, 'core/index.js');

const ANA = 'uAna';
const BETO = 'uBeto';
const BUCKET = S.bucket.name;
const RUN = Date.now().toString(36);
let k = 0;
const clave = (cuenta = ANA, ext = 'png') => `users/${cuenta}/uploads/${RUN}-${++k}.${ext}`;
const urlDe = (c) => `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(c)}?alt=media&token=tok-${RUN}`;
const refWee = (c) => ({ provider: 'wee', bucket: BUCKET, objectKey: c });
const objRef = (c) => core.referenciaDelObjeto(indice.huellaDelIndice, refWee(c));
const registroDe = (c) => F.leer(`mediaObjects/${objRef(c)}`);
const ficha = (id) => F.leer(`assets/${id}`);
const idDe = (letra) => `asset_${letra.repeat(32)}`;

/* La flag abierta para las dos cuentas, escrita «hace un minuto» para que lo nuevo quede cubierto desde el nacimiento. */
const abrirFlag = (cuentas) => {
  const reloj = Date.now;
  F.fijarReloj(() => reloj() - 60_000);
  F.poner('aiSettings/almacenActivos', { habilitado: true, cuentas, coberturaDesde: 0 });
  F.fijarReloj(reloj);
};
const crear = async (cuenta, c, extra = {}) => content.crearMaterialDesdeUrl({
  ownerAccountId: cuenta, url: urlDe(c), kind: 'image', mimeType: 'image/png', provenance: { createdAt: 1 }, ...extra,
});

let concesiones = 0;
/** Consumidores y operaciones CIERTOS (sin uso de producción): la única protección que queda es la del índice. */
const depsCiertos = (extra = {}) => ({
  db: F.db,
  huella: indice.huellaDelIndice,
  indexable: content.entraEnElIndice,
  almacenes: { wee: indice.puertoDelStorageDeWee('wee') },
  consumidores: async () => ({ estado: 'sin_usos' }),
  operaciones: async () => [],
  ahora: Date.now,
  sortear: () => `c${RUN}${++concesiones}`,
  ...extra,
});

/** Una ficha viva de `dueña` que apunta a `c`, sin fila en el índice: el estado heredado que deja el camino de siempre. */
const fichaVivaSin = (id, dueña, c) => F.poner(`assets/${id}`, {
  assetId: id, ownerAccountId: dueña, status: 'ready', kind: 'image', storageRef: refWee(c),
  provenance: { createdAt: 1 }, contract: '1.0', createdAt: 1, updatedAt: 1,
});

try {
  abrirFlag([ANA, BETO]);

  /* ═══ I · INVARIANTE EN LAS CREACIONES ═══════════════════════════════════════ */
  console.log('\n── I · Una cuenta no apunta a un objeto de otra, en ninguna creación ──');
  {
    const kA = clave(ANA);
    S.subir(kA);
    const miA = await crear(ANA, kA);
    const kB = clave(BETO);
    S.subir(kB);

    const desdeUrl = await crear(ANA, kB);
    check('I1 crearMaterialDesdeUrl: A no crea una ficha sobre un objeto de B', desdeUrl === null, desdeUrl ? `creada ${desdeUrl.assetId}` : 'null');

    const paraSubida = await content.crearMaterialParaSubida({
      assetId: idDe('b'), ownerAccountId: ANA, storageRef: refWee(kB), kind: 'image', mimeType: 'image/png', provenance: { createdAt: 1 },
    });
    check('I2 crearMaterialParaSubida: A no crea una ficha con la clave de B', paraSubida.status === 'invalido', paraSubida.status);

    const version = await versiones.crearVersionDeMaterial(ANA, { anteriorId: miA.assetId, url: urlDe(kB) });
    check('I3 crearVersionDeMaterial: A no versiona con un archivo de B', version.status === 'archivo_ajeno', version.status);

    const anotadas = await content.anotarVariantesDelResultado(ANA, miA.assetId, [{ kind: 'thumbnail', url: urlDe(kB), mimeType: 'image/png' }]);
    check('I4 anotarVariantesDelResultado: A no anota como variante un objeto de B', anotadas === 0, `anotadas: ${anotadas}`);

    const kB5 = clave(BETO);
    S.subir(kB5);
    const miB = await crear(BETO, kB5);
    const enDeB = await content.anotarVariantesDelResultado(ANA, miB.assetId, [{ kind: 'thumbnail', url: urlDe(kA), mimeType: 'image/png' }]);
    check('I5 anotarVariantesDelResultado: A no anota una variante en una creación de B', enDeB === 0, `anotadas: ${enDeB}`);
  }

  /* ═══ II · ESTADOS CONTRADICTORIOS: UNA FICHA VIVA DE A SOBRE UN OBJETO DE B ══ */
  console.log('\n── II · Una ficha viva de otra cuenta sobre el objeto de B (estado contradictorio) ──');
  {
    /* II1 · La retirada de B: su objeto no se borra mientras la ficha viva de A lo use. Es la regla de siempre. */
    const kB1 = clave(BETO);
    S.subir(kB1);
    const mB1 = await crear(BETO, kB1);
    fichaVivaSin(idDe('c'), ANA, kB1);
    const r1 = await indice.retirarConIndice(depsCiertos(), BETO, mB1.assetId);
    check('II1 retirar en B no borra un objeto que la ficha viva de A usa',
      r1.status === 'retirado' && S.existe(kB1) === true && r1.objetosBorrados === 0 && r1.pendientes >= 1,
      JSON.stringify([r1.status, r1.objetosBorrados, r1.pendientes]));

    /* II2 · El borrado MC-5 de ese objeto, con el objeto marcado como candidato (lo que dejaría una reconciliación). */
    const kB2 = clave(BETO);
    S.subir(kB2);
    const mB2 = await crear(BETO, kB2);
    fichaVivaSin(idDe('d'), ANA, kB2);
    await indice.retirarConIndice(depsCiertos(), BETO, mB2.assetId);
    const regB2 = registroDe(kB2);
    if (regB2) F.poner(`mediaObjects/${objRef(kB2)}`, { ...regB2, estado: 'candidato', candidatoDesde: 1 });
    const r2 = await indice.completarBorrado(depsCiertos(), objRef(kB2), BETO, core.POLITICA_DEL_BORRADO_INMEDIATO);
    check('II2 el borrado MC-5 no borra un objeto que la ficha viva de A usa, aunque no tenga fila',
      S.existe(kB2) === true, JSON.stringify(r2).slice(0, 160));

    /* II3 · La reconciliación de B no clasifica como huérfano su objeto mientras A tiene una ficha viva sobre él. */
    const kB3 = clave(BETO);
    S.subir(kB3);
    const mB3 = await crear(BETO, kB3);
    fichaVivaSin(idDe('e'), ANA, kB3);
    await indice.retirarConIndice(depsCiertos(), BETO, mB3.assetId);
    const inf = await recon.reconciliarIndiceDeCuentaEnFirestore(depsCiertos(), BETO, { graciaDeHuerfanoMs: 0 });
    const huerfano = (inf?.hallazgos ?? []).some((h) => h.clase === 'objeto_huerfano' && h.objectRef === objRef(kB3));
    check('II3 la reconciliación de B no clasifica como huérfano el objeto que A usa con una ficha viva',
      !huerfano, `hallazgos: ${JSON.stringify((inf?.hallazgos ?? []).map((h) => h.clase))}`);

    /* II4 · Referencias DESCONOCIDAS: hay tantas fichas vivas de A sobre la clave (26 ≥ 25) que no se pueden contar. Lo
     * desconocido nunca es ausencia de uso: el objeto de B no se clasifica como huérfano. */
    const kB4 = clave(BETO);
    S.subir(kB4);
    const mB4 = await crear(BETO, kB4);
    for (let i = 0; i < 26; i++) fichaVivaSin(`asset_${'9'.repeat(28)}${i.toString(16).padStart(4, '0')}`, ANA, kB4);
    await indice.retirarConIndice(depsCiertos(), BETO, mB4.assetId);
    const inf4 = await recon.reconciliarIndiceDeCuentaEnFirestore(depsCiertos(), BETO, { graciaDeHuerfanoMs: 0 });
    const huerfano4 = (inf4?.hallazgos ?? []).some((h) => h.clase === 'objeto_huerfano' && h.objectRef === objRef(kB4));
    check('II4 referencias ajenas desconocidas (demasiadas fichas para contarlas) no hacen huérfano el objeto',
      !huerfano4 && S.existe(kB4) === true, `hallazgos: ${JSON.stringify((inf4?.hallazgos ?? []).map((h) => h.clase))}`);
  }

  /* ═══ III · MARCAS DE OTRAS CUENTAS ═══════════════════════════════════════════ */
  console.log('\n── III · La marca pendiente de otra cuenta no se toca cuando la dueña borra el objeto ──');
  {
    const kE = clave(ANA);
    S.subir(kE);
    const mE = await crear(ANA, kE);
    const idFB = idDe('f');
    F.poner(`assets/${idFB}`, {
      assetId: idFB, ownerAccountId: BETO, status: 'deleted', pendingPhysicalDeletion: true, storageRef: refWee(kE),
      provenance: { createdAt: 1 }, contract: '1.0', createdAt: 1, updatedAt: 1,
    });
    /* Contradicción: la fila dice que la cuenta que borra es A, pero la ficha que la tiene es de B. La revisión de marcas
     * solo debe tocar las fichas de su dueña: si no, la marca pendiente de B desaparece aunque B no haya hecho nada. */
    F.poner(`mediaObjects/${objRef(kE)}/referencias/filaContradictoria`, {
      objectRef: objRef(kE), ref: refWee(kE), refId: 'filaContradictoria', clase: 'material', pieza: 'original',
      assetId: idFB, ownerAccountId: ANA, viva: false, desdeAt: 1, actualizadoAt: 1,
    });
    const rE = await indice.retirarConIndice(depsCiertos(), ANA, mE.assetId);
    check('III1 A borra su objeto; la ficha retirada de B sobre el mismo objeto conserva su marca pendiente',
      rE.status === 'retirado' && rE.objetosBorrados === 1 && S.existe(kE) === false && ficha(idFB)?.pendingPhysicalDeletion === true,
      JSON.stringify([rE.status, rE.objetosBorrados, ficha(idFB)?.pendingPhysicalDeletion]));
  }

  /* ═══ IV · IDEMPOTENCIA ═══════════════════════════════════════════════════════ */
  console.log('\n── IV · Repetir no cambia nada ──');
  {
    const kI = clave(ANA);
    S.subir(kI);
    const mI = await crear(ANA, kI);
    const primera = await indice.retirarConIndice(depsCiertos(), ANA, mI.assetId);
    const segunda = await indice.retirarConIndice(depsCiertos(), ANA, mI.assetId);
    check('IV1 repetir la retirada devuelve ya_retirado y no borra de nuevo',
      primera.status === 'retirado' && segunda.status === 'ya_retirado', `${primera.status} → ${segunda.status}`);
  }

  console.log(fallos ? `\n✘ ${fallos} fallo(s) de ${n}` : `\n✔ todo bien (${n} comprobaciones)`);
} finally {
  deshacer();
}
process.exitCode = fallos ? 1 : 0;
void here;
