import { cuentaDeIdentidad } from '../social/econtact';
import { borrarCuenta, DependenciasDelBorrado, IdentidadesDeLaCuenta, PerfilGuardado, resolverIdentidades, ResultadoDelBorrado } from './borrado';

/*
 * «30 DÍAS Y LUEGO SE BORRA» (decisión del dueño, 2026-11-22).
 *
 * Pedir «Eliminar cuenta» ya NO borra en el acto: DESACTIVA.
 *
 *   · DESACTIVAR (`eliminarCuenta`): las dos caras quedan marcadas con
 *     `cuentaEstado: 'desactivada'`, `desactivadaEn` y `borrarEn` (= ahora +
 *     DIAS_PARA_VOLVER días); el pase de autonomía del personaje se APAGA (deja
 *     de cobrar); y sus publicaciones de las dos caras se ocultan de forma
 *     reversible, marcando SOLO las que se cambian (`ocultaPorDesactivacion:
 *     true`). El usuario de Auth NO se borra: la persona puede volver a entrar
 *     con su contraseña. Repetirlo no alarga el plazo: se conserva el `borrarEn`
 *     que ya hubiera.
 *   · REACTIVAR (`reactivarCuenta`): con sesión, si sigue desactivada y no ha
 *     vencido `borrarEn`, quita las marcas y vuelve a mostrar SOLO las
 *     publicaciones que ocultó la desactivación. El pase NO se reactiva: se
 *     apagó y la persona lo vuelve a programar si quiere.
 *   · VENCIDAS (`borrarCuentasVencidas`, una vez al día): las cuentas con
 *     `cuentaEstado == 'desactivada'` y `borrarEn <= ahora` se borran con el
 *     plan COMPLETO de `borrado.ts`, Auth incluido. Antes de borrar cada una se
 *     vuelve a leer su estado: si entretanto se reactivó, no se toca.
 *
 * N CARAS (F4, decisión del dueño): la CUENTA tiene 30 días y desactivarla
 * oculta las publicaciones de TODAS sus caras —Real, heredada y cada alter ego—
 * y apaga el pase de cada personaje. Retirar UN alter ego es otra cosa:
 * inmediato y sin vuelta (`identity/alterEgos.ts`, D10).
 *
 * Si la cuenta no tiene ningún perfil (una sesión que nunca terminó de
 * registrarse), no hay nada que ocultar ni a qué volver y no habría dónde
 * guardar el plazo: se borra en el acto con el mismo plan.
 */

export const DIAS_PARA_VOLVER = 30;
export const MS_POR_DIA = 24 * 60 * 60 * 1000;
export const ESTADO_DESACTIVADA = 'desactivada';

export interface MarcaDeDesactivacion {
  cuentaEstado: typeof ESTADO_DESACTIVADA;
  desactivadaEn: number;
  borrarEn: number;
}

export interface PerfilConEstado extends PerfilGuardado {
  cuentaEstado?: unknown;
  desactivadaEn?: unknown;
  borrarEn?: unknown;
}

export interface DependenciasDeDesactivacion extends DependenciasDelBorrado {
  /** Pone (o, con `null`, quita) la marca en estos documentos `users`. */
  marcarPerfiles(ids: string[], marca: MarcaDeDesactivacion | null): Promise<void>;
  /** Oculta las publicaciones visibles de esta cara; devuelve cuántas marcó. */
  ocultarPublicaciones(identidad: string): Promise<number>;
  /** Vuelve a mostrar SOLO las que llevan `ocultaPorDesactivacion`; devuelve cuántas. */
  mostrarPublicaciones(identidad: string): Promise<number>;
  /** Apaga el pase de autonomía del personaje, si lo hay. */
  apagarPase(cuentaId: string, perfilWee: string): Promise<void>;
  /** Cuentas (uids) con alguna cara desactivada y `borrarEn <= ahora`. */
  cuentasVencidas(ahora: number, limite: number): Promise<string[]>;
}

/** La marca de desactivación que tiene la cuenta, leída de sus caras (null si no está desactivada). */
export function marcaDe(perfiles: (PerfilConEstado | null | undefined)[]): MarcaDeDesactivacion | null {
  for (const p of perfiles) {
    if (p?.cuentaEstado === ESTADO_DESACTIVADA && typeof p.borrarEn === 'number' && Number.isFinite(p.borrarEn)) {
      return { cuentaEstado: ESTADO_DESACTIVADA, borrarEn: p.borrarEn, desactivadaEn: typeof p.desactivadaEn === 'number' ? p.desactivadaEn : p.borrarEn - DIAS_PARA_VOLVER * MS_POR_DIA };
    }
  }
  return null;
}

async function leerCuenta(deps: DependenciasDeDesactivacion, uid: string): Promise<{ ids: IdentidadesDeLaCuenta; marca: MarcaDeDesactivacion | null }> {
  const ids = await resolverIdentidades(deps, uid);
  const perfiles: PerfilConEstado[] = [];
  for (const d of await deps.perfilesRealesDe(uid)) if (ids.documentosReales.includes(d.id)) perfiles.push(d.datos as PerfilConEstado);
  for (const id of perfilesWeeDe(ids)) perfiles.push((await deps.leerPerfil(id)) as PerfilConEstado);
  return { ids, marca: marcaDe(perfiles) };
}

/** Todos los Perfiles Weë de la cuenta (F4); con dependencias de antes, el único que hubiera. */
const perfilesWeeDe = (ids: IdentidadesDeLaCuenta): string[] => ids.perfilesWee ?? (ids.perfilWee ? [ids.perfilWee] : []);

const documentosDe = (ids: IdentidadesDeLaCuenta): string[] => [...new Set([...ids.documentosReales, ...perfilesWeeDe(ids)])];

export type ResultadoDeDesactivar =
  | { estado: 'desactivada'; borrarEn: number; publicacionesOcultas: number }
  | { estado: 'borrada'; borrado: ResultadoDelBorrado };

export async function desactivarCuenta(deps: DependenciasDeDesactivacion, uid: string): Promise<ResultadoDeDesactivar> {
  const { ids, marca: previa } = await leerCuenta(deps, uid);
  const documentos = documentosDe(ids);
  if (!documentos.length) return { estado: 'borrada', borrado: await borrarCuenta(deps, uid) };

  const ahora = deps.ahora();
  const marca: MarcaDeDesactivacion = previa ?? { cuentaEstado: ESTADO_DESACTIVADA, desactivadaEn: ahora, borrarEn: ahora + DIAS_PARA_VOLVER * MS_POR_DIA };

  /* Primero que deje de cobrar y de verse; la marca al final, con el plazo que ya tuviera. */
  for (const perfilWee of perfilesWeeDe(ids)) await deps.apagarPase(uid, perfilWee);
  let publicacionesOcultas = 0;
  for (const id of ids.identidades) publicacionesOcultas += await deps.ocultarPublicaciones(id);
  await deps.marcarPerfiles(documentos, marca);
  return { estado: 'desactivada', borrarEn: marca.borrarEn, publicacionesOcultas };
}

export type MotivoDeReactivar = 'noDesactivada' | 'vencida';

export async function reactivarCuenta(deps: DependenciasDeDesactivacion, uid: string): Promise<{ ok: true; publicacionesMostradas: number } | { ok: false; motivo: MotivoDeReactivar }> {
  const { ids, marca } = await leerCuenta(deps, uid);
  if (!marca) return { ok: false, motivo: 'noDesactivada' };
  if (marca.borrarEn <= deps.ahora()) return { ok: false, motivo: 'vencida' };
  let publicacionesMostradas = 0;
  for (const id of ids.identidades) publicacionesMostradas += await deps.mostrarPublicaciones(id);
  await deps.marcarPerfiles(documentosDe(ids), null);
  return { ok: true, publicacionesMostradas };
}

/**
 * La pasada diaria. Cada cuenta va por separado: si una falla, las demás
 * siguen, y la que falló se reintenta mañana (el borrado es idempotente).
 */
export async function borrarCuentasVencidas(deps: DependenciasDeDesactivacion, limite = 50, presupuestoMs = 7 * 60_000): Promise<{ borradas: number; fallidas: number; omitidas: number }> {
  /*
   * POR TANDAS HASTA AGOTAR EL TIEMPO (auditoría 2026-11-22, I8). Antes miraba solo
   * las primeras 50 y, si alguna fallaba siempre, ocupaba el sitio de las demás día
   * tras día. Ahora cada cuenta se intenta UNA vez por pasada, se piden más hasta que
   * no queden nuevas o se acabe el presupuesto, y la que falla no bloquea a nadie.
   */
  const inicio = deps.ahora();
  const ahora = inicio;
  const intentadas = new Set<string>();
  let borradas = 0, fallidas = 0, omitidas = 0;
  const queda = () => deps.ahora() - inicio < presupuestoMs;
  while (queda()) {
    const tanda = [...new Set(await deps.cuentasVencidas(ahora, limite + intentadas.size))].filter((u) => !intentadas.has(u));
    if (!tanda.length) break;
    for (const uid of tanda) {
      if (!queda()) break;
      intentadas.add(uid);
      try {
        /* Se vuelve a mirar justo antes: si se reactivó entretanto, no se toca. */
        const { marca } = await leerCuenta(deps, uid);
        if (!marca || marca.borrarEn > deps.ahora()) { omitidas++; continue; }
        await borrarCuenta(deps, uid);
        borradas++;
      } catch (error) {
        fallidas++;
        console.error('Cuenta: no se pudo borrar una cuenta vencida; se reintenta mañana', uid, error);
      }
    }
  }
  return { borradas, fallidas, omitidas };
}

/** De un documento `users` desactivado a la cuenta dueña. Se LEE el vínculo (`cuentaDeIdentidad`). */
export const cuentaDelDocumento = (datos: PerfilConEstado | null | undefined): string | null => {
  if (!datos || typeof datos.uid !== 'string') return null;
  return cuentaDeIdentidad(datos.uid, datos);
};
