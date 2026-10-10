/*
 * ACTIVOS · CONCURRENCIA 2 DE 4 — ESCENARIOS D, E Y F.
 *
 * Partición de `activos-concurrencia.emulator.mjs` (HEAD 4a0b36f), que tardaba entre 371 y 387 s según la pasada y el corredor de emuladores corta
 * a los 300 s. Las rondas, las aserciones y los nombres son los de HEAD; el estado común vive en `_concurrencia-comun.mjs`.
 *
 *   D · dos barridos sobre el mismo candidato, a la vez: D1.
 *   E · dos variantes a la vez (A4), con la flag abierta y con la flag cerrada: E1 y E2.
 *   F · repetir cada operación deja el mismo estado: F1, F2 y F3.
 *
 * Por qué juntos: son las operaciones de cierre (D), de anotación (E) y de reintento (F) sobre el mismo objeto; juntas
 * caben holgadas en el límite (ver el tiempo). E es la única sección que cierra y reabre la flag durante la ejecución: la cierra para E2 y la vuelve a abrir con su margen, así que
 * F corre con la flag abierta, como en HEAD. Se ejecuta solo: abre la flag y espera el margen él mismo.
 *
 * Tiempo: 91.8 s de reloj de la suite (104.7 s de pared, con el arranque y el cierre de los emuladores), 6 comprobaciones ✔. Límite de la CI: 300 s.
 *
 *   firebase emulators:exec --only firestore,storage --project demo-wee "node functions/test/activos-concurrencia-2-def.emulator.mjs"
 */

import {
  abrirAlmacenParaAna,
  ANA,
  anterior,
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
  indice,
  objRef,
  registro,
  reloj,
  RUN,
  subir,
  urlDe,
  versiones,
} from './_concurrencia-comun.mjs';

await abrirAlmacenParaAna();

/* ═══ D · DOS RECLAMACIONES SOBRE EL MISMO CANDIDATO ═════════════════════════ */
console.log('\n── D · Dos barridos sobre el mismo candidato ──', reloj());
{
  const rondas = 12;
  const malas = await enTandas(rondas, async () => {
    const c = clave(); await subir(c);
    const m = await crear(c);
    /* Retirada con los consumidores de producción: queda candidato, con su cobertura. */
    await content.retirarMaterial(ANA, m.assetId);
    const pol = core.POLITICA_DEL_BORRADO_INMEDIATO;
    const [a, b] = await Promise.all([indice.completarBorrado(deps(), objRef(c), ANA, pol), indice.completarBorrado(deps(), objRef(c), ANA, pol)]);
    const borrados = [a, b].filter((x) => x.estado === 'borrado' || x.estado === 'ya_no_estaba').length;
    return borrados !== 1 || (await existe(c)) || (await registro(c))?.estado !== 'borrado';
  });
  const mal = malas.filter(Boolean).length;
  check(`D1 ${rondas} rondas: exactamente un borrado y un cierre por objeto`, mal === 0, `rondas mal: ${mal}`);
}

/* ═══ E · DOS VARIANTES A LA VEZ ═════════════════════════════════════════════ */
console.log('\n── E · Dos variantes a la vez (A4) ──', reloj());
for (const conFlag of [true, false]) {
  if (!conFlag) await db.collection('aiSettings').doc('almacenActivos').delete();
  const rondas = 15;
  const perdidasPorRonda = await enTandas(rondas, async () => {
    const c = clave(); await subir(c);
    const m = await crear(c);
    const t = clave(); const p = clave();
    if (conFlag) { await subir(t); await subir(p); }
    await Promise.all([
      content.anotarVariante(ANA, m.assetId, { kind: 'thumbnail', storageRef: { provider: 'wee', bucket: BUCKET, objectKey: t } }),
      content.anotarVariante(ANA, m.assetId, { kind: 'poster', storageRef: { provider: 'wee', bucket: BUCKET, objectKey: p } }),
    ]);
    const kinds = ((await ficha(m.assetId)).variants ?? []).map((v) => v.kind).sort().join(',');
    return kinds !== 'poster,thumbnail';
  });
  const perdidas = perdidasPorRonda.filter(Boolean).length;
  check(`E${conFlag ? 1 : 2} ${rondas} rondas de dos anotaciones a la vez (${conFlag ? 'flag abierta' : 'flag cerrada'}): ninguna variante perdida`, perdidas === 0, `perdidas: ${perdidas}`);
  if (!conFlag) {
    await db.collection('aiSettings').doc('almacenActivos').set({ habilitado: true, cuentas: [ANA], coberturaDesde: 0 });
    await esperar(core.MARGEN_DE_RELOJ_DE_COBERTURA_MS + 1500);
  }
}

/* ═══ F · REINTENTOS IDEMPOTENTES ═══════════════════════════════════════════ */
console.log('\n── F · Repetir no cambia nada ──', reloj());
{
  const proyectar = async (c, ids) => JSON.stringify({
    fichas: await Promise.all(ids.map(async (id) => { const f = await ficha(id); return f ? [f.status, f.previousVersionId ?? null, (f.variants ?? []).length] : null; })),
    filas: (await db.collection('mediaObjects').doc(objRef(c)).collection('referencias').limit(20).get()).docs.map((d) => [d.id, d.data().viva]).sort(),
    estado: (await registro(c))?.estado ?? null,
  });
  const id = `asset_${RUN.padStart(32, '0').slice(-32).replace(/[^a-f0-9]/g, 'a')}`;
  const c = clave(); await subir(c);
  await crear(c, { assetId: id });
  const tras1 = await proyectar(c, [id]);
  await crear(c, { assetId: id }); await crear(c, { assetId: id });
  check('F1 crear tres veces con la misma identidad: el mismo estado', (await proyectar(c, [id])) === tras1);
  const ant = await anterior();
  const cv = clave(); await subir(cv);
  const v1 = await versiones.crearVersionDeMaterial(ANA, { anteriorId: ant, url: urlDe(cv) });
  const trasV = await proyectar(cv, [v1.asset.assetId]);
  await versiones.crearVersionDeMaterial(ANA, { anteriorId: ant, url: urlDe(cv) });
  await versiones.crearVersionDeMaterial(ANA, { anteriorId: ant, url: urlDe(cv) });
  check('F2 la misma versión tres veces: el mismo estado', (await proyectar(cv, [v1.asset.assetId])) === trasV);
  await indice.retirarConIndice(deps(), ANA, id);
  const trasR = await proyectar(c, [id]);
  await indice.retirarConIndice(deps(), ANA, id); await indice.retirarConIndice(deps(), ANA, id);
  check('F3 retirar tres veces: el mismo estado (ya_retirado)', (await proyectar(c, [id])) === trasR && !(await existe(c)));
}

cerrar();
