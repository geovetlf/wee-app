/*
 * ACTIVOS · CONCURRENCIA 4 DE 4 — ESCENARIO H (LAS MARCAS DE SUBIDA FRENTE A LA RETIRADA, B2).
 *
 * Partición de `activos-concurrencia.emulator.mjs` (HEAD 4a0b36f), que tardaba entre 371 y 387 s según la pasada y el corredor de emuladores corta
 * a los 300 s. Las rondas, las aserciones y los nombres son los de HEAD; el estado común vive en `_concurrencia-comun.mjs`.
 *
 *   H · confirmar o fallar una subida a la vez que se retira, con la flag abierta y con la cerrada: carrera libre
 *       (H1, H2, H6, H7), intercalada entre la lectura y la confirmación de la marca (H3, H4, H8, H9) y el control que
 *       resucita fichas retiradas (H5, H10). H0 comprueba que la marca usa la misma instancia de Firestore.
 *
 * Por qué aparte: H es la otra sección larga (97 s de reloj en la referencia de HEAD). H cambia `db.runTransaction` solo mientras dura su carrera
 * intercalada y lo restaura en un `finally`; separada de G, ese cambio no comparte proceso con ningún otro escenario.
 * Se ejecuta solo: H comprueba la flag y, si no está abierta, la abre con su margen de cobertura (como en HEAD).
 *
 * Tiempo: 107.4 s de reloj de la suite (125.1 s de pared, con el arranque y el cierre de los emuladores), 11 comprobaciones ✔. Límite de la CI: 300 s.
 *
 *   firebase emulators:exec --only firestore,storage --project demo-wee "node functions/test/activos-concurrencia-4-h.emulator.mjs"
 */

import { randomBytes } from 'node:crypto';
import {
  abrirAlmacenParaAna,
  ANA,
  bucket,
  BUCKET,
  cerrar,
  check,
  clave,
  contar,
  content,
  core,
  db,
  enTandas,
  esperar,
  ficha,
  getFirestore,
  reloj,
  subir,
} from './_concurrencia-comun.mjs';

await abrirAlmacenParaAna();

/* ═══ H · B2: CONFIRMAR O FALLAR UNA SUBIDA A LA VEZ QUE SE RETIRA ═══════════ */
console.log('\n── H · Las marcas de subida frente a la retirada (B2) ──', reloj());
{
  const paraSubir = async () => {
    const c = clave();
    const id = `asset_${randomBytes(16).toString('hex')}`;
    const r = await content.crearMaterialParaSubida({ ownerAccountId: ANA, assetId: id, kind: 'image', storageRef: { provider: 'wee', bucket: BUCKET, objectKey: c }, provenance: { createdAt: 1 }, mimeType: 'image/png' });
    if (r.status !== 'creado') throw new Error(`no se pudo preparar la subida: ${r.status}`);
    await subir(c);
    return id;
  };
  const marcar = (marca, id) => (marca === 'subido'
    ? content.marcarMaterialSubido(ANA, id, { bytes: 1, mimeType: 'image/png' })
    : content.marcarMaterialFallido(ANA, id, 'caducado'));
  const vuelta = { subido: 'ready', fallido: 'failed' };
  const flag = db.collection('aiSettings').doc('almacenActivos');
  /* La flag viene ABIERTA de E (F y G no la tocan): se comprueba, y solo se reescribe —con su espera de cobertura— si no. */
  const abierta = await flag.get();
  if (!(abierta.exists && abierta.data().habilitado === true && (abierta.data().cuentas ?? []).includes(ANA))) {
    await flag.set({ habilitado: true, cuentas: [ANA], coberturaDesde: 0 });
    await esperar(core.MARGEN_DE_RELOJ_DE_COBERTURA_MS + 1500);
  }
  const original = db.runTransaction.bind(db);
  check('H0 la marca usa la misma instancia de Firestore que esta prueba (si no, el intercalado no se podría hacer)', getFirestore() === db);

  /* La marca de ANTES, para el control: leer, esperar y escribir sin transacción. */
  const marcarComoAntes = async (id, ms) => {
    const ref = db.collection('assets').doc(id);
    const s = await ref.get();
    if (s.data()?.status !== 'uploading') return 'estado_incompatible';
    await esperar(ms);
    await ref.update({ status: 'ready', updatedAt: Date.now() });
    return 'listo';
  };

  let h = 0;
  /* Primero todo con la flag ABIERTA (retirada por el índice y el cerrojo) y después todo con la flag CERRADA (la de siempre). */
  for (const conFlag of [true, false]) {
    if (!conFlag) await flag.delete();
    const modo = conFlag ? 'flag abierta' : 'flag cerrada';

    /*
     * LA CARRERA, CON EL CÓDIGO DE VERDAD. Cada ronda lanza a la vez la retirada y la marca, con una demora de 0–3 ms
     * alternando quién sale antes. Invariante: si la retirada dijo `retirado`, la ficha termina `deleted`.
     */
    const rondas = 10;
    for (const marca of ['subido', 'fallido']) {
      const resultados = await enTandas(rondas, async (i) => {
        const id = await paraSubir();
        const demora = i % 4;
        const [rr, rm] = await Promise.all([
          (async () => { if (i % 2) await esperar(demora); return content.retirarMaterial(ANA, id); })(),
          (async () => { if (!(i % 2)) await esperar(demora); return marcar(marca, id); })(),
        ]);
        const fin = (await ficha(id))?.status;
        return { desenlace: `${rr.status}/${rm.status}/${fin}`, violada: rr.status === 'retirado' && fin !== 'deleted' };
      });
      const violaciones = resultados.filter((x) => x.violada).length;
      check(`H${++h} ${rondas} rondas (${modo}): «${marca}» a la vez que se retira; la ficha retirada nunca vuelve a ${vuelta[marca]}`,
        violaciones === 0, JSON.stringify(contar(resultados.map((x) => x.desenlace))));
    }

    /*
     * LA MISMA CARRERA, INTERCALADA A PROPÓSITO. Se envuelve SOLO la transacción de la marca —la primera que se abre—:
     * en su primer intento, DESPUÉS de leer la ficha y ANTES de confirmar, se lanza la retirada entera (se espera a que
     * acabe, como mucho 3 s; la transacción de la retirada, si la hay, va sin envolver). Lo que haga la base con eso
     * —repetir la marca y verla retirada, o retener la retirada hasta que la marca confirme— se anota con los intentos
     * de la marca; lo que se exige es lo mismo: la ficha termina `deleted` y la marca no la deja en su estado. Va sola:
     * nada más corre mientras `runTransaction` está envuelto.
     */
    for (const marca of ['subido', 'fallido']) {
      const id = await paraSubir();
      let intercalar = () => content.retirarMaterial(ANA, id);
      let retirada;
      let envuelta = false;
      let intentosDeLaMarca = 0;
      db.runTransaction = (fn, op) => {
        if (envuelta) return original(fn, op);
        envuelta = true;
        return original(async (tx) => {
          intentosDeLaMarca++;
          const get = tx.get.bind(tx);
          const envuelto = new Proxy(tx, {
            get(t, p) {
              if (p === 'get') {
                return async (ref) => {
                  const foto = await get(ref);
                  if (intercalar) {
                    const lanzar = intercalar; intercalar = null;
                    retirada = lanzar();
                    await Promise.race([retirada, esperar(3000)]);
                  }
                  return foto;
                };
              }
              const v = t[p];
              return typeof v === 'function' ? v.bind(t) : v;
            },
          });
          return fn(envuelto);
        }, op);
      };
      let rm;
      try {
        rm = await Promise.race([marcar(marca, id), esperar(60_000).then(() => ({ status: 'sin_respuesta_en_60s' }))]);
      } finally {
        db.runTransaction = original;
      }
      const rr = await Promise.race([retirada ?? Promise.resolve({ status: 'no_lanzada' }), esperar(60_000).then(() => ({ status: 'sin_respuesta_en_60s' }))]);
      const fin = (await ficha(id))?.status;
      check(`H${++h} intercalada (${modo}) «${marca}»: retirada entre la lectura y la confirmación de la marca → la ficha termina deleted`,
        rr.status === 'retirado' && fin === 'deleted' && (rm.status === 'estado_incompatible' || rm.status === 'listo' || rm.status === 'fallido'),
        `retirada=${rr.status} marca=${rm.status} intentos de la marca=${intentosDeLaMarca} final=${fin}`);
    }

    /*
     * EL CONTROL: la misma carrera con la marca de ANTES resucita fichas retiradas. Si este control no viera ninguna,
     * las rondas de arriba no probarían nada.
     */
    const control = 15;
    const resucitadasPorRonda = await enTandas(control, async (i) => {
      const id = await paraSubir();
      const [rr] = await Promise.all([content.retirarMaterial(ANA, id), marcarComoAntes(id, 5 + ((i * 7) % 25))]);
      return rr.status === 'retirado' && (await ficha(id))?.status === 'ready';
    });
    const resucitadas = resucitadasPorRonda.filter(Boolean).length;
    check(`H${++h} CONTROL (${modo}): la marca SIN transacción resucita fichas retiradas (la prueba muerde): ${resucitadas}/${control}`, resucitadas > 0);
  }
}

cerrar();
