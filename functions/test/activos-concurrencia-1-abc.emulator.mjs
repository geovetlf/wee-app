/*
 * ACTIVOS · CONCURRENCIA 1 DE 4 — ESCENARIOS A, B Y C.
 *
 * Partición de `activos-concurrencia.emulator.mjs` (HEAD 4a0b36f), que tardaba entre 371 y 387 s según la pasada y el corredor de emuladores corta
 * a los 300 s. Las rondas, las aserciones y los nombres son los de HEAD; el estado común (flag, margen, cuentas, bucket,
 * helpers) vive en `_concurrencia-comun.mjs`.
 *
 *   A · dos versiones a la vez sobre el mismo archivo: A1 (dos anteriores distintas) y A2 (tres llamadas con la misma).
 *   B · una versión a la vez que se retira el material que ocupaba el archivo: B1.
 *   C · una ficha nueva sobre el mismo objeto mientras se retira y se reclama la vieja: C1.
 *
 * Por qué juntos: las tres son carreras sobre el MISMO archivo y el mismo objeto de Storage (versión contra versión,
 * versión contra retirada, retirada contra reclamación), y pasan por el índice de activos. No dejan datos que usen
 * los demás grupos. Se ejecuta solo: abre la flag y espera el margen de cobertura él mismo.
 *
 * Tiempo: 103.9 s de reloj de la suite (114.3 s de pared, con el arranque y el cierre de los emuladores), 4 comprobaciones ✔. Límite de la CI: 300 s.
 *
 *   firebase emulators:exec --only firestore,storage --project demo-wee "node functions/test/activos-concurrencia-1-abc.emulator.mjs"
 */

import {
  abrirAlmacenParaAna,
  ANA,
  anterior,
  cerrar,
  check,
  clave,
  contar,
  crear,
  deps,
  enTandas,
  existe,
  ficha,
  filasVivas,
  indice,
  registro,
  reloj,
  subir,
  urlDe,
  versiones,
} from './_concurrencia-comun.mjs';

await abrirAlmacenParaAna();

/* ═══ A · DOS VERSIONES A LA VEZ ═════════════════════════════════════════════ */
console.log('\n── A · Dos versiones a la vez sobre el mismo archivo ──', reloj());
{
  const antA = await anterior();
  const antB = await anterior();
  const rondas = 12;
  const malas = await enTandas(rondas, async () => {
    const c = clave(); await subir(c);
    const [r1, r2] = await Promise.all([
      versiones.crearVersionDeMaterial(ANA, { anteriorId: antA, url: urlDe(c) }),
      versiones.crearVersionDeMaterial(ANA, { anteriorId: antB, url: urlDe(c) }),
    ]);
    const estados = [r1.status, r2.status].sort().join(',');
    const vivasHay = await filasVivas(c);
    const reg = await registro(c);
    return estados !== 'archivo_en_uso,creada' || vivasHay !== 1 || reg?.estado !== 'guardado';
  });
  const mal = malas.filter(Boolean).length;
  check(`A1 ${rondas} rondas con dos anteriores distintas: una creada, otra archivo_en_uso, UNA fila viva`, mal === 0, `rondas mal: ${mal}`);
  const rondasMisma = 12;
  const malasMisma = await enTandas(rondasMisma, async () => {
    const c = clave(); await subir(c);
    const rs = await Promise.all([0, 1, 2].map(() => versiones.crearVersionDeMaterial(ANA, { anteriorId: antA, url: urlDe(c) })));
    return rs.some((r) => r.status !== 'creada') || new Set(rs.map((r) => r.asset.assetId)).size !== 1 || (await filasVivas(c)) !== 1;
  });
  const malMisma = malasMisma.filter(Boolean).length;
  check(`A2 ${rondasMisma} rondas de tres llamadas a la vez con la misma anterior: todas creada, la MISMA ficha, una fila`, malMisma === 0, `rondas mal: ${malMisma}`);
}

/* ═══ B · VERSIÓN A LA VEZ QUE SE RETIRA EL MATERIAL QUE OCUPABA EL ARCHIVO ════ */
console.log('\n── B · Versión y retirada del material anterior a la vez (A1) ──', reloj());
{
  const ant = await anterior();
  const rondas = 15;
  const resultados = await enTandas(rondas, async () => {
    const c = clave(); await subir(c);
    const viejo = await crear(c);
    const [v, r] = await Promise.all([
      versiones.crearVersionDeMaterial(ANA, { anteriorId: ant, url: urlDe(c) }),
      indice.retirarConIndice(deps(), ANA, viejo.assetId),
    ]);
    const reg = await registro(c);
    const vivasHay = await filasVivas(c);
    const bytes = await existe(c);
    const versionViva = v.status === 'creada' && (await ficha(v.asset.assetId))?.status !== 'deleted';
    let violaciones = 0;
    if (versionViva && (!bytes || reg?.estado !== 'guardado')) violaciones++;
    if (vivasHay > 0 && (reg?.estado === 'borrando' || reg?.estado === 'borrado')) violaciones++;
    if (!bytes && vivasHay > 0) violaciones++;
    return { desenlace: `${v.status}/${r.objetosBorrados}`, violaciones };
  });
  const violaciones = resultados.reduce((s, x) => s + x.violaciones, 0);
  check(`B1 ${rondas} rondas: nunca una versión viva sin bytes, ni una fila viva sobre un objeto que se va`, violaciones === 0,
    JSON.stringify(contar(resultados.map((x) => x.desenlace))));
}

/* ═══ C · RETIRADA Y RECLAMACIÓN A LA VEZ ════════════════════════════════════ */
console.log('\n── C · Una ficha nueva sobre el objeto mientras se retira y se reclama la vieja ──', reloj());
{
  const rondas = 15;
  const resultados = await enTandas(rondas, async () => {
    const c = clave(); await subir(c);
    const viejo = await crear(c);
    const [r, nueva] = await Promise.all([indice.retirarConIndice(deps(), ANA, viejo.assetId), crear(c)]);
    const reg = await registro(c);
    const bytes = await existe(c);
    const vivasHay = await filasVivas(c);
    let violaciones = 0;
    if (nueva && (await ficha(nueva.assetId))?.status === 'ready' && !bytes) violaciones++;
    if (vivasHay > 0 && (reg?.estado === 'borrando' || reg?.estado === 'borrado')) violaciones++;
    return { desenlace: `${r.objetosBorrados}/${nueva ? 'creada' : 'rechazada'}`, violaciones };
  });
  const violaciones = resultados.reduce((s, x) => s + x.violaciones, 0);
  check(`C1 ${rondas} rondas: nunca una ficha viva sobre bytes borrados ni una fila viva sobre un objeto que se va`, violaciones === 0,
    JSON.stringify(contar(resultados.map((x) => x.desenlace))));
}

cerrar();
