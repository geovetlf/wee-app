import type { MotivoDeRechazo } from './config/entorno';

export type { MotivoDeRechazo };

/** Motivo de rechazo del entorno → clave del traductor. */
export const MOTIVO_DE_ARRANQUE: Record<MotivoDeRechazo, string> = {
  'proyecto-no-demo': 'admin.arranque.proyectoNoDemo',
  'host-no-local': 'admin.arranque.hostNoLocal',
  'puerto-invalido': 'admin.arranque.puertoInvalido',
};
