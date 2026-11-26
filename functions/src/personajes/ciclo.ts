import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { accionPropia, depsDeAcciones, depsDePublicar, EstadoConPublicaciones, tocaReflexionar } from './acciones';
import { comentarAjeno, depsDeIniciativa, EstadoConIniciativa, escribirPrimero } from './iniciativa';
import { COLECCION_DE_ENCARGOS } from './encargos';
import { COLECCION_DE_AUTONOMIA, configDelPaseViva, depsDeFirestore, ESTADOS_QUE_SE_PROCESAN, EstadoGuardado, procesarPase } from './servidor';
import * as P from './pase';

/*
 * EL CICLO DE LA AUTONOMÍA (docs/AUTONOMIA.md): cada 10 minutos, para cada pase vivo:
 *
 *   1. lo pone al día DENTRO de una transacción, sobre el estado fresco (cobrar el
 *      bloque que toque, parar o reanudar el reloj, terminar lo cumplido). Un
 *      disparador puede estar contando una acción a la vez, y un `set` a ciegas la
 *      borraría; si la transacción se repite, el cobro no se duplica (requestId fijo);
 *   2. FUERA de la transacción (para no repetir efectos si se reintenta), le da al
 *      personaje la ocasión de actuar por iniciativa propia, cada cosa con su propia
 *      reserva atómica y sus topes: publicar algo suyo, comentar algo ajeno que toque
 *      sus temas, escribir primero a un seguidor (con aprobación según el nivel) y,
 *      una vez por bloque, reflexionar sobre lo que vivió.
 *
 * Un fallo en una de esas cosas no impide las demás ni los otros pases.
 *
 * Con la puerta cerrada (aiSettings/autonomia.abierta) no hay pases activos que
 * actúen: los que hubiera quedan en pausa «por Weë» y el reloj no corre.
 */
const db = () => getFirestore();

export const PARALELO_DEL_CICLO = 5;

/** Un encargo que lleva más que esto «en curso» murió a medias (el disparador vive 9 min). */
export const ENCARGO_ATASCADO_MS = 15 * 60_000;

/*
 * ENCARGOS ATASCADOS (auditoría 2026-11-22, M1). Si el disparador del encargo muere a
 * mitad, el documento se queda «en curso» para siempre y puede haber Credits retenidos.
 * Aquí NO se devuelve nada por temporizador —la regla de Weë es retener y reconciliar
 * (C-05)—: se marca `revisar` para que la reconciliación o una persona lo cierre con
 * la verdad del proveedor y del Credit Engine.
 */
export async function marcarEncargosAtascados(ahora = Date.now()): Promise<number> {
  const snap = await db().collection(COLECCION_DE_ENCARGOS).where('estado', '==', 'enCurso').limit(50).get();
  const viejos = snap.docs.filter((d) => ahora - Number(d.get('tomadoEn') || 0) > ENCARGO_ATASCADO_MS);
  for (const d of viejos) await d.ref.update({ estado: 'revisar', marcadoEn: ahora });
  if (viejos.length) console.warn(`Autonomía: ${viejos.length} encargo(s) atascado(s) marcados para revisar`);
  return viejos.length;
}

/** Copia barajada (Fisher-Yates). */
export function barajar<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Hace `fn` sobre todos, como mucho `n` a la vez. */
export async function enParalelo<T>(xs: T[], n: number, fn: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, xs.length) }, async () => { while (i < xs.length) { const x = xs[i++]; await fn(x); } }));
}

async function intentar(que: string, id: string, fn: () => Promise<unknown>): Promise<void> {
  try { await fn(); } catch (error) { console.error(`Autonomía: el personaje no pudo ${que}`, id, error); }
}

export const cicloDeAutonomia = onSchedule({ schedule: 'every 10 minutes', region: 'us-central1', timeoutSeconds: 300 }, async () => {
  const config = await configDelPaseViva();
  await marcarEncargosAtascados().catch((error) => console.error('Autonomía: no se pudieron revisar los encargos atascados', error));
  const snap = await db().collection(COLECCION_DE_AUTONOMIA).where('estado', 'in', ESTADOS_QUE_SE_PROCESAN).limit(500).get();
  if (snap.empty) return;
  const deps = depsDeFirestore({ config: async () => config });
  const publicar = depsDePublicar();
  const iniciativa = depsDeIniciativa();
  const acciones = depsDeAcciones();
  /*
   * EN PARALELO Y EN ORDEN AL AZAR (auditoría 2026-11-22, I9): en serie y siempre en el
   * mismo orden, con unas decenas de pases el ciclo agotaba sus 5 minutos y los últimos
   * nunca actuaban. Ahora van de PARALELO_DEL_CICLO en PARALELO_DEL_CICLO y barajados,
   * así ninguno se queda siempre al final. A más escala: una tarea por pase.
   */
  await enParalelo(barajar(snap.docs), PARALELO_DEL_CICLO, async (doc) => {
    let alDia: EstadoGuardado | null = null;
    try {
      alDia = await db().runTransaction(async (tx) => {
        const fresco = await tx.get(doc.ref);
        if (!fresco.exists) return null;
        const nuevo = await procesarPase(deps, fresco.data() as EstadoGuardado);
        tx.set(doc.ref, JSON.parse(JSON.stringify(nuevo)));
        return nuevo;
      });
    } catch (error) {
      console.error('Autonomía: no se pudo poner al día el pase', doc.id, error);
      return;
    }
    if (!alDia || alDia.estado !== 'activa' || !config.abierta) return;
    // Cada paso relee el estado: el anterior pudo gastar acciones o anotar cosas.
    const fresco = async () => ((await doc.ref.get()).data() as EstadoConIniciativa | undefined) ?? null;
    await intentar('publicar', doc.id, () => accionPropia(publicar, alDia as EstadoConPublicaciones));
    await intentar('comentar algo ajeno', doc.id, async () => { const e = await fresco(); if (e) await comentarAjeno(iniciativa, e); });
    await intentar('escribir primero', doc.id, async () => { const e = await fresco(); if (e) await escribirPrimero(iniciativa, e); });
    await intentar('reflexionar', doc.id, async () => {
      const e = await fresco();
      const ahora = Date.now();
      if (!e || !acciones.reflexionar || !tocaReflexionar(e, ahora)) return;
      const ficha = await acciones.fichaDe(e.personajeId);
      if (!ficha) return;
      // Se anota ANTES de reflexionar: si falla, no se reintenta cada 10 minutos en el mismo bloque.
      const bloque = P.bloqueEnCurso(e, ahora);
      await doc.ref.update({ bloqueDeReflexion: bloque });
      await acciones.reflexionar(e.personajeId, e.cuentaId, ficha.nombre, `personaje_reflexion_${e.personajeId}_${e.programadoEn}_b${bloque}`);
    });
  });
});
