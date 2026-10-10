/*
 * ACTIVOS · CONCURRENCIA 3 DE 4 — ESCENARIO G (EL CONTROL).
 *
 * Partición de `activos-concurrencia.emulator.mjs` (HEAD 4a0b36f), que tardaba entre 371 y 387 s según la pasada y el corredor de emuladores corta
 * a los 300 s. Las rondas, las aserciones y los nombres son los de HEAD; el estado común vive en `_concurrencia-comun.mjs`.
 *
 *   G · el control: la misma carrera SIN transacción pierde (G1 y G3), y CON el código de verdad no (G2 y G4).
 *
 * Por qué aparte: G es la sección más larga (104 s de reloj en la referencia de HEAD) y la que demuestra que la prueba
 * muerde. Con H en el mismo proceso, el grupo G-H sumaba unos 211 s de reloj de la suite (el 70 % del límite de 300 s,
 * sin margen si el runner de la CI va más lento). G no deja nada que H necesite.
 * Se ejecuta solo: abre la flag y espera el margen de cobertura él mismo.
 *
 * Tiempo: 114.8 s de reloj de la suite (129.0 s de pared, con el arranque y el cierre de los emuladores), 4 comprobaciones ✔. Límite de la CI: 300 s.
 *
 *   firebase emulators:exec --only firestore,storage --project demo-wee "node functions/test/activos-concurrencia-3-g.emulator.mjs"
 */

import {
  abrirAlmacenParaAna,
  ANA,
  bucket,
  BUCKET,
  cerrar,
  check,
  clave,
  content,
  core,
  crear,
  db,
  deps,
  enTandas,
  esperar,
  existe,
  ficha,
  filasVivas,
  indice,
  objRef,
  registro,
  reloj,
  RUN,
  subir,
} from './_concurrencia-comun.mjs';

await abrirAlmacenParaAna();

/* ═══ G · CONTROL: SIN TRANSACCIÓN, LA MISMA CARRERA FALLA ═══════════════════ */
console.log('\n── G · El control: la misma carrera sin transacción (experimento C) ──', reloj());
{
  const rondas = 60;
  /* G1 · anotar dos variantes leyendo, esperando y escribiendo el array leído: lo que hacía anotarVariante. */
  const sinTransaccion = async (id, kind, ms) => {
    const ref = db.collection('assets').doc(id);
    const s = await ref.get();
    await esperar(ms);
    const variants = [...(s.data().variants ?? []).filter((v) => v.kind !== kind), { kind, storageRef: { provider: 'wee', bucket: BUCKET, objectKey: `users/${ANA}/x/${kind}` } }];
    await ref.set({ variants }, { merge: true });
  };
  const porRonda = await enTandas(rondas, async (i) => {
    const c = clave(); await subir(c);
    const m = await crear(c);
    await Promise.all([sinTransaccion(m.assetId, 'thumbnail', 15), sinTransaccion(m.assetId, 'poster', 0)]);
    const sin = ((await ficha(m.assetId)).variants ?? []).length !== 2;
    const m2 = await crear(c);
    await Promise.all([
      content.anotarVariante(ANA, m2.assetId, { kind: 'thumbnail', storageRef: { provider: 'wee', bucket: BUCKET, objectKey: `users/${ANA}/x/t${i}` } }),
      content.anotarVariante(ANA, m2.assetId, { kind: 'poster', storageRef: { provider: 'wee', bucket: BUCKET, objectKey: `users/${ANA}/x/p${i}` } }),
    ]);
    return { sin, con: ((await ficha(m2.assetId)).variants ?? []).length !== 2 };
  });
  const perdidasSin = porRonda.filter((x) => x.sin).length;
  const perdidasCon = porRonda.filter((x) => x.con).length;
  check(`G1 SIN transacción se pierden variantes (la prueba muerde): ${perdidasSin}/${rondas}`, perdidasSin > 0);
  check(`G2 CON la transacción de verdad: 0/${rondas} perdidas`, perdidasCon === 0, `perdidas: ${perdidasCon}`);

  /* G3 · reclamar y crear una fila viva sobre el mismo objeto, sin transacción: el patrón del experimento C. */
  const rondasG3 = 60;
  const violadas = await enTandas(rondasG3, async (i) => {
    const ref = db.collection('pruebaCerrojo').doc(`${RUN}-${i}`);
    await ref.set({ estado: 'candidato', vivas: 0 });
    const crearFila = (async () => { const s = await ref.get(); if (s.data().estado !== 'guardado' && s.data().estado !== 'candidato') return; await esperar(Math.random() * 3); await ref.update({ estado: 'guardado', vivas: s.data().vivas + 1 }); })();
    const reclamarSin = (async () => { const s = await ref.get(); if (s.data().estado !== 'candidato' || s.data().vivas > 0) return; await esperar(Math.random() * 3); await ref.update({ estado: 'borrando' }); })();
    await Promise.all([crearFila, reclamarSin]);
    const fin = (await ref.get()).data();
    return fin.estado === 'borrando' && fin.vivas > 0;
  });
  const violacionesSin = violadas.filter(Boolean).length;
  check(`G3 SIN transacción, reclamar y crear una fila a la vez deja «borrando con fila viva»: ${violacionesSin}/${rondasG3}`, violacionesSin > 0);
  /* G4 · lo mismo con el código de verdad (transaccional): ficha nueva sobre un candidato frente a su reclamación. */
  const rondasG4 = 15;
  const violacionesPorRonda = await enTandas(rondasG4, async () => {
    const c = clave(); await subir(c);
    const m = await crear(c);
    await content.retirarMaterial(ANA, m.assetId);
    const [nueva] = await Promise.all([crear(c), indice.completarBorrado(deps(), objRef(c), ANA, core.POLITICA_DEL_BORRADO_INMEDIATO)]);
    const reg = await registro(c);
    const vivasHay = await filasVivas(c);
    let violaciones = 0;
    if (vivasHay > 0 && (reg.estado === 'borrando' || reg.estado === 'borrado')) violaciones++;
    if (nueva && !(await existe(c))) violaciones++;
    return violaciones;
  });
  const violacionesCon = violacionesPorRonda.reduce((s, x) => s + x, 0);
  check(`G4 ${rondasG4} rondas CON el código de verdad: 0 «borrando con fila viva» y 0 fichas vivas sin bytes`, violacionesCon === 0, `violaciones: ${violacionesCon}`);
}

cerrar();
