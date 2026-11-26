import type { CapacidadesDeModelo } from '../core/model-capability';
import { seedanceCapacidades } from './providers/seedance-capacidades';

/**
 * OLA 3b · EL REGISTRO DE CAPACIDADES DE LOS MODELOS DE VÍDEO.
 *
 * Un solo sitio que lee el servidor (`creator/entradasDePlano.ts`), el router cuando elija por capacidades y, por
 * el espejo, la app. Cada adaptador aporta SU lista; un proveedor nuevo es una línea aquí y su archivo de datos.
 * No decide nada: no elige modelo, no cobra, no abre ninguna puerta.
 *
 * `CAPACIDADES_DE_VIDEO` es una lista y no un mapa porque el orden es el de presentación («Automático» primero lo
 * pone la interfaz) y porque dos proveedores pueden compartir `familia`.
 */
export const CAPACIDADES_DE_VIDEO: readonly CapacidadesDeModelo[] = Object.freeze([...seedanceCapacidades]);

export const capacidadesDeModelo = (modeloId: string): CapacidadesDeModelo | undefined =>
  CAPACIDADES_DE_VIDEO.find((c) => c.modeloId === modeloId);

/**
 * LAS CAPACIDADES DE UN MODELO CON SU ESTADO REAL: un modelo `CONFIGURED` o `VALIDATED` pasa a `ENABLED` solo si
 * quien llama dice que está habilitado (hoy: la lista de modelos validados con canary, en el código de la puerta,
 * que es quien decide). Uno `NOT_CONFIGURED` no se promueve nunca desde aquí. Un modelo desconocido es
 * `undefined`, nunca otro: la lección de `specOf`, que caía en silencio al de la serie 2.0.
 */
export const capacidadesConEstado = (modeloId: string, habilitados: ReadonlySet<string>): CapacidadesDeModelo | undefined => {
  const c = capacidadesDeModelo(modeloId);
  if (!c) return undefined;
  return (c.estado === 'VALIDATED' || c.estado === 'CONFIGURED') && habilitados.has(modeloId) ? { ...c, estado: 'ENABLED' } : c;
};
