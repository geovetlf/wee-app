/**
 * LAS FUNCIONES DEL CONTRATO QUE TODAVÍA NO ESTÁN PUBLICADAS (R9, decisiones D-1 y D-3 del dueño, 2026-10-12).
 *
 * El dueño decidió que «Mis creaciones» enseñe aparte el material antiguo («Sin decidir», D-1) y que un texto final se
 * pueda guardar como creación (D-3). El contrato (`services/cicloDeTrabajo.ts`, de la línea A) las va a exponer como
 * `listarSinDecidir(uid, cursor?)` y `guardarTextoFinal({ texto, herramienta, proyectoOrigenId?, requestId })`
 * (docs/WEE-PROYECTOS-CREACIONES.md § 6). Mientras no estén en el módulo, estas puertas contestan `pendiente` —la
 * interfaz lo dice con honestidad— y NUNCA un dato inventado. El día que el contrato las publique, se usan tal cual sin
 * cambiar las pantallas.
 *
 * TRANSITORIO: al fusionar la rama de la línea A con estas funciones, comprobar la forma de lo que devuelven contra
 * `PaginaSinDecidir` y `ResultadoGuardarTexto` y, si ya coinciden, importar directamente del contrato.
 */
import * as ciclo from '../../services/cicloDeTrabajo';
import { ErrorDeCiclo } from '../../services/cicloDeTrabajo';
import type { AssetDoc } from '../../services/vistaDeAsset';

export interface PaginaSinDecidir {
  assets: AssetDoc[];
  siguiente?: unknown;
}

export interface EntradaGuardarTexto {
  texto: string;
  herramienta: string;
  proyectoOrigenId?: string | null;
  requestId: string;
}

export interface ResultadoGuardarTexto {
  creacionId: string;
  yaExistia: boolean;
}

interface Opcionales {
  listarSinDecidir?: (uid: string, cursor?: unknown) => Promise<PaginaSinDecidir>;
  guardarTextoFinal?: (entrada: EntradaGuardarTexto) => Promise<ResultadoGuardarTexto>;
}

const opcionales = (): Opcionales => ciclo as unknown as Opcionales;

export const listarSinDecidir = async (uid: string, cursor?: unknown): Promise<PaginaSinDecidir> => {
  const f = opcionales().listarSinDecidir;
  if (typeof f !== 'function') throw new ErrorDeCiclo('pendiente');
  return f(uid, cursor);
};

export const guardarTextoFinal = async (entrada: EntradaGuardarTexto): Promise<ResultadoGuardarTexto> => {
  const f = opcionales().guardarTextoFinal;
  if (typeof f !== 'function') throw new ErrorDeCiclo('pendiente');
  return f(entrada);
};
